import { useEffect, useMemo, useRef, useState, type DragEvent, type ClipboardEvent as ReactClipboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import JSZip from 'jszip';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text, Group } from 'react-konva';
import { Download, Upload, Save, WandSparkles, Copy, MousePointer, MapPin, Square, Move as MoveIcon, Trash2, ImagePlus, Layers, FileJson } from 'lucide-react';
import { generateLocalPrompt } from './prompt';
import { loadAllDrafts, loadLatestDraft, saveDraft } from './db';
import { atmospherePresets, outputPresets, preserveRulesPresets, sceneTypePresets, smartRecipes } from './presets';
import { loadImage, resizeDataUrl } from './imageTools';
import {
  ImportedPromptPackage,
  PackageHealth,
  AiEnrichmentSuggestion,
  SlotEnrichmentSuggestion,
  CanvasTool,
  OutputSpec,
  Project,
  Region,
  RevisionPromptEntry,
  Scene,
  Slot,
  SlotCategory,
} from './types';
import { sceneHealth, zipHealth } from './packageHealth';
import { generateBoards, generateRenderHandoffBoard } from './boardGenerator';
import { buildRevisionPrompt, toHistoryEntry, validatePromptImportJson } from './promptPackage';
import { MIN_REGION_SIZE, normalizeRegionRect, sanitizeSceneMapping } from './mappingCleanup';

const baseSpec: OutputSpec = { targetUse: 'ai_review', outputPreset: 'AI Review Small', aspectRatio: '4:3', orientation: 'landscape', targetWidth: 1280, targetHeight: 960, cropBehavior: 'fit', safeAreaPercentage: 8, needsUpscale: false, finalFormat: 'jpg' };
const slotColors = ['#D39D5A', '#5BA6E6', '#8CCB7E', '#D27878', '#C28AE6', '#E0C75A'];
const slotTabs: SlotCategory[] = ['materials', 'props', 'lighting', 'environment'];
const topTabs = [...slotTabs, 'brief', 'people', 'output', 'boards', 'ai-prompt'] as const;
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
const defaultDirectorNotes = {
  overallSceneDirection: '',
  materialInterpretationNotes: '',
  lightingAtmosphereNotes: '',
  preserveDoNotChangeNotes: '',
  inferenceMode: 'balanced' as const,
};

function id() { return crypto.randomUUID(); }
function fileToDataURL(file: File) { return new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); }); }
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
  };
}
function createInitialProject(): Project {
  const scene = createScene();
  return { id: id(), name: 'New Project', updatedAt: new Date().toISOString(), scenes: [scene], activeSceneId: scene.id };
}

function normalizeSceneRuntime(input: Scene): Scene {
  return {
    ...input,
    directorNotes: { ...defaultDirectorNotes, ...(input.directorNotes || {}) },
    promptPackages: input.promptPackages || [],
    revisionPrompts: input.revisionPrompts || [],
    slotEnrichmentSuggestions: (input.slotEnrichmentSuggestions || []).map((item) => ({ ...item, id: item.id || id(), status: item.status || 'pending' })),
    aiEnrichmentSuggestions: (input.aiEnrichmentSuggestions || []).map((item) => ({ ...item, id: item.id || id(), status: item.status || 'pending' })),
  };
}

function normalizeProjectRuntime(input: Project): Project {
  return {
    ...input,
    scenes: (input.scenes || []).map(normalizeSceneRuntime),
  };
}

