import { PackageHealth, Scene, Slot } from './types';
import { loadImage } from './imageTools';

export type GeneratedBoards = {
  generatedAt: string;
  boardStatus: 'generated' | 'missing' | 'stale';
  files: Record<string, string>;
};

const W = 2000;
const H = 1200;

function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawHeader(ctx: CanvasRenderingContext2D, title: string, meta: string) {
  ctx.fillStyle = '#101215';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f3f4f6';
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText(title, 48, 62);
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillStyle = '#c3cad3';
  ctx.fillText(meta, 48, 98);
}

function splitSegments(text: string) {
  if (!text) return [];
  if (text.includes(' ')) return text.split(' ');
  return Array.from(text);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 6) {
  const words = splitSegments(text);
  let line = '';
  let lines = 0;
  for (let n = 0; n < words.length; n += 1) {
    const token = text.includes(' ') ? `${words[n]} ` : words[n];
    const testLine = `${line}${token}`;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = token;
      y += lineHeight;
      lines += 1;
      if (lines >= maxLines) {
        const ellipsis = `${line.slice(0, Math.max(0, line.length - 1))}…`;
        ctx.fillText(ellipsis, x, y);
        return y;
      }
    } else line = testLine;
  }
  ctx.fillText(line, x, y);
  return y;
}

async function drawRefs(ctx: CanvasRenderingContext2D, refs: string[], x: number, y: number) {
  for (let i = 0; i < Math.min(3, refs.length); i += 1) {
    try {
      const img = await loadImage(refs[i]);
      ctx.drawImage(img, x + i * 110, y, 100, 80);
      ctx.strokeStyle = '#2b313b';
      ctx.strokeRect(x + i * 110, y, 100, 80);
    } catch {
      // ignore bad refs
    }
  }
}

