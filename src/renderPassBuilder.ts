import {
  DesignLock,
  EnvironmentMode,
  LightingMode,
  MaterialEnhancementLevel,
  MaterialEnhancementTargets,
  MaterialIntelligenceState,
  MaterialProfiles,
  PeopleActivityLayer,
  ArchitectureContext,
  BrandContext,
  CameraSystem,
  EnvironmentLibraryPreset,
  GenerationRule,
  KnowledgeConfidence,
  LocalTelemetryEvent,
  LightingGraph,
  ProjectKnowledgeBase,
  ProtectedDesignAsset,
  ProjectSourceOfTruth,
  QcReviewState,
  ReferenceRole,
  RenderPassInput,
  ResultQc,
  ResultQcValue,
  ResultRound,
  RevisionCategory,
  RenderPass,
  RenderPassBuilderState,
  RenderPassType,
  ModelAdapterId,
  RenderPromptVersion,
  Scene,
  SceneIntelligenceState,
  SceneSetup,
  SiteContext,
  VisualDirectionPreset,
  VisualDirectionMode,
  VisualDiffState,
  WorkPlanItem,
} from './types';
import {
  compileProjectPromptTrace,
  materialRuleNegativeLines,
  materialRulePromptLines,
  projectRuleReferenceInstructions,
  scopedColorCastCorrectionLine,
} from './projectSourceOfTruth';
import { defaultReferenceDirectionState, normalizeReferenceDirectionState, visualDirectionPromptLines } from './referenceDirection';

export const renderPassLabels: Record<RenderPassType, string> = {
  analyze_site: 'PASS 00 - Analyze Site',
  analyze_architecture: 'PASS 01 - Analyze Architecture',
  brand_analysis: 'PASS 02 - Brand Analysis',
  knowledge_lock: 'PASS 03 - Knowledge Lock',
  architecture_lock: 'PASS 04 - Architecture Lock',
  material_enhancement: 'PASS 05 - Material Enhancement',
  lighting_direction: 'PASS 06 - Lighting Direction',
  environment: 'PASS 07 - Environment',
  people: 'PASS 08 - People',
  photographic_finish: 'PASS 09 - Photographic Polish',
  qc_review: 'PASS 10 - QC',
};

export const renderPassFileNames: Record<RenderPassType, string> = {
  analyze_site: '00_analyze_site.txt',
  analyze_architecture: '01_analyze_architecture.txt',
  brand_analysis: '02_brand_analysis.txt',
  knowledge_lock: '03_knowledge_lock.txt',
  architecture_lock: '04_architecture_lock.txt',
  material_enhancement: '05_material_enhancement.txt',
  lighting_direction: '06_lighting_direction.txt',
  environment: '07_environment.txt',
  people: '08_people.txt',
  photographic_finish: '09_photographic_polish.txt',
  qc_review: '10_qc.txt',
};

export const renderPassObjectives: Record<RenderPassType, string> = {
  analyze_site: 'Analyze real site references only. Extract site context. Do not generate or modify an image.',
  analyze_architecture: 'Analyze the uploaded base render only. Extract architecture context and protected assets. Do not generate or modify an image.',
  brand_analysis: 'Analyze brand, material, furniture, mood, lighting, and previous project references. Extract Brand DNA. Do not generate an image.',
  knowledge_lock: 'Merge Site, Architecture, Brand, Materials, Lighting, Furniture, Equipment, Camera, and Protected Assets into one Project Knowledge Base.',
  architecture_lock: 'Restate and strengthen the architecture lock. Camera, geometry, layout, furniture, equipment, lighting fixtures, materials, logo, columns, and composition must be protected.',
  material_enhancement: 'Enhance realism and richness of existing materials only. Improve selected material qualities without changing material types, colors, patterns, or design intent.',
  lighting_direction: 'Improve photographic lighting quality only. Enhance daylight, soft shadows, highlights, exposure balance, atmospheric depth, and lens response. Do not add or replace lighting fixtures.',
  environment: 'Enhance only environment/background context according to the environment library. Do not modify architecture or protected assets.',
  people: 'Add natural human activity only if selected. People must remain secondary. Architecture remains hero. Do not alter layout, furniture, counters, signage, or protected assets.',
  photographic_finish: 'Apply final editorial color grading and photographic polish. Adjust contrast, tonal balance, white balance, highlight roll-off, shadow softness, depth, and premium editorial mood. Do not change any physical design element.',
  qc_review: 'Review a generated result against the base render. Identify deviations and produce a revision prompt. Do not redesign.',
};

export const modelAdapterOptions: Array<{ value: ModelAdapterId; label: string; description: string }> = [
  { value: 'generic', label: 'Generic', description: 'Full structured prompt for any model.' },
  { value: 'gemini', label: 'Gemini', description: 'Context-first analysis, preserve, and pass language.' },
  { value: 'gpt_image', label: 'GPT Image', description: 'Strict image-edit phrasing for preserve-first generation.' },
  { value: 'flux_kontext', label: 'Flux Kontext', description: 'Short direct image-to-image instruction.' },
  { value: 'magnific', label: 'Magnific', description: 'Enhance-only, upscale/texture clarity language.' },
  { value: 'midjourney', label: 'Midjourney', description: 'Compact descriptive prompt; negative is separate.' },
];

export const renderPassTimeline: Array<{ label: string; type: RenderPassType }> = [
  { label: '00 Site', type: 'analyze_site' },
  { label: '01 Architecture', type: 'analyze_architecture' },
  { label: '02 Brand', type: 'brand_analysis' },
  { label: '03 Lock', type: 'knowledge_lock' },
  { label: '04 Material', type: 'material_enhancement' },
  { label: '05 Lighting', type: 'lighting_direction' },
  { label: '06 Environment', type: 'environment' },
  { label: '07 People', type: 'people' },
  { label: '08 Polish', type: 'photographic_finish' },
  { label: '09 QC', type: 'qc_review' },
];

export const visualDirectionOptions: Array<{ value: VisualDirectionMode; label: string }> = [
  { value: 'real_site_documentation', label: 'Real Site Documentation' },
  { value: 'premium_retail_editorial', label: 'Premium Retail Editorial' },
  { value: 'ambient_architecture', label: 'Ambient Architecture' },
  { value: 'cinematic_presentation', label: 'Cinematic Presentation' },
  { value: 'hero_object', label: 'Hero Object' },
  { value: 'museum_gallery_presentation', label: 'Museum / Gallery Presentation' },
  { value: 'opening_day', label: 'Opening Day' },
  { value: 'night_luxury', label: 'Night Luxury' },
];

export const lightingOptions: Array<{ value: LightingMode; label: string }> = [
  { value: 'natural_skylight', label: 'Natural Skylight' },
  { value: 'soft_diffused_daylight', label: 'Soft Diffused Daylight' },
  { value: 'warm_ambient', label: 'Warm Ambient' },
  { value: 'museum_lighting', label: 'Museum Lighting' },
  { value: 'cinematic_ambient', label: 'Cinematic Ambient' },
  { value: 'evening_retail', label: 'Evening Retail' },
  { value: 'low_key_editorial', label: 'Low-key Editorial' },
  { value: 'spot_soft_fill', label: 'Spot + Soft Fill' },
];

export const environmentOptions: Array<{ value: EnvironmentMode; label: string }> = [
  { value: 'existing_site', label: 'Existing Site' },
  { value: 'premium_mall_atrium', label: 'Premium Mall Atrium' },
  { value: 'fade_background', label: 'Fade Background' },
  { value: 'dark_negative_space', label: 'Dark Negative Space' },
  { value: 'museum_void', label: 'Museum Void' },
  { value: 'white_infinity', label: 'White Infinity' },
  { value: 'editorial_studio_hall', label: 'Editorial Studio Hall' },
];

export const materialLevelOptions: Array<{ value: MaterialEnhancementLevel; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'premium', label: 'Premium' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'luxury_magazine', label: 'Luxury Magazine' },
];

export const peopleLayerOptions: Array<{ value: PeopleActivityLayer; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'subtle_motion_blur', label: 'Subtle Motion Blur' },
  { value: 'opening_day', label: 'Opening Day' },
  { value: 'staff_only', label: 'Staff Only' },
  { value: 'customers_only', label: 'Customers Only' },
  { value: 'mall_visitors', label: 'Mall Visitors' },
  { value: 'full_commercial_activity', label: 'Full Commercial Activity' },
];

export const knowledgePhaseOptions: Array<{ value: RenderPassBuilderState['workflowPhase']; label: string }> = [
  { value: 'site_analysis', label: '1. Site Analysis' },
  { value: 'architecture_analysis', label: '2. Architecture Analysis' },
  { value: 'brand_analysis', label: '3. Brand Analysis' },
  { value: 'knowledge_lock', label: '4. Knowledge Lock' },
  { value: 'prompt_composer', label: '5. Prompt Composer' },
  { value: 'qc_review', label: '6. QC Review' },
];

export const referenceRoleOptions: Array<{ value: ReferenceRole; label: string }> = [
  { value: 'site', label: 'Site Reference' },
  { value: 'architecture', label: 'Architecture Reference' },
  { value: 'material', label: 'Material Reference' },
  { value: 'lighting', label: 'Lighting Reference' },
  { value: 'mood', label: 'Mood Reference' },
  { value: 'people', label: 'People Reference' },
  { value: 'brand', label: 'Brand Reference' },
  { value: 'environment', label: 'Environment Reference' },
];

export const cameraViewOptions: Array<{ value: CameraSystem['view']; label: string }> = [
  { value: 'front_hero', label: 'Front Hero' },
  { value: 'forty_five', label: '45 Degree' },
  { value: 'side', label: 'Side' },
  { value: 'corner', label: 'Corner' },
  { value: 'wide', label: 'Wide' },
  { value: 'eye_level', label: 'Eye Level' },
  { value: 'bird_eye', label: 'Bird Eye' },
  { value: 'human_perspective', label: 'Human Perspective' },
];

export const lensOptions: Array<{ value: CameraSystem['lens']; label: string }> = [24, 28, 35, 50, 70].map((value) => ({ value: value as CameraSystem['lens'], label: `${value}mm` }));

export const visualDirectionPresetOptions: Array<{ value: VisualDirectionPreset; label: string }> = [
  { value: 'editorial', label: 'Editorial' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'opening_day', label: 'Opening Day' },
  { value: 'architectural_competition', label: 'Architectural Competition' },
  { value: 'luxury_brand', label: 'Luxury Brand' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'quiet_luxury', label: 'Quiet Luxury' },
  { value: 'museum_presentation', label: 'Museum Presentation' },
  { value: 'product_hero', label: 'Product Hero' },
];

export const environmentLibraryOptions: Array<{ value: EnvironmentLibraryPreset; label: string }> = [
  { value: 'premium_mall', label: 'Premium Mall' },
  { value: 'minimal_gallery', label: 'Minimal Gallery' },
  { value: 'white_infinity', label: 'White Infinity' },
  { value: 'black_infinity', label: 'Black Infinity' },
  { value: 'museum', label: 'Museum' },
  { value: 'studio', label: 'Studio' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'luxury_retail', label: 'Luxury Retail' },
  { value: 'fade_background', label: 'Fade Background' },
  { value: 'negative_space', label: 'Negative Space' },
];

export const revisionCategoryOptions: Array<{ value: RevisionCategory; label: string }> = [
  { value: 'restore_architecture', label: 'Restore Architecture' },
  { value: 'restore_furniture', label: 'Restore Furniture' },
  { value: 'restore_equipment', label: 'Restore Equipment' },
  { value: 'restore_camera', label: 'Restore Camera' },
  { value: 'restore_columns', label: 'Restore Columns' },
  { value: 'restore_lighting_fixtures', label: 'Restore Lighting Fixtures' },
  { value: 'remove_hallucinated_objects', label: 'Remove Hallucinated Objects' },
  { value: 'correct_perspective', label: 'Correct Perspective' },
  { value: 'reduce_contrast', label: 'Reduce Contrast' },
  { value: 'increase_fill_light', label: 'Increase Fill Light' },
  { value: 'improve_material', label: 'Improve Material' },
  { value: 'reduce_background', label: 'Reduce Background' },
  { value: 'suppress_environment', label: 'Suppress Environment' },
];

const defaultSceneSetup: SceneSetup = {
  projectName: 'Karun Central Khon Kaen Campus',
  brand: 'Karun',
  location: 'Central Khon Kaen Campus',
  sceneType: 'Hero Front View',
  cameraAngle: 'Fixed front architectural render',
  outputGoal: 'Editorial Opening Day architectural photograph',
};

