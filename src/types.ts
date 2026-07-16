export type SlotCategory = 'materials' | 'props' | 'lighting' | 'environment';
export type CreativeFreedom = 'low' | 'medium' | 'high';
export type PeopleLevel = 'none' | 'min' | 'mid' | 'max';
export type MotionBlur = 'none' | 'soft' | 'walking' | 'random';
export type CanvasTool = 'select' | 'pin' | 'rect' | 'move' | 'delete';
export type InferenceMode = 'conservative' | 'balanced' | 'creative';
export type RenderPassType =
  | 'analyze_site'
  | 'analyze_architecture'
  | 'brand_analysis'
  | 'knowledge_lock'
  | 'architecture_lock'
  | 'material_enhancement'
  | 'lighting_direction'
  | 'environment'
  | 'people'
  | 'photographic_finish'
  | 'qc_review';
export type RenderPassStatus =
  | 'not_started'
  | 'draft'
  | 'generated'
  | 'locked'
  | 'approved'
  | 'needs_revision'
  | 'copied'
  | 'exported'
  | 'reviewed';
export type ModelAdapterId = 'generic' | 'gemini' | 'gpt_image' | 'flux_kontext' | 'magnific' | 'midjourney';
export type PromptVerbosity = 'compact' | 'standard' | 'strict';
export type RenderPromptVersionStatus = 'draft' | 'generated' | 'approved' | 'archived';
export type RenderPromptVersionSource = 'generated' | 'duplicated' | 'imported' | 'manual_edit' | 'gemini_composer';
export type RenderPassInputType = 'base_render' | 'object_id' | 'material_id' | 'depth' | 'normal' | 'alpha_mask' | 'other';
export type ColorLegendRole =
  | 'protected_asset'
  | 'material_zone'
  | 'environment_zone'
  | 'background'
  | 'equipment'
  | 'signage'
  | 'furniture'
  | 'lighting_fixture'
  | 'unknown';
export type ColorLegendEntry = {
  id: string;
  colorHex: string;
  label: string;
  role: ColorLegendRole;
  locked?: boolean;
  notes?: string;
};
export type RenderPassInput = {
  id: string;
  type: RenderPassInputType;
  name: string;
  dataUrl: string;
  fileName?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  notes?: string;
  colorLegend?: ColorLegendEntry[];
};
export type VisualDirectionMode =
  | 'real_site_documentation'
  | 'premium_retail_editorial'
  | 'ambient_architecture'
  | 'cinematic_presentation'
  | 'hero_object'
  | 'museum_gallery_presentation'
  | 'opening_day'
  | 'night_luxury';
export type LightingMode =
  | 'natural_skylight'
  | 'soft_diffused_daylight'
  | 'warm_ambient'
  | 'museum_lighting'
  | 'cinematic_ambient'
  | 'evening_retail'
  | 'low_key_editorial'
  | 'spot_soft_fill';
export type EnvironmentMode =
  | 'existing_site'
  | 'premium_mall_atrium'
  | 'fade_background'
  | 'dark_negative_space'
  | 'museum_void'
  | 'white_infinity'
  | 'editorial_studio_hall';
export type MaterialEnhancementLevel = 'none' | 'subtle' | 'premium' | 'editorial' | 'luxury_magazine';
export type PeopleActivityLayer =
  | 'none'
  | 'subtle_motion_blur'
  | 'opening_day'
  | 'staff_only'
  | 'customers_only'
  | 'mall_visitors'
  | 'full_commercial_activity';
export type KnowledgeWorkflowPhase =
  | 'site_analysis'
  | 'architecture_analysis'
  | 'brand_analysis'
  | 'knowledge_lock'
  | 'prompt_composer'
  | 'qc_review';
export type ReferenceRole = 'site' | 'architecture' | 'material' | 'lighting' | 'mood' | 'people' | 'brand' | 'environment';
export type ProtectedAssetStatus = 'locked' | 'editable' | 'replaceable';
export type CameraViewPreset = 'front_hero' | 'forty_five' | 'side' | 'corner' | 'wide' | 'eye_level' | 'bird_eye' | 'human_perspective';
export type LensPreset = 24 | 28 | 35 | 50 | 70;
export type VisualDirectionPreset = 'editorial' | 'commercial' | 'opening_day' | 'architectural_competition' | 'luxury_brand' | 'cinematic' | 'quiet_luxury' | 'museum_presentation' | 'product_hero';
export type EnvironmentLibraryPreset = 'premium_mall' | 'minimal_gallery' | 'white_infinity' | 'black_infinity' | 'museum' | 'studio' | 'editorial' | 'luxury_retail' | 'fade_background' | 'negative_space';
export type RevisionCategory =
  | 'restore_architecture'
  | 'restore_furniture'
  | 'restore_equipment'
  | 'restore_camera'
  | 'restore_columns'
  | 'restore_lighting_fixtures'
  | 'remove_hallucinated_objects'
  | 'correct_perspective'
  | 'reduce_contrast'
  | 'increase_fill_light'
  | 'improve_material'
  | 'reduce_background'
  | 'suppress_environment';

export type Pin = { id: string; slotId: string; x: number; y: number; note?: string };
export type Region = { id: string; slotId: string; type: 'rect'; x: number; y: number; width: number; height: number; note?: string };

export type Slot = {
  id: string;
  category: SlotCategory;
  code: string;
  name: string;
  color: string;
  descriptionThai: string;
  referenceImages: string[];
  creativeFreedom?: CreativeFreedom;
  categoryLabel?: string;
  applyTo?: string;
  tone?: string;
  finish?: string;
  texture?: string;
  avoid?: string[];
  direction?: string;
  quality?: string;
  intensity?: string;
  type?: string;
  englishPromptNote?: string;
  aiSuggested?: boolean;
  aiSuggestionId?: string;
  aiSuggestionConfidence?: string;
  aiSuggestionBasis?: string;
  inferredByAi?: boolean;
  pins: Pin[];
  regions: Region[];
};

export type DirectorNotes = {
  overallSceneDirection: string;
  materialInterpretationNotes: string;
  lightingAtmosphereNotes: string;
  preserveDoNotChangeNotes: string;
  inferenceMode: InferenceMode;
};

