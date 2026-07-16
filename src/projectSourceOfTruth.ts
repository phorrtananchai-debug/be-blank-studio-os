import {
  CompiledPromptSection,
  CompiledPromptTrace,
  MaterialRuleCategory,
  MaterialRuleProtectionLevel,
  MaterialRuleReferenceScope,
  Project,
  ProjectProfile,
  ProjectMaterialRule,
  ProjectSourceOfTruth,
} from './types';

const SOURCE_SCHEMA: ProjectSourceOfTruth['schemaVersion'] = 'visual-local-project-source-of-truth-v1';

export const PROJECT_PROMPT_PRIORITY_POLICY = [
  'Project Source of Truth',
  'Protected assets and protected material rules',
  'Explicit current revision corrections',
  'User request',
  'Pass-specific instructions',
  'Goal templates',
  'Style / mood guidance',
  'Provider-specific formatting or suffix',
  'Negative prompt',
];

const nowIso = () => new Date().toISOString();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rule';

function makeRule(input: {
  id: string;
  name: string;
  category: MaterialRuleCategory;
  protectionLevel: MaterialRuleProtectionLevel;
  description: string;
  approvedCharacteristics: string[];
  forbiddenCharacteristics: string[];
  colorGuidance: string;
  finishGuidance: string;
  usageGuidance: string;
  promptInjection: string;
  qcValidationGuidance: string;
  priority: number;
  sourceOfTruthNotes?: string;
}): ProjectMaterialRule {
  const createdAt = nowIso();
  return {
    ...input,
    enabled: true,
    referenceImages: [],
    isDefault: true,
    createdAt,
    updatedAt: createdAt,
  };
}

