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
  await page.evaluate(() => {
    localStorage.setItem('visual-local-product-mode', 'quick');
    localStorage.setItem('visual-local-production-stage-v1', 'project');
    localStorage.setItem('visual-local-copilot-ui-state-v1', 'hidden');
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('visual-local-copilot:')) localStorage.removeItem(key);
    }
    localStorage.removeItem('visual-local-generation-key:google_lite_image');
    localStorage.removeItem('visual-local-generation-key:google_pro_image');
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByAltText('Be Blank to Behind Studio logo').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Be Blank to Behind Studio').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('production-flow').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Source of Truth', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });

  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);
  await page.getByTestId('production-primary-action').getByText(/Generate Preview|Generate Revision/).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('production-primary-action').click();
  await page.getByTestId('qc-compare-main').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Review Mode', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /Generate Again|Generate Revision/ }).first().waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: 'Add Comment' }).click();
  const compareBox = await page.getByTestId('qc-compare-main').locator('.relative').first().boundingBox();
  if (!compareBox) throw new Error('Could not locate production compare image area.');
  await page.mouse.click(compareBox.x + compareBox.width * 0.32, compareBox.y + compareBox.height * 0.48);
  await page.getByTestId('production-draft-comment-marker').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('anchored-comment-textarea').fill('CANCELLED draft should not persist.');
  await page.getByTestId('anchored-comment-composer').getByRole('button', { name: 'Cancel' }).click();
  await page.locator('[data-testid="production-comments-panel"]').getByText(/CANCELLED draft/i).waitFor({ state: 'detached', timeout: 5000 }).catch(async () => {
    const panelText = await page.locator('[data-testid="production-comments-panel"]').textContent();
    if (panelText?.includes('CANCELLED draft')) throw new Error('Cancelled draft comment persisted into the saved list.');
  });
  await page.getByRole('button', { name: 'Add Comment' }).click();
  await page.mouse.click(compareBox.x + compareBox.width * 0.42, compareBox.y + compareBox.height * 0.58);
  await page.getByTestId('production-draft-comment-marker').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('anchored-comment-composer').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('anchored-comment-textarea').fill('Bench should return to Karun maroon leather; preserve shape and seams.');
  await page.getByTestId('anchored-comment-reference-input').setInputFiles(baseImagePath);
  await page.getByTestId('anchored-comment-composer').getByAltText(/reference for comment/i).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('anchored-comment-composer').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByTestId('production-comment-marker').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('[data-testid="production-comments-panel"]').getByText(/Bench should return/i).waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: 'Global Comment' }).click();
  await page.getByTestId('anchored-comment-composer').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('anchored-comment-textarea').fill('Reduce brass yellow, keep satin brass.');
  await page.getByTestId('anchored-comment-composer').getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('[data-testid="production-comments-panel"]').getByText(/Reduce brass yellow/i).waitFor({ state: 'visible', timeout: 5000 });

  await page.getByTestId('process-production-comments').click();
  await page.locator('[data-testid="production-comments-panel"]').getByText('Agent revision plan').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('[data-testid="production-comments-panel"]').getByText('What Agent observed').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('[data-testid="production-comments-panel"] div.font-black').getByText('Suppressed project rules', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  const promptPreview = await page.getByTestId('agent-revision-prompt-preview').textContent();
  if (!promptPreview?.includes('AGENT-COMPOSED PRODUCTION REVISION PROMPT')) throw new Error('Production comments were not converted into an Agent revision prompt.');
  if (!promptPreview.includes('normalized position')) throw new Error('Agent revision prompt missing normalized point location.');
  if (!promptPreview.includes('color_only') || !promptPreview.includes('texture_only')) throw new Error('Agent revision prompt missing scoped reference usage.');
  if (!promptPreview.includes('Base Render truth has highest priority')) throw new Error('Agent revision prompt missing source-of-truth priority.');
  if (promptPreview.includes('Bench should return to Karun maroon leather; preserve shape and seams.')) throw new Error('Raw comment text leaked into Agent revision prompt.');
  await page.getByTestId('apply-production-agent-plan').click();
  await page.locator('[data-testid="production-comments-panel"]').getByText('Plan applied').waitFor({ state: 'visible', timeout: 5000 });

  const resultData = await page.evaluate(() => {
    const raw = localStorage.getItem('visual-brief-builder-draft-v2');
    return raw;
  });
  if (resultData?.includes('TEST_GOOGLE') || resultData?.includes('sk-')) throw new Error('Production flow persisted an API key-like secret.');

  console.log('Visual Local Production Flow test passed');
} finally {
  await browser.close();
}
