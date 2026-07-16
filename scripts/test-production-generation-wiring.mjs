import path from 'node:path';
import { chromium } from 'playwright';

const cwd = process.cwd();
const baseImagePath = path.join(cwd, 'public', 'logo-bb-black.png');
const previewImageBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const revisionImageBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAC0lEQVR42mP8z8AARQAChQG4nQAAAABJRU5ErkJggg==';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(({ previewImageBase64, revisionImageBase64 }) => {
  const originalFetch = window.fetch.bind(window);
  window.__productionGenerationCalls = [];
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (url.includes('generativelanguage.googleapis.com/v1beta/interactions')) {
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
      window.__productionGenerationCalls.push({
        url,
        model: body.model,
        prompt: body.input?.find((part) => part.type === 'text')?.text || '',
        imageData: body.input?.find((part) => part.type === 'image')?.data || '',
      });
      const imageData = window.__productionGenerationCalls.length === 1 ? previewImageBase64 : revisionImageBase64;
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'image/png',
                data: imageData,
              },
            }],
          },
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
}, { previewImageBase64, revisionImageBase64 });

const page = await context.newPage();
await page.setViewportSize({ width: 1600, height: 1000 });
page.on('dialog', async (dialog) => dialog.accept());

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    localStorage.clear();
    if ('databases' in indexedDB) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map((db) => db.name ? new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(db.name);
        req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
      }) : undefined));
    }
    localStorage.setItem('visual-local-product-mode', 'quick');
    localStorage.setItem('visual-local-production-stage-v1', 'project');
    localStorage.setItem('visual-local-copilot-ui-state-v1', 'hidden');
    localStorage.setItem('visual-local-generation-key:google_lite_image', 'TEST_GOOGLE_LITE_KEY');
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('visual-local-copilot:')) localStorage.removeItem(key);
    }
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByTestId('production-flow').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Google Lite Image', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);
  await page.getByTestId('production-primary-action').getByText(/Set Visual Direction|Generate Preview/).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('production-primary-action').click();
  await page.getByTestId('general-reference-workspace').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('generate-without-references').click();
  await page.getByTestId('production-primary-action').click();
  await page.waitForFunction(() => window.__productionGenerationCalls?.length === 1, null, { timeout: 5000 });
  await page.getByTestId('qc-compare-main').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/Google Lite Image 01/).waitFor({ state: 'visible', timeout: 5000 });
  const displayedResultSrc = await page.locator('img[alt*="generated"]').first().getAttribute('src');
  if (!displayedResultSrc?.includes(previewImageBase64.slice(0, 24))) {
    throw new Error(`Generated preview image was not displayed as the active result. Got ${displayedResultSrc?.slice(0, 80)}`);
  }

  let calls = await page.evaluate(() => window.__productionGenerationCalls);
  if (calls.length !== 1) throw new Error(`Expected one Google generation call for preview, got ${calls.length}.`);
  if (calls[0].model !== 'gemini-3.1-flash-lite-image') throw new Error(`Wrong model used for preview: ${calls[0].model}`);
  if (!calls[0].prompt.includes('Production Flow first preview')) throw new Error('Preview prompt did not include Production Flow preview context.');

  await page.getByRole('button', { name: 'Add Comment' }).click();
  const compareBox = await page.getByTestId('qc-compare-main').locator('.relative').first().boundingBox();
  if (!compareBox) throw new Error('Could not locate production compare image area.');
  await page.mouse.click(compareBox.x + compareBox.width * 0.48, compareBox.y + compareBox.height * 0.55);
  await page.getByTestId('anchored-comment-textarea').fill('Make the bench maroon leather again, preserve seams.');
  await page.getByTestId('anchored-comment-composer').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByTestId('process-production-comments').click();
  await page.locator('[data-testid="production-comments-panel"]').getByText('Agent revision plan').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('apply-production-agent-plan').click();
  await page.locator('[data-testid="production-comments-panel"]').getByText('Plan applied').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByTestId('production-main-generate').click();
  await page.waitForFunction(() => window.__productionGenerationCalls?.length === 2, null, { timeout: 5000 });
  await page.getByText(/Google Lite Image Revision 02/).waitFor({ state: 'visible', timeout: 5000 });

  calls = await page.evaluate(() => window.__productionGenerationCalls);
  if (calls.length !== 2) throw new Error(`Expected two Google generation calls after revision, got ${calls.length}.`);
  if (!calls[1].prompt.includes('Agent-composed production revision prompt')) throw new Error('Revision prompt did not include Agent revision context.');
  if (!calls[1].prompt.includes('AGENT-COMPOSED PRODUCTION REVISION PROMPT')) throw new Error('Revision prompt did not include the applied Agent prompt.');
  if (calls[1].prompt.includes('Make the bench maroon leather again, preserve seams.')) throw new Error('Raw comment text leaked into provider prompt.');
  if (!calls[1].prompt.includes('Base Render truth has highest priority')) throw new Error('Revision prompt missing source-of-truth priority.');
  if (!calls[1].prompt.includes('Do not invent, expand, intensify, or introduce project colors')) throw new Error('Revision prompt missing project material visibility guard.');
  if (!calls[1].prompt.includes('normalized position')) throw new Error('Revision prompt did not include normalized comment location.');
  const sourceChoice = await page.evaluate(() => window.__productionSourceChoice);
  if (sourceChoice?.sourceKind !== 'visible-result' && sourceChoice?.sourceKind !== 'current-round') {
    throw new Error(`Revision did not select current result image as the editable source before adapter resize. Source choice: ${JSON.stringify(sourceChoice)}.`);
  }
  const pageText = await page.getByTestId('production-flow').textContent();
  if (pageText?.includes('Mock Preview ready')) throw new Error('Production Flow displayed mock success while Google provider was configured.');

  const leaked = await page.evaluate(() => {
    const raw = JSON.stringify(localStorage);
    return raw.includes('TEST_GOOGLE_LITE_KEY') && raw.includes('resultRounds');
  });
  if (leaked) throw new Error('API key-like test secret appeared in exported/result metadata storage.');

  console.log('Visual Local Production Generation Wiring test passed');
} finally {
  await browser.close();
}