export function karunDefaultMaterialRules(projectId?: string): ProjectMaterialRule[] {
  return [
    makeRule({
      id: 'karun-bench-upholstery',
      name: 'Karun Bench Upholstery',
      category: 'upholstery',
      protectionLevel: 'protected',
      description: 'Deep tea-red / maroon / oxblood leather upholstery with premium softness, subtle natural grain, refined stitched channel detail, and restrained satin highlights.',
      approvedCharacteristics: ['deep tea-red', 'maroon', 'oxblood red-brown', 'premium leather', 'subtle natural grain', 'refined stitching/channel detail', 'restrained satin highlights'],
      forbiddenCharacteristics: ['beige', 'taupe', 'tan', 'generic brown', 'chocolate-only brown', 'cognac substitution', 'orange leather', 'washed-out neutral leather', 'glossy synthetic appearance'],
      colorGuidance: 'Approved Karun red/maroon upholstery is an intentional material color, not an unwanted color cast. Preserve deep tea-red / maroon / oxblood identity.',
      finishGuidance: 'Premium soft leather, subtle grain, refined stitching, restrained satin highlights.',
      usageGuidance: 'Use for material identity, color preservation, leather finish, and QC drift detection. Do not use as composition or furniture redesign guidance.',
      promptInjection: 'Preserve the approved Karun bench upholstery as deep tea-red / maroon / oxblood leather. This red/maroon upholstery is intentional brand material color, not a color cast. Do not convert it to beige, taupe, tan, cognac, generic brown, orange leather, or washed-out neutral leather. Maintain premium leather realism with subtle grain, refined stitching/channel detail, and restrained satin highlights.',
      qcValidationGuidance: 'Flag if upholstery shifts toward beige, taupe, tan, cognac, generic brown, orange leather, glossy synthetic leather, or washed-out neutral leather.',
      priority: 10,
    }),
    makeRule({
      id: 'karun-floor-accent-pattern',
      name: 'Karun Floor Accent Pattern',
      category: 'floor',
      protectionLevel: 'protected',
      description: 'Approved floor geometry and pattern with intentional red / tea-red / maroon accent tones. Placement, scale, rhythm, and material zones must remain locked.',
      approvedCharacteristics: ['preserve approved floor geometry and pattern', 'intentional red / tea-red / maroon accent tones', 'retain placement', 'retain scale', 'retain rhythm', 'retain material zones'],
      forbiddenCharacteristics: ['neutralizing to gray/brown/beige', 'removing red accents', 'simplifying into generic tiles', 'changing pattern geometry'],
      colorGuidance: 'Approved floor red accents are intentional brand colors, not unwanted color cast.',
      finishGuidance: 'Maintain realistic floor material response while preserving red accent identity and pattern geometry.',
      usageGuidance: 'Use for floor color/pattern lock and QC drift detection. Do not use as permission to redesign the floor.',
      promptInjection: 'Preserve the approved Karun floor pattern and all intentional red / tea-red / maroon accent tones. Do not neutralize, desaturate, simplify, or replace the floor into generic gray, brown, beige, or neutral tile. Preserve placement, scale, rhythm, material zones, and pattern geometry exactly.',
      qcValidationGuidance: 'Flag if red accents disappear, become gray/brown/beige, or if floor pattern geometry is simplified or changed.',
      priority: 20,
    }),
    makeRule({
      id: 'karun-satin-brass',
      name: 'Karun Satin Brass',
      category: 'metal',
      protectionLevel: 'protected',
      description: 'Warm satin or brushed brass with controlled reflections, crafted premium quality, and restrained metallic warmth.',
      approvedCharacteristics: ['satin brass', 'brushed brass', 'controlled reflections', 'warm but restrained', 'crafted premium finish'],
      forbiddenCharacteristics: ['mirror gold', 'chrome', 'bright yellow-gold', 'orange metallic cast', 'muddy flat bronze'],
      colorGuidance: 'Warm brass is allowed only as protected metal finish, not as global color cast.',
      finishGuidance: 'Satin/brushed finish with controlled highlights and realistic anisotropic reflections.',
      usageGuidance: 'Use for brass/metal elements only. Do not spread brass warmth into ceiling, neutral surfaces, upholstery, or floor accents.',
      promptInjection: 'Preserve Karun metal elements as satin brushed brass with soft, controlled reflections and crafted premium warmth. Avoid mirror-polished gold, chrome, bright yellow-gold, orange metallic cast, or muddy flat bronze. Do not spread brass warmth onto neutral architecture or protected red/maroon materials.',
      qcValidationGuidance: 'Flag if brass becomes chrome, mirror gold, too yellow, orange metallic, or muddy bronze.',
      priority: 30,
    }),
    makeRule({
      id: 'karun-warm-oak-joinery',
      name: 'Karun Warm Oak Joinery',
      category: 'wood',
      protectionLevel: 'protected',
      description: 'Warm natural oak with visible but controlled grain, refined joinery, rounded crafted edges, and dimensional finish.',
      approvedCharacteristics: ['warm natural oak', 'visible controlled grain', 'refined joinery', 'rounded crafted edges', 'dimensional finish'],
      forbiddenCharacteristics: ['red wood', 'dark walnut substitution', 'flat plastic laminate appearance', 'muddy generic brown', 'oversaturated orange wood'],
      colorGuidance: 'Oak may be warm, but must not pull the full image into brown/orange or override protected brand reds.',
      finishGuidance: 'Matte-to-satin natural oak with depth, pores, panel direction, and subtle imperfections.',
      usageGuidance: 'Use only for wood joinery/millwork. Do not convert upholstery, signage, ceiling, floor accents, or brass into wood tones.',
      promptInjection: 'Preserve Karun wood as warm natural oak with visible but controlled grain, refined joinery, rounded crafted edges, and dimensional matte-to-satin finish. Do not shift it into red wood, dark walnut, flat plastic laminate, muddy generic brown, or oversaturated orange wood. Do not let oak warmth neutralize protected maroon upholstery or red floor accents.',
      qcValidationGuidance: 'Flag if oak becomes red wood, dark walnut, muddy brown laminate, flat plastic texture, or oversaturated orange.',
      priority: 40,
    }),
    makeRule({
      id: 'karun-neutral-white-mall-context',
      name: 'Neutral White Mall Context',
      category: 'environment_context',
      protectionLevel: 'strongly_preferred',
      description: 'Neutral white ceiling, neutral white structural columns, realistic mall ambient light, and surrounding storefront context preserved.',
      approvedCharacteristics: ['neutral white ceiling', 'neutral white structural columns', 'realistic mall ambient light', 'surrounding storefront context preserved', 'white balance correction applies to neutral surfaces and ambient lighting'],
      forbiddenCharacteristics: ['yellow/brown environmental wash', 'replacing mall context with a blank luxury wall', 'warming all neutral architecture to match the kiosk'],
      colorGuidance: 'White-balance correction applies to neutral surfaces and ambient lighting, not protected Karun material colors.',
      finishGuidance: 'Clean realistic white/neutral mall architecture with physically plausible light.',
      usageGuidance: 'Use for ambient light, ceiling, columns, neutral mall context, and white balance. Do not use to neutralize protected brand material colors.',
      promptInjection: 'Keep mall ceiling, columns, gray/white neutral surfaces, and ambient mall lighting color-correct and neutral white. Correct unwanted yellow/orange cast only on neutral surfaces and ambient lighting. Do not replace the mall context with a blank luxury wall and do not warm all neutral architecture to match the kiosk.',
      qcValidationGuidance: 'Flag if ceiling/columns become yellow/brown, if mall context is replaced by a blank wall, or if neutral architecture is warmed globally.',
      priority: 50,
    }),
    makeRule({
      id: 'karun-brand-color-exception',
      name: 'Karun Brand Color Exception',
      category: 'brand_accent',
      protectionLevel: 'protected',
      description: 'Protected exception that prevents global color-cast, white-balance, restrained grading, or luxury neutral language from neutralizing intentional Karun brand colors.',
      approvedCharacteristics: ['approved red/maroon material colors remain intentional', 'red/maroon upholstery protected', 'red floor accents protected', 'color-cast correction scoped to neutral surfaces and ambient lighting'],
      forbiddenCharacteristics: ['interpreting approved red/maroon as color cast', 'neutralizing protected brand colors', 'desaturating protected brand colors', 'recoloring protected red/maroon materials because of white balance'],
      colorGuidance: 'Avoid overall yellow/orange cast only on neutral surfaces and ambient lighting. Never interpret approved red/maroon materials as a color cast.',
      finishGuidance: 'Maintain protected brand-color fidelity while allowing photographic realism.',
      usageGuidance: 'Highest-priority override when generic neutral, restrained, editorial, white-balance, or luxury instructions conflict with Karun material rules.',
      promptInjection: 'Project Source of Truth override: avoid overall yellow/orange cast only in neutral surfaces, white ceilings, white columns, gray materials, and ambient mall lighting. Never interpret approved Karun red/maroon materials as a color cast. Do not reduce, recolor, neutralize, desaturate, brown-shift, or reinterpret protected Karun red/maroon upholstery or red floor accents because of global white-balance, restrained grading, luxury mood, neutral palette, or editorial color correction instructions.',
      qcValidationGuidance: 'Flag if protected red/maroon materials are treated as color cast, desaturated, neutralized, brown-shifted, or recolored by generic white-balance/editorial/luxury instructions.',
      priority: 1,
    }),
  ].map((rule) => ({ ...rule, projectId }));
}