const defaultDesignLock: DesignLock = {
  lockCamera: true,
  lockArchitecture: true,
  lockGeometry: true,
  lockFurniture: true,
  lockEquipment: true,
  lockLightingFixtures: true,
  lockMaterials: true,
  lockFloorPattern: true,
  lockLogoSignage: true,
  lockColumns: true,
  lockComposition: true,
  customPreserveNotes: '',
};

const defaultMaterialTargets: MaterialEnhancementTargets = {
  woodGrain: true,
  brassReflection: true,
  leatherTexture: true,
  marbleDepth: true,
  glassReflection: true,
  floorReflection: true,
  microImperfections: true,
};

const defaultKnowledgeConfidence: KnowledgeConfidence = {
  project: 60,
  site: 0,
  architecture: 0,
  brand: 0,
  materials: 0,
  lighting: 0,
  furniture: 0,
  equipment: 0,
  camera: 0,
  protectedAssets: 80,
};

const defaultCameraSystem: CameraSystem = {
  view: 'front_hero',
  lens: 35,
  height: 'Eye level architectural view',
  perspective: 'Human perspective, straight verticals, no distortion',
  compositionNotes: 'Preserve original base render framing and composition',
  locked: true,
};

const defaultLightingGraph: LightingGraph = {
  keyLight: 60,
  fillLight: 45,
  ambient: 55,
  practicalLights: 35,
  skylight: 55,
  backgroundFalloff: 45,
  shadowDensity: 45,
  reflectionStrength: 50,
  notes: '',
};

const defaultMaterialProfiles: MaterialProfiles = {
  woodGrain: 55,
  reflection: 45,
  microRoughness: 55,
  imperfections: 35,
  leatherSoftness: 45,
  brassAging: 35,
  marbleContrast: 50,
  glassReflection: 50,
  floorReflection: 45,
};

const defaultRevisionCategories: Record<RevisionCategory, boolean> = revisionCategoryOptions.reduce((acc, item) => ({ ...acc, [item.value]: false }), {} as Record<RevisionCategory, boolean>);

const defaultVisualDiff: VisualDiffState = {
  added: '',
  removed: '',
  modified: '',
  moved: '',
  notes: '',
};

const priorityRank: Record<GenerationRule['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const defaultMaterialIntelligence: MaterialIntelligenceState = {
  summary: 'Heuristic retail/interior material intelligence. Use as conservative prompt support when no Gemini material analysis exists.',
  zones: [
    {
      id: 'heuristic-wood',
      category: 'wood',
      label: 'Wood surfaces / millwork',
      likelyMaterialType: 'natural or engineered warm wood',
      visualRole: 'primary tactile architectural material',
      preservationPriority: 'high',
      confidence: 62,
      enhancementInstruction: 'Improve natural wood grain variation, pores, panel direction, matte-to-satin finish, edge detail, and subtle imperfections. Do not flatten into plastic laminate or change wood placement.',
      hallucinationRisk: 'Do not convert leather, signage, ceiling, or brass areas into wood.',
      source: 'heuristic',
    },
    {
      id: 'heuristic-leather',
      category: 'leather_upholstery',
      label: 'Leather / upholstery seating',
      likelyMaterialType: 'leather or upholstered seating where visible',
      visualRole: 'soft furniture material',
      preservationPriority: 'high',
      confidence: 56,
      enhancementInstruction: 'Preserve seating as leather/upholstery when visible. Improve natural leather grain, cushion softness, subtle sheen, stitching or tufting if present. Do not convert leather into wood.',
      hallucinationRisk: 'Do not replace benches/chairs, change their color family, or turn upholstery into timber.',
      source: 'heuristic',
    },
    {
      id: 'heuristic-brass-metal',
      category: 'brass_metal',
      label: 'Brass / metal details',
      likelyMaterialType: 'brass, warm metal, or architectural metal trim',
      visualRole: 'premium highlight material',
      preservationPriority: 'high',
      confidence: 60,
      enhancementInstruction: 'Improve brushed brass or warm metal with controlled anisotropic reflections, edge definition, and realistic highlights. Avoid mirror-gold, yellow paint, or global warmth.',
      hallucinationRisk: 'Do not spread brass color onto neutral ceiling, floor, walls, or signage.',
      source: 'heuristic',
    },
    {
      id: 'heuristic-floor',
      category: 'stone_tile_floor',
      label: 'Stone / tile / floor',
      likelyMaterialType: 'mall stone, tile, terrazzo, or polished floor',
      visualRole: 'grounding architectural surface',
      preservationPriority: 'critical',
      confidence: 64,
      enhancementInstruction: 'Improve realistic roughness, contact shadows, floor reflection falloff, and subtle wear without making the floor wet or mirror-like. Preserve floor pattern and joints.',
      hallucinationRisk: 'Do not change floor grid, pattern, geometry, or reflection into a wet mirror surface.',
      source: 'heuristic',
    },
    {
      id: 'heuristic-ceiling-white',
      category: 'painted_ceiling_wall',
      label: 'White ceiling / painted walls / columns',
      likelyMaterialType: 'painted white or neutral architectural surfaces',
      visualRole: 'neutral mall architecture and white balance anchor',
      preservationPriority: 'critical',
      confidence: 68,
      enhancementInstruction: 'Preserve neutral white balance and clean white ceiling/columns. Use realistic mall light emission without yellow staining.',
      hallucinationRisk: 'No global yellow/orange cast. Do not darken or redesign mall ceiling systems.',
      source: 'heuristic',
    },
    {
      id: 'heuristic-signage',
      category: 'signage_logo',
      label: 'Signage / logo / brand marks',
      likelyMaterialType: 'printed, lit, or dimensional signage',
      visualRole: 'brand identity and protected asset',
      preservationPriority: 'critical',
      confidence: 70,
      enhancementInstruction: 'Preserve text, logo, position, proportion, color identity, and legibility. Retouch only clarity and photographic integration.',
      hallucinationRisk: 'Do not invent text, change logo, distort signage, or replace menu/brand graphics.',
      source: 'heuristic',
    },
    {
      id: 'heuristic-lighting-fixtures',
      category: 'lighting_fixtures',
      label: 'Lighting fixtures',
      likelyMaterialType: 'decorative lamps, ceiling lights, and practical fixtures',
      visualRole: 'physical lighting hardware and atmosphere source',
      preservationPriority: 'critical',
      confidence: 66,
      enhancementInstruction: 'Preserve fixture count, position, scale, and design. Improve realistic glow and highlight rolloff only.',
      hallucinationRisk: 'Do not add, remove, move, or replace lighting fixtures.',
      source: 'heuristic',
    },
  ],
};

const defaultSceneIntelligence: SceneIntelligenceState = {
  analysisSource: 'deterministic',
  sceneGraph: {
    sceneType: 'premium retail kiosk',
    locationType: 'indoor shopping mall',
    cameraDescription: 'frontal architectural view with fixed perspective and straight verticals',
    designIntent: 'Document a completed premium retail kiosk as architectural editorial photography, preserving the approved design exactly.',
    keyArchitecturalElements: ['retail kiosk volume', 'counter geometry', 'canopy', 'columns', 'floor pattern', 'ceiling system', 'signage/logo', 'decorative lamps', 'furniture positions'],
    protectedElements: ['camera', 'perspective', 'kiosk geometry', 'counter', 'canopy', 'logo/signage', 'columns', 'floor pattern', 'lighting fixture positions', 'furniture positions'],
    visibleMaterials: ['wood', 'leather/upholstery', 'brass/metal', 'floor tile/stone', 'painted white ceiling/columns', 'signage/logo', 'globe lamps'],
    visibleLightingConditions: ['neutral indoor mall ambient light', 'soft bounce light', 'decorative lamp warmth only', 'white ceiling light'],
    likelyRenderWeaknesses: ['warm global yellow cast', 'flat wood materials', 'weak brass reflections', 'unrealistic mall ceiling lighting', 'render-like appearance', 'flat dynamic range'],
  },
  lightingIntelligence: {
    summary: 'Keep mall ambient light neutral white and physically plausible while improving daylight/bounce realism.',
    rules: [
      'Avoid global yellow/orange cast.',
      'Keep mall ambient light neutral white around 5200K-5600K.',
      'Keep warmth only on wood, brass, tea-colored materials, and decorative lamps.',
      'Improve daylight and bounce light if the scene reads as mall/interior.',
      'Preserve ceiling and columns as neutral white.',
      'Preserve all lighting fixture positions; improve glow and highlight rolloff only.',
    ],
  },
  environmentIntelligence: {
    summary: 'Use the existing indoor shopping mall context unless Better Environment is selected.',
    rules: [
      'Do not invent a new mall background unless Better Environment is selected.',
      'If environment refinement is selected, keep it as supporting premium mall context, never a redesign.',
      'Do not block the kiosk or architecture with background clutter.',
    ],
  },
  protectionIntelligence: {
    summary: 'Architecture is locked first; photographic and material polish happen only after preservation.',
    priorities: [
      { priority: 'critical', items: ['camera', 'perspective', 'architecture geometry', 'logo/signage', 'counter', 'canopy'] },
      { priority: 'high', items: ['furniture positions', 'floor pattern', 'lighting fixture positions'] },
      { priority: 'medium', items: ['reflections', 'atmosphere', 'material finish'] },
      { priority: 'low', items: ['minor photographic polish'] },
    ],
  },
  photographyIntelligence: {
    summary: 'Use architectural editorial photography language, not cinematic or social-media filter language.',
    rules: [
      'Prefer architectural editorial photography.',
      'Use natural contrast, high dynamic range, realistic highlight rolloff, and real camera response.',
      'Add micro material detail without changing material identity.',
      'Avoid generic cinematic, dreamy, stylized, warm filter, luxury glow, and Instagram filter wording.',
    ],
  },
};

const defaultWorkPlan: WorkPlanItem[] = [
  { id: 'wp-neutralize-yellow-cast', category: 'lighting', label: 'Neutralize yellow cast', enabled: true, source: 'deterministic' },
  { id: 'wp-preserve-white-ceiling', category: 'lighting', label: 'Preserve white ceiling and columns', enabled: true, source: 'deterministic' },
  { id: 'wp-stronger-oak-grain', category: 'materials', label: 'Stronger oak / wood grain', enabled: true, source: 'deterministic' },
  { id: 'wp-better-leather', category: 'materials', label: 'Better leather softness and subtle sheen', enabled: true, source: 'deterministic' },
  { id: 'wp-better-brass', category: 'materials', label: 'Better brushed brass reflections', enabled: true, source: 'deterministic' },
  { id: 'wp-hdr-editorial', category: 'photography', label: 'HDR editorial architectural finish', enabled: true, source: 'deterministic' },
  { id: 'wp-camera-locked', category: 'protection', label: 'Camera locked', enabled: true, source: 'deterministic' },
  { id: 'wp-logo-locked', category: 'protection', label: 'Logo/signage locked', enabled: true, source: 'deterministic' },
  { id: 'wp-furniture-locked', category: 'protection', label: 'Furniture positions locked', enabled: true, source: 'deterministic' },
  { id: 'wp-geometry-locked', category: 'protection', label: 'Geometry locked', enabled: true, source: 'deterministic' },
];

const defaultSiteContext: SiteContext = {
  photos: [],
  structuralColumns: '',
  floorMaterials: '',
  ceiling: '',
  skylight: '',
  ambientLighting: '',
  circulation: '',
  surroundingRetail: '',
  colorTemperature: '',
  mallAtmosphere: '',
  proportions: '',
  architecturalLanguage: '',
  analysisNotes: '',
  generatedAnalysisPrompt: '',
};

const defaultArchitectureContext: ArchitectureContext = {
  geometry: '',
  layout: '',
  furniture: '',
  materials: '',
  lightingFixtures: '',
  equipment: '',
  signage: '',
  logo: '',
  proportions: '',
  camera: '',
  composition: '',
  analysisNotes: '',
  generatedAnalysisPrompt: '',
};

const defaultBrandContext: BrandContext = {
  references: [],
  furniture: '',
  materials: '',
  mood: '',
  lighting: '',
  branding: '',
  previousProjects: '',
  brandDna: '',
  analysisNotes: '',
  generatedAnalysisPrompt: '',
};

const defaultProjectKnowledgeBase: ProjectKnowledgeBase = {
  summary: '',
  siteContextSummary: '',
  architectureContextSummary: '',
  brandContextSummary: '',
  protectedAssetsSummary: '',
};

