import { ImportedPromptPackage, PromptPackageHistoryEntry, RevisionPromptEntry, Scene } from './types';

export function validatePromptImportJson(input: string): { status: 'valid' | 'warning' | 'error'; parsed?: ImportedPromptPackage; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsed: any;
  try {
    parsed = JSON.parse(input);
  } catch (error: any) {
    return { status: 'error', errors: [`Invalid JSON: ${error.message}`], warnings: [] };
  }
  if (parsed.schemaVersion !== 'visual-brief-ai-import-v1') errors.push('schemaVersion should be "visual-brief-ai-import-v1".');
  if (!parsed.promptPackage) errors.push('promptPackage is required.');
  const requiredPrompts = ['fullRenderPrompt', 'shortPrompt', 'materialPrompt', 'atmospherePrompt', 'negativePrompt', 'revisionPromptTemplate'];
  if (parsed.promptPackage) {
    requiredPrompts.forEach((k) => { if (!parsed.promptPackage[k]) errors.push(`promptPackage.${k} is required.`); });
  }
  if (!parsed.assistantNotes) warnings.push('assistantNotes missing.');
  if (!parsed.qualityChecklist) warnings.push('qualityChecklist missing.');
  const status = errors.length ? 'error' : warnings.length ? 'warning' : 'valid';
  return { status, parsed, errors, warnings };
}

export function toHistoryEntry(parsed: ImportedPromptPackage): PromptPackageHistoryEntry {
  return {
    id: crypto.randomUUID(),
    name: `${parsed.assistantName || 'Imported'} ${new Date(parsed.createdAt || Date.now()).toLocaleDateString()}`,
    importedAt: new Date().toISOString(),
    assistantName: parsed.assistantName,
    sourcePackageId: parsed.sourcePackageId,
    sourceSceneName: parsed.sourceSceneName,
    promptPackage: parsed.promptPackage,
    assistantNotes: parsed.assistantNotes,
    qualityChecklist: parsed.qualityChecklist,
    revisionGuidance: parsed.revisionGuidance,
  };
}

export function buildRevisionPrompt(scene: Scene, active: PromptPackageHistoryEntry | null, input: Omit<RevisionPromptEntry, 'id' | 'createdAt' | 'prompt'>): string {
  const materialMap = scene.slots.filter((s) => s.category === 'materials').map((s) => `${s.code} ${s.name}: ${s.descriptionThai || '-'}`).join('\n');
  const propMap = scene.slots.filter((s) => s.category === 'props').map((s) => `${s.code} ${s.name}: ${s.descriptionThai || '-'}`).join('\n');
  const lightMap = scene.slots.filter((s) => s.category === 'lighting').map((s) => `${s.code} ${s.name}: ${s.descriptionThai || '-'}`).join('\n');
  const envMap = scene.slots.filter((s) => s.category === 'environment').map((s) => `${s.code} ${s.name}: ${s.descriptionThai || '-'}`).join('\n');

  return [
    '1. Keep what works',
    active?.promptPackage.shortPrompt || active?.promptPackage.fullRenderPrompt || scene.localPrompt,
    '',
    '2. Fix these issues',
    `Geometry: ${input.issues.geometry || '-'}`,
    `Material: ${input.issues.material || '-'}`,
    `Lighting: ${input.issues.lighting || '-'}`,
    `Prop: ${input.issues.prop || '-'}`,
    `People: ${input.issues.people || '-'}`,
    `Atmosphere: ${input.issues.atmosphere || '-'}`,
    `Crop/Size: ${input.issues.cropSize || '-'}`,
    `Thai notes: ${input.renderResultNotesThai || '-'}`,
    '',
    '3. Preserve geometry',
    `STRICT preserve rules: ${scene.preserveRules}`,
    '',
    '4. Correct material mapping',
    materialMap || '-',
    '',
    '5. Correct lighting/atmosphere',
    lightMap || '-',
    envMap || '-',
    '',
    '6. Negative constraints',
    active?.promptPackage.negativePrompt || 'Do not alter geometry, camera perspective, and mapped placement.',
    '',
    '7. Output size/crop reminder',
    `${scene.outputSpec.targetWidth}x${scene.outputSpec.targetHeight} | ${scene.outputSpec.aspectRatio} | crop: ${scene.outputSpec.cropBehavior} | format: ${scene.outputSpec.finalFormat}`,
    '',
    'Reference slot context:',
    propMap || '-',
  ].join('\n');
}
