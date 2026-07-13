import path from 'node:path';
import { chromium } from 'playwright';

const cwd = process.cwd();
const baseImagePath = path.join(cwd, 'public', 'logo-bb-black.png');
const previewImageBase64 = Buffer.from(await import('node:fs').then((fs) => fs.readFileSync(baseImagePath))).toString('base64');
const revisionImageBase64 = previewImageBase64;
const rawFloorComment = 'สีพื้นแดงเกินและไม่ตรงกับ Base Render';

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
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByTestId('production-flow').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Google Lite Image', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);
  await page.getByTestId('production-primary-action').getByText(/Generate Preview/).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('production-primary-action').click();
  await page.waitForFunction(() => window.__productionGenerationCalls?.length === 1, null, { timeout: 5000 });
  await page.getByTestId('qc-compare-main').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: 'Add Comment' }).click();
  const compareBox = await page.getByTestId('qc-compare-main').locator('.relative').first().boundingBox();
  if (!compareBox) throw new Error('Could not locate production compare image area.');
  await page.mouse.click(compareBox.x + compareBox.width * 0.48, compareBox.y + compareBox.height * 0.80);
  await page.getByTestId('anchored-comment-textarea').fill(rawFloorComment);
  await page.getByTestId('anchored-comment-composer').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByTestId('process-production-comments').click();
  await page.locator('[data-testid="production-comments-panel"]').getByText('Agent revision plan').waitFor({ state: 'visible', timeout: 5000 });

  const promptPreview = await page.getByTestId('agent-revision-prompt-preview').textContent();
  if (!promptPreview?.includes('Restore floor colors, floor pattern, material zoning')) throw new Error('Agent prompt did not restore floor truth from Base Render.');
  if (!promptPreview.includes('Do not apply generic Karun red/maroon floor accent rules')) throw new Error('Agent prompt did not suppress generic Karun red floor rule.');
  if (!promptPreview.includes('Do not invent, expand, intensify, or introduce project colors')) throw new Error('Agent prompt missing material visibility guard.');
  if (promptPreview.includes(rawFloorComment)) throw new Error('Raw Thai floor comment leaked into Agent revision prompt preview.');

  const generateBeforeApplyEnabled = await page.getByTestId('production-main-generate').isEnabled();
  if (generateBeforeApplyEnabled) throw new Error('Generate Revision was enabled before applying the Agent revision plan.');

  await page.getByTestId('apply-production-agent-plan').click();
  await page.locator('[data-testid="production-comments-panel"]').getByText('Plan applied').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('production-main-generate').click();
  await page.waitForFunction(() => window.__productionGenerationCalls?.length === 2, null, { timeout: 5000 });

  const calls = await page.evaluate(() => window.__productionGenerationCalls);
  const sourceChoice = await page.evaluate(() => window.__productionSourceChoice);
  if (!calls[1].prompt.includes('AGENT-COMPOSED PRODUCTION REVISION PROMPT')) throw new Error(`Provider prompt did not include Agent-composed revision context. Source choice: ${JSON.stringify(sourceChoice)}. Preview: ${calls[1].prompt.slice(0, 1200)}`);
  if (!calls[1].prompt.includes('Restore floor colors, floor pattern, material zoning')) throw new Error('Provider prompt did not include base floor restoration.');
  if (!calls[1].prompt.includes('Do not apply generic Karun red/maroon floor accent rules')) throw new Error('Provider prompt did not include suppressed project rule.');
  if (calls[1].prompt.includes(rawFloorComment)) throw new Error('Raw Thai floor comment leaked into provider prompt.');

  console.log('Visual Local Production Revision Composition test passed');
} finally {
  await browser.close();
}