export function createKarunSourceOfTruth(projectId?: string, profileName = 'Karun'): ProjectSourceOfTruth {
  return {
    schemaVersion: SOURCE_SCHEMA,
    profileId: 'karun',
    profileName,
    active: true,
    materialRules: karunDefaultMaterialRules(projectId),
    promptPriorityPolicy: [...PROJECT_PROMPT_PRIORITY_POLICY],
    updatedAt: nowIso(),
  };
}

export const GENERAL_ARCHITECTURE_BASELINE = [
  'The Base Render is the primary design source of truth.',
  'Preserve camera, composition, architecture, geometry, layout, openings, furniture placement, built-ins, fixtures, equipment, and material zoning unless explicitly requested.',
  'Do not invent or redesign architectural elements.',
  'References are directional evidence, not replacement designs. Do not copy reference architecture, geometry, furniture form, composition, camera, or signage unless explicitly allowed.',
  'Improve only requested aspects. No global brand palette is assumed.',
  'Do not introduce Karun maroon, brass, oak, checkerboard floor, or any other Karun-specific characteristic automatically.',
];

export function createGeneralSourceOfTruth(projectId?: string, profileName = 'General / Custom'): ProjectSourceOfTruth {
  const createdAt = nowIso();
  return {
    schemaVersion: SOURCE_SCHEMA,
    profileId: 'general',
    profileName,
    active: true,
    materialRules: [makeRule({
      id: 'general-base-render-preservation',
      name: 'General Base Render Preservation',
      category: 'custom',
      protectionLevel: 'protected',
      description: 'Neutral preservation baseline for custom architectural visualization projects.',
      approvedCharacteristics: ['base render architecture', 'camera', 'composition', 'material zoning', 'furniture placement'],
      forbiddenCharacteristics: ['invented architecture', 'copied reference geometry', 'copied reference furniture form', 'copied reference composition', 'copied reference camera'],
      colorGuidance: 'No brand palette is assumed. Preserve intentional material colors visible in the Base Render.',
      finishGuidance: 'Improve only requested material and photographic qualities.',
      usageGuidance: 'Apply to all General / Custom generations. Reference influence must remain within its selected scope.',
      promptInjection: GENERAL_ARCHITECTURE_BASELINE.join(' '),
      qcValidationGuidance: 'Flag architecture drift, camera changes, geometry changes, copied reference forms, or unrequested material zoning changes.',
      priority: 1,
      sourceOfTruthNotes: 'Default General / Custom baseline.',
    })],
    promptPriorityPolicy: [...PROJECT_PROMPT_PRIORITY_POLICY],
    updatedAt: createdAt,
  };
}

