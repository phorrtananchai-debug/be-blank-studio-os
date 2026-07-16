import {
  GeneralReferenceDirection,
  GeneralReferenceRole,
  GeneralReferenceScope,
  ReferenceDirectionState,
  Scene,
  VisualDirectionAnalysis,
  VisualDirectionReferenceUsage,
} from './types';

export const generalReferenceRoleOptions: Array<{ value: GeneralReferenceRole; label: string }> = [
  { value: 'overall_mood', label: 'Overall mood / atmosphere' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'time_of_day', label: 'Time of day' },
  { value: 'materials', label: 'Materials' },
  { value: 'color_palette', label: 'Color palette' },
  { value: 'landscape', label: 'Landscape / vegetation' },
  { value: 'people_activity', label: 'People / activity' },
  { value: 'styling_props', label: 'Styling / props' },
  { value: 'photography_camera', label: 'Photography / camera character' },
  { value: 'environment_site', label: 'Environment / site context' },
  { value: 'custom', label: 'Custom role' },
];

export const safeGeneralReferenceScopes: GeneralReferenceScope[] = [
  'mood_only',
  'do_not_copy_architecture',
  'do_not_copy_geometry',
  'do_not_copy_furniture_form',
  'do_not_copy_composition',
  'do_not_copy_camera',
  'do_not_copy_signage_branding',
];

export const generalReferenceScopeOptions: Array<{ value: GeneralReferenceScope; label: string }> = [
  { value: 'mood_only', label: 'Mood only' },
  { value: 'atmosphere_only', label: 'Atmosphere only' },
  { value: 'color_palette_only', label: 'Color palette only' },
  { value: 'material_color_only', label: 'Material color only' },
  { value: 'texture_only', label: 'Texture only' },
  { value: 'finish_only', label: 'Finish only' },
  { value: 'lighting_only', label: 'Lighting only' },
  { value: 'time_of_day_only', label: 'Time of day only' },
  { value: 'landscape_character_only', label: 'Landscape character only' },
  { value: 'people_activity_only', label: 'People/activity only' },
  { value: 'photographic_treatment_only', label: 'Photographic treatment only' },
  { value: 'do_not_copy_architecture', label: 'Do not copy architecture' },
  { value: 'do_not_copy_geometry', label: 'Do not copy geometry' },
  { value: 'do_not_copy_furniture_form', label: 'Do not copy furniture form' },
  { value: 'do_not_copy_composition', label: 'Do not copy composition' },
  { value: 'do_not_copy_camera', label: 'Do not copy camera' },
  { value: 'do_not_copy_signage_branding', label: 'Do not copy signage / branding' },
];

const roleDirection: Record<GeneralReferenceRole, string> = {
  overall_mood: 'overall atmosphere and restrained visual mood',
  lighting: 'lighting quality, direction, softness, and exposure behavior',
  time_of_day: 'time-of-day, weather, and natural-light character',
  materials: 'material color, texture, finish, and tactile quality only',
  color_palette: 'color relationships and grading restraint only',
  landscape: 'landscape character and vegetation density only',
  people_activity: 'people scale and activity behavior only',
  styling_props: 'styling density and prop character only',
  photography_camera: 'photographic treatment, contrast, and camera response only',
  environment_site: 'environment and site-context character only',
  custom: 'the specific user-noted visual direction only',
};

export function defaultReferenceDirectionState(): ReferenceDirectionState {
  return { references: [], latestAnalysis: undefined, appliedAnalysis: undefined, appliedScope: undefined, skippedForFirstGeneration: false, visionApproved: false };
}

export function normalizeReferenceDirectionState(input?: Partial<ReferenceDirectionState>): ReferenceDirectionState {
  return {
    ...defaultReferenceDirectionState(),
    ...(input || {}),
    references: (input?.references || []).map((reference) => ({
      ...reference,
      included: reference.included !== false,
      priority: reference.priority || 'medium',
      scopes: reference.scopes?.length ? reference.scopes : [...safeGeneralReferenceScopes],
      userNote: reference.userNote || '',
      allowedInfluence: reference.allowedInfluence || '',
      forbiddenInfluence: reference.forbiddenInfluence || 'Do not copy architecture, geometry, furniture form, composition, camera, or signage.',
    })),
  };
}