const defaultQcReview: QcReviewState = {
  cameraPreserved: false,
  architecturePreserved: false,
  furniturePreserved: false,
  lightingFixturesPreserved: false,
  equipmentPreserved: false,
  materialsPreserved: false,
  columnsPreserved: false,
  noHallucination: false,
  photographicQuality: false,
  clientReady: false,
  notes: '',
  score: 0,
  revisionPrompt: '',
};

export const resultPreservationKeys: Array<keyof ResultQc> = [
  'cameraPreserved',
  'architecturePreserved',
  'geometryPreserved',
  'layoutPreserved',
  'furniturePreserved',
  'lightingFixturesPreserved',
  'equipmentPreserved',
  'logoSignagePreserved',
  'floorPatternPreserved',
  'materialZonesPreserved',
  'protectedAssetsPreserved',
];

export const resultImprovementKeys: Array<keyof ResultQc> = [
  'materialImproved',
  'lightingImproved',
  'environmentImproved',
  'photographicQualityImproved',
];

export const defaultResultQc: ResultQc = {
  cameraPreserved: null,
  architecturePreserved: null,
  geometryPreserved: null,
  layoutPreserved: null,
  furniturePreserved: null,
  lightingFixturesPreserved: null,
  equipmentPreserved: null,
  logoSignagePreserved: null,
  floorPatternPreserved: null,
  materialZonesPreserved: null,
  protectedAssetsPreserved: null,
  materialImproved: null,
  lightingImproved: null,
  environmentImproved: null,
  photographicQualityImproved: null,
  unwantedObjectsAdded: null,
  notes: '',
  deviationNotes: [],
  revisionPrompt: '',
  preservationScore: 0,
  photographicScore: 0,
  hallucinationRisk: 'medium',
  clientReadyScore: 0,
};

function makePass(type: RenderPassType, enabled = true): RenderPass {
  return {
    id: crypto.randomUUID(),
    type,
    enabled,
    title: renderPassLabels[type],
    objective: renderPassObjectives[type],
    prompt: '',
    status: 'not_started',
    promptVersions: [],
    activeVersionId: undefined,
    approvedVersionId: undefined,
  };
}

function makePromptVersion(pass: RenderPass, prompt: string, state: RenderPassBuilderState, now: string, source: RenderPromptVersion['source'] = 'generated'): RenderPromptVersion {
  const activeRuleIds = activeGenerationRules(state).map((rule) => rule.id);
  const currentMax = (pass.promptVersions || []).reduce((max, version) => Math.max(max, version.versionNumber || 0), 0);
  return {
    id: crypto.randomUUID(),
    passType: pass.type,
    versionNumber: currentMax + 1,
    title: `${pass.title} v${currentMax + 1}`,
    prompt,
    negativePrompt: buildRenderPassNegativePrompt(state, pass.type),
    adapter: state.selectedModelAdapter || 'generic',
    status: source === 'manual_edit' ? 'draft' : 'generated',
    createdAt: now,
    updatedAt: now,
    source,
    notes: activeRuleIds.length ? `Active rule IDs: ${activeRuleIds.join(', ')}` : '',
  };
}

function migratePassPromptVersions(pass: RenderPass, state: RenderPassBuilderState): RenderPass {
  const versions = (pass.promptVersions || []).filter(Boolean);
  if (!versions.length && pass.prompt?.trim()) {
    const now = pass.updatedAt || state.updatedAt || state.generatedAt || new Date().toISOString();
    const migrated: RenderPromptVersion = {
      id: crypto.randomUUID(),
      passType: pass.type,
      versionNumber: 1,
      title: `${pass.title} v1`,
      prompt: pass.prompt,
      negativePrompt: buildRenderPassNegativePrompt(state, pass.type),
      adapter: state.selectedModelAdapter || 'generic',
      status: pass.status === 'approved' ? 'approved' : 'generated',
      createdAt: now,
      updatedAt: now,
      source: 'generated',
      notes: 'Migrated from legacy pass prompt.',
    };
    return {
      ...pass,
      promptVersions: [migrated],
      activeVersionId: migrated.id,
      approvedVersionId: migrated.status === 'approved' ? migrated.id : pass.approvedVersionId,
    };
  }
  const activeExists = versions.some((version) => version.id === pass.activeVersionId);
  const approvedExists = versions.some((version) => version.id === pass.approvedVersionId);
  const active = activeExists ? pass.activeVersionId : versions[versions.length - 1]?.id;
  return {
    ...pass,
    promptVersions: versions,
    activeVersionId: active,
    approvedVersionId: approvedExists ? pass.approvedVersionId : undefined,
    prompt: versions.find((version) => version.id === active)?.prompt || pass.prompt || '',
  };
}

export function defaultRenderPassBuilderState(): RenderPassBuilderState {
  return {
    workflowPhase: 'site_analysis',
    sceneSetup: { ...defaultSceneSetup },
    siteContext: { ...defaultSiteContext },
    architectureContext: { ...defaultArchitectureContext },
    brandContext: { ...defaultBrandContext },
    productionContext: {
      project: { summary: '', notes: '', confidence: 60 },
      materials: { summary: '', notes: '', confidence: 0 },
      lighting: { summary: '', notes: '', confidence: 0 },
      furniture: { summary: '', notes: '', confidence: 0 },
      equipment: { summary: '', notes: '', confidence: 0 },
    },
    references: [],
    referenceDirection: defaultReferenceDirectionState(),
    generalProduction: undefined,
    knowledgeConfidence: { ...defaultKnowledgeConfidence },
    cameraSystem: { ...defaultCameraSystem },
    lightingGraph: { ...defaultLightingGraph },
    materialProfiles: { ...defaultMaterialProfiles },
    visualDirectionPreset: 'opening_day',
    environmentLibraryPreset: 'premium_mall',
    projectKnowledgeBase: { ...defaultProjectKnowledgeBase },
    designLock: { ...defaultDesignLock },
    protectedAssets: [
      { id: crypto.randomUUID(), name: 'Karun Logo', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Brass Canopy', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Globe Lamp', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Digital Menu', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Tea Slush Machine', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Curved Bench', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Checkerboard Floor', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Structural Columns', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Counter Geometry', locked: true, status: 'locked' },
      { id: crypto.randomUUID(), name: 'Floor Tables', locked: true, status: 'editable' },
    ],
    visualDirectionMode: 'opening_day',
    lightingMode: 'soft_diffused_daylight',
    environmentMode: 'premium_mall_atrium',
    materialEnhancementLevel: 'premium',
    materialTargets: { ...defaultMaterialTargets },
    peopleActivityLayer: 'none',
    passes: (Object.keys(renderPassLabels) as RenderPassType[]).map((type) => makePass(type, true)),
    selectedPassType: 'material_enhancement',
    negativePrompt: '',
    qcReview: { ...defaultQcReview },
    revisionCategories: { ...defaultRevisionCategories },
    projectMemory: [],
    promptVersions: [],
    activePromptVersionId: undefined,
    selectedModelAdapter: 'generic',
    promptVerbosity: 'standard',
    includeInternalDiagnostics: false,
    aiComposer: {
      model: 'gemini-2.5-flash',
      references: [],
      lastResponse: undefined,
      lastRawResponse: undefined,
      lastError: undefined,
      history: [],
      appliedAt: undefined,
    },
    renderPassInputs: [],
    activeObjectIdInputId: undefined,
    activeMaterialIdInputId: undefined,
    activeDepthInputId: undefined,
    quickGenerateGoals: ['better_materials', 'photographic_finish'],
    quickGenerateProvider: 'mock_local',
    quickGenerateMode: 'draft',
    quickPromptPresets: {
      lighting: ['neutral_mall_lighting'],
      material: ['material_detail_boost', 'natural_wood_grain', 'brass_reflection_control'],
      protection: ['no_global_yellow_cast', 'preserve_ceiling_white', 'preserve_white_balance', 'preserve_camera', 'preserve_architecture', 'preserve_furniture', 'preserve_signage'],
      photography: ['architectural_editorial', 'natural_contrast', 'premium_commercial_photography', 'real_camera_micro_details'],
    },
    quickGenerateUsage: [],
    quickGenerateCreditTHB: 400,
    conversationTimeline: [],
    autoGenerateAfterConfirmation: false,
    googleLiteCostPerImageTHB: 1.2,
    googleProCostPerImageTHB: 4.8,
    googleLiteDebug: {},
    sceneIntelligence: {
      ...defaultSceneIntelligence,
      sceneGraph: {
        ...defaultSceneIntelligence.sceneGraph,
        keyArchitecturalElements: [...defaultSceneIntelligence.sceneGraph.keyArchitecturalElements],
        protectedElements: [...defaultSceneIntelligence.sceneGraph.protectedElements],
        visibleMaterials: [...defaultSceneIntelligence.sceneGraph.visibleMaterials],
        visibleLightingConditions: [...defaultSceneIntelligence.sceneGraph.visibleLightingConditions],
        likelyRenderWeaknesses: [...defaultSceneIntelligence.sceneGraph.likelyRenderWeaknesses],
      },
      lightingIntelligence: { ...defaultSceneIntelligence.lightingIntelligence, rules: [...defaultSceneIntelligence.lightingIntelligence.rules] },
      environmentIntelligence: { ...defaultSceneIntelligence.environmentIntelligence, rules: [...defaultSceneIntelligence.environmentIntelligence.rules] },
      protectionIntelligence: { ...defaultSceneIntelligence.protectionIntelligence, priorities: defaultSceneIntelligence.protectionIntelligence.priorities.map((item) => ({ ...item, items: [...item.items] })) },
      photographyIntelligence: { ...defaultSceneIntelligence.photographyIntelligence, rules: [...defaultSceneIntelligence.photographyIntelligence.rules] },
    },
    materialIntelligence: { ...defaultMaterialIntelligence, zones: defaultMaterialIntelligence.zones.map((zone) => ({ ...zone })) },
    sceneHash: undefined,
    visionTimestamp: undefined,
    visionModel: undefined,
    analysisCostTHB: 0,
    analysisSource: 'deterministic',
    workPlan: defaultWorkPlan.map((item) => ({ ...item })),
    approvedWorkPlan: false,
    revisionHistory: [],
    generationRules: [],
    customRuleNote: '',
    rulesSceneHash: undefined,
    rulesVisionTimestamp: undefined,
    localTelemetry: [],
    resultRounds: [],
    activeResultRoundId: undefined,
    diffFromVersionId: undefined,
    diffToVersionId: undefined,
    visualDiff: { ...defaultVisualDiff },
    generatedAt: undefined,
    updatedAt: undefined,
  };
}

