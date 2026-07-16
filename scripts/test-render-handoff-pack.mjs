import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import JSZip from 'jszip';

const cwd = process.cwd();
const outDir = path.join(cwd, 'test-results');
await fs.mkdir(outDir, { recursive: true });
const baseImagePath = path.join(cwd, 'public', 'logo-bb-black.png');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

const samplePromptPackage = {
  schemaVersion: 'visual-brief-ai-import-v1',
  assistantName: 'Jarvis B',
  createdAt: new Date().toISOString(),
  promptPackage: {
    fullRenderPrompt: 'IMPORTED_FULL_RENDER_PROMPT_TEST',
    shortPrompt: 'short',
    materialPrompt: 'material',
    atmospherePrompt: 'atmosphere',
    negativePrompt: 'IMPORTED_NEGATIVE_PROMPT_TEST',
    revisionPromptTemplate: 'revision',
  },
};

async function addSlot(tab, slotName, thaiText) {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.getByRole('button', { name: /Add Slot|Add Material|Add Prop|Add Lighting|Add Environment/i }).first().click();
  const inspector = page.locator('aside').last();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await inspector.locator('input').first().waitFor({ state: 'visible', timeout: 3000 });
      await inspector.locator('input').first().fill(slotName);
      await inspector.locator('textarea[placeholder="Thai description"]').fill(thaiText);
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(250);
    }
  }
}

async function exportHandoff(filename) {
  const dlPromise = page.waitForEvent('download');
  await page.locator('header').getByRole('button', { name: 'AI Handoff' }).click();
  const dl = await dlPromise;
  const zipPath = path.join(outDir, filename);
  await dl.saveAs(zipPath);
  return zipPath;
}

async function readHandoff(zipPath) {
  const zip = await JSZip.loadAsync(await fs.readFile(zipPath));
  const required = [
    'render-handoff-pack/01_base_image.jpg',
    'render-handoff-pack/02_visual_instruction_board.png',
    'render-handoff-pack/full_render_prompt.txt',
    'render-handoff-pack/negative_prompt.txt',
    'render-handoff-pack/README_RENDER_HANDOFF.txt',
    'render-handoff-pack/handoff-summary.json',
  ];
  const missing = required.filter((entry) => !zip.file(entry));
  const files = Object.keys(zip.files).filter((entry) => !zip.files[entry].dir);
  const summaryText = await zip.file('render-handoff-pack/handoff-summary.json')?.async('text');
  const fullPromptText = await zip.file('render-handoff-pack/full_render_prompt.txt')?.async('text');
  const negativeText = await zip.file('render-handoff-pack/negative_prompt.txt')?.async('text');
  return {
    missing,
    files,
    summary: summaryText ? JSON.parse(summaryText) : null,
    fullPromptText: fullPromptText || '',
    negativeText: negativeText || '',
  };
}

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.locator('header input').nth(0).fill('Handoff Test Project');
  await page.locator('header input').nth(1).fill('Handoff Scene');
  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);
  await page.getByRole('button', { name: 'Advanced Mapper' }).click();

  await addSlot('Materials', 'Warm Oak', 'ไม้โอ๊คโทนอุ่น');
  await addSlot('Materials', 'White Brick', 'อิฐทาสีขาว');
  await addSlot('Lighting', 'Daylight Left', 'แสงธรรมชาติจากซ้าย');
  await addSlot('Environment', 'Garden Context', 'บริบทสวนสีเขียว');
  await page.getByRole('button', { name: 'Prompt', exact: true }).click();
  await page.getByRole('button', { name: /Prompt Block/i }).click();

  const zipLocal = await exportHandoff('handoff-local.zip');
  const localPack = await readHandoff(zipLocal);
  if (localPack.missing.length) throw new Error(`Missing files in local handoff export: ${localPack.missing.join(', ')}`);
  if (localPack.files.length !== 6) throw new Error(`Expected exactly 6 handoff files, found ${localPack.files.length}`);
  if (localPack.summary?.promptSource !== 'localPrompt') throw new Error(`Expected local prompt source, got ${localPack.summary?.promptSource}`);
  if (!localPack.fullPromptText.includes('1. Objective')) throw new Error('Local full_render_prompt.txt did not contain local prompt content');

  await page.getByRole('button', { name: 'AI Prompt', exact: true }).click();
  await page.locator('textarea[placeholder="Paste visual-brief-ai-import-v1 JSON"]').fill(JSON.stringify(samplePromptPackage, null, 2));
  await page.getByRole('button', { name: 'Import into current scene' }).click();
  await page.waitForTimeout(200);

  const zipImported = await exportHandoff('handoff-imported.zip');
  const importedPack = await readHandoff(zipImported);
  if (importedPack.missing.length) throw new Error(`Missing files in imported handoff export: ${importedPack.missing.join(', ')}`);
  if (importedPack.summary?.promptSource !== 'importedPromptPackage') throw new Error(`Expected imported prompt source, got ${importedPack.summary?.promptSource}`);
  if (importedPack.fullPromptText.trim() !== samplePromptPackage.promptPackage.fullRenderPrompt) throw new Error('full_render_prompt.txt did not use imported fullRenderPrompt');
  if (importedPack.negativeText.trim() !== samplePromptPackage.promptPackage.negativePrompt) throw new Error('negative_prompt.txt did not use imported negativePrompt');

  console.log('PASS');
} finally {
  await browser.close();
}