export type SceneSetup = {
  projectName: string;
  brand: string;
  location: string;
  sceneType: string;
  cameraAngle: string;
  outputGoal: string;
};

export type DesignLock = {
  lockCamera: boolean;
  lockArchitecture: boolean;
  lockGeometry: boolean;
  lockFurniture: boolean;
  lockEquipment: boolean;
  lockLightingFixtures: boolean;
  lockMaterials: boolean;
  lockFloorPattern: boolean;
  lockLogoSignage: boolean;
  lockColumns: boolean;
  lockComposition: boolean;
  customPreserveNotes: string;
};

export type ProtectedDesignAsset = {
  id: string;
  name: string;
  description?: string;
  locked: boolean;
  status?: ProtectedAssetStatus;
};

export type MaterialEnhancementTargets = {
  woodGrain: boolean;
  brassReflection: boolean;
  leatherTexture: boolean;
  marbleDepth: boolean;
  glassReflection: boolean;
  floorReflection: boolean;
  microImperfections: boolean;
};

export type ReferenceAsset = {
  id: string;
  role: ReferenceRole;
  image: string;
  label: string;
  notes: string;
  confidence: number;
  createdAt: string;
};

export type ProjectProfileType = 'branded' | 'general' | 'custom';

export type SpaceType =
  | 'residential_exterior'
  | 'living_room'
  | 'dining_room'
  | 'kitchen'
  | 'bedroom'
  | 'bathroom'
  | 'home_office'
  | 'walk_in_closet'
  | 'garage_carport'
  | 'garden_landscape'
  | 'pool_terrace'
  | 'courtyard'
  | 'facade_detail'
  | 'multi_purpose_room'
  | 'other';

export type GenerationIntent = 'explore' | 'develop' | 'polish' | 'fix';
export type DesignFreedom = 'strict' | 'balanced' | 'creative';
export type SceneElementFlexibility = 'locked' | 'flexible' | 'editable';
export type MaterialZoneType = 'floor' | 'wall' | 'ceiling' | 'cabinetry' | 'countertop' | 'backsplash' | 'upholstery' | 'loose_furniture' | 'metal' | 'glass_glazing' | 'curtain_fabric' | 'landscape' | 'water' | 'exterior_ground_driveway' | 'custom';

export type MaterialZone = {
  id: string;
  label: string;
  type: MaterialZoneType;
  currentMaterialDescription: string;
  flexibility: SceneElementFlexibility;
  allowedChanges: string[];
  forbiddenChanges: string[];
  linkedReferenceIds: string[];
  userNotes: string;
};

export type CameraContract = {
  lockMode: 'strict' | 'balanced' | 'flexible';
  preserveViewpoint: boolean;
  preserveCrop: boolean;
  preserveAspectRatio: boolean;
  preservePerspectiveCharacter: boolean;
  preserveHorizon: boolean;
  preserveVerticalCorrection: boolean;
  preserveLensCharacter: boolean;
  cameraMovementAllowance: string;
  cropTolerance: string;
  notes: string;
};

export type SceneContract = {
  id: string;
  projectId: string;
  sceneId: string;
  version: number;
  spaceType: SpaceType;
  lockedElements: string[];
  flexibleElements: string[];
  explicitlyEditableElements: string[];
  forbiddenChanges: string[];
  materialZones: MaterialZone[];
  cameraContract: CameraContract;
  consistencyContract: string[];
  source: 'default_baseline' | 'user' | 'approved_agent_plan';
  createdAt: string;
  updatedAt: string;
};

export type AtmosphereRecipe = {
  id: string;
  version: number;
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'late_afternoon' | 'sunset' | 'blue_hour' | 'night' | 'mixed_custom';
  sunCharacter: string;
  sunDirectionDescription: string;
  shadowLength: string;
  shadowSoftness: string;
  skyCondition: 'clear' | 'soft_cloudy' | 'overcast' | 'dramatic_cloud' | 'rainy' | 'humid_haze' | 'custom';
  weather: string;
  daylightStrength: string;
  artificialLightingState: string;
  interiorExteriorBalance: string;
  whiteBalance: 'neutral' | 'neutral_warm' | 'warm' | 'cool' | 'mixed';
  exposure: string;
  contrast: string;
  saturation: string;
  bloom: string;
  haze: string;
  reflectionCharacter: string;
  imageClarity: string;
  emotionalTone: string;
  photographyCharacter: string;
  sourceReferenceIds: string[];
  userNotes: string;
  confidence: number;
  analysisMode: 'not_analyzed' | 'metadata' | 'vision';
  createdAt: string;
  updatedAt: string;
};

export type VisualRecipe = { id: string; version: number; summary: string; sourceReferenceIds: string[]; forbiddenCopying: string[]; updatedAt: string };
export type ReferenceBorrowMap = {
  referenceId: string;
  target: 'whole_scene' | 'atmosphere' | 'material_zone' | 'landscape' | 'people' | 'styling' | 'photography' | 'custom';
  targetZoneId?: string;
  borrowAttributes: string[];
  forbiddenAttributes: string[];
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  conflictGroup?: string;
  selectedResolution?: 'winner' | 'blend' | 'suppressed' | 'pending';
  reason: string;
  active: boolean;
  analysisMode: 'metadata' | 'vision' | 'not_analyzed';
};

export type ReferenceConflict = {
  id: string;
  type: 'time_of_day' | 'material_direction' | 'other';
  affectedTarget: string;
  referenceIds: string[];
  proposedWinnerId?: string;
  reason: string;
  requiresUserChoice: boolean;
  resolvedReferenceId?: string;
};

export type ProviderCapabilitySummary = {
  providerId: string;
  providerLabel: string;
  model: string;
  supportsVision: boolean;
  supportsMultipleReferences: 'yes' | 'limited' | 'no';
  effectiveReferenceCount?: number;
  baseImageSent: boolean;
  editableResultSent: boolean;
  referenceImagesSent: string[];
  textOnlyReferences: string[];
  omittedReferences: Array<{ name: string; reason: string }>;
  seedSupport: boolean;
  maskRegionSupport: boolean;
  mode: string;
};

