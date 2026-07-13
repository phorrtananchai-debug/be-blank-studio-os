import { ProjectSourceOfTruth, Scene, Slot, SlotCategory } from './types';
import { materialRuleNegativeLines, materialRulePromptLines, scopedColorCastCorrectionLine } from './projectSourceOfTruth';

const defaultNamePattern = /^(materials|props|lighting|environment)\s+\d+$|^untitled\s+(material|prop|lighting|environment)$/i;

function isDefaultSlotName(name = '') {
  return defaultNamePattern.test(name.trim());
}

function codeSortValue(code: string) {
  const m = /^([A-Za-z]+)\s*(\d+)?/.exec(code || '');
  if (!m) return { prefix: code || 'Z', num: 9999 };
  return { prefix: m[1].toUpperCase(), num: Number(m[2] || 0) };
}

function slotHasUsefulFields(slot: Slot) {
  return Boolean(
    slot.applyTo?.trim() ||
    slot.tone?.trim() ||
    slot.finish?.trim() ||
    slot.texture?.trim() ||
    slot.direction?.trim() ||
    slot.quality?.trim() ||
    slot.intensity?.trim() ||
    slot.type?.trim() ||
    (slot.avoid && slot.avoid.length > 0),
  );
}

function isConfigured(slot: Slot) {
  const hasDescription = Boolean(slot.descriptionThai?.trim());
  const hasRefs = (slot.referenceImages?.length || 0) > 0;
  const hasPins = (slot.pins?.length || 0) > 0;
  const hasRegions = (slot.regions?.length || 0) > 0;
  const hasUseful = slotHasUsefulFields(slot);
  const isDefaultName = isDefaultSlotName(slot.name || '');
  if (hasDescription || hasRefs || hasPins || hasRegions || hasUseful) return true;
  return !isDefaultName && Boolean(slot.name?.trim());
}