async function categoryBoard(scene: Scene, projectName: string, title: string, slots: Slot[], note: string, fields: (slot: Slot) => string[]) {
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  drawHeader(ctx, title, `${projectName} / ${scene.name}`);
  ctx.fillStyle = '#8fa1b7';
  ctx.font = '500 20px Inter, sans-serif';
  ctx.fillText(note, 48, 132);
  if (!slots.length) {
    ctx.fillStyle = '#171b22';
    ctx.fillRect(42, 200, 1916, 180);
    ctx.strokeStyle = '#2b313b';
    ctx.strokeRect(42, 200, 1916, 180);
    ctx.fillStyle = '#d0d7e0';
    ctx.font = '600 28px Inter, sans-serif';
    ctx.fillText('No slots in this category yet.', 78, 280);
    return c.toDataURL('image/png');
  }

  const columns = slots.length <= 4 ? 1 : slots.length <= 8 ? 2 : 3;
  const gap = 18;
  const cardW = Math.floor((1916 - gap * (columns - 1)) / columns);
  const cardH = columns === 1 ? 220 : columns === 2 ? 250 : 280;
  const startX = 42;
  const startY = 170;
  for (let i = 0; i < Math.min(12, slots.length); i += 1) {
    const slot = slots[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + 16);
    if (y + cardH > 1160) break;
    ctx.fillStyle = '#171b22';
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = '#28303b';
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.fillStyle = slot.color;
    ctx.fillRect(x + 16, y + 14, 22, 22);
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(x + 44, y + 10, 72, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 19px Inter, sans-serif';
    ctx.fillText(slot.code, x + 52, y + 30);
    ctx.fillStyle = '#f3f4f6';
    ctx.font = '700 23px Inter, sans-serif';
    wrapText(ctx, slot.name || '-', x + 124, y + 31, cardW - 140, 26, 1);
    ctx.font = '500 17px Inter, sans-serif';
    ctx.fillStyle = '#d0d7e0';
    let ty = y + 68;
    for (const line of fields(slot)) {
      ty = wrapText(ctx, line, x + 16, ty, cardW - 24, 22, 3) + 6;
      if (ty > y + cardH - 92) break;
    }
    await drawRefs(ctx, slot.referenceImages || [], x + 16, y + cardH - 92);
  }
  return c.toDataURL('image/png');
}

export async function generateBoards(scene: Scene, projectName: string, health: PackageHealth): Promise<GeneratedBoards> {
  const files: Record<string, string> = {};
  const mapCanvas = makeCanvas(1600, 1000);
  const mapCtx = mapCanvas.getContext('2d')!;
  mapCtx.fillStyle = '#f8fafc';
  mapCtx.fillRect(0, 0, 1600, 1000);
  if (scene.baseImage) {
    try {
      const img = await loadImage(scene.baseImage);
      const scale = Math.min(1500 / img.width, 860 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const ox = 40;
      const oy = 100;
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillRect(ox - 10, oy - 10, w + 20, h + 20);
      mapCtx.strokeStyle = '#cbd5e1';
      mapCtx.lineWidth = 2;
      mapCtx.strokeRect(ox - 10, oy - 10, w + 20, h + 20);
      mapCtx.drawImage(img, ox, oy, w, h);
      scene.slots.forEach((s) => {
        s.regions.forEach((r) => {
          mapCtx.fillStyle = `${s.color}66`;
          mapCtx.strokeStyle = s.color;
          mapCtx.lineWidth = 2;
          mapCtx.fillRect(ox + r.x * w, oy + r.y * h, r.width * w, r.height * h);
          mapCtx.strokeRect(ox + r.x * w, oy + r.y * h, r.width * w, r.height * h);
        });
        s.pins.forEach((p) => {
          const x = ox + p.x * w;
          const y = oy + p.y * h;
          mapCtx.fillStyle = s.color;
          mapCtx.beginPath();
          mapCtx.arc(x, y, 7, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.fillStyle = '#ffffffee';
          mapCtx.strokeStyle = s.color;
          mapCtx.lineWidth = 2;
          mapCtx.fillRect(x + 8, y - 22, 48, 20);
          mapCtx.strokeRect(x + 8, y - 22, 48, 20);
          mapCtx.fillStyle = '#0f172a';
          mapCtx.font = '800 13px Inter, sans-serif';
          mapCtx.fillText(s.code, x + 14, y - 8);
        });
      });
    } catch {
      // ignore
    }
  }
  mapCtx.fillStyle = '#0f172a';
  mapCtx.font = '700 32px Inter, sans-serif';
  mapCtx.fillText('Mapping Overlay Board', 40, 54);
  mapCtx.font = '500 20px Inter, sans-serif';
  mapCtx.fillStyle = '#334155';
  mapCtx.fillText(`${projectName} / ${scene.name}`, 40, 82);
  mapCtx.fillText('Legend: Materials / Props / Lighting / Environment', 980, 70);
  const mapping = mapCanvas.toDataURL('image/png');
  files['boards/mapping_overlay_board.png'] = mapping;
  files['images/overlays/scene_mapping_overlay.png'] = mapping;

  files['boards/material_board.png'] = await categoryBoard(
    scene, projectName, 'Material Reference Board', scene.slots.filter((s) => s.category === 'materials'),
    'Material references control surface tone, finish, texture, and avoid rules.',
    (s) => [
      `category: ${s.categoryLabel || '-'}`,
      `thai: ${s.descriptionThai || '-'}`,
      `applyTo: ${s.applyTo || '-'} | tone: ${s.tone || '-'} | finish: ${s.finish || '-'} | texture: ${s.texture || '-'}`,
      `avoid: ${(s.avoid || []).join(', ') || '-'}`,
    ],
  );
  files['boards/prop_board.png'] = await categoryBoard(
    scene, projectName, 'Prop Reference Board', scene.slots.filter((s) => s.category === 'props'),
    'Prop styling and intent board.',
    (s) => [
      `thai: ${s.descriptionThai || '-'}`,
      `creativeFreedom: ${s.creativeFreedom || 'medium'} | mappedAreas: ${s.applyTo || '-'}`,
      !s.descriptionThai && s.referenceImages.length > 0 ? 'Image-only reference: allow moderate creative interpretation.' : '',
    ].filter(Boolean),
  );
  files['boards/lighting_board.png'] = await categoryBoard(
    scene, projectName, 'Lighting Reference Board', scene.slots.filter((s) => s.category === 'lighting'),
    'Lighting logic: daylight direction, artificial glow, ambient fill, highlight rolloff, shadow softness.',
    (s) => [
      `direction: ${s.direction || '-'} | quality: ${s.quality || '-'} | intensity: ${s.intensity || '-'}`,
      `thai: ${s.descriptionThai || '-'}`,
    ],
  );
  files['boards/environment_board.png'] = await categoryBoard(
    scene, projectName, 'Environment / Background Reference Board', scene.slots.filter((s) => s.category === 'environment'),
    'Environment references guide context, site mood, and external atmosphere.',
    (s) => [
      `type: ${s.type || '-'} | creativeFreedom: ${s.creativeFreedom || 'medium'}`,
      `thai: ${s.descriptionThai || '-'}`,
    ],
  );

  const atm = makeCanvas();
  const atmCtx = atm.getContext('2d')!;
  drawHeader(atmCtx, 'Atmosphere / Photography Reference Board', `${projectName} / ${scene.name}`);
  atmCtx.fillStyle = '#d7dee7';
  atmCtx.font = '500 24px Inter, sans-serif';
  const lines = [
    `scene type: ${scene.type}`,
    `people level: ${scene.people.level}`,
    `motion blur: ${scene.people.motionBlur}`,
    `behaviors: ${scene.people.behavior.join(', ') || '-'}`,
    `output preset: ${scene.outputSpec.outputPreset}`,
    `aspect ratio: ${scene.outputSpec.aspectRatio}`,
    `target size: ${scene.outputSpec.targetWidth}x${scene.outputSpec.targetHeight}`,
    `crop: ${scene.outputSpec.cropBehavior} | format: ${scene.outputSpec.finalFormat}`,
    `atmosphere: ${scene.atmosphere}`,
  ];
  lines.forEach((l, i) => atmCtx.fillText(l, 60, 180 + i * 42));
  atmCtx.fillStyle = '#171b22';
  atmCtx.fillRect(48, 720, 1904, 220);
  atmCtx.strokeStyle = '#2b313b';
  atmCtx.strokeRect(48, 720, 1904, 220);
  atmCtx.fillStyle = '#d7dee7';
  atmCtx.font = '600 24px Inter, sans-serif';
  atmCtx.fillText('Prompt Excerpt', 70, 760);
  wrapText(atmCtx, scene.localPrompt || '-', 70, 798, 1840, 30, 4);
  atmCtx.fillStyle = '#9fb0c2';
  atmCtx.fillText('Photography notes: real architectural photography, realistic depth, balanced exposure, soft shadow falloff, highlight rolloff, avoid CGI look.', 60, 630);
  files['boards/atmosphere_board.png'] = atm.toDataURL('image/png');

  const sum = makeCanvas();
  const sumCtx = sum.getContext('2d')!;
  drawHeader(sumCtx, 'AI Visual Brief Package Summary', `${projectName} / ${scene.name}`);
  const counts = {
    m: scene.slots.filter((s) => s.category === 'materials').length,
    p: scene.slots.filter((s) => s.category === 'props').length,
    l: scene.slots.filter((s) => s.category === 'lighting').length,
    e: scene.slots.filter((s) => s.category === 'environment').length,
    pins: scene.slots.reduce((n, s) => n + s.pins.length, 0),
    rects: scene.slots.reduce((n, s) => n + s.regions.length, 0),
    refs: scene.slots.reduce((n, s) => n + s.referenceImages.length, 0),
  };
  sumCtx.fillStyle = '#d7dee7';
  sumCtx.font = '500 24px Inter, sans-serif';
  [
    `scene type: ${scene.type} | package status: ${scene.packageStatus}`,
    `output preset: ${scene.outputSpec.outputPreset} | target: ${scene.outputSpec.targetWidth}x${scene.outputSpec.targetHeight}`,
    `materials: ${counts.m} | props: ${counts.p} | lighting: ${counts.l} | environment: ${counts.e}`,
    `pins: ${counts.pins} | rect regions: ${counts.rects} | refs: ${counts.refs}`,
    `health status: ${health.status}`,
    `warnings: ${health.warnings.length} | errors: ${health.errors.length}`,
    'Use ai-brief.json as structured data and these boards as visual references.',
  ].forEach((l, i) => sumCtx.fillText(l, 60, 180 + i * 46));
  files['boards/package_summary.png'] = sum.toDataURL('image/png');

  return { generatedAt: new Date().toISOString(), boardStatus: 'generated', files };
}

function formatSlotTitle(slot: Slot) {
  const fallback = {
    materials: 'Untitled Material',
    props: 'Untitled Prop',
    lighting: 'Untitled Lighting',
    environment: 'Untitled Environment',
  } as const;
  const name = slot.name?.trim();
  if (!name || /^untitled\s+/i.test(name) || /^(materials|props|lighting|environment)\s+\d+$/i.test(name)) {
    return fallback[slot.category];
  }
  return name;
}

async function drawSingleThumb(ctx: CanvasRenderingContext2D, refs: string[], x: number, y: number, w: number, h: number) {
  if (!refs?.length) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('No ref', x + 8, y + h / 2 + 4);
    return;
  }
  try {
    const img = await loadImage(refs[0]);
    ctx.drawImage(img, x, y, w, h);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y, w, h);
  } catch {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y, w, h);
  }
}

