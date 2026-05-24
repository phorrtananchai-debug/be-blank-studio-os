import { Region, Scene, Slot } from './types';

export const MIN_REGION_SIZE = 0.015;

const EPSILON = 1e-6;

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function normalizeRegionRect(startX: number, startY: number, endX: number, endY: number, id: string, slotId: string): Region {
  const x0 = clamp01(startX);
  const y0 = clamp01(startY);
  const x1 = clamp01(endX);
  const y1 = clamp01(endY);
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);
  return { id, slotId, type: 'rect', x, y, width, height };
}

export function isValidRegion(region: Region) {
  if (!region?.slotId) return false;
  if (region.type !== 'rect') return false;
  if (region.width <= 0 || region.height <= 0) return false;
  if (region.width < MIN_REGION_SIZE || region.height < MIN_REGION_SIZE) return false;
  if (region.x < 0 || region.y < 0 || region.x > 1 || region.y > 1) return false;
  if (region.x + region.width > 1 + EPSILON) return false;
  if (region.y + region.height > 1 + EPSILON) return false;
  return true;
}

function sanitizeSlot(slot: Slot) {
  const validPins = slot.pins.filter((pin) => pin.slotId === slot.id && pin.x >= 0 && pin.x <= 1 && pin.y >= 0 && pin.y <= 1);
  const validRegions = slot.regions
    .filter((region) => region.slotId === slot.id)
    .map((region) => ({ ...region, x: clamp01(region.x), y: clamp01(region.y), width: Math.max(0, region.width), height: Math.max(0, region.height) }))
    .filter((region) => isValidRegion(region));

  const changed = validPins.length !== slot.pins.length || validRegions.length !== slot.regions.length;
  return {
    slot: changed ? { ...slot, pins: validPins, regions: validRegions } : slot,
    changed,
  };
}

export function sanitizeSceneMapping(scene: Scene) {
  let changed = false;
  const slots = scene.slots.map((slot) => {
    const sanitized = sanitizeSlot(slot);
    if (sanitized.changed) changed = true;
    return sanitized.slot;
  });

  return { scene: changed ? { ...scene, slots } : scene, changed };
}

