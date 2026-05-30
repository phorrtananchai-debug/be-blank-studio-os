import { expect, test } from '@playwright/test';

let pageErrors;

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
});

test.afterEach(async () => {
  expect(pageErrors ?? []).toEqual([]);
});

async function expectStudioShell(page) {
  await expect(page.getByRole('heading', { name: /BE BLANK OS|Be Blank Studio OS/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commands' })).toBeVisible();
}

async function openAnyProjectWorkspace(page) {
  const getOpenDetailCount = () => page.getByRole('button', { name: 'Open Detail' }).count();
  let openDetailCount = await getOpenDetailCount();

  if (!openDetailCount) {
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.waitForTimeout(1200);
    openDetailCount = await getOpenDetailCount();
  }

  if (!openDetailCount) {
    await expect(page.getByText(/No projects/)).toBeVisible();
    return false;
  }

  await page.getByRole('button', { name: 'Open Detail' }).first().click();
  await expect(page.getByRole('button', { name: 'Client View' })).toBeVisible();
  return true;
}

test.describe('route smoke checks', () => {
  test('loads key routes directly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BE BLANK TO BEHIND STUDIO' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'contact' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'instagram' })).toBeVisible();

    await page.goto('/work');
    await expect(page.getByRole('heading', { name: 'BE BLANK TO BEHIND STUDIO' })).toBeVisible();
    await expect(page.getByRole('button', { name: '[projects]' })).toBeVisible();
    await expect(page.getByText('Project Archive')).toBeHidden();

    await page.goto('/os');
    await expectStudioShell(page);

    await page.goto('/projects');
    await expectStudioShell(page);
    await expect(page.getByText('Studio Pipeline')).toBeVisible();

    await page.goto('/timeline');
    await expectStudioShell(page);
    await expect(page).toHaveURL(/\/timeline$/);

    await page.goto('/work-queue');
    await expectStudioShell(page);

    await page.goto('/documents');
    await expectStudioShell(page);

    await page.goto('/gallery');
    await expectStudioShell(page);

    await page.goto('/settings');
    await expectStudioShell(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/m');
    await expect(page.getByText('Studio OS')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('survives browser refresh on routed pages', async ({ page }) => {
    await page.goto('/work');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'BE BLANK TO BEHIND STUDIO' })).toBeVisible();

    await page.goto('/os/projects');
    await page.reload();
    await expectStudioShell(page);
    await expect(page).toHaveURL(/\/os\/projects$/);
    await expect(page.getByText('Studio Pipeline')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/m');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('opens public visual editor separately from Studio OS', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('button', { name: 'login', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'os', exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'edit', exact: true })).toBeHidden();
  });

  test('opens public visual editor separately from Studio OS for signed-in users', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('studio_mock_user', JSON.stringify({ email: 'studio@example.com', displayName: 'Studio' }));
    });
    await page.goto('/work');
    await expect(page.getByRole('button', { name: 'os', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'edit', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'edit', exact: true }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByLabel('Public visual editor controls')).toBeVisible();
    await expect(page.getByRole('button', { name: 'save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'reset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'exit' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resize/ }).first()).toBeVisible();

    await page.getByRole('button', { name: 'os', exact: true }).click();
    await expect(page).toHaveURL(/\/os$/);
    await expectStudioShell(page);
  });
});