export function createProjectProfile(projectId: string, kind: 'karun' | 'general' = 'general'): ProjectProfile {
  const createdAt = nowIso();
  return kind === 'karun'
    ? {
      id: `${projectId}-profile-karun`,
      displayName: 'Karun',
      profileType: 'branded',
      sourceOfTruthProfileId: 'karun',
      projectSpecificOverrides: [],
      defaultWorkflowPreset: 'karun_production',
      createdAt,
      updatedAt: createdAt,
    }
    : {
      id: `${projectId}-profile-general`,
      displayName: 'General / Custom',
      profileType: 'general',
      sourceOfTruthProfileId: 'general',
      projectSpecificOverrides: [],
      defaultWorkflowPreset: 'general_reference_first',
      createdAt,
      updatedAt: createdAt,
    };
}

export function normalizeProjectProfile(project: Project): ProjectProfile {
  const isKarun = /karun/i.test(project.name || '') || project.sourceOfTruth?.profileId === 'karun' || project.profile?.sourceOfTruthProfileId === 'karun';
  const fallback = createProjectProfile(project.id, isKarun ? 'karun' : 'general');
  const input = project.profile || fallback;
  return {
    ...fallback,
    ...input,
    profileType: input.profileType || fallback.profileType,
    sourceOfTruthProfileId: input.sourceOfTruthProfileId || fallback.sourceOfTruthProfileId,
    projectSpecificOverrides: input.projectSpecificOverrides || [],
    defaultWorkflowPreset: input.defaultWorkflowPreset || fallback.defaultWorkflowPreset,
    updatedAt: input.updatedAt || fallback.updatedAt,
  };
}

