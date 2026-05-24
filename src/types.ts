export type SlotCategory = 'materials' | 'props' | 'lighting' | 'environment';
export type CreativeFreedom = 'low' | 'medium' | 'high';
export type PeopleLevel = 'none' | 'min' | 'mid' | 'max';
export type MotionBlur = 'none' | 'soft' | 'walking' | 'random';
export type CanvasTool = 'select' | 'pin' | 'rect' | 'move' | 'delete';

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
  pins: Pin[];
  regions: Region[];
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
  promptPackages: PromptPackageHistoryEntry[];
  activePromptPackageId?: string;
  revisionPrompts: RevisionPromptEntry[];
};

export type Project = { id: string; name: string; updatedAt: string; scenes: Scene[]; activeSceneId: string };

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