export type GeneralQcRecord = {
  id: string;
  createdAt: string;
  analysisMode: 'not_analyzed' | 'metadata' | 'vision';
  preservation: Record<'camera' | 'crop' | 'geometry' | 'openings' | 'furniture' | 'fixtures' | 'materialZones' | 'signage' | 'circulation', 'pass' | 'warning' | 'fail' | 'unchecked'>;
  direction: Record<'atmosphere' | 'lighting' | 'timeOfDay' | 'materials' | 'landscape' | 'photography' | 'forbiddenCopying', 'pass' | 'warning' | 'fail' | 'unchecked'>;
  artifacts: Record<'warpedGeometry' | 'duplicatedObjects' | 'distortedFurniture' | 'brokenReflections' | 'inconsistentShadows' | 'incorrectScale' | 'textDistortion' | 'impossibleGlazing' | 'peopleArtifacts' | 'vegetationArtifacts', 'pass' | 'warning' | 'fail' | 'unchecked'>;
  comments: string[];
};

export type SceneSet = { id: string; projectId: string; name: string; spaceType: SpaceType; sharedSceneContractId?: string; sharedVisualDirectionVersionId?: string; sharedAtmosphereRecipeId?: string; sharedMaterialRecipeIds: string[]; sharedLandscapeRecipeId?: string; viewIds: string[]; createdAt: string; updatedAt: string };

export type GeneralProductionState = {
  schemaVersion: 'visual-local-general-production-v1';
  spaceType: SpaceType;
  customSpaceTypeLabel: string;
  sceneGroupId?: string;
  sceneContract: SceneContract;
  atmosphereRecipe: AtmosphereRecipe;
  materialRecipes: VisualRecipe[];
  landscapeRecipe?: VisualRecipe;
  photographyRecipe?: VisualRecipe;
  borrowMaps: ReferenceBorrowMap[];
  conflicts: ReferenceConflict[];
  generationIntent: GenerationIntent;
  designFreedom: DesignFreedom;
  visualDirectionVersions: Array<{ id: string; parentVersionId?: string; changeSummary: string; scope: VisualDirectionApplyScope; sceneContractVersion: number; atmosphereRecipeVersion: number; borrowMaps: ReferenceBorrowMap[]; analysisMode: 'metadata' | 'vision'; provider?: string; model?: string; createdAt: string }>;
  activeVisualDirectionVersionId?: string;
  sceneSetId?: string;
  generalQc?: GeneralQcRecord;
};

export type ProjectProfile = {
  id: string;
  displayName: string;
  profileType: ProjectProfileType;
  sourceOfTruthProfileId: string;
  projectSpecificOverrides?: string[];
  defaultWorkflowPreset: 'karun_production' | 'general_reference_first';
  createdAt: string;
  updatedAt: string;
};

export type GeneralReferenceRole =
  | 'overall_mood'
  | 'lighting'
  | 'time_of_day'
  | 'materials'
  | 'color_palette'
  | 'landscape'
  | 'people_activity'
  | 'styling_props'
  | 'photography_camera'
  | 'environment_site'
  | 'custom';

export type GeneralReferenceScope =
  | 'mood_only'
  | 'atmosphere_only'
  | 'color_palette_only'
  | 'material_color_only'
  | 'texture_only'
  | 'finish_only'
  | 'lighting_only'
  | 'time_of_day_only'
  | 'landscape_character_only'
  | 'people_activity_only'
  | 'photographic_treatment_only'
  | 'do_not_copy_architecture'
  | 'do_not_copy_geometry'
  | 'do_not_copy_furniture_form'
  | 'do_not_copy_composition'
  | 'do_not_copy_camera'
  | 'do_not_copy_signage_branding';

export type GeneralReferenceDirection = {
  id: string;
  name: string;
  dataUrl: string;
  role: GeneralReferenceRole;
  included: boolean;
  priority: 'low' | 'medium' | 'high';
  scopes: GeneralReferenceScope[];
  userNote: string;
  allowedInfluence: string;
  forbiddenInfluence: string;
  createdAt: string;
  updatedAt: string;
};

export type VisualDirectionReferenceUsage = {
  referenceId: string;
  referenceName: string;
  borrowed: string;
  notBorrowed: string;
  baseApplication: string;
  confidence: number;
  ambiguity?: string;
};

export type VisualDirectionAnalysis = {
  id: string;
  status: 'draft' | 'applied' | 'stale';
  analysisSource: 'metadata' | 'vision';
  provider?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  existingDesignSummary: string;
  protectedBaseElements: string[];
  overallAtmosphere: string;
  lightingDirection: string;
  timeOfDayWeather: string;
  materialDirection: string;
  colorPalette: string;
  landscapeEnvironmentDirection: string;
  peopleActivityDirection: string;
  stylingDirection: string;
  photographicTreatment: string;
  referenceUsageMap: VisualDirectionReferenceUsage[];
  conflicts: string[];
  missingInformation: string[];
  designDriftRisks: string[];
  proposedFirstGenerationPlan: string;
  finalGenerationPromptDraft: string;
};

export type VisualDirectionApplyScope = 'image' | 'scene' | 'project';

export type ReferenceDirectionState = {
  references: GeneralReferenceDirection[];
  latestAnalysis?: VisualDirectionAnalysis;
  appliedAnalysis?: VisualDirectionAnalysis;
  appliedScope?: VisualDirectionApplyScope;
  skippedForFirstGeneration?: boolean;
  visionApproved?: boolean;
};

export type KnowledgeConfidence = {
  project: number;
  site: number;
  architecture: number;
  brand: number;
  materials: number;
  lighting: number;
  furniture: number;
  equipment: number;
  camera: number;
  protectedAssets: number;
};

export type ProductionContextNode = {
  summary: string;
  notes: string;
  confidence: number;
  updatedAt?: string;
};

export type CameraSystem = {
  view: CameraViewPreset;
  lens: LensPreset;
  height: string;
  perspective: string;
  compositionNotes: string;
  locked: boolean;
};

export type LightingGraph = {
  keyLight: number;
  fillLight: number;
  ambient: number;
  practicalLights: number;
  skylight: number;
  backgroundFalloff: number;
  shadowDensity: number;
  reflectionStrength: number;
  notes: string;
};