export function referenceScopeText(scopes: GeneralReferenceScope[]) {
  return scopes.map((scope) => scope.replace(/_/g, ' ')).join(', ');
}

function roleItems(references: GeneralReferenceDirection[], role: GeneralReferenceRole) {
  return references.filter((reference) => reference.role === role).map((reference) => reference.userNote || reference.allowedInfluence || roleDirection[role]);
}

function conflictPair(references: GeneralReferenceDirection[]) {
  const lighting = references.filter((reference) => reference.role === 'lighting' || reference.role === 'time_of_day');
  if (lighting.length < 2) return [];
  const words = lighting.map((reference) => `${reference.name} ${reference.userNote}`.toLowerCase()).join(' ');
  return /night|evening|sunset/.test(words) && /morning|daylight|afternoon/.test(words)
    ? ['Lighting/time-of-day references include both daytime and evening cues. Choose one as primary before generation.']
    : [];
}

export function analyzeGeneralReferences(scene: Scene, state: ReferenceDirectionState, source: 'metadata' | 'vision' = 'metadata', provider?: string, model?: string): VisualDirectionAnalysis {
  const references = state.references.filter((reference) => reference.included);
  const usages: VisualDirectionReferenceUsage[] = references.map((reference) => ({
    referenceId: reference.id,
    referenceName: reference.name,
    borrowed: reference.allowedInfluence || `Use for ${roleDirection[reference.role]}.`,
    notBorrowed: reference.forbiddenInfluence || 'Do not copy architecture, geometry, furniture form, composition, camera, or signage/branding.',
    baseApplication: reference.role === 'materials' ? 'Existing material zones only' : reference.role === 'landscape' ? 'Visible exterior/site context only' : 'Base Render photographic treatment only',
    confidence: source === 'vision' ? 78 : reference.userNote ? 66 : 48,
    ambiguity: reference.userNote ? undefined : 'No user note supplied; direction is based on role and selected scopes.',
  }));
  const collect = (role: GeneralReferenceRole) => roleItems(references, role).join('; ');
  const atmosphere = [collect('overall_mood'), collect('photography_camera')].filter(Boolean).join('; ') || 'Architectural photography with natural, restrained realism.';
  const lighting = [collect('lighting'), collect('time_of_day')].filter(Boolean).join('; ') || 'Keep the existing lighting logic; improve only requested quality.';
  const materials = collect('materials') || 'Preserve visible material zoning; apply reference material direction only within selected scopes.';
  const environment = [collect('environment_site'), collect('landscape')].filter(Boolean).join('; ') || 'Keep the existing site/context unless a scoped environment reference is applied.';
  const conflicts = conflictPair(references);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    status: 'draft',
    analysisSource: source,
    provider,
    model,
    createdAt: now,
    updatedAt: now,
    existingDesignSummary: `${scene.type || 'Architectural'} Base Render is the primary design source. Preserve its visible architecture, camera, composition, layout, openings, built-ins, furniture, fixtures, equipment, signage, and material zones.`,
    protectedBaseElements: ['Camera and composition', 'Architecture and geometry', 'Layout, openings, built-ins, fixtures, and equipment', 'Furniture placement and material zoning', 'Visible signage/branding'],
    overallAtmosphere: atmosphere,
    lightingDirection: lighting,
    timeOfDayWeather: collect('time_of_day') || 'Use only the time-of-day evidence selected by the user; do not invent weather.',
    materialDirection: materials,
    colorPalette: collect('color_palette') || 'No global brand palette is assumed. Preserve intentional Base Render colors.',
    landscapeEnvironmentDirection: environment,
    peopleActivityDirection: collect('people_activity') || 'No people/activity change unless explicitly requested.',
    stylingDirection: collect('styling_props') || 'Do not add styling or props unless explicitly requested.',
    photographicTreatment: collect('photography_camera') || 'Natural architectural editorial photography; realistic contrast, highlight rolloff, and material response.',
    referenceUsageMap: usages,
    conflicts,
    missingInformation: references.length ? [] : ['No included references. Generate without references or add at least one direction reference.'],
    designDriftRisks: ['Reference architecture/form/composition must not transfer to the Base Render.', 'Do not introduce unrequested materials, landscape, people, or brand elements.'],
    proposedFirstGenerationPlan: 'Preserve the Base Render exactly, then apply the reviewed atmosphere, lighting, material, environment, and photographic direction only within each reference scope.',
    finalGenerationPromptDraft: [
      'Base Render is the source of truth. Preserve camera, composition, architecture, geometry, layout, openings, furniture placement, built-ins, fixtures, equipment, signage, and material zoning.',
      `Overall atmosphere: ${atmosphere}`,
      `Lighting direction: ${lighting}`,
      `Material direction: ${materials}`,
      `Environment direction: ${environment}`,
      'References are directional evidence only. Do not copy reference architecture, geometry, furniture form, composition, camera, or signage.',
    ].join('\n'),
  };
}

