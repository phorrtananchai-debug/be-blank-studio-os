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
  mapCtx.fillStyle = '#101215';
  mapCtx.fillRect(0, 0, 1600, 1000);
  if (scene.baseImage) {
    try {
      const img = await loadImage(scene.baseImage);
      const scale = Math.min(1500 / img.width, 860 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const ox = 40;
      const oy = 100;
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
          mapCtx.fillStyle = '#0b0d10cc';
          mapCtx.fillRect(x + 8, y - 20, 42, 16);
          mapCtx.fillStyle = '#fff';
          mapCtx.font = '800 13px Inter, sans-serif';
          mapCtx.fillText(s.code, x + 12, y - 8);
        });
      });
    } catch {
      // ignore
    }
  }
  mapCtx.fillStyle = '#f3f4f6';
  mapCtx.font = '700 32px Inter, sans-serif';
  mapCtx.fillText('Mapping Overlay Board', 40, 54);
  mapCtx.font = '500 20px Inter, sans-serif';
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
