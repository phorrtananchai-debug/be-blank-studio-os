import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import JSZip from 'jszip';

const cwd = process.cwd();
const downloadsDir = path.join(cwd, 'test-results');
await fs.mkdir(downloadsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
page.on('dialog', async (dialog) => dialog.accept());

const baseImagePath = path.join(cwd, 'public', 'logo-bb-black.png');
const report = { steps: [], errors: [], checks: {} };

function ok(step, details = '') { report.steps.push({ step, ok: true, details }); }
function fail(step, error) { report.steps.push({ step, ok: false, details: String(error) }); report.errors.push({ step, error: String(error) }); }

async function setTopNames() {
  const topInputs = page.locator('header input');
  await topInputs.nth(0).fill('Private Residence Test');
  await topInputs.nth(1).fill('Living Area Test');
}

async function addSlot(tab, slotName, thaiText, withRef = false) {
  await page.getByRole('button', { name: tab }).click();
  await page.getByRole('button', { name: 'Add Slot' }).click();
  const inspector = page.locator('aside').last();
  const inspectorName = inspector.locator('input').first();
  await inspectorName.fill(slotName);
  const thaiArea = inspector.locator('textarea[placeholder="Thai description"]');
  await thaiArea.fill(thaiText);
  if (withRef) {
    await page.locator('label:has-text("Upload reference") input[type=file]').setInputFiles(baseImagePath);
  }
}

async function exportZip(filename) {
  const dlPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Draft ZIP' }).click();
  const dl = await dlPromise;
  const zipPath = path.join(downloadsDir, filename);
  await dl.saveAs(zipPath);
  return zipPath;
}

async function parseZip(zipPath) {
  const raw = await fs.readFile(zipPath);
  const zip = await JSZip.loadAsync(raw);
  const readJson = async (p) => {
    const f = zip.file(p);
    if (!f) return null;
    return JSON.parse(await f.async('text'));
  };
  const scene = await readJson('visual-brief-package/data/scene.json');
  const project = await readJson('visual-brief-package/data/project.json');
  const mapping = await readJson('visual-brief-package/data/mapping.json');
  const outputSpec = await readJson('visual-brief-package/data/output-spec.json');
  const localPrompt = await zip.file('visual-brief-package/prompts/local-prompt.txt')?.async('text');
  const refs = Object.keys(zip.files).filter((f) => f.startsWith('visual-brief-package/refs/') && !f.endsWith('/'));
  const boards = Object.keys(zip.files).filter((f) => f.startsWith('visual-brief-package/boards/') && !f.endsWith('/'));
  return { scene, project, mapping, outputSpec, localPrompt, refs, boards, fileCount: Object.keys(zip.files).length };
}

try {
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  ok('open_app');

  await setTopNames();
  ok('set_project_scene_names');

  await page.locator('label:has-text("Base Image") input[type=file]').setInputFiles(baseImagePath);
  ok('upload_base_image', baseImagePath);

  await addSlot('materials', 'Warm Oak Wood', 'ไม้โอ๊คโทนอุ่น ผิวกึ่งด้าน ลายไม้ธรรมชาติ', true);
  await addSlot('materials', 'White Painted Brick', 'อิฐทาสีขาว โทนสะอาด เรียบแต่มีผิวสัมผัส');
  await addSlot('props', 'Ceramic Vase', 'แจกันเซรามิกทรงโมเดิร์น โทนขาวนวล วางเป็นจุดเด่น');
  await addSlot('lighting', 'Daylight Left', 'แสงธรรมชาติเข้าจากซ้าย นุ่มนวล เงาไม่แข็ง');
  await addSlot('environment', 'Residential Garden / Mountain Retreat', 'พื้นหลังสวนที่พักอาศัย ผ่อนคลาย กลิ่นอายรีสอร์ตภูเขา');
  ok('add_slots_with_thai_descriptions');

  await page.getByRole('button', { name: 'materials' }).click();
  await page.getByRole('button', { name: 'M01 Warm Oak Wood' }).click();

  await page.getByTestId('tool-pin').click();
  const stageHost = page.locator('.konvajs-content').first();
  await stageHost.scrollIntoViewIfNeeded();
  const box = await stageHost.boundingBox();
  if (!box) throw new Error('Konva stage not found');
  await page.mouse.click(box.x + 180, box.y + 130);
  await page.mouse.click(box.x + 320, box.y + 200);
  ok('add_2_pins');

  await page.getByTestId('tool-rect').click();
  await page.mouse.move(box.x + 220, box.y + 220, { steps: 5 });
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 320, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  ok('draw_1_rectangle_region_attempt');

  await page.getByRole('button', { name: /Generate Local Prompt/i }).click();
  const promptText = await page.locator('aside').last().locator('textarea').last().inputValue();
  if (!promptText || promptText.length < 30) throw new Error('Generated prompt is empty or too short');
  ok('generate_local_prompt', `prompt_length=${promptText.length}`);

  await page.getByRole('button', { name: /Save Local Draft/i }).click();
  ok('save_local_draft');

  const zip1 = await exportZip('smoke-export-1.zip');
  ok('export_zip_1', zip1);
  const before = await parseZip(zip1);
  const m01Before = before.scene?.slots?.find((s) => s.code === 'M01');
  const beforeRects = m01Before?.regions?.length ?? 0;
  const beforePins = m01Before?.pins?.length ?? 0;
  const exportedRects = (before.mapping || []).find((m) => m.slotId === m01Before?.id)?.regions?.length ?? beforeRects;
  report.checks.pinsM01 = beforePins;
  report.checks.rectsM01 = beforeRects;
  report.checks.exportedRectsM01 = exportedRects;
  if (beforeRects < 1) throw new Error(`Expected at least 1 M01 region before export verification, got ${beforeRects}`);
  if (exportedRects < 1) throw new Error(`Expected at least 1 exported M01 region in mapping.json, got ${exportedRects}`);
  ok('assert_m01_region_before_export', `pins=${beforePins}, rects=${beforeRects}, exportedRects=${exportedRects}`);

  await page.locator('label:has-text("Import ZIP") input[type=file]').setInputFiles(zip1);
  await page.getByRole('button', { name: 'Import as New Project' }).click();
  ok('import_zip');

  const topInputs = page.locator('header input');
  const importedProjectName = await topInputs.nth(0).inputValue();
  const importedSceneName = await topInputs.nth(1).inputValue();
  ok('verify_names_in_ui', `${importedProjectName} / ${importedSceneName}`);

  const zip2 = await exportZip('smoke-export-2-after-import.zip');
  ok('export_zip_2', zip2);
  const after = await parseZip(zip2);
  const m01After = after.scene?.slots?.find((s) => s.code === 'M01');
  const importedRects = m01After?.regions?.length ?? 0;
  const reExportedRects = (after.mapping || []).find((m) => m.slotId === m01After?.id)?.regions?.length ?? importedRects;
  report.checks.importedRectsM01 = importedRects;
  report.checks.reExportedRectsM01 = reExportedRects;
  if (importedRects < 1) throw new Error(`Expected at least 1 M01 region after import, got ${importedRects}`);
  if (reExportedRects < 1) throw new Error(`Expected at least 1 M01 region after re-export mapping.json, got ${reExportedRects}`);
  ok('assert_m01_region_after_import', `importedRects=${importedRects}, reExportedRects=${reExportedRects}`);

  report.comparison = {
    before: {
      projectName: before.project?.name,
      sceneName: before.scene?.name,
      slotCount: before.scene?.slots?.length ?? 0,
      baseImage: Boolean(before.scene?.baseImage),
      refsCount: before.refs.length,
      outputPreset: before.outputSpec?.outputPreset,
      promptLength: (before.localPrompt || '').length,
      pinsM01: before.scene?.slots?.find((s) => s.code === 'M01')?.pins?.length ?? 0,
      rectsM01: before.scene?.slots?.find((s) => s.code === 'M01')?.regions?.length ?? 0,
      exportedRectsM01: (before.mapping || []).find((m) => m.slotId === before.scene?.slots?.find((s) => s.code === 'M01')?.id)?.regions?.length ?? 0,
      boardsCount: before.boards.length,
    },
    after: {
      projectName: after.project?.name,
      sceneName: after.scene?.name,
      slotCount: after.scene?.slots?.length ?? 0,
      baseImage: Boolean(after.scene?.baseImage),
      refsCount: after.refs.length,
      outputPreset: after.outputSpec?.outputPreset,
      promptLength: (after.localPrompt || '').length,
      pinsM01: after.scene?.slots?.find((s) => s.code === 'M01')?.pins?.length ?? 0,
      rectsM01: after.scene?.slots?.find((s) => s.code === 'M01')?.regions?.length ?? 0,
      importedRectsM01: after.scene?.slots?.find((s) => s.code === 'M01')?.regions?.length ?? 0,
      reExportedRectsM01: (after.mapping || []).find((m) => m.slotId === after.scene?.slots?.find((s) => s.code === 'M01')?.id)?.regions?.length ?? 0,
      boardsCount: after.boards.length,
    },
  };
} catch (error) {
  fail('smoke_flow', error);
} finally {
  await browser.close();
}

const reportPath = path.join(downloadsDir, 'smoke-visual-brief-report.json');
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(reportPath);
