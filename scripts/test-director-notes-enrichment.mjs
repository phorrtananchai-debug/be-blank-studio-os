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

const jarvisImport = {
  schemaVersion: 'visual-brief-ai-import-v1',
  assistantName: 'Jarvis B',
  createdAt: new Date().toISOString(),
  promptPackage: {
    fullRenderPrompt: 'JARVIS_FULL_PROMPT_DIRECTOR_NOTES_TEST',
    shortPrompt: 'short',
    materialPrompt: 'material',
    atmospherePrompt: 'atmosphere',
    negativePrompt: 'JARVIS_NEGATIVE_PROMPT_DIRECTOR_NOTES_TEST',
    revisionPromptTemplate: 'revision',
  },
  slotEnrichment: [
    {
      code: 'M01',
      inferredName: 'Warm Oak Wood Panels',
      inferredThaiIntent: 'ไม้โอ๊คโทนอุ่น ผิวด้าน ลายไม้ธรรมชาติ',
      inferredApplyTo: 'wall panels, cabinetry',
      inferredFinish: 'matte / low sheen',
      inferredTexture: 'natural oak grain variation',
      inferredAvoid: 'orange tint, glossy varnish',
      confidence: 'medium-high',
      basis: 'material reference + mapping + director notes',
    },
  ],
  aiEnrichmentSuggestions: [
    {
      id: 'suggestion-001',
      action: 'add_slot',
      slotType: 'prop',
      suggestedCode: 'P01',
      suggestedName: 'Subtle Persian Rug',
      thaiDescription: 'พรมเปอร์เซียโทนอุ่นแบบ muted ไม่จัดจ้าน',
      englishPromptNote: 'Muted warm-neutral Persian rug with subtle ornamental pattern.',
      applyTo: 'rug area under coffee table',
      finish: 'woven textile',
      texture: 'low pile woven rug with subtle ornamental pattern',
      avoid: 'overly saturated colors, busy contrast',
      creativeFreedom: 'medium',
      confidence: 'medium',
      basis: 'Director Notes + visible rug zone',
      mappingSuggestion: {
        type: 'region',
        normalizedRect: { x: 0.22, y: 0.68, width: 0.5, height: 0.18 },
      },
    },
  ],
};

async function exportZip(filename, buttonName) {
  const dlPromise = page.waitForEvent('download');
  await page.locator('header').getByRole('button', { name: buttonName }).click();
  const dl = await dlPromise;
  const zipPath = path.join(outDir, filename);
  await dl.saveAs(zipPath);
  const closeBtn = page.locator('button', { hasText: 'Close' }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click().catch(() => {});
  }
  return zipPath;
}

async function readZipJson(zipPath, innerPath) {
  const zip = await JSZip.loadAsync(await fs.readFile(zipPath));
  const file = zip.file(innerPath);
  if (!file) return null;
  return JSON.parse(await file.async('text'));
}

try {
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.locator('header input').nth(0).fill('Director Notes Test');
  await page.locator('header input').nth(1).fill('Winter Retreat Living');
  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);

  await page.getByRole('button', { name: 'Materials', exact: true }).click();
  await page.getByRole('button', { name: /Add Slot|Add Material/i }).first().click();
  await page.locator('aside').last().locator('input').first().fill('Warm Oak');

  await page.getByRole('button', { name: 'Brief', exact: true }).click();
  await page.locator('textarea[placeholder*=\"overall mood\"]').fill('Warm winter retreat, Scandinavian + Japandi influence, calm architectural photography.');
  await page.locator('textarea[placeholder*=\"overall material direction\"]').fill('Use warm oak, white painted brick, matte black steel, off-white textile.');
  await page.locator('textarea[placeholder*=\"daylight, artificial light\"]').fill('Soft morning daylight from left side, gentle shadow falloff.');
  await page.locator('textarea[placeholder*=\"must not change\"]').fill('Preserve camera angle, cabinetry rhythm, ceiling beams, furniture placement.');
  await page.locator('select').filter({ hasText: 'Conservative' }).first().selectOption('balanced');

  await page.locator('header').getByRole('button', { name: 'Generate Local Prompt' }).click();
  const promptText = await page.locator('textarea[placeholder=\"Generated local prompt\"]').inputValue();
  if (!promptText.includes('Director Notes: Warm winter retreat')) throw new Error('Prompt did not include overall scene direction note.');
  if (!promptText.includes('Material interpretation guidance:')) throw new Error('Prompt did not include material interpretation notes.');
  if (!promptText.includes('Lighting/Atmosphere guidance:')) throw new Error('Prompt did not include lighting atmosphere notes.');
  if (!promptText.includes('Preserve / Do not change:')) throw new Error('Prompt did not include preserve notes.');

  const visualBriefZip = await exportZip('director-notes-brief.zip', 'Export Draft ZIP');
  const aiBrief = await readZipJson(visualBriefZip, 'visual-brief-package/data/ai-brief.json');
  const sceneJson = await readZipJson(visualBriefZip, 'visual-brief-package/data/scene.json');
  if (!aiBrief?.directorNotes?.overallSceneDirection) throw new Error('ai-brief.json missing directorNotes.');
  if (!sceneJson?.directorNotes?.overallSceneDirection) throw new Error('scene.json missing directorNotes.');

  await page.getByRole('button', { name: 'AI Prompt', exact: true }).click();
  await page.locator('textarea[placeholder=\"Paste visual-brief-ai-import-v1 JSON\"]').fill(JSON.stringify(jarvisImport, null, 2));
  await page.getByRole('button', { name: 'Import into current scene' }).click();
  await page.waitForSelector('[data-testid=\"suggestion-card-suggestion-001\"]');
  await page.getByRole('button', { name: 'Apply inferred fields' }).first().click();
  await page.getByTestId('apply-suggestion-suggestion-001').click();

  await page.getByRole('button', { name: 'Props', exact: true }).click();
  if (!(await page.getByText(/Subtle Persian Rug/i).first().isVisible())) throw new Error('Applied Persian Rug suggestion did not create a visible slot.');

  await page.locator('header').getByRole('button', { name: 'Generate Local Prompt' }).click();
  const promptAfterApply = await page.locator('textarea[placeholder=\"Generated local prompt\"]').inputValue();
  if (!promptAfterApply.includes('Subtle Persian Rug')) throw new Error('Prompt did not include applied suggestion slot.');

  const visualBriefAfterApply = await exportZip('director-notes-after-apply.zip', 'Export Draft ZIP');
  const sceneAfterApply = await readZipJson(visualBriefAfterApply, 'visual-brief-package/data/scene.json');
  const rugSlot = (sceneAfterApply?.slots || []).find((slot) => slot.name === 'Subtle Persian Rug' || slot.code === 'P01');
  if (!rugSlot) throw new Error('Applied suggestion slot not found in exported scene.');
  if (!(rugSlot.regions?.length > 0)) throw new Error('Applied suggestion mapping region not found.');

  const handoffZip = await exportZip('director-notes-handoff.zip', 'Export Render Handoff Pack');
  const handoffSummary = await readZipJson(handoffZip, 'render-handoff-pack/handoff-summary.json');
  if (!handoffSummary?.directorNotes?.overallSceneDirection) throw new Error('handoff-summary missing directorNotes.');
  if (!(handoffSummary?.appliedSuggestionsCount > 0)) throw new Error('handoff-summary missing appliedSuggestionsCount.');

  console.log('PASS');
} finally {
  await browser.close();
}
