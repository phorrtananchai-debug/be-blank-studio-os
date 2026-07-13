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
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.getByRole('button', { name: /Add Slot|Add Material|Add Prop|Add Lighting|Add Environment/i }).first().click();
  const inspector = page.locator('aside').last();
  const inspectorName = inspector.locator('input').first();
  await inspectorName.fill(slotName);
  const thaiArea = inspector.locator('textarea[placeholder="Thai description"]');
  await thaiArea.fill(thaiText);
  if (withRef) {
    await page.locator('label:has-text("Upload Reference") input[type=file]').setInputFiles(baseImagePath);
  }
}

async function exportZip(filename) {
  const dlPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Archive ZIP' }).click();
  const dl = await dlPromise;
  const zipPath = path.join(downloadsDir, filename);
  await dl.saveAs(zipPath);
  return zipPath;
}

async function reassignSelectedObjectToCode(code) {
  const select = page.getByTestId('mapped-object-slot-select');
  await select.waitFor({ state: 'visible', timeout: 3000 });
  const value = await select.evaluate((el, targetCode) => {
    const option = Array.from(el.options).find((item) => item.textContent?.trim().startsWith(`${targetCode} `) || item.textContent?.trim().startsWith(`${targetCode} -`));
    return option?.value || '';
  }, code);
  if (!value) throw new Error(`Could not find mapped object reassignment option for ${code}`);
  await select.selectOption(value);
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

function invalidRegionsFromMapping(mapping = []) {
  return (mapping || [])
    .flatMap((m) => m?.regions || [])
    .filter((r) => !r || r.width <= 0 || r.height <= 0 || r.width < 0.015 || r.height < 0.015 || r.x < 0 || r.y < 0 || r.x > 1 || r.y > 1);
}

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  ok('open_app');

  await setTopNames();
  ok('set_project_scene_names');

  const baseInput = page.getByTestId('base-image-input');
  if ((await baseInput.count()) !== 1) throw new Error('Expected exactly one base-image input');
  const toolbarUploadBtn = page.locator('header').getByRole('button', { name: 'Upload Base Image' });
  const emptyUploadBtn = page.locator('main section').getByRole('button', { name: 'Upload Base Image' });
  if (!(await toolbarUploadBtn.isVisible())) throw new Error('Toolbar Upload Base Image button is not visible');
  if (!(await emptyUploadBtn.isVisible())) throw new Error('Empty-state Upload Base Image button is not visible');
  if (!(await page.getByText(/Drag and drop an image here, or paste from clipboard\./i).isVisible())) {
    throw new Error('Empty-state drag/drop or paste helper text is not visible');
  }
  ok('verify_base_upload_controls');

  await page.getByRole('button', { name: 'Advanced Mapper' }).click();

  for (const label of ['Materials', 'Props', 'Lighting', 'Environment', 'People', 'Output', 'Boards', 'AI Prompt']) {
    if (!(await page.getByRole('button', { name: label, exact: true }).isVisible())) {
      throw new Error(`Mode tab label is not visible: ${label}`);
    }
  }
  const activeModeStyle = await page.getByRole('button', { name: 'Materials', exact: true }).evaluate((el) => {
    const style = getComputedStyle(el);
    return { border: style.borderColor, background: style.backgroundColor, color: style.color };
  });
  report.checks.activeModeStyle = activeModeStyle;
  if (!activeModeStyle.border.includes('255, 136, 0')) throw new Error(`Expected active Materials mode to use orange border, got ${activeModeStyle.border}`);
  ok('verify_mode_tab_labels');
  await baseInput.setInputFiles(baseImagePath);
  await page.locator('header').getByRole('button', { name: 'Replace Base Image' }).waitFor({ state: 'visible', timeout: 5000 });
  ok('upload_base_image', baseImagePath);

  await addSlot('Materials', 'Warm Oak Wood', 'ไม้โอ๊คโทนอุ่น ผิวกึ่งด้าน ลายไม้ธรรมชาติ', true);
  await addSlot('Materials', 'White Painted Brick', 'อิฐทาสีขาว โทนสะอาด เรียบแต่มีผิวสัมผัส');
  await addSlot('Props', 'Ceramic Vase', 'แจกันเซรามิกทรงโมเดิร์น โทนขาวนวล วางเป็นจุดเด่น');
  await addSlot('Lighting', 'Daylight Left', 'แสงธรรมชาติเข้าจากซ้าย นุ่มนวล เงาไม่แข็ง');
  await addSlot('Environment', 'Residential Garden / Mountain Retreat', 'พื้นหลังสวนที่พักอาศัย ผ่อนคลาย กลิ่นอายรีสอร์ตภูเขา');
  ok('add_slots_with_thai_descriptions');

  await page.getByRole('button', { name: 'Materials', exact: true }).click();
  await page.getByRole('button', { name: /M01.*Warm Oak Wood/i }).click();

  const stageHost = page.locator('.konvajs-content').first();
  await stageHost.scrollIntoViewIfNeeded();
  const box = await stageHost.boundingBox();
  if (!box) throw new Error('Konva stage not found');

  await page.getByTestId('tool-move').click();
  const beforeMoveBox = await stageHost.boundingBox();
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 150, { steps: 12 });
  await page.mouse.up();
  const afterMoveBox = await stageHost.boundingBox();
  if (!beforeMoveBox || !afterMoveBox || Math.abs(beforeMoveBox.x - afterMoveBox.x) > 1 || Math.abs(beforeMoveBox.y - afterMoveBox.y) > 1) {
    throw new Error('Move mode moved the base/stage frame');
  }
  await page.getByTestId('reset-view').click();
  ok('verify_move_mode_and_reset_view');

  const toolStyle = await page.getByTestId('tool-move').evaluate((el) => {
    const style = getComputedStyle(el);
    return { border: style.borderColor, background: style.backgroundColor, color: style.color };
  });
  report.checks.activeToolStyle = toolStyle;
  if (!toolStyle.border.includes('255, 136, 0')) throw new Error(`Expected active Move tool to use orange border, got ${toolStyle.border}`);

  const chip = page.getByTestId('slot-drag-chip-M01').first();
  const chipBox = await chip.boundingBox();
  if (!chipBox) throw new Error('M01 slot drag chip not found');
  await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 130, { steps: 16 });
  await page.mouse.up();
  await page.getByText('M01 pin added').waitFor({ state: 'visible', timeout: 3000 });
  ok('drag_slot_chip_to_canvas');

  await reassignSelectedObjectToCode('M02');
  await page.getByText('Pin reassigned to M02').waitFor({ state: 'visible', timeout: 3000 });
  await reassignSelectedObjectToCode('M01');
  await page.getByText('Pin reassigned to M01').waitFor({ state: 'visible', timeout: 3000 });
  ok('reassign_pin_to_slot');

  await page.getByTestId('mapping-undo').click();
  await page.getByTestId('mapping-redo').click();
  ok('undo_redo_mapping');

  await page.getByTestId('tool-pin').click();
  const boxAfterReset = await stageHost.boundingBox();
  if (!boxAfterReset) throw new Error('Konva stage not found after reset view');
  await page.mouse.click(boxAfterReset.x + 320, boxAfterReset.y + 200);
  ok('add_2_pins', 'one chip-dropped pin plus one Pin tool click');

  await page.getByTestId('tool-rect').click();
  await page.waitForTimeout(100);
  await page.mouse.move(boxAfterReset.x + 220, boxAfterReset.y + 220, { steps: 5 });
  await page.mouse.down();
  await page.mouse.move(boxAfterReset.x + 420, boxAfterReset.y + 320, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  ok('draw_1_rectangle_region_attempt');

  await reassignSelectedObjectToCode('M02');
  await page.getByText('Region reassigned to M02').waitFor({ state: 'visible', timeout: 3000 });
  await reassignSelectedObjectToCode('M01');
  await page.getByText('Region reassigned to M01').waitFor({ state: 'visible', timeout: 3000 });
  ok('reassign_region_to_slot');

  await page.getByRole('button', { name: 'Prompt', exact: true }).click();
  await page.getByRole('button', { name: /Prompt Block/i }).click();
  const promptReady = page.getByText(/characters ready/i).first();
  await promptReady.waitFor({ state: 'visible', timeout: 3000 });
  const promptSummary = await promptReady.textContent();
  const promptLength = Number((promptSummary || '').match(/(\d+)/)?.[1] || 0);
  if (promptLength < 30) throw new Error('Generated prompt is empty or too short');
  ok('generate_local_prompt', `prompt_length=${promptLength}`);

  await page.getByRole('button', { name: 'Boards', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Boards' }).first().click();
  await page.getByText('Boards generated').waitFor({ state: 'visible', timeout: 3000 });
  ok('generate_boards_updates_ui');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  ok('save_local_draft');

  const zip1 = await exportZip('smoke-export-1.zip');
  ok('export_zip_1', zip1);
  const before = await parseZip(zip1);
  const m01Before = before.scene?.slots?.find((s) => s.code === 'M01');
  const beforeRects = m01Before?.regions?.length ?? 0;
  const beforePins = m01Before?.pins?.length ?? 0;
  const exportedRects = (before.mapping || []).find((m) => m.slotId === m01Before?.id)?.regions?.length ?? beforeRects;
  const invalidBeforeRegions = invalidRegionsFromMapping(before.mapping);
  report.checks.pinsM01 = beforePins;
  report.checks.rectsM01 = beforeRects;
  report.checks.exportedRectsM01 = exportedRects;
  report.checks.invalidExportRegions = invalidBeforeRegions.length;
  if (beforeRects < 1) throw new Error(`Expected at least 1 M01 region before export verification, got ${beforeRects}`);
  if (exportedRects < 1) throw new Error(`Expected at least 1 exported M01 region in mapping.json, got ${exportedRects}`);
  if (invalidBeforeRegions.length > 0) throw new Error(`Expected no invalid exported regions, found ${invalidBeforeRegions.length}`);
  const m01Line = (before.localPrompt || '').split('\n').find((line) => /^M01\b/.test(line));
  if (!m01Line) throw new Error('Expected M01 line in local prompt');
  const mappingMatch = /mapped with (\d+) pin[s]? and (\d+) region[s]?/i.exec(m01Line);
  if (!mappingMatch) throw new Error('Expected mapping count text for M01 in local prompt');
  const promptPins = Number(mappingMatch[1]);
  const promptRegions = Number(mappingMatch[2]);
  if (promptPins !== beforePins || promptRegions !== exportedRects) {
    throw new Error(`Prompt mapping count mismatch for M01. prompt=${promptPins}/${promptRegions}, data=${beforePins}/${exportedRects}`);
  }
  ok('assert_m01_region_before_export', `pins=${beforePins}, rects=${beforeRects}, exportedRects=${exportedRects}`);

  await page.locator('label:has-text("Import") input[type=file]').setInputFiles(zip1);
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
  const invalidAfterRegions = invalidRegionsFromMapping(after.mapping);
  report.checks.importedRectsM01 = importedRects;
  report.checks.reExportedRectsM01 = reExportedRects;
  report.checks.invalidReExportRegions = invalidAfterRegions.length;
  if (importedRects < 1) throw new Error(`Expected at least 1 M01 region after import, got ${importedRects}`);
  if (reExportedRects < 1) throw new Error(`Expected at least 1 M01 region after re-export mapping.json, got ${reExportedRects}`);
  if (invalidAfterRegions.length > 0) throw new Error(`Expected no invalid re-exported regions, found ${invalidAfterRegions.length}`);
  ok('assert_m01_region_after_import', `importedRects=${importedRects}, reExportedRects=${reExportedRects}`);

  await page.getByTestId('reset-mapping').click();
  const zip3 = await exportZip('smoke-export-3-after-reset.zip');
  const reset = await parseZip(zip3);
  const resetPins = reset.scene?.slots?.reduce((sum, slot) => sum + (slot.pins?.length || 0), 0) ?? 0;
  const resetRegions = reset.scene?.slots?.reduce((sum, slot) => sum + (slot.regions?.length || 0), 0) ?? 0;
  report.checks.resetPins = resetPins;
  report.checks.resetRegions = resetRegions;
  if (resetPins !== 0 || resetRegions !== 0) throw new Error(`Reset Mapping did not clear mappings. pins=${resetPins}, regions=${resetRegions}`);
  ok('reset_mapping_clears_mappings', `pins=${resetPins}, regions=${resetRegions}`);

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