export function normalizeRenderPassBuilderState(input?: Partial<RenderPassBuilderState>): RenderPassBuilderState {
  const defaults = defaultRenderPassBuilderState();
  const existingPasses = input?.passes || [];
  const passes = defaults.passes.map((defaultPass) => {
    const existing = existingPasses.find((pass) => pass.type === defaultPass.type);
    return existing ? migratePassPromptVersions({ ...defaultPass, ...existing, id: existing.id || defaultPass.id }, { ...defaults, ...(input || {}) } as RenderPassBuilderState) : defaultPass;
  });
  return {
    ...defaults,
    ...(input || {}),
    workflowPhase: input?.workflowPhase || defaults.workflowPhase,
    sceneSetup: { ...defaults.sceneSetup, ...(input?.sceneSetup || {}) },
    siteContext: { ...defaults.siteContext, ...(input?.siteContext || {}) },
    architectureContext: { ...defaults.architectureContext, ...(input?.architectureContext || {}) },
    brandContext: { ...defaults.brandContext, ...(input?.brandContext || {}) },
    productionContext: {
      project: { ...defaults.productionContext.project, ...(input?.productionContext?.project || {}) },
      materials: { ...defaults.productionContext.materials, ...(input?.productionContext?.materials || {}) },
      lighting: { ...defaults.productionContext.lighting, ...(input?.productionContext?.lighting || {}) },
      furniture: { ...defaults.productionContext.furniture, ...(input?.productionContext?.furniture || {}) },
      equipment: { ...defaults.productionContext.equipment, ...(input?.productionContext?.equipment || {}) },
    },
    references: input?.references || defaults.references,
    referenceDirection: normalizeReferenceDirectionState(input?.referenceDirection),
    generalProduction: input?.generalProduction,
    knowledgeConfidence: { ...defaults.knowledgeConfidence, ...(input?.knowledgeConfidence || {}) },
    cameraSystem: { ...defaults.cameraSystem, ...(input?.cameraSystem || {}) },
    lightingGraph: { ...defaults.lightingGraph, ...(input?.lightingGraph || {}) },
    materialProfiles: { ...defaults.materialProfiles, ...(input?.materialProfiles || {}) },
    visualDirectionPreset: input?.visualDirectionPreset || defaults.visualDirectionPreset,
    environmentLibraryPreset: input?.environmentLibraryPreset || defaults.environmentLibraryPreset,
    projectKnowledgeBase: { ...defaults.projectKnowledgeBase, ...(input?.projectKnowledgeBase || {}) },
    designLock: { ...defaults.designLock, ...(input?.designLock || {}) },
    materialTargets: { ...defaults.materialTargets, ...(input?.materialTargets || {}) },
    protectedAssets: input?.protectedAssets || defaults.protectedAssets,
    qcReview: { ...defaults.qcReview, ...(input?.qcReview || {}) },
    revisionCategories: { ...defaults.revisionCategories, ...(input?.revisionCategories || {}) },
    projectMemory: input?.projectMemory || defaults.projectMemory,
    promptVersions: input?.promptVersions || defaults.promptVersions,
    activePromptVersionId: input?.activePromptVersionId,
    selectedModelAdapter: input?.selectedModelAdapter || defaults.selectedModelAdapter,
    promptVerbosity: input?.promptVerbosity || defaults.promptVerbosity,
    includeInternalDiagnostics: Boolean(input?.includeInternalDiagnostics),
    aiComposer: {
      ...defaults.aiComposer,
      ...(input?.aiComposer || {}),
      references: input?.aiComposer?.references || defaults.aiComposer.references,
      history: input?.aiComposer?.history || defaults.aiComposer.history,
    },
    renderPassInputs: input?.renderPassInputs || defaults.renderPassInputs,
    activeObjectIdInputId: input?.activeObjectIdInputId,
    activeMaterialIdInputId: input?.activeMaterialIdInputId,
    activeDepthInputId: input?.activeDepthInputId,
    quickGenerateGoals: input?.quickGenerateGoals || defaults.quickGenerateGoals,
    quickGenerateProvider: input?.quickGenerateProvider || defaults.quickGenerateProvider,
    quickGenerateMode: input?.quickGenerateMode || defaults.quickGenerateMode,
    quickPromptPresets: {
      ...defaults.quickPromptPresets,
      ...(input?.quickPromptPresets || {}),
    },
    quickGenerateUsage: input?.quickGenerateUsage || defaults.quickGenerateUsage,
    quickGenerateCreditTHB: typeof input?.quickGenerateCreditTHB === 'number' ? input.quickGenerateCreditTHB : defaults.quickGenerateCreditTHB,
    conversationTimeline: input?.conversationTimeline || defaults.conversationTimeline || [],
    autoGenerateAfterConfirmation: Boolean(input?.autoGenerateAfterConfirmation),
    googleLiteCostPerImageTHB: typeof input?.googleLiteCostPerImageTHB === 'number' ? input.googleLiteCostPerImageTHB : defaults.googleLiteCostPerImageTHB,
    googleProCostPerImageTHB: typeof input?.googleProCostPerImageTHB === 'number' ? input.googleProCostPerImageTHB : defaults.googleProCostPerImageTHB,
    googleLiteDebug: input?.googleLiteDebug || defaults.googleLiteDebug,
    sceneIntelligence: {
      ...defaults.sceneIntelligence,
      ...(input?.sceneIntelligence || {}),
      sceneGraph: {
        ...defaults.sceneIntelligence?.sceneGraph,
        ...(input?.sceneIntelligence?.sceneGraph || {}),
        keyArchitecturalElements: input?.sceneIntelligence?.sceneGraph?.keyArchitecturalElements || defaults.sceneIntelligence?.sceneGraph.keyArchitecturalElements || [],
        protectedElements: input?.sceneIntelligence?.sceneGraph?.protectedElements || defaults.sceneIntelligence?.sceneGraph.protectedElements || [],
        visibleMaterials: input?.sceneIntelligence?.sceneGraph?.visibleMaterials || defaults.sceneIntelligence?.sceneGraph.visibleMaterials || [],
        visibleLightingConditions: input?.sceneIntelligence?.sceneGraph?.visibleLightingConditions || defaults.sceneIntelligence?.sceneGraph.visibleLightingConditions || [],
        likelyRenderWeaknesses: input?.sceneIntelligence?.sceneGraph?.likelyRenderWeaknesses || defaults.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses || [],
      },
      lightingIntelligence: {
        ...defaults.sceneIntelligence?.lightingIntelligence,
        ...(input?.sceneIntelligence?.lightingIntelligence || {}),
        rules: input?.sceneIntelligence?.lightingIntelligence?.rules || defaults.sceneIntelligence?.lightingIntelligence.rules || [],
      },
      environmentIntelligence: {
        ...defaults.sceneIntelligence?.environmentIntelligence,
        ...(input?.sceneIntelligence?.environmentIntelligence || {}),
        rules: input?.sceneIntelligence?.environmentIntelligence?.rules || defaults.sceneIntelligence?.environmentIntelligence.rules || [],
      },
      protectionIntelligence: {
        ...defaults.sceneIntelligence?.protectionIntelligence,
        ...(input?.sceneIntelligence?.protectionIntelligence || {}),
        priorities: input?.sceneIntelligence?.protectionIntelligence?.priorities || defaults.sceneIntelligence?.protectionIntelligence.priorities || [],
      },
      photographyIntelligence: {
        ...defaults.sceneIntelligence?.photographyIntelligence,
        ...(input?.sceneIntelligence?.photographyIntelligence || {}),
        rules: input?.sceneIntelligence?.photographyIntelligence?.rules || defaults.sceneIntelligence?.photographyIntelligence.rules || [],
      },
    },
    materialIntelligence: {
      ...defaults.materialIntelligence,
      ...(input?.materialIntelligence || {}),
      zones: input?.materialIntelligence?.zones?.length ? input.materialIntelligence.zones : defaults.materialIntelligence?.zones || [],
    },
    sceneHash: input?.sceneHash,
    visionTimestamp: input?.visionTimestamp,
    visionModel: input?.visionModel,
    analysisCostTHB: typeof input?.analysisCostTHB === 'number' ? input.analysisCostTHB : defaults.analysisCostTHB,
    analysisSource: input?.analysisSource || defaults.analysisSource,
    workPlan: input?.workPlan?.length ? input.workPlan : defaults.workPlan,
    approvedWorkPlan: Boolean(input?.approvedWorkPlan),
    revisionHistory: input?.revisionHistory || defaults.revisionHistory,
    generationRules: (input?.generationRules || defaults.generationRules || []).map((rule) => ({
      ...rule,
      confidence: typeof rule.confidence === 'number' ? rule.confidence : 70,
      defaultEnabled: Boolean(rule.defaultEnabled),
      enabled: Boolean(rule.enabled),
    })),
    customRuleNote: input?.customRuleNote || '',
    rulesSceneHash: input?.rulesSceneHash,
    rulesVisionTimestamp: input?.rulesVisionTimestamp,
    localTelemetry: input?.localTelemetry || defaults.localTelemetry || [],
    resultRounds: (input?.resultRounds || defaults.resultRounds).map((round) => ({
      ...round,
      qc: round.qc ? calculateResultQc({ ...defaultResultQc, ...round.qc }) : calculateResultQc(defaultResultQc),
    })),
    activeResultRoundId: input?.activeResultRoundId,
    diffFromVersionId: input?.diffFromVersionId,
    diffToVersionId: input?.diffToVersionId,
    visualDiff: { ...defaults.visualDiff, ...(input?.visualDiff || {}) },
    passes,
  };
}

export function activeGenerationRules(state: RenderPassBuilderState) {
  return (state.generationRules || [])
    .filter((rule) => rule.enabled && !rule.stale)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.label.localeCompare(b.label));
}

export function activeGenerationRuleIds(state: RenderPassBuilderState) {
  return activeGenerationRules(state).map((rule) => rule.id);
}

export function generationRulesPromptText(state: RenderPassBuilderState) {
  const rules = activeGenerationRules(state);
  const lines = rules.map((rule) => `- [${rule.priority.toUpperCase()} / ${rule.category}] ${rule.promptInstruction}`);
  if (state.customRuleNote?.trim()) lines.push(`- [USER NOTE] ${state.customRuleNote.trim()}`);
  return lines.length ? lines.join('\n') : '';
}

export function generationRulesNegativeText(state: RenderPassBuilderState) {
  return activeGenerationRules(state)
    .map((rule) => rule.negativeInstruction)
    .filter(Boolean)
    .map((rule) => rule.trim())
    .filter(Boolean);
}

export function telemetrySummary(events: LocalTelemetryEvent[] = []) {
  const successes = events.filter((event) => event.status === 'success');
  const generations = events.filter((event) => event.eventType === 'generate_draft');
  const analyses = events.filter((event) => event.eventType === 'vision_analysis' || event.eventType === 'deterministic_analysis');
  const qc = events.filter((event) => event.eventType === 'review_qc');
  const approved = events.filter((event) => event.approved || event.eventType === 'approve');
  const totalEstimatedCost = events.reduce((sum, event) => sum + (event.estimatedCostTHB || 0), 0);
  const averageGenerationTime = generations.length ? Math.round(generations.reduce((sum, event) => sum + (event.durationMs || 0), 0) / generations.length) : 0;
  const averageQcScore = qc.length ? Math.round(qc.reduce((sum, event) => sum + (event.readyScore || 0), 0) / qc.length) : 0;
  const cacheEvents = events.filter((event) => event.eventType === 'vision_analysis');
  const cacheHits = cacheEvents.filter((event) => event.cacheHit).length;
  return {
    totalEvents: events.length,
    totalAttempts: generations.length,
    totalAnalyses: analyses.length,
    totalEstimatedCostTHB: Number(totalEstimatedCost.toFixed(2)),
    providersUsed: Array.from(new Set(events.map((event) => event.provider).filter(Boolean))),
    approvedResultCount: approved.length,
    averageGenerationTimeMs: averageGenerationTime,
    averageQcScore,
    successRate: events.length ? Math.round((successes.length / events.length) * 100) : 0,
    cacheHitRate: cacheEvents.length ? Math.round((cacheHits / cacheEvents.length) * 100) : 0,
    costPerApprovedImageTHB: approved.length ? Number((totalEstimatedCost / approved.length).toFixed(2)) : 0,
  };
}

export function summarizeByProvider(events: LocalTelemetryEvent[] = []) {
  return events.reduce<Record<string, ReturnType<typeof telemetrySummary>>>((acc, event) => {
    const key = event.provider || 'unknown';
    acc[key] = telemetrySummary(events.filter((item) => (item.provider || 'unknown') === key));
    return acc;
  }, {});
}

export function summarizeByModel(events: LocalTelemetryEvent[] = []) {
  return events.reduce<Record<string, ReturnType<typeof telemetrySummary>>>((acc, event) => {
    const key = event.model || 'unknown';
    acc[key] = telemetrySummary(events.filter((item) => (item.model || 'unknown') === key));
    return acc;
  }, {});
}

