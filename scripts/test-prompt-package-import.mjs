import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import JSZip from 'jszip';

const cwd = process.cwd();
const outDir = path.join(cwd, 'test-results');
await fs.mkdir(outDir, { recursive: true });

const sample = {
  schemaVersion: 'visual-brief-ai-import-v1',
  sourcePackageId: 'pkg-001',
  sourceSceneId: 'scene-001',
  sourceSceneName: 'Living Area Test',
  createdAt: new Date().toISOString(),
  assistantName: 'Jarvis B',
  promptPackage: {
    fullRenderPrompt: 'Full render prompt text',
    shortPrompt: 'Short prompt',
    materialPrompt: 'Material prompt',
    atmospherePrompt: 'Atmosphere prompt',
    negativePrompt: 'No geometry change',
    revisionPromptTemplate: 'Revision template prompt',
  },
  assistantNotes: { summary: 'Looks good', missingData: ['none'] },
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();

try {
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ai-prompt' }).click();
  await page.locator('textarea[placeholder="Paste visual-brief-ai-import-v1 JSON"]').fill(JSON.stringify(sample, null, 2));
  await page.getByRole('button', { name: 'Validate' }).click();
  await page.getByRole('button', { name: 'Import into current scene' }).click();
  await page.waitForTimeout(200);
  const dlPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Draft ZIP' }).click();
  const dl = await dlPromise;
  const zipPath = path.join(outDir, 'prompt-package-import-test.zip');
  await dl.saveAs(zipPath);
  const zip = await JSZip.loadAsync(await fs.readFile(zipPath));
  const needed = [
    'visual-brief-package/prompts/imported-prompt-package.json',
    'visual-brief-package/prompts/prompt-history.json',
    'visual-brief-package/prompts/active-prompt-package.txt',
    'visual-brief-package/prompts/revision-prompts.json',
  ];
  const missing = needed.filter((p) => !zip.file(p));
  if (missing.length) throw new Error(`Missing prompt files: ${missing.join(', ')}`);
  console.log('PASS');
} finally {
  await browser.close();
}