export type MaterialProfiles = {
  woodGrain: number;
  reflection: number;
  microRoughness: number;
  imperfections: number;
  leatherSoftness: number;
  brassAging: number;
  marbleContrast: number;
  glassReflection: number;
  floorReflection: number;
};

export type ProjectMemoryEntry = {
  id: string;
  label: string;
  status: 'approved' | 'rejected' | 'revision';
  notes: string;
  promptVersionId?: string;
  createdAt: string;
};

export type PromptVersionEntry = {
  id: string;
  version: number;
  passType?: RenderPassType;
  prompt: string;
  createdAt: string;
  notes?: string;
};

export type VisualDiffState = {
  added: string;
  removed: string;
  modified: string;
  moved: string;
  notes: string;
};

export type SceneReferenceRole =
  | 'lighting_mood'
  | 'material_mood'
  | 'environment_mood'
  | 'color_grade'
  | 'people_activity'
  | 'style_avoid'
  | 'do_not_copy_design';

export type SceneReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
  role: SceneReferenceRole;
  notes?: string;
  included?: boolean;
};

export type MaterialRuleCategory =
  | 'wood'
  | 'metal'
  | 'upholstery'
  | 'floor'
  | 'stone'
  | 'solid_surface'
  | 'glass'
  | 'signage'
  | 'paint'
  | 'ceiling'
  | 'lighting_appearance'
  | 'brand_accent'
  | 'environment_context'
  | 'custom';

export type MaterialRuleProtectionLevel = 'protected' | 'strongly_preferred' | 'flexible' | 'experimental';

export type MaterialRuleReferenceScope =
  | 'color_only'
  | 'texture_only'
  | 'finish_only'
  | 'material_identity_only'
  | 'atmosphere_only'
  | 'do_not_copy_form'
  | 'do_not_copy_composition'
  | 'do_not_copy_architecture';

export type ProjectMaterialRuleReference = {
  id: string;
  name: string;
  dataUrl: string;
  scopes: MaterialRuleReferenceScope[];
  notes?: string;
  createdAt: string;
};

