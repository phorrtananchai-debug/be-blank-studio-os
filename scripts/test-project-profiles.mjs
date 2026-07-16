import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await page.setViewportSize({ width: 1600, height: 1000 });
page.on('dialog', async (dialog) => dialog.accept());

async function savedProject() {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('ai-visual-brief-builder');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('drafts', 'readonly');
      const rows = transaction.objectStore('drafts').getAll();
      rows.onerror = () => reject(rows.error);
      rows.onsuccess = () => resolve(rows.result[0]?.project || {});
    };
  }));
}

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    localStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((database) => database.name ? new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve(undefined);
    }) : undefined));
    localStorage.setItem('visual-local-production-stage-v1', 'project');
    localStorage.setItem('visual-local-product-mode', 'quick');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('project-profile-selector').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('project-profile-selector').getByRole('button').filter({ hasText: 'Karun' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  let project = await savedProject();
  if (project.profile?.sourceOfTruthProfileId !== 'karun') throw new Error('Karun profile did not persist.');
  if (!project.sourceOfTruth?.materialRules?.some((rule) => rule.id === 'karun-bench-upholstery')) throw new Error('Karun profile did not retain the branded Source of Truth.');
  await page.getByTestId('project-profile-selector').getByRole('button').filter({ hasText: 'General / Custom' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  project = await savedProject();
  if (project.profile?.sourceOfTruthProfileId !== 'general') throw new Error('Profile switch to General did not persist.');
  if (project.sourceOfTruth?.materialRules?.some((rule) => /^karun-/i.test(rule.id))) throw new Error('General profile retained active Karun material rules.');
  if (!project.sourceOfTruth?.materialRules?.some((rule) => rule.id === 'general-base-render-preservation')) throw new Error('General baseline Source of Truth missing after profile switch.');
  console.log('Visual Local Project Profile test passed');
} finally {
  await browser.close();
}