function normalizeRule(projectId: string, rule: Partial<ProjectMaterialRule>, index: number): ProjectMaterialRule {
  const createdAt = rule.createdAt || nowIso();
  const name = rule.name?.trim() || `Material Rule ${index + 1}`;
  return {
    id: rule.id || `${slug(name)}-${index + 1}`,
    projectId,
    name,
    category: rule.category || 'custom',
    enabled: rule.enabled !== false,
    protectionLevel: rule.protectionLevel || 'flexible',
    description: rule.description || '',
    approvedCharacteristics: Array.isArray(rule.approvedCharacteristics) ? rule.approvedCharacteristics : [],
    forbiddenCharacteristics: Array.isArray(rule.forbiddenCharacteristics) ? rule.forbiddenCharacteristics : [],
    colorGuidance: rule.colorGuidance || '',
    finishGuidance: rule.finishGuidance || '',
    usageGuidance: rule.usageGuidance || '',
    promptInjection: rule.promptInjection || '',
    qcValidationGuidance: rule.qcValidationGuidance || '',
    referenceImages: Array.isArray(rule.referenceImages) ? rule.referenceImages.map((ref, refIndex) => ({
      id: ref.id || `${slug(name)}-ref-${refIndex + 1}`,
      name: ref.name || `${name} reference ${refIndex + 1}`,
      dataUrl: ref.dataUrl || '',
      scopes: Array.isArray(ref.scopes) && ref.scopes.length ? ref.scopes : ['material_identity_only'],
      notes: ref.notes || '',
      createdAt: ref.createdAt || createdAt,
    })).filter((ref) => ref.dataUrl) : [],
    sourceOfTruthNotes: rule.sourceOfTruthNotes || '',
    priority: typeof rule.priority === 'number' ? rule.priority : 100 + index,
    isDefault: Boolean(rule.isDefault),
    createdAt,
    updatedAt: rule.updatedAt || createdAt,
  };
}

export function normalizeProjectSourceOfTruth(project: Project): ProjectSourceOfTruth {
  const profile = normalizeProjectProfile(project);
  const isKarun = profile.sourceOfTruthProfileId === 'karun';
  const fallback = isKarun ? createKarunSourceOfTruth(project.id, 'Karun') : createGeneralSourceOfTruth(project.id, profile.displayName || 'General / Custom');
  const input = project.sourceOfTruth || fallback;
  const baseRules = input.materialRules?.length ? input.materialRules : fallback.materialRules;
  return {
    schemaVersion: SOURCE_SCHEMA,
    profileId: input.profileId || fallback.profileId,
    profileName: input.profileName || fallback.profileName,
    active: input.active !== false,
    materialRules: baseRules.map((rule, index) => normalizeRule(project.id, rule, index)).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    promptPriorityPolicy: input.promptPriorityPolicy?.length ? input.promptPriorityPolicy : [...PROJECT_PROMPT_PRIORITY_POLICY],
    updatedAt: input.updatedAt || nowIso(),
  };
}

export function normalizeProjectWithSourceOfTruth(project: Project): Project {
  const profile = normalizeProjectProfile(project);
  return { ...project, profile, sourceOfTruth: normalizeProjectSourceOfTruth({ ...project, profile }) };
}