export function summarizeBySceneType(events: LocalTelemetryEvent[] = []) {
  return events.reduce<Record<string, number>>((acc, event) => {
    const key = event.detectedSceneType || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function summarizeByMaterialIssue(events: LocalTelemetryEvent[] = []) {
  return events.reduce<Record<string, number>>((acc, event) => {
    (event.detectedMaterials || []).forEach((item) => {
      acc[item] = (acc[item] || 0) + 1;
    });
    return acc;
  }, {});
}

export function summarizeCostByProject(events: LocalTelemetryEvent[] = []) {
  return { project: telemetrySummary(events).totalEstimatedCostTHB };
}

export function summarizeQualityByProvider(events: LocalTelemetryEvent[] = []) {
  return Object.fromEntries(Object.entries(summarizeByProvider(events)).map(([provider, summary]) => [provider, summary.averageQcScore]));
}

export function calculateCostPerApprovedImage(events: LocalTelemetryEvent[] = []) {
  return telemetrySummary(events).costPerApprovedImageTHB;
}

function labelFor<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label || value;
}

function enabledRenderPassInputs(state: RenderPassBuilderState) {
  return (state.renderPassInputs || []).filter((input) => input.enabled);
}

export function activeRenderPassInputSummary(state: RenderPassBuilderState) {
  const inputs = enabledRenderPassInputs(state);
  const objectId = inputs.find((input) => input.type === 'object_id' && (!state.activeObjectIdInputId || input.id === state.activeObjectIdInputId));
  const materialId = inputs.find((input) => input.type === 'material_id' && (!state.activeMaterialIdInputId || input.id === state.activeMaterialIdInputId));
  const depth = inputs.find((input) => input.type === 'depth' && (!state.activeDepthInputId || input.id === state.activeDepthInputId));
  return { inputs, objectId, materialId, depth };
}

export function renderPassReferencesText(state: RenderPassBuilderState) {
  const { objectId, materialId, depth } = activeRenderPassInputSummary(state);
  if (!objectId && !materialId && !depth) return '';
  return [
    'RENDER PASS REFERENCES',
    'The base render is the source of truth.',
    objectId ? `Object ID Pass available: ${objectId.name}. Use it only as a color-coded object segmentation guide for protected object boundaries, object groups, counts, positions, and preservation priorities. Do not treat Object ID colors as final appearance or design colors.` : '',
    materialId ? `Material ID Pass available: ${materialId.name}. Use it only as a material zone guide. Do not copy its flat colors into the final image.` : '',
    depth ? `Depth Pass available: ${depth.name}. Use it only for foreground, midground, background, atmospheric depth, and background falloff planning.` : '',
  ].filter(Boolean).join('\n');
}

function scoreTriState(values: ResultQcValue[]) {
  if (!values.length) return 0;
  const score = values.reduce((sum, value) => sum + (value === true ? 1 : value === null ? 0.5 : 0), 0);
  return Math.round((score / values.length) * 100);
}

export function calculateResultQc(qc: ResultQc): ResultQc {
  const preservationValues = resultPreservationKeys.map((key) => qc[key] as ResultQcValue);
  const improvementValues = resultImprovementKeys.map((key) => qc[key] as ResultQcValue);
  const preservationScore = scoreTriState(preservationValues);
  const photographicScore = scoreTriState(improvementValues);
  const criticalFailed = [
    qc.cameraPreserved,
    qc.architecturePreserved,
    qc.geometryPreserved,
    qc.layoutPreserved,
    qc.protectedAssetsPreserved,
  ].some((value) => value === false);
  const unsureCount = [...preservationValues, ...improvementValues].filter((value) => value === null).length;
  const hallucinationRisk = criticalFailed ? 'high' : qc.unwantedObjectsAdded === true || unsureCount >= 5 ? 'medium' : 'low';
  const noUnwantedScore = qc.unwantedObjectsAdded === false ? 100 : qc.unwantedObjectsAdded === true ? 0 : 50;
  const clientReadyScore = Math.round((preservationScore * 0.6) + (photographicScore * 0.3) + (noUnwantedScore * 0.1));
  return { ...qc, preservationScore, photographicScore, hallucinationRisk, clientReadyScore };
}

function humanizeResultQcKey(key: string) {
  return key
    .replace(/Preserved|Improved/g, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function buildResultRevisionPrompt(state: RenderPassBuilderState, result?: ResultRound | null, sourceOfTruth?: ProjectSourceOfTruth) {
  const qc = result?.qc ? calculateResultQc({ ...defaultResultQc, ...result.qc }) : calculateResultQc(defaultResultQc);
  const failedPreservation = resultPreservationKeys.filter((key) => qc[key] === false).map((key) => humanizeResultQcKey(String(key)));
  const unsurePreservation = resultPreservationKeys.filter((key) => qc[key] === null).map((key) => humanizeResultQcKey(String(key)));
  const improvements = resultImprovementKeys.filter((key) => qc[key] === true).map((key) => humanizeResultQcKey(String(key)));
  const protectedAssets = state.protectedAssets.filter((asset) => asset.locked || asset.status === 'locked').map((asset) => asset.name).filter(Boolean);
  const materialRules = materialRulePromptLines(sourceOfTruth);
  return [
    'REVISION PROMPT - RESULT QC / OVERLAY REVIEW',
    '',
    'Edit the AI result image while restoring the approved base render design wherever the result drifted.',
    'Use the base render as the source of truth.',
    'Keep useful improvements from the previous AI result only where they do not conflict with the base render.',
    'Do not redesign, reinterpret, or change the architecture.',
    'Do not change camera, composition, geometry, layout, furniture placement, lighting fixtures, equipment, logo/signage, floor pattern, material zones, or protected assets.',
    '',
    failedPreservation.length ? `Restore these failed preservation items exactly from the base render: ${failedPreservation.join(', ')}.` : 'No failed preservation items were marked, but preserve all locked architecture and protected assets exactly.',
    unsurePreservation.length ? `Pay extra attention to these unsure items: ${unsurePreservation.join(', ')}.` : '',
    improvements.length ? `Preserve these successful improvements where safe: ${improvements.join(', ')}.` : '',
    qc.unwantedObjectsAdded === true ? 'Remove any unwanted or hallucinated objects added by the previous result.' : 'Do not add new objects.',
    activeRenderPassInputSummary(state).objectId ? 'Use the Object ID Pass as a segmentation guide to restore protected object boundaries, counts, positions, and shapes.' : '',
    activeRenderPassInputSummary(state).materialId ? 'Use the Material ID Pass as a guide to restore material zones without copying its flat colors.' : '',
    protectedAssets.length ? `Protected assets to preserve: ${protectedAssets.join(', ')}.` : '',
    '',
    'Project material source of truth:',
    ...(materialRules.length ? materialRules : ['No project-specific material source-of-truth rules are active.']),
    'Scoped color-cast correction:',
    scopedColorCastCorrectionLine(sourceOfTruth),
    qc.deviationNotes.length ? `Correct only these listed deviations:\n${qc.deviationNotes.map((note) => `- ${note}`).join('\n')}` : 'Correct only visible deviations from the base render.',
    qc.notes ? `QC notes:\n${qc.notes}` : '',
    materialRuleNegativeLines(sourceOfTruth).length ? `Protected material drift to avoid:\n${materialRuleNegativeLines(sourceOfTruth).map((line) => `- ${line}`).join('\n')}` : '',
    '',
    'Output should be client-ready architectural visualization with preserved design intent and corrected deviations only.',
  ].filter(Boolean).join('\n');
}

function activeLocks(lock: DesignLock) {
  const rows = [
    ['Camera', lock.lockCamera],
    ['Architecture', lock.lockArchitecture],
    ['Geometry', lock.lockGeometry],
    ['Furniture', lock.lockFurniture],
    ['Equipment', lock.lockEquipment],
    ['Lighting fixtures', lock.lockLightingFixtures],
    ['Materials', lock.lockMaterials],
    ['Floor pattern', lock.lockFloorPattern],
    ['Logo/signage', lock.lockLogoSignage],
    ['Columns', lock.lockColumns],
    ['Composition', lock.lockComposition],
  ];
  return rows.filter(([, enabled]) => enabled).map(([label]) => String(label));
}

function normalizeProtectedAssetName(name: string) {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s/.-]/g, '')
    .replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    'globe lamp': 'globe lamps',
    'globe lamps': 'globe lamps',
    'digital menu': 'digital menu totem',
    'digital menu totem': 'digital menu totem',
    'checkerboard floor': 'checkerboard floor pattern',
    'floor pattern': 'checkerboard floor pattern',
    'checkerboard floor pattern': 'checkerboard floor pattern',
    'tea slush machine': 'thai tea slush machine',
    'thai tea slush machine': 'thai tea slush machine',
    'counter geometry': 'curved counter geometry',
    'curved counter geometry': 'curved counter geometry',
    'main counter': 'curved counter geometry',
  };
  if (aliases[cleaned]) return aliases[cleaned];
  return cleaned.split(' ').map((part) => (part.length > 3 && part.endsWith('s') ? part.slice(0, -1) : part)).join(' ');
}

function dedupeProtectedAssets(assets: ProtectedDesignAsset[]) {
  const byName = new Map<string, ProtectedDesignAsset>();
  assets.filter((asset) => asset.name.trim()).forEach((asset) => {
    const key = normalizeProtectedAssetName(asset.name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, asset);
      return;
    }
    const existingLocked = existing.locked || existing.status === 'locked';
    const assetLocked = asset.locked || asset.status === 'locked';
    if (!existingLocked && assetLocked) byName.set(key, asset);
  });
  return Array.from(byName.values());
}

function protectedAssetsText(assets: ProtectedDesignAsset[]) {
  const locked = dedupeProtectedAssets(assets).filter((asset) => asset.name.trim() && (asset.locked || asset.status === 'locked'));
  if (!locked.length) return 'No protected design assets registered.';
  return locked.map((asset) => `* ${asset.name}${asset.description ? ` - ${asset.description}` : ''}`).join('\n');
}

function editableAssetsText(assets: ProtectedDesignAsset[]) {
  const editable = dedupeProtectedAssets(assets).filter((asset) => asset.name.trim() && !(asset.locked || asset.status === 'locked'));
  if (!editable.length) return '';
  return editable.map((asset) => `* ${asset.name} [editable context]`).join('\n');
}

function compactRows(rows: Array<[string, string]>) {
  const filled = rows.filter(([, value]) => value?.trim());
  if (!filled.length) return 'Not analyzed yet.';
  return filled.map(([label, value]) => `${label}: ${value.trim()}`).join('\n');
}

export function buildSiteAnalysisPrompt(state: RenderPassBuilderState) {
  return [
    'SITE ANALYSIS ONLY - NO IMAGE GENERATION',
    '',
    'Study the uploaded real site photographs. Do not generate an image. Do not redesign anything.',
    '',
    'Extract and describe:',
    '- structural columns',
    '- floor materials',
    '- ceiling',
    '- skylight',
    '- ambient lighting',
    '- circulation',
    '- surrounding retail',
    '- color temperature',
    '- mall atmosphere',
    '- proportions',
    '- architectural language',
    '',
    `Project: ${state.sceneSetup.projectName}`,
    `Location: ${state.sceneSetup.location}`,
    '',
    'Return structured Site Context JSON and a concise written summary.',
  ].join('\n');
}

export function buildArchitectureAnalysisPrompt(state: RenderPassBuilderState) {
  return [
    'ARCHITECTURE ANALYSIS ONLY - NO IMAGE GENERATION',
    '',
    'Study the uploaded base render as the source of truth. Do not generate an image. Do not redesign anything.',
    '',
    'Extract and describe:',
    '- geometry',
    '- layout',
    '- furniture',
    '- materials',
    '- lighting fixtures',
    '- equipment',
    '- signage',
    '- logo',
    '- proportions',
    '- camera',
    '- composition',
    '',
    `Scene Type: ${state.sceneSetup.sceneType}`,
    `Camera Angle: ${state.sceneSetup.cameraAngle}`,
    '',
    'Return structured Architecture Context JSON and list every protected asset that must not change.',
  ].join('\n');
}

export function buildBrandAnalysisPrompt(state: RenderPassBuilderState) {
  return [
    'BRAND ANALYSIS ONLY - NO IMAGE GENERATION',
    '',
    'Study the optional brand/material/furniture/mood references. Do not generate an image.',
    '',
    'Extract Brand DNA:',
    '- furniture language',
    '- material palette',
    '- mood',
    '- lighting character',
    '- branding cues',
    '- previous project design logic',
    '',
    `Brand: ${state.sceneSetup.brand}`,
    '',
    'Return structured Brand Context JSON and a concise Brand DNA summary.',
  ].join('\n');
}

