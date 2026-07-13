import { useEffect, useMemo, useRef, useState, type DragEvent, type ClipboardEvent as ReactClipboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import JSZip from 'jszip';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text, Group } from 'react-konva';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileJson,
  FolderOpen,
  Gem,
  Home,
  ImagePlus,
  Images,
  Info,
  KeyRound,
  Library,
  Layers,
  Lightbulb,
  MapPin,
  MousePointer,
  Moon,
  Move as MoveIcon,
  Package,
  Palette,
  Rocket,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Upload,
  Users,
  WandSparkles,
  Wrench,
} from 'lucide-react';
import { generateLocalPrompt } from './prompt';
import { loadAllDrafts, loadLatestDraft, saveDraft } from './db';
import { atmospherePresets, outputPresets, preserveRulesPresets, sceneTypePresets, smartRecipes } from './presets';
import { loadImage, resizeDataUrl } from './imageTools';
import {
  ImportedPromptPackage,
  CompiledPromptTrace,
  GenerationProviderId,
  GenerationRule,
  GoogleLiteDebugState,
  PackageHealth,
  AiEnrichmentSuggestion,
  SlotEnrichmentSuggestion,
  CanvasTool,
  OutputSpec,
  Project,
  ProjectMaterialRule,
  ProjectSourceOfTruth,
  MaterialRuleCategory,
  MaterialRuleProtectionLevel,
  MaterialRuleReferenceScope,
  QuickPromptPresetCategory,
  QuickGenerateMode,
  AiGenerationUsageRecord,
  AiGenerationUsageStatus,
  LocalTelemetryEvent,
  ConversationTimelineEntry,
  ProtectedDesignAsset,
  ProductionAgentRevisionPlan,
  ProductionCommentReferenceScope,
  ProductionReviewComment,
  Region,
  RenderPassBuilderState,
  RenderPassType,
  RenderPromptVersion,
  ModelAdapterId,
  ColorLegendEntry,
  RenderPassInput,
  RenderPassInputType,
  ResultQc,
  ResultRound,
  RevisionPromptEntry,
  Scene,
  Slot,
  SlotCategory,
  SceneReferenceImage,
  VisualLocalAiComposerResponse,
} from './types';
import { sceneHealth, zipHealth } from './packageHealth';
import { generateBoards, generateRenderHandoffBoard } from './boardGenerator';
import { buildRevisionPrompt, toHistoryEntry, validatePromptImportJson } from './promptPackage';
import { MIN_REGION_SIZE, normalizeRegionRect, sanitizeSceneMapping } from './mappingCleanup';
import {
  buildRenderPassNegativePrompt,
  buildResultRevisionPrompt,
  buildArchitectureAnalysisPrompt,
  buildBrandAnalysisPrompt,
  buildQcRevisionPrompt,
  buildSiteAnalysisPrompt,
  calculateQcScore,
  calculateResultQc,
  activeRenderPassInputSummary,
  cameraViewOptions,
  combinedPassPrompts,
  defaultRenderPassBuilderState,
  deriveProtectedAssetsFromArchitecture,
  environmentLibraryOptions,
  enabledGeneratedPasses,
  environmentOptions,
  adapterFileSuffix,
  formatPromptForAdapter,
  generateRenderPassPrompts,
  activeGenerationRuleIds,
  activeGenerationRules,
  generationRulesNegativeText,
  generationRulesPromptText,
  getActivePromptVersion,
  getApprovedPromptVersion,
  knowledgePhaseOptions,
  lensOptions,
  lightingOptions,
  materialLevelOptions,
  mergeProjectKnowledgeBase,
  normalizeRenderPassBuilderState,
  peopleLayerOptions,
  defaultResultQc,
  referenceRoleOptions,
  resultImprovementKeys,
  resultPreservationKeys,
  renderPassReferencesText,
  modelAdapterOptions,
  renderPassFileNames,
  renderPassLabels,
  renderPassObjectives,
  renderPassTimeline,
  revisionCategoryOptions,
  telemetrySummary,
  visualDirectionPresetOptions,
  visualDirectionOptions,
} from './renderPassBuilder';
import {
  callGeminiSceneComposer,
  GEMINI_API_KEY_STORAGE_KEY,
  parseGeminiComposerResponse,
  sceneReferenceRoleOptions,
} from './geminiComposer';
import {
  applicableProjectRuleReferences,
  cloneKarunDefaults,
  compileProjectPromptTrace,
  enabledMaterialRules,
  materialRuleNegativeLines,
  materialRulePromptLines,
  normalizeProjectWithSourceOfTruth,
  projectRuleReferenceInstructions,
  referenceScopeLabel,
  scopedColorCastCorrectionLine,
  validateProjectSourceOfTruth,
} from './projectSourceOfTruth';
import { CompiledPromptInspector } from './components/prompt/CompiledPromptInspector';
import { ProjectMaterialRulesSettings } from './components/settings/ProjectMaterialRulesSettings';
import { VisualLocalCopilot } from './features/copilot/VisualLocalCopilotPanel';
import { CopilotActionProposal, CopilotContext } from './features/copilot/visualLocalCopilot';
import beBlankBehindStudioLogo from './assets/be-blank-behind-studio-logo.png';

const baseSpec: OutputSpec = { targetUse: 'ai_review', outputPreset: 'AI Review Small', aspectRatio: '4:3', orientation: 'landscape', targetWidth: 1280, targetHeight: 960, cropBehavior: 'fit', safeAreaPercentage: 8, needsUpscale: false, finalFormat: 'jpg' };
const slotColors = ['#D39D5A', '#5BA6E6', '#8CCB7E', '#D27878', '#C28AE6', '#E0C75A'];
const slotTabs: SlotCategory[] = ['materials', 'props', 'lighting', 'environment'];
const topTabs = [...slotTabs, 'render-pass', 'brief', 'people', 'output', 'boards', 'ai-prompt'] as const;
type ProductionStage = 'project' | 'upload' | 'preview' | 'review' | 'revise' | 'approve';
type ProductionCommentReferenceDraft = {
  id: string;
  name: string;
  dataUrl: string;
  scopes: ProductionCommentReferenceScope[];
  usageNote?: string;
};
type ProductionCommentDraftState = {
  id: string;
  number: number;
  type: 'point' | 'global';
  x?: number;
  y?: number;
  text: string;
  references: ProductionCommentReferenceDraft[];
  referenceUsageNote: string;
  scopes: ProductionCommentReferenceScope[];
  tags: ProductionReviewComment['tags'];
};
const PRODUCTION_STAGE_STORAGE_KEY = 'visual-local-production-stage-v1';
const productionDefaultGoalIds = ['better_materials', 'better_lighting', 'photographic_finish'];
const productionCommentScopeOptions: Array<{ value: ProductionCommentReferenceScope; label: string }> = [
  { value: 'color_only', label: 'Color only' },
  { value: 'texture_only', label: 'Texture only' },
  { value: 'finish_only', label: 'Finish only' },
  { value: 'material_identity_only', label: 'Material identity only' },
  { value: 'atmosphere_only', label: 'Atmosphere only' },
  { value: 'do_not_copy_form', label: 'Do not copy form' },
  { value: 'do_not_copy_composition', label: 'Do not copy composition' },
  { value: 'do_not_copy_architecture', label: 'Do not copy architecture' },
];
const topTabIconMap: Record<(typeof topTabs)[number], typeof Layers> = {
  materials: Palette,
  props: Package,
  lighting: Sparkles,
  environment: Camera,
  'render-pass': WandSparkles,
  brief: FileJson,
  people: Users,
  output: Download,
  boards: Layers,
  'ai-prompt': Bot,
};
const renderPassModeMeta = {
  basic: {
    label: 'Quick Mode',
    shortLabel: 'Quick Mode',
    description: 'Guided cards for fast render handoff',
    icon: Rocket,
  },
  work: {
    label: 'Work Mode',
    shortLabel: 'Work',
    description: 'Analyze once, build a plan, generate many',
    icon: ClipboardCheck,
  },
  advanced: {
    label: 'Professional Mode',
    shortLabel: 'Pro Mode',
    description: 'Full prompt, Gemini, QC, versioning controls',
    icon: Wrench,
  },
  'qc-studio': {
    label: 'QC Studio',
    shortLabel: 'QC',
    description: 'Overlay compare and revision review',
    icon: ClipboardCheck,
  },
} as const;
const quickGenerateGoalCards = [
  { id: 'better_materials', label: 'Better Materials', icon: Palette, passType: 'material_enhancement' as RenderPassType },
  { id: 'better_lighting', label: 'Better Lighting', icon: Lightbulb, passType: 'lighting_direction' as RenderPassType },
  { id: 'better_environment', label: 'Better Environment', icon: Camera, passType: 'environment' as RenderPassType },
  { id: 'add_people', label: 'Add People', icon: Users, passType: 'people' as RenderPassType },
  { id: 'photographic_finish', label: 'Photographic Finish', icon: Sparkles, passType: 'photographic_finish' as RenderPassType },
  { id: 'opening_day', label: 'Opening Day', icon: Sun, passType: 'people' as RenderPassType },
  { id: 'night_view', label: 'Night View', icon: Moon, passType: 'lighting_direction' as RenderPassType },
  { id: 'luxury_mood', label: 'Luxury Mood', icon: Gem, passType: 'photographic_finish' as RenderPassType },
] as const;
const conversationalQuickPrompts = [
  'Improve Materials',
  'Luxury Mood',
  'Opening Day',
  'Night View',
  'Editorial Photo',
  'Replace Poster',
  'Change Flooring',
  'Better Lighting',
  'Add People',
  'Cool Tone',
  'Warm Tone',
] as const;
const quickGenerationAdapters: Array<{
  id: GenerationProviderId;
  label: string;
  status: 'ready' | 'not_connected';
  supportsImageInput: boolean;
  supportsFastPreview: boolean;
  supportsFinalRender: boolean;
  requiresKey: boolean;
  estimatedUseCase: string;
}> = [
  {
    id: 'mock_local',
    label: 'Mock Local',
    status: 'ready',
    supportsImageInput: true,
    supportsFastPreview: true,
    supportsFinalRender: false,
    requiresKey: false,
    estimatedUseCase: 'Local UI testing, version gallery, and QC handoff rehearsal.',
  },
  {
    id: 'google_lite_image',
    label: 'Google Lite Image',
    status: 'not_connected',
    supportsImageInput: true,
    supportsFastPreview: true,
    supportsFinalRender: false,
    requiresKey: true,
    estimatedUseCase: 'Fast low-cost draft previews once connected.',
  },
  {
    id: 'google_pro_image',
    label: 'Google Pro Image',
    status: 'not_connected',
    supportsImageInput: true,
    supportsFastPreview: false,
    supportsFinalRender: true,
    requiresKey: true,
    estimatedUseCase: 'Higher fidelity final render passes once connected.',
  },
  {
    id: 'gpt_image',
    label: 'GPT Image',
    status: 'not_connected',
    supportsImageInput: true,
    supportsFastPreview: true,
    supportsFinalRender: true,
    requiresKey: true,
    estimatedUseCase: 'General image-edit workflows with strict preservation prompts.',
  },
  {
    id: 'comfyui_local',
    label: 'ComfyUI Local',
    status: 'not_connected',
    supportsImageInput: true,
    supportsFastPreview: true,
    supportsFinalRender: true,
    requiresKey: false,
    estimatedUseCase: 'Future local node workflow adapter on this machine.',
  },
];
const quickPromptPresetGroups: Array<{
  category: QuickPromptPresetCategory;
  label: string;
  presets: Array<{ id: string; label: string; instruction: string }>;
}> = [
  {
    category: 'lighting',
    label: 'Lighting',
    presets: [
      { id: 'neutral_mall_lighting', label: 'Neutral Mall Lighting', instruction: 'Use neutral premium mall lighting with balanced white point, realistic ceiling ambience, and no excessive warm cast.' },
      { id: 'warm_retail_lighting_only', label: 'Warm Retail Lighting Only', instruction: 'Use warmth only from retail practical lights and branded focal areas; do not warm the entire image globally.' },
      { id: 'soft_daylight_atrium', label: 'Soft Daylight Atrium', instruction: 'Introduce soft atrium-like daylight with gentle ambient fill while preserving existing mall ceiling and fixtures.' },
      { id: 'evening_retail', label: 'Evening Retail', instruction: 'Create an evening retail feel with controlled ambient warmth, deeper background falloff, and preserved fixture design.' },
      { id: 'premium_editorial', label: 'Premium Editorial', instruction: 'Use premium editorial lighting with soft highlight rolloff, realistic shadow density, and controlled local contrast.' },
    ],
  },
  {
    category: 'material',
    label: 'Material',
    presets: [
      { id: 'material_detail_boost', label: 'Material Detail Boost', instruction: 'Increase material micro-detail, roughness variation, tactile texture, and realistic surface response without changing material types or placement.' },
      { id: 'natural_wood_grain', label: 'Natural Wood Grain', instruction: 'Improve wood with natural grain variation, subtle pores, matte-to-satin finish, and realistic edge detail; avoid flat plastic wood.' },
      { id: 'brass_reflection_control', label: 'Brass Reflection Control', instruction: 'Enhance brass with controlled brushed reflection, warm metallic depth, subtle aging, and realistic highlight streaks; avoid mirror-like gold or yellow paint.' },
      { id: 'glass_reflection_balance', label: 'Glass Reflection Balance', instruction: 'Balance glass reflections so glazing reads realistic and transparent where appropriate, without hiding interior architecture.' },
      { id: 'floor_reflection_balance', label: 'Floor Reflection Balance', instruction: 'Balance floor reflectivity with realistic sheen, contact shadows, and subtle imperfections; avoid wet mirror floor unless already present.' },
    ],
  },
  {
    category: 'protection',
    label: 'Protection',
    presets: [
      { id: 'no_global_yellow_cast', label: 'No Global Yellow Cast', instruction: 'Avoid a global yellow/orange color cast; keep whites, grays, and neutral materials color-correct.' },
      { id: 'preserve_ceiling_white', label: 'Preserve Ceiling White', instruction: 'Keep the mall ceiling and ceiling light areas clean white/neutral, with realistic light emission but no yellow staining.' },
      { id: 'preserve_white_balance', label: 'Preserve White Balance', instruction: 'Preserve neutral white balance across the image; warm accents may exist only where physically motivated.' },
      { id: 'preserve_camera', label: 'Preserve Camera', instruction: 'Preserve the exact camera angle, lens perspective, crop relationship, and composition from the base render.' },
      { id: 'preserve_architecture', label: 'Preserve Architecture', instruction: 'Preserve all architecture, geometry, openings, counters, columns, ceiling, floor pattern, wall lines, and proportions.' },
      { id: 'preserve_furniture', label: 'Preserve Furniture', instruction: 'Preserve furniture count, position, scale, silhouette, and layout; do not replace or invent furniture.' },
      { id: 'preserve_signage', label: 'Preserve Signage', instruction: 'Preserve logo, signage, brand marks, menu boards, and graphic identity without distortion or invented text.' },
    ],
  },
  {
    category: 'photography',
    label: 'Photography',
    presets: [
      { id: 'architectural_editorial', label: 'Architectural Editorial', instruction: 'Make the image feel like real architectural editorial photography with refined composition, lens realism, and polished but believable processing.' },
      { id: 'high_dynamic_range', label: 'High Dynamic Range', instruction: 'Use high dynamic range handling: protect highlights, open shadows naturally, and avoid flat HDR or over-processed contrast.' },
      { id: 'natural_contrast', label: 'Natural Contrast', instruction: 'Use natural contrast with dimensional shadows and soft highlight rolloff; avoid harsh clipping or muddy low contrast.' },
      { id: 'premium_commercial_photography', label: 'Premium Commercial Photography', instruction: 'Target premium commercial photography suitable for client presentation, with crisp detail and realistic color fidelity.' },
      { id: 'real_camera_micro_details', label: 'Real Camera Micro Details', instruction: 'Add subtle real-camera micro details such as fine texture, lens response, clean sharpness falloff, and natural sensor-like tonal response.' },
    ],
  },
];
const quickPromptPresetLookup: Record<string, {
  id: string;
  label: string;
  instruction: string;
  category: QuickPromptPresetCategory;
  categoryLabel: string;
}> = Object.fromEntries(quickPromptPresetGroups.flatMap((group) => group.presets.map((preset) => [preset.id, { ...preset, category: group.category, categoryLabel: group.label }])));
const QUICK_GENERATE_KEY_PREFIX = 'visual-local-generation-key:';
const GOOGLE_LITE_IMAGE_MODEL_ID = 'gemini-3.1-flash-lite-image';
const GOOGLE_PRO_IMAGE_MODEL_ID = 'gemini-3-pro-image';
const PRODUCT_MODE_STORAGE_KEY = 'visual-local-product-mode';
const DEVELOPER_MODE_STORAGE_KEY = 'visual-local-developer-mode';
const productSections = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'assets', label: 'Assets', icon: Library },
  { id: 'studio', label: 'Studio', icon: WandSparkles },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;
type ProductSection = (typeof productSections)[number]['id'];
const categoryPrefix: Record<SlotCategory, string> = { materials: 'M', props: 'P', lighting: 'L', environment: 'E' };
const categoryDefaultName: Record<SlotCategory, string> = {
  materials: 'Untitled Material',
  props: 'Untitled Prop',
  lighting: 'Untitled Lighting',
  environment: 'Untitled Environment',
};
const defaultSlotNamePattern = /^(materials|props|lighting|environment)\s+\d+$|^untitled\s+(material|prop|lighting|environment)$/i;
const boardOptions = [
  { key: 'boards/mapping_overlay_board.png', label: 'Mapping Overlay' },
  { key: 'boards/material_board.png', label: 'Material Board' },
  { key: 'boards/prop_board.png', label: 'Prop Board' },
  { key: 'boards/lighting_board.png', label: 'Lighting Board' },
  { key: 'boards/environment_board.png', label: 'Environment Board' },
  { key: 'boards/atmosphere_board.png', label: 'Atmosphere Board' },
  { key: 'boards/package_summary.png', label: 'Package Summary' },
];
const promptBlockOptions = [
  { key: 'fullRenderPrompt', label: 'Full Render Prompt', copyLabel: 'Copy Full Render Prompt' },
  { key: 'shortPrompt', label: 'Short Prompt', copyLabel: 'Copy Short Prompt' },
  { key: 'materialPrompt', label: 'Material Prompt', copyLabel: 'Copy Material Prompt' },
  { key: 'atmospherePrompt', label: 'Atmosphere Prompt', copyLabel: 'Copy Atmosphere Prompt' },
  { key: 'negativePrompt', label: 'Negative Prompt', copyLabel: 'Copy Negative Prompt' },
  { key: 'revisionPromptTemplate', label: 'Revision Template', copyLabel: 'Copy Revision Template' },
] as const;
const peopleBehaviorOptions = ['candid', 'walking', 'seated', 'staff working', 'retail queue', 'background silhouette'];
const targetUseOptions = ['ai_review', 'client_presentation', 'instagram_carousel', 'website_hero', 'portfolio', 'print_draft'];
const renderPassInputTypeOptions: Array<{ value: RenderPassInputType; label: string }> = [
  { value: 'object_id', label: 'Object ID Pass' },
  { value: 'material_id', label: 'Material ID Pass' },
  { value: 'depth', label: 'Depth Pass' },
  { value: 'normal', label: 'Normal Pass' },
  { value: 'alpha_mask', label: 'Alpha Mask' },
  { value: 'other', label: 'Other' },
];
const materialRuleCategoryOptions: Array<{ value: MaterialRuleCategory; label: string }> = [
  { value: 'wood', label: 'Wood' },
  { value: 'metal', label: 'Metal' },
  { value: 'upholstery', label: 'Upholstery' },
  { value: 'floor', label: 'Floor' },
  { value: 'stone', label: 'Stone' },
  { value: 'solid_surface', label: 'Solid Surface' },
  { value: 'glass', label: 'Glass' },
  { value: 'signage', label: 'Signage' },
  { value: 'paint', label: 'Paint' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'lighting_appearance', label: 'Lighting Appearance' },
  { value: 'brand_accent', label: 'Brand Accent' },
  { value: 'environment_context', label: 'Environment Context' },
  { value: 'custom', label: 'Custom' },
];
const materialRuleProtectionOptions: Array<{ value: MaterialRuleProtectionLevel; label: string }> = [
  { value: 'protected', label: 'Protected' },
  { value: 'strongly_preferred', label: 'Strongly Preferred' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'experimental', label: 'Experimental' },
];
const materialReferenceScopeOptions: Array<{ value: MaterialRuleReferenceScope; label: string }> = [
  { value: 'color_only', label: 'Color only' },
  { value: 'texture_only', label: 'Texture only' },
  { value: 'finish_only', label: 'Finish only' },
  { value: 'material_identity_only', label: 'Material identity only' },
  { value: 'atmosphere_only', label: 'Atmosphere only' },
  { value: 'do_not_copy_form', label: 'Do not copy form' },
  { value: 'do_not_copy_composition', label: 'Do not copy composition' },
  { value: 'do_not_copy_architecture', label: 'Do not copy architecture' },
];
const colorLegendRoleOptions: Array<{ value: ColorLegendEntry['role']; label: string }> = [
  { value: 'protected_asset', label: 'Protected Asset' },
  { value: 'material_zone', label: 'Material Zone' },
  { value: 'environment_zone', label: 'Environment Zone' },
  { value: 'background', label: 'Background' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'signage', label: 'Signage' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'lighting_fixture', label: 'Lighting Fixture' },
  { value: 'unknown', label: 'Unknown' },
];
const protectedAssetPresets: Record<string, string[]> = {
  'Generic Retail': ['Brand Logo', 'Main Counter', 'Product Display', 'Lighting Fixtures', 'Seating', 'Floor Pattern', 'Signage', 'Equipment'],
  'Karun Retail': ['Karun Logo', 'Brass Canopy', 'Globe Lamps', 'Red Leather Bench', 'Thai Tea Slush Machine', 'Digital Menu Totem', 'Counter Geometry', 'Floor Pattern'],
  'Interior Room': ['Camera Angle', 'Built-in Furniture', 'Loose Furniture', 'Ceiling Design', 'Lighting Fixtures', 'Floor Material', 'Wall Material', 'Window / Curtain'],
  'Facade / Exterior': ['Facade Geometry', 'Main Signage', 'Entry Door', 'Window Frames', 'Canopy', 'Ground Level', 'Landscape Edge', 'Adjacent Context'],
};
const defaultDirectorNotes = {
  overallSceneDirection: '',
  materialInterpretationNotes: '',
  lightingAtmosphereNotes: '',
  preserveDoNotChangeNotes: '',
  inferenceMode: 'balanced' as const,
};

function id() { return crypto.randomUUID(); }
function fileToDataURL(file: File) { return new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); }); }
function imageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}
function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
function dataUrlExt(dataUrl: string) {
  if (dataUrl.startsWith('data:image/jpeg')) return 'jpg';
  if (dataUrl.startsWith('data:image/webp')) return 'webp';
  return 'png';
}
function renderPassInputFileName(input: RenderPassInput) {
  const base = input.type === 'object_id' ? 'object_id_pass' : input.type === 'material_id' ? 'material_id_pass' : input.type === 'depth' ? 'depth_pass' : `${input.type}_pass`;
  return `${base}.${dataUrlExt(input.dataUrl)}`;
}
function createScene(name = 'Scene 01'): Scene {
  return {
    id: id(),
    name,
    type: 'Interior',
    baseImage: undefined,
    slots: [],
    outputSpec: { ...baseSpec },
    preserveRules: 'Medium Design Lock',
    atmosphere: 'Soft morning light',
    people: { level: 'none', motionBlur: 'none', behavior: [], descriptionThai: '' },
    promptDraft: '',
    localPrompt: '',
    packageStatus: 'draft',
    directorNotes: {
      overallSceneDirection: '',
      materialInterpretationNotes: '',
      lightingAtmosphereNotes: '',
      preserveDoNotChangeNotes: '',
      inferenceMode: 'balanced',
    },
    promptPackages: [],
    activePromptPackageId: undefined,
    revisionPrompts: [],
    slotEnrichmentSuggestions: [],
    aiEnrichmentSuggestions: [],
    renderPassBuilder: defaultRenderPassBuilderState(),
  };
}
function createInitialProject(): Project {
  const scene = createScene();
  const projectId = id();
  return normalizeProjectWithSourceOfTruth({ id: projectId, name: 'New Project', updatedAt: new Date().toISOString(), scenes: [scene], activeSceneId: scene.id, sourceOfTruth: cloneKarunDefaults(projectId) });
}

function normalizeSceneRuntime(input: Scene): Scene {
  return {
    ...input,
    directorNotes: { ...defaultDirectorNotes, ...(input.directorNotes || {}) },
    promptPackages: input.promptPackages || [],
    revisionPrompts: input.revisionPrompts || [],
    slotEnrichmentSuggestions: (input.slotEnrichmentSuggestions || []).map((item) => ({ ...item, id: item.id || id(), status: item.status || 'pending' })),
    aiEnrichmentSuggestions: (input.aiEnrichmentSuggestions || []).map((item) => ({ ...item, id: item.id || id(), status: item.status || 'pending' })),
    renderPassBuilder: normalizeRenderPassBuilderState(input.renderPassBuilder),
  };
}

function normalizeProjectRuntime(input: Project): Project {
  return normalizeProjectWithSourceOfTruth({
    ...input,
    scenes: (input.scenes || []).map(normalizeSceneRuntime),
  });
}

export default function App() {
  const [project, setProject] = useState<Project>(createInitialProject());
  const [projectsIndex, setProjectsIndex] = useState<Project[]>([]);
  const [productSection, setProductSection] = useState<ProductSection>('studio');
  const [proModeEnabled, setProModeEnabled] = useState(() => localStorage.getItem(PRODUCT_MODE_STORAGE_KEY) === 'pro');
  const [developerModeEnabled, setDeveloperModeEnabled] = useState(() => localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === 'true');
  const [activeTab, setActiveTab] = useState<(typeof topTabs)[number]>('render-pass');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<{ type: 'pin' | 'rect'; slotId: string; id: string } | null>(null);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [draftRect, setDraftRect] = useState<Region | null>(null);
  const [importReview, setImportReview] = useState<any>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [exportResult, setExportResult] = useState<any>(null);
  const [healthAfterImport, setHealthAfterImport] = useState<PackageHealth | null>(null);
  const [boardsPreview, setBoardsPreview] = useState<Record<string, string>>({});
  const [boardsGeneratedAt, setBoardsGeneratedAt] = useState<string>('');
  const [selectedBoardKey, setSelectedBoardKey] = useState<string>('boards/mapping_overlay_board.png');
  const [promptJsonInput, setPromptJsonInput] = useState('');
  const [promptValidation, setPromptValidation] = useState<{ status: 'valid' | 'warning' | 'error'; errors: string[]; warnings: string[]; parsed?: ImportedPromptPackage } | null>(null);
  const [activePromptBlock, setActivePromptBlock] = useState<string>('fullRenderPrompt');
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'warn' } | null>(null);
  const [isBaseDragOver, setIsBaseDragOver] = useState(false);
  const [isRefDragOver, setIsRefDragOver] = useState(false);
  const [slotDrag, setSlotDrag] = useState<{ slotId: string; code: string; color: string; name: string; x: number; y: number; overImage: boolean } | null>(null);
  const [mappingHistory, setMappingHistory] = useState<Array<{ slotId: string; pins: Slot['pins']; regions: Slot['regions'] }[]>>([]);
  const [mappingFuture, setMappingFuture] = useState<Array<{ slotId: string; pins: Slot['pins']; regions: Slot['regions'] }[]>>([]);
  const [bottomWorkspace, setBottomWorkspace] = useState<'boards' | 'prompt' | 'json'>('boards');
  const [revisionDraft, setRevisionDraft] = useState<Omit<RevisionPromptEntry, 'id' | 'createdAt' | 'prompt'>>({
    renderPassName: 'Render Pass 01',
    renderResultNotesThai: '',
    issues: { geometry: '', material: '', lighting: '', prop: '', people: '', atmosphere: '', cropSize: '' },
  });
  const [handoffPreview, setHandoffPreview] = useState<string>('');
  const [renderPassViewMode, setRenderPassViewMode] = useState<'basic' | 'work' | 'advanced' | 'qc-studio'>('basic');
  const [productionStage, setProductionStage] = useState<ProductionStage>(() => {
    const stored = localStorage.getItem(PRODUCTION_STAGE_STORAGE_KEY);
    return stored === 'project' || stored === 'upload' || stored === 'preview' || stored === 'review' || stored === 'revise' || stored === 'approve' ? stored : 'project';
  });
  const [productionCommentMode, setProductionCommentMode] = useState<'off' | 'point' | 'global'>('off');
  const [selectedProductionCommentId, setSelectedProductionCommentId] = useState('');
  const [productionCommentDraft, setProductionCommentDraft] = useState('');
  const [productionGlobalCommentDraft, setProductionGlobalCommentDraft] = useState('');
  const [productionReferenceScopes, setProductionReferenceScopes] = useState<ProductionCommentReferenceScope[]>(['color_only', 'texture_only', 'do_not_copy_form', 'do_not_copy_architecture']);
  const [productionReferenceDraft, setProductionReferenceDraft] = useState<{ name: string; dataUrl: string } | null>(null);
  const [anchoredProductionDraft, setAnchoredProductionDraft] = useState<ProductionCommentDraftState | null>(null);
  const [newProtectedAssetName, setNewProtectedAssetName] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [showGeminiKeyField, setShowGeminiKeyField] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [resultCompareMode, setResultCompareMode] = useState<'slider' | 'overlay' | 'side-by-side' | 'difference' | 'result' | 'base'>('slider');
  const [resultCompareSplit, setResultCompareSplit] = useState(50);
  const [resultOverlayOpacity, setResultOverlayOpacity] = useState(55);
  const [resultDeviationDraft, setResultDeviationDraft] = useState('');
  const [quickGenerateKeyDraft, setQuickGenerateKeyDraft] = useState('');
  const [quickGenerateKeySaved, setQuickGenerateKeySaved] = useState(false);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [quickGenerateError, setQuickGenerateError] = useState('');
  const [showGoogleLiteDebug, setShowGoogleLiteDebug] = useState(false);
  const [showMaterialIntelligence, setShowMaterialIntelligence] = useState(false);
  const [showSceneIntelligence, setShowSceneIntelligence] = useState(false);
  const [lastProductionGeneratedRound, setLastProductionGeneratedRound] = useState<ResultRound | null>(null);
  const [conversationPrompt, setConversationPrompt] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState<'idle' | 'uploading' | 'analyzing' | 'architecture' | 'materials' | 'ready'>('idle');
  const [generationProgress, setGenerationProgress] = useState<'idle' | 'parsed' | 'rules' | 'compiled' | 'calling' | 'received' | 'review'>('idle');
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    request: string;
    goalIds: string[];
    summary: string[];
    protected: string[];
    estimatedCostTHB: number;
  } | null>(null);
  const stageRef = useRef<any>(null);
  const baseImageInputRef = useRef<HTMLInputElement | null>(null);
  const productionCommentImageRef = useRef<HTMLImageElement | null>(null);
  const productionCommentComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const rightInspectorRef = useRef<HTMLElement | null>(null);
  const draftRectRef = useRef<Region | null>(null);
  const renderPassDefaultsAppliedRef = useRef<string>('');
  const lastQuickGeneratedRoundRef = useRef<ResultRound | null>(null);

  const tabLabelMap: Record<(typeof topTabs)[number], string> = {
    materials: 'Materials',
    props: 'Props',
    lighting: 'Lighting',
    environment: 'Environment',
    'render-pass': 'Render Pass Builder',
    brief: 'Brief',
    people: 'People',
    output: 'Output',
    boards: 'Boards',
    'ai-prompt': 'AI Prompt',
  };

  const scene = useMemo(() => project.scenes.find((s) => s.id === project.activeSceneId) || project.scenes[0], [project]);
  const projectSourceOfTruth = useMemo(() => project.sourceOfTruth || normalizeProjectWithSourceOfTruth(project).sourceOfTruth, [project]);
  const activeMaterialRules = useMemo(() => enabledMaterialRules(projectSourceOfTruth), [projectSourceOfTruth]);
  const projectSourceWarnings = useMemo(() => validateProjectSourceOfTruth(projectSourceOfTruth), [projectSourceOfTruth]);
  const selectedSlot = useMemo(() => scene?.slots.find((s) => s.id === selectedSlotId), [scene, selectedSlotId]);
  const activePromptPackage = useMemo(() => scene?.promptPackages?.find((p) => p.id === scene.activePromptPackageId) || null, [scene]);
  const directorNotes = scene?.directorNotes || defaultDirectorNotes;
  const renderPassState = scene?.renderPassBuilder || defaultRenderPassBuilderState();
  const selectedGenerationProviderId = renderPassState.quickGenerateProvider || 'mock_local';
  const selectedGenerationAdapter = quickGenerationAdapters.find((adapter) => adapter.id === selectedGenerationProviderId) || quickGenerationAdapters[0];
  const quickGenerateMode = renderPassState.quickGenerateMode || 'draft';
  const selectedGoogleImageModel = selectedGenerationProviderId === 'google_pro_image' ? GOOGLE_PRO_IMAGE_MODEL_ID : selectedGenerationProviderId === 'google_lite_image' ? GOOGLE_LITE_IMAGE_MODEL_ID : selectedGenerationProviderId;
  const isGoogleImageProvider = selectedGenerationProviderId === 'google_lite_image' || selectedGenerationProviderId === 'google_pro_image';

  useEffect(() => {
    loadLatestDraft().then((d) => d && setProject(normalizeProjectRuntime(d)));
    loadAllDrafts().then((items) => setProjectsIndex(items.map(normalizeProjectRuntime)));
    const storedGeminiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
    setGeminiApiKey(storedGeminiKey);
    setGeminiKeyDraft(storedGeminiKey);
  }, []);
  useEffect(() => {
    if (!selectedGenerationAdapter.requiresKey) {
      setQuickGenerateKeyDraft('');
      setQuickGenerateKeySaved(false);
      return;
    }
    const storedKey = getActiveGenerationApiKey(selectedGenerationAdapter.id);
    setQuickGenerateKeyDraft(storedKey);
    setQuickGenerateKeySaved(Boolean(storedKey));
  }, [selectedGenerationAdapter.id, selectedGenerationAdapter.requiresKey]);
  useEffect(() => { if (scene?.baseImage) loadImage(scene.baseImage).then(setImgObj); else setImgObj(null); }, [scene?.baseImage]);
  useEffect(() => { setSaveStatus('unsaved'); }, [project]);
  useEffect(() => {
    const sceneHashPrefix = `${scene.id}:${scene.name}:${scene.type}:`;
    if (!scene?.baseImage || (renderPassState.sceneHash && renderPassState.sceneHash.startsWith(sceneHashPrefix))) return;
    let cancelled = false;
    buildDeterministicAnalysisPatch(scene.baseImage).then((patch) => {
      if (cancelled) return;
      updateRenderPassBuilder({
        ...patch,
        generationRules: (renderPassState.generationRules || []).map((rule) => ({ ...rule, stale: rule.sceneHash !== patch.sceneHash })),
        localTelemetry: addTelemetryEvent({
          eventType: 'deterministic_analysis',
          mode: 'work',
          provider: 'local',
          model: 'deterministic',
          status: 'success',
          durationMs: 0,
          estimatedCostTHB: 0,
          generationCostCategory: 'free',
          analysisSource: 'deterministic',
          detectedSceneType: renderPassState.sceneIntelligence?.sceneGraph.sceneType,
          detectedMaterials: renderPassState.sceneIntelligence?.sceneGraph.visibleMaterials,
        }),
      });
    });
    return () => { cancelled = true; };
  }, [scene?.id, scene?.baseImage, renderPassState.sceneHash]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markSaved = () => { setSaveStatus('saved'); setLastSavedAt(new Date().toLocaleString()); };

  const updateProject = (next: Project) => setProject({ ...next, updatedAt: new Date().toISOString() });
  const updateProjectSourceOfTruth = (patch: Partial<ProjectSourceOfTruth>) => {
    updateProject({
      ...project,
      sourceOfTruth: {
        ...projectSourceOfTruth,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    });
  };
  const updateMaterialRule = (ruleId: string, patch: Partial<ProjectMaterialRule>) => {
    updateProjectSourceOfTruth({
      materialRules: projectSourceOfTruth.materialRules.map((rule) => rule.id === ruleId ? { ...rule, ...patch, updatedAt: new Date().toISOString() } : rule),
    });
  };
  const addProjectMaterialRule = () => {
    const now = new Date().toISOString();
    const nextRule: ProjectMaterialRule = {
      id: id(),
      projectId: project.id,
      name: 'New Material Rule',
      category: 'custom',
      enabled: true,
      protectionLevel: 'flexible',
      description: '',
      approvedCharacteristics: [],
      forbiddenCharacteristics: [],
      colorGuidance: '',
      finishGuidance: '',
      usageGuidance: '',
      promptInjection: '',
      qcValidationGuidance: '',
      referenceImages: [],
      sourceOfTruthNotes: '',
      priority: 100 + projectSourceOfTruth.materialRules.length,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };
    updateProjectSourceOfTruth({ materialRules: [...projectSourceOfTruth.materialRules, nextRule] });
    showToast('Material rule added.');
  };
  const duplicateProjectMaterialRule = (rule: ProjectMaterialRule) => {
    const now = new Date().toISOString();
    updateProjectSourceOfTruth({
      materialRules: [...projectSourceOfTruth.materialRules, {
        ...rule,
        id: id(),
        name: `${rule.name} Copy`,
        isDefault: false,
        referenceImages: rule.referenceImages.map((ref) => ({ ...ref, id: id() })),
        createdAt: now,
        updatedAt: now,
      }],
    });
    showToast('Material rule duplicated.');
  };
  const deleteProjectMaterialRule = (rule: ProjectMaterialRule) => {
    if (!confirm(`Delete material rule "${rule.name}"?`)) return;
    updateProjectSourceOfTruth({ materialRules: projectSourceOfTruth.materialRules.filter((item) => item.id !== rule.id) });
    showToast('Material rule deleted.');
  };
  const restoreKarunProjectDefaults = () => {
    if (!confirm('Restore Karun default material rules? This replaces the current project material rules.')) return;
    updateProject({ ...project, sourceOfTruth: cloneKarunDefaults(project.id) });
    showToast('Karun defaults restored.');
  };
  const updateRuleListField = (ruleId: string, field: 'approvedCharacteristics' | 'forbiddenCharacteristics', value: string) => {
    updateMaterialRule(ruleId, { [field]: value.split('\n').map((item) => item.trim()).filter(Boolean) } as Partial<ProjectMaterialRule>);
  };
  const addProjectRuleReferences = async (ruleId: string, files: FileList | File[] | null | undefined) => {
    const picked = imageFilesFromList(files);
    if (!picked.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const refs = await Promise.all(picked.map(async (file) => ({
      id: id(),
      name: file.name.replace(/\.[^.]+$/, '') || 'Material reference',
      dataUrl: await fileToDataURL(file),
      scopes: ['material_identity_only', 'do_not_copy_form', 'do_not_copy_composition', 'do_not_copy_architecture'] as MaterialRuleReferenceScope[],
      notes: '',
      createdAt: now,
    })));
    const rule = projectSourceOfTruth.materialRules.find((item) => item.id === ruleId);
    if (!rule) return;
    updateMaterialRule(ruleId, { referenceImages: [...rule.referenceImages, ...refs] });
    showToast(`${refs.length} source-of-truth reference${refs.length > 1 ? 's' : ''} added.`);
  };
  const updateProjectRuleReference = (ruleId: string, refId: string, patch: Partial<ProjectMaterialRule['referenceImages'][number]>) => {
    const rule = projectSourceOfTruth.materialRules.find((item) => item.id === ruleId);
    if (!rule) return;
    updateMaterialRule(ruleId, { referenceImages: rule.referenceImages.map((ref) => ref.id === refId ? { ...ref, ...patch } : ref) });
  };
  const removeProjectRuleReference = (ruleId: string, refId: string) => {
    const rule = projectSourceOfTruth.materialRules.find((item) => item.id === ruleId);
    if (!rule) return;
    updateMaterialRule(ruleId, { referenceImages: rule.referenceImages.filter((ref) => ref.id !== refId) });
  };
  const updateScene = (patch: Partial<Scene>) => {
    setProject((currentProject) => ({
      ...currentProject,
      updatedAt: new Date().toISOString(),
      scenes: currentProject.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)),
    }));
  };
  const updateSlot = (slotId: string, patch: Partial<Slot>) => updateScene({ slots: scene.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)) });
  const showToast = (message: string, tone: 'info' | 'warn' = 'info') => setToast({ message, tone });
  const updateRenderPassBuilder = (patch: Partial<RenderPassBuilderState>) => {
    setProject((currentProject) => {
      const now = new Date().toISOString();
      return {
        ...currentProject,
        updatedAt: now,
        scenes: currentProject.scenes.map((currentScene) => {
          if (currentScene.id !== scene.id) return currentScene;
          const currentBuilder = normalizeRenderPassBuilderState(currentScene.renderPassBuilder);
          return {
            ...currentScene,
            ...({ updatedAt: now } as Partial<Scene>),
            renderPassBuilder: normalizeRenderPassBuilderState({ ...currentBuilder, ...patch, updatedAt: now }),
          };
        }),
      };
    });
  };
  const updateRenderPassBuilderNested = <K extends keyof RenderPassBuilderState>(key: K, patch: Partial<RenderPassBuilderState[K]>) => {
    updateRenderPassBuilder({ [key]: { ...(renderPassState[key] as any), ...patch } } as Partial<RenderPassBuilderState>);
  };
  const localTelemetry = renderPassState.localTelemetry || [];
  const activeRules = activeGenerationRules(renderPassState);
  const activeRuleIds = activeGenerationRuleIds(renderPassState);
  const rulesByGroup = (renderPassState.generationRules || []).reduce<Record<string, GenerationRule[]>>((acc, rule) => {
    const group = rule.priority === 'critical' ? 'Critical Locks' : rule.category === 'material' ? 'Material Rules' : rule.category === 'lighting' ? 'Lighting Rules' : rule.category === 'environment' ? 'Environment Rules' : rule.category === 'photography' ? 'Photography Rules' : rule.category === 'hallucination-risk' ? 'Hallucination Guards' : rule.category === 'brand/signage' ? 'Brand / Signage' : 'Other Rules';
    acc[group] = [...(acc[group] || []), rule];
    return acc;
  }, {});
  const telemetry = telemetrySummary(localTelemetry);
  const todayTelemetry = localTelemetry.filter((event) => new Date(event.createdAt).toDateString() === new Date().toDateString());
  const todayTelemetryCost = todayTelemetry.reduce((sum, event) => sum + (event.estimatedCostTHB || 0), 0);
  const visionTelemetryCost = localTelemetry.filter((event) => event.generationCostCategory === 'vision').reduce((sum, event) => sum + (event.estimatedCostTHB || 0), 0);
  const liteTelemetryCost = localTelemetry.filter((event) => event.generationCostCategory === 'lite').reduce((sum, event) => sum + (event.estimatedCostTHB || 0), 0);
  const proTelemetryCost = localTelemetry.filter((event) => event.generationCostCategory === 'pro').reduce((sum, event) => sum + (event.estimatedCostTHB || 0), 0);
  const addTelemetryEvent = (event: Omit<LocalTelemetryEvent, 'eventId' | 'createdAt' | 'sceneId' | 'sceneHash' | 'activeRuleIds' | 'sceneIntelligenceVersion' | 'promptCompilerVersion'> & {
    createdAt?: string;
    activeRuleIds?: string[];
  }) => {
    const entry: LocalTelemetryEvent = {
      eventId: id(),
      createdAt: event.createdAt || new Date().toISOString(),
      sceneId: scene.id,
      sceneHash: renderPassState.sceneHash,
      activeRuleIds: event.activeRuleIds || activeRuleIds,
      sceneIntelligenceVersion: renderPassState.visionTimestamp || renderPassState.sceneIntelligence?.updatedAt || 'deterministic',
      promptCompilerVersion: 'visual-local-prompt-compiler-v0.8.1',
      ...event,
    };
    return [...localTelemetry, entry];
  };
  const clearLocalTelemetry = () => {
    if (!confirm('Clear local telemetry for this scene?')) return;
    updateRenderPassBuilder({ localTelemetry: [] });
    showToast('Local telemetry cleared.');
  };
  const makeRule = (partial: Omit<GenerationRule, 'id' | 'createdAt' | 'sceneHash' | 'visionTimestamp' | 'enabled'> & { id?: string; enabled?: boolean }): GenerationRule => ({
    id: partial.id || `rule-${partial.category}-${partial.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    createdAt: new Date().toISOString(),
    sceneHash: renderPassState.sceneHash,
    visionTimestamp: renderPassState.visionTimestamp,
    enabled: partial.enabled ?? partial.defaultEnabled,
    ...partial,
  });
  const generateSuggestedRules = (source: GenerationRule['source'] = renderPassState.visionTimestamp ? 'vision' : 'deterministic', stateOverride: RenderPassBuilderState = renderPassState) => {
    const graph = stateOverride.sceneIntelligence?.sceneGraph;
    const materialNames = new Set([...(graph?.visibleMaterials || []), ...(stateOverride.materialIntelligence?.zones || []).map((zone) => zone.label)].map((item) => item.toLowerCase()));
    const hasLeather = Array.from(materialNames).some((item) => item.includes('leather') || item.includes('upholster') || item.includes('bench') || item.includes('seating'));
    const hasWood = Array.from(materialNames).some((item) => item.includes('wood'));
    const protectedText = [...(graph?.protectedElements || []), ...stateOverride.protectedAssets.map((asset) => asset.name)].join(' ').toLowerCase();
    const hasKarun = protectedText.includes('karun') || protectedText.includes('logo') || protectedText.includes('signage');
    const baseRules: GenerationRule[] = [
      makeRule({
        id: 'lock-kiosk-geometry',
        label: 'Lock kiosk geometry',
        category: 'protection',
        priority: 'critical',
        defaultEnabled: true,
        source,
        confidence: 96,
        reason: 'Base render is the source of truth and protected assets are registered.',
        promptInstruction: 'Preserve exact kiosk geometry, counter, canopy, furniture positions, lighting fixture positions, floor pattern, camera, and proportions.',
        negativeInstruction: 'No redesign. No moved objects. No changed proportions. No changed camera.',
        affectedTargets: ['camera', 'kiosk geometry', 'counter', 'canopy', 'furniture', 'lighting fixtures', 'floor pattern'],
      }),
      makeRule({
        id: 'preserve-logo-signage',
        label: hasKarun ? 'Preserve Karun logo/signage' : 'Preserve logo/signage',
        category: 'brand/signage',
        priority: 'critical',
        defaultEnabled: true,
        source,
        confidence: hasKarun ? 94 : 82,
        reason: 'Brand/signage is a high-risk hallucination area in image generation.',
        promptInstruction: 'Preserve logo text, signage position, scale, proportions, and legibility exactly. Retouch clarity only.',
        negativeInstruction: 'No distorted text. No changed logo. No invented brand graphics. No unreadable signage.',
        affectedTargets: ['logo', 'signage', 'brand marks', 'menu text'],
      }),
      makeRule({
        id: 'neutral-white-ceiling-columns',
        label: 'Neutral white ceiling and columns',
        category: 'lighting',
        priority: 'high',
        defaultEnabled: true,
        source,
        confidence: 88,
        reason: 'Scene intelligence identifies global yellow cast and ceiling color shift as likely render risks.',
        promptInstruction: 'Preserve ceiling and columns as clean neutral white with realistic mall ambient light around 5200K-5600K.',
        negativeInstruction: 'No global yellow cast. No orange cinematic grade. No yellow-stained ceiling or columns.',
        affectedTargets: ['ceiling', 'columns', 'white balance', 'mall ambient light'],
      }),
      makeRule({
        id: 'controlled-mall-environment',
        label: 'Controlled mall environment',
        category: 'environment',
        priority: 'medium',
        defaultEnabled: true,
        source,
        confidence: 78,
        reason: 'Environment should support the architecture but not become a redesign.',
        promptInstruction: 'Keep mall background subtle and premium only if environment refinement is selected; treat background as supporting context.',
        negativeInstruction: 'Do not invent a new mall background unless Better Environment is selected. Do not block or replace the architecture.',
        affectedTargets: ['mall background', 'site context', 'environment'],
      }),
      makeRule({
        id: 'architectural-editorial-photo',
        label: 'Architectural editorial photography',
        category: 'photography',
        priority: 'medium',
        defaultEnabled: true,
        source,
        confidence: 86,
        reason: 'Quick Generate target is real architectural photography, not stylized render enhancement.',
        promptInstruction: 'Use architectural editorial photography: natural contrast, realistic dynamic range, clean white balance, real camera response, and subtle micro material detail.',
        negativeInstruction: 'No Instagram filter. No dreamy stylized grade. No generic cinematic look. No plastic CGI look.',
        affectedTargets: ['contrast', 'dynamic range', 'camera response', 'photo realism'],
      }),
      makeRule({
        id: 'hallucination-guard',
        label: 'No hallucinated architecture',
        category: 'hallucination-risk',
        priority: 'critical',
        defaultEnabled: true,
        source,
        confidence: 95,
        reason: 'Image models can invent counters, furniture, lighting, ceiling systems, and props during enhancement.',
        promptInstruction: 'Treat all visible architecture, furniture, equipment, fixtures, floor pattern, and signage as protected unless explicitly marked editable.',
        negativeInstruction: 'No hallucinated furniture. No new counter. No new canopy. No replaced lighting fixtures. No random props.',
        affectedTargets: ['architecture', 'furniture', 'equipment', 'fixtures', 'props'],
      }),
    ];
    if (hasLeather) {
      baseRules.push(makeRule({
        id: 'preserve-leather-upholstery',
        label: 'Preserve leather upholstery',
        category: 'material',
        priority: 'high',
        defaultEnabled: true,
        source,
        confidence: 84,
        reason: 'Leather/upholstery was detected or inferred as a high-risk material conversion area.',
        promptInstruction: 'Preserve the front curved seating as leather/upholstery. Improve leather grain, soft cushion depth, subtle sheen, and upholstery realism.',
        negativeInstruction: 'Do not convert leather/upholstery into wood. Do not replace seating material identity.',
        affectedTargets: ['curved seating', 'leather', 'upholstery'],
      }));
    }
    if (hasWood) {
      baseRules.push(makeRule({
        id: 'natural-wood-grain',
        label: 'Natural wood grain realism',
        category: 'material',
        priority: 'high',
        defaultEnabled: true,
        source,
        confidence: 82,
        reason: 'Wood material realism is a known render weakness for this scene.',
        promptInstruction: 'Improve wood with natural grain variation, pores, panel direction, matte-to-satin finish, and subtle imperfections while preserving placement.',
        negativeInstruction: 'No flat plastic wood. No orange tint. No glossy varnish. Do not spread wood texture onto non-wood zones.',
        affectedTargets: ['wood panels', 'millwork', 'cabinetry'],
      }));
    }
    const previous = new Map((stateOverride.generationRules || []).map((rule) => [rule.id, rule]));
    return baseRules.map((rule) => {
      const existing = previous.get(rule.id);
      const freshRule = { ...rule, sceneHash: stateOverride.sceneHash, visionTimestamp: stateOverride.visionTimestamp };
      return existing ? { ...freshRule, enabled: existing.enabled, createdAt: existing.createdAt, stale: false } : freshRule;
    });
  };
  const updateSuggestedRules = (source?: GenerationRule['source'], extraTelemetry?: Partial<LocalTelemetryEvent>) => {
    const rules = generateSuggestedRules(source);
    const nextTelemetry = extraTelemetry ? addTelemetryEvent({
      eventType: extraTelemetry.eventType || 'deterministic_analysis',
      mode: extraTelemetry.mode || 'work',
      provider: extraTelemetry.provider || 'local',
      model: extraTelemetry.model || 'deterministic',
      status: extraTelemetry.status || 'success',
      durationMs: extraTelemetry.durationMs || 0,
      estimatedCostTHB: extraTelemetry.estimatedCostTHB || 0,
      generationCostCategory: extraTelemetry.generationCostCategory || 'free',
      analysisSource: extraTelemetry.analysisSource,
      wasCached: extraTelemetry.wasCached,
      cacheHit: extraTelemetry.cacheHit,
      detectedSceneType: renderPassState.sceneIntelligence?.sceneGraph.sceneType,
      detectedMaterials: renderPassState.sceneIntelligence?.sceneGraph.visibleMaterials,
      detectedLightingIssues: renderPassState.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses,
      detectedProtectionRisks: renderPassState.sceneIntelligence?.sceneGraph.protectedElements,
      detectedHallucinationRisks: renderPassState.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses,
    }) : localTelemetry;
    updateRenderPassBuilder({
      generationRules: rules,
      rulesSceneHash: renderPassState.sceneHash,
      rulesVisionTimestamp: renderPassState.visionTimestamp,
      localTelemetry: nextTelemetry,
    });
    showToast(`${rules.length} suggested rules generated.`);
  };
  const toggleGenerationRule = (ruleId: string) => {
    const target = (renderPassState.generationRules || []).find((rule) => rule.id === ruleId);
    const nextRules = (renderPassState.generationRules || []).map((rule) => rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule);
    updateRenderPassBuilder({
      generationRules: nextRules,
      localTelemetry: addTelemetryEvent({
        eventType: 'rule_toggle',
        mode: 'work',
        provider: 'local',
        model: 'rule-engine',
        status: 'success',
        durationMs: 0,
        estimatedCostTHB: 0,
        generationCostCategory: 'free',
        activeRuleIds: nextRules.filter((rule) => rule.enabled && !rule.stale).map((rule) => rule.id),
        errorMessage: target ? `${target.label}: ${target.enabled ? 'disabled' : 'enabled'}` : undefined,
      }),
    });
  };
  const hashString = (value: string) => {
    let hash = 2166136261;
    const stride = Math.max(1, Math.floor(value.length / 6000));
    for (let index = 0; index < value.length; index += stride) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${(hash >>> 0).toString(16)}-${value.length}`;
  };
  const quickDesignLockLabels = () => Object.entries(renderPassState.designLock || {})
    .filter(([, value]) => value === true)
    .map(([key]) => key.replace(/^lock/, '').replace(/([A-Z])/g, ' $1').trim());
  const buildDeterministicAnalysisPatch = async (baseImage: string) => {
    const size = await imageSize(baseImage);
    const sceneHash = `${scene.id}:${scene.name}:${scene.type}:${hashString(baseImage)}:${size.width}x${size.height}`;
    const mappedPinsCount = scene.slots.reduce((sum, slot) => sum + (slot.pins?.length || 0), 0);
    const mappedRegionsCount = scene.slots.reduce((sum, slot) => sum + (slot.regions?.length || 0), 0);
    const materialTags = scene.slots.filter((slot) => slot.category === 'materials').map((slot) => `${slot.code} ${slot.name}`.trim());
    const protectedAssets = (renderPassState.protectedAssets || []).filter((asset) => asset.locked || asset.status === 'locked').map((asset) => asset.name);
    const selectedGoals = (renderPassState.quickGenerateGoals || []).map((goalId) => quickGenerateGoalCards.find((goal) => goal.id === goalId)?.label || goalId);
    const promptPresets = selectedQuickPromptPresetLabels;
    const aspectRatio = size.width && size.height ? `${size.width}:${size.height}` : scene.outputSpec.aspectRatio;
    const now = new Date().toISOString();
    return {
      sceneHash,
      analysisSource: 'deterministic' as const,
      visionTimestamp: undefined,
      visionModel: undefined,
      analysisCostTHB: 0,
      approvedWorkPlan: false,
      sceneIntelligence: {
        ...(renderPassState.sceneIntelligence || {}),
        updatedAt: now,
        analysisSource: 'deterministic' as const,
        sceneHash,
        visionTimestamp: undefined,
        visionModel: undefined,
        analysisCostTHB: 0,
        deterministicAnalysis: {
          imageWidth: size.width || undefined,
          imageHeight: size.height || undefined,
          aspectRatio,
          mappedPinsCount,
          mappedRegionsCount,
          lockedRegionsCount: mappedRegionsCount,
          materialTags,
          protectedAssets,
          selectedGoals,
          promptPresets,
          quickDesignLocks: quickDesignLockLabels(),
          lightingMode: renderPassState.lightingMode,
          sceneMetadata: `${scene.name} / ${scene.type} / ${renderPassState.sceneSetup.outputGoal || 'architectural photography retouch'}`,
        },
      },
    };
  };
  useEffect(() => {
    if (activeTab !== 'render-pass' || !scene.baseImage) return;
    if (renderPassDefaultsAppliedRef.current === scene.id) return;
    const hasGeneratedVersions = renderPassState.passes.some((pass) => pass.prompt?.trim() || (pass.promptVersions || []).length);
    if (renderPassState.generatedAt || hasGeneratedVersions || renderPassState.updatedAt) return;
    renderPassDefaultsAppliedRef.current = scene.id;
    updateRenderPassBuilder({
      designLock: {
        ...renderPassState.designLock,
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
      },
      visualDirectionMode: renderPassState.visualDirectionMode || 'premium_retail_editorial',
      lightingMode: renderPassState.lightingMode || 'soft_diffused_daylight',
      environmentMode: 'existing_site',
      materialEnhancementLevel: renderPassState.materialEnhancementLevel || 'premium',
      peopleActivityLayer: 'none',
      selectedModelAdapter: renderPassState.selectedModelAdapter || 'generic',
      selectedPassType: 'material_enhancement',
      passes: renderPassState.passes.map((pass) => ({
        ...pass,
        enabled: ['analyze_architecture', 'material_enhancement', 'photographic_finish'].includes(pass.type),
      })),
    });
    showToast('Safe Render Pass defaults applied.');
  }, [activeTab, scene.baseImage, scene.id]);
  const mappingSnapshot = (slots = scene.slots) => slots.map((slot) => ({
    slotId: slot.id,
    pins: slot.pins.map((pin) => ({ ...pin })),
    regions: slot.regions.map((region) => ({ ...region })),
  }));
  const pushMappingHistory = () => {
    setMappingHistory((items) => [...items.slice(-24), mappingSnapshot()]);
    setMappingFuture([]);
  };
  const restoreMappingSnapshot = (snapshot: { slotId: string; pins: Slot['pins']; regions: Slot['regions'] }[]) => {
    updateScene({
      slots: scene.slots.map((slot) => {
        const match = snapshot.find((item) => item.slotId === slot.id);
        return match ? { ...slot, pins: match.pins.map((pin) => ({ ...pin })), regions: match.regions.map((region) => ({ ...region })) } : slot;
      }),
    });
  };
  const undoMapping = () => {
    const previous = mappingHistory[mappingHistory.length - 1];
    if (!previous) return;
    setMappingHistory((items) => items.slice(0, -1));
    setMappingFuture((items) => [mappingSnapshot(), ...items.slice(0, 24)]);
    restoreMappingSnapshot(previous);
    setSelectedObject(null);
    showToast('Mapping undo applied');
  };
  const redoMapping = () => {
    const next = mappingFuture[0];
    if (!next) return;
    setMappingFuture((items) => items.slice(1));
    setMappingHistory((items) => [...items.slice(-24), mappingSnapshot()]);
    restoreMappingSnapshot(next);
    setSelectedObject(null);
    showToast('Mapping redo applied');
  };
  const resetMapping = () => {
    if (!scene.slots.some((slot) => slot.pins.length || slot.regions.length)) return;
    if (!window.confirm('Clear all pins and rectangle regions for this scene?')) return;
    pushMappingHistory();
    updateScene({ slots: scene.slots.map((slot) => ({ ...slot, pins: [], regions: [] })) });
    setSelectedObject(null);
    showToast('Scene mapping cleared');
  };

  const imageFilesFromList = (files: FileList | File[] | null | undefined) => {
    if (!files) return [] as File[];
    return Array.from(files).filter((file) => file.type.startsWith('image/'));
  };

  const imageFilesFromClipboard = (clipboardData: DataTransfer | null) => {
    if (!clipboardData) return [] as File[];
    const out: File[] = [];
    Array.from(clipboardData.items || []).forEach((item) => {
      if (!item.type.startsWith('image/')) return;
      const file = item.getAsFile();
      if (file) out.push(file);
    });
    return out;
  };

  const addSlotForCategory = (category: SlotCategory) => {
    const list = scene.slots.filter((s) => s.category === category);
    const n = String(list.length + 1).padStart(2, '0');
    const slot: Slot = { id: id(), category, code: `${categoryPrefix[category]}${n}`, name: categoryDefaultName[category], color: slotColors[list.length % slotColors.length], descriptionThai: '', referenceImages: [], creativeFreedom: 'medium', pins: [], regions: [] };
    updateScene({ slots: [...scene.slots, slot] });
    setSelectedSlotId(slot.id);
    setActiveTab(category);
  };
  const addSlot = () => {
    if (!slotTabs.includes(activeTab as SlotCategory)) return;
    addSlotForCategory(activeTab as SlotCategory);
  };

  const getPointerNorm = () => {
    const stage = stageRef.current; if (!stage || !imgObj) return null;
    const p = stage.getPointerPosition(); if (!p) return null;
    return { x: Math.min(1, Math.max(0, p.x / (imgObj.width * zoom))), y: Math.min(1, Math.max(0, p.y / (imgObj.height * zoom))) };
  };
  const getClientNorm = (clientX: number, clientY: number) => {
    const stage = stageRef.current; if (!stage || !imgObj) return null;
    const rect = stage.container().getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    return { x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) };
  };

  const onCanvasClick = () => {
    if (!imgObj) return;
    if (!selectedSlot && (tool === 'pin' || tool === 'rect')) {
      showToast('Select a slot before placing tags.', 'warn');
      return;
    }
    if (!selectedSlot) return;
    const n = getPointerNorm(); if (!n) return;
    if (tool === 'pin') {
      const newPin = { id: id(), slotId: selectedSlot.id, x: n.x, y: n.y };
      pushMappingHistory();
      updateSlot(selectedSlot.id, { pins: [...selectedSlot.pins, newPin] });
      setSelectedObject({ type: 'pin', slotId: selectedSlot.id, id: newPin.id });
    }
    if (tool === 'delete' && selectedObject) {
      deleteSelectedObject();
    }
  };

  const onDown = (point?: { x: number; y: number } | null) => {
    if (tool !== 'rect') return;
    if (!selectedSlot) {
      showToast('Select a slot before placing tags.', 'warn');
      return;
    }
    const n = point || getPointerNorm();
    if (!n) return;
    const rectDraft = { id: id(), slotId: selectedSlot.id, type: 'rect' as const, x: n.x, y: n.y, width: 0, height: 0 };
    draftRectRef.current = rectDraft;
    setDraftRect(rectDraft);
  };
  const onMove = (point?: { x: number; y: number } | null) => {
    const activeDraft = draftRectRef.current;
    if (tool !== 'rect' || !activeDraft) return;
    const n = point || getPointerNorm();
    if (!n) return;
    const nextDraft = normalizeRegionRect(activeDraft.x, activeDraft.y, n.x, n.y, activeDraft.id, activeDraft.slotId);
    draftRectRef.current = nextDraft;
    setDraftRect(nextDraft);
  };
  const onUp = () => {
    const finishedDraft = draftRectRef.current;
    if (tool !== 'rect' || !finishedDraft) return;
    const slot = scene.slots.find((s) => s.id === finishedDraft.slotId);
    if (!slot) {
      draftRectRef.current = null;
      setDraftRect(null);
      return;
    }
    if (finishedDraft.width < MIN_REGION_SIZE || finishedDraft.height < MIN_REGION_SIZE) {
      draftRectRef.current = null;
      setDraftRect(null);
      return;
    }
    pushMappingHistory();
    updateSlot(slot.id, { regions: [...slot.regions, finishedDraft] });
    setSelectedSlotId(slot.id);
    setSelectedObject({ type: 'rect', slotId: slot.id, id: finishedDraft.id });
    draftRectRef.current = null;
    setDraftRect(null);
    showToast(`${slot.code} region added`);
  };
  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'rect') return;
    event.preventDefault();
    onDown(getClientNorm(event.clientX, event.clientY));
  };
  const onCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'rect') return;
    onMove(getClientNorm(event.clientX, event.clientY));
  };
  const onCanvasPointerUp = () => {
    if (tool !== 'rect') return;
    onUp();
  };

  const addReferenceFilesToSlot = async (slot: Slot, files: File[]) => {
    const imageFiles = imageFilesFromList(files);
    if (!imageFiles.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const refs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));
    updateSlot(slot.id, { referenceImages: [...slot.referenceImages, ...refs] });
    showToast(`Reference image added to ${slot.code}`);
  };

  const onBaseUpload = async (f?: File, source: 'upload' | 'drop' | 'paste' = 'upload') => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const tick = (state: typeof analysisProgress) => {
      setAnalysisProgress(state);
      return new Promise((resolve) => window.setTimeout(resolve, 140));
    };
    await tick('uploading');
    const baseImage = await fileToDataURL(f);
    await tick('analyzing');
    await tick('architecture');
    await tick('materials');
    const deterministicPatch = await buildDeterministicAnalysisPatch(baseImage);
    updateScene({
      baseImage,
      renderPassBuilder: normalizeRenderPassBuilderState({
        ...renderPassState,
        ...deterministicPatch,
        generationRules: (renderPassState.generationRules || []).map((rule) => ({ ...rule, stale: true })),
        localTelemetry: addTelemetryEvent({
          eventType: 'deterministic_analysis',
          mode: 'work',
          provider: 'local',
          model: 'deterministic',
          status: 'success',
          durationMs: 0,
          estimatedCostTHB: 0,
          generationCostCategory: 'free',
          analysisSource: 'deterministic',
        }),
        updatedAt: new Date().toISOString(),
      }),
    });
    if (baseImageInputRef.current) baseImageInputRef.current.value = '';
    setAnalysisProgress('ready');
    showToast(source === 'paste' ? 'Base image added from clipboard' : 'Base image uploaded');
  };

  const onRefUpload = async (f?: File, files?: FileList | File[]) => {
    if (!selectedSlot) {
      showToast('Select a slot before pasting reference images.', 'warn');
      return;
    }
    const picked = imageFilesFromList(files || (f ? [f] : []));
    if (!picked.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    await addReferenceFilesToSlot(selectedSlot, picked);
  };
  const onSaveDraft = async () => {
    await saveDraft(project);
    markSaved();
    const drafts = await loadAllDrafts();
    setProjectsIndex(drafts.map(normalizeProjectRuntime));
  };
  const sanitizeCurrentScene = () => {
    const sanitized = sanitizeSceneMapping(scene);
    if (sanitized.changed) {
      updateScene({ slots: sanitized.scene.slots });
    }
    return sanitized.scene;
  };
  const onGeneratePrompt = () => {
    const cleanedScene = sanitizeCurrentScene();
    updateScene({ slots: cleanedScene.slots, localPrompt: generateLocalPrompt(cleanedScene, projectSourceOfTruth) });
  };
  const onCopyPrompt = async () => { if (scene.localPrompt) await navigator.clipboard.writeText(scene.localPrompt); };
  const onGenerateRenderPassPrompts = () => {
    if (!scene.baseImage) {
      showToast('Upload a base render first.', 'warn');
      return;
    }
    if (!renderPassState.passes.some((pass) => pass.enabled)) {
      showToast('Select at least one pass.', 'warn');
      return;
    }
    const nextState = generateRenderPassPrompts(renderPassState, scene, projectSourceOfTruth);
    updateScene({ renderPassBuilder: nextState });
    showToast('Render pass prompts generated.');
  };
  const addKnowledgeImages = async (target: 'site' | 'brand', files: FileList | File[] | null | undefined) => {
    const picked = imageFilesFromList(files);
    if (!picked.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const refs = await Promise.all(picked.map((file) => fileToDataURL(file)));
    if (target === 'site') {
      updateRenderPassBuilderNested('siteContext', { photos: [...renderPassState.siteContext.photos, ...refs], updatedAt: new Date().toISOString() });
      showToast(`${picked.length} site photo${picked.length > 1 ? 's' : ''} added.`);
    } else {
      updateRenderPassBuilderNested('brandContext', { references: [...renderPassState.brandContext.references, ...refs], updatedAt: new Date().toISOString() });
      showToast(`${picked.length} brand reference${picked.length > 1 ? 's' : ''} added.`);
    }
  };
  const removeKnowledgeImage = (target: 'site' | 'brand', index: number) => {
    if (target === 'site') updateRenderPassBuilderNested('siteContext', { photos: renderPassState.siteContext.photos.filter((_, itemIndex) => itemIndex !== index), updatedAt: new Date().toISOString() });
    else updateRenderPassBuilderNested('brandContext', { references: renderPassState.brandContext.references.filter((_, itemIndex) => itemIndex !== index), updatedAt: new Date().toISOString() });
  };
  const addReferenceAssets = async (role: any, files: FileList | File[] | null | undefined) => {
    const picked = imageFilesFromList(files);
    if (!picked.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const refs = await Promise.all(picked.map(async (file) => ({
      id: id(),
      role,
      image: await fileToDataURL(file),
      label: file.name.replace(/\.[^.]+$/, ''),
      notes: '',
      confidence: 70,
      createdAt: now,
    })));
    updateRenderPassBuilder({ references: [...renderPassState.references, ...refs] });
    showToast(`${picked.length} ${role} reference${picked.length > 1 ? 's' : ''} added.`);
  };
  const updateReferenceAsset = (refId: string, patch: any) => {
    updateRenderPassBuilder({ references: renderPassState.references.map((ref) => ref.id === refId ? { ...ref, ...patch } : ref) });
  };
  const deleteReferenceAsset = (refId: string) => {
    updateRenderPassBuilder({ references: renderPassState.references.filter((ref) => ref.id !== refId) });
  };
  const generateAnalysisPrompt = (target: 'site' | 'architecture' | 'brand') => {
    if (target === 'site') {
      updateRenderPassBuilder({ siteContext: { ...renderPassState.siteContext, generatedAnalysisPrompt: buildSiteAnalysisPrompt(renderPassState), updatedAt: new Date().toISOString() }, workflowPhase: 'site_analysis' });
      showToast('Site analysis prompt generated.');
    }
    if (target === 'architecture') {
      updateRenderPassBuilder({ architectureContext: { ...renderPassState.architectureContext, generatedAnalysisPrompt: buildArchitectureAnalysisPrompt(renderPassState), updatedAt: new Date().toISOString() }, workflowPhase: 'architecture_analysis' });
      showToast('Architecture analysis prompt generated.');
    }
    if (target === 'brand') {
      updateRenderPassBuilder({ brandContext: { ...renderPassState.brandContext, generatedAnalysisPrompt: buildBrandAnalysisPrompt(renderPassState), updatedAt: new Date().toISOString() }, workflowPhase: 'brand_analysis' });
      showToast('Brand analysis prompt generated.');
    }
  };
  const copyKnowledgePrompt = async (text?: string) => {
    if (!text?.trim()) return;
    await navigator.clipboard.writeText(text);
    showToast('Analysis prompt copied.');
  };
  const lockProjectKnowledge = () => {
    const nextKnowledge = mergeProjectKnowledgeBase(renderPassState);
    updateRenderPassBuilder({ projectKnowledgeBase: nextKnowledge, workflowPhase: 'knowledge_lock' });
    showToast('Project Knowledge Base locked.');
  };
  const generateArchitectureLock = () => {
    const protectedAssets = deriveProtectedAssetsFromArchitecture(renderPassState);
    updateRenderPassBuilder({
      protectedAssets,
      designLock: {
        ...renderPassState.designLock,
        lockCamera: true,
        lockArchitecture: true,
        lockGeometry: true,
        lockFurniture: true,
        lockEquipment: true,
        lockLightingFixtures: true,
        lockMaterials: true,
        lockLogoSignage: true,
        lockColumns: true,
        lockComposition: true,
      },
    });
    showToast('Architecture lock generated.');
  };
  const updateQcReview = (patch: Partial<typeof renderPassState.qcReview>) => {
    const next = { ...renderPassState.qcReview, ...patch, updatedAt: new Date().toISOString() };
    updateRenderPassBuilder({ qcReview: { ...next, score: calculateQcScore(next) } });
  };
  const generateQcRevision = () => {
    const selectedCategories = revisionCategoryOptions.filter((item) => renderPassState.revisionCategories[item.value]).map((item) => item.label);
    const categoryText = selectedCategories.length ? `\n\nOne-click revision categories:\n${selectedCategories.map((item) => `- ${item}`).join('\n')}` : '';
    const next = { ...renderPassState.qcReview, score: calculateQcScore(renderPassState.qcReview), revisionPrompt: `${buildQcRevisionPrompt(renderPassState, projectSourceOfTruth)}${categoryText}`, updatedAt: new Date().toISOString() };
    updateRenderPassBuilder({ qcReview: next, workflowPhase: 'qc_review' });
    showToast('QC revision prompt generated.');
  };
  const savePromptVersion = () => {
    const prompt = selectedRenderPass?.prompt || scene.localPrompt;
    if (!prompt?.trim()) {
      showToast('Generate a prompt before saving a version.', 'warn');
      return;
    }
    const nextVersion = (renderPassState.promptVersions.reduce((max, item) => Math.max(max, item.version), 0) || 0) + 1;
    const presetNote = selectedQuickPromptPresetLabels.length ? ` Prompt presets: ${selectedQuickPromptPresetLabels.join(', ')}.` : '';
    const entry = { id: id(), version: nextVersion, passType: selectedRenderPass?.type, prompt, createdAt: new Date().toISOString(), notes: `${selectedRenderPass?.title || 'Local prompt'}${presetNote}` };
    updateRenderPassBuilder({ promptVersions: [...renderPassState.promptVersions, entry], activePromptVersionId: entry.id });
    showToast(`Prompt v${nextVersion} saved.`);
  };
  const restorePromptVersion = (versionId: string) => {
    const version = renderPassState.promptVersions.find((item) => item.id === versionId);
    if (!version) return;
    updateRenderPassBuilder({ activePromptVersionId: version.id });
    navigator.clipboard.writeText(version.prompt);
    showToast(`Prompt v${version.version} copied for rollback.`);
  };
  const addProjectMemoryEntry = () => {
    updateRenderPassBuilder({
      projectMemory: [...renderPassState.projectMemory, { id: id(), label: `Revision ${renderPassState.projectMemory.length + 1}`, status: 'revision', notes: '', promptVersionId: renderPassState.activePromptVersionId, createdAt: new Date().toISOString() }],
    });
  };
  const activePromptTextForPass = (passType: RenderPassType) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const version = getActivePromptVersion(pass);
    const prompt = version?.prompt || pass?.prompt || '';
    return pass ? formatPromptForAdapter(prompt, renderPassState.selectedModelAdapter || 'generic', renderPassState, pass) : prompt;
  };
  const updateRenderPass = (passType: RenderPassType, updater: (pass: typeof renderPassState.passes[number]) => typeof renderPassState.passes[number]) => {
    updateRenderPassBuilder({ passes: renderPassState.passes.map((item) => item.type === passType ? updater(item) : item) });
  };
  const setActivePassVersion = (passType: RenderPassType, versionId: string) => {
    updateRenderPass(passType, (pass) => {
      const version = pass.promptVersions.find((item) => item.id === versionId);
      return { ...pass, activeVersionId: versionId, prompt: version?.prompt || pass.prompt, updatedAt: new Date().toISOString() };
    });
  };
  const approveActivePassVersion = (passType: RenderPassType) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const version = getActivePromptVersion(pass);
    if (!pass || !version) {
      showToast('Generate a prompt version before approving.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    updateRenderPass(passType, (item) => ({
      ...item,
      status: 'approved',
      approvedVersionId: version.id,
      activeVersionId: version.id,
      promptVersions: item.promptVersions.map((entry) => entry.id === version.id ? { ...entry, status: 'approved', updatedAt: now } : entry),
      updatedAt: now,
    }));
    showToast(`${pass.title} v${version.versionNumber} approved.`);
  };
  const duplicateActivePassVersion = (passType: RenderPassType) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const version = getActivePromptVersion(pass);
    if (!pass || !version) {
      showToast('Select a prompt version to duplicate.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const nextNumber = (pass.promptVersions || []).reduce((max, item) => Math.max(max, item.versionNumber || 0), 0) + 1;
    const duplicate: RenderPromptVersion = {
      ...version,
      id: id(),
      versionNumber: nextNumber,
      title: `${pass.title} v${nextNumber}`,
      status: 'draft',
      source: 'duplicated',
      createdAt: now,
      updatedAt: now,
      notes: `Duplicated from v${version.versionNumber}`,
    };
    updateRenderPass(passType, (item) => ({ ...item, promptVersions: [...item.promptVersions, duplicate], activeVersionId: duplicate.id, prompt: duplicate.prompt, status: 'draft', updatedAt: now }));
    showToast(`Duplicated as v${nextNumber}.`);
  };
  const archiveActivePassVersion = (passType: RenderPassType) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const version = getActivePromptVersion(pass);
    if (!pass || !version) return;
    const now = new Date().toISOString();
    const remainingVersions = pass.promptVersions.filter((item) => item.id !== version.id && item.status !== 'archived');
    const nextActive = remainingVersions[remainingVersions.length - 1];
    updateRenderPass(passType, (item) => ({
      ...item,
      promptVersions: item.promptVersions.map((entry) => entry.id === version.id ? { ...entry, status: 'archived', updatedAt: now } : entry),
      activeVersionId: nextActive?.id,
      prompt: nextActive?.prompt || '',
      updatedAt: now,
    }));
    showToast(`v${version.versionNumber} archived.`);
  };
  const updateActivePassVersionNotes = (passType: RenderPassType, notes: string) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const version = getActivePromptVersion(pass);
    if (!version) return;
    updateRenderPass(passType, (item) => ({
      ...item,
      promptVersions: item.promptVersions.map((entry) => entry.id === version.id ? { ...entry, notes, updatedAt: new Date().toISOString() } : entry),
    }));
  };
  const markSelectedPassNeedsRevision = (passType: RenderPassType) => {
    updateRenderPass(passType, (pass) => ({ ...pass, status: 'needs_revision', updatedAt: new Date().toISOString() }));
    showToast('Pass marked needs revision.');
  };
  const copyRenderPassPrompt = async (passType: RenderPassType) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const text = activePromptTextForPass(passType);
    if (!pass || !text.trim()) return;
    await navigator.clipboard.writeText(text);
    updateRenderPassBuilder({ passes: renderPassState.passes.map((item) => item.type === passType ? { ...item, status: 'copied', updatedAt: new Date().toISOString() } : item) });
    showToast(`${pass.title} copied.`);
  };
  const copyRenderPassNegativePrompt = async (passType?: RenderPassType) => {
    const text = passType ? buildRenderPassNegativePrompt(renderPassState, passType, projectSourceOfTruth) : (renderPassState.negativePrompt || buildRenderPassNegativePrompt(renderPassState, undefined, projectSourceOfTruth));
    await navigator.clipboard.writeText(text);
    showToast('Negative prompt copied.');
  };
  const markRenderPassUsed = (passType: RenderPassType) => {
    updateRenderPassBuilder({ passes: renderPassState.passes.map((item) => item.type === passType ? { ...item, status: 'exported', updatedAt: new Date().toISOString() } : item) });
    showToast('Pass marked as used.');
  };
  const exportRenderPassPromptTxt = (passType: RenderPassType) => {
    const pass = renderPassState.passes.find((item) => item.type === passType);
    const text = activePromptTextForPass(passType);
    if (!pass || !text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = renderPassFileNames[passType];
    a.click();
    URL.revokeObjectURL(a.href);
    updateRenderPassBuilder({ passes: renderPassState.passes.map((item) => item.type === passType ? { ...item, status: 'exported', updatedAt: new Date().toISOString() } : item) });
  };
  const activeResultRound = renderPassState.resultRounds.find((round) => round.id === renderPassState.activeResultRoundId) || renderPassState.resultRounds[renderPassState.resultRounds.length - 1] || null;
  const updateResultRound = (roundId: string, patch: Partial<ResultRound>) => {
    updateRenderPassBuilder({
      resultRounds: renderPassState.resultRounds.map((round) => {
        if (round.id !== roundId) return round;
        const nextQc = patch.qc ? calculateResultQc({ ...defaultResultQc, ...patch.qc }) : round.qc;
        return { ...round, ...patch, qc: nextQc, updatedAt: new Date().toISOString() };
      }),
    });
  };
  const toggleQuickGenerateGoal = (goalId: string) => {
    const current = renderPassState.quickGenerateGoals || [];
    updateRenderPassBuilder({
      quickGenerateGoals: current.includes(goalId) ? current.filter((item) => item !== goalId) : [...current, goalId],
    });
  };
  const selectedQuickPromptPresetIds = quickPromptPresetGroups.flatMap((group) => renderPassState.quickPromptPresets?.[group.category] || []);
  const selectedQuickPromptPresetLabels = selectedQuickPromptPresetIds.map((presetId) => quickPromptPresetLookup[presetId]?.label).filter(Boolean);
  const selectedQuickPromptInstructions = selectedQuickPromptPresetIds.map((presetId) => quickPromptPresetLookup[presetId]?.instruction).filter(Boolean);
  const selectedQuickGenerateGoals = quickGenerateGoalCards.filter((goal) => (renderPassState.quickGenerateGoals || []).includes(goal.id));
  const selectedQuickGenerateGoalLabels = selectedQuickGenerateGoals.map((goal) => goal.label);
  const parseConversationIntent = (text: string) => {
    const lower = text.toLowerCase();
    const ids = new Set<string>();
    if (/premium|luxury|realism|realistic|material|wood|brass|leather|marble|finish|richer|texture/.test(lower)) ids.add('better_materials');
    if (/light|daylight|warm|cool|night|evening|shadow|ambient|bright/.test(lower)) ids.add('better_lighting');
    if (/environment|background|mall|site|context|opening day/.test(lower)) ids.add('better_environment');
    if (/people|customer|staff|crowd|opening day/.test(lower)) ids.add('add_people');
    if (/photo|editorial|photographic|camera|real|polish|premium|luxury/.test(lower)) ids.add('photographic_finish');
    if (/opening day/.test(lower)) ids.add('opening_day');
    if (/night|evening/.test(lower)) ids.add('night_view');
    if (/luxury|premium|quiet luxury/.test(lower)) ids.add('luxury_mood');
    if (!ids.size) ids.add('photographic_finish');
    return Array.from(ids);
  };
  const appendConversationPrompt = (text: string) => {
    setConversationPrompt((current) => current.trim() ? `${current.trim()}\n${text}` : text);
  };
  const appendConversationTimeline = (entries: Array<Omit<ConversationTimelineEntry, 'id' | 'createdAt'>>) => {
    const now = new Date().toISOString();
    updateRenderPassBuilder({
      conversationTimeline: [
        ...(renderPassState.conversationTimeline || []),
        ...entries.map((entry) => ({ ...entry, id: id(), createdAt: now })),
      ],
    });
  };
  const buildConversationSummary = (text: string, goalIds: string[]) => {
    const lower = text.toLowerCase();
    const summary: string[] = [];
    if (goalIds.includes('better_materials')) summary.push('Improve material realism, surface detail, and tactile finish.');
    if (goalIds.includes('better_lighting')) summary.push('Improve lighting balance while avoiding a global color cast.');
    if (goalIds.includes('better_environment')) summary.push('Refine the surrounding environment without redesigning the project.');
    if (goalIds.includes('add_people')) summary.push('Add human activity only as a supporting layer.');
    if (goalIds.includes('photographic_finish')) summary.push('Apply an editorial architectural photography finish.');
    if (/floor|marble|tile|พื้น|หิน/.test(lower)) summary.push('Treat the floor as the focused editable material target.');
    if (/logo|sign|karun|ป้าย/.test(lower)) summary.push('Preserve logo/signage legibility and position.');
    if (!summary.length) summary.push('Improve the render quality while preserving the approved design.');
    return Array.from(new Set(summary));
  };
  const requestConversationConfirmation = () => {
    const text = conversationPrompt.trim() || 'Improve realism with architectural photography finish.';
    const goalIds = parseConversationIntent(text);
    const summary = buildConversationSummary(text, goalIds);
    const protectedItems = ['Camera', 'Architecture', 'Geometry', 'Logo/signage', 'Furniture positions'];
    const estimated = selectedGenerationAdapter.id === 'google_lite_image' ? googleLiteCostPerImage : selectedGenerationAdapter.id === 'google_pro_image' ? googleProCostPerImage : 0;
    setPendingConfirmation({ request: text, goalIds, summary, protected: protectedItems, estimatedCostTHB: estimated });
    const now = new Date().toISOString();
    updateRenderPassBuilder({
      quickGenerateGoals: goalIds as any,
      conversationTimeline: [
        ...(renderPassState.conversationTimeline || []),
        { id: id(), type: 'user', createdAt: now, text },
        { id: id(), type: 'ai', createdAt: now, text: `I understand. I will ${summary.map((item) => item.replace(/\.$/, '').toLowerCase()).join(', ')} while keeping ${protectedItems.slice(0, 3).join(', ')} locked.` },
      ],
    });
    if (renderPassState.autoGenerateAfterConfirmation) {
      window.setTimeout(() => generateFromConversationConfirmation({ request: text, goalIds, summary, protected: protectedItems, estimatedCostTHB: estimated }), 0);
    }
  };
  const generateFromConversationConfirmation = async (confirmation = pendingConfirmation) => {
    if (!confirmation) return;
    setGenerationProgress('parsed');
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setGenerationProgress('rules');
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setGenerationProgress('compiled');
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setGenerationProgress('calling');
    await createQuickPreview(confirmation.goalIds, confirmation.request);
    setGenerationProgress('received');
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setGenerationProgress('review');
    setPendingConfirmation(null);
  };
  const toggleQuickPromptPreset = (category: QuickPromptPresetCategory, presetId: string) => {
    const current = renderPassState.quickPromptPresets?.[category] || [];
    updateRenderPassBuilder({
      quickPromptPresets: {
        ...(renderPassState.quickPromptPresets || {}),
        [category]: current.includes(presetId) ? current.filter((item) => item !== presetId) : [...current, presetId],
      },
    });
  };
  const saveQuickGenerateKey = () => {
    if (!selectedGenerationAdapter.requiresKey) return;
    const key = quickGenerateKeyDraft.trim();
    if (!key) {
      showToast('Paste an API key before saving.', 'warn');
      return;
    }
    localStorage.setItem(`${QUICK_GENERATE_KEY_PREFIX}${selectedGenerationAdapter.id}`, key);
    setQuickGenerateKeySaved(true);
    showToast(`${selectedGenerationAdapter.label} key saved locally.`);
  };
  const clearQuickGenerateKey = () => {
    localStorage.removeItem(`${QUICK_GENERATE_KEY_PREFIX}${selectedGenerationAdapter.id}`);
    setQuickGenerateKeyDraft('');
    setQuickGenerateKeySaved(false);
    showToast(`${selectedGenerationAdapter.label} key cleared.`);
  };
  const getActiveGenerationApiKey = (providerId: GenerationProviderId = selectedGenerationAdapter.id) => {
    if (providerId === 'mock_local' || providerId === 'comfyui_local') return '';
    const providerKey = localStorage.getItem(`${QUICK_GENERATE_KEY_PREFIX}${providerId}`) || '';
    if (providerKey) return providerKey;
    if (providerId === 'google_pro_image') {
      const liteKey = localStorage.getItem(`${QUICK_GENERATE_KEY_PREFIX}google_lite_image`) || '';
      if (liteKey) return liteKey;
    }
    if (providerId === 'google_lite_image') {
      const proKey = localStorage.getItem(`${QUICK_GENERATE_KEY_PREFIX}google_pro_image`) || '';
      if (proKey) return proKey;
    }
    if (providerId === 'gpt_image') return localStorage.getItem(`${QUICK_GENERATE_KEY_PREFIX}${providerId}`) || '';
    return '';
  };
  const getDirectGenerationApiKey = (providerId: GenerationProviderId) => localStorage.getItem(`${QUICK_GENERATE_KEY_PREFIX}${providerId}`) || '';
  const getActiveGoogleVisionApiKey = () => getActiveGenerationApiKey(
    selectedGenerationAdapter.id === 'google_pro_image' ? 'google_pro_image' : 'google_lite_image',
  );
  const renderGoalLabelForPrompt = (label: string) => label === 'Photographic Finish' ? 'Architectural Photography Finish' : label;
  const sceneGraphLines = () => {
    const graph = renderPassState.sceneIntelligence?.sceneGraph;
    const composer = renderPassState.aiComposer?.lastResponse?.sceneAnalysis;
    return [
      `Scene type: ${composer?.compositionSummary ? `${graph?.sceneType || 'premium retail kiosk'}; Gemini composition note: ${composer.compositionSummary}` : graph?.sceneType || 'premium retail kiosk'}.`,
      `Location type: ${graph?.locationType || 'indoor shopping mall'}.`,
      `Camera: ${composer?.cameraSummary || graph?.cameraDescription || 'frontal architectural view'}.`,
      `Design intent: ${graph?.designIntent || renderPassState.sceneSetup.outputGoal || 'premium architectural photography documentation'}.`,
      `Key architectural elements: ${(composer?.architectureToPreserve?.length ? composer.architectureToPreserve : graph?.keyArchitecturalElements || []).join(', ') || 'kiosk geometry, counter, canopy, columns, ceiling, floor pattern, logo/signage'}.`,
      `Protected elements: ${Array.from(new Set([...(graph?.protectedElements || []), ...(renderPassState.protectedAssets || []).filter((asset) => asset.locked || asset.status === 'locked').map((asset) => asset.name)])).join(', ') || 'camera, geometry, signage, counter, canopy'}.`,
      `Visible materials: ${(graph?.visibleMaterials || []).join(', ') || 'wood, leather/upholstery, brass/metal, floor tile/stone, painted white ceiling/columns, signage/logo, globe lamps'}.`,
      `Visible lighting conditions: ${(graph?.visibleLightingConditions || []).join(', ') || 'neutral indoor mall ambient light, decorative lamp warmth only'}.`,
      `Likely render weaknesses to correct: ${(graph?.likelyRenderWeaknesses || []).join(', ') || 'global yellow cast, flat materials, weak reflections, render-like lighting'}.`,
      composer ? 'Gemini Scene Composer analysis is available as supporting intelligence only. User-confirmed protected assets override Gemini guesses.' : 'No Gemini Scene Composer analysis available; use deterministic fallback heuristics.',
    ];
  };
  const protectionIntelligenceLines = () => {
    const protection = renderPassState.sceneIntelligence?.protectionIntelligence;
    return [
      `Summary: ${protection?.summary || 'Architecture is locked first; photographic and material polish happen only after preservation.'}`,
      ...((protection?.priorities || []).map((item) => `- ${item.priority.toUpperCase()}: ${item.items.join(', ')}`)),
    ];
  };
  const lightingIntelligenceLines = () => {
    const lighting = renderPassState.sceneIntelligence?.lightingIntelligence;
    return [
      `Summary: ${lighting?.summary || 'Keep mall ambient light neutral white and physically plausible.'}`,
      ...((lighting?.rules || []).map((rule) => `- ${rule}`)),
    ];
  };
  const environmentIntelligenceLines = (environmentSelected: boolean) => {
    const environment = renderPassState.sceneIntelligence?.environmentIntelligence;
    return [
      `Summary: ${environment?.summary || 'Use existing indoor shopping mall context unless Better Environment is selected.'}`,
      environmentSelected ? '- Better Environment is selected: refine only supporting context, never redesign the mall or block the architecture.' : '- Better Environment is not selected: do not invent or redesign mall background/context.',
      ...((environment?.rules || []).map((rule) => `- ${rule}`)),
    ];
  };
  const photographyIntelligenceLines = () => {
    const photography = renderPassState.sceneIntelligence?.photographyIntelligence;
    return [
      `Summary: ${photography?.summary || 'Use architectural editorial photography language, not cinematic or social-media filter language.'}`,
      ...((photography?.rules || []).map((rule) => `- ${rule}`)),
    ];
  };
  const workPlanLines = () => {
    const enabled = (renderPassState.workPlan || []).filter((item) => item.enabled);
    return enabled.length ? enabled.map((item) => `- ${item.category.toUpperCase()}: ${item.label} (${item.source})`) : ['- No Work Plan items enabled. Use selected goals and intelligence layers only.'];
  };
  const materialIntelligenceLines = () => {
    const zones = renderPassState.materialIntelligence?.zones || [];
    const protectedAssetNames = (renderPassState.protectedAssets || []).filter((asset) => asset.locked || asset.status === 'locked').map((asset) => asset.name).filter(Boolean);
    const geminiMaterialZones = renderPassState.aiComposer?.lastResponse?.sceneAnalysis?.materialZones || [];
    const lines = [
      `Summary: ${renderPassState.materialIntelligence?.summary || 'Use conservative retail/interior material intelligence as prompt support.'}`,
      protectedAssetNames.length ? `User-confirmed protected assets override material guesses: ${protectedAssetNames.join(', ')}.` : 'No user-confirmed protected material assets registered.',
      ...(geminiMaterialZones.length ? geminiMaterialZones.map((zone) => `Gemini-detected material zone: ${zone.name}${zone.location ? ` at ${zone.location}` : ''}${zone.currentAppearance ? `; current appearance: ${zone.currentAppearance}` : ''}${zone.recommendedDirection ? `; recommended direction: ${zone.recommendedDirection}` : ''}${zone.confidence ? ` (${zone.confidence}% confidence)` : ''}. Preserve user-confirmed assets over this inference.`) : ['No Gemini material analysis available; use deterministic heuristic material assumptions.']),
      ...zones.map((zone) => `- ${zone.label} (${zone.likelyMaterialType}, ${zone.confidence}% confidence, ${zone.preservationPriority} priority): ${zone.enhancementInstruction} Risk control: ${zone.hallucinationRisk}`),
    ];
    return lines;
  };
  const strictQuickGenerateNegativeBlock = [
    '- no redesign',
    '- no changed camera',
    '- no changed geometry',
    '- no new counter',
    '- no new canopy',
    '- no changed logo',
    '- no changed lighting fixture positions',
    `- ${scopedColorCastCorrectionLine(projectSourceOfTruth)}`,
    '- no cinematic orange grade',
    '- no Instagram filter',
    '- no hallucinated furniture',
    '- no people unless requested',
    '- no background mall redesign unless requested',
  ];
  const compileQuickGenerateTrace = (selectedGoals: Array<(typeof quickGenerateGoalCards)[number]>, conversationText = '', providerId: GenerationProviderId = selectedGenerationAdapter.id) => {
    const basePrompt = quickGeneratePromptText(selectedGoals);
    const userRequest = conversationText.trim();
    const isAgentRevisionPrompt = userRequest.includes('AGENT-COMPOSED PRODUCTION REVISION PROMPT');
    const providerModel = providerId === 'google_pro_image' ? GOOGLE_PRO_IMAGE_MODEL_ID : providerId === 'google_lite_image' ? GOOGLE_LITE_IMAGE_MODEL_ID : providerId;
    const providerIsGoogle = providerId === 'google_lite_image' || providerId === 'google_pro_image';
    const negativePrompt = [
      ...strictQuickGenerateNegativeBlock,
      ...generationRulesNegativeText(renderPassState).map((instruction) => `- ${instruction}`),
      ...materialRuleNegativeLines(projectSourceOfTruth).map((instruction) => `- ${instruction}`),
      '- no generic cinematic language',
      '- no dreamy stylized grade',
      '- no luxury glow effect',
    ].join('\n');
    return compileProjectPromptTrace({
      sourceOfTruth: projectSourceOfTruth,
      basePrompt,
      negativePrompt,
      provider: providerId,
      model: providerModel,
      mode: `quick-${quickGenerateMode}`,
      activeGoals: selectedGoals.map((goal) => goal.label),
      userRequest: userRequest && !isAgentRevisionPrompt ? userRequest : undefined,
      revisionCorrections: isAgentRevisionPrompt ? userRequest : undefined,
      agentRevisionInterpretation: isAgentRevisionPrompt ? 'AI Copilot interpreted saved comments as evidence and composed the revision instruction. Raw comment text is not appended directly to the provider prompt.' : undefined,
      baseTruthRestoration: isAgentRevisionPrompt ? 'Base Render truth outranks generic project rules and style guidance. Restore visible approved geometry, camera, material zoning, signage, furniture positions, fixture positions, and floor pattern where the result drifted.' : undefined,
      applicableProjectRules: isAgentRevisionPrompt ? materialRuleVisibilityGuard : undefined,
      suppressedProjectRules: isAgentRevisionPrompt ? 'Suppress any Source of Truth rule that would invent, expand, intensify, or introduce colors, patterns, or material zones not clearly present in the Base Render or explicitly requested by the user.' : undefined,
      commentEvidence: isAgentRevisionPrompt ? 'Saved point/global comments are location/evidence cues for the Agent revision plan, not raw prompt instructions.' : undefined,
      scopedReferences: isAgentRevisionPrompt ? 'Reference images attached to comments may be used only for their selected scopes and must not transfer form, composition, architecture, lighting, camera, or background.' : undefined,
      providerSuffix: providerIsGoogle ? 'Google image adapter receives this final compiled prompt plus base image/current result image and scoped project material references when present.' : undefined,
    });
  };
  const quickGeneratePromptText = (selectedGoals: Array<(typeof quickGenerateGoalCards)[number]>) => {
    const goalLabels = selectedGoals.map((goal) => renderGoalLabelForPrompt(goal.label)).join(', ') || 'Architectural Photography Finish';
    const goalIds = new Set(selectedGoals.map((goal) => goal.id));
    const addPeopleSelected = goalIds.has('add_people') || goalIds.has('opening_day');
    const environmentSelected = goalIds.has('better_environment') || goalIds.has('night_view');
    const activePassPrompt = selectedRenderPass ? activePromptTextForPass(selectedRenderPass.type) : '';
    return [
      'VISUAL LOCAL QUICK GENERATE PREVIEW',
      '',
      '1. ROLE',
      'You are a senior architectural photographer and digital retoucher.',
      'The uploaded image is a completed built project, not concept art.',
      'Behave like a photographer documenting and retouching a completed premium retail interior, not like a concept artist.',
      '',
      '2. SOURCE OF TRUTH',
      'The base render is the source of truth.',
      'Do not redesign, reinterpret, replace, move, add, or remove architecture.',
      'Document the project as if it has already opened in a real premium shopping mall.',
      'Preserve exact camera, perspective, geometry, proportions, layout, furniture position, counter, canopy, columns, ceiling, floor pattern, lighting fixture positions, signage, logo, and architectural form.',
      '',
      '3. SCENE GRAPH',
      ...sceneGraphLines(),
      '',
      '4. PROTECTION INTELLIGENCE',
      ...protectionIntelligenceLines(),
      `People rule: ${addPeopleSelected ? 'People may be added only as subtle architectural-scale activity that does not block the design.' : 'Do not add people unless Add People is selected.'}`,
      `Mode: ${quickGenerateMode === 'draft' ? 'Draft preview. Favor speed and clear direction over final polish.' : 'Final render pass. Favor detail, polish, and preservation.'}`,
      `Selected goals: ${goalLabels}.`,
      selectedQuickPromptPresetLabels.length ? `Selected prompt tuning presets: ${selectedQuickPromptPresetLabels.join(', ')}.` : 'Selected prompt tuning presets: none.',
      '',
      '5. LIGHTING INTELLIGENCE',
      ...lightingIntelligenceLines(),
      '- Replace render-like flat lighting with realistic mall architectural photography.',
      '- Keep ambient mall lighting neutral white, around 5200K-5600K.',
      '- Keep warm tone only on brass, wood, tea-colored materials, and decorative lamps.',
      '',
      '6. MATERIAL INTELLIGENCE',
      ...(materialRulePromptLines(projectSourceOfTruth).length ? ['Project Source of Truth material rules:', ...materialRulePromptLines(projectSourceOfTruth)] : []),
      `Scoped color-cast correction: ${scopedColorCastCorrectionLine(projectSourceOfTruth)}`,
      ...(goalIds.has('better_materials') ? materialIntelligenceLines() : ['Better Materials is not selected, but preserve material identity and avoid accidental material conversions.']),
      '- If leather/upholstery is visible, preserve it as leather/upholstery; improve grain, cushion softness, subtle sheen, stitching/tufting if visible. Do not convert leather into wood.',
      '- If wood is visible, improve grain variation, pores, panel direction, and subtle imperfections.',
      '- If brass/metal is visible, improve brushed brass reflection, anisotropic highlights, and edge definition.',
      '- If stone/tile/floor is visible, improve realistic roughness and reflection falloff without wet/mirror effect.',
      '- If white ceiling/columns are visible, preserve neutral white balance and avoid yellow cast.',
      '- If signage/logo is visible, preserve text, position, proportion, and legibility.',
      '',
      '7. PHOTOGRAPHY INTELLIGENCE',
      ...photographyIntelligenceLines(),
      '- Improve dynamic range like editorial architectural photography.',
      '- Use natural contrast, realistic highlight rolloff, real camera response, and micro material detail.',
      '',
      '8. ENVIRONMENT RULES',
      ...environmentIntelligenceLines(environmentSelected),
      '',
      '9. ALLOWED CHANGES',
      'Work Plan:',
      ...workPlanLines(),
      '- Improve only the selected visual qualities.',
      '- Preserve original camera, perspective, proportions, structure, furniture placement, logo/signage, lighting fixtures, mapped design intent, and object positions.',
      '- For Better Materials: improve realism, texture, roughness, reflections, and tactile quality only; do not change material identity, color family, pattern, or placement.',
      '- For Better Lighting: improve exposure, highlight rolloff, shadow softness, ambient fill, and photographic depth only; do not add, remove, or replace lighting fixtures.',
      '- For Architectural Photography Finish: improve editorial dynamic range, neutral color fidelity, contrast balance, lens realism, and real camera micro details only; do not change physical design elements.',
      '- Keep architecture as the hero.',
      '',
      '10. ACTIVE GENERATION RULES',
      ...(generationRulesPromptText(renderPassState) ? generationRulesPromptText(renderPassState).split('\n') : ['- No selectable Work Mode rules are enabled yet. Use Analyze Scene or Generate Suggested Rules to create rule toggles.']),
      '',
      '11. NEGATIVE RULES',
      ...strictQuickGenerateNegativeBlock,
      ...generationRulesNegativeText(renderPassState).map((instruction) => `- ${instruction}`),
      ...materialRuleNegativeLines(projectSourceOfTruth).map((instruction) => `- ${instruction}`),
      '- no generic cinematic language',
      '- no dreamy stylized grade',
      '- no luxury glow effect',
      '',
      '12. DETERMINISTIC PROMPT TUNING PRESETS',
      ...(selectedQuickPromptInstructions.length ? selectedQuickPromptInstructions.map((instruction) => `- ${instruction}`) : ['- No additional prompt tuning presets selected.']),
      '',
      '13. OUTPUT INSTRUCTION',
      'Return one architectural photography retouch result of the uploaded base render.',
      'The result must look like a real premium shopping mall architectural photograph, not a render enhancement, warm filter, concept image, or redesign.',
      activePassPrompt ? `Current render pass prompt context:\n${activePassPrompt}` : `Output goal:\n${renderPassState.sceneSetup.outputGoal || scene.localPrompt || 'Create a cleaner architectural visualization preview while preserving the base render.'}`,
    ].join('\n');
  };
  const todayUsageRecords = (renderPassState.quickGenerateUsage || []).filter((record) => new Date(record.createdAt).toDateString() === new Date().toDateString());
  const todayUsageCost = todayUsageRecords.reduce((sum, record) => sum + (record.estimatedCostTHB || 0), 0);
  const projectUsageCost = (renderPassState.quickGenerateUsage || []).reduce((sum, record) => sum + (record.estimatedCostTHB || 0), 0);
  const todaySuccesses = todayUsageRecords.filter((record) => record.status === 'success').length;
  const todayVisionAnalyses = todayUsageRecords.filter((record) => record.usageKind === 'vision_analysis').length;
  const todayLiteGenerations = todayUsageRecords.filter((record) => record.usageKind === 'lite_generate').length;
  const todayProGenerations = todayUsageRecords.filter((record) => record.usageKind === 'pro_generate').length;
  const deterministicAnalysisCount = renderPassState.sceneHash ? 1 : 0;
  const googleLiteCostPerImage = renderPassState.googleLiteCostPerImageTHB ?? 1.2;
  const googleProCostPerImage = renderPassState.googleProCostPerImageTHB ?? 4.8;
  const remainingCredit = renderPassState.quickGenerateCreditTHB ?? 400;
  const selectedGoogleCostPerImage = selectedGenerationAdapter.id === 'google_pro_image' ? googleProCostPerImage : selectedGenerationAdapter.id === 'google_lite_image' ? googleLiteCostPerImage : 0;
  const estimatedPreviewsRemaining = selectedGoogleCostPerImage > 0 ? Math.floor(Math.max(0, remainingCredit - projectUsageCost) / selectedGoogleCostPerImage) : 999;
  const estimatedCurrentCost = isGoogleImageProvider ? selectedGoogleCostPerImage : 0;
  const sanitizeDebugPayload = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sanitizeDebugPayload);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const lower = key.toLowerCase();
      if (lower.includes('key') || lower.includes('authorization') || lower.includes('token')) return [key, '[masked]'];
      return [key, sanitizeDebugPayload(item)];
    }));
  };
  const extractGoogleLiteParts = (payload: any) => {
    const imageParts: Array<{ path: string; mimeType?: string; data?: string; dataLength?: number; uri?: string }> = [];
    const textParts: Array<{ path: string; text: string }> = [];
    const visit = (value: any, path: string) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
      }
      if (typeof value !== 'object') return;
      const inlineData = value.inlineData || value.inline_data;
      if (inlineData?.data && (inlineData.mimeType || inlineData.mime_type || '').startsWith('image/')) {
        const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
        imageParts.push({ path: `${path}.${value.inlineData ? 'inlineData' : 'inline_data'}`, mimeType, data: inlineData.data, dataLength: inlineData.data.length });
      }
      const fileData = value.fileData || value.file_data;
      if (fileData?.fileUri || fileData?.file_uri || fileData?.uri) {
        imageParts.push({ path: `${path}.${value.fileData ? 'fileData' : 'file_data'}`, mimeType: fileData.mimeType || fileData.mime_type, uri: fileData.fileUri || fileData.file_uri || fileData.uri });
      }
      if (value.output_image?.data) {
        imageParts.push({ path: `${path}.output_image`, mimeType: value.output_image.mime_type || value.output_image.mimeType || 'image/png', data: value.output_image.data, dataLength: value.output_image.data.length });
      }
      if (value.type === 'image' && value.data) {
        imageParts.push({ path, mimeType: value.mime_type || value.mimeType || 'image/png', data: value.data, dataLength: value.data.length });
      }
      if (typeof value.text === 'string') textParts.push({ path: `${path}.text`, text: value.text });
      if (typeof value.content === 'string' && value.content.length < 8000) textParts.push({ path: `${path}.content`, text: value.content });
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    };
    visit(payload, 'response');
    return { imageParts, textParts };
  };
  const clearQuickGenerateUsage = () => {
    if (!confirm('Clear local AI usage history for this scene?')) return;
    updateRenderPassBuilder({ quickGenerateUsage: [] });
    showToast('Usage history cleared.');
  };
  const dataUrlToGoogleImageInput = async (dataUrl: string) => {
    const resized = await resizeDataUrl(dataUrl, 1600, 'image/jpeg', 0.82);
    const [header, data] = resized.split(',');
    const mimeMatch = header.match(/^data:(.*?);base64$/);
    return { mime_type: mimeMatch?.[1] || 'image/jpeg', data };
  };
  const callGoogleImageAdapter = async (apiKey: string, prompt: string, baseImage: string, providerId: GenerationProviderId, sourceOfTruth?: ProjectSourceOfTruth) => {
    const imageInput = await dataUrlToGoogleImageInput(baseImage);
    const materialReferenceInputs: any[] = [];
    for (const { rule, ref } of applicableProjectRuleReferences(sourceOfTruth)) {
      const refInput = await dataUrlToGoogleImageInput(ref.dataUrl);
      materialReferenceInputs.push({
        type: 'text',
        text: `Project material source-of-truth reference for "${rule.name}". Use as ${ref.scopes.map(referenceScopeLabel).join(', ')}. Do not copy architecture, composition, form, camera, or layout unless explicitly allowed. ${ref.notes || ''}`.trim(),
      });
      materialReferenceInputs.push({ type: 'image', ...refInput });
    }
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
    const model = providerId === 'google_pro_image' ? GOOGLE_PRO_IMAGE_MODEL_ID : GOOGLE_LITE_IMAGE_MODEL_ID;
    const providerLabel = providerId === 'google_pro_image' ? 'Google Pro Image' : 'Google Lite Image';
    const startedAt = performance.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        input: [
          { type: 'text', text: prompt },
          { type: 'image', ...imageInput },
          ...materialReferenceInputs,
        ],
        response_format: {
          type: 'image',
          mime_type: 'image/jpeg',
          image_size: quickGenerateMode === 'draft' ? '1K' : '2K',
        },
      }),
    });
    const durationMs = Math.round(performance.now() - startedAt);
    const payload = await response.json().catch(() => null);
    const detected = extractGoogleLiteParts(payload);
    const debug: GoogleLiteDebugState = {
      provider: providerLabel,
      model,
      endpoint,
      responseStatus: response.status,
      durationMs,
      rawResponseJson: sanitizeDebugPayload(payload),
      detectedImageParts: detected.imageParts.map((part) => ({ path: part.path, mimeType: part.mimeType, dataLength: part.dataLength, uri: part.uri })),
      detectedTextParts: detected.textParts,
      detectedErrorObject: sanitizeDebugPayload(payload?.error),
      updatedAt: new Date().toISOString(),
    };
    if (!response.ok) {
      const message = payload?.error?.message || `${response.status} ${response.statusText}`;
      const error = new Error(message) as Error & { debug?: GoogleLiteDebugState; durationMs?: number };
      error.debug = debug;
      error.durationMs = durationMs;
      throw error;
    }
    const firstImage = detected.imageParts.find((part) => part.data);
    if (!firstImage?.data) {
      const text = detected.textParts.map((part) => part.text).filter(Boolean).join('\n').slice(0, 1200);
      const error = new Error(`Google returned a response, but no image part was detected.${text ? ` Text response: ${text}` : ''}`) as Error & { debug?: GoogleLiteDebugState; durationMs?: number; noImage?: boolean };
      error.debug = debug;
      error.durationMs = durationMs;
      error.noImage = true;
      throw error;
    }
    return { imageDataUrl: `data:${firstImage.mimeType || 'image/png'};base64,${firstImage.data}`, debug, durationMs };
  };
  const buildQuickGeneratedRound = (
    imageDataUrl: string,
    selectedGoals: Array<(typeof quickGenerateGoalCards)[number]>,
    providerLabel: string,
    providerId: string,
    notePrefix: string,
    compiledTrace?: CompiledPromptTrace,
    options: { parentResultRoundId?: string; generationMode?: 'preview' | 'revision' } = {},
  ) => {
    const primaryGoal = selectedGoals[0] || quickGenerateGoalCards[0];
    const now = new Date().toISOString();
    const roundNumber = renderPassState.resultRounds.length + 1;
    const round: ResultRound = {
      id: id(),
      name: `${providerId === 'mock_local' ? 'Mock Preview' : options.generationMode === 'revision' ? `${providerLabel} Revision` : providerLabel} ${String(roundNumber).padStart(2, '0')}`,
      imageDataUrl,
      createdAt: now,
      updatedAt: now,
      sourcePassType: primaryGoal.passType,
      sourceAdapter: `quick:${providerId}:${quickGenerateMode}`,
      externalTool: providerId === 'google_lite_image' || providerId === 'google_pro_image' ? 'gemini' : 'other',
      status: 'needs_qc',
      notes: `${notePrefix}. Provider: ${providerLabel}. Mode: ${quickGenerateMode}. Generation: ${options.generationMode || 'preview'}. Goals: ${selectedGoals.map((goal) => goal.label).join(', ') || primaryGoal.label}. Prompt presets: ${selectedQuickPromptPresetLabels.join(', ') || 'none'}. Active rule IDs: ${activeRuleIds.join(', ') || 'none'}. Parent result: ${options.parentResultRoundId || 'none'}. Created: ${now}.`,
      qc: calculateResultQc(defaultResultQc),
      parentResultRoundId: options.parentResultRoundId || activeResultRound?.id,
      compiledPromptTrace: compiledTrace,
      activeMaterialRuleIds: compiledTrace?.activeRuleIds || activeMaterialRules.map((rule) => rule.id),
      projectSourceOfTruthSnapshot: projectSourceOfTruth,
    };
    return round;
  };
  const createQuickPreview = async (
    overrideGoalIdsOrEvent?: string[] | any,
    conversationText = '',
    runOptions: {
      providerId?: GenerationProviderId;
      imageInputDataUrl?: string;
      parentResultRoundId?: string;
      generationMode?: 'preview' | 'revision';
      sourceLabel?: string;
    } = {},
  ) => {
    const sourceImage = runOptions.imageInputDataUrl || scene.baseImage;
    if (!sourceImage) {
      showToast('Upload a base render before creating a preview.', 'warn');
      return;
    }
    setQuickGenerateError('');
    const effectiveProviderId = runOptions.providerId || selectedGenerationAdapter.id;
    const effectiveAdapter = quickGenerationAdapters.find((adapter) => adapter.id === effectiveProviderId) || selectedGenerationAdapter;
    const effectiveModel = effectiveProviderId === 'google_pro_image' ? GOOGLE_PRO_IMAGE_MODEL_ID : effectiveProviderId === 'google_lite_image' ? GOOGLE_LITE_IMAGE_MODEL_ID : effectiveProviderId;
    const effectiveIsGoogleProvider = effectiveProviderId === 'google_lite_image' || effectiveProviderId === 'google_pro_image';
    const overrideGoalIds = Array.isArray(overrideGoalIdsOrEvent) ? overrideGoalIdsOrEvent : undefined;
    const selectedGoals = quickGenerateGoalCards.filter((goal) => (overrideGoalIds || renderPassState.quickGenerateGoals || []).includes(goal.id));
    const selectedGoalLabels = selectedGoals.map((goal) => goal.label);
    const usageBase = {
      provider: effectiveProviderId,
      usageKind: effectiveProviderId === 'google_lite_image' ? 'lite_generate' as const : effectiveProviderId === 'google_pro_image' ? 'pro_generate' as const : effectiveProviderId === 'mock_local' ? 'mock_generate' as const : 'disconnected_generate' as const,
      model: effectiveModel,
      mode: quickGenerateMode,
      selectedGoals: selectedGoalLabels,
    };
    const compiledTrace = compileQuickGenerateTrace(selectedGoals, conversationText, effectiveProviderId);
    const promptForTelemetry = compiledTrace.finalPrompt;
    const timelineForResult = (round: ResultRound) => {
      const base = renderPassState.conversationTimeline || [];
      const hasRequest = conversationText.trim() && base.some((entry) => entry.type === 'user' && entry.text === conversationText.trim());
      const now = new Date().toISOString();
      return [
        ...base,
        ...(conversationText.trim() && !hasRequest ? [
          { id: id(), type: 'user' as const, createdAt: now, text: conversationText.trim() },
          { id: id(), type: 'ai' as const, createdAt: now, text: `I understand. I will generate a focused preview while keeping Camera, Architecture, and Geometry locked.` },
        ] : []),
        { id: id(), type: 'result' as const, createdAt: now, text: `${round.name} generated preview - needs QC`, resultRoundId: round.id },
      ];
    };
    const telemetryBase = {
      mode: renderPassViewMode === 'work' ? 'work' as const : renderPassViewMode === 'advanced' ? 'pro' as const : 'quick' as const,
      provider: effectiveProviderId,
      model: effectiveModel,
      activeGoalIds: selectedGoals.map((goal) => goal.id),
      activePresetIds: selectedQuickPromptPresetIds,
      activeRuleIds,
      promptLength: promptForTelemetry.length,
      promptSectionCount: (promptForTelemetry.match(/^\d+\./gm) || []).length,
      imageInputCount: sourceImage ? 1 : 0,
      generationCostCategory: effectiveProviderId === 'google_lite_image' ? 'lite' as const : effectiveProviderId === 'google_pro_image' ? 'pro' as const : effectiveProviderId === 'mock_local' ? 'mock' as const : 'free' as const,
      activeRules: activeRules.map((rule) => rule.label),
      activeMaterialRecipes: activeRules.filter((rule) => rule.category === 'material').map((rule) => rule.label),
      activeLightingRules: activeRules.filter((rule) => rule.category === 'lighting').map((rule) => rule.label),
      activeProtectionRules: activeRules.filter((rule) => rule.category === 'protection' || rule.category === 'brand/signage' || rule.category === 'hallucination-risk').map((rule) => rule.label),
    };
    if (effectiveIsGoogleProvider) {
      const selectedGoogleCostPerImage = effectiveProviderId === 'google_pro_image' ? googleProCostPerImage : googleLiteCostPerImage;
      const apiKey = getActiveGenerationApiKey(effectiveProviderId);
      if (!apiKey) {
        const usageRecord: AiGenerationUsageRecord = {
          id: id(),
          createdAt: new Date().toISOString(),
          ...usageBase,
          status: 'error',
          durationMs: 0,
          estimatedCostTHB: 0,
          errorMessage: `Setup Required: ${effectiveAdapter.label} API key is missing.`,
        };
        updateRenderPassBuilder({
          quickGenerateUsage: [...(renderPassState.quickGenerateUsage || []), usageRecord],
          localTelemetry: addTelemetryEvent({
            eventType: 'generate_draft',
            ...telemetryBase,
            status: 'error',
            durationMs: 0,
            estimatedCostTHB: 0,
            errorMessage: usageRecord.errorMessage,
          }),
        });
        setQuickGenerateError(`Setup Required: save a ${effectiveAdapter.label} API key before generating.`);
        showToast(`Setup Required: save a ${effectiveAdapter.label} API key first.`, 'warn');
        return;
      }
      setIsQuickGenerating(true);
      const startedAt = performance.now();
      try {
        const prompt = promptForTelemetry;
        const result = await callGoogleImageAdapter(apiKey, prompt, sourceImage, effectiveProviderId, projectSourceOfTruth);
        const round = buildQuickGeneratedRound(
          result.imageDataUrl,
          selectedGoals,
          effectiveAdapter.label,
          effectiveProviderId,
          runOptions.generationMode === 'revision' ? `${effectiveAdapter.label} revision` : `${effectiveAdapter.label} preview`,
          compiledTrace,
          { parentResultRoundId: runOptions.parentResultRoundId, generationMode: runOptions.generationMode || 'preview' },
        );
        lastQuickGeneratedRoundRef.current = round;
        setLastProductionGeneratedRound(round);
        const usageRecord: AiGenerationUsageRecord = {
          id: id(),
          createdAt: new Date().toISOString(),
          ...usageBase,
          status: 'success',
          durationMs: result.durationMs,
          estimatedCostTHB: selectedGoogleCostPerImage,
          resultRoundId: round.id,
        };
        updateRenderPassBuilder({
          resultRounds: [...renderPassState.resultRounds, round],
          activeResultRoundId: round.id,
          workflowPhase: 'qc_review',
          conversationTimeline: timelineForResult(round),
          quickGenerateUsage: [...(renderPassState.quickGenerateUsage || []), usageRecord],
          googleLiteDebug: result.debug,
          localTelemetry: addTelemetryEvent({
            eventType: 'generate_draft',
            ...telemetryBase,
            status: 'success',
            durationMs: result.durationMs,
            estimatedCostTHB: selectedGoogleCostPerImage,
            outputImageCount: 1,
            resultRoundId: round.id,
          }),
        });
        setRenderPassViewMode('basic');
        setResultCompareMode('slider');
        setActiveTab('render-pass');
        setProductionStage('review');
        showToast(`${runOptions.generationMode === 'revision' ? 'Revision' : 'Preview'} ready for review via ${effectiveAdapter.label}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : `${effectiveAdapter.label} generation failed.`;
        const err = error as Error & { debug?: GoogleLiteDebugState; durationMs?: number; noImage?: boolean };
        const status: AiGenerationUsageStatus = err.noImage ? 'no-image' : 'error';
        const usageRecord: AiGenerationUsageRecord = {
          id: id(),
          createdAt: new Date().toISOString(),
          ...usageBase,
          status,
          durationMs: err.durationMs ?? Math.round(performance.now() - startedAt),
          estimatedCostTHB: 0,
          errorMessage: message,
        };
        updateRenderPassBuilder({
          quickGenerateUsage: [...(renderPassState.quickGenerateUsage || []), usageRecord],
          googleLiteDebug: err.debug || {
            provider: effectiveAdapter.label,
            model: effectiveModel,
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/interactions',
            durationMs: usageRecord.durationMs,
            detectedErrorObject: message,
            updatedAt: new Date().toISOString(),
          },
          localTelemetry: addTelemetryEvent({
            eventType: 'generate_draft',
            ...telemetryBase,
            status,
            durationMs: usageRecord.durationMs,
            estimatedCostTHB: 0,
            outputImageCount: 0,
            errorMessage: message,
          }),
        });
        setQuickGenerateError(message);
        showToast(`${effectiveAdapter.label} failed: ${message}`, 'warn');
      } finally {
        setIsQuickGenerating(false);
      }
      return;
    }
    if (effectiveProviderId !== 'mock_local') {
      setQuickGenerateError(`${effectiveAdapter.label}: Adapter not connected yet.`);
      showToast(`${effectiveAdapter.label}: Adapter not connected yet.`, 'warn');
      return;
    }
    const round = buildQuickGeneratedRound(sourceImage, selectedGoals, effectiveAdapter.label, effectiveProviderId, 'Mock Preview / API not connected', compiledTrace, { parentResultRoundId: runOptions.parentResultRoundId, generationMode: runOptions.generationMode || 'preview' });
    lastQuickGeneratedRoundRef.current = round;
    setLastProductionGeneratedRound(round);
    const usageRecord: AiGenerationUsageRecord = {
      id: id(),
      createdAt: new Date().toISOString(),
      ...usageBase,
      status: 'success',
      durationMs: 0,
      estimatedCostTHB: 0,
      resultRoundId: round.id,
    };
    updateRenderPassBuilder({
      resultRounds: [...renderPassState.resultRounds, round],
      activeResultRoundId: round.id,
      workflowPhase: 'qc_review',
      conversationTimeline: timelineForResult(round),
      quickGenerateUsage: [...(renderPassState.quickGenerateUsage || []), usageRecord],
      localTelemetry: addTelemetryEvent({
        eventType: 'generate_draft',
        ...telemetryBase,
        status: 'success',
        durationMs: 0,
        estimatedCostTHB: 0,
        outputImageCount: 1,
        resultRoundId: round.id,
      }),
    });
    setRenderPassViewMode('basic');
    setResultCompareMode('slider');
    setActiveTab('render-pass');
    setProductionStage('review');
    showToast('Mock Preview ready for review. API not connected.');
  };
  const setQuickPreviewStatus = (roundId: string, status: ResultRound['status']) => {
    const round = renderPassState.resultRounds.find((item) => item.id === roundId);
    updateRenderPassBuilder({
      resultRounds: renderPassState.resultRounds.map((item) => item.id === roundId ? { ...item, status, updatedAt: new Date().toISOString() } : item),
      localTelemetry: addTelemetryEvent({
        eventType: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'needs_revision',
        mode: 'qc',
        provider: 'local',
        model: 'qc-studio',
        status: 'success',
        durationMs: 0,
        estimatedCostTHB: 0,
        generationCostCategory: 'free',
        resultRoundId: roundId,
        preserveScore: round?.qc?.preservationScore,
        photoScore: round?.qc?.photographicScore,
        readyScore: round?.qc?.clientReadyScore,
        approved: status === 'approved',
        rejected: status === 'rejected',
        needsRevision: status === 'needs_revision',
      }),
    });
    showToast(status === 'approved' ? 'Version approved.' : 'Version marked needs revision.');
    if (status === 'approved') setProductionStage('approve');
    if (status === 'needs_revision') setProductionStage('revise');
  };
  const createProductionPreview = async (explicitParentRound?: ResultRound | null) => {
    if (!scene.baseImage) {
      setProductionStage('upload');
      showToast('Upload a raw render first.', 'warn');
      return;
    }
    const resolveProductionProviderId = (): GenerationProviderId => {
      if (selectedGenerationAdapter.id !== 'mock_local') return selectedGenerationAdapter.id;
      if (getDirectGenerationApiKey('google_pro_image')) return 'google_pro_image';
      if (getDirectGenerationApiKey('google_lite_image')) return 'google_lite_image';
      return 'mock_local';
    };
    const providerId = resolveProductionProviderId();
    const provider = quickGenerationAdapters.find((adapter) => adapter.id === providerId) || selectedGenerationAdapter;
    if (providerId !== 'mock_local' && provider.requiresKey && !getActiveGenerationApiKey(providerId)) {
      setQuickGenerateError(`Provider not configured: save a ${provider.label} API key before generating.`);
      showToast(`Connect ${provider.label} before generating.`, 'warn');
      return;
    }
    const existingGoals = renderPassState.quickGenerateGoals || [];
    const goalIds = existingGoals.length ? existingGoals : productionDefaultGoalIds;
    if (!existingGoals.length) updateRenderPassBuilder({ quickGenerateGoals: goalIds as any });
    const explicitLatestRound = explicitParentRound?.id
      ? renderPassState.resultRounds.find((round) => round.id === explicitParentRound.id)
      : undefined;
    const parentRound = explicitLatestRound || explicitParentRound || (renderPassState.activeResultRoundId
      ? renderPassState.resultRounds.find((round) => round.id === renderPassState.activeResultRoundId) || activeResultRound
      : activeResultRound);
    const currentProductionRound = parentRound || lastProductionGeneratedRound || lastQuickGeneratedRoundRef.current;
    const isRevision = Boolean(currentProductionRound);
    const visibleResultImage = productionCommentImageRef.current?.src
      || (typeof document !== 'undefined' ? (document.querySelector('[data-testid="qc-compare-main"] img[alt*="generated"]') as HTMLImageElement | null)?.src : '');
    const productionSourceKind = isRevision
      ? visibleResultImage
        ? 'visible-result'
        : currentProductionRound?.imageDataUrl
          ? 'current-round'
          : 'base-render-fallback'
      : 'base-render';
    const sourceImage = isRevision ? visibleResultImage || currentProductionRound?.imageDataUrl || scene.baseImage : scene.baseImage;
    const currentRoundHasAppliedAgentPlan = currentProductionRound?.agentRevisionPlan?.status === 'applied';
    const currentRoundHasRevisionEvidence = Boolean(currentRoundHasAppliedAgentPlan || (currentProductionRound?.productionComments || []).filter((comment) => comment.status !== 'draft' && comment.status !== 'resolved').length);
    if (typeof window !== 'undefined') {
      (window as any).__productionSourceChoice = {
        isRevision,
        sourceKind: productionSourceKind,
        hasAppliedAgentPlan: currentRoundHasAppliedAgentPlan,
        hasRevisionEvidence: currentRoundHasRevisionEvidence,
        agentPlanStatus: currentProductionRound?.agentRevisionPlan?.status || 'none',
      };
    }
    if (isRevision && currentRoundHasRevisionEvidence && !currentRoundHasAppliedAgentPlan) {
      setProductionStage('revise');
      setQuickGenerateError('Apply the Agent revision plan before generating a revision.');
      showToast('Apply the Agent revision plan before generating revision.', 'warn');
      return;
    }
    setProductionStage(isRevision ? 'revise' : 'preview');
    const revisionText = currentProductionRound
      ? [
        currentRoundHasRevisionEvidence ? 'Agent-composed production revision prompt.' : 'Production Flow generate-again pass.',
        `Revision source image: current result ${currentProductionRound.name}. Base render remains source-of-truth for design preservation.`,
        currentProductionRound.agentRevisionPlan?.finalRevisionPrompt || 'Create another controlled production preview. Preserve the Base Render truth and do not treat prior result drift as approved design.',
      ].join('\n')
      : 'Production Flow first preview with project-aware defaults.';
    await createQuickPreview(goalIds, revisionText, {
      providerId,
      imageInputDataUrl: sourceImage,
      parentResultRoundId: currentProductionRound?.id,
      generationMode: isRevision ? 'revision' : 'preview',
      sourceLabel: isRevision ? 'current-result' : 'base-render',
    });
  };
  const productionComments = activeResultRound?.productionComments || [];
  const savedProductionComments = productionComments.filter((comment) => comment.status !== 'draft');
  const processableProductionComments = savedProductionComments.filter((comment) => comment.status === 'active' || comment.status === 'open');
  const selectedProductionComment = savedProductionComments.find((comment) => comment.id === selectedProductionCommentId) || savedProductionComments[0] || null;
  const updateActiveResultComments = (comments: ProductionReviewComment[], patch: Partial<ResultRound> = {}) => {
    if (!activeResultRound) return;
    updateResultRound(activeResultRound.id, { productionComments: comments, ...patch });
  };
  const nextProductionCommentNumber = () => Math.max(0, ...productionComments.map((comment) => comment.number || 0)) + 1;
  const createProductionDraftComment = (type: 'point' | 'global', position?: { x: number; y: number }) => {
    if (!activeResultRound) {
      showToast('Generate or import a result before adding comments.', 'warn');
      return;
    }
    setAnchoredProductionDraft({
      id: id(),
      number: nextProductionCommentNumber(),
      type,
      x: position?.x,
      y: position?.y,
      text: '',
      references: [],
      referenceUsageNote: '',
      scopes: ['color_only', 'texture_only', 'do_not_copy_form', 'do_not_copy_architecture'],
      tags: [],
    });
    setProductionCommentDraft('');
    setProductionGlobalCommentDraft('');
    setProductionStage('revise');
  };
  const saveAnchoredProductionDraft = (processAfterSave = false) => {
    if (!activeResultRound || !anchoredProductionDraft) return;
    const text = anchoredProductionDraft.text.trim();
    if (!text) {
      showToast('Type a comment before saving.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const references = anchoredProductionDraft.references.map((ref) => ({
      ...ref,
      scopes: ref.scopes.length ? ref.scopes : anchoredProductionDraft.scopes,
      usageNote: ref.usageNote || anchoredProductionDraft.referenceUsageNote,
    }));
    const firstRef = references[0];
    const comment: ProductionReviewComment = {
      id: anchoredProductionDraft.id,
      number: anchoredProductionDraft.number,
      projectId: project.id,
      sceneId: scene.id,
      versionId: activeResultRound.id,
      resultId: activeResultRound.id,
      type: anchoredProductionDraft.type,
      x: anchoredProductionDraft.x,
      y: anchoredProductionDraft.y,
      text,
      status: 'active',
      tags: anchoredProductionDraft.tags,
      createdAt: now,
      updatedAt: now,
      source: 'manual',
      referenceUsageNote: anchoredProductionDraft.referenceUsageNote,
      references,
      referenceImage: firstRef?.dataUrl,
      referenceName: firstRef?.name,
      referenceScopes: firstRef?.scopes || anchoredProductionDraft.scopes,
    };
    const nextComments = [...productionComments.filter((item) => item.id !== comment.id), comment];
    updateActiveResultComments(nextComments);
    setSelectedProductionCommentId(comment.id);
    setAnchoredProductionDraft(null);
    setProductionCommentMode('off');
    setProductionStage(processAfterSave ? 'revise' : 'review');
    showToast(`Comment ${comment.number} saved.`);
    if (processAfterSave) {
      setTimeout(() => processProductionCommentsWithCopilot([comment], nextComments), 0);
    }
  };
  const cancelAnchoredProductionDraft = () => {
    setAnchoredProductionDraft(null);
    setProductionCommentMode('off');
    showToast('Draft comment cancelled.');
  };
  const addReferenceToAnchoredDraft = async (file?: File | null) => {
    if (!file || !anchoredProductionDraft) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image references are supported.', 'warn');
      return;
    }
    const ref: ProductionCommentReferenceDraft = {
      id: id(),
      name: file.name,
      dataUrl: await fileToDataURL(file),
      scopes: anchoredProductionDraft.scopes,
      usageNote: anchoredProductionDraft.referenceUsageNote,
    };
    setAnchoredProductionDraft((current) => current ? { ...current, references: [...current.references, ref] } : current);
    showToast('Reference attached to draft comment.');
  };
  const addReferencesToAnchoredDraft = async (files?: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      await addReferenceToAnchoredDraft(file);
    }
  };
  const removeReferenceFromAnchoredDraft = (referenceId: string) => {
    setAnchoredProductionDraft((current) => current ? { ...current, references: current.references.filter((ref) => ref.id !== referenceId) } : current);
  };
  const toggleAnchoredDraftScope = (scope: ProductionCommentReferenceScope) => {
    setAnchoredProductionDraft((current) => current ? {
      ...current,
      scopes: current.scopes.includes(scope) ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope],
    } : current);
  };
  const imagePointFromEvent = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = productionCommentImageRef.current || event.currentTarget.querySelector('img[alt*="generated"]') as HTMLImageElement | null;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };
  const productionMarkerPosition = (x = 0, y = 0) => {
    const image = productionCommentImageRef.current;
    const parent = image?.parentElement;
    if (!image || !parent) return { left: `${x * 100}%`, top: `${y * 100}%` };
    const imageRect = image.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    if (!parentRect.width || !parentRect.height) return { left: `${x * 100}%`, top: `${y * 100}%` };
    return {
      left: `${((imageRect.left - parentRect.left + x * imageRect.width) / parentRect.width) * 100}%`,
      top: `${((imageRect.top - parentRect.top + y * imageRect.height) / parentRect.height) * 100}%`,
    };
  };
  const productionComposerPosition = (draft: ProductionCommentDraftState) => {
    if (draft.type !== 'point') return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    const marker = productionMarkerPosition(draft.x || 0, draft.y || 0);
    const leftValue = Number.parseFloat(String(marker.left));
    const topValue = Number.parseFloat(String(marker.top));
    return {
      left: `${Math.min(94, Math.max(6, leftValue + ((draft.x || 0) > 0.62 ? -3 : 3)))}%`,
      top: `${Math.min(92, Math.max(8, topValue + ((draft.y || 0) > 0.62 ? -3 : 3)))}%`,
    };
  };
  const addProductionComment = (type: 'point' | 'global', position?: { x: number; y: number }) => {
    if (!activeResultRound) {
      showToast('Generate or import a result before adding comments.', 'warn');
      return;
    }
    const text = (type === 'global' ? productionGlobalCommentDraft : productionCommentDraft).trim();
    if (!text) {
      showToast('Type a comment first.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const comment: ProductionReviewComment = {
      id: id(),
      number: nextProductionCommentNumber(),
      type,
      x: position?.x,
      y: position?.y,
      text,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      projectId: project.id,
      sceneId: scene.id,
      versionId: activeResultRound.id,
      resultId: activeResultRound.id,
      source: 'manual',
      referenceImage: productionReferenceDraft?.dataUrl,
      referenceName: productionReferenceDraft?.name,
      referenceScopes: productionReferenceDraft ? productionReferenceScopes : [],
    };
    updateActiveResultComments([...productionComments, comment]);
    setSelectedProductionCommentId(comment.id);
    setProductionCommentDraft('');
    setProductionGlobalCommentDraft('');
    setProductionReferenceDraft(null);
    setProductionCommentMode('off');
    setProductionStage('revise');
    showToast(`Comment ${comment.number} added.`);
  };
  const updateProductionComment = (commentId: string, patch: Partial<ProductionReviewComment>) => {
    updateActiveResultComments(productionComments.map((comment) => comment.id === commentId ? { ...comment, ...patch, updatedAt: new Date().toISOString() } : comment));
  };
  const deleteProductionComment = (commentId: string) => {
    if (!confirm('Delete this production comment?')) return;
    updateActiveResultComments(productionComments.filter((comment) => comment.id !== commentId));
    if (selectedProductionCommentId === commentId) setSelectedProductionCommentId('');
    showToast('Comment deleted.');
  };
  const handleProductionResultClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (productionCommentMode !== 'point') return;
    if (anchoredProductionDraft) return;
    const point = imagePointFromEvent(event);
    if (!point) {
      showToast('Click directly on the visible result image to place a comment.', 'warn');
      return;
    }
    createProductionDraftComment('point', point);
  };
  const attachProductionReference = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image references are supported.', 'warn');
      return;
    }
    setProductionReferenceDraft({ name: file.name, dataUrl: await fileToDataURL(file) });
    showToast('Reference attached to next comment.');
  };
  const toggleProductionReferenceScope = (scope: ProductionCommentReferenceScope) => {
    setProductionReferenceScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  };
  const materialRuleVisibilityGuard = 'Use project material rules to preserve and refine visible approved materials. Do not invent, expand, intensify, or introduce project colors, patterns, or material zones that are not clearly present in the Base Render or explicitly requested by the user.';
  const summarizeProductionCommentForAgent = (comment: ProductionReviewComment) => {
    const text = comment.text.toLowerCase();
    const hasFloor = /floor|tile|พื้น|กระเบื้อง/.test(text);
    const hasRed = /red|maroon|แดง|แดงเกิน/.test(text);
    const hasBenchOrLeather = /bench|seat|sofa|leather|upholstery|เบาะ|หนัง|ม้านั่ง/.test(text);
    const hasBrass = /brass|yellow|ทอง|เหลือง|satin/.test(text);
    const hasLight = /light|lighting|exposure|shadow|แสง|เงา/.test(text);
    const location = comment.type === 'point' ? `marked area x=${(comment.x || 0).toFixed(2)}, y=${(comment.y || 0).toFixed(2)}` : 'whole result';
    if (hasFloor && hasRed) {
      return {
        summary: `User indicates the ${location} floor/material area drifted too red or no longer matches the Base Render.`,
        restore: [
          'Restore floor colors, floor pattern, material zoning, scale, placement, and boundaries from the Base Render.',
          'Remove newly introduced red or maroon floor regions unless they are clearly visible in the Base Render or explicitly requested by the user.',
        ],
        keep: ['Keep photographic realism improvements that do not change floor identity, pattern, color zoning, or geometry.'],
        suppressed: ['Do not apply generic Karun red/maroon floor accent rules to areas not clearly present in the Base Render.'],
      };
    }
    if (hasBenchOrLeather) {
      return {
        summary: `User indicates the ${location} seating/upholstery material needs correction while preserving its exact form.`,
        restore: [
          'Restore the marked seating/upholstery identity from the Base Render and approved design intent.',
          'Preserve seating shape, seams, cushion depth, proportions, and placement exactly.',
        ],
        keep: ['Keep the current result only where it improves natural leather/upholstery realism without changing shape, seams, or color identity.'],
        suppressed: ['Do not convert leather/upholstery into wood, plastic, glossy paint, or a new furniture design.'],
      };
    }
    if (hasBrass) {
      return {
        summary: `User indicates the ${location} brass/metal tone is too yellow or needs more controlled satin finish.`,
        restore: ['Restore brass/metal zones to the approved Base Render placement and material identity.'],
        keep: ['Keep only controlled satin/brushed brass reflection and edge definition from the result.'],
        suppressed: ['Do not spread yellow cast into neutral ceiling, columns, floor, mall ambient light, or non-brass surfaces.'],
      };
    }
    if (hasLight) {
      return {
        summary: `User indicates the ${location} lighting or exposure needs correction without redesigning the scene.`,
        restore: ['Restore camera, geometry, fixture positions, neutral mall ambience, and protected material colors from the Base Render.'],
        keep: ['Keep useful photographic highlight rolloff and shadow softness where architecture remains unchanged.'],
        suppressed: ['Do not use lighting changes as permission to recolor materials, redesign background, or move fixtures.'],
      };
    }
    return {
      summary: `User provided a scoped revision cue for the ${location}. Treat it as evidence for correction, not as raw prompt copy.`,
      restore: ['Compare the marked area against the Base Render and restore any drift in camera, geometry, material zoning, color identity, furniture, signage, or fixture placement.'],
      keep: ['Keep only current-result improvements that are compatible with the Base Render and protected assets.'],
      suppressed: ['Suppress any generic project rule that would expand beyond what is visible in the Base Render or explicitly requested.'],
    };
  };
  const composeProductionAgentRevisionPlan = (comments: ProductionReviewComment[], round: ResultRound): ProductionAgentRevisionPlan => {
    const now = new Date().toISOString();
    const interpreted = comments.map((comment) => ({ comment, interpretation: summarizeProductionCommentForAgent(comment) }));
    const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
    const observations = unique(interpreted.map(({ interpretation }) => interpretation.summary));
    const restoreFromBase = unique([
      'Base Render truth has highest priority: preserve exact camera, perspective, architecture, kiosk geometry, counter, canopy, columns, floor pattern, signage/logo, furniture positions, and lighting fixture positions.',
      ...interpreted.flatMap(({ interpretation }) => interpretation.restore),
    ]);
    const keepFromResult = unique([
      `Use the current result "${round.name}" only as the editable image for localized correction.`,
      'Keep current-result photographic improvements only when they do not conflict with the Base Render, protected assets, or explicit user corrections.',
      ...interpreted.flatMap(({ interpretation }) => interpretation.keep),
    ]);
    const applicableProjectRules = unique([
      projectSourceOfTruth?.profileName ? `Apply ${projectSourceOfTruth.profileName} Source of Truth only where visible in the Base Render or explicitly requested.` : 'Apply active project Source of Truth only where visible in the Base Render or explicitly requested.',
      materialRuleVisibilityGuard,
      'Protected assets and user-confirmed material identities override generic style guidance.',
    ]);
    const suppressedProjectRules = unique([
      ...interpreted.flatMap(({ interpretation }) => interpretation.suppressed),
      'Do not let brand/material rules invent new color accents, patterns, material zones, objects, or background details.',
    ]);
    const commentEvidence = interpreted.map(({ comment, interpretation }) => ({
      commentId: comment.id,
      commentNumber: comment.number,
      type: comment.type,
      location: comment.type === 'point' ? { x: Number((comment.x || 0).toFixed(3)), y: Number((comment.y || 0).toFixed(3)) } : undefined,
      summary: interpretation.summary,
      referenceScopes: comment.references?.flatMap((ref) => ref.scopes) || comment.referenceScopes || [],
    }));
    const scopedReferences = comments.flatMap((comment) => [
      ...(comment.references || []).map((ref) => ({
        commentId: comment.id,
        commentNumber: comment.number,
        name: ref.name,
        scopes: ref.scopes,
        usageNote: ref.usageNote,
      })),
      ...(!comment.references?.length && comment.referenceName ? [{
        commentId: comment.id,
        commentNumber: comment.number,
        name: comment.referenceName,
        scopes: comment.referenceScopes || [],
        usageNote: comment.referenceUsageNote,
      }] : []),
    ]);
    const finalRevisionPrompt = [
      'AGENT-COMPOSED PRODUCTION REVISION PROMPT',
      '',
      'SOURCE-OF-TRUTH PRIORITY',
      '1. Visible Base Render truth.',
      '2. Explicit current user correction interpreted by the Agent.',
      '3. Protected geometry and protected assets.',
      '4. Applicable Source of Truth rules.',
      '5. Enhancement goals and style guidance.',
      '',
      'ROLE',
      'You are a senior architectural photographer and digital retoucher correcting an AI result against the Base Render. Edit the current result image while restoring the approved Base Render design.',
      '',
      'AGENT REVISION INTERPRETATION',
      ...observations.map((item) => `- ${item}`),
      '',
      'BASE TRUTH RESTORATION',
      ...restoreFromBase.map((item) => `- ${item}`),
      '',
      'KEEP FROM CURRENT RESULT',
      ...keepFromResult.map((item) => `- ${item}`),
      '',
      'APPLICABLE PROJECT RULES',
      ...applicableProjectRules.map((item) => `- ${item}`),
      '',
      'SUPPRESSED PROJECT RULES',
      ...suppressedProjectRules.map((item) => `- ${item}`),
      '',
      'COMMENT EVIDENCE',
      ...commentEvidence.map((item) => `- Comment ${item.commentNumber} (${item.type}${item.location ? `, normalized position x=${item.location.x.toFixed(2)}, y=${item.location.y.toFixed(2)}` : ''}): ${item.summary}`),
      '',
      'SCOPED REFERENCES',
      ...(scopedReferences.length ? scopedReferences.map((ref) => `- Comment ${ref.commentNumber} reference "${ref.name}": use only for ${ref.scopes.join(', ') || 'the stated scoped cue'}${ref.usageNote ? `; ${ref.usageNote}` : ''}. Do not copy form, composition, architecture, lighting, camera, or background.`) : ['- No scoped reference images attached.']),
      '',
      'FINAL INSTRUCTION',
      'Only fix the Agent-interpreted issues above. Preserve approved design and do not redesign. Do not apply any project color/material rule beyond what is visible in the Base Render or explicitly requested by the user.',
    ].join('\n');
    return {
      id: id(),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      observations,
      restoreFromBase,
      keepFromResult,
      applicableProjectRules,
      suppressedProjectRules,
      commentEvidence,
      scopedReferences,
      finalRevisionPrompt,
    };
  };
  const processProductionCommentsWithCopilot = (overrideComments?: ProductionReviewComment[], sourceComments = productionComments) => {
    if (!activeResultRound) return;
    const openComments = overrideComments || processableProductionComments;
    if (!openComments.length) {
      showToast('Add open comments before processing.', 'warn');
      return;
    }
    const agentRevisionPlan = composeProductionAgentRevisionPlan(openComments, activeResultRound);
    const plan = [
      ...agentRevisionPlan.observations,
      ...agentRevisionPlan.restoreFromBase,
      ...agentRevisionPlan.applicableProjectRules,
      ...agentRevisionPlan.suppressedProjectRules,
    ];
    const qcNotes = agentRevisionPlan.commentEvidence.map((evidence) => `Comment ${evidence.commentNumber}${evidence.location ? ` at ${evidence.location.x.toFixed(2)}, ${evidence.location.y.toFixed(2)}` : ' global'}: ${evidence.summary}`);
    const qc = calculateResultQc({
      ...defaultResultQc,
      ...(activeResultRound.qc || {}),
      deviationNotes: Array.from(new Set([...(activeResultRound.qc?.deviationNotes || []), ...qcNotes])),
      revisionPrompt: '',
    });
    updateActiveResultComments(sourceComments, {
      processedRevisionPlan: plan,
      processedRevisionPlanUpdatedAt: new Date().toISOString(),
      agentRevisionPlan,
      qc,
      status: 'needs_revision',
    });
    setProductionStage('revise');
    showToast('Agent revision plan drafted. Review and apply before generating.');
  };
  const applyProductionAgentRevisionPlan = () => {
    if (!activeResultRound?.agentRevisionPlan) {
      showToast('Process comments with Copilot before applying a revision plan.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const appliedPlan: ProductionAgentRevisionPlan = {
      ...activeResultRound.agentRevisionPlan,
      status: 'applied',
      updatedAt: now,
    };
    const processedIds = new Set(appliedPlan.commentEvidence.map((item) => item.commentId));
    const nextComments = productionComments.map((comment) => processedIds.has(comment.id)
      ? { ...comment, status: 'processed' as const, updatedAt: now, processedRevisionIds: Array.from(new Set([...(comment.processedRevisionIds || []), appliedPlan.id])) }
      : comment);
    const qc = calculateResultQc({
      ...defaultResultQc,
      ...(activeResultRound.qc || {}),
      revisionPrompt: appliedPlan.finalRevisionPrompt,
    });
    updateActiveResultComments(nextComments, {
      agentRevisionPlan: appliedPlan,
      qc,
      processedRevisionPlan: [
        ...appliedPlan.observations,
        ...appliedPlan.restoreFromBase,
        ...appliedPlan.applicableProjectRules,
        ...appliedPlan.suppressedProjectRules,
      ],
      processedRevisionPlanUpdatedAt: now,
      status: 'needs_revision',
    });
    appendConversationPrompt(appliedPlan.finalRevisionPrompt);
    setProductionStage('revise');
    showToast('Agent revision plan applied. Generate Revision is ready.');
  };
  const sendRoundToQcStudio = (roundId: string) => {
    updateRenderPassBuilder({ activeResultRoundId: roundId, workflowPhase: 'qc_review' });
    setRenderPassViewMode('basic');
    setResultCompareMode('slider');
    setActiveTab('render-pass');
    showToast('Version opened in Review Mode.');
  };
  const buildWorkPlan = () => {
    updateRenderPassBuilder({
      approvedWorkPlan: false,
      workPlan: (renderPassState.workPlan || []).map((item) => ({ ...item, enabled: true })),
      localTelemetry: addTelemetryEvent({
        eventType: 'work_plan_build',
        mode: 'work',
        provider: 'local',
        model: 'work-plan-builder',
        status: 'success',
        durationMs: 0,
        estimatedCostTHB: 0,
        generationCostCategory: 'free',
        workPlanId: 'default-work-plan',
      }),
    });
    showToast('Work Plan built from cached intelligence.');
  };
  const toggleWorkPlanItem = (itemId: string) => {
    updateRenderPassBuilder({ workPlan: (renderPassState.workPlan || []).map((item) => item.id === itemId ? { ...item, enabled: !item.enabled } : item) });
  };
  const approveWorkPlan = () => {
    updateRenderPassBuilder({ approvedWorkPlan: true });
    showToast('Work Plan approved.');
  };
  const importResultImage = async (file?: File, externalTool: ResultRound['externalTool'] = 'other') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const selectedVersion = getActivePromptVersion(selectedRenderPass);
    const now = new Date().toISOString();
    const roundNumber = renderPassState.resultRounds.length + 1;
    const round: ResultRound = {
      id: id(),
      name: `Result Round ${String(roundNumber).padStart(2, '0')}`,
      imageDataUrl: await fileToDataURL(file),
      createdAt: now,
      updatedAt: now,
      sourcePassType: selectedRenderPass?.type,
      sourcePromptVersionId: selectedVersion?.id,
      sourcePromptVersionNumber: selectedVersion?.versionNumber,
      sourceAdapter: renderPassState.selectedModelAdapter,
      externalTool,
      status: 'needs_qc',
      notes: '',
      qc: calculateResultQc(defaultResultQc),
    };
    updateRenderPassBuilder({ resultRounds: [...renderPassState.resultRounds, round], activeResultRoundId: round.id, workflowPhase: 'qc_review' });
    showToast(`${round.name} imported locally.`);
  };
  const deleteResultRound = (roundId: string) => {
    const nextRounds = renderPassState.resultRounds.filter((round) => round.id !== roundId);
    updateRenderPassBuilder({ resultRounds: nextRounds, activeResultRoundId: nextRounds[0]?.id });
    showToast('Result round deleted.');
  };
  const updateActiveResultQc = (patch: Partial<ResultQc>) => {
    if (!activeResultRound) return;
    const qc = calculateResultQc({ ...defaultResultQc, ...(activeResultRound.qc || {}), ...patch });
    const status = qc.clientReadyScore && qc.clientReadyScore >= 85 && qc.hallucinationRisk === 'low' ? 'approved' : qc.hallucinationRisk === 'high' ? 'needs_revision' : activeResultRound.status === 'approved' ? 'approved' : 'needs_qc';
    updateResultRound(activeResultRound.id, { qc, status });
  };
  const addResultDeviationNote = () => {
    const note = resultDeviationDraft.trim();
    if (!activeResultRound || !note) return;
    updateActiveResultQc({ deviationNotes: [...(activeResultRound.qc?.deviationNotes || []), note] });
    setResultDeviationDraft('');
  };
  const removeResultDeviationNote = (index: number) => {
    if (!activeResultRound) return;
    updateActiveResultQc({ deviationNotes: (activeResultRound.qc?.deviationNotes || []).filter((_, itemIndex) => itemIndex !== index) });
  };
  const generateResultRevision = () => {
    if (!activeResultRound) {
      showToast('Import an AI result first.', 'warn');
      return;
    }
    const prompt = buildResultRevisionPrompt(renderPassState, activeResultRound, projectSourceOfTruth);
    const qc = calculateResultQc({ ...defaultResultQc, ...(activeResultRound.qc || {}), revisionPrompt: prompt });
    updateRenderPassBuilder({
      resultRounds: renderPassState.resultRounds.map((round) => round.id === activeResultRound.id ? { ...round, qc, status: 'needs_revision', updatedAt: new Date().toISOString() } : round),
      revisionHistory: [...(renderPassState.revisionHistory || []), {
        id: id(),
        createdAt: new Date().toISOString(),
        resultRoundId: activeResultRound.id,
        failedItems: [...(activeResultRound.qc?.deviationNotes || []), ...Object.entries(activeResultRound.qc || {}).filter(([, value]) => value === false).map(([key]) => key)],
        prompt,
      }],
      localTelemetry: addTelemetryEvent({
        eventType: 'generate_revision',
        mode: 'qc',
        provider: 'local',
        model: 'revision-prompt-template',
        status: 'success',
        durationMs: 0,
        estimatedCostTHB: 0,
        generationCostCategory: 'free',
        resultRoundId: activeResultRound.id,
        preserveScore: qc.preservationScore,
        photoScore: qc.photographicScore,
        readyScore: qc.clientReadyScore,
        deviationNotesCount: qc.deviationNotes.length,
        revisionPromptGenerated: true,
        needsRevision: true,
      }),
    });
    showToast('Result revision prompt generated.');
  };
  const appendCopilotPromptNote = (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setConversationPrompt((current) => current.trim() ? `${current.trim()}\n${cleaned}` : cleaned);
    updateRenderPassBuilder({ customRuleNote: renderPassState.customRuleNote?.trim() ? `${renderPassState.customRuleNote.trim()}\n${cleaned}` : cleaned });
  };
  const applyCopilotActions = (actions: CopilotActionProposal[]) => {
    let nextGoals = [...(renderPassState.quickGenerateGoals || [])];
    const promptNotes: string[] = [];
    const qcNotes: string[] = [];
    const materialRulePatches = new Map<string, Partial<ProjectMaterialRule>>();
    let openPromptInspector = false;
    let appliedCount = 0;

    actions.forEach((item) => {
      if (item.type === 'set_goal') {
        const goalId = String(item.payload.goalId || '');
        if (goalId && !nextGoals.includes(goalId)) nextGoals = [...nextGoals, goalId];
        appliedCount += 1;
      }
      if (item.type === 'remove_goal') {
        const goalId = String(item.payload.goalId || '');
        nextGoals = nextGoals.filter((goal) => goal !== goalId);
        appliedCount += 1;
      }
      if (item.type === 'set_user_request' || item.type === 'add_generation_note' || item.type === 'add_global_revision' || item.type === 'add_local_revision' || item.type === 'compose_revision_prompt') {
        const text = String(item.payload.text || item.payload.comment || item.sourceMessage || '').trim();
        if (text) promptNotes.push(text.startsWith('Copilot') ? text : `Copilot user request: ${text}`);
        appliedCount += 1;
      }
      if (item.type === 'add_deviation_note' || item.type === 'explain_result') {
        const text = String(item.payload.text || item.payload.comment || item.sourceMessage || '').trim();
        if (text) qcNotes.push(text);
        appliedCount += 1;
      }
      if (item.type === 'enable_material_rule') {
        const ruleId = String(item.payload.ruleId || '');
        if (ruleId) materialRulePatches.set(ruleId, { ...(materialRulePatches.get(ruleId) || {}), enabled: true });
        appliedCount += 1;
      }
      if (item.type === 'attach_reference') {
        const ruleId = String(item.payload.ruleId || '');
        const reference = item.payload.reference as { name?: string; dataUrl?: string } | undefined;
        const scopes = (item.payload.scopes as MaterialRuleReferenceScope[] | undefined) || ['material_identity_only', 'do_not_copy_form', 'do_not_copy_architecture'];
        const rule = projectSourceOfTruth.materialRules.find((candidate) => candidate.id === ruleId) || projectSourceOfTruth.materialRules[0];
        if (rule && reference?.dataUrl) {
          materialRulePatches.set(rule.id, {
            ...(materialRulePatches.get(rule.id) || {}),
            referenceImages: [
              ...rule.referenceImages,
              {
                id: id(),
                name: reference.name || 'Copilot reference',
                dataUrl: reference.dataUrl,
                scopes,
                notes: 'Added from Visual Local Copilot. Use only within selected reference scopes.',
                createdAt: new Date().toISOString(),
              },
            ],
          });
        } else {
          showToast('Copilot could not attach the reference because no material rule was available.', 'warn');
        }
        appliedCount += 1;
      }
      if (item.type === 'open_panel') {
        const section = String(item.payload.productSection || '');
        if (section) setProductSection(section as typeof productSection);
        appliedCount += 1;
      }
      if (item.type === 'inspect_compiled_prompt') {
        openPromptInspector = true;
        appliedCount += 1;
      }
      if (item.type === 'validate_prompt_conflict') {
        showToast('Copilot detected a protected Source of Truth conflict. Review Settings before overriding.', 'warn');
        appliedCount += 1;
      }
      if (item.type === 'request_missing_information') {
        const question = String(item.payload.question || item.rationale || '').trim();
        if (question) showToast(question, 'warn');
        appliedCount += 1;
      }
      if (item.type === 'prepare_generation') {
        setProductSection('studio');
        setActiveTab('render-pass');
        appliedCount += 1;
      }
    });

    const renderPatch: Partial<RenderPassBuilderState> = {};
    if (nextGoals.join('|') !== (renderPassState.quickGenerateGoals || []).join('|')) renderPatch.quickGenerateGoals = nextGoals;
    if (promptNotes.length) {
      const noteText = promptNotes.join('\n');
      setConversationPrompt((current) => current.trim() ? `${current.trim()}\n${noteText}` : noteText);
      renderPatch.customRuleNote = renderPassState.customRuleNote?.trim() ? `${renderPassState.customRuleNote.trim()}\n${noteText}` : noteText;
      renderPatch.sceneSetup = {
        ...renderPassState.sceneSetup,
        outputGoal: renderPassState.sceneSetup.outputGoal?.trim() ? `${renderPassState.sceneSetup.outputGoal.trim()}\n${noteText}` : noteText,
      };
    }
    if (openPromptInspector) {
      setProductSection('studio');
      setActiveTab('render-pass');
      setRenderPassViewMode('advanced');
      setProModeEnabled(true);
    }
    if (materialRulePatches.size || Object.keys(renderPatch).length) {
      const nextSourceOfTruth = materialRulePatches.size ? {
        ...projectSourceOfTruth,
        materialRules: projectSourceOfTruth.materialRules.map((rule) => {
          const patch = materialRulePatches.get(rule.id);
          return patch ? { ...rule, ...patch, updatedAt: new Date().toISOString() } : rule;
        }),
        updatedAt: new Date().toISOString(),
      } : projectSourceOfTruth;
      const nextRenderPassBuilder = Object.keys(renderPatch).length
        ? normalizeRenderPassBuilderState({ ...renderPassState, ...renderPatch, updatedAt: new Date().toISOString() })
        : renderPassState;
      updateProject({
        ...project,
        sourceOfTruth: nextSourceOfTruth,
        scenes: project.scenes.map((item) => item.id === scene.id ? { ...item, renderPassBuilder: nextRenderPassBuilder } : item),
      });
    }
    if (qcNotes.length) {
      if (activeResultRound) {
        updateActiveResultQc({ deviationNotes: [...(activeResultRound.qc?.deviationNotes || []), ...qcNotes] });
      } else {
        appendCopilotPromptNote(qcNotes.join('\n'));
      }
    }
    showToast(`${appliedCount} Copilot action${appliedCount === 1 ? '' : 's'} applied.`);
  };
  const copyResultRevisionPrompt = async () => {
    const prompt = activeResultRound?.qc?.revisionPrompt;
    if (!prompt?.trim()) {
      showToast('Generate a result revision prompt first.', 'warn');
      return;
    }
    await navigator.clipboard.writeText(prompt);
    showToast('Result revision prompt copied.');
  };
  const saveResultRevisionAsPromptVersion = () => {
    if (!activeResultRound?.qc?.revisionPrompt?.trim() || !selectedRenderPass) {
      showToast('Generate a result revision prompt first.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const nextNumber = (selectedRenderPass.promptVersions || []).reduce((max, item) => Math.max(max, item.versionNumber || 0), 0) + 1;
    const version: RenderPromptVersion = {
      id: id(),
      passType: 'qc_review',
      versionNumber: nextNumber,
      title: `Result QC Revision v${nextNumber}`,
      prompt: activeResultRound.qc.revisionPrompt,
      negativePrompt: buildRenderPassNegativePrompt(renderPassState, 'qc_review', projectSourceOfTruth),
      adapter: renderPassState.selectedModelAdapter || 'generic',
      status: 'generated',
      createdAt: now,
      updatedAt: now,
      source: 'manual_edit',
      notes: `Revision prompt from ${activeResultRound.name}`,
    };
    updateRenderPass('qc_review', (pass) => ({ ...pass, enabled: true, prompt: version.prompt, promptVersions: [...pass.promptVersions, version], activeVersionId: version.id, status: 'generated', updatedAt: now }));
    updateRenderPassBuilder({ selectedPassType: 'qc_review' });
    showToast('Saved as QC revision prompt version.');
  };
  const addRenderPassInput = async (type: RenderPassInputType, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const dataUrl = await fileToDataURL(file);
    const size = await imageSize(dataUrl);
    const now = new Date().toISOString();
    const label = renderPassInputTypeOptions.find((option) => option.value === type)?.label || 'Render Pass Input';
    const input: RenderPassInput = {
      id: id(),
      type,
      name: file.name.replace(/\.[^.]+$/, '') || label,
      dataUrl,
      fileName: file.name,
      width: size.width || undefined,
      height: size.height || undefined,
      createdAt: now,
      updatedAt: now,
      enabled: true,
      notes: '',
      colorLegend: [],
    };
    updateRenderPassBuilder({
      renderPassInputs: [...renderPassState.renderPassInputs, input],
      activeObjectIdInputId: type === 'object_id' ? input.id : renderPassState.activeObjectIdInputId,
      activeMaterialIdInputId: type === 'material_id' ? input.id : renderPassState.activeMaterialIdInputId,
      activeDepthInputId: type === 'depth' ? input.id : renderPassState.activeDepthInputId,
    });
    showToast(`${label} added locally.`);
  };
  const updateRenderPassInput = (inputId: string, patch: Partial<RenderPassInput>) => {
    updateRenderPassBuilder({
      renderPassInputs: renderPassState.renderPassInputs.map((input) => input.id === inputId ? { ...input, ...patch, updatedAt: new Date().toISOString() } : input),
    });
  };
  const deleteRenderPassInput = (inputId: string) => {
    updateRenderPassBuilder({
      renderPassInputs: renderPassState.renderPassInputs.filter((input) => input.id !== inputId),
      activeObjectIdInputId: renderPassState.activeObjectIdInputId === inputId ? undefined : renderPassState.activeObjectIdInputId,
      activeMaterialIdInputId: renderPassState.activeMaterialIdInputId === inputId ? undefined : renderPassState.activeMaterialIdInputId,
      activeDepthInputId: renderPassState.activeDepthInputId === inputId ? undefined : renderPassState.activeDepthInputId,
    });
    showToast('Render pass input removed.');
  };
  const addColorLegendEntry = (input: RenderPassInput, colorHex = '#FF8800') => {
    updateRenderPassInput(input.id, {
      colorLegend: [...(input.colorLegend || []), { id: id(), colorHex, label: `Unlabeled color ${(input.colorLegend || []).length + 1}`, role: 'unknown', locked: false, notes: '' }],
    });
  };
  const updateColorLegendEntry = (input: RenderPassInput, entryId: string, patch: Partial<ColorLegendEntry>) => {
    updateRenderPassInput(input.id, {
      colorLegend: (input.colorLegend || []).map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry),
    });
  };
  const removeColorLegendEntry = (input: RenderPassInput, entryId: string) => {
    updateRenderPassInput(input.id, { colorLegend: (input.colorLegend || []).filter((entry) => entry.id !== entryId) });
  };
  const analyzeRenderPassColors = async (input: RenderPassInput) => {
    const img = await loadImage(input.dataUrl);
    const canvas = document.createElement('canvas');
    const max = 120;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const avg = (r + g + b) / 3;
      if (avg < 8 || avg > 248) continue;
      const hex = rgbToHex(Math.round(r / 32) * 32, Math.round(g / 32) * 32, Math.round(b / 32) * 32);
      buckets.set(hex, (buckets.get(hex) || 0) + 1);
    }
    const existing = new Set((input.colorLegend || []).map((entry) => entry.colorHex.toUpperCase()));
    const entries = [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([colorHex]) => colorHex)
      .filter((colorHex) => !existing.has(colorHex.toUpperCase()))
      .slice(0, 12)
      .map((colorHex, index) => ({ id: id(), colorHex, label: `Unlabeled color #${index + 1}`, role: 'unknown' as const, locked: false, notes: 'Draft from local color analysis' }));
    if (!entries.length) {
      showToast('No new dominant colors found.', 'warn');
      return;
    }
    updateRenderPassInput(input.id, { colorLegend: [...(input.colorLegend || []), ...entries] });
    showToast(`${entries.length} draft color legend entries added.`);
  };
  const addProtectedAsset = () => {
    const asset: ProtectedDesignAsset = { id: id(), name: 'New Protected Asset', description: '', locked: true };
    updateRenderPassBuilder({ protectedAssets: [...renderPassState.protectedAssets, asset] });
  };
  const addNamedProtectedAsset = () => {
    const name = newProtectedAssetName.trim();
    if (!name) return;
    if (renderPassState.protectedAssets.some((asset) => asset.name.trim().toLowerCase() === name.toLowerCase())) {
      showToast(`${name} already exists.`, 'warn');
      return;
    }
    const asset: ProtectedDesignAsset = { id: id(), name, description: '', locked: true, status: 'locked' };
    updateRenderPassBuilder({ protectedAssets: [...renderPassState.protectedAssets, asset] });
    setNewProtectedAssetName('');
    showToast(`${name} added to protected assets.`);
  };
  const updateProtectedAsset = (assetId: string, patch: Partial<ProtectedDesignAsset>) => {
    updateRenderPassBuilder({ protectedAssets: renderPassState.protectedAssets.map((asset) => asset.id === assetId ? { ...asset, ...patch } : asset) });
  };
  const deleteProtectedAsset = (assetId: string) => {
    updateRenderPassBuilder({ protectedAssets: renderPassState.protectedAssets.filter((asset) => asset.id !== assetId) });
  };
  const toggleProtectedAssetLock = (asset: ProtectedDesignAsset) => {
    const nextLocked = !(asset.locked || asset.status === 'locked');
    updateProtectedAsset(asset.id, { locked: nextLocked, status: nextLocked ? 'locked' : 'editable' });
  };
  const loadProtectedAssetPreset = (presetName: string) => {
    const names = protectedAssetPresets[presetName];
    if (!names) return;
    const existing = new Set(renderPassState.protectedAssets.map((asset) => asset.name.trim().toLowerCase()));
    const additions = names
      .filter((name) => !existing.has(name.toLowerCase()))
      .map((name) => ({ id: id(), name, description: '', locked: true, status: 'locked' as const }));
    if (!additions.length) {
      showToast(`${presetName} assets are already loaded.`);
      return;
    }
    updateRenderPassBuilder({ protectedAssets: [...renderPassState.protectedAssets, ...additions] });
    showToast(`${presetName} preset loaded (${additions.length} assets added).`);
  };
  const saveGeminiKey = () => {
    const key = geminiKeyDraft.trim();
    if (!key) {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      setGeminiApiKey('');
      showToast('Gemini API key cleared.');
      return;
    }
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
    setGeminiApiKey(key);
    setShowGeminiKeyField(false);
    showToast('Gemini API key saved locally.');
  };
  const clearGeminiKey = () => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    setGeminiApiKey('');
    setGeminiKeyDraft('');
    showToast('Gemini API key cleared.');
  };
  const addComposerReferences = async (files: FileList | File[] | null | undefined) => {
    const picked = imageFilesFromList(files);
    if (!picked.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    const refs: SceneReferenceImage[] = await Promise.all(picked.map(async (file) => ({
      id: id(),
      name: file.name.replace(/\.[^.]+$/, ''),
      dataUrl: await fileToDataURL(file),
      role: 'material_mood',
      notes: '',
      included: true,
    })));
    updateRenderPassBuilder({
      aiComposer: {
        ...renderPassState.aiComposer,
        references: [...renderPassState.aiComposer.references, ...refs],
      },
    });
    showToast(`${picked.length} composer reference${picked.length > 1 ? 's' : ''} added.`);
  };
  const updateComposerReference = (refId: string, patch: Partial<SceneReferenceImage>) => {
    updateRenderPassBuilder({
      aiComposer: {
        ...renderPassState.aiComposer,
        references: renderPassState.aiComposer.references.map((ref) => ref.id === refId ? { ...ref, ...patch } : ref),
      },
    });
  };
  const removeComposerReference = (refId: string) => {
    updateRenderPassBuilder({
      aiComposer: {
        ...renderPassState.aiComposer,
        references: renderPassState.aiComposer.references.filter((ref) => ref.id !== refId),
      },
    });
  };
  const runGeminiComposer = async () => {
    if (!geminiApiKey.trim()) {
      updateRenderPassBuilder({ aiComposer: { ...renderPassState.aiComposer, lastError: 'Missing Gemini API key.' } });
      setShowGeminiKeyField(true);
      showToast('Configure Gemini API key first.', 'warn');
      return;
    }
    if (!scene.baseImage) {
      showToast('Upload a base render first.', 'warn');
      return;
    }
    setIsGeminiLoading(true);
    try {
      const result = await callGeminiSceneComposer({
        apiKey: geminiApiKey,
        model: renderPassState.aiComposer.model || 'gemini-2.5-flash',
        scene,
        state: renderPassState,
        sourceOfTruth: projectSourceOfTruth,
      });
      if (result.error || !result.parsed) {
        updateRenderPassBuilder({
          aiComposer: {
            ...renderPassState.aiComposer,
            lastRawResponse: result.raw,
            lastError: result.error || 'Gemini response did not match visual-local-ai-composer-v1.',
          },
        });
        showToast('Gemini response needs review.', 'warn');
        return;
      }
      const entry = { id: id(), createdAt: new Date().toISOString(), response: result.parsed, rawResponse: result.raw };
      updateRenderPassBuilder({
        aiComposer: {
          ...renderPassState.aiComposer,
          lastResponse: result.parsed,
          lastRawResponse: result.raw,
          lastError: undefined,
          history: [...renderPassState.aiComposer.history, entry],
        },
      });
      showToast('Gemini Scene Composer analysis ready.');
    } catch (error) {
      updateRenderPassBuilder({
        aiComposer: {
          ...renderPassState.aiComposer,
          lastError: error instanceof Error ? error.message : 'Gemini request failed.',
        },
      });
      showToast('Gemini request failed.', 'warn');
    } finally {
      setIsGeminiLoading(false);
    }
  };
  const mergeVisionIntoSceneIntelligence = (response: VisualLocalAiComposerResponse, sceneHash: string, model: string, costTHB: number) => {
    const analysis = response.sceneAnalysis;
    const existing = renderPassState.sceneIntelligence;
    const now = new Date().toISOString();
    return {
      ...(existing || {}),
      updatedAt: now,
      analysisSource: 'gemini_vision' as const,
      sceneHash,
      visionTimestamp: now,
      visionModel: model,
      analysisCostTHB: costTHB,
      sceneGraph: {
        ...(existing?.sceneGraph || {}),
        sceneType: scene.type || existing?.sceneGraph.sceneType || 'premium retail kiosk',
        locationType: response.recommendedDirection?.environmentDirection || analysis?.environmentCondition || existing?.sceneGraph.locationType || 'indoor shopping mall',
        cameraDescription: analysis?.cameraSummary || existing?.sceneGraph.cameraDescription || 'frontal architectural view',
        designIntent: response.recommendedDirection?.visualDirection || existing?.sceneGraph.designIntent || renderPassState.sceneSetup.outputGoal,
        keyArchitecturalElements: analysis?.architectureToPreserve?.length ? analysis.architectureToPreserve : existing?.sceneGraph.keyArchitecturalElements || [],
        protectedElements: Array.from(new Set([...(existing?.sceneGraph.protectedElements || []), ...(analysis?.protectedAssetsVisible || []), ...renderPassState.protectedAssets.filter((asset) => asset.locked || asset.status === 'locked').map((asset) => asset.name)])),
        visibleMaterials: analysis?.materialZones?.length ? analysis.materialZones.map((zone) => zone.name) : existing?.sceneGraph.visibleMaterials || [],
        visibleLightingConditions: [analysis?.lightingCondition, response.recommendedDirection?.lightingDirection].filter(Boolean) as string[],
        likelyRenderWeaknesses: [analysis?.hallucinationRisks?.join(', '), response.confidence?.notes?.join(', ')].filter(Boolean) as string[],
      },
    };
  };
  const runVisionIntelligence = async (force = false) => {
    if (!scene.baseImage) {
      showToast('Upload a base render first.', 'warn');
      return;
    }
    const apiKey = getActiveGoogleVisionApiKey();
    if (!apiKey.trim()) {
      showToast('Configure a Google Lite/Pro API key first.', 'warn');
      return;
    }
    const deterministicPatch = await buildDeterministicAnalysisPatch(scene.baseImage);
    const currentHash = deterministicPatch.sceneHash;
    if (!force && renderPassState.sceneHash === currentHash && renderPassState.visionTimestamp && renderPassState.analysisSource === 'gemini_vision') {
      updateRenderPassBuilder({
        analysisSource: 'cached_gemini_vision',
        sceneIntelligence: { ...renderPassState.sceneIntelligence, analysisSource: 'cached_gemini_vision' as const },
        generationRules: generateSuggestedRules('vision', { ...renderPassState, analysisSource: 'cached_gemini_vision', sceneHash: currentHash } as RenderPassBuilderState),
        localTelemetry: addTelemetryEvent({
          eventType: 'vision_analysis',
          mode: 'work',
          provider: selectedGenerationAdapter.id === 'google_pro_image' ? 'google_pro_image' : 'google_lite_image',
          model: renderPassState.visionModel || renderPassState.aiComposer.model || 'gemini-2.5-flash',
          status: 'success',
          durationMs: 0,
          estimatedCostTHB: 0,
          generationCostCategory: 'vision',
          analysisSource: 'cached',
          wasCached: true,
          cacheHit: true,
          detectedSceneType: renderPassState.sceneIntelligence?.sceneGraph.sceneType,
          detectedMaterials: renderPassState.sceneIntelligence?.sceneGraph.visibleMaterials,
          detectedLightingIssues: renderPassState.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses,
          detectedProtectionRisks: renderPassState.sceneIntelligence?.sceneGraph.protectedElements,
          detectedHallucinationRisks: renderPassState.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses,
        }),
      });
      showToast('Using cached Vision Intelligence. No Vision API cost.');
      return;
    }
    const costTHB = 1.2;
    if (!confirm(`Analyze Scene uses one Vision API request.\nEstimated cost: ~THB ${costTHB.toFixed(2)}.\nContinue?`)) return;
    setIsGeminiLoading(true);
    const startedAt = performance.now();
    try {
      const model = renderPassState.aiComposer.model || 'gemini-2.5-flash';
      const result = await callGeminiSceneComposer({ apiKey, model, scene, state: renderPassState, sourceOfTruth: projectSourceOfTruth });
      if (result.error || !result.parsed) {
        updateRenderPassBuilder({ aiComposer: { ...renderPassState.aiComposer, lastRawResponse: result.raw, lastError: result.error || 'Vision analysis did not return structured data.' } });
        showToast('Vision analysis needs review.', 'warn');
        return;
      }
      const entry = { id: id(), createdAt: new Date().toISOString(), response: result.parsed, rawResponse: result.raw };
      const usageRecord: AiGenerationUsageRecord = {
        id: id(),
        createdAt: new Date().toISOString(),
        provider: 'google_lite_image',
        usageKind: 'vision_analysis',
        model,
        mode: 'draft',
        selectedGoals: ['Analyze Scene'],
        status: 'success',
        durationMs: Math.round(performance.now() - startedAt),
        estimatedCostTHB: costTHB,
      };
      const mergedSceneIntelligence = mergeVisionIntoSceneIntelligence(result.parsed, currentHash, model, costTHB);
      const stateWithVision = normalizeRenderPassBuilderState({
        ...renderPassState,
        ...deterministicPatch,
        analysisSource: 'gemini_vision',
        visionTimestamp: mergedSceneIntelligence.visionTimestamp,
        visionModel: model,
        analysisCostTHB: costTHB,
        sceneIntelligence: mergedSceneIntelligence,
      });
      updateRenderPassBuilder({
        ...deterministicPatch,
        analysisSource: 'gemini_vision',
        visionTimestamp: mergedSceneIntelligence.visionTimestamp,
        visionModel: model,
        analysisCostTHB: costTHB,
        sceneIntelligence: mergedSceneIntelligence,
        generationRules: generateSuggestedRules('vision', stateWithVision),
        rulesSceneHash: currentHash,
        rulesVisionTimestamp: mergedSceneIntelligence.visionTimestamp,
        quickGenerateUsage: [...(renderPassState.quickGenerateUsage || []), usageRecord],
        localTelemetry: addTelemetryEvent({
          eventType: 'vision_analysis',
          mode: 'work',
          provider: selectedGenerationAdapter.id === 'google_pro_image' ? 'google_pro_image' : 'google_lite_image',
          model,
          status: 'success',
          durationMs: usageRecord.durationMs,
          estimatedCostTHB: costTHB,
          generationCostCategory: 'vision',
          analysisSource: 'gemini',
          wasCached: false,
          cacheHit: false,
          visionModel: model,
          detectedSceneType: mergedSceneIntelligence.sceneGraph.sceneType,
          detectedMaterials: mergedSceneIntelligence.sceneGraph.visibleMaterials,
          detectedLightingIssues: mergedSceneIntelligence.sceneGraph.likelyRenderWeaknesses,
          detectedProtectionRisks: mergedSceneIntelligence.sceneGraph.protectedElements,
          detectedHallucinationRisks: mergedSceneIntelligence.sceneGraph.likelyRenderWeaknesses,
        }),
        aiComposer: {
          ...renderPassState.aiComposer,
          lastResponse: result.parsed,
          lastRawResponse: result.raw,
          lastError: undefined,
          history: [...renderPassState.aiComposer.history, entry],
        },
      });
      showToast('Vision Intelligence cached and suggested rules generated.');
    } catch (error) {
      updateRenderPassBuilder({
        localTelemetry: addTelemetryEvent({
          eventType: 'vision_analysis',
          mode: 'work',
          provider: selectedGenerationAdapter.id === 'google_pro_image' ? 'google_pro_image' : 'google_lite_image',
          model: renderPassState.aiComposer.model || 'gemini-2.5-flash',
          status: 'error',
          durationMs: Math.round(performance.now() - startedAt),
          estimatedCostTHB: 0,
          generationCostCategory: 'vision',
          analysisSource: 'gemini',
          errorMessage: error instanceof Error ? error.message : 'Vision analysis failed.',
        }),
      });
      showToast(error instanceof Error ? error.message : 'Vision analysis failed.', 'warn');
    } finally {
      setIsGeminiLoading(false);
    }
  };
  const composerResponse = renderPassState.aiComposer.lastResponse;
  const applyComposerDetectedAssets = () => {
    const names = composerResponse?.sceneAnalysis?.protectedAssetsVisible || [];
    if (!names.length) {
      showToast('No detected protected assets to apply.', 'warn');
      return;
    }
    const existing = new Set(renderPassState.protectedAssets.map((asset) => asset.name.trim().toLowerCase()));
    const additions = names
      .map((name) => name.trim())
      .filter((name) => name && !existing.has(name.toLowerCase()))
      .map((name) => ({ id: id(), name, description: 'Detected by Gemini Scene Composer', locked: true, status: 'locked' as const }));
    if (!additions.length) {
      showToast('Detected assets already exist.');
      return;
    }
    updateRenderPassBuilder({
      protectedAssets: [...renderPassState.protectedAssets, ...additions],
      aiComposer: { ...renderPassState.aiComposer, appliedAt: new Date().toISOString() },
    });
    showToast(`${additions.length} detected asset${additions.length > 1 ? 's' : ''} applied.`);
  };
  const applyComposerDirections = (target: 'material' | 'lighting' | 'environment') => {
    if (!composerResponse?.recommendedDirection) return;
    const direction = composerResponse.recommendedDirection;
    const nextContext = { ...renderPassState.productionContext };
    if (target === 'material' && direction.materialDirection) {
      nextContext.materials = { ...nextContext.materials, notes: nextContext.materials.notes || direction.materialDirection, summary: nextContext.materials.summary || direction.materialDirection, updatedAt: new Date().toISOString() };
    }
    if (target === 'lighting' && direction.lightingDirection) {
      nextContext.lighting = { ...nextContext.lighting, notes: nextContext.lighting.notes || direction.lightingDirection, summary: nextContext.lighting.summary || direction.lightingDirection, updatedAt: new Date().toISOString() };
    }
    if (target === 'environment' && direction.environmentDirection) {
      nextContext.project = { ...nextContext.project, notes: nextContext.project.notes || direction.environmentDirection, updatedAt: new Date().toISOString() };
    }
    updateRenderPassBuilder({ productionContext: nextContext, aiComposer: { ...renderPassState.aiComposer, appliedAt: new Date().toISOString() } });
    showToast(`${target} direction applied as suggestion context.`);
  };
  const applyComposerPassPlan = () => {
    const plan = composerResponse?.passPlan || [];
    if (!plan.length) {
      showToast('No pass plan to apply.', 'warn');
      return;
    }
    const map: Record<string, RenderPassType> = {
      analyze_image: 'analyze_architecture',
      lock_architecture: 'architecture_lock',
      material_enhancement: 'material_enhancement',
      lighting_direction: 'lighting_direction',
      environment_context: 'environment',
      human_activity: 'people',
      photographic_finish: 'photographic_finish',
      qc_review: 'qc_review',
    };
    const enabled = new Set(plan.map((item) => map[item.pass]).filter(Boolean));
    updateRenderPassBuilder({
      passes: renderPassState.passes.map((pass) => ({ ...pass, enabled: enabled.has(pass.type) || pass.enabled })),
      selectedPassType: plan[0]?.pass ? map[plan[0].pass] || renderPassState.selectedPassType : renderPassState.selectedPassType,
      aiComposer: { ...renderPassState.aiComposer, appliedAt: new Date().toISOString() },
    });
    showToast('Gemini pass plan applied.');
  };
  const saveComposerPromptVersion = () => {
    const prompt = composerResponse?.promptPackage?.fullPrompt;
    if (!prompt?.trim() || !selectedRenderPass) {
      showToast('No Gemini prompt package to save.', 'warn');
      return;
    }
    const now = new Date().toISOString();
    const nextNumber = (selectedRenderPass.promptVersions || []).reduce((max, item) => Math.max(max, item.versionNumber || 0), 0) + 1;
    const version: RenderPromptVersion = {
      id: id(),
      passType: selectedRenderPass.type,
      versionNumber: nextNumber,
      title: `${selectedRenderPass.title} v${nextNumber}`,
      prompt,
      negativePrompt: composerResponse?.promptPackage?.negativePrompt || buildRenderPassNegativePrompt(renderPassState, selectedRenderPass.type, projectSourceOfTruth),
      adapter: renderPassState.selectedModelAdapter || 'generic',
      status: 'generated',
      createdAt: now,
      updatedAt: now,
      source: 'gemini_composer',
      notes: 'Generated by Gemini Scene Composer',
    };
    updateRenderPass(selectedRenderPass.type, (pass) => ({ ...pass, prompt, promptVersions: [...pass.promptVersions, version], activeVersionId: version.id, status: 'generated', updatedAt: now }));
    showToast('Gemini prompt saved as new version.');
  };
  const applyComposerObjectIdMap = () => {
    const items = composerResponse?.renderPassInputAnalysis?.objectIdMap || [];
    if (!items.length) {
      showToast('No Object ID map to apply.', 'warn');
      return;
    }
    const existing = new Set(renderPassState.protectedAssets.map((asset) => asset.name.trim().toLowerCase()));
    const additions = items
      .map((item) => item.inferredObjectName || item.label || '')
      .filter((name) => name.trim() && !existing.has(name.trim().toLowerCase()))
      .map((name) => ({ id: id(), name, description: 'Applied from Gemini Object ID map', locked: true, status: 'locked' as const }));
    updateRenderPassBuilder({ protectedAssets: [...renderPassState.protectedAssets, ...additions], aiComposer: { ...renderPassState.aiComposer, appliedAt: new Date().toISOString() } });
    showToast(`${additions.length} Object ID asset${additions.length === 1 ? '' : 's'} applied.`);
  };
  const applyComposerMaterialIdMap = () => {
    const items = composerResponse?.renderPassInputAnalysis?.materialIdMap || [];
    if (!items.length) {
      showToast('No Material ID map to apply.', 'warn');
      return;
    }
    const notes = items.map((item) => `${item.materialName}${item.correspondingBaseRenderLocation ? ` at ${item.correspondingBaseRenderLocation}` : ''}${item.recommendedDirection ? `: ${item.recommendedDirection}` : ''}`).join('\n');
    updateRenderPassBuilder({
      productionContext: {
        ...renderPassState.productionContext,
        materials: {
          ...renderPassState.productionContext.materials,
          notes: [renderPassState.productionContext.materials.notes, notes].filter(Boolean).join('\n'),
          summary: renderPassState.productionContext.materials.summary || 'Material ID map imported as material-zone guidance.',
          updatedAt: new Date().toISOString(),
        },
      },
      aiComposer: { ...renderPassState.aiComposer, appliedAt: new Date().toISOString() },
    });
    showToast('Material ID directions applied.');
  };
  const applyComposerDepthNotes = () => {
    const depth = composerResponse?.renderPassInputAnalysis?.depthAnalysis;
    if (!depth) {
      showToast('No depth analysis to apply.', 'warn');
      return;
    }
    const notes = [
      depth.foreground?.length ? `Foreground: ${depth.foreground.join(', ')}` : '',
      depth.midground?.length ? `Midground: ${depth.midground.join(', ')}` : '',
      depth.background?.length ? `Background: ${depth.background.join(', ')}` : '',
      depth.atmosphereNotes ? `Atmosphere: ${depth.atmosphereNotes}` : '',
    ].filter(Boolean).join('\n');
    updateRenderPassBuilder({
      productionContext: {
        ...renderPassState.productionContext,
        project: { ...renderPassState.productionContext.project, notes: [renderPassState.productionContext.project.notes, notes].filter(Boolean).join('\n'), updatedAt: new Date().toISOString() },
      },
      aiComposer: { ...renderPassState.aiComposer, appliedAt: new Date().toISOString() },
    });
    showToast('Depth notes applied to project context.');
  };
  const onValidatePromptJson = () => {
    const result = validatePromptImportJson(promptJsonInput);
    setPromptValidation(result);
  };
  const onLoadPromptJsonFile = async (f?: File) => {
    if (!f) return;
    setPromptJsonInput(await f.text());
  };
  const normalizeSlotCategoryFromSuggestion = (raw?: string): SlotCategory | null => {
    if (!raw) return null;
    const value = raw.toLowerCase();
    if (value === 'material' || value === 'materials') return 'materials';
    if (value === 'prop' || value === 'props') return 'props';
    if (value === 'lighting') return 'lighting';
    if (value === 'environment') return 'environment';
    return null;
  };
  const normalizeImportedSlotEnrichment = (parsed: ImportedPromptPackage): SlotEnrichmentSuggestion[] => (
    (parsed.slotEnrichment || []).map((entry) => ({
      id: id(),
      code: entry.code,
      confirmedByUser: entry.confirmedByUser,
      inferredName: entry.inferredName,
      inferredThaiIntent: entry.inferredThaiIntent,
      inferredApplyTo: entry.inferredApplyTo,
      inferredFinish: entry.inferredFinish,
      inferredTexture: entry.inferredTexture,
      inferredAvoid: Array.isArray(entry.inferredAvoid) ? entry.inferredAvoid.join(', ') : entry.inferredAvoid,
      confidence: entry.confidence,
      basis: entry.basis,
      status: 'pending',
    }))
  );
  const normalizeImportedAiSuggestions = (parsed: ImportedPromptPackage): AiEnrichmentSuggestion[] => (
    (parsed.aiEnrichmentSuggestions || []).map((entry) => ({
      id: entry.id || id(),
      action: entry.action,
      slotType: entry.slotType,
      suggestedCode: entry.suggestedCode,
      suggestedName: entry.suggestedName,
      code: entry.code,
      targetSlotCode: entry.targetSlotCode,
      targetSlotId: entry.targetSlotId,
      thaiDescription: entry.thaiDescription,
      englishPromptNote: entry.englishPromptNote,
      applyTo: entry.applyTo,
      finish: entry.finish,
      texture: entry.texture,
      avoid: entry.avoid,
      creativeFreedom: entry.creativeFreedom,
      color: entry.color,
      confidence: entry.confidence,
      basis: entry.basis,
      overwrite: entry.overwrite,
      mappingSuggestion: entry.mappingSuggestion ? {
        type: entry.mappingSuggestion.type === 'pin' ? 'pin' : 'region',
        normalizedPoint: entry.mappingSuggestion.normalizedPoint,
        normalizedRect: entry.mappingSuggestion.normalizedRect,
      } : undefined,
      status: 'pending',
    }))
  );
  const openAiPromptViewer = (preferLatest = false) => {
    const history = scene.promptPackages || [];
    setActiveTab('ai-prompt');
    setActivePromptBlock('fullRenderPrompt');
    if (!history.length) return;
    const preferred = (preferLatest ? history[history.length - 1] : null)
      || history.find((entry) => entry.id === scene.activePromptPackageId)
      || history[0];
    if (preferred && scene.activePromptPackageId !== preferred.id) {
      updateScene({ activePromptPackageId: preferred.id });
    }
  };
  const onImportPromptPackage = () => {
    const result = validatePromptImportJson(promptJsonInput);
    setPromptValidation(result);
    if (result.status === 'error' || !result.parsed) return;
    const entry = toHistoryEntry(result.parsed);
    const incomingEnrichment = normalizeImportedSlotEnrichment(result.parsed);
    const incomingSuggestions = normalizeImportedAiSuggestions(result.parsed);
    updateScene({
      promptPackages: [...(scene.promptPackages || []), entry],
      activePromptPackageId: entry.id,
      slotEnrichmentSuggestions: [...(scene.slotEnrichmentSuggestions || []), ...incomingEnrichment],
      aiEnrichmentSuggestions: [...(scene.aiEnrichmentSuggestions || []), ...incomingSuggestions],
    });
    setActivePromptBlock('fullRenderPrompt');
    setActiveTab('ai-prompt');
    if (incomingEnrichment.length || incomingSuggestions.length) {
      showToast('AI suggestions imported. Review before applying.');
      return;
    }
    showToast('Prompt package imported. Open AI Prompt to copy fullRenderPrompt.');
  };
  const onGenerateRevisionPrompt = () => {
    const prompt = buildRevisionPrompt(scene, activePromptPackage, revisionDraft, projectSourceOfTruth);
    const entry: RevisionPromptEntry = { ...revisionDraft, id: id(), createdAt: new Date().toISOString(), prompt };
    updateScene({ revisionPrompts: [...(scene.revisionPrompts || []), entry] });
  };

  useEffect(() => {
    const onWindowPaste = async (event: ClipboardEvent) => {
      const imageFiles = imageFilesFromClipboard(event.clipboardData);
      if (!imageFiles.length) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const inInspector = Boolean(activeEl && rightInspectorRef.current?.contains(activeEl));
      event.preventDefault();
      if (!scene.baseImage) {
        await onBaseUpload(imageFiles[0], 'paste');
        return;
      }
      if (selectedSlot && inInspector) {
        await addReferenceFilesToSlot(selectedSlot, imageFiles);
        return;
      }
      if (!selectedSlot && inInspector) {
        showToast('Select a slot before pasting reference images.', 'warn');
      }
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [scene.baseImage, selectedSlot, scene.slots]);

  const createBoards = async (sceneOverride?: Scene, options: { silent?: boolean } = {}) => {
    const cleanedScene = sceneOverride || sanitizeCurrentScene();
    const nextPrompt = generateLocalPrompt(cleanedScene, projectSourceOfTruth);
    if (!sceneOverride) updateScene({ slots: cleanedScene.slots, localPrompt: nextPrompt });
    const health = sceneHealth(cleanedScene);
    const boards = await generateBoards({ ...cleanedScene, localPrompt: nextPrompt }, project.name, health);
    setBoardsPreview(boards.files);
    setBoardsGeneratedAt(boards.generatedAt);
    setBottomWorkspace('boards');
    if (!options.silent) showToast('Boards generated');
    return boards;
  };

  const extractNegativeConstraints = (promptText: string) => {
    const match = promptText.match(/11\.\s*Negative Constraints\s*([\s\S]*)$/i);
    const extracted = match?.[1]?.trim();
    return extracted || 'Do not alter primary geometry, camera perspective, or mapped material zones. Avoid extra unrealistic objects, text artifacts, bad anatomy, and low-quality textures.';
  };

  const buildRenderHandoffZip = async () => {
    const cleanedScene = sanitizeCurrentScene();
    if (!cleanedScene.baseImage) throw new Error('NO_BASE_IMAGE');
    const localPrompt = generateLocalPrompt(cleanedScene, projectSourceOfTruth);
    const board = await generateRenderHandoffBoard({ ...cleanedScene, localPrompt }, project.name);
    const baseImage = await resizeDataUrl(cleanedScene.baseImage, 2048, 'image/jpeg', 0.82);
    const promptSource = activePromptPackage?.promptPackage?.fullRenderPrompt?.trim() ? 'importedPromptPackage' : 'localPrompt';
    const fullRenderPrompt = promptSource === 'importedPromptPackage' ? (activePromptPackage?.promptPackage?.fullRenderPrompt || localPrompt) : localPrompt;
    const negativePrompt = activePromptPackage?.promptPackage?.negativePrompt?.trim() || extractNegativeConstraints(localPrompt);
    const slots = cleanedScene.slots || [];
    const summaryWarnings: string[] = [];
    const pendingSuggestionsCount = (cleanedScene.aiEnrichmentSuggestions || []).filter((item) => item.status !== 'applied' && item.status !== 'ignored').length;
    const appliedSuggestionsCount = (cleanedScene.aiEnrichmentSuggestions || []).filter((item) => item.status === 'applied').length;
    if (!activePromptPackage) summaryWarnings.push('No active prompt package. full_render_prompt.txt uses local prompt.');
    if (!cleanedScene.baseImage) summaryWarnings.push('No base image.');
    slots.forEach((slot) => {
      if (!slot.descriptionThai?.trim() && (slot.referenceImages?.length || 0) > 0) {
        summaryWarnings.push(`${slot.code}: image-only reference without Thai description.`);
      }
      if (defaultSlotNamePattern.test((slot.name || '').trim())) {
        summaryWarnings.push(`${slot.code}: untitled/default slot name.`);
      }
    });
    const counts = {
      materials: slots.filter((slot) => slot.category === 'materials').length,
      props: slots.filter((slot) => slot.category === 'props').length,
      lighting: slots.filter((slot) => slot.category === 'lighting').length,
      environment: slots.filter((slot) => slot.category === 'environment').length,
      pins: slots.reduce((sum, slot) => sum + (slot.pins?.length || 0), 0),
      regions: slots.reduce((sum, slot) => sum + (slot.regions?.length || 0), 0),
    };

    const summary = {
      schemaVersion: 'render-handoff-v1',
      projectName: project.name,
      sceneName: cleanedScene.name,
      sceneType: cleanedScene.type,
      createdAt: new Date().toISOString(),
      baseImagePath: 'render-handoff-pack/01_base_image.jpg',
      visualInstructionBoardPath: 'render-handoff-pack/02_visual_instruction_board.png',
      promptSource,
      activePromptPackageId: cleanedScene.activePromptPackageId || null,
      outputSpec: cleanedScene.outputSpec,
      slotCounts: {
        materials: counts.materials,
        props: counts.props,
        lighting: counts.lighting,
        environment: counts.environment,
      },
      mappingCounts: {
        pins: counts.pins,
        regions: counts.regions,
      },
      pendingSuggestionsCount,
      appliedSuggestionsCount,
      directorNotes: cleanedScene.directorNotes || defaultDirectorNotes,
      inferenceMode: cleanedScene.directorNotes?.inferenceMode || 'balanced',
      quickGenerate: {
        provider: renderPassState.quickGenerateProvider || 'mock_local',
        mode: renderPassState.quickGenerateMode || 'draft',
        goals: (renderPassState.quickGenerateGoals || []).map((goalId) => quickGenerateGoalCards.find((goal) => goal.id === goalId)?.label || goalId),
        promptPresetIds: renderPassState.quickPromptPresets || {},
        promptPresetLabels: selectedQuickPromptPresetLabels,
        promptPresetInstructions: selectedQuickPromptInstructions,
      },
      sceneIntelligence: renderPassState.sceneIntelligence || null,
      workPlan: {
        approved: Boolean(renderPassState.approvedWorkPlan),
        items: (renderPassState.workPlan || []).map((item) => ({ category: item.category, label: item.label, enabled: item.enabled, source: item.source })),
      },
      activeRules: activeRules.map((rule) => ({
        id: rule.id,
        label: rule.label,
        category: rule.category,
        priority: rule.priority,
        source: rule.source,
        confidence: rule.confidence,
        affectedTargets: rule.affectedTargets,
      })),
      projectSourceOfTruth: {
        profileId: projectSourceOfTruth.profileId,
        profileName: projectSourceOfTruth.profileName,
        activeRuleIds: activeMaterialRules.map((rule) => rule.id),
        materialRules: activeMaterialRules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          category: rule.category,
          protectionLevel: rule.protectionLevel,
          promptInjection: rule.promptInjection,
          colorGuidance: rule.colorGuidance,
          finishGuidance: rule.finishGuidance,
          forbiddenCharacteristics: rule.forbiddenCharacteristics,
          references: rule.referenceImages.map((ref) => ({ id: ref.id, name: ref.name, scopes: ref.scopes, notes: ref.notes || '' })),
        })),
        scopedColorCastCorrection: scopedColorCastCorrectionLine(projectSourceOfTruth),
        warnings: projectSourceWarnings,
      },
      rulesSummary: {
        total: renderPassState.generationRules?.length || 0,
        enabled: activeRules.length,
        sceneHash: renderPassState.rulesSceneHash || renderPassState.sceneHash,
        visionTimestamp: renderPassState.rulesVisionTimestamp || renderPassState.visionTimestamp,
      },
      telemetrySummary: telemetry,
      revisionHistory: renderPassState.revisionHistory || [],
      productionReview: activeResultRound ? {
        activeResultRoundId: activeResultRound.id,
        activeResultRoundName: activeResultRound.name,
        commentsCount: (activeResultRound.productionComments || []).filter((comment) => comment.status !== 'draft').length,
        openCommentsCount: (activeResultRound.productionComments || []).filter((comment) => comment.status === 'active' || comment.status === 'open').length,
        comments: (activeResultRound.productionComments || []).filter((comment) => comment.status !== 'draft').map((comment) => ({
          number: comment.number,
          type: comment.type,
          x: comment.x,
          y: comment.y,
          text: comment.text,
          status: comment.status,
          source: comment.source || 'manual',
          versionId: comment.versionId || activeResultRound.id,
          references: (comment.references || (comment.referenceName ? [{ name: comment.referenceName, scopes: comment.referenceScopes || [] }] : [])).map((ref) => ({
            name: ref.name,
            scopes: ref.scopes,
            usageNote: 'usageNote' in ref ? ref.usageNote : undefined,
          })),
        })),
        processedRevisionPlan: activeResultRound.processedRevisionPlan || [],
        parentResultRoundId: activeResultRound.parentResultRoundId || null,
      } : null,
      materialIntelligence: {
        summary: renderPassState.materialIntelligence?.summary || '',
        zones: (renderPassState.materialIntelligence?.zones || []).map((zone) => ({
          category: zone.category,
          label: zone.label,
          likelyMaterialType: zone.likelyMaterialType,
          visualRole: zone.visualRole,
          preservationPriority: zone.preservationPriority,
          confidence: zone.confidence,
          source: zone.source,
          enhancementInstruction: zone.enhancementInstruction,
          hallucinationRisk: zone.hallucinationRisk,
        })),
      },
      warnings: Array.from(new Set(summaryWarnings)),
    };

    const readme = [
      'To generate the final render, open a new image-generation chat and attach:',
      '1. 01_base_image.jpg',
      '2. 02_visual_instruction_board.png',
      '',
      'Then paste full_render_prompt.txt.',
      'Use negative_prompt.txt as the negative prompt if the tool supports it.',
      '',
      'The base image controls geometry and camera.',
      'The visual instruction board controls material mapping, references, lighting, environment, and output intent.',
      'Do not use the board as final image composition; use it as instruction context.',
      '',
      'Director Notes (if provided) can be used to infer missing material/lighting/atmosphere details.',
      `Inference mode: ${(cleanedScene.directorNotes?.inferenceMode || 'balanced').replace(/^./, (c) => c.toUpperCase())}.`,
      '',
      'Quick Generate prompt tuning presets are recorded in handoff-summary.json. They are deterministic instructions for lighting, material realism, protection, and photography style, and must not be used to redesign the architecture.',
      'Scene Intelligence in handoff-summary.json describes the internal scene graph, protection priorities, lighting rules, environment rules, and photography rules used by the prompt compiler.',
      'Material Intelligence in handoff-summary.json is an internal prompt helper for material safeguards and should not override user-confirmed protected assets.',
      'Project Source of Truth in handoff-summary.json defines protected material identity and brand color exceptions. These rules outrank generic luxury, neutral, editorial, and color-cast language.',
    ].join('\n');

    const zip = new JSZip();
    const root = zip.folder('render-handoff-pack')!;
    root.file('01_base_image.jpg', baseImage.split(',')[1], { base64: true });
    root.file('02_visual_instruction_board.png', board.split(',')[1], { base64: true });
    root.file('full_render_prompt.txt', fullRenderPrompt);
    root.file('negative_prompt.txt', negativePrompt);
    root.file('README_RENDER_HANDOFF.txt', readme);
    root.file('handoff-summary.json', JSON.stringify(summary, null, 2));
    return { zip, filename: `${project.name.replace(/\s+/g, '_')}_render-handoff-pack.zip`, board };
  };

  const buildRenderPassJarvisReviewZip = async () => {
    if (!scene.baseImage) throw new Error('NO_BASE_IMAGE');
    const generated = enabledGeneratedPasses(renderPassState);
    if (!generated.length) throw new Error('NO_RENDER_PASS_PROMPTS');
    const zip = new JSZip();
    const root = zip.folder('jarvis-review-pack')!;
    const baseImage = await resizeDataUrl(scene.baseImage, 2048, 'image/jpeg', 0.82);
    root.file('01_base_image.jpg', baseImage.split(',')[1], { base64: true });
    const renderPassFolder = root.folder('render-passes')!;
    renderPassState.renderPassInputs.filter((input) => input.enabled).forEach((input) => {
      renderPassFolder.file(renderPassInputFileName(input), input.dataUrl.split(',')[1], { base64: true });
    });
    renderPassFolder.file('render-pass-legend.json', JSON.stringify(renderPassState.renderPassInputs.map((input) => ({
      id: input.id,
      type: input.type,
      name: input.name,
      fileName: input.enabled ? `render-passes/${renderPassInputFileName(input)}` : null,
      enabled: input.enabled,
      width: input.width,
      height: input.height,
      notes: input.notes || '',
      colorLegend: input.colorLegend || [],
    })), null, 2));
    const data = root.folder('data')!;
    data.file('scene-setup.json', JSON.stringify(renderPassState.sceneSetup, null, 2));
    data.file('site-context.json', JSON.stringify(renderPassState.siteContext, null, 2));
    data.file('architecture-context.json', JSON.stringify(renderPassState.architectureContext, null, 2));
    data.file('brand-context.json', JSON.stringify(renderPassState.brandContext, null, 2));
    data.file('production-context.json', JSON.stringify(renderPassState.productionContext, null, 2));
    data.file('reference-intelligence.json', JSON.stringify(renderPassState.references, null, 2));
    data.file('camera-system.json', JSON.stringify(renderPassState.cameraSystem, null, 2));
    data.file('lighting-graph.json', JSON.stringify(renderPassState.lightingGraph, null, 2));
    data.file('material-profiles.json', JSON.stringify(renderPassState.materialProfiles, null, 2));
    data.file('knowledge-confidence.json', JSON.stringify(renderPassState.knowledgeConfidence, null, 2));
    data.file('project-memory.json', JSON.stringify(renderPassState.projectMemory, null, 2));
    data.file('prompt-versions.json', JSON.stringify({ legacy: renderPassState.promptVersions, passes: renderPassState.passes.map((pass) => ({ type: pass.type, activeVersionId: pass.activeVersionId, approvedVersionId: pass.approvedVersionId, promptVersions: pass.promptVersions || [] })) }, null, 2));
    data.file('render-pass-inputs.json', JSON.stringify(renderPassState.renderPassInputs.map((input) => ({ ...input, dataUrl: undefined, hasImage: Boolean(input.dataUrl) })), null, 2));
    data.file('result-rounds.json', JSON.stringify(renderPassState.resultRounds.map((round) => ({
      ...round,
      imageDataUrl: undefined,
      hasImage: Boolean(round.imageDataUrl),
      qc: round.qc ? calculateResultQc({ ...defaultResultQc, ...round.qc }) : null,
    })), null, 2));
    data.file('result-qc.json', JSON.stringify({
      activeResultRoundId: renderPassState.activeResultRoundId || null,
      activeResultRound: activeResultRound ? {
        id: activeResultRound.id,
        name: activeResultRound.name,
        status: activeResultRound.status,
        sourcePassType: activeResultRound.sourcePassType,
        sourcePromptVersionNumber: activeResultRound.sourcePromptVersionNumber,
        sourceAdapter: activeResultRound.sourceAdapter,
        externalTool: activeResultRound.externalTool,
        qc: activeResultRound.qc ? calculateResultQc({ ...defaultResultQc, ...activeResultRound.qc }) : null,
      } : null,
    }, null, 2));
    data.file('ai-composer-analysis.json', JSON.stringify({
      model: renderPassState.aiComposer.model,
      references: renderPassState.aiComposer.references.map((ref) => ({ id: ref.id, name: ref.name, role: ref.role, notes: ref.notes || '', included: ref.included !== false })),
      lastResponse: renderPassState.aiComposer.lastResponse || null,
      historyCount: renderPassState.aiComposer.history.length,
      appliedAt: renderPassState.aiComposer.appliedAt || null,
    }, null, 2));
    data.file('visual-diff.json', JSON.stringify(renderPassState.visualDiff, null, 2));
    data.file('project-knowledge-base.json', JSON.stringify(renderPassState.projectKnowledgeBase, null, 2));
    data.file('design-lock.json', JSON.stringify(renderPassState.designLock, null, 2));
    data.file('protected-assets.json', JSON.stringify(renderPassState.protectedAssets, null, 2));
    data.file('qc-review.json', JSON.stringify(renderPassState.qcReview, null, 2));
    data.file('pass-plan.json', JSON.stringify(renderPassState.passes.map((pass) => ({ type: pass.type, enabled: pass.enabled, title: pass.title, objective: pass.objective, status: pass.status, activeVersionId: pass.activeVersionId, approvedVersionId: pass.approvedVersionId, versionsCount: pass.promptVersions?.length || 0, updatedAt: pass.updatedAt })), null, 2));
    data.file('project-source-of-truth.json', JSON.stringify(projectSourceOfTruth, null, 2));
    data.file('prompt-package.json', JSON.stringify({ schemaVersion: 'visual-local-render-pass-prompts-v2', generatedAt: renderPassState.generatedAt, workflowPhase: renderPassState.workflowPhase, selectedModelAdapter: renderPassState.selectedModelAdapter || 'generic', sceneSetup: renderPassState.sceneSetup, projectSourceOfTruth, projectKnowledgeBase: renderPassState.projectKnowledgeBase, references: renderPassState.references, renderPassInputs: renderPassState.renderPassInputs.map((input) => ({ id: input.id, type: input.type, name: input.name, enabled: input.enabled, notes: input.notes || '', colorLegend: input.colorLegend || [] })), cameraSystem: renderPassState.cameraSystem, lightingGraph: renderPassState.lightingGraph, materialProfiles: renderPassState.materialProfiles, sceneIntelligence: renderPassState.sceneIntelligence, materialIntelligence: renderPassState.materialIntelligence, workPlan: renderPassState.workPlan, approvedWorkPlan: renderPassState.approvedWorkPlan, revisionHistory: renderPassState.revisionHistory || [], visualDirectionPreset: renderPassState.visualDirectionPreset, environmentLibraryPreset: renderPassState.environmentLibraryPreset, modes: { visualDirectionMode: renderPassState.visualDirectionMode, lightingMode: renderPassState.lightingMode, environmentMode: renderPassState.environmentMode, materialEnhancementLevel: renderPassState.materialEnhancementLevel, peopleActivityLayer: renderPassState.peopleActivityLayer }, passes: generated.map((pass) => ({ ...pass, activePromptVersion: getActivePromptVersion(pass), approvedPromptVersion: getApprovedPromptVersion(pass), promptVersions: pass.promptVersions || [] })), negativePrompt: renderPassState.negativePrompt || buildRenderPassNegativePrompt(renderPassState, undefined, projectSourceOfTruth) }, null, 2));
    const prompts = root.folder('prompts')!;
    generated.forEach((pass) => prompts.file(renderPassFileNames[pass.type], getActivePromptVersion(pass)?.prompt || pass.prompt));
    prompts.file('negative_prompt.txt', renderPassState.negativePrompt || buildRenderPassNegativePrompt(renderPassState, undefined, projectSourceOfTruth));
    if (activeResultRound?.qc?.revisionPrompt) prompts.file('revision-prompt.txt', activeResultRound.qc.revisionPrompt);
    if (activeResultRound?.imageDataUrl) {
      const results = root.folder('results')!;
      const activeResult = await resizeDataUrl(activeResultRound.imageDataUrl, 1600, 'image/jpeg', 0.82);
      results.file('active_result.jpg', activeResult.split(',')[1], { base64: true });
    }
    root.file('README_FOR_JARVIS_B.txt', [
      'You are Jarvis B, acting as an AI Art Director and Prompt QC assistant for architectural visualization.',
      '',
      'The attached base image is the source of truth.',
      'The goal is to enhance the image using external AI image generation while preserving the approved architecture.',
      'This is a knowledge-first workflow. Read site-context.json, architecture-context.json, brand-context.json, and project-knowledge-base.json before reviewing prompts.',
      'Use reference-intelligence.json to understand whether each image is site, architecture, material, lighting, mood, people, brand, or environment reference.',
      '',
      'Review the included pass prompts.',
      '',
      'Your tasks:',
      '1. Identify any prompt language that may cause the AI to redesign, reinterpret, or alter the architecture.',
      '2. Strengthen preserve rules.',
      '3. Keep each pass focused on one objective only.',
      '4. Do not add new design ideas unless clearly marked as suggestions.',
      '5. Return an improved prompt package ready for external image generation.',
      '6. If there are risks, list them clearly.',
      '',
      'Do not generate an image.',
      'Do not redesign the project.',
      'Do not change geometry, camera, layout, furniture, fixtures, signage, logo, floor pattern, material zones, or protected design assets.',
      '',
      'If asked to return JSON, use schema visual-local-render-pass-review-v1.',
    ].join('\n'));
    return { zip, filename: 'visual-local-jarvis-review-pack.zip' };
  };

  const buildRenderPassHandoffZip = async () => {
    if (!scene.baseImage) throw new Error('NO_BASE_IMAGE');
    const generated = enabledGeneratedPasses(renderPassState);
    if (!generated.length) throw new Error('NO_RENDER_PASS_PROMPTS');
    const selected = generated.find((pass) => pass.type === renderPassState.selectedPassType) || generated[0];
    const selectedVersion = getActivePromptVersion(selected);
    const approvedVersion = getApprovedPromptVersion(selected);
    const selectedAdapter = renderPassState.selectedModelAdapter || 'generic';
    const selectedPromptRaw = selectedVersion?.prompt || selected.prompt;
    const selectedPromptFormatted = formatPromptForAdapter(selectedPromptRaw, selectedAdapter, renderPassState, selected);
    const selectedNegativePrompt = selectedVersion?.negativePrompt || renderPassState.negativePrompt || buildRenderPassNegativePrompt(renderPassState, selected.type, projectSourceOfTruth);
    const approvedPassCount = renderPassState.passes.filter((pass) => pass.status === 'approved' || Boolean(pass.approvedVersionId)).length;
    const zip = new JSZip();
    const root = zip.folder('render-handoff-pack')!;
    const baseImage = await resizeDataUrl(scene.baseImage, 2048, 'image/jpeg', 0.82);
    root.file('01_base_image.jpg', baseImage.split(',')[1], { base64: true });
    const renderPassFolder = root.folder('render-passes')!;
    renderPassState.renderPassInputs.filter((input) => input.enabled).forEach((input) => {
      renderPassFolder.file(renderPassInputFileName(input), input.dataUrl.split(',')[1], { base64: true });
    });
    renderPassFolder.file('render-pass-legend.json', JSON.stringify(renderPassState.renderPassInputs.map((input) => ({
      id: input.id,
      type: input.type,
      name: input.name,
      fileName: input.enabled ? `render-passes/${renderPassInputFileName(input)}` : null,
      enabled: input.enabled,
      width: input.width,
      height: input.height,
      notes: input.notes || '',
      colorLegend: input.colorLegend || [],
    })), null, 2));
    if (activeResultRound?.imageDataUrl) {
      const resultImage = await resizeDataUrl(activeResultRound.imageDataUrl, 2048, 'image/jpeg', 0.82);
      root.file(`02_ai_${activeResultRound.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'result_round'}.jpg`, resultImage.split(',')[1], { base64: true });
    }
    root.file('selected_pass_prompt.txt', selectedPromptFormatted);
    root.file(`selected_pass_prompt_${adapterFileSuffix(selectedAdapter)}.txt`, selectedPromptFormatted);
    root.file('all_pass_prompts.txt', combinedPassPrompts(renderPassState));
    root.file('negative_prompt.txt', selectedNegativePrompt);
    if (activeResultRound?.qc?.revisionPrompt) root.file('revision_prompt.txt', activeResultRound.qc.revisionPrompt);
    const data = root.folder('data')!;
    data.file('result-rounds.json', JSON.stringify(renderPassState.resultRounds.map((round) => ({
      ...round,
      imageDataUrl: undefined,
      hasImage: Boolean(round.imageDataUrl),
      qc: round.qc ? calculateResultQc({ ...defaultResultQc, ...round.qc }) : null,
    })), null, 2));
    data.file('result-qc.json', JSON.stringify({
      activeResultRoundId: renderPassState.activeResultRoundId || null,
      activeResultRound: activeResultRound ? {
        id: activeResultRound.id,
        name: activeResultRound.name,
        status: activeResultRound.status,
        sourcePassType: activeResultRound.sourcePassType,
        sourcePromptVersionNumber: activeResultRound.sourcePromptVersionNumber,
        sourceAdapter: activeResultRound.sourceAdapter,
        externalTool: activeResultRound.externalTool,
        qc: activeResultRound.qc ? calculateResultQc({ ...defaultResultQc, ...activeResultRound.qc }) : null,
      } : null,
    }, null, 2));
    data.file('render-pass-inputs.json', JSON.stringify(renderPassState.renderPassInputs.map((input) => ({ ...input, dataUrl: undefined, hasImage: Boolean(input.dataUrl) })), null, 2));
    root.file('README_RENDER_HANDOFF.txt', [
      'Attach 01_base_image.jpg to the external image AI chat.',
      `Copy the selected pass prompt from selected_pass_prompt_${adapterFileSuffix(selectedAdapter)}.txt.`,
      'Use negative_prompt.txt if the tool supports negative prompts.',
      'Run one pass at a time.',
      'Do not run all prompts at once unless intentionally testing.',
      '',
      `Selected adapter: ${modelAdapterOptions.find((option) => option.value === selectedAdapter)?.label || selectedAdapter}.`,
      'Adapters only format text for the target tool. This pack does not call any AI API.',
      '',
      'The uploaded base render is the source of truth. Preserve architecture, camera, geometry, layout, furniture, fixtures, signage, logo, floor pattern, material zones, and protected design assets.',
    ].join('\n'));
    root.file('handoff-summary.json', JSON.stringify({
      schemaVersion: 'visual-local-render-pass-handoff-v1',
      createdAt: new Date().toISOString(),
      projectName: project.name,
      sceneName: scene.name,
      sceneType: scene.type,
      directorNotes: scene.directorNotes || defaultDirectorNotes,
      inferenceMode: scene.directorNotes?.inferenceMode || 'balanced',
      selectedPassType: selected.type,
      selectedPassTitle: selected.title,
      selectedAdapter,
      selectedPromptVersion: selectedVersion ? { id: selectedVersion.id, versionNumber: selectedVersion.versionNumber, status: selectedVersion.status, source: selectedVersion.source, adapter: selectedVersion.adapter } : null,
      projectSourceOfTruth: {
        profileId: projectSourceOfTruth.profileId,
        profileName: projectSourceOfTruth.profileName,
        activeRuleIds: activeMaterialRules.map((rule) => rule.id),
        scopedColorCastCorrection: scopedColorCastCorrectionLine(projectSourceOfTruth),
        referencesSent: applicableProjectRuleReferences(projectSourceOfTruth).map(({ rule, ref }) => ({ ruleId: rule.id, ruleName: rule.name, referenceName: ref.name, scopes: ref.scopes })),
      },
      approvedPromptVersion: approvedVersion ? { id: approvedVersion.id, versionNumber: approvedVersion.versionNumber, status: approvedVersion.status, source: approvedVersion.source, adapter: approvedVersion.adapter } : null,
      generatedPassesCount: generated.length,
      approvedPassCount,
      workflowPhase: renderPassState.workflowPhase,
      sceneSetup: renderPassState.sceneSetup,
      siteContext: renderPassState.siteContext,
      architectureContext: renderPassState.architectureContext,
      brandContext: renderPassState.brandContext,
      projectKnowledgeBase: renderPassState.projectKnowledgeBase,
      productionContext: renderPassState.productionContext,
      referencesCount: renderPassState.references.length,
      referenceRoles: renderPassState.references.reduce<Record<string, number>>((acc, ref) => ({ ...acc, [ref.role]: (acc[ref.role] || 0) + 1 }), {}),
      knowledgeConfidence: renderPassState.knowledgeConfidence,
      cameraSystem: renderPassState.cameraSystem,
      lightingGraph: renderPassState.lightingGraph,
      materialProfiles: renderPassState.materialProfiles,
      sceneIntelligence: renderPassState.sceneIntelligence || null,
      workPlan: {
        approved: Boolean(renderPassState.approvedWorkPlan),
        items: (renderPassState.workPlan || []).map((item) => ({ category: item.category, label: item.label, enabled: item.enabled, source: item.source })),
      },
      activeRules: activeRules.map((rule) => ({
        id: rule.id,
        label: rule.label,
        category: rule.category,
        priority: rule.priority,
        source: rule.source,
        confidence: rule.confidence,
        affectedTargets: rule.affectedTargets,
      })),
      rulesSummary: {
        total: renderPassState.generationRules?.length || 0,
        enabled: activeRules.length,
        sceneHash: renderPassState.rulesSceneHash || renderPassState.sceneHash,
        visionTimestamp: renderPassState.rulesVisionTimestamp || renderPassState.visionTimestamp,
      },
      telemetrySummary: telemetry,
      revisionHistory: renderPassState.revisionHistory || [],
      materialIntelligence: {
        summary: renderPassState.materialIntelligence?.summary || '',
        zones: (renderPassState.materialIntelligence?.zones || []).map((zone) => ({
          category: zone.category,
          label: zone.label,
          likelyMaterialType: zone.likelyMaterialType,
          visualRole: zone.visualRole,
          preservationPriority: zone.preservationPriority,
          confidence: zone.confidence,
          source: zone.source,
          enhancementInstruction: zone.enhancementInstruction,
          hallucinationRisk: zone.hallucinationRisk,
        })),
      },
      visualDirectionPreset: renderPassState.visualDirectionPreset,
      environmentLibraryPreset: renderPassState.environmentLibraryPreset,
      designLock: renderPassState.designLock,
      protectedAssets: renderPassState.protectedAssets.filter((asset) => asset.locked),
      qcReview: renderPassState.qcReview,
      revisionCategories: renderPassState.revisionCategories,
      projectMemoryCount: renderPassState.projectMemory.length,
      promptVersionsCount: renderPassState.promptVersions.length + renderPassState.passes.reduce((sum, pass) => sum + (pass.promptVersions?.length || 0), 0),
      renderPassInputs: {
        count: renderPassState.renderPassInputs.length,
        enabledCount: renderPassState.renderPassInputs.filter((input) => input.enabled).length,
        activeObjectId: renderPassInputSummary.objectId?.name || null,
        activeMaterialId: renderPassInputSummary.materialId?.name || null,
        activeDepth: renderPassInputSummary.depth?.name || null,
        hasColorLegend: renderPassState.renderPassInputs.some((input) => (input.colorLegend || []).length > 0),
      },
      resultRoundsCount: renderPassState.resultRounds.length,
      activeResultRound: activeResultRound ? {
        id: activeResultRound.id,
        name: activeResultRound.name,
        status: activeResultRound.status,
        hasImage: Boolean(activeResultRound.imageDataUrl),
        sourcePassType: activeResultRound.sourcePassType,
        sourcePromptVersionNumber: activeResultRound.sourcePromptVersionNumber,
        qc: activeResultRound.qc ? calculateResultQc({ ...defaultResultQc, ...activeResultRound.qc }) : null,
      } : null,
      aiComposer: {
        model: renderPassState.aiComposer.model,
        referencesCount: renderPassState.aiComposer.references.length,
        hasAnalysis: Boolean(renderPassState.aiComposer.lastResponse),
        appliedAt: renderPassState.aiComposer.appliedAt || null,
      },
      visualDiff: renderPassState.visualDiff,
      modes: {
        visualDirectionMode: renderPassState.visualDirectionMode,
        lightingMode: renderPassState.lightingMode,
        environmentMode: renderPassState.environmentMode,
        materialEnhancementLevel: renderPassState.materialEnhancementLevel,
        peopleActivityLayer: renderPassState.peopleActivityLayer,
      },
    }, null, 2));
    return { zip, filename: `${project.name.replace(/\s+/g, '_')}_render-pass-handoff-pack.zip` };
  };

  const buildZip = async () => {
    const cleanedScene = sanitizeCurrentScene();
    const exportedScene = cleanedScene.renderPassBuilder ? {
      ...cleanedScene,
      renderPassBuilder: {
        ...cleanedScene.renderPassBuilder,
        quickGenerateUsage: [],
        googleLiteDebug: {},
        quickGenerateCreditTHB: undefined,
        googleLiteCostPerImageTHB: undefined,
        googleProCostPerImageTHB: undefined,
        localTelemetry: [],
      },
    } : cleanedScene;
    const zip = new JSZip(); const root = zip.folder('visual-brief-package')!;
    const prompt = cleanedScene.localPrompt || generateLocalPrompt(cleanedScene, projectSourceOfTruth);
    const boards = await createBoards(cleanedScene, { silent: true });
    const overlay = boards.files['images/overlays/scene_mapping_overlay.png'] || '';
    const baseSmall = cleanedScene.baseImage ? await resizeDataUrl(cleanedScene.baseImage, 1600, 'image/jpeg', 0.82) : '';
    const overlaySmall = overlay ? await resizeDataUrl(overlay, 1600, 'image/png') : '';
    const board = overlay ? await resizeDataUrl(overlay, 2000, 'image/png') : '';
    const stale = boardsGeneratedAt && new Date(boardsGeneratedAt).getTime() < new Date(project.updatedAt).getTime();
    const manifest = { schemaVersion: 'visual-brief-package-v1', packageStatus: cleanedScene.packageStatus, project: { id: project.id, name: project.name }, scene: { id: cleanedScene.id, name: cleanedScene.name, type: cleanedScene.type }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), appVersion: '0.3.0', files: { baseImage: 'images/base/scene_base_small.jpg', mappingOverlay: 'images/overlays/scene_mapping_overlay.png', aiBrief: 'data/ai-brief.json', boards: ['boards/material_board.png', 'boards/prop_board.png', 'boards/lighting_board.png', 'boards/environment_board.png', 'boards/atmosphere_board.png', 'boards/package_summary.png', 'boards/mapping_overlay_board.png'] }, boards: { generatedAt: boards.generatedAt, boardStatus: stale ? 'stale' : 'generated' }, promptPackagesCount: cleanedScene.promptPackages?.length || 0, activePromptPackageId: cleanedScene.activePromptPackageId || null, revisionPromptsCount: cleanedScene.revisionPrompts?.length || 0, outputSpec: cleanedScene.outputSpec };
    root.file('manifest.json', JSON.stringify(manifest, null, 2));
    root.file('README_FOR_AI.txt', [
      'Read ai-brief.json and these visual boards: mapping_overlay_board.png for tag placement; material_board.png for material tone/finish/texture; prop_board.png for styling/prop intent; lighting_board.png for light direction and glow; environment_board.png for background/site context; atmosphere_board.png for photography mood/output size; package_summary.png for overview.',
      'prompts/imported-prompt-package.json may contain previous Jarvis B prompt outputs. prompts/revision-prompts.json may contain follow-up correction prompts.',
      'Director Notes may be used to infer missing material/lighting/atmosphere details from reference images, mapping locations, visual instruction board, and local prompt.',
      'Preserve geometry, camera, perspective, architectural form, layout, and mapped material placement. Do not infer or redesign structural geometry, camera, furniture layout, or architectural form.',
      'Thai descriptions are design intent to convert into precise English prompt language. Image-only references allow moderate creative interpretation.',
      'Return prompt package outputs and dashboard import JSON.',
    ].join(' '));
    root.folder('data')!.file('project.json', JSON.stringify({ id: project.id, name: project.name, sourceOfTruth: projectSourceOfTruth }, null, 2)).file('scene.json', JSON.stringify({ ...exportedScene, projectSourceOfTruth }, null, 2)).file('slots.json', JSON.stringify(cleanedScene.slots, null, 2)).file('mapping.json', JSON.stringify(cleanedScene.slots.map((s) => ({ slotId: s.id, pins: s.pins, regions: s.regions })), null, 2)).file('output-spec.json', JSON.stringify(cleanedScene.outputSpec, null, 2)).file('project-source-of-truth.json', JSON.stringify(projectSourceOfTruth, null, 2)).file('ai-brief.json', JSON.stringify({ schemaVersion: 'visual-brief-ai-export-v1', mode: 'archviz_prompt_generation', scene: exportedScene, projectSourceOfTruth, sourceOfTruthPromptLines: materialRulePromptLines(projectSourceOfTruth), scopedColorCastCorrection: scopedColorCastCorrectionLine(projectSourceOfTruth), preserveRules: cleanedScene.preserveRules, directorNotes: cleanedScene.directorNotes || defaultDirectorNotes, inferenceMode: cleanedScene.directorNotes?.inferenceMode || 'balanced', materials: cleanedScene.slots.filter((s) => s.category === 'materials'), props: cleanedScene.slots.filter((s) => s.category === 'props'), lighting: cleanedScene.slots.filter((s) => s.category === 'lighting'), people: cleanedScene.people, environment: cleanedScene.slots.filter((s) => s.category === 'environment'), atmosphere: cleanedScene.atmosphere, outputSpec: cleanedScene.outputSpec, promptPackageImported: (cleanedScene.promptPackages?.length || 0) > 0, activePromptPackageSummary: activePromptPackage ? { id: activePromptPackage.id, assistantName: activePromptPackage.assistantName, importedAt: activePromptPackage.importedAt } : null, slotEnrichmentSuggestions: cleanedScene.slotEnrichmentSuggestions || [], aiEnrichmentSuggestions: cleanedScene.aiEnrichmentSuggestions || [], requestedOutputs: ['fullRenderPrompt', 'shortPrompt', 'materialPrompt', 'atmospherePrompt', 'negativePrompt', 'revisionPromptTemplate', 'dashboardImportJson'] }, null, 2));
    if (baseSmall) root.folder('images')!.folder('base')!.file('scene_base_small.jpg', baseSmall.split(',')[1], { base64: true });
    if (overlaySmall) root.folder('images')!.folder('overlays')!.file('scene_mapping_overlay.png', overlaySmall.split(',')[1], { base64: true });
    if (board) root.folder('images')!.folder('previews')!.file('scene_board_preview.png', board.split(',')[1], { base64: true });
    const refs = root.folder('refs')!; ['materials', 'props', 'lighting', 'environment'].forEach((k) => refs.folder(k));
    for (const s of cleanedScene.slots) for (let i = 0; i < s.referenceImages.length; i += 1) { const out = await resizeDataUrl(s.referenceImages[i], 768, 'image/jpeg', 0.8); refs.folder(s.category)!.file(`${s.code}_${i + 1}.jpg`, out.split(',')[1], { base64: true }); }
    const boardsFolder = root.folder('boards')!;
    Object.entries(boards.files).forEach(([p, dataUrl]) => {
      if (!p.startsWith('boards/')) return;
      const name = p.replace('boards/', '');
      boardsFolder.file(name, dataUrl.split(',')[1], { base64: true });
    });
    root.folder('prompts')!
      .file('prompt-draft.txt', cleanedScene.promptDraft || '')
      .file('local-prompt.txt', prompt)
      .file('imported-prompt-package.json', JSON.stringify(activePromptPackage || {}, null, 2))
      .file('prompt-history.json', JSON.stringify(cleanedScene.promptPackages || [], null, 2))
      .file('active-prompt-package.txt', activePromptPackage?.promptPackage?.fullRenderPrompt || '')
      .file('revision-prompts.json', JSON.stringify(cleanedScene.revisionPrompts || [], null, 2));
    return { zip, filename: `${project.name.replace(/\s+/g, '_')}_visual-brief.zip` };
  };

  const exportZip = async () => {
    const built = await buildZip();
    const health = await zipHealth(built.zip);
    const blob = await built.zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = built.filename; a.click(); URL.revokeObjectURL(a.href);
    setExportResult({ filename: built.filename, health, sizeBytes: blob.size });
  };

  const exportRenderHandoffPack = async () => {
    if (activeTab === 'render-pass') {
      try {
        const built = await buildRenderPassHandoffZip();
        const blob = await built.zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = built.filename;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Render handoff pack exported.');
      } catch (error) {
        const message = error instanceof Error && error.message === 'NO_BASE_IMAGE'
          ? 'Upload a base render first.'
          : error instanceof Error && error.message === 'NO_RENDER_PASS_PROMPTS'
            ? 'Generate pass prompts before exporting render handoff.'
            : 'Failed to export render handoff pack.';
        showToast(message, 'warn');
      }
      return;
    }
    if (!scene.baseImage) {
      showToast('Upload a base image before exporting render handoff.', 'warn');
      return;
    }
    try {
      const built = await buildRenderHandoffZip();
      const blob = await built.zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = built.filename;
      a.click();
      URL.revokeObjectURL(a.href);
      setHandoffPreview(built.board);
      showToast('Render handoff pack exported.');
    } catch (error) {
      showToast(error instanceof Error && error.message === 'NO_BASE_IMAGE' ? 'Upload a base image before exporting render handoff.' : 'Failed to export render handoff pack.', 'warn');
    }
  };

  const exportJarvisReviewPack = async () => {
    try {
      const built = await buildRenderPassJarvisReviewZip();
      const blob = await built.zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = built.filename;
      a.click();
      URL.revokeObjectURL(a.href);
      updateRenderPassBuilder({ passes: renderPassState.passes.map((pass) => pass.prompt ? { ...pass, status: pass.status === 'generated' ? 'exported' : pass.status } : pass) });
      showToast('Jarvis review pack exported.');
    } catch (error) {
      const message = error instanceof Error && error.message === 'NO_BASE_IMAGE'
        ? 'Upload a base render first.'
        : error instanceof Error && error.message === 'NO_RENDER_PASS_PROMPTS'
          ? 'Generate pass prompts before exporting Jarvis review pack.'
          : 'Failed to export Jarvis review pack.';
      showToast(message, 'warn');
    }
  };

  const previewRenderHandoffBoard = async () => {
    if (!scene.baseImage) {
      showToast('Upload a base image before previewing handoff board.', 'warn');
      return;
    }
    const built = await buildRenderHandoffZip();
    setHandoffPreview(built.board);
    setBottomWorkspace('json');
    showToast('Handoff board preview ready.');
  };

  const exportBoardPng = (boardKey: string) => {
    const data = boardsPreview[boardKey];
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = boardKey.replace('boards/', '');
    a.click();
  };

  const importZip = async (file?: File) => {
    if (!file) return;
    const zip = await JSZip.loadAsync(file);
    const manifestText = await zip.file('visual-brief-package/manifest.json')?.async('text');
    const sceneText = await zip.file('visual-brief-package/data/scene.json')?.async('text');
    const slotsText = await zip.file('visual-brief-package/data/slots.json')?.async('text');
    const localPrompt = await zip.file('visual-brief-package/prompts/local-prompt.txt')?.async('text');
    const promptHistoryText = await zip.file('visual-brief-package/prompts/prompt-history.json')?.async('text');
    const revisionPromptsText = await zip.file('visual-brief-package/prompts/revision-prompts.json')?.async('text');
    const importedPromptText = await zip.file('visual-brief-package/prompts/imported-prompt-package.json')?.async('text');
    const manifest = manifestText ? JSON.parse(manifestText) : null;
    const importedScene = sceneText ? JSON.parse(sceneText) : null;
    const importedSlots = slotsText ? JSON.parse(slotsText) : [];
    const health = await zipHealth(zip);
    const refs = Object.keys(zip.files).filter((f) => f.startsWith('visual-brief-package/refs/') && !f.endsWith('/'));
    const pinsCount = importedSlots.reduce((n: number, s: any) => n + (s.pins?.length || 0), 0);
    const regionCount = importedSlots.reduce((n: number, s: any) => n + (s.regions?.length || 0), 0);
    const byType = { materials: 0, props: 0, lighting: 0, environment: 0 } as Record<SlotCategory, number>;
    importedSlots.forEach((s: any) => { if (byType[s.category as SlotCategory] !== undefined) byType[s.category as SlotCategory] += 1; });
    const found = Object.keys(zip.files);
    const required = ['manifest.json', 'data/scene.json', 'data/slots.json', 'data/mapping.json', 'data/output-spec.json'];
    const missing = required.filter((r) => !found.includes(`visual-brief-package/${r}`));
    if (!found.some((f) => f.startsWith('visual-brief-package/images/base/'))) missing.push('images/base/*');
    if (!localPrompt && !importedScene?.localPrompt) missing.push('prompts/local-prompt.txt or generated prompt data');
    setImportReview({
      zip, health, found, missing, manifestFound: Boolean(manifest), aiBriefFound: found.includes('visual-brief-package/data/ai-brief.json'),
      packageStatus: manifest?.packageStatus || 'draft', projectName: manifest?.project?.name || 'Unknown', sceneName: importedScene?.name || manifest?.scene?.name || 'Unknown',
      sceneType: importedScene?.type || manifest?.scene?.type || 'Unknown', baseImageFound: found.some((f) => f.startsWith('visual-brief-package/images/base/')) || Boolean(importedScene?.baseImage),
      mappingOverlayFound: found.some((f) => f.startsWith('visual-brief-package/images/overlays/')), byType, refsCount: refs.length, pinsCount, regionCount,
      outputSpecFound: found.includes('visual-brief-package/data/output-spec.json'), localPromptFound: Boolean(localPrompt || importedScene?.localPrompt),
      boardsFoundCount: found.filter((f) => f.startsWith('visual-brief-package/boards/') && !f.endsWith('/')).length,
      promptPackagesCount: promptHistoryText ? (JSON.parse(promptHistoryText)?.length || 0) : 0,
      revisionPromptsCount: revisionPromptsText ? (JSON.parse(revisionPromptsText)?.length || 0) : 0,
      activePromptFound: Boolean(importedPromptText && importedPromptText.trim() && importedPromptText.trim() !== '{}'),
      existingProjects: projectsIndex,
      selectedMergeProjectId: project.id,
    });
  };

  const commitImport = async (mode: 'new' | 'merge') => {
    if (!importReview) return;
    const sceneText = await importReview.zip.file('visual-brief-package/data/scene.json')?.async('text');
    if (!sceneText) return;
    const importedScene = JSON.parse(sceneText) as Scene;
    const promptHistoryText = await importReview.zip.file('visual-brief-package/prompts/prompt-history.json')?.async('text');
    const revisionPromptsText = await importReview.zip.file('visual-brief-package/prompts/revision-prompts.json')?.async('text');
    const importedPromptText = await importReview.zip.file('visual-brief-package/prompts/imported-prompt-package.json')?.async('text');
    const restoredPromptHistory = promptHistoryText ? JSON.parse(promptHistoryText) : importedScene.promptPackages || [];
    const restoredRevisions = revisionPromptsText ? JSON.parse(revisionPromptsText) : importedScene.revisionPrompts || [];
    const importedPromptObj = importedPromptText ? JSON.parse(importedPromptText || '{}') : null;
    const normalizedScene: Scene = normalizeSceneRuntime({
      ...importedScene,
      promptPackages: restoredPromptHistory || [],
      revisionPrompts: restoredRevisions || [],
      activePromptPackageId: importedScene.activePromptPackageId || importedPromptObj?.id || restoredPromptHistory?.[0]?.id,
    });
    if (mode === 'new') {
      const sceneNew = { ...normalizedScene, id: id() };
      updateProject({ id: id(), name: importReview.projectName || 'Imported Project', updatedAt: new Date().toISOString(), scenes: [sceneNew], activeSceneId: sceneNew.id });
    } else {
      const target = projectsIndex.find((p) => p.id === importReview.selectedMergeProjectId) || project;
      const conflict = target.scenes.some((s) => s.id === normalizedScene.id || s.name === normalizedScene.name);
      const mergedScene = { ...normalizedScene, id: conflict ? id() : normalizedScene.id, name: conflict ? `${normalizedScene.name} (Imported)` : normalizedScene.name };
      const mergedProject = { ...target, scenes: [...target.scenes, mergedScene], activeSceneId: mergedScene.id, updatedAt: new Date().toISOString() };
      updateProject(mergedProject);
      await saveDraft(mergedProject);
      const drafts = await loadAllDrafts();
      setProjectsIndex(drafts.map(normalizeProjectRuntime));
    }
    setImportReview(null);
    setHealthAfterImport(sceneHealth({ ...normalizedScene, id: normalizedScene.id || id() }));
  };

  const applyRecipe = (name: string) => {
    const r: any = (smartRecipes as any)[name]; if (!r) return;
    updateScene({ preserveRules: r.preserveRules, atmosphere: r.atmosphere, people: { ...scene.people, level: r.people } });
    const preset = outputPresets[r.outputPreset]; if (preset) updateScene({ outputSpec: { ...scene.outputSpec, outputPreset: r.outputPreset, ...preset } });
  };

  const fitToView = () => {
    if (!imgObj) return;
    const maxW = Math.max(700, window.innerWidth - 760);
    const maxH = Math.max(450, window.innerHeight - 180);
    const fit = Math.min(maxW / imgObj.width, maxH / imgObj.height);
    setZoom(Math.max(0.4, Math.min(2.5, Number(fit.toFixed(2)))));
  };

  useEffect(() => {
    if (imgObj) fitToView();
  }, [imgObj]);
  useEffect(() => {
    localStorage.setItem(PRODUCT_MODE_STORAGE_KEY, proModeEnabled ? 'pro' : 'quick');
  }, [proModeEnabled]);
  useEffect(() => {
    localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, developerModeEnabled ? 'true' : 'false');
  }, [developerModeEnabled]);
  useEffect(() => {
    localStorage.setItem(PRODUCTION_STAGE_STORAGE_KEY, productionStage);
  }, [productionStage]);
  useEffect(() => {
    if (!anchoredProductionDraft) return;
    productionCommentComposerRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAnchoredProductionDraft(null);
        setProductionCommentMode('off');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anchoredProductionDraft?.id]);

  const currentHealth = scene ? sceneHealth(scene) : null;

  const currentCategorySlots = slotTabs.includes(activeTab as SlotCategory) ? scene.slots.filter((s) => s.category === activeTab) : [];
  const activeCategory = slotTabs.includes(activeTab as SlotCategory) ? (activeTab as SlotCategory) : null;
  const selectedSlotInActiveCategory = selectedSlot && activeCategory && selectedSlot.category === activeCategory ? selectedSlot : null;
  const slotInspectorTarget = activeCategory ? selectedSlotInActiveCategory : (activeTab === 'brief' || activeTab === 'render-pass' ? null : selectedSlot);
  const toolMeta: Record<CanvasTool, { label: string; hint: string; icon: typeof MousePointer }> = {
    select: { label: 'Select', hint: 'Select tags and regions. Objects stay locked.', icon: MousePointer },
    pin: { label: 'Pin', hint: selectedSlot ? `Click canvas to place a ${selectedSlot.code} tag.` : 'Select a slot, then click canvas to place a tag.', icon: MapPin },
    rect: { label: 'Rect', hint: selectedSlot ? `Drag a real area to create a ${selectedSlot.code} region.` : 'Select a slot, then drag a real area to create a region.', icon: Square },
    move: { label: 'Move', hint: 'Base image is locked. Drag only the selected tag or region.', icon: MoveIcon },
    delete: { label: 'Delete', hint: 'Select a tag or region, then click Delete.', icon: Trash2 },
  };
  const selectedObjectSlot = selectedObject ? scene.slots.find((s) => s.id === selectedObject.slotId) : null;
  const sortedSlots = useMemo(() => [...scene.slots].sort((a, b) => {
    const prefix = a.code.replace(/\d+/g, '').localeCompare(b.code.replace(/\d+/g, ''));
    if (prefix !== 0) return prefix;
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  }), [scene.slots]);
  const selectedMappingObject = selectedObject && selectedObjectSlot ? {
    slot: selectedObjectSlot,
    object: selectedObject.type === 'pin'
      ? selectedObjectSlot.pins.find((pin) => pin.id === selectedObject.id)
      : selectedObjectSlot.regions.find((region) => region.id === selectedObject.id),
  } : null;
  const codeCounts = scene.slots.reduce<Record<string, number>>((acc, slot) => {
    const code = slot.code || '';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  const getSlotDisplayCode = (slot: Slot) => {
    const duplicates = codeCounts[slot.code] || 0;
    if (duplicates <= 1) return slot.code;
    const index = scene.slots.filter((s) => s.code === slot.code).findIndex((s) => s.id === slot.id);
    return `${slot.code}-${index + 1}`;
  };
  const categoryAddLabel: Record<SlotCategory, string> = {
    materials: '+ Add Material',
    props: '+ Add Prop',
    lighting: '+ Add Lighting',
    environment: '+ Add Environment',
  };
  const designLockRows: Array<[keyof typeof renderPassState.designLock, string]> = [
    ['lockCamera', 'Lock camera'],
    ['lockArchitecture', 'Lock architecture'],
    ['lockGeometry', 'Lock geometry'],
    ['lockFurniture', 'Lock furniture'],
    ['lockEquipment', 'Lock equipment'],
    ['lockLightingFixtures', 'Lock lighting fixtures'],
    ['lockMaterials', 'Lock materials'],
    ['lockFloorPattern', 'Lock floor pattern'],
    ['lockLogoSignage', 'Lock logo/signage'],
    ['lockColumns', 'Lock columns'],
    ['lockComposition', 'Lock composition'],
  ];
  const materialTargetRows: Array<[keyof typeof renderPassState.materialTargets, string]> = [
    ['woodGrain', 'wood grain'],
    ['brassReflection', 'brass reflection'],
    ['leatherTexture', 'leather texture'],
    ['marbleDepth', 'marble depth'],
    ['glassReflection', 'glass reflection'],
    ['floorReflection', 'floor reflection'],
    ['microImperfections', 'micro imperfections'],
  ];
  const confidenceRows: Array<[keyof typeof renderPassState.knowledgeConfidence, string]> = [
    ['project', 'Project'],
    ['site', 'Site'],
    ['architecture', 'Architecture'],
    ['brand', 'Brand'],
    ['materials', 'Materials'],
    ['lighting', 'Lighting'],
    ['furniture', 'Furniture'],
    ['equipment', 'Equipment'],
    ['camera', 'Camera'],
    ['protectedAssets', 'Protected Assets'],
  ];
  const materialProfileRows: Array<[keyof typeof renderPassState.materialProfiles, string]> = [
    ['woodGrain', 'Wood Grain'],
    ['reflection', 'Reflection'],
    ['microRoughness', 'Micro Roughness'],
    ['imperfections', 'Imperfections'],
    ['leatherSoftness', 'Leather Softness'],
    ['brassAging', 'Brass Aging'],
    ['marbleContrast', 'Marble Contrast'],
    ['glassReflection', 'Glass Reflection'],
    ['floorReflection', 'Floor Reflection'],
  ];
  const lightingGraphRows: Array<[keyof typeof renderPassState.lightingGraph, string]> = [
    ['keyLight', 'Key Light'],
    ['fillLight', 'Fill Light'],
    ['ambient', 'Ambient'],
    ['practicalLights', 'Practical Lights'],
    ['skylight', 'Skylight'],
    ['backgroundFalloff', 'Background Falloff'],
    ['shadowDensity', 'Shadow Density'],
    ['reflectionStrength', 'Reflection Strength'],
  ];
  const siteContextRows: Array<[keyof typeof renderPassState.siteContext, string, string]> = [
    ['structuralColumns', 'Structural columns', 'Column grid, shape, spacing, obstructions'],
    ['floorMaterials', 'Floor materials', 'Stone, tile, terrazzo, carpet, sheen, pattern'],
    ['ceiling', 'Ceiling', 'Ceiling height, soffits, services, exposed systems'],
    ['skylight', 'Skylight', 'Skylight position, direction, quality'],
    ['ambientLighting', 'Ambient lighting', 'Existing daylight/artificial ambient behavior'],
    ['circulation', 'Circulation', 'Paths, entrances, queues, movement flow'],
    ['surroundingRetail', 'Surrounding retail', 'Neighboring stores, visual noise, context'],
    ['colorTemperature', 'Color temperature', 'Warm/cool cast, mixed light'],
    ['mallAtmosphere', 'Mall atmosphere', 'Premium, busy, quiet, atrium, void'],
    ['proportions', 'Proportions', 'Scale, ceiling height, corridor width'],
    ['architecturalLanguage', 'Architectural language', 'Mall/site design language'],
  ];
  const architectureContextRows: Array<[keyof typeof renderPassState.architectureContext, string, string]> = [
    ['geometry', 'Geometry', 'Form, masses, walls, ceiling, openings'],
    ['layout', 'Layout', 'Plan logic, counters, circulation, zones'],
    ['furniture', 'Furniture', 'Fixed furniture, loose furniture, placement'],
    ['materials', 'Materials', 'Existing material zones and finishes'],
    ['lightingFixtures', 'Lighting fixtures', 'Fixtures that must stay fixed'],
    ['equipment', 'Equipment', 'Machines, display equipment, appliances'],
    ['signage', 'Signage', 'Signs and brand text'],
    ['logo', 'Logo', 'Logo placement and preservation rules'],
    ['proportions', 'Proportions', 'Scale and dimensional relationships'],
    ['camera', 'Camera', 'Camera angle, lens feeling, viewpoint'],
    ['composition', 'Composition', 'Framing and visual hierarchy'],
  ];
  const brandContextRows: Array<[keyof typeof renderPassState.brandContext, string, string]> = [
    ['furniture', 'Furniture DNA', 'Furniture language and styling'],
    ['materials', 'Material DNA', 'Brand material palette'],
    ['mood', 'Mood', 'Feeling, tone, customer impression'],
    ['lighting', 'Lighting DNA', 'Preferred lighting language'],
    ['branding', 'Branding cues', 'Logo, color, graphic language'],
    ['previousProjects', 'Previous projects', 'Reusable design logic'],
    ['brandDna', 'Brand DNA summary', 'Concise extracted brand identity'],
  ];
  const qcRows: Array<[keyof typeof renderPassState.qcReview, string]> = [
    ['cameraPreserved', 'Camera preserved'],
    ['architecturePreserved', 'Architecture preserved'],
    ['furniturePreserved', 'Furniture preserved'],
    ['lightingFixturesPreserved', 'Lighting fixtures preserved'],
    ['equipmentPreserved', 'Equipment preserved'],
    ['materialsPreserved', 'Materials preserved'],
    ['columnsPreserved', 'Columns preserved'],
    ['noHallucination', 'No hallucination'],
    ['photographicQuality', 'Photographic quality'],
    ['clientReady', 'Client ready'],
  ];
  const resultQcLabels: Record<keyof ResultQc, string> = {
    cameraPreserved: 'Camera / perspective preserved?',
    architecturePreserved: 'No hallucinated architecture?',
    geometryPreserved: 'Architecture geometry preserved?',
    layoutPreserved: 'Layout preserved?',
    furniturePreserved: 'Furniture preserved?',
    lightingFixturesPreserved: 'Furniture / fixtures preserved?',
    equipmentPreserved: 'Equipment preserved?',
    logoSignagePreserved: 'Brand / signage preserved?',
    floorPatternPreserved: 'Floor pattern preserved?',
    materialZonesPreserved: 'Major materials preserved?',
    protectedAssetsPreserved: 'Protected assets preserved?',
    materialImproved: 'Material improved?',
    lightingImproved: 'Lighting improved without redesign?',
    environmentImproved: 'Environment improved?',
    photographicQualityImproved: 'Photographic quality improved?',
    unwantedObjectsAdded: 'People / props block design or hallucinations added?',
    notes: 'QC notes',
    deviationNotes: 'Deviation notes',
    revisionPrompt: 'Revision prompt',
    preservationScore: 'Preservation score',
    photographicScore: 'Photographic score',
    hallucinationRisk: 'Hallucination risk',
    clientReadyScore: 'Client-ready score',
  };
  const currentResultQc = activeResultRound?.qc ? calculateResultQc({ ...defaultResultQc, ...activeResultRound.qc }) : calculateResultQc(defaultResultQc);
  const renderPassInputSummary = activeRenderPassInputSummary(renderPassState);
  const renderPassInputReferenceText = renderPassReferencesText(renderPassState);
  const renderPassGenerated = enabledGeneratedPasses(renderPassState);
  const selectedRenderPass = renderPassGenerated.find((pass) => pass.type === renderPassState.selectedPassType) || renderPassGenerated[0] || renderPassState.passes.find((pass) => pass.enabled) || renderPassState.passes[0];
  const selectedPromptVersion = getActivePromptVersion(selectedRenderPass);
  const selectedApprovedPromptVersion = getApprovedPromptVersion(selectedRenderPass);
  const selectedPromptVersions = (selectedRenderPass?.promptVersions || []).filter((version) => version.status !== 'archived');
  const selectedPromptText = selectedPromptVersion ? formatPromptForAdapter(selectedPromptVersion.prompt, renderPassState.selectedModelAdapter || 'generic', renderPassState, selectedRenderPass) : (selectedRenderPass?.prompt || '');
  const selectedNegativePrompt = selectedPromptVersion?.negativePrompt || (selectedRenderPass ? buildRenderPassNegativePrompt(renderPassState, selectedRenderPass.type, projectSourceOfTruth) : buildRenderPassNegativePrompt(renderPassState, undefined, projectSourceOfTruth));
  const promptInspectorTrace = selectedPromptVersion?.compiledPromptTrace || activeResultRound?.compiledPromptTrace || compileQuickGenerateTrace(
    quickGenerateGoalCards.filter((goal) => (renderPassState.quickGenerateGoals || []).includes(goal.id)),
    conversationPrompt,
  );
  const copilotContext: CopilotContext = {
    projectId: project.id,
    sceneId: scene.id,
    projectName: project.name,
    sceneName: scene.name,
    sourceOfTruth: projectSourceOfTruth,
    activeGoalIds: renderPassState.quickGenerateGoals || [],
    activeResultRound,
    providerLabel: selectedGenerationAdapter.label,
    modelLabel: selectedGoogleImageModel,
    referencesCount: applicableProjectRuleReferences(projectSourceOfTruth).length + renderPassState.references.length,
    mode: `${productSection}/${activeTab}/${renderPassViewMode}`,
    compiledPromptSummary: [
      `Selected goals: ${(renderPassState.quickGenerateGoals || []).join(', ') || 'none'}`,
      `Custom rules: ${renderPassState.customRuleNote || 'none'}`,
      `Active rules: ${activeRuleIds.join(', ') || 'none'}`,
      `Selected pass: ${selectedRenderPass?.title || '-'}`,
    ].join('\n'),
  };
  const generatedPassCount = renderPassState.passes.filter((pass) => pass.status === 'generated' || Boolean(getActivePromptVersion(pass))).length;
  const approvedPassCount = renderPassState.passes.filter((pass) => pass.status === 'approved' || Boolean(pass.approvedVersionId)).length;
  const diffFromVersion = selectedPromptVersions.find((version) => version.id === renderPassState.diffFromVersionId) || selectedPromptVersions[0];
  const diffToVersion = selectedPromptVersions.find((version) => version.id === renderPassState.diffToVersionId) || selectedPromptVersion || selectedPromptVersions[selectedPromptVersions.length - 1];
  const promptDiffRows = (() => {
    if (!diffFromVersion || !diffToVersion || diffFromVersion.id === diffToVersion.id) return [];
    const fromLines = diffFromVersion.prompt.split('\n');
    const toLines = diffToVersion.prompt.split('\n');
    const rows: Array<{ type: 'same' | 'removed' | 'added'; text: string }> = [];
    const max = Math.max(fromLines.length, toLines.length);
    for (let index = 0; index < max; index += 1) {
      const from = fromLines[index] || '';
      const to = toLines[index] || '';
      if (from === to) rows.push({ type: 'same', text: to });
      else {
        if (from) rows.push({ type: 'removed', text: from });
        if (to) rows.push({ type: 'added', text: to });
      }
    }
    return rows.slice(0, 160);
  })();
  const allDesignLocksDisabled = designLockRows.every(([key]) => !renderPassState.designLock[key]);

  const addSlotInspectorLabel = () => {
    if (!activeCategory) return '';
    if (activeCategory === 'materials') return '+ Add M01 Material';
    if (activeCategory === 'props') return '+ Add P01 Prop';
    if (activeCategory === 'lighting') return '+ Add L01 Lighting';
    return '+ Add E01 Environment';
  };
  const slotPromptPreview = (slot: Slot) => [
    `${slot.code}${slot.name ? ` ${slot.name}` : ''}`,
    slot.descriptionThai ? `Thai intent: ${slot.descriptionThai}` : 'Thai intent: not provided',
    slot.applyTo ? `Apply to: ${slot.applyTo}` : '',
    slot.tone ? `Tone: ${slot.tone}` : '',
    slot.finish ? `Finish: ${slot.finish}` : '',
    slot.texture ? `Texture: ${slot.texture}` : '',
    slot.englishPromptNote ? `English note: ${slot.englishPromptNote}` : '',
    slot.direction ? `Direction: ${slot.direction}` : '',
    slot.quality ? `Quality: ${slot.quality}` : '',
    slot.intensity ? `Intensity: ${slot.intensity}` : '',
    slot.type ? `Environment type: ${slot.type}` : '',
    slot.referenceImages.length ? `${slot.referenceImages.length} reference image(s) attached` : '',
    slot.pins.length || slot.regions.length ? `Mapped with ${slot.pins.length} pin(s) and ${slot.regions.length} region(s)` : '',
  ].filter(Boolean).join('\n');
  const nextSlotCode = (category: SlotCategory) => {
    const prefix = categoryPrefix[category];
    const existingNumbers = scene.slots
      .filter((slot) => slot.category === category)
      .map((slot) => Number((slot.code || '').replace(prefix, '')))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    let candidate = 1;
    while (existingNumbers.includes(candidate)) candidate += 1;
    return `${prefix}${String(candidate).padStart(2, '0')}`;
  };
  const clampNorm = (value: number) => Math.max(0, Math.min(1, value));
  const toSafeRegion = (slotId: string, rect?: { x: number; y: number; width: number; height: number }) => {
    if (!rect) return null;
    const normalized = normalizeRegionRect(
      clampNorm(rect.x),
      clampNorm(rect.y),
      clampNorm(rect.x + rect.width),
      clampNorm(rect.y + rect.height),
      id(),
      slotId,
    );
    if (normalized.width < MIN_REGION_SIZE || normalized.height < MIN_REGION_SIZE) return null;
    if (normalized.x < 0 || normalized.y < 0 || normalized.x > 1 || normalized.y > 1) return null;
    return normalized;
  };
  const targetSlotFromSuggestion = (suggestion: AiEnrichmentSuggestion) => {
    return scene.slots.find((slot) => slot.id === suggestion.targetSlotId)
      || scene.slots.find((slot) => slot.code === (suggestion.targetSlotCode || suggestion.code || suggestion.suggestedCode));
  };
  const markSuggestionStatus = (suggestionId: string, status: 'pending' | 'applied' | 'ignored') => {
    updateScene({
      aiEnrichmentSuggestions: (scene.aiEnrichmentSuggestions || []).map((item) => item.id === suggestionId ? { ...item, status } : item),
    });
  };
  const markEnrichmentStatus = (enrichmentId: string, status: 'pending' | 'applied' | 'ignored') => {
    updateScene({
      slotEnrichmentSuggestions: (scene.slotEnrichmentSuggestions || []).map((item) => item.id === enrichmentId ? { ...item, status } : item),
    });
  };
  const applySlotEnrichment = (enrichment: SlotEnrichmentSuggestion) => {
    const target = scene.slots.find((slot) => slot.code === enrichment.code);
    if (!target) {
      showToast(`Target slot ${enrichment.code} was not found.`, 'warn');
      return;
    }
    const patch: Partial<Slot> = {};
    if (enrichment.inferredName && (!target.name?.trim() || defaultSlotNamePattern.test(target.name.trim()))) patch.name = enrichment.inferredName;
    if (enrichment.inferredThaiIntent && !target.descriptionThai?.trim()) patch.descriptionThai = enrichment.inferredThaiIntent;
    if (enrichment.inferredApplyTo && !target.applyTo?.trim()) patch.applyTo = enrichment.inferredApplyTo;
    if (enrichment.inferredFinish && !target.finish?.trim()) patch.finish = enrichment.inferredFinish;
    if (enrichment.inferredTexture && !target.texture?.trim()) patch.texture = enrichment.inferredTexture;
    if (enrichment.inferredAvoid && (!target.avoid || !target.avoid.length)) {
      patch.avoid = enrichment.inferredAvoid.split(',').map((item) => item.trim()).filter(Boolean);
    }
    patch.inferredByAi = true;
    patch.aiSuggestionConfidence = enrichment.confidence || target.aiSuggestionConfidence;
    patch.aiSuggestionBasis = enrichment.basis || target.aiSuggestionBasis;
    const nextSlots = scene.slots.map((slot) => slot.id === target.id ? { ...slot, ...patch } : slot);
    const nextEnrichment = (scene.slotEnrichmentSuggestions || []).map((item) => item.id === enrichment.id ? { ...item, status: 'applied' as const } : item);
    updateScene({ slots: nextSlots, slotEnrichmentSuggestions: nextEnrichment, localPrompt: generateLocalPrompt({ ...scene, slots: nextSlots, slotEnrichmentSuggestions: nextEnrichment }, projectSourceOfTruth) });
    setSelectedSlotId(target.id);
    showToast(`${target.code} inferred fields applied`);
  };
  const applyAiSuggestion = (suggestion: AiEnrichmentSuggestion) => {
    if (!suggestion || suggestion.status === 'applied') return;
    const asArray = (value?: string | string[]) => Array.isArray(value) ? value : (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);
    if (suggestion.action === 'add_slot') {
      const category = normalizeSlotCategoryFromSuggestion(suggestion.slotType);
      if (!category) {
        showToast('Suggestion slot type is invalid.', 'warn');
        return;
      }
      const suggestedCode = suggestion.suggestedCode || suggestion.code || nextSlotCode(category);
      const codeExists = scene.slots.some((slot) => slot.code === suggestedCode);
      const finalCode = codeExists ? nextSlotCode(category) : suggestedCode;
      const color = suggestion.color || slotColors[scene.slots.filter((slot) => slot.category === category).length % slotColors.length];
      const newSlot: Slot = {
        id: id(),
        category,
        code: finalCode,
        name: suggestion.suggestedName || categoryDefaultName[category],
        color,
        descriptionThai: suggestion.thaiDescription || '',
        referenceImages: [],
        creativeFreedom: (suggestion.creativeFreedom === 'low' || suggestion.creativeFreedom === 'medium' || suggestion.creativeFreedom === 'high') ? suggestion.creativeFreedom : 'medium',
        applyTo: suggestion.applyTo || '',
        finish: suggestion.finish || '',
        texture: suggestion.texture || '',
        avoid: asArray(suggestion.avoid),
        englishPromptNote: suggestion.englishPromptNote || '',
        aiSuggested: true,
        aiSuggestionId: suggestion.id,
        aiSuggestionConfidence: suggestion.confidence,
        aiSuggestionBasis: suggestion.basis,
        inferredByAi: true,
        pins: [],
        regions: [],
      };

      const nextSlots = [...scene.slots, newSlot];
      if (suggestion.mappingSuggestion?.type === 'pin' && suggestion.mappingSuggestion.normalizedPoint) {
        const point = suggestion.mappingSuggestion.normalizedPoint;
        const x = clampNorm(point.x);
        const y = clampNorm(point.y);
        newSlot.pins = [...newSlot.pins, { id: id(), slotId: newSlot.id, x, y }];
      }
      if (suggestion.mappingSuggestion?.type === 'region' && suggestion.mappingSuggestion.normalizedRect) {
        const region = toSafeRegion(newSlot.id, suggestion.mappingSuggestion.normalizedRect);
        if (region) newSlot.regions = [...newSlot.regions, region];
      }
      const normalized = sanitizeSceneMapping({ ...scene, slots: nextSlots }).scene;
      pushMappingHistory();
      const updatedSuggestions = (scene.aiEnrichmentSuggestions || []).map((item) => item.id === suggestion.id ? { ...item, status: 'applied' as const } : item);
      updateScene({ slots: normalized.slots, aiEnrichmentSuggestions: updatedSuggestions, localPrompt: generateLocalPrompt({ ...scene, slots: normalized.slots, aiEnrichmentSuggestions: updatedSuggestions }, projectSourceOfTruth) });
      setSelectedSlotId(newSlot.id);
      if (newSlot.regions[0]) setSelectedObject({ type: 'rect', slotId: newSlot.id, id: newSlot.regions[0].id });
      if (!newSlot.regions[0] && newSlot.pins[0]) setSelectedObject({ type: 'pin', slotId: newSlot.id, id: newSlot.pins[0].id });
      showToast(codeExists ? `${newSlot.code} ${newSlot.name} added (suggested code ${suggestedCode} was already used)` : `${newSlot.code} ${newSlot.name} added`);
      return;
    }

    if (suggestion.action === 'enrich_existing_slot') {
      const target = targetSlotFromSuggestion(suggestion);
      if (!target) {
        showToast('Target slot for enrichment was not found.', 'warn');
        return;
      }
      const overwrite = Boolean(suggestion.overwrite);
      const patch: Partial<Slot> = {};
      if (suggestion.suggestedName && (overwrite || !target.name?.trim() || defaultSlotNamePattern.test(target.name.trim()))) patch.name = suggestion.suggestedName;
      if (suggestion.thaiDescription && (overwrite || !target.descriptionThai?.trim())) patch.descriptionThai = suggestion.thaiDescription;
      if (suggestion.englishPromptNote && (overwrite || !target.englishPromptNote?.trim())) patch.englishPromptNote = suggestion.englishPromptNote;
      if (suggestion.applyTo && (overwrite || !target.applyTo?.trim())) patch.applyTo = suggestion.applyTo;
      if (suggestion.finish && (overwrite || !target.finish?.trim())) patch.finish = suggestion.finish;
      if (suggestion.texture && (overwrite || !target.texture?.trim())) patch.texture = suggestion.texture;
      if (suggestion.avoid && (overwrite || !target.avoid?.length)) patch.avoid = asArray(suggestion.avoid);
      if (suggestion.creativeFreedom && (suggestion.creativeFreedom === 'low' || suggestion.creativeFreedom === 'medium' || suggestion.creativeFreedom === 'high') && (overwrite || !target.creativeFreedom)) patch.creativeFreedom = suggestion.creativeFreedom;
      patch.inferredByAi = true;
      patch.aiSuggestionId = suggestion.id;
      patch.aiSuggestionBasis = suggestion.basis || target.aiSuggestionBasis;
      patch.aiSuggestionConfidence = suggestion.confidence || target.aiSuggestionConfidence;
      const nextSlots = scene.slots.map((slot) => slot.id === target.id ? { ...slot, ...patch } : slot);
      const updatedSuggestions = (scene.aiEnrichmentSuggestions || []).map((item) => item.id === suggestion.id ? { ...item, status: 'applied' as const } : item);
      updateScene({ slots: nextSlots, aiEnrichmentSuggestions: updatedSuggestions, localPrompt: generateLocalPrompt({ ...scene, slots: nextSlots, aiEnrichmentSuggestions: updatedSuggestions }, projectSourceOfTruth) });
      setSelectedSlotId(target.id);
      showToast(`${target.code} enriched`);
      return;
    }

    if (suggestion.action === 'add_mapping_to_existing_slot') {
      const target = targetSlotFromSuggestion(suggestion);
      if (!target) {
        showToast('Target slot for mapping was not found.', 'warn');
        return;
      }
      pushMappingHistory();
      let nextPins = [...target.pins];
      let nextRegions = [...target.regions];
      if (suggestion.mappingSuggestion?.type === 'pin' && suggestion.mappingSuggestion.normalizedPoint) {
        const point = suggestion.mappingSuggestion.normalizedPoint;
        nextPins = [...nextPins, { id: id(), slotId: target.id, x: clampNorm(point.x), y: clampNorm(point.y) }];
      }
      if (suggestion.mappingSuggestion?.type === 'region' && suggestion.mappingSuggestion.normalizedRect) {
        const region = toSafeRegion(target.id, suggestion.mappingSuggestion.normalizedRect);
        if (region) nextRegions = [...nextRegions, region];
      }
      const nextScene = sanitizeSceneMapping({
        ...scene,
        slots: scene.slots.map((slot) => slot.id === target.id ? { ...slot, pins: nextPins, regions: nextRegions } : slot),
      }).scene;
      const updatedSuggestions = (scene.aiEnrichmentSuggestions || []).map((item) => item.id === suggestion.id ? { ...item, status: 'applied' as const } : item);
      updateScene({ slots: nextScene.slots, aiEnrichmentSuggestions: updatedSuggestions, localPrompt: generateLocalPrompt({ ...scene, slots: nextScene.slots, aiEnrichmentSuggestions: updatedSuggestions }, projectSourceOfTruth) });
      const updatedTarget = nextScene.slots.find((slot) => slot.id === target.id);
      setSelectedSlotId(target.id);
      if (updatedTarget?.regions.length && updatedTarget.regions.length > target.regions.length) {
        setSelectedObject({ type: 'rect', slotId: target.id, id: updatedTarget.regions[updatedTarget.regions.length - 1].id });
      } else if (updatedTarget?.pins.length && updatedTarget.pins.length > target.pins.length) {
        setSelectedObject({ type: 'pin', slotId: target.id, id: updatedTarget.pins[updatedTarget.pins.length - 1].id });
      }
      showToast(`${target.code} mapping added`);
      return;
    }
  };
  const deleteSelectedObject = () => {
    if (!selectedObject) return;
    const slot = scene.slots.find((item) => item.id === selectedObject.slotId);
    if (!slot) return;
    pushMappingHistory();
    if (selectedObject.type === 'pin') updateSlot(slot.id, { pins: slot.pins.filter((pin) => pin.id !== selectedObject.id) });
    if (selectedObject.type === 'rect') updateSlot(slot.id, { regions: slot.regions.filter((region) => region.id !== selectedObject.id) });
    setSelectedObject(null);
    showToast('Mapped object deleted');
  };
  const reassignSelectedObject = (targetSlotId: string) => {
    if (!selectedObject || !targetSlotId || targetSlotId === selectedObject.slotId) return;
    const sourceSlot = scene.slots.find((item) => item.id === selectedObject.slotId);
    const targetSlot = scene.slots.find((item) => item.id === targetSlotId);
    if (!sourceSlot || !targetSlot) return;
    const object = selectedObject.type === 'pin'
      ? sourceSlot.pins.find((pin) => pin.id === selectedObject.id)
      : sourceSlot.regions.find((region) => region.id === selectedObject.id);
    if (!object) return;
    pushMappingHistory();
    const movedObject = { ...object, slotId: targetSlot.id };
    updateScene({
      slots: scene.slots.map((slot) => {
        if (slot.id === sourceSlot.id) {
          return selectedObject.type === 'pin'
            ? { ...slot, pins: slot.pins.filter((pin) => pin.id !== selectedObject.id) }
            : { ...slot, regions: slot.regions.filter((region) => region.id !== selectedObject.id) };
        }
        if (slot.id === targetSlot.id) {
          return selectedObject.type === 'pin'
            ? { ...slot, pins: [...slot.pins, movedObject as Slot['pins'][number]] }
            : { ...slot, regions: [...slot.regions, movedObject as Slot['regions'][number]] };
        }
        return slot;
      }),
    });
    setSelectedSlotId(targetSlot.id);
    setSelectedObject({ ...selectedObject, slotId: targetSlot.id });
    showToast(`${selectedObject.type === 'pin' ? 'Pin' : 'Region'} reassigned to ${targetSlot.code}`);
  };

  const onBaseDropZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsBaseDragOver(true);
  };
  const onBaseDropZoneDragLeave = () => setIsBaseDragOver(false);
  const onBaseDropZoneDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsBaseDragOver(false);
    const draggedSlotId = event.dataTransfer.getData('application/x-visual-brief-slot-id');
    if (draggedSlotId) {
      showToast('Upload a base image before placing tags.', 'warn');
      return;
    }
    const imageFiles = imageFilesFromList(event.dataTransfer?.files);
    if (!imageFiles.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    await onBaseUpload(imageFiles[0], 'drop');
  };

  const onRefZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsRefDragOver(true);
  };
  const onRefZoneDragLeave = () => setIsRefDragOver(false);
  const onRefZoneDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsRefDragOver(false);
    if (!selectedSlot) {
      showToast('Select a slot before pasting reference images.', 'warn');
      return;
    }
    const imageFiles = imageFilesFromList(event.dataTransfer?.files);
    if (!imageFiles.length) {
      showToast('Only image files are supported', 'warn');
      return;
    }
    await addReferenceFilesToSlot(selectedSlot, imageFiles);
  };

  const onRefZonePaste = async (event: ReactClipboardEvent<HTMLDivElement>) => {
    const imageFiles = imageFilesFromClipboard(event.clipboardData);
    if (!imageFiles.length) return;
    event.preventDefault();
    if (!selectedSlot) {
      showToast('Select a slot before pasting reference images.', 'warn');
      return;
    }
    await addReferenceFilesToSlot(selectedSlot, imageFiles);
  };

  const removeReferenceImage = (slotId: string, index: number) => {
    const slot = scene.slots.find((item) => item.id === slotId);
    if (!slot) return;
    updateSlot(slotId, { referenceImages: slot.referenceImages.filter((_, i) => i !== index) });
  };

  const getStageClientRect = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    return stage.container().getBoundingClientRect();
  };

  const pointIsOverImage = (clientX: number, clientY: number) => {
    const rect = getStageClientRect();
    return Boolean(rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
  };

  const addPinFromSlotDrop = (slotId: string, clientX: number, clientY: number) => {
    if (!imgObj) {
      showToast('Upload a base image before placing tags.', 'warn');
      return false;
    }
    const rect = getStageClientRect();
    if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      showToast('Drop the slot code directly on the base image.', 'warn');
      return false;
    }
    const slot = scene.slots.find((item) => item.id === slotId);
    if (!slot) return false;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const pin = { id: id(), slotId: slot.id, x, y };
    pushMappingHistory();
    updateSlot(slot.id, { pins: [...slot.pins, pin] });
    setSelectedSlotId(slot.id);
    setSelectedObject({ type: 'pin', slotId: slot.id, id: pin.id });
    showToast(`${slot.code} pin added`);
    return true;
  };

  const onSlotChipPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, slot: Slot) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedSlotId(slot.id);
    setActiveTab(slot.category);
    setSlotDrag({ slotId: slot.id, code: slot.code, color: slot.color, name: slot.name, x: event.clientX, y: event.clientY, overImage: pointIsOverImage(event.clientX, event.clientY) });
  };

  useEffect(() => {
    if (!slotDrag) return;
    const onPointerMove = (event: PointerEvent) => {
      setSlotDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY, overImage: pointIsOverImage(event.clientX, event.clientY) } : null);
    };
    const onPointerUp = (event: PointerEvent) => {
      setSlotDrag((current) => {
        if (!current) return null;
        addPinFromSlotDrop(current.slotId, event.clientX, event.clientY);
        return null;
      });
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [slotDrag, imgObj, scene.slots, zoom]);

  const qcCompareActive = activeTab === 'render-pass' && Boolean(scene.baseImage && activeResultRound?.imageDataUrl);
  const showConversationalStudio = productSection === 'studio' && activeTab === 'render-pass' && !proModeEnabled;
  const aiReadMaterials = renderPassState.sceneIntelligence?.sceneGraph.visibleMaterials || renderPassState.materialIntelligence?.zones?.map((zone) => zone.category) || ['wood', 'brass', 'leather', 'floor tile'];
  const aiReadProtected = renderPassState.sceneIntelligence?.sceneGraph.protectedElements || ['Camera', 'Architecture', 'Furniture', 'Logo', 'Lighting fixtures'];
  const aiReadRisks = renderPassState.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses || ['Global yellow cast', 'Flat material realism', 'Hallucinated background'];
  const dynamicConversationChips = Array.from(new Set([
    ...(aiReadRisks.some((risk) => /yellow|cast|warm/i.test(String(risk))) ? ['Neutralize yellow cast', 'Preserve white ceiling'] : []),
    ...(aiReadMaterials.some((item) => /brass|metal/i.test(String(item))) ? ['Improve brass reflections'] : []),
    ...(aiReadMaterials.some((item) => /leather|upholstery/i.test(String(item))) ? ['Improve leather softness'] : []),
    ...(aiReadMaterials.some((item) => /wood/i.test(String(item))) ? ['Richer wood grain'] : []),
    ...(activeResultRound?.status === 'needs_revision' ? ['Fix QC issues', 'Restore base design', 'Reduce AI stylization'] : []),
    ...conversationalQuickPrompts,
  ])).slice(0, 14);
  const backToMappingView = () => {
    setActiveTab('materials');
    setRenderPassViewMode('basic');
  };
  const openStudio = (mode: 'basic' | 'work' | 'advanced' | 'qc-studio' = 'basic') => {
    setProductSection('studio');
    setActiveTab('render-pass');
    setRenderPassViewMode(mode);
  };
  const productionStageMeta: Record<ProductionStage, { label: string; description: string }> = {
    project: { label: 'Project', description: 'Confirm project rules and production readiness.' },
    upload: { label: 'Upload', description: 'Upload the raw render that becomes the source of truth.' },
    preview: { label: 'Preview', description: 'Generate the first project-aware draft.' },
    review: { label: 'Review', description: 'Compare base and result, then mark comments.' },
    revise: { label: 'Revise', description: 'Process comments into a focused revision plan.' },
    approve: { label: 'Approve', description: 'Approve the current version or continue another revision loop.' },
  };
  const productionEstimate = selectedGenerationAdapter.id === 'google_lite_image' ? googleLiteCostPerImage : selectedGenerationAdapter.id === 'google_pro_image' ? googleProCostPerImage : 0;
  const renderProductionFlow = () => {
    const stages: ProductionStage[] = ['project', 'upload', 'preview', 'review', 'revise', 'approve'];
    const activeStageIndex = stages.indexOf(productionStage);
    const sourceName = projectSourceOfTruth?.profileName || 'Project Source of Truth';
    const productionProviderId: GenerationProviderId = selectedGenerationAdapter.id !== 'mock_local'
      ? selectedGenerationAdapter.id
      : getDirectGenerationApiKey('google_pro_image')
        ? 'google_pro_image'
        : getDirectGenerationApiKey('google_lite_image')
          ? 'google_lite_image'
          : 'mock_local';
    const productionProvider = quickGenerationAdapters.find((adapter) => adapter.id === productionProviderId) || selectedGenerationAdapter;
    const productionProviderModel = productionProviderId === 'google_pro_image' ? GOOGLE_PRO_IMAGE_MODEL_ID : productionProviderId === 'google_lite_image' ? GOOGLE_LITE_IMAGE_MODEL_ID : productionProviderId;
    const productionProviderReady = productionProviderId === 'mock_local' || !productionProvider.requiresKey || Boolean(getActiveGenerationApiKey(productionProviderId));
    const productionProviderEstimate = productionProviderId === 'google_lite_image' ? googleLiteCostPerImage : productionProviderId === 'google_pro_image' ? googleProCostPerImage : 0;
    const activeAgentPlan = activeResultRound?.agentRevisionPlan;
    const activeAgentPlanApplied = activeAgentPlan?.status === 'applied';
    const productionRevisionBlocked = Boolean(activeResultRound && productionComments.length > 0 && !activeAgentPlanApplied);
    const productionGenerateLabel = isQuickGenerating ? 'Generating...' : activeResultRound ? productionComments.length > 0 ? 'Generate Revision' : 'Generate Again' : 'Generate Preview';
    return <div data-testid="production-flow" className="flex h-full min-h-0 flex-col bg-[#080b13] p-4 text-slate-100">
      <div className="flex flex-none items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.07] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb15c]">
            <span>Production Flow</span>
            {projectSourceOfTruth && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200">{sourceName} active</span>}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">{project.name}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-400">{scene.name} - {productionStageMeta[productionStage].description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span className={`rounded-full px-3 py-1.5 font-black ${productionProviderReady ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>{productionProvider.label}</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 font-black text-slate-200">{productionProviderModel}</span>
          <button className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 font-black text-slate-200 hover:border-[#ff8800]/50 hover:text-white" onClick={() => setProModeEnabled(true)}>Advanced</button>
        </div>
      </div>

      <div className="mt-4 grid flex-none grid-cols-6 gap-2">
        {stages.map((stage, index) => <button key={stage} data-testid={`production-stage-${stage}`} className={`rounded-2xl border px-3 py-3 text-left transition ${productionStage === stage ? 'border-[#ff8800] bg-[#ff8800] text-white shadow-[0_12px_30px_rgba(255,136,0,0.22)]' : index <= activeStageIndex ? 'border-white/10 bg-white/[0.08] text-slate-100' : 'border-white/10 bg-white/[0.04] text-slate-500'}`} onClick={() => setProductionStage(stage)}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">{String(index + 1).padStart(2, '0')}</div>
          <div className="mt-1 text-sm font-black">{productionStageMeta[stage].label}</div>
        </button>)}
      </div>

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="min-h-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          {scene.baseImage && activeResultRound ? <div data-testid="qc-compare-main" className="flex h-full min-h-0 flex-col bg-slate-950 p-4">
            <div className={`relative min-h-0 flex-1 overflow-hidden rounded-2xl border bg-slate-900 ${productionCommentMode === 'point' ? 'cursor-crosshair border-[#ff8800]' : 'border-white/10'}`} onClick={handleProductionResultClick}>
              {(resultCompareMode === 'slider' || resultCompareMode === 'overlay' || resultCompareMode === 'base' || resultCompareMode === 'difference') && <img src={scene.baseImage} alt="base render for review" className="absolute inset-0 h-full w-full object-contain" />}
              {resultCompareMode === 'slider' && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${resultCompareSplit}%)` }}><img ref={productionCommentImageRef} src={activeResultRound.imageDataUrl} alt="generated result for review" className="h-full w-full object-contain" /></div>}
              {resultCompareMode === 'slider' && <div className="absolute inset-y-0 bg-[#ff8800]" style={{ left: `${resultCompareSplit}%`, width: 3 }} />}
              {resultCompareMode === 'overlay' && <img ref={productionCommentImageRef} src={activeResultRound.imageDataUrl} alt="generated overlay for review" className="absolute inset-0 h-full w-full object-contain" style={{ opacity: resultOverlayOpacity / 100 }} />}
              {resultCompareMode === 'side-by-side' && <div className="absolute inset-0 grid grid-cols-2 gap-px bg-slate-700">
                <div className="relative bg-slate-900"><img src={scene.baseImage} alt="base render side by side" className="absolute inset-0 h-full w-full object-contain" /><span className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Base</span></div>
                <div className="relative bg-slate-900"><img ref={productionCommentImageRef} src={activeResultRound.imageDataUrl} alt="generated result side by side" className="absolute inset-0 h-full w-full object-contain" /><span className="absolute bottom-4 right-4 rounded-full bg-[#ff8800] px-3 py-1.5 text-xs font-black text-white">Result</span></div>
              </div>}
              {resultCompareMode === 'difference' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-8 text-center text-sm font-black text-slate-300">Difference mode placeholder. Use slider, overlay, or side-by-side for visual QC.</div>}
              {resultCompareMode === 'result' && <img ref={productionCommentImageRef} src={activeResultRound.imageDataUrl} alt="generated result only" className="absolute inset-0 h-full w-full object-contain" />}
              {(activeResultRound.productionComments || []).filter((comment) => comment.type === 'point').map((comment) => <button
                key={comment.id}
                type="button"
                data-testid="production-comment-marker"
                className={`absolute z-20 flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-black shadow-[0_10px_22px_rgba(0,0,0,0.35)] ${selectedProductionCommentId === comment.id ? 'border-white bg-[#ff8800] text-white ring-4 ring-[#ff8800]/30' : comment.status === 'resolved' ? 'border-emerald-200 bg-emerald-500 text-white' : 'border-white bg-slate-950 text-white'}`}
                style={productionMarkerPosition(comment.x || 0, comment.y || 0)}
                onClick={(event) => { event.stopPropagation(); setSelectedProductionCommentId(comment.id); setProductionStage('revise'); }}
                aria-label={`Open comment ${comment.number}`}
              >{comment.number}</button>)}
              {anchoredProductionDraft?.type === 'point' && <button
                type="button"
                data-testid="production-draft-comment-marker"
                className="absolute z-30 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#ff8800] text-xs font-black text-white shadow-[0_12px_26px_rgba(255,136,0,0.38)] ring-4 ring-[#ff8800]/30"
                style={productionMarkerPosition(anchoredProductionDraft.x || 0, anchoredProductionDraft.y || 0)}
                aria-label={`Draft comment ${anchoredProductionDraft.number}`}
                onClick={(event) => event.stopPropagation()}
              >{anchoredProductionDraft.number}</button>}
              {anchoredProductionDraft && <div
                data-testid="anchored-comment-composer"
                className={`absolute z-40 w-[340px] rounded-3xl border border-[#ff8800]/35 bg-slate-950/96 p-4 text-left text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur ${anchoredProductionDraft.type === 'point' && (anchoredProductionDraft.x || 0) > 0.62 ? '-translate-x-full' : ''} ${anchoredProductionDraft.type === 'point' && (anchoredProductionDraft.y || 0) > 0.62 ? '-translate-y-full' : ''}`}
                style={productionComposerPosition(anchoredProductionDraft)}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb15c]">{anchoredProductionDraft.type === 'point' ? `Comment ${anchoredProductionDraft.number}` : 'Global Comment'}</div>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">{anchoredProductionDraft.type === 'point' ? `Result target x=${(anchoredProductionDraft.x || 0).toFixed(2)}, y=${(anchoredProductionDraft.y || 0).toFixed(2)}` : 'Whole image revision note'}</p>
                  </div>
                  <button className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-slate-300 hover:bg-white/15" onClick={cancelAnchoredProductionDraft}>Esc</button>
                </div>
                <textarea
                  ref={productionCommentComposerRef}
                  data-testid="anchored-comment-textarea"
                  className="mt-3 h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/10 p-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/25"
                  placeholder="บอกสิ่งที่อยากแก้ตรงจุดนี้..."
                  value={anchoredProductionDraft.text}
                  onChange={(event) => setAnchoredProductionDraft((current) => current ? { ...current, text: event.target.value } : current)}
                />
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Reference usage</div>
                    <label className="inline-flex h-8 cursor-pointer items-center rounded-xl bg-white/10 px-3 text-[11px] font-black text-slate-200 hover:bg-white/15">Attach<input data-testid="anchored-comment-reference-input" className="hidden" type="file" accept="image/*" multiple onChange={(event) => addReferencesToAnchoredDraft(event.target.files)} /></label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">{productionCommentScopeOptions.map((scope) => <button key={scope.value} type="button" className={`rounded-full px-2 py-1 text-[10px] font-black ${anchoredProductionDraft.scopes.includes(scope.value) ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400'}`} onClick={() => toggleAnchoredDraftScope(scope.value)}>{scope.label}</button>)}</div>
                  <input className="mt-2 h-8 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#ff8800]" placeholder="ใช้เฉพาะสีและ texture ห้ามเอาทรงหรือฉากมา" value={anchoredProductionDraft.referenceUsageNote} onChange={(event) => setAnchoredProductionDraft((current) => current ? { ...current, referenceUsageNote: event.target.value } : current)} />
                  {anchoredProductionDraft.references.length > 0 && <div className="mt-2 grid grid-cols-3 gap-2">{anchoredProductionDraft.references.map((ref) => <div key={ref.id} className="relative rounded-xl border border-white/10 bg-black/25 p-1">
                    <img src={ref.dataUrl} alt={`${ref.name} reference for comment ${anchoredProductionDraft.number}`} className="h-14 w-full rounded-lg object-cover" />
                    <button className="absolute right-1 top-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-black text-white" onClick={() => removeReferenceFromAnchoredDraft(ref.id)} aria-label={`Remove ${ref.name}`}>×</button>
                  </div>)}</div>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xs font-black text-slate-200 hover:bg-white/15" onClick={cancelAnchoredProductionDraft}>Cancel</button>
                  <button className="inline-flex h-9 items-center justify-center rounded-xl border border-[#ff8800]/35 bg-[#ff8800]/15 text-xs font-black text-[#ffb15c] hover:bg-[#ff8800]/20" onClick={() => saveAnchoredProductionDraft(false)}>Save</button>
                  <button className="inline-flex h-9 items-center justify-center rounded-xl bg-[#ff8800] text-xs font-black text-white hover:bg-[#e67800]" onClick={() => saveAnchoredProductionDraft(true)}>Save & Process</button>
                </div>
              </div>}
              {productionCommentMode === 'point' && <div className="pointer-events-none absolute inset-x-0 top-4 z-20 mx-auto w-fit rounded-full border border-[#ff8800]/40 bg-black/75 px-4 py-2 text-xs font-black text-white">Click the result image to place Comment {nextProductionCommentNumber()}</div>}
              <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Base Render</div>
              <div className="absolute bottom-4 right-4 rounded-full bg-[#ff8800] px-3 py-1.5 text-xs font-black text-white">Generated Result</div>
            </div>
            <div className="mt-3 flex flex-none flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-xs font-bold text-slate-200">
              <span className="inline-flex h-9 items-center justify-center rounded-xl bg-[#ff8800]/15 px-3 font-black text-[#ffb15c]">Review Mode</span>
              <select className="h-9 rounded-xl border border-white/10 bg-white/10 px-2 text-xs font-black text-white" value={resultCompareMode} onChange={(e) => setResultCompareMode(e.target.value as any)}>
                <option value="slider">Before / After</option>
                <option value="overlay">Opacity</option>
                <option value="side-by-side">Side by Side</option>
                <option value="difference">Difference</option>
                <option value="result">Result Only</option>
                <option value="base">Base Only</option>
              </select>
              {resultCompareMode === 'slider' && <input className="w-40" type="range" min={0} max={100} value={resultCompareSplit} onChange={(e) => setResultCompareSplit(Number(e.target.value))} />}
              {resultCompareMode === 'overlay' && <input className="w-40" type="range" min={0} max={100} value={resultOverlayOpacity} onChange={(e) => setResultOverlayOpacity(Number(e.target.value))} />}
              <button className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-500/15 px-3 font-black text-emerald-300" onClick={() => setQuickPreviewStatus(activeResultRound.id, 'approved')}>Approve</button>
              <button className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-500/15 px-3 font-black text-amber-300" onClick={() => setQuickPreviewStatus(activeResultRound.id, 'needs_revision')}>Needs Revision</button>
              <button className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 font-black ${productionCommentMode === 'point' ? 'border-[#ff8800] bg-[#ff8800] text-white' : 'border-white/10 bg-white/10 text-slate-200'}`} onClick={() => {
                const nextMode = productionCommentMode === 'point' ? 'off' : 'point';
                setProductionCommentMode(nextMode);
                if (nextMode === 'point') {
                  setResultCompareMode('result');
                  setAnchoredProductionDraft(null);
                }
                setProductionStage('revise');
              }}>Add Comment</button>
              <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 font-black text-slate-200 hover:border-[#ff8800]" onClick={() => processProductionCommentsWithCopilot(undefined, productionComments)}>Process Comments</button>
              <button data-testid="production-main-generate" className="ml-auto inline-flex h-9 items-center justify-center rounded-xl bg-[#ff8800] px-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-600" disabled={isQuickGenerating || productionRevisionBlocked} title={productionRevisionBlocked ? 'Apply the Agent revision plan before generating a revision.' : undefined} onClick={() => createProductionPreview(activeResultRound)}>{productionGenerateLabel}</button>
            </div>
          </div> : scene.baseImage ? <div className="relative flex h-full min-h-0 items-center justify-center bg-slate-950 p-4">
            <img src={scene.baseImage} alt="Current base render" className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_24px_70px_rgba(0,0,0,0.45)]" />
            <div className="absolute left-5 top-5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Base Render</div>
            <button className="absolute bottom-5 right-5 inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-black/70 px-4 text-xs font-black text-white backdrop-blur hover:border-[#ff8800]" onClick={() => {
              if (scene.baseImage && !confirm('Replace the current base render? Existing mappings and result reviews will stay, but the source image changes.')) return;
              baseImageInputRef.current?.click();
            }}><ImagePlus className="mr-1.5 h-4 w-4" />Replace Raw Render</button>
          </div> : <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#ff8800] text-white shadow-[0_18px_38px_rgba(255,136,0,0.28)]"><ImagePlus className="h-7 w-7" /></div>
              <h2 className="mt-5 text-3xl font-black text-white">Upload Raw Render</h2>
              <p className="mt-3 text-base leading-7 text-slate-400">This image becomes the source of truth for camera, geometry, layout, signage, and architecture preservation.</p>
              <button data-testid="production-upload-render" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#ff8800] px-8 text-base font-black text-white shadow-[0_16px_36px_rgba(255,136,0,0.28)] hover:bg-[#e67800]" onClick={() => baseImageInputRef.current?.click()}><ImagePlus className="mr-2 h-5 w-5" />Upload Raw Render</button>
            </div>
          </div>}
        </div>

        <aside className="min-h-0 overflow-auto rounded-[28px] border border-white/10 bg-white/[0.07] p-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-black text-white">Project-ready status</h3>
            <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
              <div className="flex justify-between gap-3"><span>Current project</span><b className="text-white">{project.name}</b></div>
              <div className="flex justify-between gap-3"><span>Current scene</span><b className="text-white">{scene.name}</b></div>
              <div className="flex justify-between gap-3"><span>Source of Truth</span><b className={projectSourceOfTruth ? 'text-emerald-300' : 'text-amber-300'}>{projectSourceOfTruth ? 'Active' : 'Missing'}</b></div>
              <div className="flex justify-between gap-3"><span>Protected assets</span><b className="text-white">{renderPassState.protectedAssets.length}</b></div>
              <div className="flex justify-between gap-3"><span>Material rules</span><b className="text-white">{activeMaterialRules.length}</b></div>
              <div className="flex justify-between gap-3"><span>Base render</span><b className={scene.baseImage ? 'text-emerald-300' : 'text-amber-300'}>{scene.baseImage ? 'Ready' : 'Missing'}</b></div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-[#ff8800]/25 bg-[#ff8800]/10 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb15c]">Next action</div>
            <h3 className="mt-2 text-lg font-black text-white">{!scene.baseImage ? 'Upload Raw Render' : activeResultRound ? 'Generate Revision / Approve' : 'Generate Preview'}</h3>
            <ul className="mt-3 space-y-1.5 text-xs font-semibold leading-5 text-orange-50">
              <li>- Improve: Better Materials, Better Lighting, Photographic Finish</li>
              <li>- Protect: camera, geometry, signage, furniture, fixture positions</li>
              <li>- Provider: {productionProvider.label}{productionProviderId === 'mock_local' ? ' (local mock)' : ''}</li>
              {!productionProviderReady && <li>- Setup required: connect an image provider before generating</li>}
              <li>- Estimated cost: THB {productionProviderEstimate.toFixed(2)}</li>
            </ul>
            <button data-testid="production-primary-action" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#ff8800] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,136,0,0.28)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isQuickGenerating || productionRevisionBlocked} title={productionRevisionBlocked ? 'Apply the Agent revision plan before generating a revision.' : undefined} onClick={!scene.baseImage ? () => baseImageInputRef.current?.click() : activeResultRound?.status === 'approved' ? () => setProductionStage('approve') : () => createProductionPreview(activeResultRound)}>
              {isQuickGenerating ? 'Generating...' : !scene.baseImage ? 'Upload Raw Render' : activeResultRound ? 'Generate Revision' : 'Generate Preview'}
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-black text-white">Version loop</h3>
            <div className="mt-3 space-y-2">
              {renderPassState.resultRounds.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-slate-400">No generated versions yet.</div> : renderPassState.resultRounds.slice(-5).reverse().map((round) => <button key={round.id} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-xs ${round.id === activeResultRound?.id ? 'border-[#ff8800] bg-[#ff8800]/10 text-white' : 'border-white/10 bg-white/[0.04] text-slate-300'}`} onClick={() => { updateRenderPassBuilder({ activeResultRoundId: round.id }); setProductionStage('review'); }}>
                <span className="font-black">{round.name}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-black">{round.status.replace(/_/g, ' ')}</span>
              </button>)}
            </div>
          </div>

          {activeResultRound && <div data-testid="production-comments-panel" className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white">Review Comments</h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">Numbered notes become the next revision plan.</p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-slate-300">{processableProductionComments.length} ready</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className={`inline-flex h-9 items-center justify-center rounded-xl border text-xs font-black ${productionCommentMode === 'point' ? 'border-[#ff8800] bg-[#ff8800] text-white' : 'border-white/10 bg-white/10 text-slate-200'}`} onClick={() => {
                const nextMode = productionCommentMode === 'point' ? 'off' : 'point';
                setProductionCommentMode(nextMode);
                if (nextMode === 'point') {
                  setResultCompareMode('result');
                  setAnchoredProductionDraft(null);
                }
              }}>Add Point</button>
              <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xs font-black text-slate-200" onClick={() => { setProductionCommentMode('global'); createProductionDraftComment('global'); }}>Global Comment</button>
            </div>
            {productionCommentMode === 'point' && !anchoredProductionDraft && <div className="mt-3 rounded-2xl border border-[#ff8800]/25 bg-[#ff8800]/10 p-3 text-xs font-semibold leading-5 text-orange-50">Click directly on the generated result image. A numbered marker and composer will open at that point.</div>}
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Reference image for selected comment</div>
              <label className="mt-2 inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-black text-slate-200">Attach Reference<input className="hidden" type="file" accept="image/*" onChange={(e) => attachProductionReference(e.target.files?.[0])} /></label>
              {productionReferenceDraft && <div className="mt-2 flex items-center gap-2 text-xs text-slate-300"><img src={productionReferenceDraft.dataUrl} alt={productionReferenceDraft.name} className="h-10 w-10 rounded-lg object-cover" />{productionReferenceDraft.name}</div>}
              <div className="mt-2 flex flex-wrap gap-1.5">{productionCommentScopeOptions.map((scope) => <button key={scope.value} type="button" className={`rounded-full px-2 py-1 text-[10px] font-black ${productionReferenceScopes.includes(scope.value) ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400'}`} onClick={() => toggleProductionReferenceScope(scope.value)}>{scope.label}</button>)}</div>
            </div>
            <div className="mt-3 max-h-56 space-y-2 overflow-auto">
              {savedProductionComments.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-slate-500">No review comments yet.</div> : savedProductionComments.map((comment) => <div key={comment.id} className={`rounded-xl border p-3 ${selectedProductionCommentId === comment.id ? 'border-[#ff8800] bg-[#ff8800]/10' : 'border-white/10 bg-white/[0.04]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <button className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-white" onClick={() => setSelectedProductionCommentId(comment.id)}>#{comment.number} {comment.type}</button>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${comment.status === 'resolved' ? 'bg-emerald-400/15 text-emerald-300' : comment.status === 'processed' ? 'bg-blue-400/15 text-blue-300' : 'bg-amber-400/15 text-amber-300'}`}>{comment.status === 'open' ? 'active' : comment.status}</span>
                </div>
                <textarea className="mt-2 h-16 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-2 text-xs leading-5 text-white outline-none focus:border-[#ff8800]" value={comment.text} onChange={(e) => updateProductionComment(comment.id, { text: e.target.value })} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(comment.references || (comment.referenceImage ? [{ id: `${comment.id}-legacy-ref`, name: comment.referenceName || `comment ${comment.number} reference`, dataUrl: comment.referenceImage, scopes: comment.referenceScopes || [] }] : [])).map((ref) => <img key={ref.id} src={ref.dataUrl} alt={`${ref.name} reference for comment ${comment.number}`} className="h-16 w-20 rounded-xl object-cover" />)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-black text-slate-200" onClick={() => updateProductionComment(comment.id, { status: comment.status === 'resolved' ? 'open' : 'resolved' })}>{comment.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
                  <button className="rounded-lg border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-200" onClick={() => deleteProductionComment(comment.id)}>Delete</button>
                </div>
              </div>)}
            </div>
            <button data-testid="process-production-comments" className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#ff8800] text-xs font-black text-white shadow-[0_10px_24px_rgba(255,136,0,0.22)]" onClick={() => processProductionCommentsWithCopilot(undefined, productionComments)}>Process Comments with Copilot</button>
            {activeAgentPlan ? <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
              <div className="flex items-center justify-between gap-2">
                <div className="font-black">Agent revision plan</div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${activeAgentPlanApplied ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>{activeAgentPlan.status}</span>
              </div>
              {[
                ['What Agent observed', activeAgentPlan.observations],
                ['What restored from Base', activeAgentPlan.restoreFromBase],
                ['What remains from Result', activeAgentPlan.keepFromResult],
                ['Applied project rules', activeAgentPlan.applicableProjectRules],
                ['Suppressed project rules', activeAgentPlan.suppressedProjectRules],
              ].map(([label, items]) => <div key={String(label)} className="mt-3">
                <div className="font-black text-emerald-50">{String(label)}</div>
                <ul className="mt-1 list-disc space-y-1 pl-4">{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>)}
              <div className="mt-3">
                <div className="font-black text-emerald-50">Comment evidence</div>
                <ul className="mt-1 list-disc space-y-1 pl-4">{activeAgentPlan.commentEvidence.map((item) => <li key={item.commentId}>#{item.commentNumber}{item.location ? ` x=${item.location.x.toFixed(2)}, y=${item.location.y.toFixed(2)}` : ' global'}: {item.summary}</li>)}</ul>
              </div>
              <div className="mt-3 font-black text-emerald-50">Final revision prompt preview</div>
              <pre data-testid="agent-revision-prompt-preview" className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-[11px] leading-5 text-emerald-50">{activeAgentPlan.finalRevisionPrompt}</pre>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2 text-[11px] font-black text-emerald-50" onClick={() => showToast('Edit plan opens in Advanced Prompt Inspector for this MVP.', 'warn')}>Edit plan</button>
                <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2 text-[11px] font-black text-emerald-50" onClick={() => processProductionCommentsWithCopilot(undefined, productionComments)}>Reprocess</button>
                <button data-testid="apply-production-agent-plan" className="inline-flex h-9 items-center justify-center rounded-xl bg-[#ff8800] px-2 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={activeAgentPlanApplied} onClick={applyProductionAgentRevisionPlan}>{activeAgentPlanApplied ? 'Plan applied' : 'Apply plan'}</button>
                <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2 text-[11px] font-black text-emerald-50" onClick={() => { setProModeEnabled(true); setRenderPassViewMode('advanced'); }}>Open advanced prompt</button>
              </div>
              <button className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-600" disabled={isQuickGenerating || !activeAgentPlanApplied} onClick={() => createProductionPreview(activeResultRound)}>{isQuickGenerating ? 'Generating...' : 'Generate Revision'}</button>
            </div> : null}
          </div>}
        </aside>
      </div>
    </div>;
  };
  const assetCounts = {
    baseRenders: scene.baseImage ? 1 : 0,
    referenceImages: scene.slots.reduce((sum, slot) => sum + (slot.referenceImages?.length || 0), 0) + renderPassState.references.length + renderPassState.aiComposer.references.length,
    people: scene.people.level === 'none' ? 0 : 1,
    materials: scene.slots.filter((slot) => slot.category === 'materials').length,
    brandAssets: renderPassState.protectedAssets.length,
    posters: scene.slots.filter((slot) => /poster|menu|graphic/i.test(slot.name || slot.code)).length,
    signage: renderPassState.protectedAssets.filter((asset) => /logo|sign|menu|brand/i.test(asset.name)).length,
    props: scene.slots.filter((slot) => slot.category === 'props').length,
    lightingReferences: scene.slots.filter((slot) => slot.category === 'lighting').reduce((sum, slot) => sum + (slot.referenceImages?.length || 0), 0),
  };
  const productPage = () => {
    const cardBase = 'rounded-[32px] bg-white/[0.075] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] ring-1 ring-white/10 backdrop-blur transition hover:bg-white/[0.095]';
    const pageBg = 'bg-[radial-gradient(circle_at_top_left,rgba(255,136,0,0.16),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,#080b14,#111827_56%,#020617)]';
    const primaryProductButton = 'inline-flex h-12 items-center justify-center rounded-2xl bg-[#ff8800] px-6 text-sm font-black text-white shadow-[0_18px_42px_rgba(255,136,0,0.34)] transition hover:-translate-y-0.5 hover:bg-[#e67800]';
    if (productSection === 'dashboard') {
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[36px] bg-white/[0.075] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffb15c]">Visual Local</p>
              <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.95] tracking-tight">ArchViz AI workflow, locally controlled.</h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-300">Analyze the project first, lock what matters, generate controlled previews, review against the base render, then export a clean handoff pack.</p>
            </div>
            <button className={primaryProductButton} onClick={() => openStudio('basic')}><WandSparkles className="mr-2 h-5 w-5" />Continue Working</button>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {[
              ['Upload', 'Base render and references stay local.', ImagePlus, () => baseImageInputRef.current?.click()],
              ['Analyze', 'Build scene intelligence before generation.', Eye, () => openStudio('work')],
              ['Generate', 'Create controlled previews from locked rules.', Sparkles, () => openStudio('basic')],
              ['Review', 'Compare against the base render before export.', ClipboardCheck, () => openStudio('qc-studio')],
            ].map(([label, desc, Icon, action]) => {
              const TypedIcon = Icon as typeof ImagePlus;
              return <button key={String(label)} className="flex min-w-56 flex-1 items-center gap-3 rounded-3xl bg-black/18 p-4 text-left ring-1 ring-white/8 transition hover:bg-black/24" onClick={action as () => void}>
                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white/10 text-[#ffb15c]"><TypedIcon className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block text-sm font-black">{String(label)}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{String(desc)}</span></span>
              </button>;
            })}
          </div>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-4">
            <div className={cardBase}><p className="text-xs font-black uppercase tracking-wide text-slate-400">Credits Remaining</p><div className="mt-3 text-3xl font-black">THB {Math.max(0, remainingCredit - projectUsageCost).toFixed(0)}</div><p className="mt-1 text-sm text-slate-400">{estimatedPreviewsRemaining} estimated previews</p></div>
            <div className={cardBase}><p className="text-xs font-black uppercase tracking-wide text-slate-400">Today's Usage</p><div className="mt-3 text-3xl font-black">THB {todayUsageCost.toFixed(2)}</div><p className="mt-1 text-sm text-slate-400">{todayUsageRecords.length} attempts</p></div>
            <div className={cardBase}><p className="text-xs font-black uppercase tracking-wide text-slate-400">Recent Outputs</p><div className="mt-3 text-3xl font-black">{renderPassState.resultRounds.length}</div><p className="mt-1 text-sm text-slate-400">{renderPassState.resultRounds.filter((round) => round.status === 'approved').length} approved</p></div>
            <div className={cardBase}><p className="text-xs font-black uppercase tracking-wide text-slate-400">Scene Status</p><div className="mt-3 text-3xl font-black">{renderPassState.visionTimestamp ? 'Ready' : 'Local'}</div><p className="mt-1 text-sm text-slate-400">{scene.baseImage ? 'Base render loaded' : 'Upload a base render'}</p></div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className={`${cardBase} col-span-2`}>
              <div className="flex items-center justify-between"><h2 className="text-xl font-black">Recent Projects</h2><button className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white" onClick={() => { const next = createInitialProject(); updateProject(next); openStudio('basic'); }}>Create New Project</button></div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[project, ...projectsIndex.filter((item) => item.id !== project.id)].slice(0, 4).map((item) => <button key={item.id} className="rounded-2xl bg-white/8 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/12" onClick={() => { setProject(normalizeProjectRuntime(item)); openStudio('basic'); }}>
                  <div className="text-sm font-black">{item.name}</div>
                  <div className="mt-2 text-xs text-slate-400">{item.scenes?.length || 0} scene(s) · {new Date(item.updatedAt).toLocaleString()}</div>
                </button>)}
              </div>
            </div>
            <div className={cardBase}>
              <h2 className="text-xl font-black">Recent Outputs</h2>
              <div className="mt-4 space-y-3">
                {renderPassState.resultRounds.slice().reverse().slice(0, 3).map((round) => <button key={round.id} className="flex w-full items-center gap-3 rounded-2xl bg-white/8 p-2 text-left ring-1 ring-white/10" onClick={() => { sendRoundToQcStudio(round.id); setProductSection('studio'); }}>
                  <img src={round.imageDataUrl} alt={round.name} className="h-14 w-16 rounded-xl object-cover" />
                  <span className="min-w-0"><span className="block truncate text-sm font-black">{round.name}</span><span className="text-xs text-slate-400">{round.status.replace(/_/g, ' ')}</span></span>
                </button>)}
                {!renderPassState.resultRounds.length && <p className="rounded-2xl bg-white/8 p-4 text-sm text-slate-400">No outputs yet. Generate your first preview in Studio.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>;
    }
    if (productSection === 'projects') {
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between"><div><p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffb15c]">Projects</p><h1 className="mt-3 text-5xl font-black tracking-tight">Project Library</h1><p className="mt-3 text-slate-400">Open a local workspace or start a new render study.</p></div><button className={primaryProductButton} onClick={() => { const next = createInitialProject(); updateProject(next); openStudio('basic'); }}>Create New Project</button></div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[project, ...projectsIndex.filter((item) => item.id !== project.id)].map((item) => <button key={item.id} className="rounded-[32px] bg-white/[0.075] p-5 text-left ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/[0.1] hover:shadow-[0_22px_70px_rgba(0,0,0,0.22)]" onClick={() => { setProject(normalizeProjectRuntime(item)); openStudio('basic'); }}>
              <div className="flex h-36 items-end rounded-[24px] bg-[radial-gradient(circle_at_30%_20%,rgba(255,136,0,0.24),transparent_34%),linear-gradient(135deg,#1e293b,#020617)] p-4 text-4xl font-black text-white">{item.name.slice(0, 2).toUpperCase()}</div>
              <div className="mt-4 text-lg font-black">{item.name}</div>
              <div className="mt-1 text-sm text-slate-400">{item.scenes?.length || 0} scenes · updated {new Date(item.updatedAt).toLocaleDateString()}</div>
            </button>)}
          </div>
        </div>
      </div>;
    }
    if (productSection === 'assets') {
      const assets = [
        ['Base Renders', assetCounts.baseRenders, ImagePlus],
        ['Reference Images', assetCounts.referenceImages, Images],
        ['People', assetCounts.people, Users],
        ['Materials', assetCounts.materials, Palette],
        ['Brand Assets', assetCounts.brandAssets, ShieldCheck],
        ['Posters', assetCounts.posters, FileJson],
        ['Signage', assetCounts.signage, Bot],
        ['Props', assetCounts.props, Package],
        ['Lighting References', assetCounts.lightingReferences, Lightbulb],
      ] as const;
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffb15c]">Assets</p>
          <h1 className="mt-2 text-4xl font-black">Asset Library</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Drag, paste, or upload visual references inside Studio. This library summarizes what the project already knows.</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {assets.map(([label, count, Icon]) => <button key={label} className="rounded-[32px] bg-white/[0.075] p-5 text-left ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/[0.1]" onClick={() => label === 'Base Renders' ? baseImageInputRef.current?.click() : openStudio(label === 'Materials' ? 'basic' : 'advanced')}>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff8800] text-white"><Icon className="h-5 w-5" /></span>
              <div className="mt-5 text-xl font-black">{label}</div>
              <div className="mt-1 text-sm text-slate-400">{count} item(s)</div>
            </button>)}
          </div>
        </div>
      </div>;
    }
    if (productSection === 'gallery') {
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between"><div><p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffb15c]">Gallery</p><h1 className="mt-3 text-5xl font-black tracking-tight">Output Review</h1><p className="mt-3 text-slate-400">A Lightroom-style version wall for generated previews and imported results.</p></div><button className={primaryProductButton} onClick={() => openStudio('basic')}>Generate Again</button></div>
          <div className="mt-8 grid grid-cols-3 gap-5 2xl:grid-cols-4">
            {renderPassState.resultRounds.map((round) => <div key={round.id} className="rounded-[32px] bg-white/[0.075] p-3 ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/[0.1]">
              <img src={round.imageDataUrl} alt={round.name} className="h-56 w-full rounded-[24px] object-cover" />
              <div className="mt-3 text-sm font-black">{round.name}</div>
              <div className="mt-1 text-xs text-slate-400">{round.sourceAdapter || 'local'} · {round.status.replace(/_/g, ' ')}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-300" onClick={() => setQuickPreviewStatus(round.id, 'approved')}>Approve</button>
                <button className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-black text-amber-300" onClick={() => setQuickPreviewStatus(round.id, 'needs_revision')}>Revision</button>
                <button className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black" onClick={() => { sendRoundToQcStudio(round.id); setProductSection('studio'); }}>Open</button>
                <button className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black" onClick={exportRenderHandoffPack}>Export</button>
              </div>
            </div>)}
            {!renderPassState.resultRounds.length && <div className="col-span-4 rounded-[28px] bg-white/8 p-10 text-center ring-1 ring-white/10"><p className="text-xl font-black">No versions yet</p><p className="mt-2 text-slate-400">Generate a preview in Studio and it will appear here.</p></div>}
          </div>
        </div>
      </div>;
    }
    if (productSection === 'export') {
      const exports = [
        ['Client Review Pack', 'Visual boards and structured review files for stakeholders.', exportJarvisReviewPack],
        ['Construction Pack', 'Strict preservation pack with render pass inputs.', exportJarvisReviewPack],
        ['AI Handoff', 'Compact pack for image-generation chats.', exportRenderHandoffPack],
        ['Presentation', 'Board-focused handoff for client decks.', exportZip],
        ['Social', 'Prompt and board package for crop/output review.', exportRenderHandoffPack],
        ['Archive', 'Full Visual Brief ZIP with local project data.', exportZip],
      ] as const;
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-6xl"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffb15c]">Export</p><h1 className="mt-3 text-5xl font-black tracking-tight">Export Packs</h1><p className="mt-3 max-w-2xl text-slate-400">Choose a clean pack for the next person in the workflow. Nothing includes API keys.</p><div className="mt-8 grid grid-cols-3 gap-5">{exports.map(([label, desc, action]) => <button key={label} className="rounded-[32px] bg-white/[0.075] p-6 text-left ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/[0.1]" onClick={action}><Download className="h-9 w-9 text-[#ff8800]" /><div className="mt-6 text-2xl font-black">{label}</div><p className="mt-3 text-sm leading-6 text-slate-400">{desc}</p></button>)}</div></div>
      </div>;
    }
    if (productSection === 'settings') {
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-6xl"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffb15c]">Settings</p><h1 className="mt-3 text-5xl font-black tracking-tight">Workspace Settings</h1><p className="mt-3 text-slate-400">Keep beginner mode calm, reveal professional controls only when needed.</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"><div className="flex items-center justify-between"><div><div className="text-lg font-black">Professional Mode</div><p className="mt-1 text-sm text-slate-400">Show Advanced AI, prompt, telemetry, rule engine, and developer panels.</p></div><button className={`rounded-full px-4 py-2 text-sm font-black ${proModeEnabled ? 'bg-[#ff8800]' : 'bg-white/10'}`} onClick={() => setProModeEnabled(!proModeEnabled)}>{proModeEnabled ? 'On' : 'Off'}</button></div></div>
            <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"><div className="flex items-center justify-between"><div><div className="text-lg font-black">Developer Mode</div><p className="mt-1 text-sm text-slate-400">Hidden raw diagnostics, cache, compiler, and API debug panels.</p></div><button className={`rounded-full px-4 py-2 text-sm font-black ${developerModeEnabled ? 'bg-[#ff8800]' : 'bg-white/10'}`} onClick={() => setDeveloperModeEnabled(!developerModeEnabled)}>{developerModeEnabled ? 'On' : 'Off'}</button></div></div>
            <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"><div className="text-lg font-black">Local Storage</div><p className="mt-1 text-sm text-slate-400">API keys remain in browser localStorage and are never exported. Telemetry is local-only.</p></div>
            <ProjectMaterialRulesSettings
              sourceOfTruth={projectSourceOfTruth}
              activeRuleCount={activeMaterialRules.length}
              warnings={projectSourceWarnings}
              categoryOptions={materialRuleCategoryOptions}
              protectionOptions={materialRuleProtectionOptions}
              scopeOptions={materialReferenceScopeOptions}
              onAddRule={addProjectMaterialRule}
              onRestoreDefaults={restoreKarunProjectDefaults}
              onUpdateRule={updateMaterialRule}
              onUpdateListField={updateRuleListField}
              onDuplicateRule={duplicateProjectMaterialRule}
              onDeleteRule={deleteProjectMaterialRule}
              onAddReferences={(ruleId, files) => addProjectRuleReferences(ruleId, files)}
              onUpdateReference={updateProjectRuleReference}
              onRemoveReference={removeProjectRuleReference}
            />
          </div>
        </div>
      </div>;
      const groupedProjectRules = projectSourceOfTruth.materialRules.reduce<Record<string, ProjectMaterialRule[]>>((acc, rule) => {
        const label = materialRuleCategoryOptions.find((option) => option.value === rule.category)?.label || rule.category;
        acc[label] = [...(acc[label] || []), rule];
        return acc;
      }, {});
      return <div className={`h-full overflow-auto ${pageBg} p-8 text-white`}>
        <div className="mx-auto max-w-6xl"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffb15c]">Settings</p><h1 className="mt-3 text-5xl font-black tracking-tight">Workspace Settings</h1><p className="mt-3 text-slate-400">Keep beginner mode calm, reveal professional controls only when needed.</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"><div className="flex items-center justify-between"><div><div className="text-lg font-black">Professional Mode</div><p className="mt-1 text-sm text-slate-400">Show Advanced AI, prompt, telemetry, rule engine, and developer panels.</p></div><button className={`rounded-full px-4 py-2 text-sm font-black ${proModeEnabled ? 'bg-[#ff8800]' : 'bg-white/10'}`} onClick={() => setProModeEnabled(!proModeEnabled)}>{proModeEnabled ? 'On' : 'Off'}</button></div></div>
            <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"><div className="flex items-center justify-between"><div><div className="text-lg font-black">Developer Mode</div><p className="mt-1 text-sm text-slate-400">Hidden raw diagnostics, cache, compiler, and API debug panels.</p></div><button className={`rounded-full px-4 py-2 text-sm font-black ${developerModeEnabled ? 'bg-[#ff8800]' : 'bg-white/10'}`} onClick={() => setDeveloperModeEnabled(!developerModeEnabled)}>{developerModeEnabled ? 'On' : 'Off'}</button></div></div>
            <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"><div className="text-lg font-black">Local Storage</div><p className="mt-1 text-sm text-slate-400">API keys remain in browser localStorage and are never exported. Telemetry is local-only.</p></div>
            <div className="rounded-[32px] bg-white/8 p-6 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb15c]">Project → {projectSourceOfTruth.profileName} → Rules</p>
                  <h2 className="mt-2 text-2xl font-black">Material Rules Source of Truth</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">These editable project rules are injected before generic mood, luxury, editorial, and color-cast instructions. Karun red/maroon upholstery and floor accents are protected brand materials, not unwanted color cast.</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-[#ff8800]/15 px-3 py-1 text-[#ffb15c]">{activeMaterialRules.length} active rules</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">{applicableProjectRuleReferences(projectSourceOfTruth).length} scoped references</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">{projectSourceWarnings.length} warnings</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex h-10 items-center rounded-2xl bg-[#ff8800] px-4 text-xs font-black text-white" onClick={addProjectMaterialRule}>Add Rule</button>
                  <button className="inline-flex h-10 items-center rounded-2xl border border-white/10 bg-white/10 px-4 text-xs font-black text-slate-200" onClick={restoreKarunProjectDefaults}>Restore Karun Defaults</button>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-[#ff8800]/25 bg-[#ff8800]/10 p-4 text-sm leading-6 text-slate-200">
                <div className="font-black text-[#ffb15c]">Prompt priority policy</div>
                <div className="mt-1 text-xs text-slate-300">{projectSourceOfTruth.promptPriorityPolicy.join(' → ')}</div>
                <div className="mt-2 text-xs text-slate-300">Scoped correction: {scopedColorCastCorrectionLine(projectSourceOfTruth)}</div>
              </div>
              <div className="mt-5 space-y-5">
                {Object.entries(groupedProjectRules).map(([categoryLabel, rules]) => <div key={categoryLabel}>
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{categoryLabel}</div>
                  <div className="grid gap-4">
                    {rules.map((rule) => <details key={rule.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4 open:bg-black/28">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`h-7 rounded-full px-3 py-1.5 text-[11px] font-black ${rule.enabled ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400'}`}>{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base font-black text-white">{rule.name}</div>
                            <div className="mt-1 text-xs text-slate-400">{rule.protectionLevel} · priority {rule.priority} · {rule.referenceImages.length} refs</div>
                          </div>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-slate-300">{rule.category}</span>
                        </div>
                      </summary>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">Rule actions</div>
                        <button type="button" className={`h-8 rounded-full px-3 text-[11px] font-black ${rule.enabled ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-300'}`} onClick={() => updateMaterialRule(rule.id, { enabled: !rule.enabled })}>{rule.enabled ? 'Disable rule' : 'Enable rule'}</button>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <label className="text-xs font-black text-slate-400">Rule name<input className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.name} onChange={(e) => updateMaterialRule(rule.id, { name: e.target.value })} /></label>
                        <label className="text-xs font-black text-slate-400">Category<select className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.category} onChange={(e) => updateMaterialRule(rule.id, { category: e.target.value as MaterialRuleCategory })}>{materialRuleCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                        <label className="text-xs font-black text-slate-400">Protection<select className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.protectionLevel} onChange={(e) => updateMaterialRule(rule.id, { protectionLevel: e.target.value as MaterialRuleProtectionLevel })}>{materialRuleProtectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                        <label className="text-xs font-black text-slate-400">Priority<input type="number" className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.priority} onChange={(e) => updateMaterialRule(rule.id, { priority: Number(e.target.value) || 100 })} /></label>
                        <label className="col-span-2 text-xs font-black text-slate-400">Description<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.description} onChange={(e) => updateMaterialRule(rule.id, { description: e.target.value })} /></label>
                        <label className="text-xs font-black text-slate-400">Approved characteristics<textarea className="mt-1 h-28 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.approvedCharacteristics.join('\n')} onChange={(e) => updateRuleListField(rule.id, 'approvedCharacteristics', e.target.value)} /></label>
                        <label className="text-xs font-black text-slate-400">Forbidden substitutions<textarea className="mt-1 h-28 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.forbiddenCharacteristics.join('\n')} onChange={(e) => updateRuleListField(rule.id, 'forbiddenCharacteristics', e.target.value)} /></label>
                        <label className="text-xs font-black text-slate-400">Color guidance<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.colorGuidance} onChange={(e) => updateMaterialRule(rule.id, { colorGuidance: e.target.value })} /></label>
                        <label className="text-xs font-black text-slate-400">Finish guidance<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.finishGuidance} onChange={(e) => updateMaterialRule(rule.id, { finishGuidance: e.target.value })} /></label>
                        <label className="col-span-2 text-xs font-black text-slate-400">Prompt injection<textarea className="mt-1 h-24 w-full rounded-xl border border-[#ff8800]/30 bg-[#ff8800]/10 p-3 font-mono text-xs leading-5 text-white" value={rule.promptInjection} onChange={(e) => updateMaterialRule(rule.id, { promptInjection: e.target.value })} /></label>
                        <label className="col-span-2 text-xs font-black text-slate-400">QC validation guidance<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.qcValidationGuidance} onChange={(e) => updateMaterialRule(rule.id, { qcValidationGuidance: e.target.value })} /></label>
                        <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div><div className="text-sm font-black text-white">Reference images</div><p className="mt-1 text-xs text-slate-400">References are scoped material truth, not composition or architecture instructions.</p></div>
                            <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-white/10 px-3 text-xs font-black text-slate-200">Upload refs<input className="hidden" type="file" accept="image/*" multiple onChange={(e) => addProjectRuleReferences(rule.id, e.target.files)} /></label>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {rule.referenceImages.map((ref) => <div key={ref.id} className="rounded-xl border border-white/10 bg-black/20 p-2">
                              <div className="flex gap-2"><img src={ref.dataUrl} alt={ref.name} className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><input className="h-8 w-full rounded-lg border border-white/10 bg-white/10 px-2 text-xs text-white" value={ref.name} onChange={(e) => updateProjectRuleReference(rule.id, ref.id, { name: e.target.value })} /><textarea className="mt-1 h-12 w-full rounded-lg border border-white/10 bg-white/10 p-2 text-xs text-white" value={ref.notes || ''} placeholder="Reference notes" onChange={(e) => updateProjectRuleReference(rule.id, ref.id, { notes: e.target.value })} /></div></div>
                              <div className="mt-2 flex flex-wrap gap-1">{materialReferenceScopeOptions.map((scope) => <button key={scope.value} type="button" className={`rounded-full px-2 py-1 text-[10px] font-black ${ref.scopes.includes(scope.value) ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400'}`} onClick={() => updateProjectRuleReference(rule.id, ref.id, { scopes: ref.scopes.includes(scope.value) ? ref.scopes.filter((item) => item !== scope.value) : [...ref.scopes, scope.value] })}>{scope.label}</button>)}</div>
                              <button className="mt-2 text-[11px] font-black text-red-300" onClick={() => removeProjectRuleReference(rule.id, ref.id)}>Remove reference</button>
                            </div>)}
                            {!rule.referenceImages.length && <div className="rounded-xl border border-dashed border-white/15 p-4 text-xs text-slate-500">No source-of-truth references yet.</div>}
                          </div>
                        </div>
                        <div className="col-span-2 rounded-2xl bg-slate-950/60 p-3">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Compiled prompt preview</div>
                          <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{[
                            rule.promptInjection,
                            rule.colorGuidance ? `Color rule: ${rule.colorGuidance}` : '',
                            rule.finishGuidance ? `Finish rule: ${rule.finishGuidance}` : '',
                            rule.forbiddenCharacteristics.length ? `Forbidden: ${rule.forbiddenCharacteristics.join(', ')}` : '',
                          ].filter(Boolean).join('\n')}</pre>
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-2">
                          <button className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-slate-200" onClick={() => duplicateProjectMaterialRule(rule)}>Duplicate</button>
                          {!rule.isDefault && <button className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200" onClick={() => deleteProjectMaterialRule(rule)}>Delete custom rule</button>}
                        </div>
                      </div>
                    </details>)}
                  </div>
                </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>;
    }
    return null;
  };

  return <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#05070d] text-slate-100">
    <header className="h-[72px] flex-none border-b border-white/10 bg-[#070a12]/95 px-4 text-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="flex h-full items-center gap-2 overflow-x-auto">
        <div className="mr-2 flex flex-none items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_12px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
            <img src={beBlankBehindStudioLogo} alt="Be Blank to Behind Studio logo" className="h-8 w-8 object-contain" />
          </div>
          <div className="hidden min-w-[168px] leading-tight 2xl:block">
            <div className="text-[12px] font-black tracking-[0.01em] text-slate-100">Be Blank to Behind Studio</div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Render Production Studio</div>
          </div>
        </div>
        <div className="flex h-11 flex-none items-center gap-1 rounded-2xl bg-white/[0.06] p-1 ring-1 ring-white/10">
          {productSections.map((section) => {
            const Icon = section.icon;
            const active = productSection === section.id;
            return <button key={section.id} className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => { setProductSection(section.id); if (section.id === 'studio') { setActiveTab('render-pass'); setProModeEnabled(false); } }}>
              <Icon className="h-3.5 w-3.5" />
              {section.label}
            </button>;
          })}
        </div>
        <input className="h-10 w-48 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" value={project.name} onChange={(e) => updateProject({ ...project, name: e.target.value })} />
        <input className="h-10 w-40 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" value={scene.name} onChange={(e) => updateScene({ name: e.target.value })} />
        <div className="flex h-9 flex-none items-center rounded-xl border border-white/10 bg-white/5 p-1">
          <button className={`h-7 rounded-lg px-3 text-xs font-black transition ${productSection === 'studio' && activeTab === 'render-pass' && proModeEnabled ? 'bg-[#ff8800] text-white shadow-sm' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => { setProductSection('studio'); setActiveTab('render-pass'); setProModeEnabled(true); }}>Render Pass Builder</button>
          <button className={`h-7 rounded-lg px-3 text-xs font-black transition ${productSection === 'studio' && activeTab !== 'render-pass' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => { setProductSection('studio'); setActiveTab('materials'); setProModeEnabled(true); }}>Advanced Mapper</button>
        </div>
        <button type="button" className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-2xl bg-[#ff8800] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,136,0,0.32)] ring-1 ring-[#ff8800]/30 transition hover:-translate-y-0.5 hover:bg-[#e67800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8800]/40" onClick={() => baseImageInputRef.current?.click()}><ImagePlus className="mr-1.5 h-4 w-4" />{scene.baseImage ? 'Replace Base Image' : 'Upload Base Image'}</button>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10" onClick={() => openStudio('work')}><Eye className="mr-1 h-4 w-4" />Analyze</button>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10" onClick={createQuickPreview}><Sparkles className="mr-1 h-4 w-4" />Generate</button>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10" onClick={onSaveDraft}><Save className="mr-1 h-4 w-4" />Save</button>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10" onClick={exportZip}><Download className="mr-1 h-4 w-4" />Archive ZIP</button>
        <button
          data-testid="export-render-handoff"
          disabled={!scene.baseImage}
          className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition ${scene.baseImage ? 'border-[#ff8800]/40 bg-[#ff8800]/10 text-[#ffb15c] hover:bg-[#ff8800]/20' : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'}`}
          onClick={exportRenderHandoffPack}
        >
          <Download className="mr-1 h-4 w-4" />AI Handoff
        </button>
        <label className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"><Upload className="mr-1 h-4 w-4" />Import<input className="hidden" type="file" accept=".zip" onChange={(e) => importZip(e.target.files?.[0])} /></label>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10" onClick={onGeneratePrompt}><WandSparkles className="mr-1 h-4 w-4" />Prompt</button>
        <span className={`ml-auto rounded-full border px-2.5 py-1 text-xs font-medium ${saveStatus === 'saved' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>{saveStatus === 'saved' ? `Saved ${lastSavedAt ? `(${lastSavedAt})` : ''}` : 'Unsaved'}</span>
        <input ref={baseImageInputRef} id="toolbar-base-upload" data-testid="base-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => onBaseUpload(e.target.files?.[0])} />
      </div>
    </header>
    {productSection !== 'studio' ? productPage() : showConversationalStudio ? renderProductionFlow() : false ? <main className="grid flex-1 min-h-0 overflow-hidden bg-[#070a12] text-slate-100" style={{ gridTemplateColumns: '260px minmax(0,1fr) 360px' }}>
      <aside className="h-full min-h-0 overflow-y-auto border-r border-white/10 bg-[#0d111c] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffb15c]">Conversation</p>
            <h2 className="mt-1 text-lg font-black text-white">Versions</h2>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-slate-300">{(renderPassState.conversationTimeline || []).length + 1}</span>
        </div>
        <div className="space-y-2">
          <button className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${!activeResultRound ? 'border-[#ff8800] bg-[#ff8800]/12' : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.09]'}`} onClick={backToMappingView}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xs font-black">OG</span>
            <span className="min-w-0"><span className="block text-sm font-black">Original</span><span className="mt-1 block text-xs text-slate-400">Base render source</span></span>
          </button>
          {(renderPassState.conversationTimeline || []).map((entry) => {
            const round = entry.resultRoundId ? renderPassState.resultRounds.find((item) => item.id === entry.resultRoundId) : null;
            const label = entry.type === 'user' ? 'You' : entry.type === 'ai' ? 'AI' : entry.type === 'result' ? round?.name || 'Version' : 'Original';
            const badge = entry.type === 'user' ? 'YOU' : entry.type === 'ai' ? 'AI' : entry.type === 'result' ? 'V' : 'OG';
            return <button key={entry.id} className={`flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition ${entry.resultRoundId && renderPassState.activeResultRoundId === entry.resultRoundId ? 'border-[#ff8800] bg-[#ff8800]/12 shadow-[0_12px_30px_rgba(255,136,0,0.12)]' : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.09]'}`} onClick={() => entry.resultRoundId ? sendRoundToQcStudio(entry.resultRoundId) : undefined}>
              {round ? <img src={round.imageDataUrl} alt={round.name} className="h-12 w-14 rounded-xl object-cover" /> : <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xs font-black ${entry.type === 'ai' ? 'bg-[#ff8800] text-white' : entry.type === 'user' ? 'bg-blue-500/20 text-blue-200' : 'bg-white/10 text-slate-200'}`}>{badge}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{label}</span><span className="mt-1 line-clamp-2 text-xs leading-4 text-slate-400">{entry.text}</span></span>
            </button>;
          })}
        </div>
        <button className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-xs font-black text-slate-200 transition hover:bg-white/10" onClick={() => setProModeEnabled(true)}><Wrench className="mr-2 h-4 w-4" />Professional Mode</button>
      </aside>
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-5">
        <div className="relative flex-1 min-h-0 overflow-hidden rounded-[36px] border border-white/10 bg-[#111827] shadow-[0_28px_100px_rgba(0,0,0,0.36)]">
          {qcCompareActive ? <div data-testid="qc-compare-main" className="flex h-full min-h-0 flex-col bg-slate-950 p-4">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-slate-900">
              {(resultCompareMode === 'slider' || resultCompareMode === 'overlay' || resultCompareMode === 'base' || resultCompareMode === 'difference') && <img src={scene.baseImage} alt="base render" className="absolute inset-0 h-full w-full object-contain" />}
              {resultCompareMode === 'slider' && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${resultCompareSplit}%)` }}><img src={activeResultRound?.imageDataUrl} alt="result" className="h-full w-full object-contain" /></div>}
              {resultCompareMode === 'overlay' && <img src={activeResultRound?.imageDataUrl} alt="result overlay" className="absolute inset-0 h-full w-full object-contain" style={{ opacity: resultOverlayOpacity / 100 }} />}
              {resultCompareMode === 'side-by-side' && <div className="grid h-full grid-cols-2"><div className="relative border-r border-white/10"><img src={scene.baseImage} alt="base" className="absolute inset-0 h-full w-full object-contain" /></div><div className="relative"><img src={activeResultRound?.imageDataUrl} alt="result" className="absolute inset-0 h-full w-full object-contain" /></div></div>}
              {resultCompareMode === 'result' && <img src={activeResultRound?.imageDataUrl} alt="result" className="absolute inset-0 h-full w-full object-contain" />}
              {resultCompareMode === 'slider' && <div className="absolute inset-y-0 bg-[#ff8800]" style={{ left: `${resultCompareSplit}%`, width: 3 }} />}
              {resultCompareMode === 'difference' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-black text-slate-300">Difference view placeholder</div>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="h-10 rounded-2xl border border-white/10 bg-white/10 px-3 text-sm font-bold text-white" value={resultCompareMode} onChange={(e) => setResultCompareMode(e.target.value as any)}>
                <option value="slider">Before / After</option><option value="overlay">Opacity</option><option value="side-by-side">Side by Side</option><option value="difference">Difference</option><option value="result">Result Only</option><option value="base">Base Only</option>
              </select>
              {resultCompareMode === 'slider' && <input className="w-40" type="range" min={0} max={100} value={resultCompareSplit} onChange={(e) => setResultCompareSplit(Number(e.target.value))} />}
              {resultCompareMode === 'overlay' && <input className="w-40" type="range" min={0} max={100} value={resultOverlayOpacity} onChange={(e) => setResultOverlayOpacity(Number(e.target.value))} />}
              <button className="h-10 rounded-2xl bg-emerald-500/15 px-4 text-sm font-black text-emerald-300" onClick={() => activeResultRound && setQuickPreviewStatus(activeResultRound.id, 'approved')}>Approve</button>
              <button className="h-10 rounded-2xl bg-amber-500/15 px-4 text-sm font-black text-amber-300" onClick={() => activeResultRound && setQuickPreviewStatus(activeResultRound.id, 'needs_revision')}>Needs Revision</button>
              <button className="ml-auto h-10 rounded-2xl bg-white/10 px-4 text-sm font-black text-white" onClick={() => setConversationPrompt(activeResultRound?.notes || '')}>Continue Editing</button>
            </div>
          </div> : scene.baseImage ? <div className="flex h-full items-center justify-center p-8"><img src={scene.baseImage} alt="base render" className="max-h-full max-w-full rounded-[28px] object-contain shadow-[0_30px_100px_rgba(0,0,0,0.28)]" /></div> : <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-xl">
              <ImagePlus className="mx-auto h-12 w-12 text-[#ffb15c]" />
              <h2 className="mt-5 text-4xl font-black text-white">Start with a Base Render</h2>
              <p className="mt-4 text-base leading-7 text-slate-400">Upload a render, SketchUp view, massing image, or site photo. Visual Local will read it locally first.</p>
              <button className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#ff8800] px-6 text-sm font-black text-white shadow-[0_18px_42px_rgba(255,136,0,0.34)]" onClick={() => baseImageInputRef.current?.click()}>Upload Base Image</button>
              <p className="mt-4 text-sm text-slate-500">Drag and drop an image here, or paste from clipboard.</p>
            </div>
          </div>}
          {analysisProgress !== 'idle' && analysisProgress !== 'ready' && <div className="absolute left-5 top-5 rounded-2xl border border-[#ff8800]/30 bg-black/70 px-4 py-3 text-sm font-black text-white backdrop-blur">
            {analysisProgress === 'uploading' && 'Uploading...'}
            {analysisProgress === 'analyzing' && 'Analyzing...'}
            {analysisProgress === 'architecture' && 'Detecting architecture...'}
            {analysisProgress === 'materials' && 'Detecting materials...'}
          </div>}
        </div>
        <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.08] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
          {pendingConfirmation && <div className="mb-4 rounded-[24px] border border-[#ff8800]/30 bg-[#ff8800]/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black text-white">I understand. I will:</div>
                <div className="mt-3 grid gap-2">
                  {pendingConfirmation.summary.map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-200"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{item}</div>)}
                  {pendingConfirmation.protected.slice(0, 4).map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-300"><ShieldCheck className="h-4 w-4 text-[#ffb15c]" />Keep {item} locked.</div>)}
                </div>
                <div className="mt-3 rounded-2xl bg-black/18 p-3 text-xs font-bold text-slate-300">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">AI understood</div>
                  <div className="mt-1">Request: “{pendingConfirmation.request}”</div>
                  <div className="mt-1">Targets: {pendingConfirmation.goalIds.map((goalId) => quickGenerateGoalCards.find((goal) => goal.id === goalId)?.label || goalId).join(', ')}</div>
                  <div className="mt-1">Protected: {pendingConfirmation.protected.join(', ')}</div>
                </div>
              </div>
              <div className="w-44 flex-none">
                <div className="rounded-2xl bg-black/20 p-3 text-center ring-1 ring-white/10">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Estimated cost</div>
                  <div className="mt-1 text-xl font-black text-white">THB {pendingConfirmation.estimatedCostTHB.toFixed(2)}</div>
                </div>
                <button className="mt-3 h-10 w-full rounded-2xl bg-[#ff8800] text-xs font-black text-white" onClick={() => generateFromConversationConfirmation()}>Generate Now</button>
                <button className="mt-2 h-9 w-full rounded-2xl border border-white/10 bg-white/10 text-xs font-black text-slate-200" onClick={() => setPendingConfirmation(null)}>Edit Request</button>
              </div>
            </div>
          </div>}
          {generationProgress !== 'idle' && generationProgress !== 'review' && <div className="mb-4 rounded-[24px] border border-white/10 bg-black/18 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Generating</div>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-300">
              {[
                ['parsed', 'Request parsed'],
                ['rules', 'Rules applied'],
                ['compiled', 'Prompt compiled'],
                ['calling', 'Calling provider'],
                ['received', 'Result received'],
                ['review', 'Opening review mode'],
              ].map(([state, label]) => {
                const order = ['parsed', 'rules', 'compiled', 'calling', 'received', 'review'];
                const done = order.indexOf(generationProgress) >= order.indexOf(state);
                return <div key={state} className={`rounded-2xl px-3 py-2 ${done ? 'bg-emerald-400/12 text-emerald-200' : 'bg-white/8 text-slate-500'}`}>{done ? '✓ ' : ''}{label}</div>;
              })}
            </div>
          </div>}
          <div className="mb-3 flex flex-wrap gap-2">
            {dynamicConversationChips.map((prompt) => <button key={prompt} className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-black text-slate-200 transition hover:border-[#ff8800] hover:text-[#ffb15c]" onClick={() => appendConversationPrompt(prompt)}>{prompt}</button>)}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <textarea className="h-24 resize-none rounded-3xl border border-white/10 bg-black/22 p-4 text-base leading-6 text-white outline-none placeholder:text-slate-500 focus:border-[#ff8800]" placeholder="What would you like to change?" value={conversationPrompt} onChange={(e) => setConversationPrompt(e.target.value)} />
            <button data-testid="quick-generate-preview" className="h-24 rounded-3xl bg-[#ff8800] px-7 text-sm font-black text-white shadow-[0_18px_42px_rgba(255,136,0,0.34)] transition hover:bg-[#e67800] disabled:cursor-not-allowed disabled:bg-slate-600" disabled={!scene.baseImage || isQuickGenerating} onClick={requestConversationConfirmation}>{isQuickGenerating ? 'Generating...' : 'Generate'}</button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400"><input type="checkbox" checked={Boolean(renderPassState.autoGenerateAfterConfirmation)} onChange={(e) => updateRenderPassBuilder({ autoGenerateAfterConfirmation: e.target.checked })} />Auto-generate after confirmation</label>
          <p className="mt-2 text-xs text-slate-500">Visual Local automatically parses your request, protects locked architecture, compiles the prompt, and uses the selected generation adapter.</p>
        </div>
      </section>
      <aside className="h-full min-h-0 overflow-y-auto border-l border-white/10 bg-[#0d111c] p-4">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.07] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">AI Read Panel</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black ${scene.baseImage ? 'bg-emerald-400/12 text-emerald-300' : 'bg-amber-400/12 text-amber-300'}`}>{scene.baseImage ? 'Ready' : 'Waiting'}</span></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{scene.baseImage ? `I understand your project. This looks like a ${renderPassState.sceneIntelligence?.sceneGraph.sceneType || 'premium retail kiosk'} inside an ${renderPassState.sceneIntelligence?.sceneGraph.locationType || 'indoor shopping mall'}. The camera is frontal and should stay locked.` : 'Upload an image and I will read the architecture locally before generation.'}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">The main visible materials are {aiReadMaterials.slice(0, 5).map(String).join(', ')}. I will treat the base render as source of truth and only edit what you ask for.</p>
        </div>
        <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.07] p-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Materials detected</h4>
          <div className="mt-3 flex flex-wrap gap-2">{aiReadMaterials.slice(0, 8).map((item) => <span key={String(item)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-slate-200">{String(item)}</span>)}</div>
        </div>
        <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.07] p-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">What I will protect</h4>
          <div className="mt-3 space-y-2">{aiReadProtected.slice(0, 7).map((item) => <div key={String(item)} className="flex items-center gap-2 text-sm font-bold text-slate-200"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{String(item)}</div>)}</div>
        </div>
        <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.07] p-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Recommended improvements</h4>
          <div className="mt-3 flex flex-wrap gap-2">{['Material realism', 'Neutral white balance', 'Brass reflections', 'Leather softness', 'Editorial photography'].map((item) => <span key={item} className="rounded-full bg-[#ff8800]/15 px-3 py-1.5 text-xs font-black text-[#ffb15c]">{item}</span>)}</div>
        </div>
        <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.07] p-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Detected Risks</h4>
          <div className="mt-3 space-y-2">{aiReadRisks.slice(0, 5).map((item) => <div key={String(item)} className="flex items-center gap-2 text-sm font-bold text-slate-300"><AlertTriangle className="h-4 w-4 text-amber-300" />{String(item)}</div>)}</div>
        </div>
      </aside>
    </main> : <main className="flex-1 min-h-0 overflow-hidden grid bg-[#0a0d16] text-slate-900" style={{ gridTemplateColumns: '280px minmax(0,1fr) 380px' }}>
      <aside className="h-full min-h-0 overflow-y-auto border-r border-white/10 bg-[#0d111c] p-4 text-slate-100">
        <div className="mb-4 rounded-[28px] bg-white/[0.07] p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.24)] ring-1 ring-white/10">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Studio Library</p>
            <span className="rounded-full bg-[#ff8800]/20 px-2 py-0.5 text-[10px] font-black text-[#ffb15c]">Studio</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Assets', Library, () => setProductSection('assets')],
              ['References', Images, () => setRenderPassViewMode('advanced')],
              ['Layers', Layers, () => setActiveTab('materials')],
              ['Visual Elements', Palette, () => setActiveTab('props')],
            ].map(([label, Icon, action]) => {
              const TypedIcon = Icon as typeof Library;
              return <button key={String(label)} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-white/8 p-2 text-center text-[11px] font-black text-slate-200 ring-1 ring-white/10 transition hover:bg-white/12" onClick={action as () => void}>
                <TypedIcon className="mb-1 h-4 w-4 text-[#ff8800]" />
                {String(label)}
              </button>;
            })}
          </div>
        </div>
        <div className="mb-4 rounded-[28px] border border-white/10 bg-white/[0.07] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Mode Library</p>
            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">Local</span>
          </div>
          <div className="flex flex-col gap-1">
            {topTabs.map((c) => {
              const Icon = topTabIconMap[c];
              const active = activeTab === c;
              return <button
                key={c}
                className={`group inline-flex h-10 items-center gap-2 rounded-xl border px-2.5 text-left text-xs font-black transition duration-150 ${active ? 'border-[#ff8800] bg-[#ff8800] text-white shadow-[0_10px_24px_rgba(255,136,0,0.22)] ring-1 ring-[#ff8800]/30' : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white'}`}
                onClick={() => setActiveTab(c)}
              >
                <span className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg transition ${active ? 'bg-white/18 text-white' : 'bg-white/8 text-slate-400 group-hover:text-[#ffb15c]'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate">{tabLabelMap[c]}</span>
              </button>;
            })}
          </div>
        </div>
        {activeTab === 'render-pass' && <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-4 gap-1">
              {(['basic', 'work', 'advanced', 'qc-studio'] as const).map((mode) => {
                const meta = renderPassModeMeta[mode];
                const Icon = meta.icon;
                const active = renderPassViewMode === mode;
                return <button
                  key={mode}
                  title={meta.description}
                  className={`group flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 text-center text-[11px] font-black transition duration-150 ${active ? 'border-[#ff8800] bg-[#ff8800] text-white shadow-[0_8px_18px_rgba(255,136,0,0.24)]' : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-sm'}`}
                  onClick={() => setRenderPassViewMode(mode)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-tight">{meta.shortLabel}</span>
                </button>;
              })}
            </div>
          </div>

          {renderPassViewMode === 'basic' && <>
            <div className="rounded-2xl border border-[#ff8800]/30 bg-gradient-to-br from-[#fff7ed] to-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#ff8800] text-white shadow-[0_8px_18px_rgba(255,136,0,0.24)]"><Rocket className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9a5000]">Quick Mode</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">Run one pass at a time. The base render is the source of truth.</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white bg-white/85 p-2 text-xs font-bold text-slate-700">
                {scene.baseImage ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                <span>Base Render</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${scene.baseImage ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{scene.baseImage ? 'Ready' : 'Missing'}</span>
              </div>
              <button className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#e67800] hover:shadow-[0_12px_22px_rgba(255,136,0,0.32)]" onClick={() => baseImageInputRef.current?.click()}><ImagePlus className="mr-1.5 h-4 w-4" />{scene.baseImage ? 'Replace Base Render' : 'Upload Base Render'}</button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-slate-900 text-white"><Sparkles className="h-4 w-4" /></span>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">AI Workspace / Quick Generate</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Choose a render goal and create a local mock version. Real image generation is not connected yet.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700"><Info className="h-3 w-3" />Local shell</span>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Bot className="h-4 w-4 text-[#ff8800]" />Generation Adapter</div>
                <select
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-black text-slate-800 outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20"
                  value={selectedGenerationAdapter.id}
                  onChange={(e) => updateRenderPassBuilder({ quickGenerateProvider: e.target.value as GenerationProviderId })}
                >
                  {quickGenerationAdapters.map((adapter) => <option key={adapter.id} value={adapter.id}>{adapter.label}</option>)}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  {(['draft', 'final'] as QuickGenerateMode[]).map((mode) => <button
                    key={mode}
                    className={`h-8 rounded-md text-xs font-black transition ${quickGenerateMode === mode ? 'bg-[#ff8800] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => updateRenderPassBuilder({ quickGenerateMode: mode })}
                  >
                    {mode === 'draft' ? 'Draft Preview' : 'Final Render'}
                  </button>)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${selectedGenerationAdapter.status === 'ready' || (isGoogleImageProvider && quickGenerateKeySaved) ? 'bg-emerald-50 text-emerald-700' : isGoogleImageProvider && !quickGenerateKeySaved ? 'bg-amber-50 text-amber-700' : 'bg-amber-50 text-amber-700'}`}>
                    {selectedGenerationAdapter.status === 'ready' || (isGoogleImageProvider && quickGenerateKeySaved) ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {isGoogleImageProvider && !quickGenerateKeySaved ? 'Setup Required' : selectedGenerationAdapter.status === 'ready' || isGoogleImageProvider ? 'Ready' : 'Adapter not connected'}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">Image input {selectedGenerationAdapter.supportsImageInput ? 'yes' : 'no'}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">Preview {selectedGenerationAdapter.supportsFastPreview ? 'yes' : 'no'}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">Final {selectedGenerationAdapter.supportsFinalRender ? 'yes' : 'no'}</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500">{selectedGenerationAdapter.estimatedUseCase}</p>
                {isGoogleImageProvider && !quickGenerateKeySaved && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-bold text-amber-800">Setup Required: save a {selectedGenerationAdapter.label} API key before generating. Google Pro can reuse your saved Google Lite key.</div>}
                {selectedGenerationAdapter.requiresKey && <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500"><KeyRound className="h-3.5 w-3.5 text-[#ff8800]" />Provider Key</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${quickGenerateKeySaved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{quickGenerateKeySaved ? 'Saved locally' : 'Not saved'}</span>
                  </div>
                  <input
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20"
                    type="password"
                    placeholder={quickGenerateKeySaved ? 'Key saved locally: ••••••••' : `Paste ${selectedGenerationAdapter.label} key`}
                    value={quickGenerateKeyDraft}
                    onChange={(e) => setQuickGenerateKeyDraft(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Stored only in this browser localStorage. Never included in ZIP exports.</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button className="inline-flex h-8 items-center justify-center rounded-lg bg-[#ff8800] px-2 text-xs font-black text-white" onClick={saveQuickGenerateKey}><Save className="mr-1 h-3.5 w-3.5" />Save Key</button>
                    <button className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={clearQuickGenerateKey}><Trash2 className="mr-1 h-3.5 w-3.5" />Clear</button>
                  </div>
                </div>}
              </div>
              <div className="mt-3 rounded-xl border border-[#ff8800]/25 bg-[#fffaf4] p-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-[#9a5000]"><Sparkles className="h-4 w-4 text-[#ff8800]" />Prompt Intelligence</div>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">Deterministic tuning for Google Lite quality. These presets only change prompt wording and keep the base render as source of truth.</p>
                  </div>
                  <span className="flex-none rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#9a5000]">{selectedQuickPromptPresetLabels.length} active</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedQuickPromptPresetLabels.length ? selectedQuickPromptPresetLabels.map((label) => <span key={label} className="inline-flex items-center rounded-full border border-[#ff8800]/30 bg-white px-2 py-1 text-[10px] font-black text-[#9a5000]">{label}</span>) : <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-500">No tuning presets selected</span>}
                </div>
                <div className="mt-3 space-y-2">
                  {quickPromptPresetGroups.map((group) => (
                    <div key={group.category} className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        {group.category === 'lighting' && <Lightbulb className="h-3.5 w-3.5 text-[#ff8800]" />}
                        {group.category === 'material' && <Palette className="h-3.5 w-3.5 text-[#ff8800]" />}
                        {group.category === 'protection' && <ShieldCheck className="h-3.5 w-3.5 text-[#ff8800]" />}
                        {group.category === 'photography' && <Camera className="h-3.5 w-3.5 text-[#ff8800]" />}
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.presets.map((preset) => {
                          const active = (renderPassState.quickPromptPresets?.[group.category] || []).includes(preset.id);
                          return <button
                            key={preset.id}
                            data-testid={`quick-preset-${preset.id}`}
                            className={`inline-flex min-h-8 items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-black leading-tight transition ${active ? 'border-[#ff8800] bg-[#ff8800] text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#ff8800]/50 hover:bg-[#fff7ed] hover:text-[#9a5000]'}`}
                            onClick={() => toggleQuickPromptPreset(group.category, preset.id)}
                            title={preset.instruction}
                          >
                            {preset.label}
                          </button>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {developerModeEnabled && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setShowSceneIntelligence(!showSceneIntelligence)}>
                  <span>
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Bot className="h-4 w-4 text-[#ff8800]" />Scene Intelligence</span>
                    <span className="mt-1 block text-[11px] font-semibold text-slate-500">Internal scene graph, lighting, protection, environment, and photography compiler context.</span>
                  </span>
                  <span className="flex-none rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{showSceneIntelligence ? 'Hide' : renderPassState.sceneIntelligence?.sceneGraph?.sceneType || 'Scene graph'}</span>
                </button>
                {showSceneIntelligence && <div className="mt-2 space-y-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="font-black uppercase tracking-wide text-slate-500">Scene Graph</div>
                    <div className="mt-1">Type: <b>{renderPassState.sceneIntelligence?.sceneGraph.sceneType}</b></div>
                    <div>Location: <b>{renderPassState.sceneIntelligence?.sceneGraph.locationType}</b></div>
                    <div>Camera: {renderPassState.sceneIntelligence?.sceneGraph.cameraDescription}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(renderPassState.sceneIntelligence?.sceneGraph.visibleMaterials || []).map((item) => <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700">{item}</span>)}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="font-black uppercase tracking-wide text-slate-500">Lighting</div>
                    <div>{renderPassState.sceneIntelligence?.lightingIntelligence.summary}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="font-black uppercase tracking-wide text-slate-500">Protection Priorities</div>
                    {(renderPassState.sceneIntelligence?.protectionIntelligence.priorities || []).map((group) => <div key={group.priority}><b>{group.priority}:</b> {group.items.join(', ')}</div>)}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="font-black uppercase tracking-wide text-slate-500">Photography</div>
                    <div>{renderPassState.sceneIntelligence?.photographyIntelligence.summary}</div>
                  </div>
                </div>}
              </div>}
              {developerModeEnabled && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setShowMaterialIntelligence(!showMaterialIntelligence)}>
                  <span>
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Palette className="h-4 w-4 text-[#ff8800]" />Material Intelligence</span>
                    <span className="mt-1 block text-[11px] font-semibold text-slate-500">Hidden prompt helper for material safeguards. Beginner-safe and collapsed by default.</span>
                  </span>
                  <span className="flex-none rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{showMaterialIntelligence ? 'Hide' : `${renderPassState.materialIntelligence?.zones?.length || 0} chips`}</span>
                </button>
                {showMaterialIntelligence && <div className="mt-2 space-y-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] font-semibold leading-relaxed text-slate-600">{renderPassState.materialIntelligence?.summary || 'Conservative heuristic material intelligence.'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(renderPassState.materialIntelligence?.zones || []).map((zone) => <span key={zone.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff8800]" />
                      {zone.label}
                      <span className="text-slate-400">{zone.confidence}%</span>
                    </span>)}
                  </div>
                </div>}
              </div>}
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Info className="h-4 w-4 text-[#ff8800]" />Usage Monitor</div>
                  <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[10px] font-black text-[#9a5000]">Estimated cost: ~THB {estimatedCurrentCost.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Today attempts<br /><span className="text-sm font-black text-slate-900">{todayUsageRecords.length}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Today successes<br /><span className="text-sm font-black text-emerald-700">{todaySuccesses}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">FREE analyses<br /><span className="text-sm font-black text-slate-900">{deterministicAnalysisCount}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Vision analyses<br /><span className="text-sm font-black text-[#9a5000]">{todayVisionAnalyses}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Lite generations<br /><span className="text-sm font-black text-slate-900">{todayLiteGenerations}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Pro generations<br /><span className="text-sm font-black text-slate-900">{todayProGenerations}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Today cost<br /><span className="text-sm font-black text-slate-900">THB {todayUsageCost.toFixed(2)}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Project cost<br /><span className="text-sm font-black text-slate-900">THB {projectUsageCost.toFixed(2)}</span></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Remaining credit THB</span>
                    <input data-testid="quick-generate-credit" className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-bold" type="number" min="0" step="10" value={remainingCredit} onChange={(e) => updateRenderPassBuilder({ quickGenerateCreditTHB: Number(e.target.value) || 0 })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Lite cost / image</span>
                    <input data-testid="google-lite-cost" className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-bold" type="number" min="0" step="0.1" value={googleLiteCostPerImage} onChange={(e) => updateRenderPassBuilder({ googleLiteCostPerImageTHB: Number(e.target.value) || 0 })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Pro cost / image</span>
                    <input data-testid="google-pro-cost" className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-bold" type="number" min="0" step="0.1" value={googleProCostPerImage} onChange={(e) => updateRenderPassBuilder({ googleProCostPerImageTHB: Number(e.target.value) || 0 })} />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <span className="text-[11px] font-bold text-slate-600">Estimated previews remaining: <b className="text-slate-900">{estimatedPreviewsRemaining}</b></span>
                  <button className="inline-flex h-7 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-[11px] font-black text-red-700 hover:bg-red-50" onClick={clearQuickGenerateUsage}>Clear Usage History</button>
                </div>
                {renderPassState.quickGenerateUsage?.[renderPassState.quickGenerateUsage.length - 1] && <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] font-bold text-slate-600">
                  Last attempt: {renderPassState.quickGenerateUsage[renderPassState.quickGenerateUsage.length - 1].status} · THB {renderPassState.quickGenerateUsage[renderPassState.quickGenerateUsage.length - 1].estimatedCostTHB.toFixed(2)} · {renderPassState.quickGenerateUsage[renderPassState.quickGenerateUsage.length - 1].durationMs}ms
                </div>}
              </div>
              {import.meta.env.DEV && developerModeEnabled && isGoogleImageProvider && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-950 p-2 text-slate-100">
                <button className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-black uppercase tracking-wide text-slate-200" onClick={() => setShowGoogleLiteDebug(!showGoogleLiteDebug)}>
                  <span>{selectedGenerationAdapter.label} Debug</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">{showGoogleLiteDebug ? 'Hide' : 'Show'}</span>
                </button>
                {showGoogleLiteDebug && <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-slate-900 p-2">Provider<br /><b>{renderPassState.googleLiteDebug?.provider || '-'}</b></div>
                    <div className="rounded-lg bg-slate-900 p-2">Model<br /><b>{renderPassState.googleLiteDebug?.model || '-'}</b></div>
                    <div className="rounded-lg bg-slate-900 p-2">Status<br /><b>{renderPassState.googleLiteDebug?.responseStatus || '-'}</b></div>
                    <div className="rounded-lg bg-slate-900 p-2">Duration<br /><b>{renderPassState.googleLiteDebug?.durationMs || 0}ms</b></div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-black">
                    {(renderPassState.googleLiteDebug?.detectedImageParts || []).length > 0 ? <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-200">Parsed image OK</span> : <span className="rounded-full bg-amber-500/20 px-2 py-1 text-amber-200">No image returned</span>}
                    {String(renderPassState.googleLiteDebug?.detectedErrorObject || '').toLowerCase().includes('quota') && <span className="rounded-full bg-red-500/20 px-2 py-1 text-red-200">Quota / credit issue</span>}
                    {renderPassState.googleLiteDebug?.detectedErrorObject && <span className="rounded-full bg-red-500/20 px-2 py-1 text-red-200">Billing required / API error</span>}
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-lg bg-black p-2 text-[10px] leading-relaxed text-slate-300">{JSON.stringify(renderPassState.googleLiteDebug || {}, null, 2)}</pre>
                </div>}
              </div>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {quickGenerateGoalCards.map((goal) => {
                  const Icon = goal.icon;
                  const active = (renderPassState.quickGenerateGoals || []).includes(goal.id);
                  return <button
                    key={goal.id}
                    className={`group flex min-h-16 items-center gap-2 rounded-xl border p-2 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-sm ${active ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000] ring-1 ring-[#ff8800]/20' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'}`}
                    onClick={() => toggleQuickGenerateGoal(goal.id)}
                  >
                    <span className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ${active ? 'bg-[#ff8800] text-white' : 'bg-white text-slate-500 group-hover:text-[#ff8800]'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black leading-tight">{goal.label}</span>
                  </button>;
                })}
              </div>
              <button
                data-testid="quick-generate-preview"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(255,136,0,0.26)] transition hover:-translate-y-0.5 hover:bg-[#e67800] hover:shadow-[0_12px_24px_rgba(255,136,0,0.34)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                disabled={!scene.baseImage || isQuickGenerating}
                onClick={createQuickPreview}
              >
                {isQuickGenerating ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Generating Preview...</> : <><WandSparkles className="mr-2 h-4 w-4" />Generate Preview</>}
              </button>
              <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${isGoogleImageProvider && quickGenerateKeySaved ? 'bg-emerald-50 text-emerald-700' : selectedGenerationAdapter.id === 'mock_local' ? 'bg-amber-50 text-amber-700' : 'bg-amber-50 text-amber-700'}`}>
                {isGoogleImageProvider && quickGenerateKeySaved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {selectedGenerationAdapter.id === 'mock_local' ? 'Mock Preview / API not connected' : isGoogleImageProvider && quickGenerateKeySaved ? `${selectedGenerationAdapter.label} preview enabled` : 'Adapter not connected yet'}
              </div>
              {quickGenerateError && <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] font-bold leading-relaxed text-red-700">{quickGenerateError}</div>}
              {selectedGenerationAdapter.id === 'google_lite_image' && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-2">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-blue-800"><ClipboardCheck className="h-4 w-4" />Google Lite validation checklist</div>
                <div className="space-y-1 text-[11px] font-semibold leading-relaxed text-blue-900">
                  {[
                    'Run Better Materials only and confirm architecture/camera stay locked.',
                    'Run Better Lighting only and confirm fixtures are not changed.',
                    'Run Photographic Finish and confirm it behaves like retouching, not redesign.',
                    'Run Better Materials + Better Lighting together and compare preservation.',
                    'Confirm each returned image appears in Version Gallery as a resultRound.',
                    'Click Send to QC Studio and confirm the selected result opens in QC.',
                    'Export packs and confirm no API key text appears in ZIP contents.',
                  ].map((item) => <div key={item} className="flex gap-2 rounded-lg bg-white/70 px-2 py-1"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-blue-600" /><span>{item}</span></div>)}
                </div>
              </div>}
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Layers className="h-4 w-4 text-[#ff8800]" />Version Gallery</div>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{renderPassState.resultRounds.length} versions</span>
                </div>
                {renderPassState.resultRounds.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs font-semibold text-slate-500">No preview versions yet. Generate a mock preview to test the review flow.</div> : <div className="space-y-2">
                  {renderPassState.resultRounds.slice().reverse().slice(0, 4).map((round) => <div key={round.id} className={`rounded-xl border bg-white p-2 shadow-sm ${renderPassState.activeResultRoundId === round.id ? 'border-[#ff8800] ring-1 ring-[#ff8800]/20' : 'border-slate-200'}`}>
                    <div className="flex gap-2">
                      <img src={round.imageDataUrl} alt={round.name} className="h-14 w-16 flex-none rounded-lg border border-slate-200 bg-slate-100 object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <div className="truncate text-xs font-black text-slate-900">{round.name}</div>
                          {round.notes?.includes('Mock Preview') && <span className="flex-none rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700">Mock</span>}
                        </div>
                        <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{round.notes || 'Local preview version'}</div>
                        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${round.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : round.status === 'needs_revision' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{round.status.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <button className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-white px-2 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-50" onClick={() => setQuickPreviewStatus(round.id, 'approved')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approved</button>
                      <button className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-200 bg-white px-2 text-[11px] font-black text-amber-700 transition hover:bg-amber-50" onClick={() => setQuickPreviewStatus(round.id, 'needs_revision')}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Revise</button>
                      <button className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-black text-slate-700 transition hover:border-[#ff8800] hover:text-[#9a5000]" onClick={() => sendRoundToQcStudio(round.id)}><ClipboardCheck className="mr-1 h-3.5 w-3.5" />QC</button>
                    </div>
                  </div>)}
                </div>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><WandSparkles className="h-4 w-4 text-[#ff8800]" />Scene Goal / Output Goal</div>
              <textarea className="mt-2 h-24 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs leading-relaxed outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" placeholder="What should this render pass improve?" value={renderPassState.sceneSetup.outputGoal} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { outputGoal: e.target.value })} />
              <label className="mt-2 block text-[11px] font-black uppercase tracking-wide text-slate-500">Prompt Detail</label>
              <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" value={renderPassState.promptVerbosity || 'standard'} onChange={(e) => updateRenderPassBuilder({ promptVerbosity: e.target.value as any })}>
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><ShieldCheck className="h-4 w-4 text-[#ff8800]" />Quick Design Locks</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {designLockRows.slice(0, 8).map(([key, label]) => {
                  const locked = Boolean(renderPassState.designLock[key]);
                  return <button key={String(key)} className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition ${locked ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-500'}`} onClick={() => updateRenderPassBuilderNested('designLock', { [key]: !locked } as any)}>{label.replace('Lock ', '')} {locked ? '✓' : ''}</button>;
                })}
                <button className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 transition hover:border-[#ff8800] hover:text-[#9a5000]" onClick={() => setRenderPassViewMode('advanced')}>+ More</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><ShieldCheck className="h-4 w-4 text-[#ff8800]" />Protected Assets</div>
                <select className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" defaultValue="" onChange={(e) => { loadProtectedAssetPreset(e.target.value); e.currentTarget.value = ''; }}>
                  <option value="" disabled>Load preset</option>
                  {Object.keys(protectedAssetPresets).map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {renderPassState.protectedAssets.map((asset) => {
                  const locked = asset.locked || asset.status === 'locked';
                  return <button key={asset.id} className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition ${locked ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-500'}`} onClick={() => toggleProtectedAssetLock(asset)} title={locked ? 'Click to mark editable' : 'Click to lock'}>{asset.name} {locked ? '✓' : ''}</button>;
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" placeholder="Add asset" value={newProtectedAssetName} onChange={(e) => setNewProtectedAssetName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNamedProtectedAsset(); }} />
                <button className="inline-flex h-9 items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000]" onClick={addNamedProtectedAsset}>+ Add</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Sparkles className="h-4 w-4 text-[#ff8800]" />Choose What To Improve</div>
              <div className="mt-2 space-y-1.5">
                {renderPassState.passes.filter((pass) => ['analyze_architecture', 'material_enhancement', 'lighting_direction', 'environment', 'people', 'photographic_finish', 'qc_review'].includes(pass.type)).map((pass) => <label key={pass.type} className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-bold ${renderPassState.selectedPassType === pass.type ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  <input type="checkbox" checked={pass.enabled} onChange={(e) => updateRenderPassBuilder({ passes: renderPassState.passes.map((item) => item.type === pass.type ? { ...item, enabled: e.target.checked } : item), selectedPassType: pass.type })} />
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => updateRenderPassBuilder({ selectedPassType: pass.type })}>{pass.type === 'analyze_architecture' ? 'Analyze Image' : pass.title.replace(/^PASS \d+ - /, '')}</button>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500">{pass.status}</span>
                </label>)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(255,136,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#e67800] hover:shadow-[0_12px_24px_rgba(255,136,0,0.32)]" onClick={onGenerateRenderPassPrompts}><WandSparkles className="mr-2 h-4 w-4" />Generate Prompt</button>
              <button className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#ff8800] bg-[#fff7ed] px-3 text-xs font-black text-[#9a5000] transition hover:bg-[#fff2e0]" onClick={exportRenderHandoffPack}><Download className="mr-1.5 h-4 w-4" />Export Handoff Pack</button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Bot className="h-4 w-4 text-[#ff8800]" />AI Scene Composer</div>
                  <p className="mt-1 text-xs text-slate-500">Gemini analyzes only. No image generation.</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${geminiApiKey ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{geminiApiKey ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{geminiApiKey ? 'Connected' : 'Missing'}</span>
              </div>
              <button className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-[#ff8800] hover:text-[#9a5000]" onClick={() => setShowGeminiKeyField(!showGeminiKeyField)}><KeyRound className="mr-1.5 h-3.5 w-3.5" />Configure Gemini Key</button>
              {showGeminiKeyField && <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" type="password" placeholder="Gemini API key" value={geminiKeyDraft} onChange={(e) => setGeminiKeyDraft(e.target.value)} />
                <p className="mt-1 text-[11px] text-slate-500">Stored locally on this device. Not included in exports.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="h-8 rounded-md bg-[#ff8800] text-xs font-black text-white" onClick={saveGeminiKey}>Save Key</button>
                  <button className="h-8 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700" onClick={clearGeminiKey}>Clear</button>
                </div>
              </div>}
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-600">Mood references: {renderPassState.aiComposer.references.length}</div>
              <label className="mt-2 inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] transition hover:bg-[#fff7ed]">
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />Add Mood Reference
                <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => addComposerReferences(e.target.files)} />
              </label>
              <button className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white transition hover:bg-[#e67800] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isGeminiLoading || !scene.baseImage} onClick={runGeminiComposer}>{isGeminiLoading ? <><span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />Analyzing...</> : <><Bot className="mr-1.5 h-4 w-4" />Analyze & Compose with Gemini</>}</button>
              <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${renderPassState.aiComposer.lastError ? 'bg-red-50 text-red-700' : renderPassState.aiComposer.lastResponse ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {renderPassState.aiComposer.lastError ? <AlertTriangle className="h-3.5 w-3.5" /> : renderPassState.aiComposer.lastResponse ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                {renderPassState.aiComposer.lastError ? 'Error' : renderPassState.aiComposer.lastResponse ? 'Ready for review' : 'Not run yet'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Layers className="h-4 w-4 text-[#ff8800]" />Render Pass Inputs</div>
              <p className="mt-1 text-xs text-slate-500">Optional Object ID / Material ID / Depth passes. Stored locally.</p>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] font-black">
                <div className={`rounded-md border p-1.5 ${renderPassInputSummary.objectId ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>Object ID<br />{renderPassInputSummary.objectId ? 'loaded' : 'missing'}</div>
                <div className={`rounded-md border p-1.5 ${renderPassInputSummary.materialId ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>Material ID<br />{renderPassInputSummary.materialId ? 'loaded' : 'missing'}</div>
                <div className={`rounded-md border p-1.5 ${renderPassInputSummary.depth ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>Depth<br />{renderPassInputSummary.depth ? 'loaded' : 'missing'}</div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {[
                  ['object_id', 'Add Object ID Pass'],
                  ['material_id', 'Add Material ID Pass'],
                  ['depth', 'Add Depth Pass'],
                ].map(([type, label]) => <label key={type} className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] hover:bg-[#fff7ed]">
                  {label}
                  <input data-testid={`render-pass-input-${type}`} className="hidden" type="file" accept="image/*" onChange={(e) => addRenderPassInput(type as RenderPassInputType, e.target.files?.[0])} />
                </label>)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><ClipboardCheck className="h-4 w-4 text-[#ff8800]" />Result QC / Overlay Review</div>
                  <p className="mt-1 text-xs text-slate-500">Import the image you generated outside Visual Local, then compare and revise locally.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{renderPassState.resultRounds.length} results</span>
              </div>
              <label className="mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)]">
                Import AI Result
                <input data-testid="import-ai-result-input-sidebar" className="hidden" type="file" accept="image/*" onChange={(e) => importResultImage(e.target.files?.[0])} />
              </label>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-600">
                {activeResultRound ? `${activeResultRound.name}: ${currentResultQc.clientReadyScore}/100 client-ready, risk ${currentResultQc.hallucinationRisk}` : 'No result imported yet.'}
              </div>
              {activeResultRound?.qc?.revisionPrompt && <button className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700" onClick={copyResultRevisionPrompt}>Copy Revision Prompt</button>}
            </div>
          </>}

          {renderPassViewMode === 'work' && <div className="space-y-3">
            <div className="rounded-2xl border border-[#ff8800]/30 bg-gradient-to-br from-[#fff7ed] to-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#ff8800] text-white"><ClipboardCheck className="h-4 w-4" /></span>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wide text-[#9a5000]">Work Mode</div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">Think first. Analyze once. Generate many. Vision only runs after you click Analyze Scene.</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-white bg-white/80 p-2 text-xs font-bold text-slate-700">
                Scene Intelligence: <span className={renderPassState.visionTimestamp ? 'text-emerald-700' : 'text-[#9a5000]'}>{renderPassState.visionTimestamp ? 'Cached' : 'Deterministic only'}</span>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">Source: {renderPassState.analysisSource || 'deterministic'} {renderPassState.visionTimestamp ? `· Analyzed ${new Date(renderPassState.visionTimestamp).toLocaleString()}` : '· FREE local analysis'}</div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] shadow-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={isGeminiLoading || !scene.baseImage} onClick={() => runVisionIntelligence(false)}>
                  {isGeminiLoading ? 'Analyzing...' : 'Analyze Scene'}
                </button>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-bold text-amber-800">This uses one Vision API request. Estimated cost: ~THB 1.20. Cached results prevent duplicate billing.</div>
                <button className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700" onClick={buildWorkPlan}>Build Work Plan</button>
                <button className="inline-flex h-10 items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)]" onClick={createQuickPreview} disabled={!scene.baseImage || isQuickGenerating}>{isQuickGenerating ? 'Generating Draft...' : 'Generate Draft'}</button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><Bot className="h-4 w-4 text-[#ff8800]" />AI Read</div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">A friendly summary of what Visual Local will protect and improve before generation.</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${renderPassState.visionTimestamp ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{renderPassState.visionTimestamp ? 'Vision read' : 'Local read'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">What AI sees</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-700">{renderPassState.sceneIntelligence?.sceneGraph.sceneType || renderPassState.sceneSetup.sceneType || 'Architectural interior / retail scene'} with {(renderPassState.sceneIntelligence?.sceneGraph.visibleMaterials || []).slice(0, 3).join(', ') || 'mapped materials'}.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">What improves</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-700">{selectedQuickGenerateGoalLabels.length ? selectedQuickGenerateGoalLabels.join(', ') : 'Materials, lighting, and photography quality when selected.'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Protected</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-700">{(renderPassState.sceneIntelligence?.sceneGraph.protectedElements || []).slice(0, 4).join(', ') || 'Camera, architecture, signage, furniture positions.'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Risks</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-700">{(renderPassState.sceneIntelligence?.sceneGraph.likelyRenderWeaknesses || []).slice(0, 3).join(', ') || 'Yellow cast, weak material realism, hallucinated background.'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Work Plan</div>
                <button className={`rounded-full px-2 py-1 text-[10px] font-black ${renderPassState.approvedWorkPlan ? 'bg-emerald-50 text-emerald-700' : 'bg-[#fff7ed] text-[#9a5000]'}`} onClick={approveWorkPlan}>{renderPassState.approvedWorkPlan ? 'Approved' : 'Approve'}</button>
              </div>
              <div className="mt-2 space-y-1.5">
                {(renderPassState.workPlan || []).map((item) => <label key={item.id} className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs font-bold ${item.enabled ? 'border-[#ff8800]/30 bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <input type="checkbox" checked={item.enabled} onChange={() => toggleWorkPlanItem(item.id)} />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px]">{item.category}</span>
                </label>)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" data-testid="suggested-rules-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500"><ShieldCheck className="h-4 w-4 text-[#ff8800]" />Suggested Rules</div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Toggle what the prompt compiler must obey. Enabled rules are injected into Generate Draft prompts.</p>
                </div>
                <span className="flex-none rounded-full bg-[#fff7ed] px-2 py-1 text-[10px] font-black text-[#9a5000]">{activeRules.length} active</span>
              </div>
              <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] hover:bg-[#fff7ed]" onClick={() => updateSuggestedRules(renderPassState.visionTimestamp ? 'vision' : 'deterministic')}>
                Generate Suggested Rules
              </button>
              {renderPassState.generationRules?.length ? <div className="mt-3 space-y-2">
                {Object.entries(rulesByGroup).map(([group, rules]) => (
                  <details key={group} open={group === 'Critical Locks'} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <summary className="cursor-pointer select-none text-[11px] font-black uppercase tracking-wide text-slate-600">{group} <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500">{rules.filter((rule) => rule.enabled).length}/{rules.length}</span></summary>
                    <div className="mt-2 space-y-1.5">
                      {rules.map((rule) => <label key={rule.id} data-testid={`generation-rule-${rule.id}`} className={`flex gap-2 rounded-lg border p-2 text-xs font-semibold transition ${rule.enabled ? 'border-[#ff8800]/35 bg-[#fff7ed] text-[#8a4a00]' : 'border-slate-200 bg-white text-slate-600'}`}>
                        <input type="checkbox" checked={rule.enabled} onChange={() => toggleGenerationRule(rule.id)} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-black text-slate-900">{rule.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{rule.reason}</span>
                          {rule.stale && <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">stale - regenerate</span>}
                        </span>
                        <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-black ${rule.priority === 'critical' ? 'bg-red-50 text-red-700' : rule.priority === 'high' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{rule.confidence}%</span>
                      </label>)}
                    </div>
                  </details>
                ))}
                <label className="block rounded-xl border border-slate-200 bg-white p-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Custom rule note</span>
                  <textarea className="mt-1 h-16 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" placeholder="Add one extra instruction to inject into Active Rules..." value={renderPassState.customRuleNote || ''} onChange={(e) => updateRenderPassBuilder({ customRuleNote: e.target.value })} />
                </label>
              </div> : <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-semibold text-slate-500">No rules generated yet. Analyze Scene or click Generate Suggested Rules.</div>}
            </div>
            {developerModeEnabled && <details className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <summary className="cursor-pointer select-none text-[11px] font-black uppercase tracking-wide text-slate-500">Telemetry</summary>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Today cost<br /><span className="text-sm font-black text-slate-900">THB {todayTelemetryCost.toFixed(2)}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Project cost<br /><span className="text-sm font-black text-slate-900">THB {telemetry.totalEstimatedCostTHB.toFixed(2)}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Vision cost<br /><span className="text-sm font-black text-[#9a5000]">THB {visionTelemetryCost.toFixed(2)}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Lite / Pro<br /><span className="text-sm font-black text-slate-900">{liteTelemetryCost.toFixed(2)} / {proTelemetryCost.toFixed(2)}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Analyses<br /><span className="text-sm font-black text-slate-900">{telemetry.totalAnalyses}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Generations<br /><span className="text-sm font-black text-slate-900">{telemetry.totalAttempts}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Avg gen time<br /><span className="text-sm font-black text-slate-900">{telemetry.averageGenerationTimeMs}ms</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Avg QC / success<br /><span className="text-sm font-black text-slate-900">{telemetry.averageQcScore} / {telemetry.successRate}%</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Cache hit rate<br /><span className="text-sm font-black text-slate-900">{telemetry.cacheHitRate}%</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">Cost / approved<br /><span className="text-sm font-black text-slate-900">THB {telemetry.costPerApprovedImageTHB.toFixed(2)}</span></div>
              </div>
              <button className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-red-200 bg-white px-2 text-[11px] font-black text-red-700 hover:bg-red-50" onClick={clearLocalTelemetry}>Clear Telemetry</button>
            </details>}
            {developerModeEnabled && <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Cache Status</div>
              <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
                <div>Scene hash: <span className="font-mono text-[10px]">{renderPassState.sceneHash || 'not analyzed yet'}</span></div>
                <div>Vision model: {renderPassState.visionModel || '-'}</div>
                <div>Analysis cost: THB {(renderPassState.analysisCostTHB || 0).toFixed(2)}</div>
                <button className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-black text-slate-700" disabled={isGeminiLoading || !scene.baseImage} onClick={() => runVisionIntelligence(true)}>Re-analyze</button>
              </div>
            </div>}
          </div>}

          {renderPassViewMode === 'qc-studio' && <div className="space-y-3">
            <div className="rounded-xl border border-[#ff8800]/30 bg-[#fff7ed] p-3 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#9a5000]">Result QC Studio</p>
              <p className="mt-1 text-xs font-semibold text-slate-700">Compare the base render with an imported AI result, mark violations, and generate a focused revision prompt.</p>
              <div className="mt-3 rounded-lg border border-white bg-white/80 p-2 text-xs font-bold text-slate-700">Base Render: <span className={scene.baseImage ? 'text-emerald-700' : 'text-amber-700'}>{scene.baseImage ? 'Ready' : 'Missing'}</span></div>
              <label className="mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)]">
                Import AI Result Image
                <input data-testid="import-ai-result-input-compact" className="hidden" type="file" accept="image/*" onChange={(e) => importResultImage(e.target.files?.[0])} />
              </label>
              {activeResultRound && <div className="mt-2 rounded-lg border border-white bg-white/80 p-2 text-xs font-bold text-slate-700">{activeResultRound.name}: {activeResultRound.status}</div>}
            </div>
            {activeResultRound && <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">QC Summary</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                <div className="rounded-lg bg-slate-50 p-2">Preserve<br /><span className="text-[#9a5000]">{currentResultQc.preservationScore}%</span></div>
                <div className="rounded-lg bg-slate-50 p-2">Photo<br /><span className="text-[#9a5000]">{currentResultQc.photographicScore}%</span></div>
                <div className="rounded-lg bg-slate-50 p-2">Ready<br /><span className="text-[#9a5000]">{currentResultQc.clientReadyScore}%</span></div>
              </div>
              <button className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white" onClick={generateResultRevision}>Generate Revision Prompt</button>
              <button className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700" onClick={copyResultRevisionPrompt}>Copy Revision Prompt</button>
            </div>}
          </div>}

          {renderPassViewMode === 'advanced' && <>
          <div className="rounded-xl border border-[#ff8800]/30 bg-[#fff7ed] p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#9a5000]">Knowledge-first workflow</p>
            <p className="mt-1 text-xs text-slate-700">Generation is never the first step. Lock project knowledge before composing render prompts.</p>
            <select className="mt-2 h-9 w-full rounded-md border border-[#ff8800]/30 bg-white px-2 text-xs font-bold text-slate-800" value={renderPassState.workflowPhase} onChange={(e) => updateRenderPassBuilder({ workflowPhase: e.target.value as any })}>
              {knowledgePhaseOptions.map((phase) => <option key={phase.value} value={phase.value}>{phase.label}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
              <div className="rounded-lg border border-white bg-white/80 p-2">Site photos: {renderPassState.siteContext.photos.length}</div>
              <div className="rounded-lg border border-white bg-white/80 p-2">Brand refs: {renderPassState.brandContext.references.length}</div>
              <div className="col-span-2 rounded-lg border border-white bg-white/80 p-2">Knowledge lock: {renderPassState.projectKnowledgeBase.lockedAt ? 'locked' : 'not locked'}</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Project / Scene / Base Render</p>
            <div className="mt-2 space-y-2">
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Project Name" value={renderPassState.sceneSetup.projectName} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { projectName: e.target.value })} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Brand" value={renderPassState.sceneSetup.brand} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { brand: e.target.value })} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Location" value={renderPassState.sceneSetup.location} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { location: e.target.value })} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Scene Type" value={renderPassState.sceneSetup.sceneType} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { sceneType: e.target.value })} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Camera Angle" value={renderPassState.sceneSetup.cameraAngle} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { cameraAngle: e.target.value })} />
              <textarea className="h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Output Goal" value={renderPassState.sceneSetup.outputGoal} onChange={(e) => updateRenderPassBuilderNested('sceneSetup', { outputGoal: e.target.value })} />
              <button className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white shadow-sm" onClick={() => baseImageInputRef.current?.click()}><ImagePlus className="mr-1 h-4 w-4" />{scene.baseImage ? 'Replace Base Render' : 'Upload Base Render'}</button>
              {!scene.baseImage && <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">Upload a base render first.</div>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Site Analysis Photos</p>
            <p className="mt-1 text-xs text-slate-500">Upload real site photos. These are for analysis only, not generation.</p>
            <label className="mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] hover:bg-[#fff7ed]">
              Upload Site Photos
              <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => addKnowledgeImages('site', e.target.files)} />
            </label>
            {renderPassState.siteContext.photos.length > 0 && <div className="mt-2 grid grid-cols-3 gap-2">
              {renderPassState.siteContext.photos.slice(0, 6).map((photo, index) => <div key={`site-${index}`} className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <img src={photo} alt={`site reference ${index + 1}`} className="h-14 w-full object-cover" />
                <button className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white" onClick={() => removeKnowledgeImage('site', index)}>x</button>
              </div>)}
            </div>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Brand References</p>
            <p className="mt-1 text-xs text-slate-500">Optional furniture, material, mood, lighting, branding, or previous-project references.</p>
            <label className="mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] hover:bg-[#fff7ed]">
              Upload Brand References
              <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => addKnowledgeImages('brand', e.target.files)} />
            </label>
            {renderPassState.brandContext.references.length > 0 && <div className="mt-2 grid grid-cols-3 gap-2">
              {renderPassState.brandContext.references.slice(0, 6).map((photo, index) => <div key={`brand-${index}`} className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <img src={photo} alt={`brand reference ${index + 1}`} className="h-14 w-full object-cover" />
                <button className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white" onClick={() => removeKnowledgeImage('brand', index)}>x</button>
              </div>)}
            </div>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Reference Intelligence</p>
            <p className="mt-1 text-xs text-slate-500">Assign each reference image a role so future model adapters know how to use it.</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {referenceRoleOptions.map((role) => <label key={role.value} className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-[#ff8800] hover:bg-[#fff7ed]">
                + {role.label}
                <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => addReferenceAssets(role.value, e.target.files)} />
              </label>)}
            </div>
            {renderPassState.references.length > 0 && <div className="mt-3 space-y-2">
              {renderPassState.references.slice(0, 8).map((ref) => <div key={ref.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex items-center gap-2">
                  <img src={ref.image} alt={ref.label} className="h-10 w-10 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <input className="mb-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-bold" value={ref.label} onChange={(e) => updateReferenceAsset(ref.id, { label: e.target.value })} />
                    <select className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px]" value={ref.role} onChange={(e) => updateReferenceAsset(ref.id, { role: e.target.value })}>
                      {referenceRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                  <button className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-700" onClick={() => deleteReferenceAsset(ref.id)}>x</button>
                </div>
                <input className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px]" placeholder="Reference role notes" value={ref.notes} onChange={(e) => updateReferenceAsset(ref.id, { notes: e.target.value })} />
              </div>)}
            </div>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Render Pass Inputs</p>
                <p className="mt-1 text-xs text-slate-500">Optional 3D render passes. Use Object ID / Material ID / Depth passes to improve mapping, prompt precision, and QC. These images stay local.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{renderPassState.renderPassInputs.length}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {renderPassInputTypeOptions.filter((option) => ['object_id', 'material_id', 'depth', 'other'].includes(option.value)).map((option) => <label key={option.value} className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-[#ff8800] bg-white px-2 text-[11px] font-black text-[#9a5000] hover:bg-[#fff7ed]">
                + {option.label}
                <input data-testid={`render-pass-input-${option.value}`} className="hidden" type="file" accept="image/*" onChange={(e) => addRenderPassInput(option.value, e.target.files?.[0])} />
              </label>)}
            </div>
            <div className="mt-3 space-y-3">
              {renderPassState.renderPassInputs.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">No Object ID, Material ID, or Depth passes loaded yet.</div> : renderPassState.renderPassInputs.map((input) => <div key={input.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="flex gap-2">
                  <img src={input.dataUrl} alt={input.name} className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <input className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-black" value={input.name} onChange={(e) => updateRenderPassInput(input.id, { name: e.target.value })} />
                    <div className="grid grid-cols-[1fr_auto] gap-1">
                      <select className="h-8 rounded border border-slate-300 bg-white px-2 text-[11px]" value={input.type} onChange={(e) => updateRenderPassInput(input.id, { type: e.target.value as RenderPassInputType })}>
                        {renderPassInputTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-600"><input type="checkbox" checked={input.enabled} onChange={(e) => updateRenderPassInput(input.id, { enabled: e.target.checked })} />Enabled</label>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">{input.width || '-'} x {input.height || '-'} px</div>
                  </div>
                  <button className="h-8 rounded-md border border-red-200 bg-white px-2 text-[11px] font-bold text-red-700" onClick={() => deleteRenderPassInput(input.id)}>x</button>
                </div>
                <textarea className="mt-2 h-14 w-full rounded border border-slate-300 bg-white p-2 text-xs" placeholder="Notes for this technical pass" value={input.notes || ''} onChange={(e) => updateRenderPassInput(input.id, { notes: e.target.value })} />
                {(input.type === 'object_id' || input.type === 'material_id') && <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Color Legend</span>
                    <div className="flex gap-1">
                      <button className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700" onClick={() => analyzeRenderPassColors(input)}>Analyze Colors</button>
                      <button className="rounded border border-[#ff8800] bg-white px-2 py-1 text-[10px] font-black text-[#9a5000]" onClick={() => addColorLegendEntry(input)}>Add Color</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(input.colorLegend || []).length === 0 ? <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-500">No legend yet. Add colors manually or analyze the image.</div> : (input.colorLegend || []).map((entry) => <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <div className="grid grid-cols-[34px_72px_1fr] gap-1">
                        <input type="color" className="h-8 w-8 rounded border border-slate-300" value={entry.colorHex} onChange={(e) => updateColorLegendEntry(input, entry.id, { colorHex: e.target.value.toUpperCase() })} />
                        <input className="h-8 rounded border border-slate-300 bg-white px-1 text-[11px] font-bold" value={entry.colorHex} onChange={(e) => updateColorLegendEntry(input, entry.id, { colorHex: e.target.value })} />
                        <input className="h-8 rounded border border-slate-300 bg-white px-2 text-[11px]" placeholder="Label" value={entry.label} onChange={(e) => updateColorLegendEntry(input, entry.id, { label: e.target.value })} />
                      </div>
                      <div className="mt-1 grid grid-cols-[1fr_auto_auto] gap-1">
                        <select className="h-8 rounded border border-slate-300 bg-white px-2 text-[11px]" value={entry.role} onChange={(e) => updateColorLegendEntry(input, entry.id, { role: e.target.value as ColorLegendEntry['role'] })}>
                          {colorLegendRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                        <label className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-600"><input type="checkbox" checked={Boolean(entry.locked)} onChange={(e) => updateColorLegendEntry(input, entry.id, { locked: e.target.checked })} />Locked</label>
                        <button className="rounded border border-red-200 bg-white px-2 text-[11px] font-bold text-red-700" onClick={() => removeColorLegendEntry(input, entry.id)}>Remove</button>
                      </div>
                      <input className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px]" placeholder="Legend notes" value={entry.notes || ''} onChange={(e) => updateColorLegendEntry(input, entry.id, { notes: e.target.value })} />
                    </div>)}
                  </div>
                </div>}
              </div>)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Protected Design Assets</p>
              <button className="rounded-md border border-[#ff8800] bg-white px-2 py-1 text-[11px] font-bold text-[#9a5000]" onClick={addProtectedAsset}>Add</button>
            </div>
            <div className="mt-2 space-y-2">
              {renderPassState.protectedAssets.map((asset) => <div key={asset.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex items-center gap-2">
                  <input className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold" value={asset.name} onChange={(e) => updateProtectedAsset(asset.id, { name: e.target.value })} />
                  <select className="h-7 rounded-md border border-slate-300 bg-white px-1 text-[11px] font-bold" value={asset.status || (asset.locked ? 'locked' : 'editable')} onChange={(e) => updateProtectedAsset(asset.id, { status: e.target.value as any, locked: e.target.value === 'locked' })}>
                    <option value="locked">Locked</option>
                    <option value="editable">Editable</option>
                    <option value="replaceable">Replaceable</option>
                  </select>
                  <button className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-700" onClick={() => deleteProtectedAsset(asset.id)}>Delete</button>
                </div>
                <input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs" placeholder="Description (optional)" value={asset.description || ''} onChange={(e) => updateProtectedAsset(asset.id, { description: e.target.value })} />
              </div>)}
            </div>
          </div>
          </>}
        </div>}
        {slotTabs.includes(activeTab as SlotCategory) && <button className="mb-2 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#ff8800] bg-white px-3 text-sm font-bold text-[#9a5000] shadow-sm transition hover:bg-[#fff2e0]" onClick={addSlot}>{categoryAddLabel[activeTab as SlotCategory]} <span className="sr-only">Add Slot</span></button>}
        <select className="mb-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" onChange={(e) => applyRecipe(e.target.value)}><option>Smart recipe presets</option>{Object.keys(smartRecipes).map((s) => <option key={s}>{s}</option>)}</select>
        {slotTabs.includes(activeTab as SlotCategory) && <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Active: {tabLabelMap[activeTab]}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{currentCategorySlots.length} slots</span>
          </div>
          {currentCategorySlots.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="mb-2">No {activeTab} yet.</p>
            <button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-3 text-xs font-bold text-[#9a5000] hover:bg-[#fff2e0]" onClick={addSlot}>{categoryAddLabel[activeTab as SlotCategory]}</button>
          </div> : currentCategorySlots.map((s) => {
            const displayCode = getSlotDisplayCode(s);
            const isSelected = selectedSlotId === s.id;
            const firstRef = s.referenceImages?.[0];
            const mappingCount = (s.pins?.length || 0) + (s.regions?.length || 0);
            return <button key={s.id} onClick={() => setSelectedSlotId(s.id)} className={`group w-full rounded-xl border p-2.5 text-left transition ${isSelected ? 'border-[#ff8800] bg-[#fff7ed] shadow-[0_8px_18px_rgba(255,136,0,0.14)] ring-1 ring-[#ff8800]/30' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50'}`}>
              <div className="flex gap-2">
                <span className="w-1.5 self-stretch rounded-full" style={{ background: s.color }} />
                <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {firstRef ? <img src={firstRef} alt={`${s.code} reference`} className="h-full w-full object-cover" /> : <span className="h-7 w-7 rounded-full border-2 border-white shadow-sm" style={{ background: s.color }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span data-testid={`slot-drag-chip-${s.code}`} onPointerDown={(e) => onSlotChipPointerDown(e, s)} className="inline-flex h-7 min-w-[44px] touch-none cursor-grab select-none items-center justify-center rounded-md px-2 text-xs font-black text-white shadow-sm ring-1 ring-white/40 active:cursor-grabbing" style={{ background: s.color }}>{displayCode}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{s.category}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900">{s.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span>{s.referenceImages.length} refs</span>
                    <span>{s.pins.length} pins</span>
                    <span>{s.regions.length} regions</span>
                  </div>
                  {mappingCount === 0 && <div className="mt-1 text-[11px] font-semibold text-[#9a5000]">Drag {displayCode} onto the image to tag.</div>}
                </div>
              </div>
            </button>;
          })}
        </div>}
        {false && activeTab === 'people' && <div className="space-y-2 text-sm">
          <select className="w-full rounded bg-neutral-900 p-2" value={scene.people.level} onChange={(e) => updateScene({ people: { ...scene.people, level: e.target.value as any } })}><option value="none">none</option><option value="min">min</option><option value="mid">mid</option><option value="max">max</option></select>
          <select className="w-full rounded bg-neutral-900 p-2" value={scene.people.motionBlur} onChange={(e) => updateScene({ people: { ...scene.people, motionBlur: e.target.value as any } })}><option value="none">none</option><option value="soft">soft</option><option value="walking">walking</option><option value="random">random</option></select>
          {peopleBehaviorOptions.map((b) => <label className="flex items-center gap-2 text-xs" key={b}><input type="checkbox" checked={scene.people.behavior.includes(b)} onChange={(e) => updateScene({ people: { ...scene.people, behavior: e.target.checked ? [...scene.people.behavior, b] : scene.people.behavior.filter((x) => x !== b) } })} />{b}</label>)}
          <textarea className="h-36 w-full rounded bg-neutral-900 p-2" placeholder="คำอธิบายไทยของผู้คน" value={scene.people.descriptionThai} onChange={(e) => updateScene({ people: { ...scene.people, descriptionThai: e.target.value } })} />
          <p className="text-xs text-slate-500">คำอธิบายไทยนี้จะถูกใช้เป็น design intent ตอนสร้าง prompt package</p>
        </div>}
        {false && activeTab === 'output' && <div className="space-y-2 text-sm">
          <select className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.outputPreset} onChange={(e) => { const name = e.target.value; updateScene({ outputSpec: { ...scene.outputSpec, outputPreset: name, ...(outputPresets[name] || {}) } as OutputSpec }); }}>{Object.keys(outputPresets).map((x) => <option key={x}>{x}</option>)}</select>
          <select className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.targetUse} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, targetUse: e.target.value } })}>{targetUseOptions.map((x) => <option key={x}>{x}</option>)}</select>
          <input className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.aspectRatio} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, aspectRatio: e.target.value } })} />
          <input className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.orientation} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, orientation: e.target.value } })} />
          <input type="number" className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.targetWidth} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, targetWidth: Number(e.target.value) || 0 } })} />
          <input type="number" className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.targetHeight} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, targetHeight: Number(e.target.value) || 0 } })} />
          <input className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.cropBehavior} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, cropBehavior: e.target.value } })} />
          <input type="number" className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.safeAreaPercentage} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, safeAreaPercentage: Number(e.target.value) || 0 } })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={scene.outputSpec.needsUpscale} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, needsUpscale: e.target.checked } })} />needsUpscale</label>
          <select className="w-full rounded bg-neutral-900 p-2" value={scene.outputSpec.finalFormat} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, finalFormat: e.target.value as 'jpg' | 'png' } })}><option value="jpg">jpg</option><option value="png">png</option></select>
        </div>}
        {false && activeTab === 'boards' && <div className="space-y-2 text-sm">
          <button className="w-full rounded bg-blue-700 p-2" onClick={() => createBoards()}>Generate Boards</button>
          <div className="rounded bg-neutral-900 p-2 text-xs">Generated at: {boardsGeneratedAt || 'not generated'}</div>
          {['boards/mapping_overlay_board.png', 'boards/material_board.png', 'boards/prop_board.png', 'boards/lighting_board.png', 'boards/environment_board.png', 'boards/atmosphere_board.png', 'boards/package_summary.png'].map((k) => (
            <div key={k} className="grid grid-cols-[1fr_auto] gap-1">
              <button className="rounded bg-neutral-900 p-2 text-left" onClick={() => setSelectedBoardKey(k)}>{k.replace('boards/', '')}</button>
              <button className="rounded bg-neutral-800 px-2 text-xs" onClick={() => exportBoardPng(k)}>Export</button>
            </div>
          ))}
          {boardsPreview[selectedBoardKey] && <img src={boardsPreview[selectedBoardKey]} alt="board preview" className="rounded border border-neutral-700" />}
        </div>}
        {false && activeTab === 'ai-prompt' && <div className="space-y-2 text-sm">
          <h4 className="font-semibold">AI Prompt Package</h4>
          <textarea className="h-28 w-full rounded bg-neutral-900 p-2 font-mono text-xs" placeholder="Paste visual-brief-ai-import-v1 JSON" value={promptJsonInput} onChange={(e) => setPromptJsonInput(e.target.value)} />
          <div className="grid grid-cols-2 gap-1">
            <button className="rounded bg-neutral-800 p-2 text-xs" onClick={onValidatePromptJson}>Validate</button>
            <label className="rounded bg-neutral-800 p-2 text-center text-xs">Load File<input className="hidden" type="file" accept=".json" onChange={(e) => onLoadPromptJsonFile(e.target.files?.[0])} /></label>
          </div>
          <button className="w-full rounded bg-blue-700 p-2 text-xs" onClick={onImportPromptPackage}>Import into current scene</button>
          {promptValidation && <div className={`rounded p-2 text-xs ${promptValidation.status === 'valid' ? 'bg-emerald-900/40' : promptValidation.status === 'warning' ? 'bg-amber-900/40' : 'bg-red-900/40'}`}>
            <div>Status: {promptValidation.status}</div>
            <div>Schema: {(promptValidation.parsed as any)?.schemaVersion || '-'}</div>
            <div>Prompt fields found: {promptValidation.parsed?.promptPackage ? Object.keys(promptValidation.parsed.promptPackage).length : 0}</div>
            <div>Assistant notes: {promptValidation.parsed?.assistantNotes ? 'found' : 'missing'}</div>
            {promptValidation.errors.map((e) => <div key={e}>Error: {e}</div>)}
            {promptValidation.warnings.map((w) => <div key={w}>Warning: {w}</div>)}
          </div>}
          <hr className="border-neutral-800" />
          <div className="text-xs font-semibold">Prompt History</div>
          <select className="w-full rounded bg-neutral-900 p-2 text-xs" value={scene.activePromptPackageId || ''} onChange={(e) => updateScene({ activePromptPackageId: e.target.value })}>
            <option value="">No active package</option>
            {(scene.promptPackages || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="max-h-32 space-y-1 overflow-auto">
            {(scene.promptPackages || []).map((p) => <div key={p.id} className="rounded bg-neutral-900 p-2 text-xs">
              <input className="mb-1 w-full rounded bg-neutral-800 p-1" value={p.name} onChange={(e) => updateScene({ promptPackages: scene.promptPackages.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x) })} />
              <div>{p.assistantName || '-'} | {new Date(p.importedAt).toLocaleString()}</div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button className="rounded bg-neutral-800 p-1" onClick={() => updateScene({ activePromptPackageId: p.id })}>Mark Active</button>
                <button className="rounded bg-red-800 p-1" onClick={() => updateScene({ promptPackages: scene.promptPackages.filter((x) => x.id !== p.id), activePromptPackageId: scene.activePromptPackageId === p.id ? undefined : scene.activePromptPackageId })}>Delete</button>
              </div>
            </div>)}
          </div>
          {activePromptPackage && <div className="rounded bg-neutral-900 p-2 text-xs">
            <div className="mb-1 font-semibold">Prompt Viewer ({new Date(activePromptPackage.importedAt).toLocaleString()})</div>
            <select className="mb-1 w-full rounded bg-neutral-800 p-1" value={activePromptBlock} onChange={(e) => setActivePromptBlock(e.target.value)}>
              {Object.keys(activePromptPackage.promptPackage).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <div className="mb-1">Characters: {((activePromptPackage.promptPackage as any)[activePromptBlock] || '').length}</div>
            <textarea className="h-28 w-full rounded bg-neutral-800 p-2" value={(activePromptPackage.promptPackage as any)[activePromptBlock] || ''} readOnly />
            <button className="mt-1 rounded bg-neutral-700 px-2 py-1" onClick={() => navigator.clipboard.writeText((activePromptPackage.promptPackage as any)[activePromptBlock] || '')}>Copy</button>
            <div className="mt-2">Assistant Notes: {activePromptPackage.assistantNotes?.summary || '-'}</div>
            <div>Missing Data: {(activePromptPackage.assistantNotes?.missingData || []).join(', ') || '-'}</div>
            <div>Recommended Next: {activePromptPackage.assistantNotes?.recommendedNextStep || '-'}</div>
          </div>}
          <hr className="border-neutral-800" />
          <div className="text-xs font-semibold">Revision</div>
          <input className="w-full rounded bg-neutral-900 p-2 text-xs" value={revisionDraft.renderPassName} onChange={(e) => setRevisionDraft({ ...revisionDraft, renderPassName: e.target.value })} />
          <textarea className="h-20 w-full rounded bg-neutral-900 p-2 text-xs" placeholder="renderResultNotesThai" value={revisionDraft.renderResultNotesThai} onChange={(e) => setRevisionDraft({ ...revisionDraft, renderResultNotesThai: e.target.value })} />
          {(['geometry', 'material', 'lighting', 'prop', 'people', 'atmosphere', 'cropSize'] as const).map((k) => <input key={k} className="w-full rounded bg-neutral-900 p-2 text-xs" placeholder={`${k} issue`} value={revisionDraft.issues[k]} onChange={(e) => setRevisionDraft({ ...revisionDraft, issues: { ...revisionDraft.issues, [k]: e.target.value } })} />)}
          <button className="w-full rounded bg-blue-700 p-2 text-xs" onClick={onGenerateRevisionPrompt}>Generate Revision Prompt</button>
          <div className="max-h-40 space-y-1 overflow-auto">
            {(scene.revisionPrompts || []).map((r) => <div key={r.id} className="rounded bg-neutral-900 p-2 text-xs">
              <div className="font-semibold">{r.renderPassName}</div>
              <div>{new Date(r.createdAt).toLocaleString()}</div>
              <textarea className="mt-1 h-24 w-full rounded bg-neutral-800 p-1" value={r.prompt} readOnly />
              <button className="mt-1 rounded bg-neutral-700 px-2 py-1" onClick={() => navigator.clipboard.writeText(r.prompt)}>Copy</button>
            </div>)}
          </div>
        </div>}
      </aside>
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#0a0d16] p-4">
        {qcCompareActive ? <div className="flex flex-none flex-wrap items-center gap-2 rounded-[22px] border border-[#ff8800]/30 bg-white/[0.08] p-2 text-xs text-slate-100 shadow-[0_16px_45px_rgba(0,0,0,0.18)] ring-1 ring-white/10">
          <div className="mr-1 flex items-center gap-1.5 rounded-lg bg-[#fff7ed] px-2 py-1.5 font-black text-[#9a5000]">
            <ClipboardCheck className="h-4 w-4" />
            Review Mode
          </div>
          <select className="h-9 rounded-xl border border-white/10 bg-white/10 px-2 text-xs font-bold text-slate-100 outline-none" value={resultCompareMode} onChange={(e) => setResultCompareMode(e.target.value as any)}>
            <option value="slider">Before / After slider</option>
            <option value="overlay">Opacity overlay</option>
            <option value="side-by-side">Side by side</option>
            <option value="difference">Difference placeholder</option>
            <option value="base">Base only</option>
            <option value="result">Result only</option>
          </select>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-slate-300">{activeResultRound?.name}</span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${activeResultRound?.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : activeResultRound?.status === 'needs_revision' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{activeResultRound?.status?.replace(/_/g, ' ')}</span>
          <button className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 font-black text-emerald-700 transition hover:bg-emerald-50" onClick={() => activeResultRound && setQuickPreviewStatus(activeResultRound.id, 'approved')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve</button>
          <button className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-200 bg-white px-3 font-black text-amber-700 transition hover:bg-amber-50" onClick={() => activeResultRound && setQuickPreviewStatus(activeResultRound.id, 'needs_revision')}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Needs Revision</button>
          <button className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 font-black transition ${productionCommentMode === 'point' ? 'border-[#ff8800] bg-[#ff8800] text-white' : 'border-white/10 bg-white/10 text-slate-200 hover:border-[#ff8800]'}`} onClick={() => { setProductionCommentMode(productionCommentMode === 'point' ? 'off' : 'point'); setProductionStage('revise'); }}>Add Comment</button>
          <button className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 px-3 font-black text-slate-200 transition hover:border-[#ff8800]" onClick={() => processProductionCommentsWithCopilot(undefined, productionComments)}>Process Comments</button>
          <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff8800] px-3 font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)] transition hover:bg-[#e67800] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isQuickGenerating || Boolean(activeResultRound && productionComments.length > 0 && activeResultRound.agentRevisionPlan?.status !== 'applied')} title={activeResultRound && productionComments.length > 0 && activeResultRound.agentRevisionPlan?.status !== 'applied' ? 'Apply the Agent revision plan before generating a revision.' : undefined} onClick={() => createProductionPreview(activeResultRound)}>{isQuickGenerating ? 'Generating...' : activeResultRound ? productionComments.length > 0 ? 'Generate Revision' : 'Generate Again' : 'Generate Again'}</button>
          <button className="ml-auto inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 font-bold text-slate-200 transition hover:border-[#ff8800] hover:text-[#ffb15c]" onClick={backToMappingView}><MapPin className="mr-1 h-3.5 w-3.5" />Back to Mapping View</button>
        </div> : <div className="flex flex-none flex-wrap items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.08] p-2 text-xs text-slate-100 shadow-[0_16px_45px_rgba(0,0,0,0.18)] ring-1 ring-white/10">
          <div className="mr-1 hidden items-center gap-1.5 rounded-xl bg-white/10 px-2 py-1.5 font-bold text-slate-300 lg:flex">
            <Layers className="h-4 w-4" />
            Mapping Tools
          </div>
          <button data-testid="mapping-undo" className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2.5 font-bold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" onClick={undoMapping} disabled={mappingHistory.length === 0}>Undo</button>
          <button data-testid="mapping-redo" className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2.5 font-bold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" onClick={redoMapping} disabled={mappingFuture.length === 0}>Redo</button>
          {(['select', 'pin', 'rect', 'move', 'delete'] as CanvasTool[]).map((t) => {
            const Icon = toolMeta[t].icon;
            return <button key={t} data-testid={`tool-${t}`} onClick={() => setTool(t)} className={`inline-flex h-9 items-center justify-center rounded-xl border px-2.5 font-bold capitalize transition ${tool === t ? 'border-[#ff8800] bg-[#ff8800] text-white shadow-[0_8px_20px_rgba(255,136,0,0.25)] ring-1 ring-[#ff8800]/25' : 'border-white/10 bg-white/10 text-slate-200 hover:bg-white/15'}`} title={toolMeta[t].hint}><Icon className="mr-1 h-3.5 w-3.5" />{toolMeta[t].label}</button>;
          })}
          <button className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2.5 font-bold text-slate-200 transition hover:bg-white/15" onClick={() => setShowOverlay((v) => !v)}>{showOverlay ? 'Hide overlays' : 'Show overlays'}</button>
          <button data-testid="reset-view" className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-2.5 font-bold text-slate-200 transition hover:bg-white/15" onClick={fitToView}>Reset View</button>
          <button data-testid="reset-mapping" className="inline-flex h-9 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-2.5 font-bold text-red-300 transition hover:bg-red-500/15" onClick={resetMapping}>Reset Mapping</button>
          <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-2 py-1.5"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Zoom</span><input type="range" min={0.4} max={2.5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></div>
        </div>}
        {qcCompareActive ? <div className="mt-2 flex flex-none items-center justify-between rounded-lg border border-[#ff8800]/30 bg-[#fff7ed] px-3 py-2 text-xs text-[#9a5000]">
          <span className="font-semibold">Generated result is now the primary workspace. Compare, approve, revise, or generate again from here.</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black">{currentResultQc.clientReadyScore}/100 ready</span>
        </div> : <div className={`mt-2 flex flex-none items-center justify-between rounded-lg border px-3 py-2 text-xs ${tool === 'rect' ? 'border-[#ff8800]/40 bg-[#fff7ed] text-[#9a5000]' : tool === 'move' ? 'border-[#ff8800]/40 bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-white text-slate-600'}`}>
          <span className="font-semibold">{toolMeta[tool].hint}</span>
          {selectedSlot && <span className="rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: selectedSlot.color }}>{selectedSlot.code}</span>}
        </div>}
        <div className="mt-4 flex-1 min-h-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.07] shadow-[0_24px_90px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
        {qcCompareActive ? (
          <div data-testid="qc-compare-main" className="flex h-full min-h-0 flex-col bg-slate-950 p-4">
            <div className={`relative min-h-0 flex-1 overflow-hidden rounded-2xl border bg-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.45)] ${productionCommentMode === 'point' ? 'cursor-crosshair border-[#ff8800]' : 'border-slate-800'}`} onClick={handleProductionResultClick}>
              {(resultCompareMode === 'slider' || resultCompareMode === 'overlay' || resultCompareMode === 'base' || resultCompareMode === 'difference') && <img src={scene.baseImage} alt="base render large" className="absolute inset-0 h-full w-full object-contain" />}
              {resultCompareMode === 'slider' && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${resultCompareSplit}%)` }}>
                <img src={activeResultRound?.imageDataUrl} alt="ai result large" className="h-full w-full object-contain" />
              </div>}
              {resultCompareMode === 'slider' && <div className="absolute inset-y-0 bg-[#ff8800]" style={{ left: `${resultCompareSplit}%`, width: 3 }} />}
              {resultCompareMode === 'slider' && <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Base Render</div>}
              {resultCompareMode === 'slider' && <div className="absolute bottom-4 right-4 rounded-full bg-[#ff8800] px-3 py-1.5 text-xs font-black text-white">AI Result</div>}
              {resultCompareMode === 'overlay' && <img src={activeResultRound?.imageDataUrl} alt="ai result overlay large" className="absolute inset-0 h-full w-full object-contain" style={{ opacity: resultOverlayOpacity / 100 }} />}
              {resultCompareMode === 'side-by-side' && <div className="absolute inset-0 grid grid-cols-2 gap-px bg-slate-700">
                <div className="relative bg-slate-900"><img src={scene.baseImage} alt="base render side by side" className="absolute inset-0 h-full w-full object-contain" /><span className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Base</span></div>
                <div className="relative bg-slate-900"><img src={activeResultRound?.imageDataUrl} alt="ai result side by side" className="absolute inset-0 h-full w-full object-contain" /><span className="absolute bottom-4 right-4 rounded-full bg-[#ff8800] px-3 py-1.5 text-xs font-black text-white">Result</span></div>
              </div>}
              {resultCompareMode === 'difference' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-8 text-center text-sm font-bold text-white">
                Difference mode placeholder. Use slider, overlay, or side-by-side for manual visual QC in this MVP.
              </div>}
              {resultCompareMode === 'result' && <img src={activeResultRound?.imageDataUrl} alt="ai result only large" className="absolute inset-0 h-full w-full object-contain" />}
              {(activeResultRound?.productionComments || []).filter((comment) => comment.type === 'point').map((comment) => <button
                key={comment.id}
                type="button"
                data-testid="production-comment-marker"
                className={`absolute z-20 flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-black shadow-[0_10px_22px_rgba(0,0,0,0.35)] ${selectedProductionCommentId === comment.id ? 'border-white bg-[#ff8800] text-white ring-4 ring-[#ff8800]/30' : comment.status === 'resolved' ? 'border-emerald-200 bg-emerald-500 text-white' : 'border-white bg-slate-950 text-white'}`}
                style={{ left: `${(comment.x || 0) * 100}%`, top: `${(comment.y || 0) * 100}%` }}
                onClick={(event) => { event.stopPropagation(); setSelectedProductionCommentId(comment.id); setProductionStage('revise'); }}
                aria-label={`Open comment ${comment.number}`}
              >{comment.number}</button>)}
              {productionCommentMode === 'point' && <div className="pointer-events-none absolute inset-x-0 top-4 z-20 mx-auto w-fit rounded-full border border-[#ff8800]/40 bg-black/75 px-4 py-2 text-xs font-black text-white">Click the result image to place Comment {nextProductionCommentNumber()}</div>}
            </div>
            <div className="mt-3 flex flex-none flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs font-bold text-slate-200">
              {resultCompareMode === 'slider' && <label className="grid flex-1 grid-cols-[70px_1fr_42px] items-center gap-2"><span>Split</span><input type="range" min={0} max={100} value={resultCompareSplit} onChange={(e) => setResultCompareSplit(Number(e.target.value))} /><span>{resultCompareSplit}%</span></label>}
              {resultCompareMode === 'overlay' && <label className="grid flex-1 grid-cols-[70px_1fr_42px] items-center gap-2"><span>Opacity</span><input type="range" min={0} max={100} value={resultOverlayOpacity} onChange={(e) => setResultOverlayOpacity(Number(e.target.value))} /><span>{resultOverlayOpacity}%</span></label>}
              {resultCompareMode === 'side-by-side' && <span className="text-slate-300">Side-by-side compare is active. Base render stays left, generated result stays right.</span>}
              {resultCompareMode === 'difference' && <span className="text-slate-300">Difference placeholder is active. Note visible drift in the right inspector.</span>}
              {(resultCompareMode === 'base' || resultCompareMode === 'result') && <span className="text-slate-300">{resultCompareMode === 'base' ? 'Showing base render only.' : 'Showing generated result only.'}</span>}
              <button className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 text-xs font-black text-emerald-200" onClick={() => activeResultRound && setQuickPreviewStatus(activeResultRound.id, 'approved')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve</button>
              <button className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 text-xs font-black text-amber-200" onClick={() => activeResultRound && setQuickPreviewStatus(activeResultRound.id, 'needs_revision')}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Needs Revision</button>
              <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white" onClick={generateResultRevision}>Generate Revision Prompt</button>
              <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-black text-slate-100 disabled:cursor-not-allowed disabled:opacity-50" disabled={isQuickGenerating || Boolean(activeResultRound && productionComments.length > 0 && activeResultRound.agentRevisionPlan?.status !== 'applied')} title={activeResultRound && productionComments.length > 0 && activeResultRound.agentRevisionPlan?.status !== 'applied' ? 'Apply the Agent revision plan before generating a revision.' : undefined} onClick={() => createProductionPreview(activeResultRound)}><WandSparkles className="mr-1 h-3.5 w-3.5" />{isQuickGenerating ? 'Generating...' : activeResultRound ? productionComments.length > 0 ? 'Generate Revision' : 'Generate Again' : 'Generate Again'}</button>
            </div>
          </div>
        ) : showConversationalStudio && renderPassViewMode === 'basic' ? renderProductionFlow() : !imgObj ? (
          <div
            className={`flex h-full items-center justify-center rounded-md border-2 border-dashed p-8 text-center outline-none transition ${isBaseDragOver ? 'border-[#ff8800] bg-[#ff8800]/10' : 'border-neutral-300 bg-white'}`}
            onDragOver={onBaseDropZoneDragOver}
            onDragLeave={onBaseDropZoneDragLeave}
            onDrop={onBaseDropZoneDrop}
            tabIndex={0}
          >
            <div className="max-w-xl">
              <h2 className="mb-3 text-2xl font-semibold text-neutral-900">Start with a Base Image</h2>
              <p className="mb-5 text-neutral-600">Upload a SketchUp, massing, site photo, or base render image to begin mapping materials, props, lighting, and environment references.</p>
              <button type="button" className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-[#ff8800] px-8 text-base font-black text-white shadow-[0_12px_24px_rgba(255,136,0,0.32)] ring-1 ring-[#ff8800]/30 hover:bg-[#e67800]" onClick={() => baseImageInputRef.current?.click()}><ImagePlus className="mr-2 h-5 w-5" />Upload Base Image</button>
              <p className="mt-4 text-sm text-neutral-500">{isBaseDragOver ? 'Drop image to use as Base Image' : 'Drag and drop an image here, or paste from clipboard.'}</p>
            </div>
          </div>
        ) : <div data-testid="canvas-drop-zone" onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} className={`relative flex h-full min-h-0 items-center justify-center overflow-auto rounded-md bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5 ${slotDrag ? 'ring-2 ring-[#ff8800]/30' : ''}`}>
          {slotDrag && <div className={`pointer-events-none absolute inset-5 z-10 rounded-xl border-2 border-dashed ${slotDrag.overImage ? 'border-[#ff8800] bg-[#ff8800]/10' : 'border-slate-300 bg-white/20'}`} />}
          <Stage data-testid="mapping-stage" ref={stageRef} width={(imgObj?.width || 900) * zoom} height={(imgObj?.height || 600) * zoom} draggable={false} onClick={onCanvasClick} className="rounded-lg bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <Layer>{imgObj && <KonvaImage image={imgObj} width={imgObj.width * zoom} height={imgObj.height * zoom} />}</Layer>
          {showOverlay && <Layer>{scene.slots.map((s) => <Group key={s.id}>
            {s.regions.map((r) => {
              const isSelected = selectedObject?.id === r.id;
              const x = r.x * (imgObj?.width || 1) * zoom;
              const y = r.y * (imgObj?.height || 1) * zoom;
              const width = r.width * (imgObj?.width || 1) * zoom;
              const height = r.height * (imgObj?.height || 1) * zoom;
              return <Group key={r.id} x={x} y={y} draggable={tool === 'move' && isSelected} onClick={() => { setSelectedObject({ type: 'rect', slotId: s.id, id: r.id }); setSelectedSlotId(s.id); }} onDragStart={pushMappingHistory} onDragEnd={(e) => updateSlot(s.id, { regions: s.regions.map((item) => item.id === r.id ? { ...item, x: Math.min(1, Math.max(0, e.target.x() / ((imgObj?.width || 1) * zoom))), y: Math.min(1, Math.max(0, e.target.y() / ((imgObj?.height || 1) * zoom))) } : item) })}>
                <Rect width={width} height={height} fill={`${s.color}33`} stroke={isSelected ? '#ff8800' : s.color} strokeWidth={isSelected ? 4 : 2} dash={isSelected ? [] : [8, 5]} cornerRadius={4} shadowColor={isSelected ? '#ff8800' : 'transparent'} shadowBlur={isSelected ? 12 : 0} />
                <Rect x={8} y={8} width={42} height={22} fill={isSelected ? '#ff8800' : '#ffffff'} stroke={isSelected ? '#ff8800' : s.color} strokeWidth={1.5} cornerRadius={6} shadowColor="rgba(15,23,42,0.25)" shadowBlur={8} shadowOpacity={0.2} />
                <Text x={16} y={13} text={s.code} fontSize={12} fontStyle="bold" fill={isSelected ? '#ffffff' : '#0f172a'} />
              </Group>;
            })}
            {s.pins.map((p) => {
              const isSelected = selectedObject?.id === p.id;
              const pinX = p.x * (imgObj?.width || 1) * zoom;
              const pinY = p.y * (imgObj?.height || 1) * zoom;
              const label = isSelected ? `${s.code} ${s.name}` : s.code;
              const labelWidth = isSelected ? Math.min(170, Math.max(72, label.length * 7 + 30)) : 64;
              return <Group key={p.id} x={pinX} y={pinY} draggable={tool === 'move' && isSelected} onClick={() => { setSelectedObject({ type: 'pin', slotId: s.id, id: p.id }); setSelectedSlotId(s.id); }} onDragStart={pushMappingHistory} onDragEnd={(e) => updateSlot(s.id, { pins: s.pins.map((item) => item.id === p.id ? { ...item, x: Math.min(1, Math.max(0, e.target.x() / ((imgObj?.width || 1) * zoom))), y: Math.min(1, Math.max(0, e.target.y() / ((imgObj?.height || 1) * zoom))) } : item) })}>
                <Circle x={0} y={0} radius={isSelected ? 8 : 6} fill="#ffffff" stroke={isSelected ? '#ff8800' : s.color} strokeWidth={isSelected ? 4 : 3} shadowColor="rgba(15,23,42,0.35)" shadowBlur={8} shadowOpacity={0.25} />
                <Rect x={12} y={-16} width={labelWidth} height={26} fill={isSelected ? '#ff8800' : '#ffffff'} stroke={isSelected ? '#ff8800' : s.color} strokeWidth={1.5} cornerRadius={7} shadowColor="rgba(15,23,42,0.28)" shadowBlur={8} shadowOpacity={0.25} />
                <Rect x={12} y={-16} width={7} height={26} fill={s.color} cornerRadius={7} />
                <Text x={24} y={-10} width={labelWidth - 26} text={label} fontSize={13} fontStyle="bold" fill={isSelected ? '#ffffff' : '#0f172a'} ellipsis wrap="none" />
              </Group>;
            })}
          </Group>)}
          {draftRect && <Rect x={draftRect.x * (imgObj?.width || 1) * zoom} y={draftRect.y * (imgObj?.height || 1) * zoom} width={draftRect.width * (imgObj?.width || 1) * zoom} height={draftRect.height * (imgObj?.height || 1) * zoom} fill="#ff880022" stroke="#ff8800" strokeWidth={3} dash={[8, 5]} cornerRadius={4} />}
          </Layer>}
        </Stage></div>}
        </div>
        <div className="mt-3 grid flex-none grid-cols-3 gap-3">
          <button className={`rounded-2xl border p-3 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${bottomWorkspace === 'boards' ? 'border-[#ff8800] bg-[#fff7ed] ring-1 ring-[#ff8800]/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => { setBottomWorkspace('boards'); setActiveTab('boards'); }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Eye className="h-4 w-4 text-[#ff8800]" />Board Preview</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">{boardsGeneratedAt ? `Generated ${boardsGeneratedAt}` : 'Boards not generated yet'}</div>
          </button>
          <button className={`rounded-2xl border p-3 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${bottomWorkspace === 'prompt' ? 'border-[#ff8800] bg-[#fff7ed] ring-1 ring-[#ff8800]/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => setBottomWorkspace('prompt')}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><WandSparkles className="h-4 w-4 text-[#ff8800]" />Prompt Block</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">{scene.localPrompt ? `${scene.localPrompt.length} characters ready` : 'Create prompt draft'}</div>
          </button>
          <button className={`rounded-2xl border p-3 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${bottomWorkspace === 'json' ? 'border-[#ff8800] bg-[#fff7ed] ring-1 ring-[#ff8800]/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => { setBottomWorkspace('json'); setActiveTab('ai-prompt'); }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><FileJson className="h-4 w-4 text-[#ff8800]" />JSON Package</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">{scene.promptPackages?.length || 0} imported prompt packages</div>
          </button>
        </div>
        <div className="mt-3 flex-none rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {bottomWorkspace === 'boards' && <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Board Preview Workspace</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{boardsGeneratedAt ? `Generated at ${boardsGeneratedAt}` : 'Boards are not generated yet.'}</div>
            </div>
            <div className="flex items-center gap-2">
              <select className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm" value={selectedBoardKey} onChange={(e) => setSelectedBoardKey(e.target.value)}>
                {boardOptions.map((board) => <option key={board.key} value={board.key}>{board.label}</option>)}
              </select>
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[#ff8800] px-4 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)]" onClick={() => createBoards()}>Generate Boards</button>
            </div>
          </div>}
          {bottomWorkspace === 'boards' && boardsPreview[selectedBoardKey] && <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            <img src={boardsPreview[selectedBoardKey]} alt="selected board preview" className="mx-auto max-h-[240px] rounded border border-slate-200 bg-white object-contain" />
          </div>}
          {bottomWorkspace === 'boards' && !boardsPreview[selectedBoardKey] && <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No board preview yet. Generate boards to view the selected board here.</div>}
          {bottomWorkspace === 'prompt' && <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Prompt Block Workspace</div>
              <div className="mt-1 line-clamp-2 text-sm text-slate-700">{scene.localPrompt || 'No local prompt yet. Generate one from current slots and mapping.'}</div>
            </div>
            <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700" onClick={scene.localPrompt ? onCopyPrompt : onGeneratePrompt}>{scene.localPrompt ? 'Copy Prompt' : 'Generate Prompt'}</button>
          </div>}
          {bottomWorkspace === 'json' && <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">JSON Package Workspace</div>
              <div className="mt-1 text-sm text-slate-700">Package status: {scene.packageStatus}. Imported prompt packages: {scene.promptPackages?.length || 0}. Active: {activePromptPackage?.assistantName || activePromptPackage?.name || 'none'}.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button data-testid="open-ai-prompt" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700" onClick={() => openAiPromptViewer()}>Open AI Prompt</button>
              <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700" onClick={previewRenderHandoffBoard}>Preview Handoff Board</button>
              <button data-testid="export-render-handoff-workspace" disabled={!scene.baseImage} className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold ${scene.baseImage ? 'border-[#ff8800] bg-[#ff8800] text-white shadow-[0_8px_16px_rgba(255,136,0,0.25)]' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`} onClick={exportRenderHandoffPack}>Export Render Handoff Pack</button>
            </div>
          </div>}
          {bottomWorkspace === 'json' && handoffPreview && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Render Handoff Preview</div>
            <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-1">
              <img src={handoffPreview} alt="render handoff visual instruction board" className="mx-auto rounded border border-slate-200 bg-white object-contain" />
            </div>
          </div>}
        </div>
      </section>
      <aside ref={rightInspectorRef} className="h-full min-h-0 overflow-y-auto border-l border-white/10 bg-[#0d111c] p-4 text-slate-100">
        {activeTab === 'render-pass' && <div className="space-y-3">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.07] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white">Render Pass Builder</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">Base Render = Source of Truth. AI acts as photographer and retoucher.</p>
              </div>
              <span className="rounded-full border border-[#ff8800]/30 bg-[#fff7ed] px-2 py-1 text-[11px] font-black text-[#9a5000]">v0.5</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-slate-400">
              {['Upload', 'Lock', 'Pass', 'Export'].map((step, index) => <div key={step} className={`rounded-xl border px-1 py-2 ${index === 0 && scene.baseImage ? 'border-[#ff8800] bg-[#ff8800] text-white' : index === 2 && renderPassGenerated.length ? 'border-[#ff8800] bg-[#ff8800] text-white' : 'border-white/10 bg-white/8'}`}>{index + 1}. {step}</div>)}
            </div>
            {renderPassViewMode === 'basic' && <div className="mt-3 rounded-2xl border border-white/10 bg-white/8 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Production Stepper</span>
                <span className="text-[11px] font-bold text-slate-400">{generatedPassCount} generated / {approvedPassCount} approved</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {renderPassTimeline.map((step) => {
                  const pass = renderPassState.passes.find((item) => item.type === step.type);
                  const active = renderPassState.selectedPassType === step.type;
                  const generated = Boolean(pass && (pass.prompt || getActivePromptVersion(pass)));
                  return <button key={step.type} className={`rounded-full border px-2 py-1 text-[10px] font-black transition ${active ? 'border-[#ff8800] bg-[#ff8800] text-white' : generated ? 'border-[#ff8800]/40 bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-white text-slate-500'}`} onClick={() => updateRenderPassBuilder({ selectedPassType: step.type })}>
                    {step.label.replace('Architecture', 'Arch').replace('Environment', 'Env')}{pass?.approvedVersionId ? ' ✓' : ''}
                  </button>;
                })}
              </div>
            </div>}
            {!scene.baseImage && <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs font-semibold leading-5 text-amber-200">Upload a base render first.</div>}
            {allDesignLocksDisabled && <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs font-semibold leading-5 text-red-200">No design locks selected. AI may redesign the scene.</div>}
          </div>

          {renderPassViewMode === 'advanced' && <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">AI Scene Composer Settings</h4>
                <p className="mt-1 text-xs text-slate-500">Client-side Gemini analysis only. No image generation.</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${geminiApiKey ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{geminiApiKey ? 'Connected' : 'Missing key'}</span>
            </div>
            <input className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" type="password" placeholder="Gemini API key" value={geminiKeyDraft} onChange={(e) => setGeminiKeyDraft(e.target.value)} />
            <p className="mt-1 text-[11px] text-slate-500">Stored locally on this device. Never exported.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="h-8 rounded-md bg-[#ff8800] text-xs font-black text-white" onClick={saveGeminiKey}>Save Key</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700" onClick={clearGeminiKey}>Clear Key</button>
            </div>
            <label className="mt-2 block text-[11px] font-black uppercase tracking-wide text-slate-500">Gemini model</label>
            <select className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.aiComposer.model || 'gemini-2.5-flash'} onChange={(e) => updateRenderPassBuilder({ aiComposer: { ...renderPassState.aiComposer, model: e.target.value } })}>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
            </select>
            <label className="mt-2 inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] hover:bg-[#fff7ed]">
              Add Composer References
              <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => addComposerReferences(e.target.files)} />
            </label>
            <div className="mt-2 max-h-56 space-y-2 overflow-auto">
              {renderPassState.aiComposer.references.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-500">No mood/reference images yet.</div> : renderPassState.aiComposer.references.map((ref) => <div key={ref.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex gap-2">
                  <img src={ref.dataUrl} alt={ref.name} className="h-12 w-12 rounded-md object-cover" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <input className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-bold" value={ref.name} onChange={(e) => updateComposerReference(ref.id, { name: e.target.value })} />
                    <select className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px]" value={ref.role} onChange={(e) => updateComposerReference(ref.id, { role: e.target.value as SceneReferenceImage['role'] })}>
                      {sceneReferenceRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                  <button className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-700" onClick={() => removeComposerReference(ref.id)}>x</button>
                </div>
                <input className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px]" placeholder="Reference notes" value={ref.notes || ''} onChange={(e) => updateComposerReference(ref.id, { notes: e.target.value })} />
                <label className="mt-1 flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <input type="checkbox" checked={ref.included !== false} onChange={(e) => updateComposerReference(ref.id, { included: e.target.checked })} />
                  Include in Gemini analysis
                </label>
              </div>)}
            </div>
            <button className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isGeminiLoading || !scene.baseImage} onClick={runGeminiComposer}>{isGeminiLoading ? 'Analyzing...' : 'Analyze & Compose with Gemini'}</button>
            {renderPassState.aiComposer.lastError && <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">{renderPassState.aiComposer.lastError}</div>}
            {renderPassState.aiComposer.lastRawResponse && !renderPassState.aiComposer.lastResponse && <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px]">{renderPassState.aiComposer.lastRawResponse}</pre>}
          </div>}

          {composerResponse && <div className="rounded-xl border border-[#ff8800]/30 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-[#9a5000]">AI Scene Composer Review</h4>
                <p className="mt-1 text-xs text-slate-500">Suggestion-level context. Nothing is auto-applied.</p>
              </div>
              <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[10px] font-black text-[#9a5000]">{composerResponse.confidence?.overall ?? '-'}%</span>
            </div>
            <div className="mt-2 space-y-2 text-xs text-slate-700">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Scene Analysis:</b> {composerResponse.sceneAnalysis?.cameraSummary || composerResponse.sceneAnalysis?.compositionSummary || 'No scene summary.'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Detected Protected Assets:</b> {(composerResponse.sceneAnalysis?.protectedAssetsVisible || []).join(', ') || '-'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Lighting:</b> {composerResponse.recommendedDirection?.lightingDirection || composerResponse.sceneAnalysis?.lightingCondition || '-'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Environment:</b> {composerResponse.recommendedDirection?.environmentDirection || composerResponse.sceneAnalysis?.environmentCondition || '-'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Material Zones:</b> {(composerResponse.sceneAnalysis?.materialZones || []).map((zone) => `${zone.name}${zone.recommendedDirection ? `: ${zone.recommendedDirection}` : ''}`).join(' | ') || '-'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Hallucination Risks:</b> {(composerResponse.sceneAnalysis?.hallucinationRisks || []).join(', ') || '-'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Pass Plan:</b> {(composerResponse.passPlan || []).map((item) => `${item.pass}${item.priority ? ` #${item.priority}` : ''}`).join(', ') || '-'}</div>
              {composerResponse.renderPassInputAnalysis?.objectIdMap?.length && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Object ID Map:</b> {composerResponse.renderPassInputAnalysis.objectIdMap.map((item) => `${item.colorHex || ''} ${item.inferredObjectName}${item.preservePriority ? ` (${item.preservePriority})` : ''}`).join(' | ')}</div>}
              {composerResponse.renderPassInputAnalysis?.materialIdMap?.length && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Material ID Map:</b> {composerResponse.renderPassInputAnalysis.materialIdMap.map((item) => `${item.colorHex || ''} ${item.materialName}${item.recommendedDirection ? `: ${item.recommendedDirection}` : ''}`).join(' | ')}</div>}
              {composerResponse.renderPassInputAnalysis?.depthAnalysis && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Depth Analysis:</b> {composerResponse.renderPassInputAnalysis.depthAnalysis.atmosphereNotes || 'Depth zones returned.'}</div>}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><b>Generated Prompt:</b><pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap font-mono text-[11px]">{composerResponse.promptPackage?.fullPrompt || 'No prompt returned.'}</pre></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="h-8 rounded-md border border-[#ff8800] bg-white px-2 text-[11px] font-black text-[#9a5000]" onClick={applyComposerDetectedAssets}>Apply Detected Assets</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={() => applyComposerDirections('material')}>Apply Materials</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={() => applyComposerDirections('lighting')}>Apply Lighting</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={() => applyComposerDirections('environment')}>Apply Environment</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={applyComposerObjectIdMap}>Apply Object ID Map</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={applyComposerMaterialIdMap}>Apply Material ID Map</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={applyComposerDepthNotes}>Apply Depth Notes</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={applyComposerPassPlan}>Apply Pass Plan</button>
              <button className="h-8 rounded-md bg-[#ff8800] px-2 text-[11px] font-black text-white" onClick={saveComposerPromptVersion}>Save Prompt Version</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={() => navigator.clipboard.writeText(JSON.stringify(composerResponse, null, 2))}>Copy JSON</button>
              <button className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" onClick={() => navigator.clipboard.writeText(composerResponse.promptPackage?.fullPrompt || '')}>Copy Generated Prompt</button>
            </div>
          </div>}

          {renderPassViewMode === 'advanced' && <>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Phase 1 - Site Analysis</h4>
                <p className="mt-1 text-xs text-slate-500">Analyze uploaded real site photos only. No image generation.</p>
              </div>
              <button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-2 text-[11px] font-black text-[#9a5000]" onClick={() => generateAnalysisPrompt('site')}>Generate Analysis Prompt</button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {siteContextRows.map(([key, label, placeholder]) => <label key={String(key)} className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                <textarea className="h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder={placeholder} value={String(renderPassState.siteContext[key] || '')} onChange={(e) => updateRenderPassBuilderNested('siteContext', { [key]: e.target.value, updatedAt: new Date().toISOString() } as any)} />
              </label>)}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Site analysis notes</span>
                <textarea className="h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Paste or summarize AI analysis result here..." value={renderPassState.siteContext.analysisNotes} onChange={(e) => updateRenderPassBuilderNested('siteContext', { analysisNotes: e.target.value, updatedAt: new Date().toISOString() })} />
              </label>
              {renderPassState.siteContext.generatedAnalysisPrompt && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Site analysis prompt</span>
                  <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700" onClick={() => copyKnowledgePrompt(renderPassState.siteContext.generatedAnalysisPrompt)}>Copy</button>
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{renderPassState.siteContext.generatedAnalysisPrompt}</pre>
              </div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Phase 2 - Architecture Analysis</h4>
                <p className="mt-1 text-xs text-slate-500">Analyze base render as source of truth. Extract what must be locked.</p>
              </div>
              <button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-2 text-[11px] font-black text-[#9a5000]" onClick={() => generateAnalysisPrompt('architecture')}>Generate Analysis Prompt</button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {architectureContextRows.map(([key, label, placeholder]) => <label key={String(key)} className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                <textarea className="h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder={placeholder} value={String(renderPassState.architectureContext[key] || '')} onChange={(e) => updateRenderPassBuilderNested('architectureContext', { [key]: e.target.value, updatedAt: new Date().toISOString() } as any)} />
              </label>)}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Architecture analysis notes</span>
                <textarea className="h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Paste or summarize AI architecture analysis result here..." value={renderPassState.architectureContext.analysisNotes} onChange={(e) => updateRenderPassBuilderNested('architectureContext', { analysisNotes: e.target.value, updatedAt: new Date().toISOString() })} />
              </label>
              <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white shadow-sm" onClick={generateArchitectureLock}>Generate Architecture Lock + Protected Assets</button>
              {renderPassState.architectureContext.generatedAnalysisPrompt && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Architecture analysis prompt</span>
                  <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700" onClick={() => copyKnowledgePrompt(renderPassState.architectureContext.generatedAnalysisPrompt)}>Copy</button>
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{renderPassState.architectureContext.generatedAnalysisPrompt}</pre>
              </div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Phase 3 - Brand Analysis</h4>
                <p className="mt-1 text-xs text-slate-500">Optional references become Brand DNA. Still no image generation.</p>
              </div>
              <button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-2 text-[11px] font-black text-[#9a5000]" onClick={() => generateAnalysisPrompt('brand')}>Generate Analysis Prompt</button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {brandContextRows.map(([key, label, placeholder]) => <label key={String(key)} className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                <textarea className="h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder={placeholder} value={String(renderPassState.brandContext[key] || '')} onChange={(e) => updateRenderPassBuilderNested('brandContext', { [key]: e.target.value, updatedAt: new Date().toISOString() } as any)} />
              </label>)}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Brand analysis notes</span>
                <textarea className="h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Paste or summarize AI brand analysis result here..." value={renderPassState.brandContext.analysisNotes} onChange={(e) => updateRenderPassBuilderNested('brandContext', { analysisNotes: e.target.value, updatedAt: new Date().toISOString() })} />
              </label>
              {renderPassState.brandContext.generatedAnalysisPrompt && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Brand analysis prompt</span>
                  <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700" onClick={() => copyKnowledgePrompt(renderPassState.brandContext.generatedAnalysisPrompt)}>Copy</button>
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{renderPassState.brandContext.generatedAnalysisPrompt}</pre>
              </div>}
            </div>
          </div>

          <div className="rounded-xl border border-[#ff8800]/30 bg-[#fff7ed] p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-[#9a5000]">Phase 4 - Knowledge Lock</h4>
                <p className="mt-1 text-xs text-slate-700">Merge Site, Architecture, and Brand into the Project Knowledge Base.</p>
              </div>
              <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white" onClick={lockProjectKnowledge}>Lock Knowledge</button>
            </div>
            <div className="mt-2 rounded-lg border border-white bg-white p-2">
              <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Project Knowledge Base</div>
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{renderPassState.projectKnowledgeBase.summary || 'Not locked yet. Complete analysis fields, then click Lock Knowledge.'}</pre>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Knowledge Confidence</h4>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {confidenceRows.map(([key, label]) => <label key={String(key)} className="grid grid-cols-[92px_1fr_42px] items-center gap-2 text-xs font-semibold text-slate-700">
                <span>{label}</span>
                <input type="range" min={0} max={100} value={renderPassState.knowledgeConfidence[key]} onChange={(e) => updateRenderPassBuilder({ knowledgeConfidence: { ...renderPassState.knowledgeConfidence, [key]: Number(e.target.value) } })} />
                <span className="text-right font-black text-[#9a5000]">{renderPassState.knowledgeConfidence[key]}%</span>
              </label>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Camera System</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.cameraSystem.view} onChange={(e) => updateRenderPassBuilder({ cameraSystem: { ...renderPassState.cameraSystem, view: e.target.value as any } })}>{cameraViewOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.cameraSystem.lens} onChange={(e) => updateRenderPassBuilder({ cameraSystem: { ...renderPassState.cameraSystem, lens: Number(e.target.value) as any } })}>{lensOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>
            <input className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Camera height" value={renderPassState.cameraSystem.height} onChange={(e) => updateRenderPassBuilder({ cameraSystem: { ...renderPassState.cameraSystem, height: e.target.value } })} />
            <input className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Perspective" value={renderPassState.cameraSystem.perspective} onChange={(e) => updateRenderPassBuilder({ cameraSystem: { ...renderPassState.cameraSystem, perspective: e.target.value } })} />
            <textarea className="mt-2 h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Composition notes" value={renderPassState.cameraSystem.compositionNotes} onChange={(e) => updateRenderPassBuilder({ cameraSystem: { ...renderPassState.cameraSystem, compositionNotes: e.target.value } })} />
            <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={renderPassState.cameraSystem.locked} onChange={(e) => updateRenderPassBuilder({ cameraSystem: { ...renderPassState.cameraSystem, locked: e.target.checked } })} />Camera locked</label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Visual Direction Library</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {visualDirectionPresetOptions.map((option) => <button key={option.value} className={`rounded-lg border p-2 text-left text-[11px] font-black ${renderPassState.visualDirectionPreset === option.value ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-700'}`} onClick={() => updateRenderPassBuilder({ visualDirectionPreset: option.value })}>{option.label}</button>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Environment Library</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {environmentLibraryOptions.map((option) => <button key={option.value} className={`rounded-lg border p-2 text-left text-[11px] font-black ${renderPassState.environmentLibraryPreset === option.value ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-slate-50 text-slate-700'}`} onClick={() => updateRenderPassBuilder({ environmentLibraryPreset: option.value })}>{option.label}</button>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Lighting Graph</h4>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {lightingGraphRows.map(([key, label]) => <label key={String(key)} className="grid grid-cols-[110px_1fr_36px] items-center gap-2 text-xs font-semibold text-slate-700">
                <span>{label}</span>
                <input type="range" min={0} max={100} value={Number(renderPassState.lightingGraph[key] || 0)} onChange={(e) => updateRenderPassBuilder({ lightingGraph: { ...renderPassState.lightingGraph, [key]: Number(e.target.value) } })} />
                <span className="text-right font-black text-[#9a5000]">{Number(renderPassState.lightingGraph[key] || 0)}</span>
              </label>)}
            </div>
            <textarea className="mt-2 h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Lighting graph notes" value={renderPassState.lightingGraph.notes} onChange={(e) => updateRenderPassBuilder({ lightingGraph: { ...renderPassState.lightingGraph, notes: e.target.value } })} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Material Profiles</h4>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {materialProfileRows.map(([key, label]) => <label key={String(key)} className="grid grid-cols-[110px_1fr_36px] items-center gap-2 text-xs font-semibold text-slate-700">
                <span>{label}</span>
                <input type="range" min={0} max={100} value={renderPassState.materialProfiles[key]} onChange={(e) => updateRenderPassBuilder({ materialProfiles: { ...renderPassState.materialProfiles, [key]: Number(e.target.value) } })} />
                <span className="text-right font-black text-[#9a5000]">{renderPassState.materialProfiles[key]}</span>
              </label>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Design Lock</h4>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {designLockRows.map(([key, label]) => <label key={String(key)} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={Boolean(renderPassState.designLock[key])} onChange={(e) => updateRenderPassBuilderNested('designLock', { [key]: e.target.checked } as any)} />
                {label}
              </label>)}
            </div>
            <textarea className="mt-2 h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Custom preserve notes" value={renderPassState.designLock.customPreserveNotes} onChange={(e) => updateRenderPassBuilderNested('designLock', { customPreserveNotes: e.target.value })} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Production Timeline</h4>
                <p className="mt-1 text-xs text-slate-500">{generatedPassCount}/{renderPassState.passes.length} generated - {approvedPassCount} approved</p>
              </div>
              <span className="rounded-full border border-[#ff8800]/30 bg-[#fff7ed] px-2 py-1 text-[11px] font-black text-[#9a5000]">{renderPassState.selectedModelAdapter || 'generic'}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {renderPassTimeline.map((step) => {
                const pass = renderPassState.passes.find((item) => item.type === step.type);
                const isActive = renderPassState.selectedPassType === step.type;
                return <button key={step.type} className={`rounded-xl border p-2 text-left transition ${isActive ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000] shadow-[0_8px_18px_rgba(255,136,0,0.14)]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#ff8800]/40 hover:bg-white'}`} onClick={() => updateRenderPassBuilder({ selectedPassType: step.type })}>
                  <div className="text-xs font-black">{step.label}</div>
                  <div className="mt-1 truncate text-[10px] font-bold opacity-80">{pass?.status || 'not_started'}</div>
                </button>;
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Pass Checklist</h4>
            <div className="mt-2 space-y-1">
              {renderPassState.passes.map((pass) => <div key={pass.type} className={`rounded-lg border p-2 ${renderPassState.selectedPassType === pass.type ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-slate-50'}`}>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <input type="checkbox" checked={pass.enabled} onChange={(e) => updateRenderPassBuilder({ passes: renderPassState.passes.map((item) => item.type === pass.type ? { ...item, enabled: e.target.checked } : item) })} />
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => updateRenderPassBuilder({ selectedPassType: pass.type })}>{pass.title}</button>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{pass.status}</span>
                </label>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{renderPassObjectives[pass.type]}</p>
              </div>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Visual Modes</h4>
            <div className="mt-2 space-y-2">
              <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.visualDirectionMode} onChange={(e) => updateRenderPassBuilder({ visualDirectionMode: e.target.value as any })}>{visualDirectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.lightingMode} onChange={(e) => updateRenderPassBuilder({ lightingMode: e.target.value as any })}>{lightingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.environmentMode} onChange={(e) => updateRenderPassBuilder({ environmentMode: e.target.value as any })}>{environmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.materialEnhancementLevel} onChange={(e) => updateRenderPassBuilder({ materialEnhancementLevel: e.target.value as any })}>{materialLevelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs" value={renderPassState.peopleActivityLayer} onChange={(e) => updateRenderPassBuilder({ peopleActivityLayer: e.target.value as any })}>{peopleLayerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1">
              {materialTargetRows.map(([key, label]) => <label key={String(key)} className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                <input type="checkbox" checked={Boolean(renderPassState.materialTargets[key])} onChange={(e) => updateRenderPassBuilderNested('materialTargets', { [key]: e.target.checked } as any)} />
                {label}
              </label>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(255,136,0,0.24)] hover:bg-[#e67800]" onClick={onGenerateRenderPassPrompts}><WandSparkles className="mr-2 h-4 w-4" />Generate Pass Prompts</button>
            {!renderPassState.passes.some((pass) => pass.enabled) && <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">Select at least one pass.</div>}
            {!renderPassGenerated.length && <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">No prompt generated yet.</div>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={exportJarvisReviewPack}>Export Jarvis Review Pack</button>
              <button className="inline-flex h-9 items-center justify-center rounded-lg border border-[#ff8800] bg-[#fff7ed] px-2 text-xs font-bold text-[#9a5000] hover:bg-[#fff2e0]" onClick={exportRenderHandoffPack}>Export Render Handoff Pack</button>
            </div>
          </div>

          </>}

          <div data-testid="result-qc-panel" className="rounded-xl border border-[#ff8800]/30 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-[#9a5000]">Result QC / Overlay Review</h4>
                <p className="mt-1 text-xs text-slate-500">Result images are stored locally in this browser. Nothing is uploaded unless you explicitly use an API action.</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${currentResultQc.hallucinationRisk === 'low' ? 'bg-emerald-50 text-emerald-700' : currentResultQc.hallucinationRisk === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{currentResultQc.hallucinationRisk} risk</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)]">
                Import AI Result
                <input data-testid="import-ai-result-input" className="hidden" type="file" accept="image/*" onChange={(e) => importResultImage(e.target.files?.[0])} />
              </label>
              <select className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" value={activeResultRound?.id || ''} onChange={(e) => updateRenderPassBuilder({ activeResultRoundId: e.target.value })}>
                {renderPassState.resultRounds.length === 0 ? <option value="">No result rounds</option> : renderPassState.resultRounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}
              </select>
            </div>

            {activeResultRound ? <div className="mt-3 space-y-3">
              <div className="grid grid-cols-[72px_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <img src={activeResultRound.imageDataUrl} alt={activeResultRound.name} className="h-14 w-16 rounded-md object-cover" />
                <div className="min-w-0">
                  <input className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-black text-slate-900" value={activeResultRound.name} onChange={(e) => updateResultRound(activeResultRound.id, { name: e.target.value })} />
                  <div className="mt-1 truncate text-[11px] text-slate-500">{activeResultRound.sourcePassType || 'unknown pass'} {activeResultRound.sourcePromptVersionNumber ? `v${activeResultRound.sourcePromptVersionNumber}` : ''} - {activeResultRound.sourceAdapter || 'generic'}</div>
                  <select className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" value={activeResultRound.status} onChange={(e) => updateResultRound(activeResultRound.id, { status: e.target.value as ResultRound['status'] })}>
                    <option value="needs_qc">Needs QC</option>
                    <option value="approved">Approved</option>
                    <option value="needs_revision">Needs Revision</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <button className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-700" onClick={() => deleteResultRound(activeResultRound.id)}>Delete</button>
              </div>

              {scene.baseImage ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Mini Compare Preview</div>
                  <select className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700" value={resultCompareMode} onChange={(e) => setResultCompareMode(e.target.value as any)}>
                    <option value="slider">Before / After slider</option>
                    <option value="overlay">Opacity overlay</option>
                    <option value="side-by-side">Side-by-side</option>
                    <option value="difference">Difference placeholder</option>
                    <option value="result">Result only</option>
                    <option value="base">Base only</option>
                  </select>
                </div>
                <div className="relative h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
                  {(resultCompareMode === 'slider' || resultCompareMode === 'overlay' || resultCompareMode === 'base' || resultCompareMode === 'difference') && <img src={scene.baseImage} alt="base render" className="absolute inset-0 h-full w-full object-contain" />}
                  {resultCompareMode === 'slider' && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${resultCompareSplit}%)` }}>
                    <img src={activeResultRound.imageDataUrl} alt="ai result" className="h-full w-full object-contain" />
                  </div>}
                  {resultCompareMode === 'slider' && <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-black text-white">Base</div>}
                  {resultCompareMode === 'slider' && <div className="absolute bottom-2 right-2 rounded bg-[#ff8800] px-2 py-1 text-[10px] font-black text-white">Result</div>}
                  {resultCompareMode === 'overlay' && <img src={activeResultRound.imageDataUrl} alt="ai result overlay" className="absolute inset-0 h-full w-full object-contain" style={{ opacity: resultOverlayOpacity / 100 }} />}
                  {resultCompareMode === 'side-by-side' && <div className="absolute inset-0 grid grid-cols-2 gap-px bg-slate-300">
                    <div className="relative bg-slate-200"><img src={scene.baseImage} alt="base render" className="absolute inset-0 h-full w-full object-contain" /><span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-black text-white">Base</span></div>
                    <div className="relative bg-slate-200"><img src={activeResultRound.imageDataUrl} alt="ai result" className="absolute inset-0 h-full w-full object-contain" /><span className="absolute bottom-2 right-2 rounded bg-[#ff8800] px-2 py-1 text-[10px] font-black text-white">Result</span></div>
                  </div>}
                  {resultCompareMode === 'difference' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 p-4 text-center text-xs font-bold text-white">
                    Difference mode placeholder: use this view to manually note added, removed, modified, or moved elements. Pixel diff/masks are planned for a later phase.
                  </div>}
                  {resultCompareMode === 'result' && <img src={activeResultRound.imageDataUrl} alt="ai result" className="absolute inset-0 h-full w-full object-contain" />}
                </div>
                {resultCompareMode === 'slider' && <label className="mt-2 grid grid-cols-[52px_1fr_36px] items-center gap-2 text-[11px] font-bold text-slate-600"><span>Split</span><input type="range" min={0} max={100} value={resultCompareSplit} onChange={(e) => setResultCompareSplit(Number(e.target.value))} /><span>{resultCompareSplit}%</span></label>}
                {resultCompareMode === 'overlay' && <label className="mt-2 grid grid-cols-[52px_1fr_36px] items-center gap-2 text-[11px] font-bold text-slate-600"><span>Opacity</span><input type="range" min={0} max={100} value={resultOverlayOpacity} onChange={(e) => setResultOverlayOpacity(Number(e.target.value))} /><span>{resultOverlayOpacity}%</span></label>}
              </div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">Upload a base render to compare against this result.</div>}
              {renderPassInputSummary.objectId && <div className="rounded-lg border border-[#ff8800]/30 bg-[#fff7ed] p-2 text-xs font-semibold text-[#9a5000]">Use Object ID Pass to check whether protected object boundaries, count, and placement changed.</div>}
              {renderPassInputSummary.materialId && <div className="rounded-lg border border-[#ff8800]/30 bg-[#fff7ed] p-2 text-xs font-semibold text-[#9a5000]">Use Material ID Pass to check whether material zones were preserved.</div>}

              <div data-testid="production-comments-panel" className="rounded-xl border border-[#ff8800]/25 bg-[#fff7ed] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-[#9a5000]">Numbered Comments</div>
                    <p className="mt-1 text-xs font-semibold text-[#9a5000]/80">Click Add Comment, then click the result image. Global notes can be added here.</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#9a5000]">{productionComments.length}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-black ${productionCommentMode === 'point' ? 'bg-[#ff8800] text-white' : 'border border-[#ff8800]/30 bg-white text-[#9a5000]'}`} onClick={() => setProductionCommentMode(productionCommentMode === 'point' ? 'off' : 'point')}>Add Point Comment</button>
                  <button className="inline-flex h-9 items-center justify-center rounded-lg border border-[#ff8800]/30 bg-white px-3 text-xs font-black text-[#9a5000]" onClick={() => { setProductionCommentMode('global'); setProductionStage('revise'); }}>Global Comment</button>
                </div>
                {productionCommentMode === 'point' && <textarea className="mt-2 h-16 w-full rounded-lg border border-[#ff8800]/30 bg-white p-2 text-xs text-slate-800" placeholder="Type comment, then click the result image..." value={productionCommentDraft} onChange={(e) => setProductionCommentDraft(e.target.value)} />}
                {productionCommentMode === 'global' && <div className="mt-2 space-y-2">
                  <textarea className="h-16 w-full rounded-lg border border-[#ff8800]/30 bg-white p-2 text-xs text-slate-800" placeholder="Global comment for the whole result..." value={productionGlobalCommentDraft} onChange={(e) => setProductionGlobalCommentDraft(e.target.value)} />
                  <button className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white" onClick={() => addProductionComment('global')}>Add Global Comment</button>
                </div>}
                <div className="mt-2 rounded-lg border border-[#ff8800]/20 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Reference for next comment</span>
                    <label className="inline-flex h-7 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2 text-[10px] font-black text-slate-700">Attach
                      <input className="hidden" type="file" accept="image/*" onChange={(event) => attachProductionReference(event.target.files?.[0])} />
                    </label>
                  </div>
                  {productionReferenceDraft ? <div className="flex items-center gap-2 text-xs text-slate-700"><img src={productionReferenceDraft.dataUrl} alt={productionReferenceDraft.name} className="h-10 w-10 rounded object-cover" /><span className="min-w-0 flex-1 truncate">{productionReferenceDraft.name}</span><button className="text-red-600" onClick={() => setProductionReferenceDraft(null)}>Remove</button></div> : <div className="text-xs text-slate-500">Optional: attach material/color/texture guidance for the next comment.</div>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {productionCommentScopeOptions.map((scope) => <button key={scope.value} className={`rounded-full border px-2 py-1 text-[10px] font-black ${productionReferenceScopes.includes(scope.value) ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-white text-slate-500'}`} onClick={() => toggleProductionReferenceScope(scope.value)}>{scope.label}</button>)}
                  </div>
                </div>
                <div className="mt-2 max-h-56 space-y-2 overflow-auto">
                  {productionComments.length === 0 ? <div className="rounded-lg border border-dashed border-[#ff8800]/30 bg-white p-3 text-xs text-slate-500">No comments yet.</div> : productionComments.map((comment) => <div key={comment.id} className={`rounded-lg border p-2 ${selectedProductionCommentId === comment.id ? 'border-[#ff8800] bg-white' : 'border-slate-200 bg-white/80'}`}>
                    <div className="flex items-start gap-2">
                      <button className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-black ${comment.status === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-white'}`} onClick={() => setSelectedProductionCommentId(comment.id)}>{comment.number}</button>
                      <textarea className="min-h-14 flex-1 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800" value={comment.text} onChange={(e) => updateProductionComment(comment.id, { text: e.target.value })} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] font-black">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{comment.type}</span>
                      {comment.referenceName && <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[#9a5000]">ref: {comment.referenceName}</span>}
                      <button className="ml-auto rounded border border-emerald-200 bg-white px-2 py-1 text-emerald-700" onClick={() => updateProductionComment(comment.id, { status: comment.status === 'resolved' ? 'open' : 'resolved' })}>{comment.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
                      <button className="rounded border border-red-200 bg-white px-2 py-1 text-red-700" onClick={() => deleteProductionComment(comment.id)}>Delete</button>
                    </div>
                  </div>)}
                </div>
                <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white" onClick={() => processProductionCommentsWithCopilot(undefined, productionComments)}>Process Comments with Copilot</button>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-black">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Preserve</div><div className="mt-1 text-[#9a5000]">{currentResultQc.preservationScore}%</div></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Photo</div><div className="mt-1 text-[#9a5000]">{currentResultQc.photographicScore}%</div></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Ready</div><div className="mt-1 text-[#9a5000]">{currentResultQc.clientReadyScore}%</div></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Status</div><div className="mt-1 text-[#9a5000]">{activeResultRound.status}</div></div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">QC Checklist</div>
                <div className="space-y-1">
                  {[...resultPreservationKeys, ...resultImprovementKeys, 'unwantedObjectsAdded' as keyof ResultQc].map((key) => <div key={String(key)} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
                    <span className="font-bold text-slate-700">{resultQcLabels[key]}</span>
                    <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
                      {[
                        ['yes', true],
                        ['unsure', null],
                        ['no', false],
                      ].map(([label, value]) => <button key={String(label)} data-testid={`result-qc-${String(key)}-${String(label)}`} className={`h-7 px-2 text-[10px] font-black uppercase ${currentResultQc[key] === value ? 'rounded bg-[#ff8800] text-white' : 'text-slate-500'}`} onClick={() => updateActiveResultQc({ [key]: value } as Partial<ResultQc>)}>{String(label)}</button>)}
                    </div>
                  </div>)}
                </div>
              </div>

              <textarea className="h-20 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs leading-relaxed" placeholder="QC notes: what improved, what drifted, what needs correction..." value={currentResultQc.notes} onChange={(e) => updateActiveResultQc({ notes: e.target.value })} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Deviation Notes</div>
                <div className="flex gap-2">
                  <input className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs" placeholder="Logo slightly distorted, counter geometry changed..." value={resultDeviationDraft} onChange={(e) => setResultDeviationDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addResultDeviationNote(); }} />
                  <button className="rounded-md border border-[#ff8800] bg-white px-2 text-[11px] font-black text-[#9a5000]" onClick={addResultDeviationNote}>Add</button>
                </div>
                <div className="mt-2 space-y-1">
                  {(currentResultQc.deviationNotes || []).length === 0 ? <div className="rounded border border-dashed border-slate-300 bg-white p-2 text-xs text-slate-500">No deviation notes yet.</div> : currentResultQc.deviationNotes.map((note, index) => <div key={`${note}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                    <span>{note}</span>
                    <button className="text-[11px] font-bold text-red-600" onClick={() => removeResultDeviationNote(index)}>Remove</button>
                  </div>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff8800] px-3 text-xs font-black text-white" onClick={generateResultRevision}>Generate Revision Prompt</button>
                <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700" onClick={copyResultRevisionPrompt}>Copy Revision</button>
                <button className="col-span-2 inline-flex h-9 items-center justify-center rounded-lg border border-[#ff8800] bg-[#fff7ed] px-3 text-xs font-black text-[#9a5000]" onClick={saveResultRevisionAsPromptVersion}>Save as QC Prompt Version</button>
              </div>
              {currentResultQc.revisionPrompt && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700">{currentResultQc.revisionPrompt}</pre>}
            </div> : <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Import an AI result image after generating externally, then QC it against the base render.</div>}
          </div>

          {selectedRenderPass && <div className="rounded-xl border border-[#ff8800]/30 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-[#9a5000]">Prompt Inspector</h4>
                <div className="mt-1 text-sm font-black text-slate-900">{selectedRenderPass.title}</div>
              </div>
              <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#9a5000]">{selectedRenderPass.status}</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{selectedRenderPass.objective}</p>
            {renderPassViewMode === 'advanced' && <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Pass Status
                <select className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs normal-case text-slate-800" value={selectedRenderPass.status} onChange={(e) => updateRenderPass(selectedRenderPass.type, (pass) => ({ ...pass, status: e.target.value as any, updatedAt: new Date().toISOString() }))}>
                  {['not_started', 'draft', 'generated', 'locked', 'approved', 'needs_revision'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Model Adapter
                <select className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs normal-case text-slate-800" value={renderPassState.selectedModelAdapter || 'generic'} onChange={(e) => updateRenderPassBuilder({ selectedModelAdapter: e.target.value as ModelAdapterId })}>
                  {modelAdapterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Prompt Detail
                <select className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs normal-case text-slate-800" value={renderPassState.promptVerbosity || 'standard'} onChange={(e) => updateRenderPassBuilder({ promptVerbosity: e.target.value as any })}>
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="strict">Strict</option>
                </select>
              </label>
              <label className="col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700">
                <input type="checkbox" checked={Boolean(renderPassState.includeInternalDiagnostics)} onChange={(e) => updateRenderPassBuilder({ includeInternalDiagnostics: e.target.checked })} />
                Include internal diagnostics in generated prompts
              </label>
            </div>}
            {renderPassViewMode === 'advanced' && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Versions</span>
                {selectedApprovedPromptVersion && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">approved v{selectedApprovedPromptVersion.versionNumber}</span>}
              </div>
              {selectedPromptVersions.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-white p-2 text-xs text-slate-500">Generate pass prompts to create v1.</div> : <div className="space-y-1">
                {selectedPromptVersions.map((version) => <button key={version.id} className={`flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-xs ${selectedPromptVersion?.id === version.id ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-white'}`} onClick={() => setActivePassVersion(selectedRenderPass.type, version.id)}>
                  <span className="font-black text-slate-900">v{version.versionNumber} <span className="font-semibold text-slate-500">{version.source}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${version.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{version.status}</span>
                </button>)}
              </div>}
            </div>}
            <textarea className="mt-2 h-56 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed" value={selectedPromptText || 'Generate prompts to preview this pass.'} readOnly />
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Negative Prompt</div>
              <pre className="max-h-20 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{selectedNegativePrompt}</pre>
            </div>
            <CompiledPromptInspector
              trace={promptInspectorTrace}
              enabled={developerModeEnabled || renderPassViewMode === 'advanced'}
              onCopy={(text) => navigator.clipboard.writeText(text).then(() => showToast('Compiled prompt copied.'))}
            />
            {renderPassViewMode === 'advanced' && <textarea className="mt-2 h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Version notes" value={selectedPromptVersion?.notes || ''} onChange={(e) => updateActivePassVersionNotes(selectedRenderPass.type, e.target.value)} disabled={!selectedPromptVersion} />}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="inline-flex h-8 items-center justify-center rounded-md bg-[#ff8800] px-2 text-xs font-bold text-white" onClick={() => copyRenderPassPrompt(selectedRenderPass.type)} disabled={!selectedPromptText}>Copy Prompt</button>
              <button className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" onClick={() => copyRenderPassNegativePrompt(selectedRenderPass.type)}>Copy Negative</button>
              {renderPassViewMode === 'advanced' && <button className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-white px-2 text-xs font-bold text-emerald-700" onClick={() => approveActivePassVersion(selectedRenderPass.type)} disabled={!selectedPromptVersion}>Approve</button>}
              {renderPassViewMode === 'advanced' && <button className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" onClick={() => duplicateActivePassVersion(selectedRenderPass.type)} disabled={!selectedPromptVersion}>Duplicate</button>}
              {renderPassViewMode === 'advanced' && <button className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" onClick={() => markRenderPassUsed(selectedRenderPass.type)} disabled={!selectedPromptText}>Mark Used</button>}
              <button className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" onClick={() => exportRenderPassPromptTxt(selectedRenderPass.type)} disabled={!selectedPromptText}>Export TXT</button>
              {renderPassViewMode === 'advanced' && <button className="inline-flex h-8 items-center justify-center rounded-md border border-amber-200 bg-white px-2 text-xs font-bold text-amber-700" onClick={() => markSelectedPassNeedsRevision(selectedRenderPass.type)}>Needs Revision</button>}
              {renderPassViewMode === 'advanced' && <button className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-xs font-bold text-red-700" onClick={() => archiveActivePassVersion(selectedRenderPass.type)} disabled={!selectedPromptVersion}>Archive</button>}
            </div>
            {renderPassViewMode === 'advanced' && selectedPromptVersions.length > 1 && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Line Diff</div>
              <div className="grid grid-cols-2 gap-2">
                <select className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs" value={diffFromVersion?.id || ''} onChange={(e) => updateRenderPassBuilder({ diffFromVersionId: e.target.value })}>
                  {selectedPromptVersions.map((version) => <option key={version.id} value={version.id}>From v{version.versionNumber}</option>)}
                </select>
                <select className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs" value={diffToVersion?.id || ''} onChange={(e) => updateRenderPassBuilder({ diffToVersionId: e.target.value })}>
                  {selectedPromptVersions.map((version) => <option key={version.id} value={version.id}>To v{version.versionNumber}</option>)}
                </select>
              </div>
              <div className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-200 bg-white font-mono text-[11px] leading-relaxed">
                {promptDiffRows.length === 0 ? <div className="p-2 text-slate-500">Choose two different versions to compare.</div> : promptDiffRows.map((row, index) => <div key={`${row.type}-${index}`} className={`px-2 py-0.5 ${row.type === 'added' ? 'bg-emerald-50 text-emerald-800' : row.type === 'removed' ? 'bg-red-50 text-red-800' : 'text-slate-500'}`}>{row.type === 'added' ? '+ ' : row.type === 'removed' ? '- ' : '  '}{row.text}</div>)}
              </div>
            </div>}
          </div>}

          {renderPassViewMode === 'advanced' && <>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Phase 12 - QC Review</h4>
                <p className="mt-1 text-xs text-slate-500">Review after generation. Score preservation and generate a revision prompt.</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-black ${renderPassState.qcReview.score >= 80 ? 'bg-emerald-50 text-emerald-700' : renderPassState.qcReview.score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{renderPassState.qcReview.score}/100</span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {qcRows.map(([key, label]) => <label key={String(key)} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={Boolean(renderPassState.qcReview[key])} onChange={(e) => updateQcReview({ [key]: e.target.checked } as any)} />
                {label}
              </label>)}
            </div>
            <textarea className="mt-2 h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="QC notes: what changed, what hallucinated, what needs correction..." value={renderPassState.qcReview.notes} onChange={(e) => updateQcReview({ notes: e.target.value })} />
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">One-click revision categories</div>
              <div className="grid grid-cols-2 gap-1">
                {revisionCategoryOptions.map((item) => <button key={item.value} className={`rounded-md border px-2 py-1 text-left text-[11px] font-bold ${renderPassState.revisionCategories[item.value] ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-white text-slate-700'}`} onClick={() => updateRenderPassBuilder({ revisionCategories: { ...renderPassState.revisionCategories, [item.value]: !renderPassState.revisionCategories[item.value] } })}>{item.label}</button>)}
              </div>
            </div>
            <button className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#ff8800] bg-white px-3 text-xs font-black text-[#9a5000] hover:bg-[#fff7ed]" onClick={generateQcRevision}>Generate Revision Prompt</button>
            {renderPassState.qcReview.revisionPrompt && <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Revision prompt</span>
                <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700" onClick={() => copyKnowledgePrompt(renderPassState.qcReview.revisionPrompt)}>Copy</button>
              </div>
              <pre className="max-h-36 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{renderPassState.qcReview.revisionPrompt}</pre>
            </div>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Prompt Versioning</h4>
              <button className="rounded-md border border-[#ff8800] bg-white px-2 py-1 text-[11px] font-black text-[#9a5000]" onClick={savePromptVersion}>Save Prompt Version</button>
            </div>
            <div className="mt-2 max-h-32 space-y-1 overflow-auto">
              {renderPassState.promptVersions.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-500">No prompt versions yet.</div> : renderPassState.promptVersions.map((version) => <div key={version.id} className={`flex items-center justify-between gap-2 rounded-md border p-2 text-xs ${renderPassState.activePromptVersionId === version.id ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-slate-50'}`}>
                <div className="min-w-0">
                  <div className="font-black text-slate-900">v{version.version} {version.passType || ''}</div>
                  <div className="truncate text-[11px] text-slate-500">{version.notes || new Date(version.createdAt).toLocaleString()}</div>
                </div>
                <button className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700" onClick={() => restorePromptVersion(version.id)}>Copy/Rollback</button>
              </div>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Project Memory</h4>
              <button className="rounded-md border border-[#ff8800] bg-white px-2 py-1 text-[11px] font-black text-[#9a5000]" onClick={addProjectMemoryEntry}>Add Memory</button>
            </div>
            <div className="mt-2 max-h-36 space-y-2 overflow-auto">
              {renderPassState.projectMemory.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-500">Approved/rejected render notes will appear here.</div> : renderPassState.projectMemory.map((memory) => <div key={memory.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex gap-2">
                  <input className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold" value={memory.label} onChange={(e) => updateRenderPassBuilder({ projectMemory: renderPassState.projectMemory.map((item) => item.id === memory.id ? { ...item, label: e.target.value } : item) })} />
                  <select className="rounded border border-slate-300 bg-white px-2 text-xs" value={memory.status} onChange={(e) => updateRenderPassBuilder({ projectMemory: renderPassState.projectMemory.map((item) => item.id === memory.id ? { ...item, status: e.target.value as any } : item) })}>
                    <option value="revision">Revision</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <textarea className="mt-1 h-14 w-full rounded border border-slate-300 bg-white p-2 text-xs" placeholder="Notes from this render result..." value={memory.notes} onChange={(e) => updateRenderPassBuilder({ projectMemory: renderPassState.projectMemory.map((item) => item.id === memory.id ? { ...item, notes: e.target.value } : item) })} />
              </div>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Visual Diff Prep</h4>
            <p className="mt-1 text-xs text-slate-500">Future-ready manual diff notes: Base vs Current result.</p>
            {(['added', 'removed', 'modified', 'moved'] as const).map((key) => <textarea key={key} className="mt-2 h-14 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder={`${key} elements`} value={renderPassState.visualDiff[key]} onChange={(e) => updateRenderPassBuilder({ visualDiff: { ...renderPassState.visualDiff, [key]: e.target.value } })} />)}
            <textarea className="mt-2 h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" placeholder="Diff notes" value={renderPassState.visualDiff.notes} onChange={(e) => updateRenderPassBuilder({ visualDiff: { ...renderPassState.visualDiff, notes: e.target.value } })} />
          </div>

          {renderPassGenerated.length > 0 && <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Generated Prompt Cards</h4>
            {renderPassGenerated.map((pass) => <button key={pass.type} className={`w-full rounded-lg border p-2 text-left ${renderPassState.selectedPassType === pass.type ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-slate-50 hover:bg-white'}`} onClick={() => updateRenderPassBuilder({ selectedPassType: pass.type })}>
              <div className="truncate text-xs font-black text-slate-900">{pass.title}</div>
              <div className="mt-1 text-[11px] text-slate-500">{pass.prompt.length} chars - {pass.status}</div>
            </button>)}
          </div>}
          </>}
        </div>}
        {activeTab !== 'render-pass' && selectedObject && <div className="mb-3 rounded-xl border border-[#ff8800] bg-[#fff7ed] p-3 text-xs font-bold text-[#9a5000] shadow-sm">Selected {selectedObject.type}: {selectedObjectSlot?.code || '-'} {tool === 'move' ? 'can be moved now' : 'is locked'}</div>}
        {activeTab !== 'render-pass' && selectedObject && selectedMappingObject?.object && selectedObjectSlot && <div className="mb-3 space-y-3 rounded-xl border border-[#ff8800] bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Mapped Object Inspector</h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedObject.type === 'pin' ? 'Pin' : 'Region'}</p>
            </div>
            <span className="inline-flex h-8 min-w-[48px] items-center justify-center rounded-lg px-2 text-xs font-black text-white" style={{ background: selectedObjectSlot.color }}>{selectedObjectSlot.code}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
            <div className="font-bold text-slate-700">Current assigned slot</div>
            <div className="mt-1 text-slate-600">{selectedObjectSlot.code} {selectedObjectSlot.name}</div>
          </div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Slot</label>
          <select data-testid="mapped-object-slot-select" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" value={selectedObject.slotId} onChange={(e) => reassignSelectedObject(e.target.value)}>
            {sortedSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.code} - {slot.name}</option>)}
          </select>
          <button data-testid="delete-selected-object" className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50" onClick={deleteSelectedObject}>Delete selected object</button>
        </div>}
        {activeTab !== 'render-pass' && activeCategory && !slotInspectorTarget && <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">{tabLabelMap[activeCategory]}</h3>
          <p className="text-xs text-slate-500">
            {activeCategory === 'materials' && 'Create material slots, attach references, and map them onto the base image.'}
            {activeCategory === 'props' && 'Add objects, styling, products, or decorative references.'}
            {activeCategory === 'lighting' && 'Define daylight, artificial glow, ambient fill, and lighting direction.'}
            {activeCategory === 'environment' && 'Guide site context, background mood, exterior surroundings, or mall/street atmosphere.'}
          </p>
          <button className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#ff8800] px-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,136,0,0.22)] hover:bg-[#e67800]" onClick={() => addSlotForCategory(activeCategory)}>
            {addSlotInspectorLabel()}
          </button>
          {currentCategorySlots.length === 0 && <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            {activeCategory === 'materials' && <><p className="mb-2">No materials yet.</p><button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-3 text-xs font-semibold text-[#c45f00] hover:bg-[#ff8800]/10" onClick={() => addSlotForCategory(activeCategory)}>+ Add Material</button></>}
            {activeCategory === 'props' && <><p className="mb-2">No props yet.</p><button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-3 text-xs font-semibold text-[#c45f00] hover:bg-[#ff8800]/10" onClick={() => addSlotForCategory(activeCategory)}>+ Add Prop</button></>}
            {activeCategory === 'lighting' && <><p className="mb-2">No lighting references yet.</p><button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-3 text-xs font-semibold text-[#c45f00] hover:bg-[#ff8800]/10" onClick={() => addSlotForCategory(activeCategory)}>+ Add Lighting</button></>}
            {activeCategory === 'environment' && <><p className="mb-2">No environment references yet.</p><button className="inline-flex h-8 items-center justify-center rounded-md border border-[#ff8800] bg-white px-3 text-xs font-semibold text-[#c45f00] hover:bg-[#ff8800]/10" onClick={() => addSlotForCategory(activeCategory)}>+ Add Environment</button></>}
          </div>}
        </div>}
        {activeTab !== 'render-pass' && (slotInspectorTarget ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-9 min-w-[54px] items-center justify-center rounded-lg px-2 text-sm font-black text-white shadow-sm" style={{ background: slotInspectorTarget.color }}>{slotInspectorTarget.code}</span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-slate-900">Slot Inspector</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{slotInspectorTarget.category}</p>
            </div>
            <div className="ml-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {slotInspectorTarget.referenceImages[0] ? <img src={slotInspectorTarget.referenceImages[0]} alt={`${slotInspectorTarget.code} thumbnail`} className="h-full w-full object-cover" /> : <span className="h-7 w-7 rounded-full border-2 border-white shadow-sm" style={{ background: slotInspectorTarget.color }} />}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Slot name</label>
          <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" value={slotInspectorTarget.name} onChange={(e) => updateSlot(slotInspectorTarget.id, { name: e.target.value })} />
          {defaultSlotNamePattern.test((slotInspectorTarget.name || '').trim()) && <p className="mt-1 text-xs font-medium text-amber-700">Add a clearer slot name to improve prompt quality.</p>}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Thai design intent</label>
          <textarea className="h-36 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="Thai description" value={slotInspectorTarget.descriptionThai} onChange={(e) => updateSlot(slotInspectorTarget.id, { descriptionThai: e.target.value })} />
          <p className="text-xs text-slate-500">คำอธิบายไทยนี้จะถูกใช้เป็น design intent ตอนสร้าง prompt package</p>
          {!slotInspectorTarget.descriptionThai?.trim() && slotInspectorTarget.referenceImages.length > 0 && <p className="mt-1 text-xs font-medium text-amber-700">Image-only reference. Add Thai design intent for more control.</p>}
          </div>
          <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="English prompt note (optional)" value={slotInspectorTarget.englishPromptNote || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { englishPromptNote: e.target.value })} />
          {slotInspectorTarget.category === 'materials' && <>
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="category" value={slotInspectorTarget.categoryLabel || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { categoryLabel: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="applyTo" value={slotInspectorTarget.applyTo || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { applyTo: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="tone" value={slotInspectorTarget.tone || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { tone: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="finish" value={slotInspectorTarget.finish || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { finish: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="texture" value={slotInspectorTarget.texture || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { texture: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="avoid (comma separated)" value={(slotInspectorTarget.avoid || []).join(', ')} onChange={(e) => updateSlot(slotInspectorTarget.id, { avoid: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} />
          </>}
          {slotInspectorTarget.category === 'props' && <>
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="mappedAreas" value={slotInspectorTarget.applyTo || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { applyTo: e.target.value })} />
            <select className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" value={slotInspectorTarget.creativeFreedom || 'medium'} onChange={(e) => updateSlot(slotInspectorTarget.id, { creativeFreedom: e.target.value as any })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select>
          </>}
          {slotInspectorTarget.category === 'lighting' && <>
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="direction" value={slotInspectorTarget.direction || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { direction: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="quality" value={slotInspectorTarget.quality || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { quality: e.target.value })} />
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="intensity" value={slotInspectorTarget.intensity || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { intensity: e.target.value })} />
          </>}
          {slotInspectorTarget.category === 'environment' && <>
            <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="type" value={slotInspectorTarget.type || ''} onChange={(e) => updateSlot(slotInspectorTarget.id, { type: e.target.value })} />
            <select className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" value={slotInspectorTarget.creativeFreedom || 'medium'} onChange={(e) => updateSlot(slotInspectorTarget.id, { creativeFreedom: e.target.value as any })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select>
          </>}
          <input type="color" value={slotInspectorTarget.color} onChange={(e) => updateSlot(slotInspectorTarget.id, { color: e.target.value })} />
          <div
            className={`space-y-2 rounded-md border-2 border-dashed p-2 ${isRefDragOver ? 'border-[#ff8800] bg-[#ff8800]/10' : 'border-slate-300 bg-slate-50'}`}
            onDragOver={onRefZoneDragOver}
            onDragLeave={onRefZoneDragLeave}
            onDrop={onRefZoneDrop}
            onPaste={onRefZonePaste}
            tabIndex={0}
          >
            <p className="text-xs font-semibold text-slate-700">Reference Images</p>
            <p className="text-xs text-slate-600">Drop, paste, or upload reference images</p>
            <label className="block rounded-md border border-slate-300 bg-white p-2 text-center text-sm">Upload Reference<input className="hidden" type="file" accept="image/*" multiple onChange={(e) => onRefUpload(e.target.files?.[0], e.target.files || undefined)} /></label>
            <p className="text-[11px] text-slate-500">Paste images copied from Pinterest or your browser here.</p>
            {slotInspectorTarget.referenceImages.length > 0 && <div className="grid grid-cols-3 gap-2">
              {slotInspectorTarget.referenceImages.map((ref, idx) => (
                <div key={`${slotInspectorTarget.id}-ref-${idx}`} className="relative overflow-hidden rounded-md border border-slate-200 bg-white">
                  <img src={ref} alt={`${slotInspectorTarget.code} reference ${idx + 1}`} className="h-16 w-full object-cover" />
                  <button className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white" onClick={() => removeReferenceImage(slotInspectorTarget.id, idx)}>x</button>
                </div>
              ))}
            </div>}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Slot prompt preview</div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-white p-2 text-[11px] leading-relaxed text-slate-700">{slotPromptPreview(slotInspectorTarget)}</pre>
          </div>
          <button className="w-full rounded-md bg-red-600 p-2 text-sm font-medium text-white" onClick={() => { updateScene({ slots: scene.slots.filter((s) => s.id !== slotInspectorTarget.id) }); setSelectedSlotId(''); }}>Delete slot</button>
        </div> : <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Select a slot or mapped tag to edit details.</div>)}
        {activeTab !== 'render-pass' && <hr className="my-3 border-slate-200" />}
        {activeTab !== 'render-pass' && <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt Panel</h4>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.type} onChange={(e) => updateScene({ type: e.target.value })}>{sceneTypePresets.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.preserveRules} onChange={(e) => updateScene({ preserveRules: e.target.value })}>{preserveRulesPresets.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.atmosphere} onChange={(e) => updateScene({ atmosphere: e.target.value })}>{atmospherePresets.map((x) => <option key={x}>{x}</option>)}</select>
        <div className="grid grid-cols-2 gap-2">
            <button className="rounded-md border border-slate-300 bg-white p-2 text-xs" onClick={onCopyPrompt}><Copy className="mr-1 inline h-3 w-3" />Copy Prompt</button>
            <button className="rounded-md border border-slate-300 bg-white p-2 text-xs" onClick={onGeneratePrompt}>Regenerate Prompt</button>
          </div>
          <textarea className="h-56 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs" value={scene.localPrompt} onChange={(e) => updateScene({ localPrompt: e.target.value })} placeholder="Generated local prompt" />
        </div>}
        {activeTab === 'brief' && <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Design Director Notes</h4>
          <p className="text-xs text-slate-600">Use this when you want to brief the overall scene quickly. Jarvis B will combine these notes with slots, references, mapping, and boards to infer missing details.</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Overall Scene Direction</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="Describe the overall mood, design language, target feeling, or client presentation direction..." value={directorNotes.overallSceneDirection} onChange={(e) => updateScene({ directorNotes: { ...directorNotes, overallSceneDirection: e.target.value } })} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Material Interpretation Notes</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="Describe overall material direction if some slots are not fully filled..." value={directorNotes.materialInterpretationNotes} onChange={(e) => updateScene({ directorNotes: { ...directorNotes, materialInterpretationNotes: e.target.value } })} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Lighting / Atmosphere Notes</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="Describe daylight, artificial light, fireplace glow, shadow softness, time of day..." value={directorNotes.lightingAtmosphereNotes} onChange={(e) => updateScene({ directorNotes: { ...directorNotes, lightingAtmosphereNotes: e.target.value } })} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Preserve / Do Not Change Notes</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="List anything that must not change..." value={directorNotes.preserveDoNotChangeNotes} onChange={(e) => updateScene({ directorNotes: { ...directorNotes, preserveDoNotChangeNotes: e.target.value } })} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Inference Mode</label>
            <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={directorNotes.inferenceMode} onChange={(e) => updateScene({ directorNotes: { ...directorNotes, inferenceMode: e.target.value as 'conservative' | 'balanced' | 'creative' } })}>
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="creative">Creative</option>
            </select>
          </div>
        </div>}
        {activeTab === 'people' && <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">People</h4>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.people.level} onChange={(e) => updateScene({ people: { ...scene.people, level: e.target.value as any } })}><option value="none">none</option><option value="min">min</option><option value="mid">mid</option><option value="max">max</option></select>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.people.motionBlur} onChange={(e) => updateScene({ people: { ...scene.people, motionBlur: e.target.value as any } })}><option value="none">none</option><option value="soft">soft</option><option value="walking">walking</option><option value="random">random</option></select>
          {peopleBehaviorOptions.map((b) => <label className="flex items-center gap-2 text-xs" key={b}><input type="checkbox" checked={scene.people.behavior.includes(b)} onChange={(e) => updateScene({ people: { ...scene.people, behavior: e.target.checked ? [...scene.people.behavior, b] : scene.people.behavior.filter((x) => x !== b) } })} />{b}</label>)}
          <textarea className="h-28 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="คำอธิบายไทยของผู้คน" value={scene.people.descriptionThai} onChange={(e) => updateScene({ people: { ...scene.people, descriptionThai: e.target.value } })} />
          <p className="text-xs text-slate-500">คำอธิบายไทยนี้จะถูกใช้เป็น design intent ตอนสร้าง prompt package</p>
        </div>}
        {activeTab === 'output' && <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</h4>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.outputPreset} onChange={(e) => { const name = e.target.value; updateScene({ outputSpec: { ...scene.outputSpec, outputPreset: name, ...(outputPresets[name] || {}) } as OutputSpec }); }}>{Object.keys(outputPresets).map((x) => <option key={x}>{x}</option>)}</select>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.targetUse} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, targetUse: e.target.value } })}>{targetUseOptions.map((x) => <option key={x}>{x}</option>)}</select>
          <input className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.aspectRatio} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, aspectRatio: e.target.value } })} />
          <input className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.orientation} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, orientation: e.target.value } })} />
          <input type="number" className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.targetWidth} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, targetWidth: Number(e.target.value) || 0 } })} />
          <input type="number" className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.targetHeight} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, targetHeight: Number(e.target.value) || 0 } })} />
          <input className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.cropBehavior} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, cropBehavior: e.target.value } })} />
          <input type="number" className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.safeAreaPercentage} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, safeAreaPercentage: Number(e.target.value) || 0 } })} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={scene.outputSpec.needsUpscale} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, needsUpscale: e.target.checked } })} />needsUpscale</label>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.outputSpec.finalFormat} onChange={(e) => updateScene({ outputSpec: { ...scene.outputSpec, finalFormat: e.target.value as 'jpg' | 'png' } })}><option value="jpg">jpg</option><option value="png">png</option></select>
        </div>}
        {activeTab === 'boards' && <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Boards</h4>
          <p className="text-xs text-slate-600">Generate visual boards for mapping, materials, props, lighting, environment, atmosphere, and package summary.</p>
          <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#ff8800] px-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(255,136,0,0.26)] hover:bg-[#e67800]" onClick={() => createBoards()}><Layers className="mr-2 h-4 w-4" />Generate Boards</button>
          <button className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => Object.keys(boardsPreview).filter((k) => k.startsWith('boards/')).forEach(exportBoardPng)}>Export Board PNGs</button>
          {!boardsGeneratedAt && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Boards not generated yet. Use Generate Boards before exporting a visual review package.</div>}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">Generated at: {boardsGeneratedAt || 'not generated'}</div>
          {boardOptions.map((board) => (
            <div key={board.key} className="grid grid-cols-[1fr_auto] gap-1">
              <button className={`rounded-md border p-2 text-left text-xs ${selectedBoardKey === board.key ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000]' : 'border-slate-300 bg-white'}`} onClick={() => setSelectedBoardKey(board.key)}>{board.label}</button>
              <button className="rounded-md border border-slate-300 bg-white px-2 text-xs" onClick={() => exportBoardPng(board.key)}>Export</button>
            </div>
          ))}
          {boardsPreview[selectedBoardKey] ? <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2"><img src={boardsPreview[selectedBoardKey]} alt="board preview" className="mx-auto rounded border border-slate-300 bg-white" /></div> : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">No selected board preview yet.</div>}
        </div>}
        {activeTab === 'ai-prompt' && <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Prompt Package</h4>
          {(scene.promptPackages?.length || 0) > 0 && activePromptPackage && <div className="space-y-2 rounded-lg border border-[#ff8800]/35 bg-[#fff7ed] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-[#9a5000]">Imported Prompt Packages</div>
                <div className="mt-1 text-xs text-slate-600">{scene.promptPackages.length} package(s) imported</div>
              </div>
              <span className="rounded-full border border-[#ff8800]/35 bg-white px-2 py-0.5 text-[11px] font-bold text-[#9a5000]">Active</span>
            </div>
            <select data-testid="prompt-package-selector" className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800" value={scene.activePromptPackageId || ''} onChange={(e) => updateScene({ activePromptPackageId: e.target.value })}>
              {(scene.promptPackages || []).map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} {pkg.assistantName ? `- ${pkg.assistantName}` : ''}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
              <p><span className="font-bold text-slate-700">Assistant:</span> {activePromptPackage.assistantName || '-'}</p>
              <p><span className="font-bold text-slate-700">Imported:</span> {new Date(activePromptPackage.importedAt).toLocaleString()}</p>
              <p className="col-span-2"><span className="font-bold text-slate-700">Source scene:</span> {activePromptPackage.sourceSceneName || '-'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Prompt Block</label>
              <select data-testid="prompt-block-selector" className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800" value={activePromptBlock} onChange={(e) => setActivePromptBlock(e.target.value)}>
                {promptBlockOptions.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700">{promptBlockOptions.find((opt) => opt.key === activePromptBlock)?.label || 'Prompt'}</p>
                <span className="text-[11px] font-medium text-slate-500">Characters: {((activePromptPackage.promptPackage as any)[activePromptBlock] || '').length}</span>
              </div>
              <textarea data-testid="full-render-prompt-content" className="h-56 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed text-slate-800" value={((activePromptPackage.promptPackage as any)[activePromptBlock] || '') as string} readOnly />
            </div>
            <div className="grid grid-cols-1 gap-1">
              {promptBlockOptions.map((opt) => <button key={opt.key} className={`inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition ${activePromptBlock === opt.key ? 'border-[#ff8800] bg-[#ff8800] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} onClick={() => navigator.clipboard.writeText((activePromptPackage.promptPackage as any)[opt.key] || '')}>{opt.copyLabel}</button>)}
            </div>
            {(activePromptPackage.assistantNotes?.summary || activePromptPackage.assistantNotes?.recommendedNextStep || (activePromptPackage.assistantNotes?.missingData || []).length > 0) && <div className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
              <p className="font-bold text-slate-800">Assistant Notes</p>
              {activePromptPackage.assistantNotes?.summary && <p className="mt-1">{activePromptPackage.assistantNotes.summary}</p>}
              {(activePromptPackage.assistantNotes?.missingData || []).length > 0 && <p className="mt-1"><span className="font-semibold">Missing Data:</span> {(activePromptPackage.assistantNotes?.missingData || []).join(', ')}</p>}
              {activePromptPackage.assistantNotes?.recommendedNextStep && <p className="mt-1"><span className="font-semibold">Recommended Next Step:</span> {activePromptPackage.assistantNotes.recommendedNextStep}</p>}
            </div>}
          </div>}
          {(scene.promptPackages?.length || 0) === 0 && <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">No imported prompt package yet. Paste or load a visual-brief-ai-import-v1 JSON file below.</div>}
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="text-xs font-semibold text-slate-700">{(scene.promptPackages?.length || 0) > 0 ? 'Import another prompt package' : 'Import prompt package'}</div>
            <textarea className="h-28 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs" placeholder="Paste visual-brief-ai-import-v1 JSON" value={promptJsonInput} onChange={(e) => setPromptJsonInput(e.target.value)} />
            <div className="grid grid-cols-2 gap-1">
              <button className="rounded-md border border-slate-300 bg-white p-2 text-xs font-semibold" onClick={onValidatePromptJson}>Validate</button>
              <label className="rounded-md border border-slate-300 bg-white p-2 text-center text-xs font-semibold">Load File<input className="hidden" type="file" accept=".json" onChange={(e) => onLoadPromptJsonFile(e.target.files?.[0])} /></label>
            </div>
            <button className="w-full rounded-md bg-[#ff8800] p-2 text-xs font-bold text-white shadow-[0_8px_18px_rgba(255,136,0,0.25)]" onClick={onImportPromptPackage}>Import into current scene</button>
            {promptValidation && <div className={`rounded-md p-2 text-xs ${promptValidation.status === 'valid' ? 'bg-emerald-50 text-emerald-800' : promptValidation.status === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
              <div>Status: {promptValidation.status}</div>
              <div>Schema: {(promptValidation.parsed as any)?.schemaVersion || '-'}</div>
              <div>Prompt fields found: {promptValidation.parsed?.promptPackage ? Object.keys(promptValidation.parsed.promptPackage).length : 0}</div>
              <div>Assistant notes: {promptValidation.parsed?.assistantNotes ? 'found' : 'missing'}</div>
              {promptValidation.errors.map((e) => <div key={e}>Error: {e}</div>)}
              {promptValidation.warnings.map((w) => <div key={w}>Warning: {w}</div>)}
            </div>}
          </div>
          {((scene.slotEnrichmentSuggestions?.length || 0) > 0 || (scene.aiEnrichmentSuggestions?.length || 0) > 0) && <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <h5 className="text-xs font-black uppercase tracking-wide text-slate-500">Jarvis B Suggestions</h5>
            {(scene.slotEnrichmentSuggestions || []).map((item) => {
              const target = scene.slots.find((slot) => slot.code === item.code);
              return <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-800">Slot Enrichment • {item.code}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.status === 'applied' ? 'bg-emerald-100 text-emerald-800' : item.status === 'ignored' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>{item.status || 'pending'}</span>
                </div>
                <div className="mt-1 text-slate-600">Target: {target ? `${target.code} ${target.name}` : 'slot not found'}</div>
                {item.inferredName && <div className="mt-1 text-slate-600">Name: {item.inferredName}</div>}
                {item.inferredThaiIntent && <div className="mt-1 text-slate-600">Thai: {item.inferredThaiIntent}</div>}
                {item.confidence && <div className="mt-1 text-slate-600">Confidence: {item.confidence}</div>}
                {item.basis && <div className="mt-1 text-slate-600">Basis: {item.basis}</div>}
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <button className="rounded-md border border-[#ff8800] bg-white px-2 py-1 font-semibold text-[#9a5000] hover:bg-[#fff2e0]" onClick={() => applySlotEnrichment(item)}>Apply inferred fields</button>
                  <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100" onClick={() => markEnrichmentStatus(item.id, 'ignored')}>Ignore</button>
                </div>
              </div>;
            })}
            {(scene.aiEnrichmentSuggestions || []).map((item) => {
              const suggestedCategory = normalizeSlotCategoryFromSuggestion(item.slotType);
              return <div key={item.id} data-testid={`suggestion-card-${item.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-800">Suggestion • {item.action}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.status === 'applied' ? 'bg-emerald-100 text-emerald-800' : item.status === 'ignored' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>{item.status || 'pending'}</span>
                </div>
                <div className="mt-1 text-slate-600">Slot: {(item.suggestedCode || item.code || item.targetSlotCode || '-')}{item.suggestedName ? ` ${item.suggestedName}` : ''}</div>
                {item.slotType && <div className="mt-1 text-slate-600">Type: {item.slotType}</div>}
                {item.thaiDescription && <div className="mt-1 text-slate-600">Thai: {item.thaiDescription}</div>}
                {item.englishPromptNote && <div className="mt-1 text-slate-600">English note: {item.englishPromptNote}</div>}
                {item.mappingSuggestion?.type && <div className="mt-1 text-slate-600">Mapping: {item.mappingSuggestion.type}</div>}
                {item.confidence && <div className="mt-1 text-slate-600">Confidence: {item.confidence}</div>}
                {item.basis && <div className="mt-1 text-slate-600">Basis: {item.basis}</div>}
                <div className="mt-2 grid grid-cols-3 gap-1">
                  <button data-testid={`apply-suggestion-${item.id}`} className="rounded-md border border-[#ff8800] bg-white px-2 py-1 font-semibold text-[#9a5000] hover:bg-[#fff2e0]" onClick={() => applyAiSuggestion(item)}>Apply to Scene</button>
                  <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100" onClick={() => {
                    if (suggestedCategory) setActiveTab(suggestedCategory);
                    showToast('Suggestion opened. Review details before applying.');
                  }}>Edit First</button>
                  <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100" onClick={() => markSuggestionStatus(item.id, 'ignored')}>Ignore</button>
                </div>
              </div>;
            })}
          </div>}
        </div>}
        {currentHealth && <div className={`mt-3 rounded-md border p-2 text-xs ${currentHealth.status === 'healthy' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : currentHealth.status === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <div className="font-semibold">Package Health: {currentHealth.status}</div>
          {!scene.baseImage && <div>Base image missing - upload one to start mapping.</div>}
          <div>Slots: {currentHealth.summary.slotCount}, Refs: {currentHealth.summary.refImageCount}, Pins: {currentHealth.summary.pinsCount}, Rects: {currentHealth.summary.regionCount}</div>
          {currentHealth.warnings.slice(0, 2).map((w) => <div key={w}>Warning: {w}</div>)}
          {currentHealth.errors.slice(0, 2).map((e) => <div key={e}>Error: {e}</div>)}
        </div>}
      </aside>
    </main>}

    {importReview && <div className="fixed inset-0 bg-black/70 p-8"><div className="mx-auto max-h-[92vh] max-w-3xl overflow-auto rounded bg-neutral-900 p-5 text-sm">
      <h3 className="mb-2 text-lg">Import Review</h3>
      <div className="grid grid-cols-2 gap-2">
        <p>Package status: {importReview.packageStatus}</p><p>Manifest: {importReview.manifestFound ? 'found' : 'missing'}</p>
        <p>Project: {importReview.projectName}</p><p>Scene: {importReview.sceneName}</p>
        <p>Scene type: {importReview.sceneType}</p><p>AI brief: {importReview.aiBriefFound ? 'found' : 'missing'}</p>
        <p>Base image: {importReview.baseImageFound ? 'found' : 'missing'}</p><p>Mapping overlay: {importReview.mappingOverlayFound ? 'found' : 'missing'}</p>
        <p>Board files found: {importReview.boardsFoundCount}</p><p>Boards status: {importReview.health.warnings.some((w: string) => w.includes('Missing board files')) ? 'missing some' : 'ok'}</p>
        <p>Prompt packages: {importReview.promptPackagesCount}</p><p>Active prompt: {importReview.activePromptFound ? 'found' : 'missing'}</p>
        <p>Revision prompts: {importReview.revisionPromptsCount}</p><p></p>
        <p>Output spec: {importReview.outputSpecFound ? 'found' : 'missing'}</p><p>Local prompt: {importReview.localPromptFound ? 'found' : 'missing'}</p>
        <p>Materials: {importReview.byType.materials}</p><p>Props: {importReview.byType.props}</p>
        <p>Lighting: {importReview.byType.lighting}</p><p>Environment: {importReview.byType.environment}</p>
        <p>Reference images: {importReview.refsCount}</p><p>Pins: {importReview.pinsCount} / Rectangles: {importReview.regionCount}</p>
      </div>
      <div className={`my-3 rounded p-2 text-xs ${importReview.health.status === 'healthy' ? 'bg-emerald-900/40' : importReview.health.status === 'warning' ? 'bg-amber-900/40' : 'bg-red-900/40'}`}>
        <div className="font-semibold">Health status: {importReview.health.status}</div>
        {importReview.health.warnings.map((w: string) => <div key={w}>Warning: {w}</div>)}
        {importReview.health.errors.map((e: string) => <div key={e}>Error: {e}</div>)}
      </div>
      {importReview.missing.length > 0 && <div className="mb-3 rounded bg-amber-900/40 p-2 text-xs">Missing required-ish files: {importReview.missing.join(', ')}</div>}
      <label className="mb-2 block text-xs">Merge target project</label>
      <select className="mb-4 w-full rounded bg-neutral-800 p-2" value={importReview.selectedMergeProjectId} onChange={(e) => setImportReview({ ...importReview, selectedMergeProjectId: e.target.value })}>
        {importReview.existingProjects.map((p: Project) => <option value={p.id} key={p.id}>{p.name}</option>)}
      </select>
      <div className="flex gap-2"><button className="rounded bg-emerald-700 px-3 py-1" onClick={() => commitImport('new')}>Import as New Project</button><button className="rounded bg-amber-700 px-3 py-1" onClick={() => commitImport('merge')}>Merge into Existing Project</button><button className="rounded bg-neutral-700 px-3 py-1" onClick={() => setImportReview(null)}>Cancel</button></div>
    </div></div>}

    {exportResult && <div className="fixed bottom-4 right-4 max-w-sm rounded bg-neutral-900 p-3 text-xs shadow-lg">
      <div className="font-semibold">Export completed</div>
      <div>{exportResult.filename}</div>
      <div>Package size: {(exportResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB</div>
      <div>Status: {exportResult.health.status}</div>
      <div>Slots: {exportResult.health.summary.slotCount}</div>
      <div>Refs: {exportResult.health.summary.refImageCount}</div>
      <div>Prompt included: {exportResult.health.summary.hasLocalPrompt ? 'yes' : 'no'}</div>
      <button className="mt-2 rounded bg-neutral-700 px-2 py-1" onClick={() => setExportResult(null)}>Close</button>
    </div>}

    {healthAfterImport && <div className="fixed bottom-4 left-4 max-w-sm rounded bg-neutral-900 p-3 text-xs shadow-lg">
      <div className="font-semibold">Post-import health</div>
      <div>Status: {healthAfterImport.status}</div>
      <div>Slots: {healthAfterImport.summary.slotCount}, Pins: {healthAfterImport.summary.pinsCount}, Rects: {healthAfterImport.summary.regionCount}</div>
      <button className="mt-2 rounded bg-neutral-700 px-2 py-1" onClick={() => setHealthAfterImport(null)}>Close</button>
    </div>}

    {slotDrag && <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-[#ff8800] bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-[0_16px_32px_rgba(15,23,42,0.22)]" style={{ left: slotDrag.x, top: slotDrag.y }}>
      <span className="mr-2 inline-flex rounded-md px-2 py-1 text-white" style={{ background: slotDrag.color }}>{slotDrag.code}</span>
      {slotDrag.overImage ? 'Drop to add pin' : 'Drag onto image'}
    </div>}
    <VisualLocalCopilot context={copilotContext} onApplyActions={applyCopilotActions} />
    {toast && <div className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border px-3 py-2 text-xs shadow-md ${toast.tone === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-[#ff8800]/40 bg-white text-slate-800'}`}>{toast.message}</div>}
  </div>;
}