export type ProjectMaterialRule = {
  id: string;
  projectId?: string;
  name: string;
  category: MaterialRuleCategory;
  enabled: boolean;
  protectionLevel: MaterialRuleProtectionLevel;
  description: string;
  approvedCharacteristics: string[];
  forbiddenCharacteristics: string[];
  colorGuidance: string;
  finishGuidance: string;
  usageGuidance: string;
  promptInjection: string;
  qcValidationGuidance: string;
  referenceImages: ProjectMaterialRuleReference[];
  sourceOfTruthNotes?: string;
  priority: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompiledPromptSection = {
  id: string;
  label: string;
  source: string;
  priority: number;
  content: string;
  ruleIds?: string[];
};

export type CompiledPromptTrace = {
  id: string;
  createdAt: string;
  projectProfileId?: string;
  projectProfileName?: string;
  provider?: string;
  model?: string;
  mode?: string;
  sections: CompiledPromptSection[];
  finalPrompt: string;
  negativePrompt?: string;
  activeRuleIds: string[];
  referenceInstructions: string[];
  referencesSent: Array<{ id: string; name: string; ruleId: string; scopes: MaterialRuleReferenceScope[] }>;
  warnings: string[];
};

export type ProjectSourceOfTruth = {
  schemaVersion: 'visual-local-project-source-of-truth-v1';
  profileId: string;
  profileName: string;
  active: boolean;
  materialRules: ProjectMaterialRule[];
  promptPriorityPolicy: string[];
  updatedAt: string;
};

export type VisualLocalAiComposerResponse = {
  schema: 'visual-local-ai-composer-v1';
  sceneAnalysis?: {
    cameraSummary?: string;
    compositionSummary?: string;
    architectureToPreserve?: string[];
    protectedAssetsVisible?: string[];
    materialZones?: Array<{
      name: string;
      location?: string;
      currentAppearance?: string;
      recommendedDirection?: string;
      confidence?: number;
    }>;
    lightingCondition?: string;
    environmentCondition?: string;
    equipmentVisible?: string[];
    signageAndBranding?: string[];
    hallucinationRisks?: string[];
  };
  referenceAnalysis?: Array<{
    referenceId?: string;
    role: string;
    usableDirection: string;
    doNotCopy: string[];
    confidence?: number;
  }>;
  recommendedDirection?: {
    visualDirection?: string;
    lightingDirection?: string;
    materialDirection?: string;
    environmentDirection?: string;
    colorGradeDirection?: string;
    peopleDirection?: string;
  };
  passPlan?: Array<{
    pass:
      | 'analyze_image'
      | 'lock_architecture'
      | 'material_enhancement'
      | 'lighting_direction'
      | 'environment_context'
      | 'human_activity'
      | 'photographic_finish'
      | 'qc_review';
    reason: string;
    priority?: number;
  }>;
  promptPackage?: {
    selectedPass?: string;
    fullPrompt?: string;
    negativePrompt?: string;
    revisionPromptTemplate?: string;
  };
  confidence?: {
    overall?: number;
    notes?: string[];
  };
  renderPassInputAnalysis?: {
    objectIdMap?: Array<{
      colorHex?: string;
      label?: string;
      inferredObjectName: string;
      correspondingBaseRenderLocation?: string;
      preservePriority?: 'critical' | 'high' | 'medium' | 'low';
      confidence?: number;
      notes?: string;
    }>;
    materialIdMap?: Array<{
      colorHex?: string;
      materialName: string;
      correspondingBaseRenderLocation?: string;
      recommendedDirection?: string;
      confidence?: number;
    }>;
    depthAnalysis?: {
      foreground?: string[];
      midground?: string[];
      background?: string[];
      atmosphereNotes?: string;
      confidence?: number;
    };
  };
};

export type AiComposerState = {
  model: string;
  references: SceneReferenceImage[];
  lastResponse?: VisualLocalAiComposerResponse;
  lastRawResponse?: string;
  lastError?: string;
  history: Array<{
    id: string;
    createdAt: string;
    response: VisualLocalAiComposerResponse;
    rawResponse?: string;
  }>;
  appliedAt?: string;
};

export type RenderPromptVersion = {
  id: string;
  passType: RenderPassType;
  versionNumber: number;
  title: string;
  prompt: string;
  negativePrompt?: string;
  adapter?: ModelAdapterId;
  status: RenderPromptVersionStatus;
  createdAt: string;
  updatedAt: string;
  source: RenderPromptVersionSource;
  notes?: string;
  compiledPromptTrace?: CompiledPromptTrace;
  activeMaterialRuleIds?: string[];
};

export type SiteContext = {
  photos: string[];
  structuralColumns: string;
  floorMaterials: string;
  ceiling: string;
  skylight: string;
  ambientLighting: string;
  circulation: string;
  surroundingRetail: string;
  colorTemperature: string;
  mallAtmosphere: string;
  proportions: string;
  architecturalLanguage: string;
  analysisNotes: string;
  generatedAnalysisPrompt: string;
  updatedAt?: string;
};

export type ArchitectureContext = {
  geometry: string;
  layout: string;
  furniture: string;
  materials: string;
  lightingFixtures: string;
  equipment: string;
  signage: string;
  logo: string;
  proportions: string;
  camera: string;
  composition: string;
  analysisNotes: string;
  generatedAnalysisPrompt: string;
  updatedAt?: string;
};

export type BrandContext = {
  references: string[];
  furniture: string;
  materials: string;
  mood: string;
  lighting: string;
  branding: string;
  previousProjects: string;
  brandDna: string;
  analysisNotes: string;
  generatedAnalysisPrompt: string;
  updatedAt?: string;
};

export type ProjectKnowledgeBase = {
  summary: string;
  siteContextSummary: string;
  architectureContextSummary: string;
  brandContextSummary: string;
  materialsContextSummary?: string;
  lightingContextSummary?: string;
  furnitureContextSummary?: string;
  equipmentContextSummary?: string;
  cameraContextSummary?: string;
  protectedAssetsSummary: string;
  lockedAt?: string;
};

export type QcReviewState = {
  cameraPreserved: boolean;
  architecturePreserved: boolean;
  furniturePreserved: boolean;
  lightingFixturesPreserved: boolean;
  equipmentPreserved: boolean;
  materialsPreserved: boolean;
  columnsPreserved: boolean;
  noHallucination: boolean;
  photographicQuality: boolean;
  clientReady: boolean;
  notes: string;
  score: number;
  revisionPrompt: string;
  updatedAt?: string;
};

export type ResultRoundStatus = 'imported' | 'needs_qc' | 'approved' | 'needs_revision' | 'rejected';
export type ResultExternalTool = 'chatgpt' | 'gemini' | 'midjourney' | 'magnific' | 'flux' | 'other';
export type ResultQcValue = boolean | null;
export type ProductionCommentReferenceScope =
  | 'color_only'
  | 'texture_only'
  | 'finish_only'
  | 'material_identity_only'
  | 'atmosphere_only'
  | 'do_not_copy_form'
  | 'do_not_copy_composition'
  | 'do_not_copy_architecture';

export type ProductionReviewComment = {
  id: string;
  number: number;
  projectId?: string;
  sceneId?: string;
  versionId?: string;
  resultId?: string;
  type: 'point' | 'global';
  x?: number;
  y?: number;
  text: string;
  status: 'draft' | 'active' | 'processed' | 'resolved' | 'open';
  tags?: Array<'material' | 'color' | 'lighting' | 'geometry' | 'brand' | 'preserve' | 'environment' | 'people'>;
  createdAt: string;
  updatedAt: string;
  source?: 'manual' | 'copilot';
  processedRevisionIds?: string[];
  resolvedByResultRoundId?: string;
  referenceUsageNote?: string;
  references?: Array<{
    id: string;
    name: string;
    dataUrl: string;
    scopes: ProductionCommentReferenceScope[];
    usageNote?: string;
  }>;
  referenceImage?: string;
  referenceName?: string;
  referenceScopes?: ProductionCommentReferenceScope[];
};

export type ProductionAgentRevisionPlan = {
  id: string;
  status: 'draft' | 'applied';
  createdAt: string;
  updatedAt: string;
  observations: string[];
  restoreFromBase: string[];
  keepFromResult: string[];
  applicableProjectRules: string[];
  suppressedProjectRules: string[];
  commentEvidence: Array<{
    commentId: string;
    commentNumber: number;
    type: 'point' | 'global';
    location?: { x: number; y: number };
    summary: string;
    referenceScopes?: ProductionCommentReferenceScope[];
  }>;
  scopedReferences: Array<{
    commentId: string;
    commentNumber: number;
    name: string;
    scopes: ProductionCommentReferenceScope[];
    usageNote?: string;
  }>;
  finalRevisionPrompt: string;
};
export type GenerationProviderId = 'mock_local' | 'google_lite_image' | 'google_pro_image' | 'gpt_image' | 'comfyui_local';
export type QuickGenerateMode = 'draft' | 'final';
export type QuickPromptPresetCategory = 'lighting' | 'material' | 'protection' | 'photography';
export type AiGenerationUsageStatus = 'success' | 'error' | 'no-image';
export type MaterialIntelligenceCategory =
  | 'wood'
  | 'leather_upholstery'
  | 'brass_metal'
  | 'stone_tile_floor'
  | 'glass'
  | 'painted_ceiling_wall'
  | 'signage_logo'
  | 'lighting_fixtures'
  | 'loose_furniture'
  | 'decorative_props';

export type MaterialIntelligenceZone = {
  id: string;
  category: MaterialIntelligenceCategory;
  label: string;
  likelyMaterialType: string;
  visualRole: string;
  preservationPriority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  enhancementInstruction: string;
  hallucinationRisk: string;
  source: 'heuristic' | 'gemini' | 'protected_asset' | 'user_confirmed';
};

export type MaterialIntelligenceState = {
  updatedAt?: string;
  summary: string;
  zones: MaterialIntelligenceZone[];
};

export type ProtectionPriority = 'critical' | 'high' | 'medium' | 'low';
export type GenerationRuleCategory =
  | 'protection'
  | 'material'
  | 'lighting'
  | 'environment'
  | 'photography'
  | 'hallucination-risk'
  | 'brand/signage';
export type GenerationRuleSource = 'deterministic' | 'vision' | 'user';

export type GenerationRule = {
  id: string;
  label: string;
  category: GenerationRuleCategory;
  priority: ProtectionPriority;
  defaultEnabled: boolean;
  enabled: boolean;
  source: GenerationRuleSource;
  confidence: number;
  reason: string;
  promptInstruction: string;
  negativeInstruction: string;
  affectedTargets: string[];
  createdAt: string;
  sceneHash?: string;
  visionTimestamp?: string;
  stale?: boolean;
};

export type LocalTelemetryEventType =
  | 'deterministic_analysis'
  | 'vision_analysis'
  | 'work_plan_build'
  | 'rule_toggle'
  | 'generate_draft'
  | 'generate_revision'
  | 'review_qc'
  | 'approve'
  | 'needs_revision'
  | 'reject'
  | 'export_handoff';
export type LocalTelemetryStatus = 'success' | 'error' | 'cancelled' | 'no-image';
export type GenerationCostCategory = 'free' | 'vision' | 'lite' | 'pro' | 'mock';

export type LocalTelemetryEvent = {
  eventId: string;
  eventType: LocalTelemetryEventType;
  createdAt: string;
  sceneId: string;
  sceneHash?: string;
  provider?: GenerationProviderId | 'gemini' | 'local';
  model?: string;
  mode: 'quick' | 'work' | 'pro' | 'qc';
  durationMs?: number;
  estimatedCostTHB?: number;
  actualCostTHB?: number;
  imageSize?: string;
  baseImageHash?: string;
  resultRoundId?: string;
  activeGoalIds?: string[];
  activePresetIds?: string[];
  activeRuleIds?: string[];
  workPlanId?: string;
  sceneIntelligenceVersion?: string;
  promptCompilerVersion?: string;
  status: LocalTelemetryStatus;
  errorMessage?: string;
  analysisSource?: 'deterministic' | 'gemini' | 'cached';
  wasCached?: boolean;
  cacheHit?: boolean;
  cacheInvalidatedReason?: string;
  visionModel?: string;
  detectedSceneType?: string;
  detectedMaterials?: string[];
  detectedLightingIssues?: string[];
  detectedProtectionRisks?: string[];
  detectedHallucinationRisks?: string[];
  realismScore?: number;
  photographyScore?: number;
  promptLength?: number;
  promptSectionCount?: number;
  imageInputCount?: number;
  outputImageCount?: number;
  generationCostCategory?: GenerationCostCategory;
  activeRules?: string[];
  activeMaterialRecipes?: string[];
  activeLightingRules?: string[];
  activeProtectionRules?: string[];
  preserveScore?: number;
  photoScore?: number;
  readyScore?: number;
  checklistAnswers?: Record<string, ResultQcValue>;
  deviationNotesCount?: number;
  revisionPromptGenerated?: boolean;
  approved?: boolean;
  rejected?: boolean;
  needsRevision?: boolean;
};

export type SceneIntelligenceState = {
  updatedAt?: string;
  analysisSource?: 'deterministic' | 'gemini_vision' | 'cached_gemini_vision';
  sceneHash?: string;
  visionTimestamp?: string;
  visionModel?: string;
  analysisCostTHB?: number;
  deterministicAnalysis?: {
    imageWidth?: number;
    imageHeight?: number;
    aspectRatio?: string;
    mappedPinsCount: number;
    mappedRegionsCount: number;
    lockedRegionsCount: number;
    materialTags: string[];
    protectedAssets: string[];
    selectedGoals: string[];
    promptPresets: string[];
    quickDesignLocks: string[];
    lightingMode?: string;
    sceneMetadata: string;
  };
  sceneGraph: {
    sceneType: string;
    locationType: string;
    cameraDescription: string;
    designIntent: string;
    keyArchitecturalElements: string[];
    protectedElements: string[];
    visibleMaterials: string[];
    visibleLightingConditions: string[];
    likelyRenderWeaknesses: string[];
  };
  lightingIntelligence: {
    summary: string;
    rules: string[];
  };
  environmentIntelligence: {
    summary: string;
    rules: string[];
  };
  protectionIntelligence: {
    summary: string;
    priorities: Array<{
      priority: ProtectionPriority;
      items: string[];
    }>;
  };
  photographyIntelligence: {
    summary: string;
    rules: string[];
  };
};

export type WorkPlanItem = {
  id: string;
  category: 'lighting' | 'materials' | 'photography' | 'protection' | 'environment' | 'people';
  label: string;
  enabled: boolean;
  source: 'deterministic' | 'vision' | 'user';
};

export type RevisionHistoryEntry = {
  id: string;
  createdAt: string;
  resultRoundId?: string;
  failedItems: string[];
  prompt: string;
};

export type AiGenerationUsageRecord = {
  id: string;
  createdAt: string;
  provider: GenerationProviderId;
  usageKind?: 'deterministic_analysis' | 'vision_analysis' | 'lite_generate' | 'pro_generate' | 'mock_generate' | 'disconnected_generate';
  model: string;
  mode: QuickGenerateMode;
  selectedGoals: string[];
  status: AiGenerationUsageStatus;
  durationMs: number;
  estimatedCostTHB: number;
  resultRoundId?: string;
  errorMessage?: string;
};

export type GoogleLiteDebugState = {
  provider?: string;
  model?: string;
  endpoint?: string;
  responseStatus?: number;
  durationMs?: number;
  rawResponseJson?: unknown;
  detectedImageParts?: Array<{ path: string; mimeType?: string; dataLength?: number; uri?: string }>;
  detectedTextParts?: Array<{ path: string; text: string }>;
  detectedErrorObject?: unknown;
  updatedAt?: string;
};

export type ResultQc = {
  cameraPreserved: ResultQcValue;
  architecturePreserved: ResultQcValue;
  geometryPreserved: ResultQcValue;
  layoutPreserved: ResultQcValue;
  furniturePreserved: ResultQcValue;
  lightingFixturesPreserved: ResultQcValue;
  equipmentPreserved: ResultQcValue;
  logoSignagePreserved: ResultQcValue;
  floorPatternPreserved: ResultQcValue;
  materialZonesPreserved: ResultQcValue;
  protectedAssetsPreserved: ResultQcValue;
  materialImproved: ResultQcValue;
  lightingImproved: ResultQcValue;
  environmentImproved: ResultQcValue;
  photographicQualityImproved: ResultQcValue;
  unwantedObjectsAdded: ResultQcValue;
  notes: string;
  deviationNotes: string[];
  revisionPrompt?: string;
  preservationScore?: number;
  photographicScore?: number;
  hallucinationRisk?: 'low' | 'medium' | 'high';
  clientReadyScore?: number;
};

export type ResultRound = {
  id: string;
  name: string;
  imageDataUrl: string;
  createdAt: string;
  updatedAt: string;
  sourcePassType?: RenderPassType | string;
  sourcePromptVersionId?: string;
  sourcePromptVersionNumber?: number;
  sourceAdapter?: ModelAdapterId | string;
  externalTool?: ResultExternalTool;
  status: ResultRoundStatus;
  notes?: string;
  qc?: ResultQc;
  productionComments?: ProductionReviewComment[];
  processedRevisionPlan?: string[];
  processedRevisionPlanUpdatedAt?: string;
  agentRevisionPlan?: ProductionAgentRevisionPlan;
  parentResultRoundId?: string;
  compiledPromptTrace?: CompiledPromptTrace;
  activeMaterialRuleIds?: string[];
  projectSourceOfTruthSnapshot?: ProjectSourceOfTruth;
  projectProfileSnapshot?: ProjectProfile;
  generalProductionSnapshot?: Pick<GeneralProductionState, 'spaceType' | 'generationIntent' | 'designFreedom' | 'sceneContract' | 'atmosphereRecipe' | 'borrowMaps' | 'activeVisualDirectionVersionId' | 'sceneSetId'>;
  providerCapabilitySnapshot?: ProviderCapabilitySummary;
};

export type ConversationTimelineEntry = {
  id: string;
  type: 'original' | 'user' | 'ai' | 'result';
  createdAt: string;
  text: string;
  resultRoundId?: string;
};

export type RenderPass = {
  id: string;
  type: RenderPassType;
  enabled: boolean;
  title: string;
  objective: string;
  prompt: string;
  status: RenderPassStatus;
  promptVersions: RenderPromptVersion[];
  activeVersionId?: string;
  approvedVersionId?: string;
  updatedAt?: string;
};

export type RenderPassBuilderState = {
  workflowPhase: KnowledgeWorkflowPhase;
  sceneSetup: SceneSetup;
  siteContext: SiteContext;
  architectureContext: ArchitectureContext;
  brandContext: BrandContext;
  productionContext: {
    project: ProductionContextNode;
    materials: ProductionContextNode;
    lighting: ProductionContextNode;
    furniture: ProductionContextNode;
    equipment: ProductionContextNode;
  };
  references: ReferenceAsset[];
  referenceDirection?: ReferenceDirectionState;
  generalProduction?: GeneralProductionState;
  knowledgeConfidence: KnowledgeConfidence;
  cameraSystem: CameraSystem;
  lightingGraph: LightingGraph;
  materialProfiles: MaterialProfiles;
  visualDirectionPreset: VisualDirectionPreset;
  environmentLibraryPreset: EnvironmentLibraryPreset;
  projectKnowledgeBase: ProjectKnowledgeBase;
  designLock: DesignLock;
  protectedAssets: ProtectedDesignAsset[];
  visualDirectionMode: VisualDirectionMode;
  lightingMode: LightingMode;
  environmentMode: EnvironmentMode;
  materialEnhancementLevel: MaterialEnhancementLevel;
  materialTargets: MaterialEnhancementTargets;
  peopleActivityLayer: PeopleActivityLayer;
  passes: RenderPass[];
  selectedPassType?: RenderPassType;
  negativePrompt: string;
  qcReview: QcReviewState;
  revisionCategories: Record<RevisionCategory, boolean>;
  projectMemory: ProjectMemoryEntry[];
  promptVersions: PromptVersionEntry[];
  activePromptVersionId?: string;
  selectedModelAdapter: ModelAdapterId;
  promptVerbosity: PromptVerbosity;
  includeInternalDiagnostics: boolean;
  aiComposer: AiComposerState;
  renderPassInputs: RenderPassInput[];
  activeObjectIdInputId?: string;
  activeMaterialIdInputId?: string;
  activeDepthInputId?: string;
  quickGenerateGoals?: string[];
  quickGenerateProvider?: GenerationProviderId;
  quickGenerateMode?: QuickGenerateMode;
  quickPromptPresets?: Record<QuickPromptPresetCategory, string[]>;
  quickGenerateUsage?: AiGenerationUsageRecord[];
  quickGenerateCreditTHB?: number;
  conversationTimeline?: ConversationTimelineEntry[];
  autoGenerateAfterConfirmation?: boolean;
  googleLiteCostPerImageTHB?: number;
  googleProCostPerImageTHB?: number;
  googleLiteDebug?: GoogleLiteDebugState;
  sceneIntelligence?: SceneIntelligenceState;
  materialIntelligence?: MaterialIntelligenceState;
  sceneHash?: string;
  visionTimestamp?: string;
  visionModel?: string;
  analysisCostTHB?: number;
  analysisSource?: 'deterministic' | 'gemini_vision' | 'cached_gemini_vision';
  workPlan?: WorkPlanItem[];
  approvedWorkPlan?: boolean;
  revisionHistory?: RevisionHistoryEntry[];
  generationRules?: GenerationRule[];
  customRuleNote?: string;
  rulesSceneHash?: string;
  rulesVisionTimestamp?: string;
  localTelemetry?: LocalTelemetryEvent[];
  resultRounds: ResultRound[];
  activeResultRoundId?: string;
  diffFromVersionId?: string;
  diffToVersionId?: string;
  visualDiff: VisualDiffState;
  generatedAt?: string;
  updatedAt?: string;
};

export type SlotEnrichmentSuggestion = {
  id: string;
  code: string;
  confirmedByUser?: boolean;
  inferredName?: string;
  inferredThaiIntent?: string;
  inferredApplyTo?: string;
  inferredFinish?: string;
  inferredTexture?: string;
  inferredAvoid?: string;
  confidence?: string;
  basis?: string;
  status?: 'pending' | 'applied' | 'ignored';
};

export type AiEnrichmentMappingSuggestion = {
  type: 'pin' | 'region';
  normalizedPoint?: { x: number; y: number };
  normalizedRect?: { x: number; y: number; width: number; height: number };
};

export type AiEnrichmentSuggestion = {
  id: string;
  action: 'add_slot' | 'enrich_existing_slot' | 'add_mapping_to_existing_slot';
  slotType?: 'material' | 'materials' | 'prop' | 'props' | 'lighting' | 'environment';
  suggestedCode?: string;
  suggestedName?: string;
  code?: string;
  targetSlotCode?: string;
  targetSlotId?: string;
  thaiDescription?: string;
  englishPromptNote?: string;
  applyTo?: string;
  finish?: string;
  texture?: string;
  avoid?: string | string[];
  creativeFreedom?: CreativeFreedom | 'balanced';
  color?: string;
  confidence?: string;
  basis?: string;
  overwrite?: boolean;
  mappingSuggestion?: AiEnrichmentMappingSuggestion;
  status?: 'pending' | 'applied' | 'ignored';
};

export type OutputSpec = {
  targetUse: string;
  outputPreset: string;
  aspectRatio: string;
  orientation: string;
  targetWidth: number;
  targetHeight: number;
  cropBehavior: string;
  safeAreaPercentage: number;
  needsUpscale: boolean;
  finalFormat: 'jpg' | 'png';
};

export type Scene = {
  id: string;
  name: string;
  type: string;
  baseImage?: string;
  slots: Slot[];
  outputSpec: OutputSpec;
  preserveRules: string;
  atmosphere: string;
  people: { level: PeopleLevel; motionBlur: MotionBlur; behavior: string[]; descriptionThai: string };
  promptDraft: string;
  localPrompt: string;
  packageStatus: string;
  directorNotes: DirectorNotes;
  promptPackages: PromptPackageHistoryEntry[];
  activePromptPackageId?: string;
  revisionPrompts: RevisionPromptEntry[];
  slotEnrichmentSuggestions: SlotEnrichmentSuggestion[];
  aiEnrichmentSuggestions: AiEnrichmentSuggestion[];
  renderPassBuilder: RenderPassBuilderState;
  spaceType?: SpaceType;
  customSpaceTypeLabel?: string;
  sceneGroupId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  updatedAt: string;
  scenes: Scene[];
  activeSceneId: string;
  sourceOfTruth?: ProjectSourceOfTruth;
  profile?: ProjectProfile;
  generalVisualDirectionDefault?: VisualDirectionAnalysis;
  sceneSets?: SceneSet[];
  backupSchemaVersion?: 'visual-local-project-backup-v2';
};

export type HealthStatus = 'healthy' | 'warning' | 'error';
export type PackageHealth = {
  status: HealthStatus;
  summary: {
    slotCount: number;
    refImageCount: number;
    pinsCount: number;
    regionCount: number;
    hasBaseImage: boolean;
    hasMappingOverlay: boolean;
    hasOutputSpec: boolean;
    hasLocalPrompt: boolean;
    byType: Record<SlotCategory, number>;
  };
  warnings: string[];
  errors: string[];
};

export type ImportedPromptPackage = {
  schemaVersion: 'visual-brief-ai-import-v1';
  sourcePackageId?: string;
  sourceSceneId?: string;
  sourceSceneName?: string;
  createdAt?: string;
  assistantName?: string;
  promptPackage: {
    fullRenderPrompt: string;
    shortPrompt: string;
    materialPrompt: string;
    atmospherePrompt: string;
    negativePrompt: string;
    revisionPromptTemplate: string;
    socialPrompt?: string;
    imageGeneratorPrompt?: string;
    midjourneyPrompt?: string;
    chatgptImagePrompt?: string;
  };
  assistantNotes?: {
    summary?: string;
    missingData?: string[];
    risks?: string[];
    recommendedNextStep?: string;
    assumptions?: string[];
  };
  qualityChecklist?: {
    geometryPreservation?: string[];
    materialControl?: string[];
    lightingControl?: string[];
    atmosphereControl?: string[];
    outputSizeControl?: string[];
  };
  revisionGuidance?: {
    howToUse?: string;
    commonFixes?: string[];
    nextRevisionQuestions?: string[];
  };
  slotEnrichment?: Array<{
    code: string;
    confirmedByUser?: boolean;
    inferredName?: string;
    inferredThaiIntent?: string;
    inferredApplyTo?: string;
    inferredFinish?: string;
    inferredTexture?: string;
    inferredAvoid?: string | string[];
    confidence?: string;
    basis?: string;
  }>;
  aiEnrichmentSuggestions?: Array<{
    id?: string;
    action: 'add_slot' | 'enrich_existing_slot' | 'add_mapping_to_existing_slot';
    slotType?: 'material' | 'materials' | 'prop' | 'props' | 'lighting' | 'environment';
    suggestedCode?: string;
    suggestedName?: string;
    code?: string;
    targetSlotCode?: string;
    targetSlotId?: string;
    thaiDescription?: string;
    englishPromptNote?: string;
    applyTo?: string;
    finish?: string;
    texture?: string;
    avoid?: string | string[];
    creativeFreedom?: CreativeFreedom | 'balanced';
    color?: string;
    confidence?: string;
    basis?: string;
    overwrite?: boolean;
    mappingSuggestion?: {
      type?: 'pin' | 'region';
      normalizedPoint?: { x: number; y: number };
      normalizedRect?: { x: number; y: number; width: number; height: number };
    };
  }>;
};

export type PromptPackageHistoryEntry = {
  id: string;
  name: string;
  importedAt: string;
  assistantName?: string;
  sourcePackageId?: string;
  sourceSceneName?: string;
  promptPackage: ImportedPromptPackage['promptPackage'];
  assistantNotes?: ImportedPromptPackage['assistantNotes'];
  qualityChecklist?: ImportedPromptPackage['qualityChecklist'];
  revisionGuidance?: ImportedPromptPackage['revisionGuidance'];
};

export type RevisionPromptEntry = {
  id: string;
  createdAt: string;
  renderPassName: string;
  renderResultNotesThai: string;
  issues: {
    geometry: string;
    material: string;
    lighting: string;
    prop: string;
    people: string;
    atmosphere: string;
    cropSize: string;
  };
  prompt: string;
};
