import path from 'node:path';
import { chromium } from 'playwright';

const cwd = process.cwd();
const zipPath = path.join(cwd, 'test-results', 'prompt-package-import-test.zip');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Advanced Mapper' }).click();
  await page.locator('label:has-text("Import") input[type=file]').setInputFiles(zipPath);
  const reviewText = await page.locator('text=Prompt packages:').textContent();
  if (!reviewText) throw new Error('Import review did not show prompt package info');
  await page.getByRole('button', { name: 'Import as New Project' }).click();
  await page.getByRole('button', { name: 'AI Prompt' }).click();
  await page.waitForSelector('[data-testid="prompt-package-selector"]');
  const optionCount = await page.getByTestId('prompt-package-selector').locator('option').count();
  if (optionCount < 1) throw new Error('Prompt history was not restored');
  const fullPrompt = await page.locator('[data-testid="full-render-prompt-content"]').inputValue();
  if (!fullPrompt) throw new Error('Restored package did not render Full Render Prompt');
  console.log('PASS');
} finally {
  await browser.close();
}