export function mergeProjectKnowledgeBase(state: RenderPassBuilderState): ProjectKnowledgeBase {
  const site = compactRows([
    ['Structural columns', state.siteContext.structuralColumns],
    ['Floor materials', state.siteContext.floorMaterials],
    ['Ceiling', state.siteContext.ceiling],
    ['Skylight', state.siteContext.skylight],
    ['Ambient lighting', state.siteContext.ambientLighting],
    ['Circulation', state.siteContext.circulation],
    ['Surrounding retail', state.siteContext.surroundingRetail],
    ['Color temperature', state.siteContext.colorTemperature],
    ['Mall atmosphere', state.siteContext.mallAtmosphere],
    ['Proportions', state.siteContext.proportions],
    ['Architectural language', state.siteContext.architecturalLanguage],
    ['Notes', state.siteContext.analysisNotes],
  ]);
  const architecture = compactRows([
    ['Geometry', state.architectureContext.geometry],
    ['Layout', state.architectureContext.layout],
    ['Furniture', state.architectureContext.furniture],
    ['Materials', state.architectureContext.materials],
    ['Lighting fixtures', state.architectureContext.lightingFixtures],
    ['Equipment', state.architectureContext.equipment],
    ['Signage', state.architectureContext.signage],
    ['Logo', state.architectureContext.logo],
    ['Proportions', state.architectureContext.proportions],
    ['Camera', state.architectureContext.camera],
    ['Composition', state.architectureContext.composition],
    ['Notes', state.architectureContext.analysisNotes],
  ]);
  const brand = compactRows([
    ['Furniture', state.brandContext.furniture],
    ['Materials', state.brandContext.materials],
    ['Mood', state.brandContext.mood],
    ['Lighting', state.brandContext.lighting],
    ['Branding', state.brandContext.branding],
    ['Previous projects', state.brandContext.previousProjects],
    ['Brand DNA', state.brandContext.brandDna],
    ['Notes', state.brandContext.analysisNotes],
  ]);
  const production = compactRows([
    ['Project', state.productionContext.project.summary || state.productionContext.project.notes],
    ['Materials', state.productionContext.materials.summary || state.productionContext.materials.notes],
    ['Lighting', state.productionContext.lighting.summary || state.productionContext.lighting.notes],
    ['Furniture', state.productionContext.furniture.summary || state.productionContext.furniture.notes],
    ['Equipment', state.productionContext.equipment.summary || state.productionContext.equipment.notes],
    ['Camera', `${state.cameraSystem.view}, ${state.cameraSystem.lens}mm, ${state.cameraSystem.height}, ${state.cameraSystem.perspective}`],
  ]);
  const protectedAssets = protectedAssetsText(state.protectedAssets);
  return {
    siteContextSummary: site,
    architectureContextSummary: architecture,
    brandContextSummary: brand,
    materialsContextSummary: state.productionContext.materials.summary,
    lightingContextSummary: state.productionContext.lighting.summary,
    furnitureContextSummary: state.productionContext.furniture.summary,
    equipmentContextSummary: state.productionContext.equipment.summary,
    cameraContextSummary: `${state.cameraSystem.view}, ${state.cameraSystem.lens}mm, ${state.cameraSystem.height}, ${state.cameraSystem.perspective}`,
    protectedAssetsSummary: protectedAssets,
    summary: [
      'PROJECT KNOWLEDGE BASE',
      '',
      'Site Context',
      site,
      '',
      'Architecture Context',
      architecture,
      '',
      'Brand Context',
      brand,
      '',
      'Production Context',
      production,
      '',
      'Protected Assets',
      protectedAssets,
    ].join('\n'),
    lockedAt: new Date().toISOString(),
  };
}

export function deriveProtectedAssetsFromArchitecture(state: RenderPassBuilderState): ProtectedDesignAsset[] {
  const candidates = [
    ['Camera', state.architectureContext.camera],
    ['Geometry', state.architectureContext.geometry],
    ['Layout / furniture', state.architectureContext.layout || state.architectureContext.furniture],
    ['Lighting fixtures', state.architectureContext.lightingFixtures],
    ['Equipment', state.architectureContext.equipment],
    ['Signage', state.architectureContext.signage],
    ['Logo', state.architectureContext.logo],
    ['Materials', state.architectureContext.materials],
    ['Composition', state.architectureContext.composition],
    ['Columns', state.siteContext.structuralColumns],
  ];
  const existing = state.protectedAssets.filter((asset) => asset.name.trim());
  const generated = candidates
    .filter(([, description]) => description?.trim())
    .map(([name, description]) => ({ id: crypto.randomUUID(), name, description, locked: true, status: 'locked' as const }));
  const byName = new Map<string, ProtectedDesignAsset>();
  [...existing, ...generated].forEach((asset) => {
    if (!byName.has(asset.name.toLowerCase())) byName.set(asset.name.toLowerCase(), asset);
  });
  return Array.from(byName.values());
}

export function calculateQcScore(qc: QcReviewState) {
  const keys: Array<keyof Omit<QcReviewState, 'notes' | 'score' | 'revisionPrompt' | 'updatedAt'>> = [
    'cameraPreserved',
    'architecturePreserved',
    'furniturePreserved',
    'lightingFixturesPreserved',
    'equipmentPreserved',
    'materialsPreserved',
    'columnsPreserved',
    'noHallucination',
    'photographicQuality',
    'clientReady',
  ];
  const passed = keys.filter((key) => qc[key]).length;
  return Math.round((passed / keys.length) * 100);
}

export function buildQcRevisionPrompt(state: RenderPassBuilderState, sourceOfTruth?: ProjectSourceOfTruth) {
  const qc = state.qcReview;
  const failed = [
    ['Camera preserved', qc.cameraPreserved],
    ['Architecture preserved', qc.architecturePreserved],
    ['Furniture preserved', qc.furniturePreserved],
    ['Lighting fixtures preserved', qc.lightingFixturesPreserved],
    ['Equipment preserved', qc.equipmentPreserved],
    ['Materials preserved', qc.materialsPreserved],
    ['Columns preserved', qc.columnsPreserved],
    ['No hallucination', qc.noHallucination],
    ['Photographic quality', qc.photographicQuality],
    ['Client ready', qc.clientReady],
  ].filter(([, passed]) => !passed).map(([label]) => `- Fix: ${label}`).join('\n');
  return [
    'REVISION PROMPT - ARCHITECTURE MUST REMAIN LOCKED',
    '',
    'Use the previous generated image only as a render pass result to correct.',
    'The original base render remains the source of truth.',
    '',
    'Keep what works:',
    '- Preserve camera, architecture, geometry, furniture, lighting fixtures, equipment, logo, materials, columns, and composition.',
    '',
    'Project material source of truth:',
    ...(materialRulePromptLines(sourceOfTruth).length ? materialRulePromptLines(sourceOfTruth) : ['No project-specific material rules are active.']),
    'Scoped color-cast correction:',
    scopedColorCastCorrectionLine(sourceOfTruth),
    materialRuleNegativeLines(sourceOfTruth).length ? `Protected material drift to avoid:\n${materialRuleNegativeLines(sourceOfTruth).map((line) => `- ${line}`).join('\n')}` : '',
    '',
    'Fix these QC issues:',
    failed || '- No failed checklist items selected. Improve only subtle photographic quality.',
    '',
    qc.notes ? `Reviewer notes: ${qc.notes}` : '',
    '',
    'Forbidden: redesign, changed camera, changed geometry, moved furniture, altered fixtures, invented equipment, changed logo/signage, hallucinated columns, CGI/plastic look.',
  ].filter(Boolean).join('\n');
}

function materialTargetsText(targets: MaterialEnhancementTargets) {
  const labels: Array<[keyof MaterialEnhancementTargets, string]> = [
    ['woodGrain', 'wood grain'],
    ['brassReflection', 'brass reflection'],
    ['leatherTexture', 'leather texture'],
    ['marbleDepth', 'marble depth'],
    ['glassReflection', 'glass reflection'],
    ['floorReflection', 'floor reflection'],
    ['microImperfections', 'micro imperfections'],
  ];
  const active = labels.filter(([key]) => targets[key]).map(([, label]) => label);
  return active.length ? active.join(', ') : 'none selected';
}

function materialProfileText(profiles: MaterialProfiles) {
  return Object.entries(profiles).map(([key, value]) => `${key}: ${value}/100`).join(', ');
}

function lightingGraphText(graph: LightingGraph) {
  return [
    `key light ${graph.keyLight}/100`,
    `fill light ${graph.fillLight}/100`,
    `ambient ${graph.ambient}/100`,
    `practical lights ${graph.practicalLights}/100`,
    `skylight ${graph.skylight}/100`,
    `background falloff ${graph.backgroundFalloff}/100`,
    `shadow density ${graph.shadowDensity}/100`,
    `reflection strength ${graph.reflectionStrength}/100`,
    graph.notes ? `notes: ${graph.notes}` : '',
  ].filter(Boolean).join(', ');
}

function buildMaterialNarrative(state: RenderPassBuilderState) {
  const targets = state.materialTargets;
  const level = labelFor(materialLevelOptions, state.materialEnhancementLevel).toLowerCase();
  const lines = [
    `Enhance the existing materials in a ${level === 'none' ? 'restrained' : level} but still believable photographic way.`,
  ];
  if (targets.woodGrain) lines.push('Make wood grain feel richer, more tactile, and more premium, with natural variation instead of flat CG texture.');
  if (targets.brassReflection) lines.push('Give brass trims and canopy controlled brushed-brass reflections with warm metallic depth, avoiding chrome-like gloss.');
  if (targets.leatherTexture) lines.push('Make leather surfaces feel softer and more realistic, with subtle natural sheen, gentle creasing, and depth rather than plastic smoothness.');
  if (targets.marbleDepth) lines.push('Improve marble or stone with surface depth, subtle veining, and tonal richness without inventing a new pattern.');
  if (targets.glassReflection) lines.push('Improve glass with realistic reflection and refraction behavior, not mirror-like unless already shown in the base render.');
  if (targets.floorReflection) lines.push('Improve floor realism with believable reflection falloff, subtle wear, and tonal variation while preserving the existing floor pattern.');
  if (targets.microImperfections) lines.push('Add restrained micro-imperfections and natural material variation; keep it premium, not dirty, aged, or redesigned.');
  lines.push('Do not change material types, color identity, patterns, material zones, or design intent.');
  return lines.join(' ');
}

function buildLightingNarrative(state: RenderPassBuilderState) {
  const mode = labelFor(lightingOptions, state.lightingMode).toLowerCase();
  const base = [
    `Improve light behavior toward ${mode}, with believable highlight rolloff and natural exposure balance.`,
    'Use controlled shadows that reveal geometry without flattening the scene.',
    'Let practical lights feel warm and real without over-yellowing the image.',
    'Balance exposure between foreground architecture and background context, with subtle atmospheric depth and natural lens response.',
    'Do not add or replace lighting fixtures, do not move lamps, and preserve existing fixture design and positions.',
  ];
  return base.join(' ');
}

function buildEnvironmentNarrative(state: RenderPassBuilderState) {
  const mode = state.environmentMode;
  const map: Record<string, string> = {
    existing_site: 'Keep the existing site context recognizable and believable, improving only clarity, depth, and photographic integration around the approved architecture.',
    premium_mall_atrium: 'Create a bright premium contemporary mall atmosphere with clean white architectural background, soft public-space depth, subtle reflections on polished surfaces, and believable background falloff.',
    fade_background: 'Let the surrounding context gently fade so the approved architecture remains dominant, with soft background depth and no hard cutout look.',
    dark_negative_space: 'Use restrained dark negative space to support a premium editorial mood without swallowing architectural detail or changing the design.',
    museum_void: 'Create a calm museum-like void with soft ambient depth, clean circulation space, and quiet focus on the architecture.',
    white_infinity: 'Use a clean white infinity-style context with soft shadow grounding and no sterile floating-object look.',
    editorial_studio_hall: 'Use a refined editorial studio hall atmosphere with controlled background depth and subtle architectural scale cues.',
  };
  return [
    map[mode] || 'Enhance the environment around the approved architecture in a restrained, realistic way.',
    'The surrounding context should support the kiosk without overpowering it.',
    'Architecture remains the hero.',
    'Do not alter kiosk, counter, canopy, furniture, fixtures, signage, logo, or protected assets.',
  ].join(' ');
}

function buildPeopleNarrative(state: RenderPassBuilderState) {
  const layer = labelFor(peopleLayerOptions, state.peopleActivityLayer).toLowerCase();
  if (state.peopleActivityLayer === 'none') return 'Do not add people in this pass.';
  return [
    `Add natural, secondary human presence appropriate to ${layer}.`,
    'People should support scale, retail atmosphere, and opening-day realism while architecture remains the hero.',
    'Subtle motion blur is allowed when selected, but people must not block key design assets, signage, counters, protected objects, or circulation.',
    'Do not move furniture, alter layout, or redesign the scene to accommodate people.',
  ].join(' ');
}

function buildPhotographicFinishNarrative(state: RenderPassBuilderState) {
  const visual = labelFor(visualDirectionPresetOptions, state.visualDirectionPreset);
  return [
    `Use the ${visual} direction to make the approved render read less like a raw render and more like a professional editorial architectural photograph.`,
    'Improve tonal balance, highlight rolloff, shadow softness, depth, lens realism, and controlled contrast.',
    'Reduce overly flat CG appearance while keeping color grading premium and restrained.',
    'Do not change physical design elements, material identity, camera, geometry, furniture, fixtures, signage, logo, or protected assets.',
  ].join(' ');
}

function visualIntentForPass(type: RenderPassType) {
  if (type === 'material_enhancement') return 'The goal of this pass is not to redesign the project, but to make the existing approved materials read as more believable, tactile, and photographically rich.';
  if (type === 'lighting_direction') return 'The goal of this pass is to improve the realism and photographic behavior of light without changing fixtures, layout, or design.';
  if (type === 'environment') return 'The goal of this pass is to improve surrounding context and depth while keeping the approved architecture as the hero.';
  if (type === 'people') return 'The goal of this pass is to add secondary human scale and activity without blocking or changing the architecture.';
  if (type === 'photographic_finish') return 'The goal of this pass is to make the approved render read less like a raw render and more like a professional editorial architectural photograph.';
  return 'The goal of this pass is to improve the image photographically while preserving the approved architectural design.';
}