async function drawSlotPlates(
  ctx: CanvasRenderingContext2D,
  title: string,
  slots: Slot[],
  x: number,
  y: number,
  w: number,
) {
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 17px Inter, sans-serif';
  ctx.fillText(title, x, y);
  let cursorY = y + 14;
  const maxSlots = Math.min(4, slots.length);

  if (maxSlots === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.fillRect(x, cursorY, w, 48);
    ctx.strokeRect(x, cursorY, w, 48);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(`No ${title.toLowerCase()} configured.`, x + 12, cursorY + 29);
    return cursorY + 60;
  }

  for (let i = 0; i < maxSlots; i += 1) {
    const slot = slots[i];
    const plateH = 124;
    const thumbW = 76;
    const thumbH = 56;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dbe4ee';
    ctx.fillRect(x, cursorY, w, plateH);
    ctx.strokeRect(x, cursorY, w, plateH);

    ctx.fillStyle = slot.color;
    ctx.fillRect(x + 10, cursorY + 10, 6, plateH - 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.fillText(slot.code, x + 24, cursorY + 22);
    ctx.font = '700 13px Inter, sans-serif';
    wrapText(ctx, formatSlotTitle(slot), x + 66, cursorY + 22, w - 152, 15, 2);

    await drawSingleThumb(ctx, slot.referenceImages || [], x + w - thumbW - 10, cursorY + 10, thumbW, thumbH);

    ctx.fillStyle = '#334155';
    ctx.font = '500 11px Inter, sans-serif';
    const lines: string[] = [];
    if (slot.descriptionThai?.trim()) lines.push(`TH: ${slot.descriptionThai.trim()}`);
    if (slot.category === 'materials') {
      if (slot.finish?.trim()) lines.push(`finish: ${slot.finish.trim()}`);
      if (slot.texture?.trim()) lines.push(`texture: ${slot.texture.trim()}`);
      if (slot.avoid?.length) lines.push(`avoid: ${slot.avoid.join(', ')}`);
    }
    if (slot.category === 'lighting') {
      lines.push(`dir/quality/intensity: ${slot.direction || '-'} / ${slot.quality || '-'} / ${slot.intensity || '-'}`);
    }
    if (slot.category === 'props' || slot.category === 'environment') {
      if (slot.creativeFreedom) lines.push(`creative freedom: ${slot.creativeFreedom}`);
    }
    if (slot.englishPromptNote?.trim()) lines.push(`note: ${slot.englishPromptNote.trim()}`);
    if (slot.aiSuggested || slot.inferredByAi) {
      lines.push(`AI inferred${slot.aiSuggestionConfidence ? ` (${slot.aiSuggestionConfidence})` : ''}`);
      if (slot.aiSuggestionBasis) lines.push(`basis: ${slot.aiSuggestionBasis}`);
    }
    if (!lines.length && slot.referenceImages?.length) {
      lines.push('Image-only ref: approximate guidance');
    }
    if (!lines.length) lines.push('No description yet');

    let textY = cursorY + 44;
    for (const line of lines.slice(0, 3)) {
      textY = wrapText(ctx, line, x + 24, textY, w - 116, 14, 2) + 2;
    }
    cursorY += plateH + 8;
  }
  return cursorY;
}

export async function generateRenderHandoffBoard(scene: Scene, projectName: string): Promise<string> {
  const WIDTH = 2200;
  const HEIGHT = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f4f6f8';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(18, 18, WIDTH - 36, HEIGHT - 36);
  ctx.strokeStyle = '#dbe4ee';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 40px Inter, sans-serif';
  ctx.fillText('VISUAL INSTRUCTION BOARD', 48, 76);
  ctx.fillStyle = '#334155';
  ctx.font = '600 18px Inter, sans-serif';
  ctx.fillText(`${projectName} / ${scene.name} / ${scene.type}`, 48, 108);
  ctx.fillText(`Output: ${scene.outputSpec.outputPreset} | ${scene.outputSpec.aspectRatio} | ${scene.outputSpec.targetWidth}x${scene.outputSpec.targetHeight}`, 48, 136);
  ctx.fillText(`Preserve Rules: ${scene.preserveRules || '-'}`, 48, 162);

  const hasDirectorNotes = Boolean(
    scene.directorNotes?.overallSceneDirection?.trim() ||
    scene.directorNotes?.materialInterpretationNotes?.trim() ||
    scene.directorNotes?.lightingAtmosphereNotes?.trim() ||
    scene.directorNotes?.preserveDoNotChangeNotes?.trim(),
  );
  if (hasDirectorNotes) {
    ctx.fillStyle = '#fff7ed';
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.5;
    ctx.fillRect(44, 170, WIDTH - 88, 95);
    ctx.strokeRect(44, 170, WIDTH - 88, 95);
    ctx.fillStyle = '#9a5000';
    ctx.font = '800 15px Inter, sans-serif';
    ctx.fillText(`Director Notes (${(scene.directorNotes?.inferenceMode || 'balanced').toUpperCase()})`, 58, 192);
    ctx.fillStyle = '#7c2d12';
    ctx.font = '600 13px Inter, sans-serif';
    wrapText(ctx, scene.directorNotes?.overallSceneDirection || scene.directorNotes?.materialInterpretationNotes || scene.directorNotes?.lightingAtmosphereNotes || '-', 58, 214, WIDTH - 120, 18, 2);
    wrapText(ctx, scene.directorNotes?.preserveDoNotChangeNotes ? `Preserve: ${scene.directorNotes.preserveDoNotChangeNotes}` : '', 58, 250, WIDTH - 120, 16, 1);
  }

  const leftX = 44;
  const leftY = hasDirectorNotes ? 278 : 188;
  const leftW = 1360;
  const leftH = hasDirectorNotes ? 890 : 980;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(leftX, leftY, leftW, leftH);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(leftX, leftY, leftW, leftH);

  if (scene.baseImage) {
    try {
      const base = await loadImage(scene.baseImage);
      const fitScale = Math.min((leftW - 20) / base.width, (leftH - 20) / base.height);
      const drawW = base.width * fitScale;
      const drawH = base.height * fitScale;
      const imgX = leftX + (leftW - drawW) / 2;
      const imgY = leftY + (leftH - drawH) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(imgX - 6, imgY - 6, drawW + 12, drawH + 12);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(imgX - 6, imgY - 6, drawW + 12, drawH + 12);
      ctx.drawImage(base, imgX, imgY, drawW, drawH);

      scene.slots.forEach((slot) => {
        slot.regions.forEach((region) => {
          const x = imgX + region.x * drawW;
          const y = imgY + region.y * drawH;
          const rw = region.width * drawW;
          const rh = region.height * drawH;
          ctx.fillStyle = `${slot.color}33`;
          ctx.strokeStyle = slot.color;
          ctx.lineWidth = 2.5;
          ctx.fillRect(x, y, rw, rh);
          ctx.strokeRect(x, y, rw, rh);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = slot.color;
          ctx.lineWidth = 1.5;
          ctx.fillRect(x + 6, y + 6, 48, 22);
          ctx.strokeRect(x + 6, y + 6, 48, 22);
          ctx.fillStyle = '#0f172a';
          ctx.font = '800 13px Inter, sans-serif';
          ctx.fillText(slot.code, x + 14, y + 21);
        });
        slot.pins.forEach((pin) => {
          const x = imgX + pin.x * drawW;
          const y = imgY + pin.y * drawH;
          ctx.fillStyle = slot.color;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = slot.color;
          ctx.lineWidth = 1.5;
          ctx.fillRect(x + 10, y - 16, 54, 22);
          ctx.strokeRect(x + 10, y - 16, 54, 22);
          ctx.fillStyle = '#0f172a';
          ctx.font = '800 13px Inter, sans-serif';
          ctx.fillText(slot.code, x + 18, y);
        });
      });
    } catch {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillText('Base image could not be rendered.', leftX + 28, leftY + 44);
    }
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 18px Inter, sans-serif';
    ctx.fillText('No base image loaded.', leftX + 28, leftY + 44);
  }

  const rightX = 1424;
  const rightY = hasDirectorNotes ? 278 : 188;
  const rightW = 732;
  const categories = {
    materials: scene.slots.filter((slot) => slot.category === 'materials'),
    props: scene.slots.filter((slot) => slot.category === 'props'),
    lighting: scene.slots.filter((slot) => slot.category === 'lighting'),
    environment: scene.slots.filter((slot) => slot.category === 'environment'),
  };

  let panelY = rightY + 14;
  panelY = await drawSlotPlates(ctx, 'Materials', categories.materials, rightX, panelY, rightW);
  panelY = await drawSlotPlates(ctx, 'Props', categories.props, rightX, panelY, rightW);
  panelY = await drawSlotPlates(ctx, 'Lighting', categories.lighting, rightX, panelY, rightW);
  await drawSlotPlates(ctx, 'Environment', categories.environment, rightX, panelY, rightW);

  const stripY = 1186;
  const appliedSuggestions = (scene.aiEnrichmentSuggestions || []).filter((item) => item.status === 'applied').length;
  const pendingSuggestions = (scene.aiEnrichmentSuggestions || []).filter((item) => item.status !== 'applied' && item.status !== 'ignored').length;
  ctx.fillStyle = '#fff7ed';
  ctx.strokeStyle = '#fdba74';
  ctx.lineWidth = 1.5;
  ctx.fillRect(44, stripY, WIDTH - 88, 170);
  ctx.strokeRect(44, stripY, WIDTH - 88, 170);
  ctx.fillStyle = '#9a5000';
  ctx.font = '800 18px Inter, sans-serif';
  ctx.fillText('Key Instructions', 62, stripY + 28);
  ctx.fillStyle = '#7c2d12';
  ctx.font = '600 15px Inter, sans-serif';
  const keyLines = [
    'Preserve original geometry and camera.',
    'Apply mapped materials only to tagged/region areas.',
    'Use image-only refs as approximate visual guidance.',
    'Do not redesign the space.',
    'Avoid CGI/plastic material look.',
  ];
  keyLines.forEach((line, idx) => {
    ctx.fillText(`• ${line}`, 64 + (idx >= 3 ? 1040 : 0), stripY + 62 + (idx % 3) * 30);
  });
  ctx.fillStyle = '#7c2d12';
  ctx.font = '700 13px Inter, sans-serif';
  ctx.fillText(`AI suggestions: ${appliedSuggestions} applied, ${pendingSuggestions} pending`, 64, stripY + 154);

  ctx.fillStyle = '#ff8800';
  ctx.fillRect(44, 174, WIDTH - 88, 4);

  return canvas.toDataURL('image/png');
}
