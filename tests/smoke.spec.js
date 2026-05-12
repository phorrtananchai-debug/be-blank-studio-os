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
  await expect(page.getByRole('heading', { name: 'Be Blank Studio OS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commands' })).toBeVisible();
}

test.describe('route smoke checks', () => {
  test('loads key routes directly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Be Blank to Behind Studio' })).toBeVisible();

    await page.goto('/work');
    await expect(page.getByText('Portfolio').first()).toBeVisible();
    await expect(page.getByText('Project Archive')).toBeVisible();

    await page.goto('/os');
    await expectStudioShell(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/m');
    await expect(page.getByText('Studio OS')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('survives browser refresh on routed pages', async ({ page }) => {
    await page.goto('/work');
    await page.reload();
    await expect(page.getByText('Project Archive')).toBeVisible();

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
