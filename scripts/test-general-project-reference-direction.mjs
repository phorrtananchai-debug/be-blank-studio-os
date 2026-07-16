import path from 'node:path';
import { chromium } from 'playwright';

const cwd = process.cwd();
const baseImagePath = path.join(cwd, 'public', 'logo-bb-black.png');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await page.setViewportSize({ width: 1600, height: 1000 });
page.on('dialog', async (dialog) => dialog.accept());

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    localStorage.clear();
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases();
      await Promise.all(databases.map((database) => database.name ? new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(database.name);
        request.onsuccess = request.onerror = request.onblocked = () => resolve(undefined);
      }) : undefined));
    }
    localStorage.setItem('visual-local-product-mode', 'quick');
    localStorage.setItem('visual-local-production-stage-v1', 'project');
    localStorage.setItem('visual-local-copilot-ui-state-v1', 'hidden');
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByTestId('project-profile-selector').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('General / Custom', { exact: true }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);
  await page.getByTestId('production-primary-action').getByText(/Set Visual Direction|Generate Preview/).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('production-primary-action').click();
  await page.getByTestId('general-reference-workspace').waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
    throw new Error(`General reference workspace did not open. Current flow: ${(await page.getByTestId('production-flow').textContent())?.slice(0, 700)}`);
  });
  await page.getByTestId('general-space-type').selectOption('kitchen');
  await page.getByTestId('general-generation-intent').selectOption('polish');
  if (await page.getByTestId('general-design-freedom').inputValue() !== 'strict') throw new Error('Polish intent did not force Strict design freedom.');
  if (!(await page.getByTestId('provider-capability-summary').textContent())?.includes('Vision:')) throw new Error('Provider capability disclosure is missing.');
  await page.getByTestId('general-reference-upload').setInputFiles([baseImagePath, baseImagePath]);
  const workspace = page.getByTestId('general-reference-workspace');
  await workspace.locator('select').nth(0).selectOption('time_of_day');
  await workspace.locator('textarea').nth(0).fill('warm sunset atmosphere');
  await workspace.locator('select').nth(2).selectOption('lighting');
  await workspace.locator('textarea').nth(1).fill('neutral midday daylight');
  await page.getByTestId('analyze-general-references').click();
  await page.getByTestId('visual-direction-review').waitFor({ state: 'visible', timeout: 5000 });
  const reviewText = await page.getByTestId('visual-direction-review').textContent();
  if (!reviewText?.includes('Do not copy architecture')) throw new Error('General reference analysis did not include safe non-copy guidance.');
  await page.getByTestId('general-reference-conflicts').waitFor({ state: 'visible', timeout: 5000 });
  if (!await page.getByTestId('apply-visual-direction-scene').isDisabled()) throw new Error('Critical time-of-day conflict did not block Visual Direction apply.');
  await page.getByTestId('general-reference-conflicts').getByRole('button').first().click();
  if (await page.getByTestId('apply-visual-direction-scene').isDisabled()) throw new Error('Resolving a reference conflict did not unblock apply.');
  await page.getByTestId('production-primary-action').click();
  await page.getByTestId('general-reference-workspace').waitFor({ state: 'visible', timeout: 5000 });
  if (await page.getByTestId('qc-compare-main').count()) throw new Error('Unapplied General reference analysis incorrectly allowed generation.');
  await page.getByTestId('apply-visual-direction-scene').click();
  await page.getByTestId('production-primary-action').click();
  await page.getByTestId('qc-compare-main').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const state = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('ai-visual-brief-builder');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('drafts', 'readonly');
      const rows = transaction.objectStore('drafts').getAll();
      rows.onerror = () => reject(rows.error);
      rows.onsuccess = () => resolve(rows.result[0]?.project || {});
    };
  }));
  const scene = state.scenes?.[0];
  if (state.profile?.sourceOfTruthProfileId !== 'general') throw new Error('New project did not persist the General profile.');
  if (scene?.renderPassBuilder?.referenceDirection?.appliedScope !== 'scene') throw new Error('Applied Visual Direction did not persist at scene scope.');
  const reference = scene?.renderPassBuilder?.referenceDirection?.references?.[0];
  for (const scope of ['do_not_copy_architecture', 'do_not_copy_geometry', 'do_not_copy_furniture_form', 'do_not_copy_composition']) {
    if (!reference?.scopes?.includes(scope)) throw new Error(`General reference safe scope missing: ${scope}`);
  }
  const round = scene?.renderPassBuilder?.resultRounds?.[0];
  const prompt = round?.compiledPromptTrace?.finalPrompt || '';
  if (!prompt.includes('APPLIED VISUAL DIRECTION')) throw new Error('Applied Visual Direction was not injected into the shared prompt compiler trace.');
  if (!prompt.includes('GENERATION INTENT') || !prompt.includes('POLISH intent') || !prompt.includes('SCENE CONTRACT CRITICAL LOCKS') || !prompt.includes('Kitchen')) throw new Error('General structured production rules were not compiled into the prompt.');
  if (/Karun Bench Upholstery|Karun Brand Color Exception|Karun Satin Brass/.test(prompt)) throw new Error('General prompt inherited Karun-specific rules.');
  if (round?.projectProfileSnapshot?.sourceOfTruthProfileId !== 'general') throw new Error('Result version did not retain the active General profile snapshot.');
  if (round?.generalProductionSnapshot?.spaceType !== 'kitchen') throw new Error('Result did not snapshot the Kitchen General production state.');
  if (round?.generalProductionSnapshot?.generationIntent !== 'polish' || round?.generalProductionSnapshot?.designFreedom !== 'strict') throw new Error('Result did not retain Polish / Strict reproducibility metadata.');
  if (!scene?.renderPassBuilder?.generalProduction?.sceneContract?.lockedElements?.some((item) => item.includes('Cabinet modules'))) throw new Error('Kitchen baseline did not preserve cabinet modules.');
  if ((scene?.renderPassBuilder?.generalProduction?.borrowMaps?.length || 0) < 2) throw new Error('Structured Reference Borrow Map was not persisted.');
  if (!scene?.renderPassBuilder?.generalProduction?.conflicts?.[0]?.resolvedReferenceId) throw new Error('Reference conflict resolution was not persisted.');
  console.log('Visual Local General Project Reference Direction test passed');
} finally {
  await browser.close();
}