export function enabledMaterialRules(source?: ProjectSourceOfTruth) {
  return (source?.materialRules || []).filter((rule) => rule.enabled).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function materialRulePromptLines(source?: ProjectSourceOfTruth) {
  const rules = enabledMaterialRules(source);
  if (!rules.length) return [];
  return [
    `Project profile: ${source?.profileName || 'Project'} (${source?.profileId || 'default'}).`,
    'Project Source of Truth has priority over generic luxury, neutral, editorial, mood, and color-cast instructions.',
    ...rules.map((rule) => [
      `- [${rule.protectionLevel.toUpperCase()} / ${rule.category}] ${rule.name}: ${rule.promptInjection || rule.description}`,
      rule.colorGuidance ? `  Color rule: ${rule.colorGuidance}` : '',
      rule.finishGuidance ? `  Finish rule: ${rule.finishGuidance}` : '',
      rule.forbiddenCharacteristics.length ? `  Forbidden substitutions: ${rule.forbiddenCharacteristics.join(', ')}.` : '',
    ].filter(Boolean).join('\n')),
  ];
}

export function materialRuleNegativeLines(source?: ProjectSourceOfTruth) {
  return enabledMaterialRules(source)
    .flatMap((rule) => [
      ...rule.forbiddenCharacteristics.map((item) => `${rule.name}: no ${item}`),
      rule.qcValidationGuidance ? `Do not violate QC rule for ${rule.name}: ${rule.qcValidationGuidance}` : '',
    ])
    .filter(Boolean);
}

export function scopedColorCastCorrectionLine(source?: ProjectSourceOfTruth) {
  const hasBrandException = enabledMaterialRules(source).some((rule) => rule.id === 'karun-brand-color-exception' || rule.category === 'brand_accent');
  return hasBrandException
    ? 'Correct unwanted yellow/orange cast in neutral surfaces, white ceilings, white columns, gray materials, and ambient mall lighting only. Do not reduce, recolor, neutralize, desaturate, brown-shift, or reinterpret intentional approved project colors, especially protected Karun red/maroon upholstery and red floor accents.'
    : 'Correct unwanted color cast in neutral surfaces and ambient lighting while preserving intentional material colors.';
}

function section(id: string, label: string, source: string, priority: number, content: string, ruleIds?: string[]): CompiledPromptSection {
  return { id, label, source, priority, content, ruleIds };
}

export function compileProjectPromptTrace(args: {
  sourceOfTruth?: ProjectSourceOfTruth;
  basePrompt: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  mode?: string;
  userRequest?: string;
  activeGoals?: string[];
  revisionCorrections?: string;
  qcRequirements?: string;
  providerSuffix?: string;
  agentRevisionInterpretation?: string;
  baseTruthRestoration?: string;
  applicableProjectRules?: string;
  suppressedProjectRules?: string;
  commentEvidence?: string;
  scopedReferences?: string;
  visualDirection?: string;
  referenceDirectionUsage?: string;
  generationIntent?: string;
  sceneContract?: string;
  atmosphereRecipe?: string;
  referenceBorrowMap?: string;
  spaceBaseline?: string;
}): CompiledPromptTrace {
  const source = args.sourceOfTruth;
  const activeRules = enabledMaterialRules(source);
  const ruleText = materialRulePromptLines(source).join('\n');
  const scopedCast = scopedColorCastCorrectionLine(source);
  const referenceInstructions = projectRuleReferenceInstructions(source);
  const sections = [
    section('project-source-of-truth', 'Project source of truth', 'Project Material Rules', 1, ruleText || 'No project-specific material rules active.', activeRules.map((rule) => rule.id)),
    section('protected-brand-color-cast', 'Lighting/color-cast scope', 'Project Source of Truth', 1.5, scopedCast, activeRules.filter((rule) => rule.category === 'brand_accent' || rule.category === 'environment_context').map((rule) => rule.id)),
    args.agentRevisionInterpretation ? section('agent-revision-interpretation', 'Agent revision interpretation', 'AI Copilot revision composer', 2.8, args.agentRevisionInterpretation) : undefined,
    args.baseTruthRestoration ? section('base-truth-restoration', 'Base truth restoration', 'Base Render source of truth', 2.9, args.baseTruthRestoration) : undefined,
    args.applicableProjectRules ? section('applicable-project-rules', 'Applicable project rules', 'Agent rule filter', 3, args.applicableProjectRules) : undefined,
    args.suppressedProjectRules ? section('suppressed-project-rules', 'Suppressed project rules', 'Agent rule filter', 3.1, args.suppressedProjectRules) : undefined,
    args.commentEvidence ? section('comment-evidence', 'Comment evidence', 'Review comments as evidence', 3.2, args.commentEvidence) : undefined,
    args.scopedReferences ? section('scoped-references', 'Scoped references', 'Review reference scope', 3.3, args.scopedReferences) : undefined,
    args.visualDirection ? section('applied-visual-direction', 'Applied Visual Direction', 'General reference analysis', 3.25, args.visualDirection) : undefined,
    args.referenceDirectionUsage ? section('general-reference-usage', 'Reference usage', 'General reference analysis', 3.26, args.referenceDirectionUsage) : undefined,
    args.generationIntent ? section('generation-intent', 'Generation Intent', 'General production workflow', 2.15, args.generationIntent) : undefined,
    args.sceneContract ? section('scene-contract', 'Scene Contract critical locks', 'General production workflow', 2.2, args.sceneContract) : undefined,
    args.atmosphereRecipe ? section('atmosphere-recipe', 'Atmosphere Recipe', 'General production workflow', 3.27, args.atmosphereRecipe) : undefined,
    args.referenceBorrowMap ? section('reference-borrow-map', 'Structured Reference Borrow Map', 'General production workflow', 3.28, args.referenceBorrowMap) : undefined,
    args.spaceBaseline ? section('space-specific-baseline', 'Space-specific baseline', 'General production workflow', 3.29, args.spaceBaseline) : undefined,
    args.revisionCorrections ? section('revision-corrections', 'Revision corrections', 'Current revision/QC notes', 3.4, args.revisionCorrections) : undefined,
    args.userRequest ? section('user-request', 'User request', 'User input', 4, args.userRequest) : undefined,
    args.activeGoals?.length ? section('active-goals', 'Active goals', 'Quick Generate goal cards', 6, args.activeGoals.join(', ')) : undefined,
    referenceInstructions.length ? section('reference-usage', 'Reference usage', 'Project material references', 2.5, referenceInstructions.join('\n'), activeRules.map((rule) => rule.id)) : undefined,
    args.qcRequirements ? section('qc-requirements', 'QC requirements', 'QC rule compiler', 3.5, args.qcRequirements) : undefined,
    section('base-prompt', 'Base compiled prompt', 'Visual Local prompt compiler', 5, args.basePrompt),
    args.providerSuffix ? section('provider-transform', 'Provider-specific transformation', 'Provider adapter', 8, args.providerSuffix) : undefined,
    args.negativePrompt ? section('negative-prompt', 'Negative prompt', 'Negative prompt compiler', 9, args.negativePrompt) : undefined,
  ].filter(Boolean) as CompiledPromptSection[];
  const ordered = sections.sort((a, b) => a.priority - b.priority);
  const finalPrompt = ordered
    .filter((item) => item.id !== 'negative-prompt')
    .map((item) => `${item.label.toUpperCase()}\n${item.content}`)
    .join('\n\n');
  return {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    projectProfileId: source?.profileId,
    projectProfileName: source?.profileName,
    provider: args.provider,
    model: args.model,
    mode: args.mode,
    sections: ordered,
    finalPrompt,
    negativePrompt: args.negativePrompt,
    activeRuleIds: activeRules.map((rule) => rule.id),
    referenceInstructions,
    referencesSent: applicableProjectRuleReferences(source).map(({ rule, ref }) => ({ id: ref.id, name: ref.name, ruleId: rule.id, scopes: ref.scopes })),
    warnings: validateProjectSourceOfTruth(source),
  };
}

export function validateProjectSourceOfTruth(source?: ProjectSourceOfTruth) {
  const warnings: string[] = [];
  const rules = enabledMaterialRules(source);
  if (!source || !rules.length) return warnings;
  if (source?.profileId === 'karun' && !rules.some((rule) => rule.category === 'brand_accent')) warnings.push('No brand accent exception rule is active.');
  rules.forEach((rule) => {
    if (!rule.promptInjection.trim()) warnings.push(`${rule.name} has no prompt injection text.`);
    if (rule.protectionLevel === 'protected' && !rule.qcValidationGuidance.trim()) warnings.push(`${rule.name} is protected but has no QC validation guidance.`);
  });
  return warnings;
}

export function applicableProjectRuleReferences(source?: ProjectSourceOfTruth) {
  return enabledMaterialRules(source).flatMap((rule) => (rule.referenceImages || [])
    .filter((ref) => ref.dataUrl)
    .map((ref) => ({ rule, ref })));
}

export function projectRuleReferenceInstructions(source?: ProjectSourceOfTruth) {
  return applicableProjectRuleReferences(source).map(({ rule, ref }) => {
    const scopeText = ref.scopes.map(referenceScopeLabel).join(', ');
    return `- ${rule.name} reference "${ref.name}": use as ${scopeText}. ${ref.notes || ''}`.trim();
  });
}

export function referenceScopeLabel(scope: MaterialRuleReferenceScope) {
  return scope.replace(/_/g, ' ');
}

export function cloneKarunDefaults(projectId?: string) {
  return createKarunSourceOfTruth(projectId, 'Karun');
}

export function cloneGeneralDefaults(projectId?: string) {
  return createGeneralSourceOfTruth(projectId, 'General / Custom');
}