function referenceRoleText(state: RenderPassBuilderState) {
  if (!state.references.length) return 'No role-tagged reference images registered.';
  const counts = state.references.reduce<Record<string, number>>((acc, ref) => {
    acc[ref.role] = (acc[ref.role] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([role, count]) => `${role}: ${count}`).join(', ');
}

function allowedChangesForPass(type: RenderPassType, state: RenderPassBuilderState) {
  if (type === 'analyze_site' || type === 'analyze_architecture' || type === 'brand_analysis') return 'Analyze and describe only. Do not generate, modify, or reinterpret the image.';
  if (type === 'knowledge_lock') return 'Merge existing knowledge only. Do not invent missing project facts.';
  if (type === 'architecture_lock') return 'Clarify preservation rules and design lock language only.';
  if (type === 'material_enhancement') return `Improve existing material realism only, targeting: ${materialTargetsText(state.materialTargets)}.`;
  if (type === 'lighting_direction') return 'Improve photographic lighting quality, exposure balance, shadows, highlights, and lens response only.';
  if (type === 'environment') return 'Enhance surrounding context, ambience, reflections, background depth, or site atmosphere only.';
  if (type === 'people') return 'Add people/activity only according to the selected people layer, keeping them secondary.';
  if (type === 'photographic_finish') return 'Apply final editorial color grade, tonal balance, highlight roll-off, shadow softness, and photographic polish only.';
  return 'Compare generated output against the base render, identify deviations, and produce a correction prompt only.';
}

function passSpecificNegative(type: RenderPassType) {
  if (type === 'material_enhancement') return 'changed material type, changed brand colors, wrong floor pattern, overglossy materials';
  if (type === 'lighting_direction') return 'new lighting fixtures, harsh spotlight, blown highlights, muddy shadows';
  if (type === 'environment') return 'changed architecture, new mall design, replaced storefront, fantasy background';
  if (type === 'people') return 'people blocking signage, people blocking counters, crowds overpowering architecture, moved furniture';
  if (type === 'photographic_finish') return 'overprocessed HDR, excessive drama, cartoon color grade, plastic CGI look';
  return '';
}

export function buildRenderPassNegativePrompt(state: RenderPassBuilderState, type?: RenderPassType, sourceOfTruth?: ProjectSourceOfTruth) {
  const locks = activeLocks(state.designLock);
  const lockNegatives = locks.map((lock) => `changed ${lock.toLowerCase()}`);
  const ruleNegatives = generationRulesNegativeText(state);
  const base = [
    'redesign',
    'changed architecture',
    'changed camera angle',
    'distorted geometry',
    'extra furniture',
    'moved furniture',
    'new counter',
    'new equipment',
    'replaced lighting fixtures',
    'changed ceiling design',
    'altered floor pattern',
    'wrong signage',
    'distorted logo',
    'unreadable brand text',
    'changed material type',
    'overdecorated',
    'fantasy design',
    'concept art',
    'cartoon',
    'CGI look',
    'plastic material',
    'unrealistic reflections',
    'excessive drama',
    'random props',
    'clutter',
    ...lockNegatives,
    ...ruleNegatives,
    ...materialRuleNegativeLines(sourceOfTruth),
    type ? passSpecificNegative(type) : '',
  ];
  return Array.from(new Set(base.flatMap((entry) => entry.split(',')).map((entry) => entry.trim()).filter(Boolean))).join(', ');
}

function numberedSections(sections: Array<[string, string | string[] | undefined]>) {
  return sections
    .filter(([, body]) => Array.isArray(body) ? body.filter(Boolean).length : Boolean(body?.trim()))
    .map(([title, body], index) => {
      const content = Array.isArray(body) ? body.filter(Boolean).join('\n') : body;
      return `${index + 1}. ${title}\n${content}`;
    })
    .join('\n\n');
}

function commonContext(scene: Scene, state: RenderPassBuilderState) {
  const setup = state.sceneSetup;
  const cameraView = labelFor(cameraViewOptions, state.cameraSystem.view);
  return [
    `Project Name: ${setup.projectName || scene.name || '-'}`,
    `Brand: ${setup.brand || '-'}`,
    `Location: ${setup.location || '-'}`,
    `Scene Type: ${setup.sceneType || scene.type || '-'}`,
    `Camera: ${cameraView}, lens ${state.cameraSystem.lens}mm, ${state.cameraSystem.height}, ${state.cameraSystem.perspective}`,
    `Output Goal: ${setup.outputGoal || 'Professional architectural visualization workflow'}`,
  ];
}

function designLockSummary(state: RenderPassBuilderState, strict = false) {
  const locks = activeLocks(state.designLock);
  const base = [
    'Preserve exactly:',
    ...(locks.length ? locks.map((lock) => `* ${lock}`) : ['* camera angle and composition', '* architectural geometry', '* furniture and equipment positions', '* signage/logo/floor pattern/material zones']),
    state.designLock.customPreserveNotes ? `Custom preserve notes: ${state.designLock.customPreserveNotes}` : '',
  ].filter(Boolean);
  if (strict) base.push('* Do not reinterpret the design language.', '* Do not add architecture, furniture, equipment, signage, or decorative concepts.');
  return base.join('\n');
}

function forbiddenCore(strict = false) {
  const base = [
    '* do not redesign',
    '* do not change camera, crop, perspective, geometry, layout, furniture, fixtures, equipment, logo, signage, floor pattern, material zones, or protected assets',
    '* do not invent new architectural elements',
    '* do not make the scene look like a new concept design',
  ];
  if (strict) base.push('* do not move, replace, simplify, stylize, or reinterpret protected assets', '* do not add random props, fantasy design, cartoon style, plastic CGI look, or unreadable brand text');
  return base.join('\n');
}

function buildAnalyzePrompt(scene: Scene, state: RenderPassBuilderState, pass: RenderPass) {
  const isSite = pass.type === 'analyze_site';
  return numberedSections([
    ['ROLE', [
      `ARCHVIZ AI WORKFLOW - ${isSite ? 'PASS 00: ANALYZE SITE REFERENCES' : 'PASS 01: ANALYZE BASE RENDER'}`,
      'Act as an architectural photographer and digital retoucher reviewing an approved architectural render.',
      'Do not act as an architect or interior designer. Do not redesign the project.',
    ]],
    ['SOURCE OF TRUTH', [
      'Base Render = Source of Truth.',
      isSite ? 'The uploaded site photographs are analysis references only.' : 'The uploaded base render is the source of truth.',
      'No image generation or modification should happen in this pass.',
      'Analyze the image only.',
    ]],
    ['PROJECT CONTEXT', commonContext(scene, state)],
    ['DESIGN LOCK', designLockSummary(state, state.promptVerbosity === 'strict')],
    ['PROTECTED DESIGN ASSETS', protectedAssetsText(state.protectedAssets)],
    renderPassReferencesText(state) ? ['RENDER PASS REFERENCES', renderPassReferencesText(state)] : ['', ''],
    ['TASK', [
      'Analyze the image only.',
      'Return a structured review with:',
      '1. Camera / composition summary',
      '2. Architecture elements that must be preserved',
      '3. Visible protected assets',
      '4. Material zones',
      '5. Existing lighting condition',
      '6. Environment / background condition',
      '7. AI hallucination risks',
      '8. Recommended next pass order',
    ]],
    ['FORBIDDEN', [
      '* do not generate an image',
      '* do not modify the image',
      forbiddenCore(state.promptVerbosity === 'strict'),
    ]],
    state.includeInternalDiagnostics ? ['INTERNAL DIAGNOSTICS', `Reference Intelligence: ${referenceRoleText(state)}`] : ['', ''],
  ]);
}

function buildLockPrompt(scene: Scene, state: RenderPassBuilderState, pass: RenderPass) {
  return numberedSections([
    ['ROLE', [
      `ARCHVIZ AI WORKFLOW - ${pass.title}`,
      'Act as an ArchViz production lead creating a preservation contract for downstream render passes.',
      'Do not generate an image.',
    ]],
    ['SOURCE OF TRUTH', [
      'Base Render = Source of Truth.',
      'The uploaded base render is the source of truth.',
      'Treat the architecture as a completed approved design.',
    ]],
    ['PROJECT CONTEXT', commonContext(scene, state)],
    ['PROTECTED DESIGN ASSETS', [
      'Preserve exactly:',
      protectedAssetsText(state.protectedAssets),
      editableAssetsText(state.protectedAssets) ? `\nEditable context, not protected:\n${editableAssetsText(state.protectedAssets)}` : '',
    ]],
    renderPassReferencesText(state) ? ['RENDER PASS REFERENCES', renderPassReferencesText(state)] : ['', ''],
    ['ARCHITECTURE LOCK REQUIREMENTS', designLockSummary(state, true)],
    ['TASK', [
      'Restate and strengthen the preservation rules.',
      'Return a clear Design Lock Statement.',
      'List hallucination risks that may cause the image model to redesign the project.',
    ]],
    ['FORBIDDEN', forbiddenCore(true)],
  ]);
}

function buildEnhancementPrompt(scene: Scene, state: RenderPassBuilderState, pass: RenderPass, sourceOfTruth?: ProjectSourceOfTruth) {
  const visualMode = labelFor(visualDirectionOptions, state.visualDirectionMode);
  const lightingMode = labelFor(lightingOptions, state.lightingMode);
  const environmentMode = labelFor(environmentOptions, state.environmentMode);
  const visualPreset = labelFor(visualDirectionPresetOptions, state.visualDirectionPreset);
  const environmentPreset = labelFor(environmentLibraryOptions, state.environmentLibraryPreset);
  const materialLevel = labelFor(materialLevelOptions, state.materialEnhancementLevel);
  const peopleLayer = labelFor(peopleLayerOptions, state.peopleActivityLayer);
  const strict = state.promptVerbosity === 'strict';
  const compact = state.promptVerbosity === 'compact';
  const includePeople = state.peopleActivityLayer !== 'none';
  const passDetails: string[] = [pass.objective, allowedChangesForPass(pass.type, state)];
  let visualNarrative = visualIntentForPass(pass.type);

  if (pass.type === 'material_enhancement') {
    visualNarrative = buildMaterialNarrative(state);
    passDetails.push(`Material Enhancement Level: ${materialLevel}`);
    passDetails.push(`Material Targets: ${materialTargetsText(state.materialTargets)}`);
    if (state.promptVerbosity === 'strict') passDetails.push(`Advanced diagnostic material profile: ${materialProfileText(state.materialProfiles)}`);
  }
  if (pass.type === 'lighting_direction') {
    visualNarrative = buildLightingNarrative(state);
    passDetails.push(`Lighting Mode: ${lightingMode}`);
    if (state.promptVerbosity === 'strict') passDetails.push(`Advanced diagnostic lighting graph: ${lightingGraphText(state.lightingGraph)}`);
  }
  if (pass.type === 'environment') {
    visualNarrative = buildEnvironmentNarrative(state);
    passDetails.push(`Environment Mode: ${environmentPreset} / ${environmentMode}`);
    passDetails.push('Enhance surrounding context only. Do not modify architecture or protected assets.');
  }
  if (pass.type === 'people') {
    visualNarrative = buildPeopleNarrative(state);
    passDetails.push(`People / Activity Layer: ${peopleLayer}`);
    passDetails.push('People must be secondary and must not block signage, counters, protected assets, or architectural form.');
  }
  if (pass.type === 'photographic_finish') {
    visualNarrative = buildPhotographicFinishNarrative(state);
    passDetails.push(`Visual Direction: ${visualPreset} / ${visualMode}`);
    passDetails.push('Apply editorial photographic polish: color balance, highlight rolloff, shadow softness, exposure, and realism.');
    if (!compact) passDetails.push(`Lighting summary: ${lightingMode}. Material level: ${materialLevel}.`);
  }
  if (includePeople && pass.type !== 'people') passDetails.push(`People note: ${peopleLayer}. Keep people secondary.`);

  if (compact) {
    return numberedSections([
      ['ROLE LOCK', [
        `ARCHVIZ AI WORKFLOW - ${pass.title}`,
        'Architectural photographer and digital retoucher only. Do not redesign.',
      ]],
      ['EDIT INTENT', [
        'Edit the uploaded image directly.',
        'Keep the original composition and approved architectural design exactly as shown.',
      ]],
      ['PRESERVE', [
        'Base Render = Source of Truth.',
        designLockSummary(state, false),
        protectedAssetsText(state.protectedAssets),
      ]],
      materialRulePromptLines(sourceOfTruth).length ? ['PROJECT MATERIAL RULES', [
        ...materialRulePromptLines(sourceOfTruth),
        scopedColorCastCorrectionLine(sourceOfTruth),
      ]] : ['', ''],
      ['VISUAL INTENT', [
        visualIntentForPass(pass.type),
        visualNarrative,
      ]],
      ['PASS INSTRUCTION', [
        allowedChangesForPass(pass.type, state),
        state.sceneSetup.outputGoal || 'Professional architectural photograph of the same approved project.',
      ]],
      ['FORBIDDEN', forbiddenCore(false)],
    ]);
  }

  return numberedSections([
    ['ROLE LOCK', [
      `ARCHVIZ AI WORKFLOW - ${pass.title}`,
      'AI role: architectural photographer and digital retoucher only.',
      'You are not an architect.',
      'You are not the architect. You are not redesigning the project.',
    ]],
    ['SOURCE OF TRUTH', [
      'Base Render = Source of Truth.',
      'The uploaded base render is the exact source of truth.',
      'Preserve original camera, composition, geometry, layout, furniture placement, fixtures, equipment, signage, logo, material zones, and protected assets.',
    ]],
    ['EDIT INTENT', [
      'Edit the uploaded image directly.',
      'Keep the original camera angle, composition, geometry, layout, furniture positions, lighting fixtures, equipment, signage, logo, floor pattern, and protected design assets exactly as shown.',
    ]],
    ['PROJECT CONTEXT', commonContext(scene, state)],
    ['ARCHITECTURE LOCK', designLockSummary(state, strict)],
    ['PROTECTED DESIGN ASSETS', protectedAssetsText(state.protectedAssets)],
    materialRulePromptLines(sourceOfTruth).length ? ['PROJECT SOURCE OF TRUTH - MATERIAL RULES', [
      'These project rules outrank generic mood, luxury, editorial, white-balance, and color-cast instructions.',
      ...materialRulePromptLines(sourceOfTruth),
      'Scoped color-cast correction:',
      scopedColorCastCorrectionLine(sourceOfTruth),
    ]] : ['', ''],
    projectRuleReferenceInstructions(sourceOfTruth).length ? ['PROJECT MATERIAL REFERENCES', projectRuleReferenceInstructions(sourceOfTruth)] : ['', ''],
    renderPassReferencesText(state) ? ['RENDER PASS REFERENCES', renderPassReferencesText(state)] : ['', ''],
    generationRulesPromptText(state) ? ['ACTIVE GENERATION RULES', generationRulesPromptText(state)] : ['', ''],
    ['VISUAL INTENT', visualIntentForPass(pass.type)],
    ['VISUAL DIRECTION NARRATIVE', visualNarrative],
    ['CURRENT PASS OBJECTIVE', passDetails],
    ['ALLOWED CHANGES FOR THIS PASS ONLY', allowedChangesForPass(pass.type, state)],
    ['FORBIDDEN CHANGES', forbiddenCore(strict)],
    ['OUTPUT REQUIREMENT', [
      state.sceneSetup.outputGoal || 'Professional editorial architectural photograph of the same completed project.',
      'Enhance the approved render without changing design intent or architectural content.',
    ]],
    ['INTERNAL QC CHECKLIST', [
      '* same camera angle and composition',
      '* same architecture and geometry',
      '* same layout, counters, furniture, fixtures, signage, logo, floor pattern, material zones, and protected assets',
      '* pass objective remains focused on one task only',
      '* no new concept design language introduced',
    ]],
  ]);
}

function buildQcPrompt(scene: Scene, state: RenderPassBuilderState, pass: RenderPass, sourceOfTruth?: ProjectSourceOfTruth) {
  return numberedSections([
    ['ROLE', [
      `ARCHVIZ AI WORKFLOW - ${pass.title}`,
      'Act as an ArchViz QC reviewer. Do not generate an image.',
    ]],
    ['SOURCE IMAGES', [
      'Base Render = Source of Truth.',
      'Generated result image = candidate output to review.',
    ]],
    ['PROJECT CONTEXT', commonContext(scene, state)],
    ['PRESERVATION CHECK', [
      designLockSummary(state, true),
      protectedAssetsText(state.protectedAssets),
    ]],
    materialRulePromptLines(sourceOfTruth).length ? ['PROJECT MATERIAL RULE QC', [
      ...materialRulePromptLines(sourceOfTruth),
      'QC must flag any drift from protected project material rules.',
      ...materialRuleNegativeLines(sourceOfTruth).map((line) => `Forbidden drift: ${line}`),
    ]] : ['', ''],
    renderPassReferencesText(state) ? ['RENDER PASS REFERENCES', renderPassReferencesText(state)] : ['', ''],
    ['TASK', [
      'Compare the generated result against the base render.',
      'Identify deviations, hallucinated objects, changed camera, changed geometry, moved furniture/equipment, altered materials, changed signage/logo, and lighting fixture errors.',
      'Do not ask to generate or modify an image in this pass.',
    ]],
    ['SCORES TO RETURN', [
      '* Preservation Score /100',
      '* Photographic Score /100',
      '* Hallucination Risk /100',
      '* Client-ready Score /100',
    ]],
    ['REVISION PROMPT', [
      'Produce a focused revision prompt that restores the base architecture and fixes only the listed issues.',
      'The revision prompt must keep the base render as source of truth.',
    ]],
    ['FORBIDDEN', [
      '* do not generate an image',
      '* do not redesign',
      '* do not introduce new design concepts',
    ]],
  ]);
}

export function buildRenderPassPrompt(scene: Scene, state: RenderPassBuilderState, pass: RenderPass, sourceOfTruth?: ProjectSourceOfTruth) {
  if (pass.type === 'analyze_site' || pass.type === 'analyze_architecture' || pass.type === 'brand_analysis') return buildAnalyzePrompt(scene, state, pass);
  if (pass.type === 'knowledge_lock' || pass.type === 'architecture_lock') return buildLockPrompt(scene, state, pass);
  if (pass.type === 'qc_review') return buildQcPrompt(scene, state, pass, sourceOfTruth);
  return buildEnhancementPrompt(scene, state, pass, sourceOfTruth);
}

export function generateRenderPassPrompts(state: RenderPassBuilderState, scene: Scene, sourceOfTruth?: ProjectSourceOfTruth) {
  const now = new Date().toISOString();
  const nextState = normalizeRenderPassBuilderState(state);
  const passes = nextState.passes.map((pass) => {
    if (!pass.enabled) return pass;
    const enrichedPass = { ...pass, objective: renderPassObjectives[pass.type], title: renderPassLabels[pass.type] };
    const prompt = buildRenderPassPrompt(scene, nextState, enrichedPass, sourceOfTruth);
    const negativePrompt = buildRenderPassNegativePrompt(nextState, pass.type, sourceOfTruth);
    const trace = compileProjectPromptTrace({
      sourceOfTruth,
      basePrompt: prompt,
      negativePrompt,
      provider: nextState.selectedModelAdapter,
      model: nextState.selectedModelAdapter,
      mode: pass.type,
      activeGoals: [enrichedPass.title],
      visualDirection: visualDirectionPromptLines(nextState.referenceDirection?.appliedAnalysis).join('\n'),
      referenceDirectionUsage: nextState.referenceDirection?.appliedAnalysis?.referenceUsageMap.map((reference) => `- ${reference.referenceName}: ${reference.borrowed}; do not borrow ${reference.notBorrowed}`).join('\n'),
    });
    const version = {
      ...makePromptVersion(enrichedPass, prompt, nextState, now),
      negativePrompt,
      compiledPromptTrace: trace,
      activeMaterialRuleIds: trace.activeRuleIds,
    };
    return {
      ...enrichedPass,
      prompt,
      promptVersions: [...(enrichedPass.promptVersions || []), version],
      activeVersionId: version.id,
      status: 'generated' as const,
      updatedAt: now,
    };
  });
  return {
    ...nextState,
    passes,
    negativePrompt: buildRenderPassNegativePrompt(nextState, undefined, sourceOfTruth),
    generatedAt: now,
    updatedAt: now,
    selectedPassType: nextState.selectedPassType || passes.find((pass) => pass.enabled)?.type,
  };
}

export function getActivePromptVersion(pass?: RenderPass) {
  if (!pass) return undefined;
  const versions = (pass.promptVersions || []).filter((version) => version.status !== 'archived');
  return versions.find((version) => version.id === pass.activeVersionId)
    || versions.find((version) => version.id === pass.approvedVersionId)
    || versions[versions.length - 1];
}

export function getApprovedPromptVersion(pass?: RenderPass) {
  if (!pass) return undefined;
  return (pass.promptVersions || []).find((version) => version.id === pass.approvedVersionId || version.status === 'approved');
}

export function adapterFileSuffix(adapter: ModelAdapterId = 'generic') {
  return adapter.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}

function compactPrompt(prompt: string, maxLines = 26) {
  const lines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, maxLines).join(' ');
}

export function formatPromptForAdapter(prompt: string, adapter: ModelAdapterId = 'generic', state?: RenderPassBuilderState, pass?: RenderPass) {
  if (!prompt.trim()) return '';
  if (adapter === 'generic') return prompt;
  const title = pass?.title || 'Selected Render Pass';
  const camera = state ? `${state.cameraSystem.view}, ${state.cameraSystem.lens}mm, ${state.cameraSystem.height}` : 'preserve original camera';
  const locks = state ? activeLocks(state.designLock).join(', ') : 'architecture, geometry, camera, furniture, lighting fixtures, equipment, signage, logo';
  const nonGeneration = pass ? ['analyze_site', 'analyze_architecture', 'brand_analysis', 'knowledge_lock', 'architecture_lock', 'qc_review'].includes(pass.type) : false;
  if (nonGeneration) {
    if (adapter === 'midjourney') return compactPrompt(prompt, 20);
    return [
      `${adapter.toUpperCase().replace('_', ' ')} REVIEW WORKFLOW - ${title}`,
      'This is not an image generation request. Analyze, lock, or review only according to the selected pass.',
      '',
      prompt,
    ].join('\n');
  }
  if (adapter === 'gemini') {
    return [
      `GEMINI IMAGE WORKFLOW - ${title}`,
      'First analyze the attached base render and project context. Then execute only the selected pass.',
      'Preserve before enhancing: camera, geometry, layout, furniture, equipment, lighting fixtures, signage, logo, floor pattern, and protected assets.',
      `Camera: ${camera}.`,
      '',
      prompt,
      '',
      'Do not redesign. Treat the base render as approved architecture and act as photographer/retoucher only.',
    ].join('\n');
  }
  if (adapter === 'gpt_image') {
    return [
      `IMAGE EDIT INSTRUCTION - ${title}`,
      'Use the provided base image as the exact source image. Preserve geometry, camera, perspective, layout, furniture placement, fixtures, equipment, signage, logo, and architectural form.',
      'Make only the current pass changes described below. Do not invent new design elements.',
      '',
      prompt,
    ].join('\n');
  }
  if (adapter === 'flux_kontext') {
    return [
      `${title}. Edit the input image only.`,
      `Preserve: ${locks || 'all architecture and camera'}.`,
      compactPrompt(prompt, 18),
      'No redesign, no new geometry, no changed camera.',
    ].join('\n');
  }
  if (adapter === 'magnific') {
    return [
      `Enhance-only pass: ${title}.`,
      'Upscale/refine realism, material texture, micro detail, lighting clarity, and photographic quality while preserving all geometry and composition.',
      `Protected assets: ${locks || 'all visible design assets'}.`,
      compactPrompt(prompt, 16),
      'Do not alter design, camera, material placement, furniture, equipment, logo, or layout.',
    ].join('\n');
  }
  return [
    compactPrompt(prompt, 22),
    '--style raw --no redesign, changed camera, distorted geometry, extra furniture, wrong logo, unreadable signage, CGI plastic look',
  ].join(' ');
}

export function enabledGeneratedPasses(state: RenderPassBuilderState) {
  return normalizeRenderPassBuilderState(state).passes.filter((pass) => pass.enabled && (pass.prompt.trim() || Boolean(getActivePromptVersion(pass)?.prompt.trim())));
}

export function combinedPassPrompts(state: RenderPassBuilderState) {
  const normalized = normalizeRenderPassBuilderState(state);
  return enabledGeneratedPasses(normalized).map((pass) => `${pass.title}\n\n${getActivePromptVersion(pass)?.prompt || pass.prompt}`).join('\n\n---\n\n');
}