export default function App() {
  const [project, setProject] = useState<Project>(createInitialProject());
  const [projectsIndex, setProjectsIndex] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof topTabs)[number]>('materials');
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
  const stageRef = useRef<any>(null);
  const baseImageInputRef = useRef<HTMLInputElement | null>(null);
  const rightInspectorRef = useRef<HTMLElement | null>(null);
  const draftRectRef = useRef<Region | null>(null);

  const tabLabelMap: Record<(typeof topTabs)[number], string> = {
    materials: 'Materials',
    props: 'Props',
    lighting: 'Lighting',
    environment: 'Environment',
    brief: 'Brief',
    people: 'People',
    output: 'Output',
    boards: 'Boards',
    'ai-prompt': 'AI Prompt',
  };

  const scene = useMemo(() => project.scenes.find((s) => s.id === project.activeSceneId) || project.scenes[0], [project]);
  const selectedSlot = useMemo(() => scene?.slots.find((s) => s.id === selectedSlotId), [scene, selectedSlotId]);
  const activePromptPackage = useMemo(() => scene?.promptPackages?.find((p) => p.id === scene.activePromptPackageId) || null, [scene]);
  const directorNotes = scene?.directorNotes || defaultDirectorNotes;

  useEffect(() => {
    loadLatestDraft().then((d) => d && setProject(normalizeProjectRuntime(d)));
    loadAllDrafts().then((items) => setProjectsIndex(items.map(normalizeProjectRuntime)));
  }, []);
  useEffect(() => { if (scene?.baseImage) loadImage(scene.baseImage).then(setImgObj); else setImgObj(null); }, [scene?.baseImage]);
  useEffect(() => { setSaveStatus('unsaved'); }, [project]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markSaved = () => { setSaveStatus('saved'); setLastSavedAt(new Date().toLocaleString()); };

  const updateProject = (next: Project) => setProject({ ...next, updatedAt: new Date().toISOString() });
  const updateScene = (patch: Partial<Scene>) => {
    updateProject({ ...project, scenes: project.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)) });
  };
  const updateSlot = (slotId: string, patch: Partial<Slot>) => updateScene({ slots: scene.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)) });
  const showToast = (message: string, tone: 'info' | 'warn' = 'info') => setToast({ message, tone });
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
    updateScene({ baseImage: await fileToDataURL(f) });
    if (baseImageInputRef.current) baseImageInputRef.current.value = '';
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
    updateScene({ slots: cleanedScene.slots, localPrompt: generateLocalPrompt(cleanedScene) });
  };
  const onCopyPrompt = async () => { if (scene.localPrompt) await navigator.clipboard.writeText(scene.localPrompt); };
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
    const prompt = buildRevisionPrompt(scene, activePromptPackage, revisionDraft);
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
    const nextPrompt = generateLocalPrompt(cleanedScene);
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
    const localPrompt = generateLocalPrompt(cleanedScene);
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

  const buildZip = async () => {
    const cleanedScene = sanitizeCurrentScene();
    const zip = new JSZip(); const root = zip.folder('visual-brief-package')!;
    const prompt = cleanedScene.localPrompt || generateLocalPrompt(cleanedScene);
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
    root.folder('data')!.file('project.json', JSON.stringify({ id: project.id, name: project.name }, null, 2)).file('scene.json', JSON.stringify(cleanedScene, null, 2)).file('slots.json', JSON.stringify(cleanedScene.slots, null, 2)).file('mapping.json', JSON.stringify(cleanedScene.slots.map((s) => ({ slotId: s.id, pins: s.pins, regions: s.regions })), null, 2)).file('output-spec.json', JSON.stringify(cleanedScene.outputSpec, null, 2)).file('ai-brief.json', JSON.stringify({ schemaVersion: 'visual-brief-ai-export-v1', mode: 'archviz_prompt_generation', scene: cleanedScene, preserveRules: cleanedScene.preserveRules, directorNotes: cleanedScene.directorNotes || defaultDirectorNotes, inferenceMode: cleanedScene.directorNotes?.inferenceMode || 'balanced', materials: cleanedScene.slots.filter((s) => s.category === 'materials'), props: cleanedScene.slots.filter((s) => s.category === 'props'), lighting: cleanedScene.slots.filter((s) => s.category === 'lighting'), people: cleanedScene.people, environment: cleanedScene.slots.filter((s) => s.category === 'environment'), atmosphere: cleanedScene.atmosphere, outputSpec: cleanedScene.outputSpec, promptPackageImported: (cleanedScene.promptPackages?.length || 0) > 0, activePromptPackageSummary: activePromptPackage ? { id: activePromptPackage.id, assistantName: activePromptPackage.assistantName, importedAt: activePromptPackage.importedAt } : null, slotEnrichmentSuggestions: cleanedScene.slotEnrichmentSuggestions || [], aiEnrichmentSuggestions: cleanedScene.aiEnrichmentSuggestions || [], requestedOutputs: ['fullRenderPrompt', 'shortPrompt', 'materialPrompt', 'atmospherePrompt', 'negativePrompt', 'revisionPromptTemplate', 'dashboardImportJson'] }, null, 2));
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

  const currentHealth = scene ? sceneHealth(scene) : null;

  const currentCategorySlots = slotTabs.includes(activeTab as SlotCategory) ? scene.slots.filter((s) => s.category === activeTab) : [];
  const activeCategory = slotTabs.includes(activeTab as SlotCategory) ? (activeTab as SlotCategory) : null;
  const selectedSlotInActiveCategory = selectedSlot && activeCategory && selectedSlot.category === activeCategory ? selectedSlot : null;
  const slotInspectorTarget = activeCategory ? selectedSlotInActiveCategory : (activeTab === 'brief' ? null : selectedSlot);
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
    updateScene({ slots: nextSlots, slotEnrichmentSuggestions: nextEnrichment, localPrompt: generateLocalPrompt({ ...scene, slots: nextSlots, slotEnrichmentSuggestions: nextEnrichment }) });
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
      updateScene({ slots: normalized.slots, aiEnrichmentSuggestions: updatedSuggestions, localPrompt: generateLocalPrompt({ ...scene, slots: normalized.slots, aiEnrichmentSuggestions: updatedSuggestions }) });
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
      updateScene({ slots: nextSlots, aiEnrichmentSuggestions: updatedSuggestions, localPrompt: generateLocalPrompt({ ...scene, slots: nextSlots, aiEnrichmentSuggestions: updatedSuggestions }) });
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
      updateScene({ slots: nextScene.slots, aiEnrichmentSuggestions: updatedSuggestions, localPrompt: generateLocalPrompt({ ...scene, slots: nextScene.slots, aiEnrichmentSuggestions: updatedSuggestions }) });
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

  return <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
    <header className="h-16 flex-none border-b border-slate-200 bg-white px-3 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
      <div className="flex h-full items-center gap-2 overflow-x-auto">
        <div className="mr-1 flex flex-none items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">VB</div>
          <div className="hidden leading-tight 2xl:block">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Visual Material Mapper</div>
            <div className="text-[11px] text-slate-400">Local-first brief builder</div>
          </div>
        </div>
        <input className="h-9 w-52 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" value={project.name} onChange={(e) => updateProject({ ...project, name: e.target.value })} />
        <input className="h-9 w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff8800] focus:ring-2 focus:ring-[#ff8800]/20" value={scene.name} onChange={(e) => updateScene({ name: e.target.value })} />
        <button type="button" className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[#ff8800] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,136,0,0.28)] ring-1 ring-[#ff8800]/30 transition hover:bg-[#e67800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8800]/40" onClick={() => baseImageInputRef.current?.click()}><ImagePlus className="mr-1.5 h-4 w-4" />{scene.baseImage ? 'Replace Base Image' : 'Upload Base Image'}</button>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={onSaveDraft}><Save className="mr-1 h-4 w-4" />Save Local Draft</button>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={exportZip}><Download className="mr-1 h-4 w-4" />Export Draft ZIP</button>
        <button
          data-testid="export-render-handoff"
          disabled={!scene.baseImage}
          className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-semibold transition ${scene.baseImage ? 'border-[#ff8800] bg-[#fff7ed] text-[#9a5000] hover:bg-[#fff2e0]' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}
          onClick={exportRenderHandoffPack}
        >
          <Download className="mr-1 h-4 w-4" />Export Render Handoff Pack
        </button>
        <label className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><Upload className="mr-1 h-4 w-4" />Import ZIP<input className="hidden" type="file" accept=".zip" onChange={(e) => importZip(e.target.files?.[0])} /></label>
        <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={onGeneratePrompt}><WandSparkles className="mr-1 h-4 w-4" />Generate Local Prompt</button>
        <span className={`ml-auto rounded-full border px-2.5 py-1 text-xs font-medium ${saveStatus === 'saved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{saveStatus === 'saved' ? `Saved locally ${lastSavedAt ? `(${lastSavedAt})` : ''}` : 'Unsaved changes'}</span>
        <input ref={baseImageInputRef} id="toolbar-base-upload" data-testid="base-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => onBaseUpload(e.target.files?.[0])} />
      </div>
    </header>
    <main className="flex-1 min-h-0 overflow-hidden grid" style={{ gridTemplateColumns: '280px minmax(0,1fr) 380px' }}>
      <aside className="h-full min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
          <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Mode Library</p>
          <div className="flex flex-col gap-1">
            {topTabs.map((c) => <button key={c} className={`inline-flex h-9 items-center rounded-lg border px-2.5 text-left text-xs font-bold transition ${activeTab === c ? 'border-[#ff8800] bg-[#fff2e0] text-[#9a5000] shadow-sm' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-950'}`} onClick={() => setActiveTab(c)}>{tabLabelMap[c]}</button>)}
          </div>
        </div>
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
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-100 p-3">
        <div className="flex flex-none flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-sm">
          <div className="mr-1 hidden items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 font-bold text-slate-600 lg:flex">
            <Layers className="h-4 w-4" />
            Mapping Tools
          </div>
          <button data-testid="mapping-undo" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={undoMapping} disabled={mappingHistory.length === 0}>Undo</button>
          <button data-testid="mapping-redo" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={redoMapping} disabled={mappingFuture.length === 0}>Redo</button>
          {(['select', 'pin', 'rect', 'move', 'delete'] as CanvasTool[]).map((t) => {
            const Icon = toolMeta[t].icon;
            return <button key={t} data-testid={`tool-${t}`} onClick={() => setTool(t)} className={`inline-flex h-9 items-center justify-center rounded-lg border px-2.5 font-bold capitalize transition ${tool === t ? 'border-[#ff8800] bg-[#fff2e0] text-[#9a5000] shadow-sm ring-1 ring-[#ff8800]/25' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title={toolMeta[t].hint}><Icon className="mr-1 h-3.5 w-3.5" />{toolMeta[t].label}</button>;
          })}
          <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-700 transition hover:bg-slate-50" onClick={() => setShowOverlay((v) => !v)}>{showOverlay ? 'Hide overlays' : 'Show overlays'}</button>
          <button data-testid="reset-view" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-700 transition hover:bg-slate-50" onClick={fitToView}>Reset View</button>
          <button data-testid="reset-mapping" className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-2.5 font-bold text-red-700 transition hover:bg-red-50" onClick={resetMapping}>Reset Mapping</button>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Zoom</span><input type="range" min={0.4} max={2.5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></div>
        </div>
        <div className={`mt-2 flex flex-none items-center justify-between rounded-lg border px-3 py-2 text-xs ${tool === 'rect' ? 'border-[#ff8800]/40 bg-[#fff7ed] text-[#9a5000]' : tool === 'move' ? 'border-[#ff8800]/40 bg-[#fff7ed] text-[#9a5000]' : 'border-slate-200 bg-white text-slate-600'}`}>
          <span className="font-semibold">{toolMeta[tool].hint}</span>
          {selectedSlot && <span className="rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: selectedSlot.color }}>{selectedSlot.code}</span>}
        </div>
        <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {!imgObj ? (
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
          <button className={`rounded-xl border p-3 text-left shadow-sm transition ${bottomWorkspace === 'boards' ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => { setBottomWorkspace('boards'); setActiveTab('boards'); }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Layers className="h-4 w-4 text-[#ff8800]" />Board Preview</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">{boardsGeneratedAt ? `Generated ${boardsGeneratedAt}` : 'Boards not generated yet'}</div>
          </button>
          <button className={`rounded-xl border p-3 text-left shadow-sm transition ${bottomWorkspace === 'prompt' ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => setBottomWorkspace('prompt')}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><WandSparkles className="h-4 w-4 text-[#ff8800]" />Prompt Block</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">{scene.localPrompt ? `${scene.localPrompt.length} characters ready` : 'Create prompt draft'}</div>
          </button>
          <button className={`rounded-xl border p-3 text-left shadow-sm transition ${bottomWorkspace === 'json' ? 'border-[#ff8800] bg-[#fff7ed]' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => { setBottomWorkspace('json'); setActiveTab('ai-prompt'); }}>
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
      <aside ref={rightInspectorRef} className="h-full min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
        {selectedObject && <div className="mb-3 rounded-xl border border-[#ff8800] bg-[#fff7ed] p-3 text-xs font-bold text-[#9a5000] shadow-sm">Selected {selectedObject.type}: {selectedObjectSlot?.code || '-'} {tool === 'move' ? 'can be moved now' : 'is locked'}</div>}
        {selectedObject && selectedMappingObject?.object && selectedObjectSlot && <div className="mb-3 space-y-3 rounded-xl border border-[#ff8800] bg-white p-3 shadow-sm">
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
        {activeCategory && !slotInspectorTarget && <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
        {slotInspectorTarget ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
        </div> : <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Select a slot or mapped tag to edit details.</div>}
        <hr className="my-3 border-slate-200" />
        <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt Panel</h4>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.type} onChange={(e) => updateScene({ type: e.target.value })}>{sceneTypePresets.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.preserveRules} onChange={(e) => updateScene({ preserveRules: e.target.value })}>{preserveRulesPresets.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="w-full rounded-md border border-slate-300 bg-white p-2" value={scene.atmosphere} onChange={(e) => updateScene({ atmosphere: e.target.value })}>{atmospherePresets.map((x) => <option key={x}>{x}</option>)}</select>
        <div className="grid grid-cols-2 gap-2">
            <button className="rounded-md border border-slate-300 bg-white p-2 text-xs" onClick={onCopyPrompt}><Copy className="mr-1 inline h-3 w-3" />Copy Prompt</button>
            <button className="rounded-md border border-slate-300 bg-white p-2 text-xs" onClick={onGeneratePrompt}>Regenerate Prompt</button>
          </div>
          <textarea className="h-56 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs" value={scene.localPrompt} onChange={(e) => updateScene({ localPrompt: e.target.value })} placeholder="Generated local prompt" />
        </div>
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
    </main>

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
    {toast && <div className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border px-3 py-2 text-xs shadow-md ${toast.tone === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-[#ff8800]/40 bg-white text-slate-800'}`}>{toast.message}</div>}
  </div>;
}
