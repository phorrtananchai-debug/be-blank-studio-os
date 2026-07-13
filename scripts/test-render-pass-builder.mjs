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

async function exportZipByButton(button, filename) {
  const dlPromise = page.waitForEvent('download');
  await button.click();
  const download = await dlPromise;
  const zipPath = path.join(outDir, filename);
  await download.saveAs(zipPath);
  return zipPath;
}

async function readZip(zipPath) {
  return JSZip.loadAsync(await fs.readFile(zipPath));
}

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('visual-local-gemini-api-key', 'TEST_GEMINI_SECRET_DO_NOT_EXPORT');
    localStorage.removeItem('visual-local-generation-key:google_lite_image');
    localStorage.removeItem('visual-local-generation-key:google_pro_image');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('header').getByRole('button', { name: 'Render Pass Builder' }).click();
  await page.locator('aside').first().getByRole('button', { name: 'Quick Mode' }).waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByText('Protected Assets').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByText('Quick Design Locks').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByText('AI Scene Composer').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByText('Connected', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('base-image-input').setInputFiles(baseImagePath);
  await page.getByTestId('quick-generate-preview').click();
  await page.locator('aside').first().getByText('Mock Preview / API not connected', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('qc-compare-main').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Review Mode', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /Generate Again/ }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByText('Today attempts').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByText('THB 0.00').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByRole('button', { name: /Approved/ }).first().click();
  await page.locator('aside').first().getByRole('button', { name: /QC/ }).first().click();
  await page.getByText('Review Mode', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('result-qc-panel').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('qc-compare-main').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /Back to Mapping View/ }).waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByRole('button', { name: 'Quick Mode' }).click();
  await page.locator('aside').first().locator('select').filter({ has: page.locator('option[value="google_lite_image"]') }).selectOption('google_lite_image');
  const fakeGoogleKey = 'TEST_GOOGLE_LITE_KEY_DO_NOT_EXPORT';
  await page.locator('aside').first().locator('input[placeholder*="Google Lite"]').fill(fakeGoogleKey);
  await page.locator('aside').first().getByRole('button', { name: 'Save Key' }).click();
  const debugButton = page.locator('aside').first().getByRole('button', { name: /Google Lite Debug/i });
  if (await debugButton.count()) {
    await debugButton.click();
    const debugText = await page.locator('aside').first().textContent();
    if (debugText?.includes(fakeGoogleKey)) throw new Error('Google Lite debug panel exposed API key text');
  }
  await page.locator('aside').first().getByRole('button', { name: 'Clear' }).first().click();
  await page.getByTestId('quick-generate-preview').click();
  await page.locator('aside').first().getByText(/Setup Required: save a Google Lite Image API key/i).first().waitFor({ state: 'visible', timeout: 5000 });
  const usageTextAfterNoKey = await page.locator('aside').first().textContent();
  if (!usageTextAfterNoKey?.includes('THB 0.00')) throw new Error('Google Lite no-key path should not create paid usage');
  await page.locator('aside').first().locator('select').filter({ has: page.locator('option[value="mock_local"]') }).selectOption('mock_local');

  await page.locator('aside').first().locator('textarea[placeholder="What should this render pass improve?"]').fill('Editorial opening day render pass');
  await page.locator('aside').first().locator('select').filter({ has: page.locator('option[value="Karun Retail"]') }).selectOption('Karun Retail');
  const karunLogoCount = await page.locator('aside').first().getByRole('button', { name: /Karun Logo/ }).count();
  if (karunLogoCount !== 1) throw new Error(`Karun Retail preset duplicated Karun Logo chips: ${karunLogoCount}`);
  await page.locator('aside').first().locator('label').filter({ hasText: 'Lighting Direction' }).locator('input').check();
  await page.locator('aside').first().locator('label').filter({ hasText: 'Environment' }).locator('input').check();

  await page.locator('aside').first().getByRole('button', { name: 'Work' }).click();
  await page.getByTestId('suggested-rules-card').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Generate Suggested Rules' }).click();
  await page.getByTestId('generation-rule-lock-kiosk-geometry').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByRole('button', { name: 'Quick Mode' }).click();
  await page.getByRole('button', { name: 'Generate Prompt' }).click();
  await page.locator('aside').first().getByRole('button', { name: /Material Enhancement/ }).click();
  const promptWithRule = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('ACTIVE GENERATION RULES')) || '';
  });
  if (!promptWithRule.includes('Preserve exact kiosk geometry')) throw new Error('Enabled critical rule was not injected into prompt');
  await page.locator('aside').first().getByRole('button', { name: 'Work' }).click();
  await page.getByTestId('generation-rule-lock-kiosk-geometry').locator('input[type="checkbox"]').uncheck();
  await page.locator('aside').first().getByRole('button', { name: 'Quick Mode' }).click();
  await page.getByRole('button', { name: 'Generate Prompt' }).click();
  const promptWithoutRule = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('ACTIVE GENERATION RULES')) || '';
  });
  if (promptWithoutRule.includes('Preserve exact kiosk geometry')) throw new Error('Disabled critical rule was still injected into prompt');
  await page.locator('aside').first().getByRole('button', { name: 'Work' }).click();
  await page.getByTestId('generation-rule-lock-kiosk-geometry').locator('input[type="checkbox"]').check();
  await page.locator('aside').first().getByRole('button', { name: 'Quick Mode' }).click();

  await page.getByRole('button', { name: 'Generate Prompt' }).click();
  await page.getByText('Prompt Inspector').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByRole('button', { name: /Analyze Image/ }).click();
  const analyzePrompt = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('ANALYZE BASE RENDER')) || '';
  });
  if (!analyzePrompt.toLowerCase().includes('do not generate')) throw new Error('Analyze pass is missing do-not-generate language');
  if (!analyzePrompt.includes('Analyze the image only')) throw new Error('Analyze pass is missing analyze-only language');
  if (analyzePrompt.includes('Lighting Graph')) throw new Error('Analyze pass incorrectly includes Lighting Graph');
  if (analyzePrompt.includes('Material Profiles')) throw new Error('Analyze pass incorrectly includes Material Profiles');
  if (analyzePrompt.includes('People / Activity')) throw new Error('Analyze pass incorrectly includes People / Activity');
  if ((analyzePrompt.match(/Karun Logo/g) || []).length > 1) throw new Error('Analyze prompt duplicated Karun Logo');
  if (analyzePrompt.includes('Globe Lamp\n') && analyzePrompt.includes('Globe Lamps')) throw new Error('Analyze prompt did not dedupe Globe Lamp / Globe Lamps');
  const sectionNumbers = [...analyzePrompt.matchAll(/^(\d+)\. [A-Z /]+$/gm)].map((match) => Number(match[1]));
  for (let index = 0; index < sectionNumbers.length; index += 1) {
    if (sectionNumbers[index] !== index + 1) throw new Error(`Analyze prompt section numbering skipped or duplicated: ${sectionNumbers.join(',')}`);
  }
  await page.locator('aside').first().getByRole('button', { name: /Material Enhancement/ }).click();
  const materialPrompt = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('Material Targets')) || '';
  });
  if (!materialPrompt.includes('Material Targets')) throw new Error('Material pass missing material targets');
  if (!materialPrompt.includes('Edit the uploaded image directly')) throw new Error('Material pass missing direct image-edit intent');
  for (const expected of ['richer', 'tactile', 'brushed-brass', 'leather', 'reflection', 'do not change material types', 'color identity']) {
    if (!materialPrompt.toLowerCase().includes(expected.toLowerCase())) throw new Error(`Material pass missing visual language: ${expected}`);
  }
  if (materialPrompt.includes('Analyze the image only')) throw new Error('Material pass incorrectly includes analyze-only language');
  if (materialPrompt.includes('People / Activity Layer')) throw new Error('Material pass includes People Layer when people is none');
  if (materialPrompt.includes('woodGrain:') || materialPrompt.includes('microRoughness:')) throw new Error('Material pass leaked numeric-only material profile in standard mode');
  for (const expected of [
    'PROJECT SOURCE OF TRUTH - MATERIAL RULES',
    'Karun Bench Upholstery',
    'Karun Floor Accent Pattern',
    'Karun Brand Color Exception',
    'approved Karun red/maroon upholstery',
    'Correct unwanted yellow/orange cast in neutral surfaces',
    'Do not reduce, recolor, neutralize, desaturate',
  ]) {
    if (!materialPrompt.toLowerCase().includes(expected.toLowerCase())) throw new Error(`Material pass missing Karun source-of-truth text: ${expected}`);
  }
  await page.locator('aside').first().locator('label').filter({ hasText: 'Lighting Direction' }).getByRole('button').click();
  const lightingPrompt = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('Lighting Mode')) || '';
  });
  if (!lightingPrompt.toLowerCase().includes('soft diffused daylight')) throw new Error('Lighting pass missing selected lighting language');
  if (!lightingPrompt.toLowerCase().includes('highlight rolloff')) throw new Error('Lighting pass missing highlight rolloff language');
  if (!lightingPrompt.toLowerCase().includes('do not add or replace lighting fixtures')) throw new Error('Lighting pass missing fixture preservation language');
  await page.locator('aside').first().locator('label').filter({ hasText: 'Environment' }).getByRole('button').click();
  const environmentPrompt = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('Environment Mode')) || '';
  });
  if (!environmentPrompt.toLowerCase().includes('premium contemporary mall') && !environmentPrompt.toLowerCase().includes('existing site context')) throw new Error('Environment pass missing environment narrative');
  if (!environmentPrompt.toLowerCase().includes('background depth') && !environmentPrompt.toLowerCase().includes('depth')) throw new Error('Environment pass missing background depth language');
  if (!environmentPrompt.toLowerCase().includes('architecture remains the hero')) throw new Error('Environment pass missing architecture hero language');
  await page.locator('aside').first().locator('label').filter({ hasText: 'Photographic Polish' }).getByRole('button').click();
  const finishPrompt = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('editorial architectural photograph')) || '';
  });
  if (!finishPrompt.toLowerCase().includes('less like a raw render')) throw new Error('Photographic finish missing raw-render language');
  if (!finishPrompt.toLowerCase().includes('editorial architectural photograph')) throw new Error('Photographic finish missing editorial photography language');
  if (!finishPrompt.toLowerCase().includes('do not change physical design elements')) throw new Error('Photographic finish missing physical design preservation language');
  await page.locator('aside').first().getByRole('button', { name: 'Pro Mode' }).click();
  await page.getByRole('button', { name: /v1 generated/i }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').last().getByRole('button', { name: 'Approve' }).click();
  await page.getByText(/approved v\d+/i).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('render-pass-input-object_id').setInputFiles(baseImagePath);
  await page.getByTestId('render-pass-input-material_id').setInputFiles(baseImagePath);
  await page.getByText(/Object ID Pass|logo-bb-black/i).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByRole('button', { name: 'Add Color' }).first().click();
  await page.locator('aside').first().locator('input[value="Unlabeled color 1"]').first().fill('Karun Logo');
  await page.locator('aside').first().getByRole('button', { name: 'Analyze Colors' }).first().click();
  await page.getByRole('button', { name: 'Generate Pass Prompts' }).click();
  await page.locator('aside').last().getByRole('button', { name: /v2 generated/i }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('import-ai-result-input').setInputFiles(baseImagePath);
  await page.locator('[data-testid="result-qc-panel"]').getByRole('option', { name: 'Result Round 02' }).waitFor({ state: 'attached', timeout: 5000 });
  await page.getByTestId('result-qc-cameraPreserved-no').click();
  await page.getByTestId('result-qc-architecturePreserved-yes').click();
  await page.getByTestId('result-qc-geometryPreserved-no').click();
  await page.getByTestId('result-qc-materialImproved-yes').click();
  await page.getByTestId('result-qc-lightingImproved-yes').click();
  await page.getByTestId('result-qc-unwantedObjectsAdded-yes').click();
  await page.locator('[data-testid="result-qc-panel"]').locator('input[placeholder*="Logo slightly"]').fill('Counter geometry changed');
  await page.locator('[data-testid="result-qc-panel"]').getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('[data-testid="result-qc-panel"]').getByRole('button', { name: 'Generate Revision Prompt' }).click();
  const resultRevisionPrompt = await page.locator('[data-testid="result-qc-panel"]').locator('pre').last().textContent();
  if (!resultRevisionPrompt?.includes('Counter geometry changed')) throw new Error('Result QC revision prompt missing deviation note');
  if (!resultRevisionPrompt.includes('Use the base render as the source of truth')) throw new Error('Result QC revision prompt missing source-of-truth instruction');
  if (!resultRevisionPrompt.includes('Object ID Pass as a segmentation guide')) throw new Error('Result QC revision prompt missing Object ID guidance');
  if (!resultRevisionPrompt.includes('Material ID Pass as a guide')) throw new Error('Result QC revision prompt missing Material ID guidance');
  if (!resultRevisionPrompt.includes('Karun Bench Upholstery')) throw new Error('Result QC revision prompt missing Karun material rule');
  if (!resultRevisionPrompt.includes('protected Karun red/maroon upholstery')) throw new Error('Result QC revision prompt missing protected red/maroon safeguard');

  const promptText = await page.locator('aside').last().locator('textarea').evaluateAll((items) => {
    return items.map((item) => item.value).find((value) => value.includes('ARCHVIZ AI WORKFLOW')) || '';
  });
  if (!String(promptText).includes('Base Render = Source of Truth')) throw new Error('Generated render pass prompt is missing source-of-truth language');
  if (!String(promptText).includes('You are not an architect.')) throw new Error('Generated render pass prompt is missing role lock language');
  if (!String(promptText).includes('FORBIDDEN CHANGES')) throw new Error('Generated render pass prompt is missing forbidden changes section');
  if (!String(promptText).includes('RENDER PASS REFERENCES')) throw new Error('Generated render pass prompt is missing render pass references');
  if (!String(promptText).includes('Object ID Pass available')) throw new Error('Generated render pass prompt is missing Object ID reference');
  if (!String(promptText).includes('Material ID Pass available')) throw new Error('Generated render pass prompt is missing Material ID reference');

  const jarvisZipPath = await exportZipByButton(page.getByRole('button', { name: 'Export Jarvis Review Pack' }), 'render-pass-jarvis-review.zip');
  const jarvisZip = await readZip(jarvisZipPath);
  const jarvisRequired = [
    'jarvis-review-pack/01_base_image.jpg',
    'jarvis-review-pack/data/scene-setup.json',
    'jarvis-review-pack/data/site-context.json',
    'jarvis-review-pack/data/architecture-context.json',
    'jarvis-review-pack/data/brand-context.json',
    'jarvis-review-pack/data/production-context.json',
    'jarvis-review-pack/data/reference-intelligence.json',
    'jarvis-review-pack/data/camera-system.json',
    'jarvis-review-pack/data/lighting-graph.json',
    'jarvis-review-pack/data/material-profiles.json',
    'jarvis-review-pack/data/project-knowledge-base.json',
    'jarvis-review-pack/data/knowledge-confidence.json',
    'jarvis-review-pack/data/design-lock.json',
    'jarvis-review-pack/data/protected-assets.json',
    'jarvis-review-pack/data/pass-plan.json',
    'jarvis-review-pack/data/prompt-package.json',
    'jarvis-review-pack/data/render-pass-inputs.json',
    'jarvis-review-pack/data/result-rounds.json',
    'jarvis-review-pack/data/result-qc.json',
    'jarvis-review-pack/data/project-source-of-truth.json',
    'jarvis-review-pack/render-passes/object_id_pass.png',
    'jarvis-review-pack/render-passes/material_id_pass.png',
    'jarvis-review-pack/render-passes/render-pass-legend.json',
    'jarvis-review-pack/prompts/negative_prompt.txt',
    'jarvis-review-pack/prompts/revision-prompt.txt',
    'jarvis-review-pack/README_FOR_JARVIS_B.txt',
  ];
  const jarvisMissing = jarvisRequired.filter((entry) => !jarvisZip.file(entry));
  if (jarvisMissing.length) throw new Error(`Jarvis review pack missing files: ${jarvisMissing.join(', ')}`);
  if (!jarvisZip.file('jarvis-review-pack/prompts/05_material_enhancement.txt')) throw new Error('Jarvis review pack missing material pass prompt');
  if (!jarvisZip.file('jarvis-review-pack/prompts/01_analyze_architecture.txt')) throw new Error('Jarvis review pack missing architecture analysis pass prompt');
  if (!jarvisZip.file('jarvis-review-pack/prompts/09_photographic_polish.txt')) throw new Error('Jarvis review pack missing photographic polish pass prompt');
  const promptPackage = JSON.parse(await jarvisZip.file('jarvis-review-pack/data/prompt-package.json').async('text'));
  if (promptPackage.schemaVersion !== 'visual-local-render-pass-prompts-v2') throw new Error(`Unexpected prompt package schema: ${promptPackage.schemaVersion}`);
  if (!promptPackage.passes?.length) throw new Error('Prompt package contains no generated passes');
  if (!promptPackage.cameraSystem || !promptPackage.lightingGraph || !promptPackage.materialProfiles) throw new Error('Prompt package missing production workflow nodes');
  if (!promptPackage.projectSourceOfTruth?.materialRules?.some((rule) => rule.id === 'karun-bench-upholstery')) throw new Error('Prompt package missing Karun source-of-truth rules');
  const jarvisResultQc = JSON.parse(await jarvisZip.file('jarvis-review-pack/data/result-qc.json').async('text'));
  if (!jarvisResultQc.activeResultRound?.qc?.revisionPrompt?.includes('Counter geometry changed')) throw new Error('Jarvis review pack missing Result QC revision prompt');
  const jarvisLegend = JSON.parse(await jarvisZip.file('jarvis-review-pack/render-passes/render-pass-legend.json').async('text'));
  if (!jarvisLegend.some((input) => input.type === 'object_id' && input.colorLegend?.length)) throw new Error('Jarvis review pack missing Object ID color legend');
  const jarvisCombinedText = await Promise.all(Object.values(jarvisZip.files).filter((file) => !file.dir).map((file) => file.async('text').catch(() => '')));
  if (jarvisCombinedText.join('\n').includes('TEST_GEMINI_SECRET_DO_NOT_EXPORT')) throw new Error('Jarvis review pack leaked Gemini API key');

  const handoffZipPath = await exportZipByButton(page.getByTestId('export-render-handoff'), 'render-pass-handoff.zip');
  const handoffZip = await readZip(handoffZipPath);
  const handoffRequired = [
    'render-handoff-pack/01_base_image.jpg',
    'render-handoff-pack/selected_pass_prompt.txt',
    'render-handoff-pack/selected_pass_prompt_generic.txt',
    'render-handoff-pack/all_pass_prompts.txt',
    'render-handoff-pack/negative_prompt.txt',
    'render-handoff-pack/revision_prompt.txt',
    'render-handoff-pack/data/render-pass-inputs.json',
    'render-handoff-pack/data/result-rounds.json',
    'render-handoff-pack/data/result-qc.json',
    'render-handoff-pack/render-passes/object_id_pass.png',
    'render-handoff-pack/render-passes/material_id_pass.png',
    'render-handoff-pack/render-passes/render-pass-legend.json',
    'render-handoff-pack/README_RENDER_HANDOFF.txt',
    'render-handoff-pack/handoff-summary.json',
  ];
  const handoffMissing = handoffRequired.filter((entry) => !handoffZip.file(entry));
  if (handoffMissing.length) throw new Error(`Render pass handoff missing files: ${handoffMissing.join(', ')}`);
  const summary = JSON.parse(await handoffZip.file('render-handoff-pack/handoff-summary.json').async('text'));
  if (summary.schemaVersion !== 'visual-local-render-pass-handoff-v1') throw new Error(`Unexpected handoff schema: ${summary.schemaVersion}`);
  if (!summary.generatedPassesCount) throw new Error('Render pass handoff summary has no generated passes');
  if (summary.selectedAdapter !== 'generic') throw new Error(`Unexpected selected adapter: ${summary.selectedAdapter}`);
  if (!summary.selectedPromptVersion?.versionNumber) throw new Error('Render pass handoff summary missing selected prompt version');
  if (!summary.approvedPromptVersion?.versionNumber) throw new Error('Render pass handoff summary missing approved prompt version');
  if (summary.renderPassInputs?.enabledCount < 2) throw new Error('Render pass handoff summary missing render pass input counts');
  if (summary.resultRoundsCount !== 2) throw new Error(`Render pass handoff summary unexpected result round count: ${summary.resultRoundsCount}`);
  if (!summary.activeRules?.some((rule) => rule.id === 'lock-kiosk-geometry')) throw new Error('Render handoff summary missing active rule IDs');
  if (!summary.projectSourceOfTruth?.activeRuleIds?.includes('karun-bench-upholstery')) throw new Error('Render handoff summary missing Karun active material rule IDs');
  if (!summary.projectSourceOfTruth?.scopedColorCastCorrection?.includes('neutral surfaces')) throw new Error('Render handoff summary missing scoped color-cast correction');
  if (!summary.telemetrySummary || summary.telemetrySummary.totalEvents < 1) throw new Error('Render handoff summary missing telemetry summary');
  const selectedPrompt = await handoffZip.file('render-handoff-pack/selected_pass_prompt.txt').async('text');
  if (!selectedPrompt.includes('ARCHVIZ AI WORKFLOW')) throw new Error('Selected pass prompt text is missing workflow header');
  const handoffResultQc = JSON.parse(await handoffZip.file('render-handoff-pack/data/result-qc.json').async('text'));
  if (handoffResultQc.activeResultRound?.qc?.hallucinationRisk !== 'high') throw new Error('Render handoff Result QC did not compute high hallucination risk');
  const handoffCombinedText = await Promise.all(Object.values(handoffZip.files).filter((file) => !file.dir).map((file) => file.async('text').catch(() => '')));
  if (handoffCombinedText.join('\n').includes('TEST_GEMINI_SECRET_DO_NOT_EXPORT')) throw new Error('Render handoff pack leaked Gemini API key');

  console.log('PASS');
} finally {
  await page.evaluate(() => localStorage.removeItem('visual-local-gemini-api-key')).catch(() => {});
  await page.evaluate(() => localStorage.removeItem('visual-local-generation-key:google_lite_image')).catch(() => {});
  await browser.close();
}
