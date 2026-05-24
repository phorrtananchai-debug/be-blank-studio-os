import JSZip from 'jszip';
import { PackageHealth, Scene, SlotCategory } from './types';

const requiredPaths = [
  'visual-brief-package/manifest.json',
  'visual-brief-package/data/scene.json',
  'visual-brief-package/data/slots.json',
  'visual-brief-package/data/mapping.json',
  'visual-brief-package/data/output-spec.json',
];
const boardPaths = [
  'visual-brief-package/boards/material_board.png',
  'visual-brief-package/boards/prop_board.png',
  'visual-brief-package/boards/lighting_board.png',
  'visual-brief-package/boards/environment_board.png',
  'visual-brief-package/boards/atmosphere_board.png',
  'visual-brief-package/boards/package_summary.png',
  'visual-brief-package/boards/mapping_overlay_board.png',
];

export function sceneHealth(scene: Scene): PackageHealth {
  const byType: Record<SlotCategory, number> = { materials: 0, props: 0, lighting: 0, environment: 0 };
  let refs = 0;
  let pins = 0;
  let regions = 0;
  const warnings: string[] = [];
  const errors: string[] = [];

  scene.slots.forEach((s) => {
    byType[s.category] += 1;
    refs += s.referenceImages.length;
    pins += s.pins.length;
    regions += s.regions.length;
    if (!s.descriptionThai.trim() && s.referenceImages.length > 0) {
      warnings.push(`${s.code}: image-only reference, prompt should allow moderate interpretation.`);
    }
  });
  if (!scene.baseImage) errors.push('Base image is missing.');

  return {
    status: errors.length ? 'error' : warnings.length ? 'warning' : 'healthy',
    summary: {
      slotCount: scene.slots.length,
      refImageCount: refs,
      pinsCount: pins,
      regionCount: regions,
      hasBaseImage: Boolean(scene.baseImage),
      hasMappingOverlay: pins + regions > 0,
      hasOutputSpec: Boolean(scene.outputSpec),
      hasLocalPrompt: Boolean(scene.localPrompt?.trim()),
      byType,
    },
    warnings,
    errors,
  };
}

export async function zipHealth(zip: JSZip): Promise<PackageHealth> {
  const warnings: string[] = [];
  const errors: string[] = [];
  for (const p of requiredPaths) {
    if (!zip.file(p)) errors.push(`Missing required file: ${p.replace('visual-brief-package/', '')}`);
  }
  const sceneText = await zip.file('visual-brief-package/data/scene.json')?.async('text');
  const slotsText = await zip.file('visual-brief-package/data/slots.json')?.async('text');
  let scene: Scene | null = null;
  let slots: any[] = [];
  try { scene = sceneText ? JSON.parse(sceneText) : null; } catch { errors.push('scene.json cannot be parsed'); }
  try { slots = slotsText ? JSON.parse(slotsText) : []; } catch { errors.push('slots.json cannot be parsed'); }
  if (!scene?.baseImage && !Object.keys(zip.files).some((f) => f.startsWith('visual-brief-package/images/base/'))) errors.push('Base image is missing.');
  if (!Object.keys(zip.files).some((f) => f.startsWith('visual-brief-package/images/overlays/'))) warnings.push('Mapping overlay is missing.');
  if (!zip.file('visual-brief-package/prompts/local-prompt.txt')) warnings.push('Local prompt is missing.');
  const missingBoards = boardPaths.filter((p) => !zip.file(p));
  if (missingBoards.length) warnings.push(`Missing board files: ${missingBoards.map((x) => x.replace('visual-brief-package/', '')).join(', ')}`);
  const manifestText = await zip.file('visual-brief-package/manifest.json')?.async('text');
  if (manifestText) {
    try {
      const manifest = JSON.parse(manifestText);
      if (manifest?.boards?.boardStatus === 'stale') warnings.push('Boards are marked stale in manifest.');
    } catch {
      // ignore
    }
  }
  const refs = Object.keys(zip.files).filter((f) => f.startsWith('visual-brief-package/refs/') && !f.endsWith('/'));
  slots.forEach((s) => {
    if (s.referenceImages?.length > 0 && !s.descriptionThai?.trim()) warnings.push(`${s.code}: image-only reference, prompt should allow moderate interpretation.`);
    if ((s.referenceImages?.length || 0) > 0 && refs.length === 0) warnings.push(`${s.code}: references declared but refs folder appears empty.`);
  });

  const byType: Record<SlotCategory, number> = { materials: 0, props: 0, lighting: 0, environment: 0 };
  let pins = 0;
  let regions = 0;
  slots.forEach((s) => {
    if (byType[s.category as SlotCategory] !== undefined) byType[s.category as SlotCategory] += 1;
    pins += s.pins?.length || 0;
    regions += s.regions?.length || 0;
  });
  return {
    status: errors.length ? 'error' : warnings.length ? 'warning' : 'healthy',
    summary: {
      slotCount: slots.length,
      refImageCount: refs.length,
      pinsCount: pins,
      regionCount: regions,
      hasBaseImage: Boolean(scene?.baseImage) || Object.keys(zip.files).some((f) => f.startsWith('visual-brief-package/images/base/')),
      hasMappingOverlay: Object.keys(zip.files).some((f) => f.startsWith('visual-brief-package/images/overlays/')),
      hasOutputSpec: Boolean(zip.file('visual-brief-package/data/output-spec.json')),
      hasLocalPrompt: Boolean(zip.file('visual-brief-package/prompts/local-prompt.txt')),
      byType,
    },
    warnings,
    errors,
  };
}