export function enrichVisualDirectionWithVision(base: VisualDirectionAnalysis, response: {
  sceneAnalysis?: { cameraSummary?: string; compositionSummary?: string; architectureToPreserve?: string[]; lightingCondition?: string; environmentCondition?: string; hallucinationRisks?: string[] };
  recommendedDirection?: { visualDirection?: string; lightingDirection?: string; materialDirection?: string; environmentDirection?: string; colorGradeDirection?: string; peopleDirection?: string };
  referenceAnalysis?: Array<{ referenceId?: string; usableDirection: string; doNotCopy: string[]; confidence?: number }>;
  confidence?: { overall?: number; notes?: string[] };
}, provider: string, model: string): VisualDirectionAnalysis {
  const recommended = response.recommendedDirection || {};
  return {
    ...base,
    analysisSource: 'vision',
    provider,
    model,
    updatedAt: new Date().toISOString(),
    existingDesignSummary: [base.existingDesignSummary, response.sceneAnalysis?.cameraSummary, response.sceneAnalysis?.compositionSummary].filter(Boolean).join(' '),
    protectedBaseElements: Array.from(new Set([...base.protectedBaseElements, ...(response.sceneAnalysis?.architectureToPreserve || [])])),
    overallAtmosphere: recommended.visualDirection || base.overallAtmosphere,
    lightingDirection: recommended.lightingDirection || response.sceneAnalysis?.lightingCondition || base.lightingDirection,
    materialDirection: recommended.materialDirection || base.materialDirection,
    colorPalette: recommended.colorGradeDirection || base.colorPalette,
    landscapeEnvironmentDirection: recommended.environmentDirection || response.sceneAnalysis?.environmentCondition || base.landscapeEnvironmentDirection,
    peopleActivityDirection: recommended.peopleDirection || base.peopleActivityDirection,
    referenceUsageMap: base.referenceUsageMap.map((usage) => {
      const match = response.referenceAnalysis?.find((item) => item.referenceId === usage.referenceId);
      return match ? { ...usage, borrowed: match.usableDirection || usage.borrowed, notBorrowed: match.doNotCopy?.join(', ') || usage.notBorrowed, confidence: match.confidence || response.confidence?.overall || usage.confidence } : usage;
    }),
    designDriftRisks: Array.from(new Set([...base.designDriftRisks, ...(response.sceneAnalysis?.hallucinationRisks || []), ...(response.confidence?.notes || [])])),
  };
}

export function visualDirectionPromptLines(analysis?: VisualDirectionAnalysis) {
  if (!analysis || analysis.status !== 'applied') return [];
  return [
    `Existing design summary: ${analysis.existingDesignSummary}`,
    `Overall atmosphere: ${analysis.overallAtmosphere}`,
    `Lighting direction: ${analysis.lightingDirection}`,
    `Material direction: ${analysis.materialDirection}`,
    `Color palette: ${analysis.colorPalette}`,
    `Landscape/environment: ${analysis.landscapeEnvironmentDirection}`,
    `People/activity: ${analysis.peopleActivityDirection}`,
    `Styling: ${analysis.stylingDirection}`,
    `Photography: ${analysis.photographicTreatment}`,
    ...analysis.referenceUsageMap.map((reference) => `Reference "${reference.referenceName}": borrow ${reference.borrowed}. Do not borrow ${reference.notBorrowed}. Apply to ${reference.baseApplication}.`),
  ];
}