function normalizeSlots(scene: Scene) {
  const unique = new Map<string, Slot>();
  scene.slots.forEach((slot) => {
    const codeKey = (slot.code || '').trim().toUpperCase();
    const existing = unique.get(codeKey);
    if (!existing) {
      unique.set(codeKey, slot);
      return;
    }
    const existingScore = Number(isConfigured(existing)) + (existing.referenceImages?.length || 0) + (existing.pins?.length || 0) + (existing.regions?.length || 0);
    const nextScore = Number(isConfigured(slot)) + (slot.referenceImages?.length || 0) + (slot.pins?.length || 0) + (slot.regions?.length || 0);
    if (nextScore > existingScore) unique.set(codeKey, slot);
  });

  return Array.from(unique.values()).sort((a, b) => {
    const ca = codeSortValue(a.code);
    const cb = codeSortValue(b.code);
    if (ca.prefix !== cb.prefix) return ca.prefix.localeCompare(cb.prefix);
    if (ca.num !== cb.num) return ca.num - cb.num;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function formatSlot(slot: Slot) {
  const pinCount = slot.pins?.length || 0;
  const regionCount = slot.regions?.length || 0;
  const pinLabel = pinCount === 1 ? 'pin' : 'pins';
  const regionLabel = regionCount === 1 ? 'region' : 'regions';
  const mapInfo = pinCount || regionCount ? ` | mapped with ${pinCount} ${pinLabel} and ${regionCount} ${regionLabel}` : '';
  const areaInfo = slot.applyTo?.trim() ? ` | mappedAreas: ${slot.applyTo.trim()}` : '';
  const detailInfo = [
    slot.tone?.trim() ? `tone ${slot.tone.trim()}` : '',
    slot.finish?.trim() ? `finish ${slot.finish.trim()}` : '',
    slot.texture?.trim() ? `texture ${slot.texture.trim()}` : '',
    slot.direction?.trim() ? `direction ${slot.direction.trim()}` : '',
    slot.quality?.trim() ? `quality ${slot.quality.trim()}` : '',
    slot.intensity?.trim() ? `intensity ${slot.intensity.trim()}` : '',
    slot.type?.trim() ? `type ${slot.type.trim()}` : '',
  ].filter(Boolean);
  const details = detailInfo.length ? ` | ${detailInfo.join(', ')}` : '';

  const imageOnly = !slot.descriptionThai?.trim() && (slot.referenceImages?.length || 0) > 0;
  const hasThai = Boolean(slot.descriptionThai?.trim());
  const description = slot.descriptionThai?.trim() || (imageOnly
    ? 'image reference provided, no Thai design intent yet. Use as approximate visual guidance with moderate creative freedom.'
    : '(no Thai description)');
  const namePart = !isDefaultSlotName(slot.name || '') && slot.name?.trim() ? ` ${slot.name.trim()}` : '';
  const aiContext = slot.aiSuggested || slot.inferredByAi
    ? ` | AI-inferred${slot.aiSuggestionBasis ? ` from ${slot.aiSuggestionBasis}` : ''}${slot.aiSuggestionConfidence ? ` (confidence: ${slot.aiSuggestionConfidence})` : ''}`
    : '';
  const promptNote = slot.englishPromptNote?.trim() ? ` | note: ${slot.englishPromptNote.trim()}` : '';

  return `${slot.code}${namePart}: ${hasThai ? 'Thai design intent: ' : ''}${description}${mapInfo}${areaInfo}${details}${promptNote}${aiContext}`;
}

function categoryLines(slots: Slot[], category: SlotCategory) {
  const configured = slots.filter(isConfigured);
  const ignored = slots.filter((slot) => !isConfigured(slot)).map((slot) => slot.code);

  if (!configured.length) {
    const titleMap: Record<SlotCategory, string> = {
      materials: 'No configured material slots yet.',
      props: 'No configured prop slots yet.',
      lighting: 'No configured lighting slots yet.',
      environment: 'No configured environment slots yet.',
    };
    return { lines: [titleMap[category]], ignored };
  }

  return { lines: configured.map((slot) => formatSlot(slot)), ignored };
}

export function generateLocalPrompt(scene: Scene, sourceOfTruth?: ProjectSourceOfTruth): string {
  const slots = normalizeSlots(scene);
  const byCategory = (category: SlotCategory) => slots.filter((slot) => slot.category === category);
  const material = categoryLines(byCategory('materials'), 'materials');
  const props = categoryLines(byCategory('props'), 'props');
  const lighting = categoryLines(byCategory('lighting'), 'lighting');
  const environment = categoryLines(byCategory('environment'), 'environment');
  const ignored = [...material.ignored, ...props.ignored, ...lighting.ignored, ...environment.ignored];

  const peopleBehavior = scene.people.behavior.length ? scene.people.behavior.join(', ') : '-';
  const director = scene.directorNotes;
  const hasDirectorNotes = Boolean(
    director?.overallSceneDirection?.trim() ||
    director?.materialInterpretationNotes?.trim() ||
    director?.lightingAtmosphereNotes?.trim() ||
    director?.preserveDoNotChangeNotes?.trim(),
  );
  const appliedSuggestions = (scene.aiEnrichmentSuggestions || []).filter((s) => s.status === 'applied');
  const appliedSuggestionCodes = Array.from(new Set(appliedSuggestions.map((s) => s.suggestedCode || s.code || s.targetSlotCode).filter(Boolean)));

  return [
    '1. Objective',
    `Render architectural visualization for "${scene.name}" with faithful geometry and camera.`,
    '',
    '2. Preserve Rules',
    `STRICT: ${scene.preserveRules || 'Medium Design Lock'}. Preserve geometry, camera perspective, architectural form, furniture layout, and mapped placement.`,
    scopedColorCastCorrectionLine(sourceOfTruth),
    '',
    '3. Scene / Design Language',
    scene.type || 'Interior',
    director?.overallSceneDirection?.trim() ? `Director Notes: ${director.overallSceneDirection.trim()}` : '',
    hasDirectorNotes ? `Missing slot details may be inferred according to inferenceMode: ${(director?.inferenceMode || 'balanced').replace(/^./, (c) => c.toUpperCase())}.` : '',
    '',
    '4. Material Mapping',
    ...(materialRulePromptLines(sourceOfTruth).length ? ['Project Source of Truth material rules:', ...materialRulePromptLines(sourceOfTruth)] : []),
    director?.materialInterpretationNotes?.trim() ? `Material interpretation guidance: ${director.materialInterpretationNotes.trim()}` : '',
    ...material.lines,
    '',
    '5. Prop Guidance',
    ...props.lines,
    '',
    '6. Lighting Direction',
    director?.lightingAtmosphereNotes?.trim() ? `Lighting/Atmosphere guidance: ${director.lightingAtmosphereNotes.trim()}` : '',
    ...lighting.lines,
    '',
    '7. People Guidance',
    `Level: ${scene.people.level}, Motion blur: ${scene.people.motionBlur}, Behavior: ${peopleBehavior}`,
    `Thai intent: ${scene.people.descriptionThai || '-'}`,
    '',
    '8. Environment / BG',
    ...environment.lines,
    '',
    '9. Atmosphere / Photography',
    scene.atmosphere || '-',
    '',
    '10. Output Size / Crop',
    `${scene.outputSpec.outputPreset} | use ${scene.outputSpec.targetWidth}x${scene.outputSpec.targetHeight} | aspect ${scene.outputSpec.aspectRatio} | crop: ${scene.outputSpec.cropBehavior} | safe area: ${scene.outputSpec.safeAreaPercentage}% | format: ${scene.outputSpec.finalFormat}`,
    appliedSuggestionCodes.length ? `Applied AI suggestions: ${appliedSuggestionCodes.join(', ')}` : '',
    ignored.length ? `Unconfigured Slots: ${ignored.join(', ')} were empty and ignored.` : '',
    '',
    '11. Negative Constraints',
    'Do not alter primary geometry, camera perspective, or mapped material zones. Avoid extra unrealistic objects, text artifacts, bad anatomy, low-quality textures.',
    ...materialRuleNegativeLines(sourceOfTruth),
    director?.preserveDoNotChangeNotes?.trim() ? `Preserve / Do not change: ${director.preserveDoNotChangeNotes.trim()}` : '',
  ].filter(Boolean).join('\n').trim();
}