test.describe('command palette smoke checks', () => {
  test('opens with keyboard shortcut and trigger button', async ({ page }) => {
    await page.goto('/os');
    await expectStudioShell(page);

    await page.keyboard.press('ControlOrMeta+K');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await expect(page.getByPlaceholder('Search commands')).toBeFocused();
    await expect(page.getByRole('option', { name: /Go to Dashboard/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden();

    await page.getByRole('button', { name: 'Commands' }).click();
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  });

  test('filters and runs a navigation command', async ({ page }) => {
    await page.goto('/os');
    await page.getByRole('button', { name: 'Commands' }).click();

    await page.getByPlaceholder('Search commands').fill('mobile');
    await expect(page.getByRole('option', { name: /Go to Mobile OS/ })).toBeVisible();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/m$/);
    await expect(page.getByText('Studio OS')).toBeVisible();
  });
});

test.describe('backup import and export smoke checks', () => {
  test('exports backup and validates imports before applying', async ({ page }) => {
    await page.goto('/os');
    await expectStudioShell(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('be-blank-studio-os-backup.json');
    await expect(page.getByText('Backup exported.')).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      buffer: Buffer.from('{'),
      mimeType: 'application/json',
      name: 'bad-backup.json',
    });
    await expect(page.getByRole('alert')).toContainText('Backup file is not valid JSON.');
    await expect(page.getByText('Review Backup Import')).toBeHidden();

    await fileInput.setInputFiles({
      buffer: Buffer.from(JSON.stringify({ app: 'Be Blank Studio OS', projects: [] })),
      mimeType: 'application/json',
      name: 'missing-arrays.json',
    });
    await expect(page.getByRole('alert')).toContainText('Missing contentItems array.');
    await expect(page.getByText('Review Backup Import')).toBeHidden();

    await fileInput.setInputFiles({
      buffer: Buffer.from(JSON.stringify({
        app: 'Be Blank Studio OS',
        contentItems: [
          { id: 'content-01', title: 'Concept Reel' },
          { id: 'content-02', title: '' },
        ],
        portfolioItems: [
          { id: 'portfolio-01', title: 'Karun Phuket' },
        ],
        projects: [
          { id: 'project-01', name: '' },
          { id: 'project-02', name: 'Void Cafe' },
        ],
      })),
      mimeType: 'application/json',
      name: 'sparse-backup.json',
    });
    await expect(page.getByText('Review Backup Import')).toBeVisible();
    await expect(page.getByText('This backup contains 2 projects, 2 content items, 1 portfolio item.')).toBeVisible();
    await expect(page.getByText('Untitled Project')).toBeVisible();
    await expect(page.getByText('Void Cafe')).toBeVisible();
    await expect(page.getByText('Concept Reel')).toBeVisible();
    await expect(page.getByText('Untitled Content Item')).toBeVisible();
    await expect(page.getByText('Karun Phuket')).toBeVisible();
    await expect(page.getByText('Backup restored.')).toBeHidden();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Review Backup Import')).toBeHidden();

    await fileInput.setInputFiles({
      buffer: Buffer.from(JSON.stringify({
        app: 'Be Blank Studio OS',
        contentItems: [],
        portfolioItems: [],
        projects: [],
      })),
      mimeType: 'application/json',
      name: 'empty-backup.json',
    });
    await expect(page.getByText('Review Backup Import')).toBeVisible();
    await expect(page.getByText('Backup restored.')).toBeHidden();

    await page.getByRole('button', { name: 'Confirm Import' }).click();
    await expect(page.getByText('Backup restored.')).toBeVisible();
  });
});

test.describe('mobile shell smoke checks', () => {
  test('renders preview dashboard and tab navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/m');

    await page.getByRole('button', { name: 'Preview Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Studio OS' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Week' })).toBeVisible();
    await expect(page.getByText('This week', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('Projects').first()).toBeVisible();
  });
});

test.describe('studio upgrade hardening checks', () => {
  test('client view hides internal operational data', async ({ page }) => {
    const privateBlocker = 'INTERNAL_BLOCKER_SECRET';
    const privateNote = 'INTERNAL_NOTE_SECRET';
    const privateMaterial = 'INTERNAL_MATERIAL_SECRET';
    const privateBilling = 'INTERNAL_BILLING_SECRET';

    await page.addInitScript(() => {
      window.localStorage.setItem('studio_mock_user', JSON.stringify({ email: 'studio@example.com', displayName: 'Studio QA' }));
    });
    await page.goto('/os/projects');
    await expectStudioShell(page);
    await expect(page.getByText('Studio Pipeline')).toBeVisible();
    const opened = await openAnyProjectWorkspace(page);
    if (!opened) return;

    await page.getByRole('button', { name: 'Notes & Logs' }).click();
    await page.getByLabel('Write / Edit').nth(0).fill(privateNote);
    await page.getByLabel('Write / Edit').nth(1).fill(privateBlocker);

    await page.getByRole('button', { name: 'Materials' }).click();
    await page.getByRole('button', { name: 'Add Material' }).click();
    await page.getByLabel('Name').first().fill(privateMaterial);

    await page.getByRole('button', { name: 'Overview' }).click();
    await page.getByRole('button', { name: 'Add Milestone' }).click();
    await page.getByLabel('Label').first().fill(privateBilling);

    await page.getByRole('button', { name: 'Client View' }).click();
    await expect(page.getByText(privateBlocker)).toBeHidden();
    await expect(page.getByText(privateNote)).toBeHidden();
    await expect(page.getByText(privateMaterial)).toBeHidden();
    await expect(page.getByText(privateBilling)).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Client View' })).toBeVisible();
  });

  test('project workspace create-edit flows for site logs, materials, and billing', async ({ page }) => {
    const visitTitle = `Visit ${Date.now()}`;
    const visitNote = 'Inspection notes captured from field';
    const materialName = `Material ${Date.now()}`;
    const billingLabel = `Milestone ${Date.now()}`;

    await page.addInitScript(() => {
      window.localStorage.setItem('studio_mock_user', JSON.stringify({ email: 'studio@example.com', displayName: 'Studio QA' }));
    });
    await page.goto('/os/projects');
    await expectStudioShell(page);
    const opened = await openAnyProjectWorkspace(page);
    if (!opened) return;

    await page.getByRole('button', { name: 'Notes & Logs' }).click();
    await page.getByRole('button', { name: 'Add Visit' }).click();
    await page.getByLabel('Title').first().fill(visitTitle);
    await page.getByLabel('Notes').first().fill(visitNote);
    await expect(page.getByDisplayValue(visitTitle)).toBeVisible();

    await page.getByRole('button', { name: 'Materials' }).click();
    await page.getByRole('button', { name: 'Add Material' }).click();
    await page.getByLabel('Name').first().fill(materialName);
    await page.getByLabel('Category').first().fill('Joinery');
    await expect(page.getByDisplayValue(materialName)).toBeVisible();

    await page.getByRole('button', { name: 'Overview' }).click();
    await page.getByRole('button', { name: 'Add Milestone' }).click();
    await page.getByLabel('Label').first().fill(billingLabel);
    await page.getByLabel('Amount').first().fill('100000');
    await expect(page.getByDisplayValue(billingLabel)).toBeVisible();
  });
});
