import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text, Group } from 'react-konva';
import { Download, Upload, Save, WandSparkles, Copy } from 'lucide-react';
import { generateLocalPrompt } from './prompt';
import { loadAllDrafts, loadLatestDraft, saveDraft } from './db';
import { atmospherePresets, outputPresets, preserveRulesPresets, sceneTypePresets, smartRecipes } from './presets';
import { loadImage, resizeDataUrl } from './imageTools';
import { ImportedPromptPackage, PackageHealth, CanvasTool, OutputSpec, Project, Region, RevisionPromptEntry, Scene, Slot, SlotCategory } from './types';
import { sceneHealth, zipHealth } from './packageHealth';
import { generateBoards } from './boardGenerator';
import { buildRevisionPrompt, toHistoryEntry, validatePromptImportJson } from './promptPackage';

const baseSpec: OutputSpec = { targetUse: 'ai_review', outputPreset: 'AI Review Small', aspectRatio: '4:3', orientation: 'landscape', targetWidth: 1280, targetHeight: 960, cropBehavior: 'fit', safeAreaPercentage: 8, needsUpscale: false, finalFormat: 'jpg' };
const slotColors = ['#D39D5A', '#5BA6E6', '#8CCB7E', '#D27878', '#C28AE6', '#E0C75A'];
const slotTabs: SlotCategory[] = ['materials', 'props', 'lighting', 'environment'];
const topTabs = [...slotTabs, 'people', 'output', 'boards', 'ai-prompt'] as const;
const categoryPrefix: Record<SlotCategory, string> = { materials: 'M', props: 'P', lighting: 'L', environment: 'E' };
const peopleBehaviorOptions = ['candid', 'walking', 'seated', 'staff working', 'retail queue', 'background silhouette'];
const targetUseOptions = ['ai_review', 'client_presentation', 'instagram_carousel', 'website_hero', 'portfolio', 'print_draft'];

function id() { return crypto.randomUUID(); }
function fileToDataURL(file: File) { return new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); }); }
function createScene(name = 'Scene 01'): Scene {
  return { id: id(), name, type: 'Interior', baseImage: undefined, slots: [], outputSpec: { ...baseSpec }, preserveRules: 'Medium Design Lock', atmosphere: 'Soft morning light', people: { level: 'none', motionBlur: 'none', behavior: [], descriptionThai: '' }, promptDraft: '', localPrompt: '', packageStatus: 'draft', promptPackages: [], activePromptPackageId: undefined, revisionPrompts: [] };
}
function createInitialProject(): Project {
  const scene = createScene();
  return { id: id(), name: 'New Project', updatedAt: new Date().toISOString(), scenes: [scene], activeSceneId: scene.id };
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
  const [revisionDraft, setRevisionDraft] = useState<Omit<RevisionPromptEntry, 'id' | 'createdAt' | 'prompt'>>({
    renderPassName: 'Render Pass 01',
    renderResultNotesThai: '',
    issues: { geometry: '', material: '', lighting: '', prop: '', people: '', atmosphere: '', cropSize: '' },
  });
  const stageRef = useRef<any>(null);

  const scene = useMemo(() => project.scenes.find((s) => s.id === project.activeSceneId) || project.scenes[0], [project]);
  const selectedSlot = useMemo(() => scene?.slots.find((s) => s.id === selectedSlotId), [scene, selectedSlotId]);
  const activePromptPackage = useMemo(() => scene?.promptPackages?.find((p) => p.id === scene.activePromptPackageId) || null, [scene]);

  useEffect(() => {
    loadLatestDraft().then((d) => d && setProject(d));
    loadAllDrafts().then(setProjectsIndex);
  }, []);
  useEffect(() => { if (scene?.baseImage) loadImage(scene.baseImage).then(setImgObj); else setImgObj(null); }, [scene?.baseImage]);
  useEffect(() => { setSaveStatus('unsaved'); }, [project]);

  const markSaved = () => { setSaveStatus('saved'); setLastSavedAt(new Date().toLocaleString()); };

  const updateProject = (next: Project) => setProject({ ...next, updatedAt: new Date().toISOString() });
  const updateScene = (patch: Partial<Scene>) => {
    updateProject({ ...project, scenes: project.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)) });
  };
  const updateSlot = (slotId: string, patch: Partial<Slot>) => updateScene({ slots: scene.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)) });

  const addSlot = () => {
    if (!slotTabs.includes(activeTab as SlotCategory)) return;
    const category = activeTab as SlotCategory;
    const list = scene.slots.filter((s) => s.category === category);
    const n = String(list.length + 1).padStart(2, '0');
    const slot: Slot = { id: id(), category, code: `${categoryPrefix[category]}${n}`, name: `${category} ${n}`, color: slotColors[list.length % slotColors.length], descriptionThai: '', referenceImages: [], creativeFreedom: 'medium', pins: [], regions: [] };
    updateScene({ slots: [...scene.slots, slot] });
    setSelectedSlotId(slot.id);
    setActiveTab(category);
  };

  const getPointerNorm = () => {
    const stage = stageRef.current; if (!stage || !imgObj) return null;
    const p = stage.getPointerPosition(); if (!p) return null;
    return { x: Math.min(1, Math.max(0, p.x / (imgObj.width * zoom))), y: Math.min(1, Math.max(0, p.y / (imgObj.height * zoom))) };
  };

  const onCanvasClick = () => {
    if (!selectedSlot || !imgObj) return;
    const n = getPointerNorm(); if (!n) return;
    if (tool === 'pin') {
      const newPin = { id: id(), slotId: selectedSlot.id, x: n.x, y: n.y };
      updateSlot(selectedSlot.id, { pins: [...selectedSlot.pins, newPin] });
      setSelectedObject({ type: 'pin', slotId: selectedSlot.id, id: newPin.id });
    }
    if (tool === 'delete' && selectedObject) {
      const slot = scene.slots.find((s) => s.id === selectedObject.slotId);
      if (!slot) return;
      if (selectedObject.type === 'pin') updateSlot(slot.id, { pins: slot.pins.filter((p) => p.id !== selectedObject.id) });
      if (selectedObject.type === 'rect') updateSlot(slot.id, { regions: slot.regions.filter((r) => r.id !== selectedObject.id) });
      setSelectedObject(null);
    }
  };

  const onDown = () => { if (tool === 'rect' && selectedSlot) { const n = getPointerNorm(); if (n) setDraftRect({ id: id(), slotId: selectedSlot.id, type: 'rect', x: n.x, y: n.y, width: 0, height: 0 }); } };
  const onMove = () => { if (!draftRect) return; const n = getPointerNorm(); if (!n) return; setDraftRect({ ...draftRect, width: Math.max(0.001, n.x - draftRect.x), height: Math.max(0.001, n.y - draftRect.y) }); };
  const onUp = () => { if (!draftRect || !selectedSlot) return; updateSlot(selectedSlot.id, { regions: [...selectedSlot.regions, draftRect] }); setSelectedObject({ type: 'rect', slotId: selectedSlot.id, id: draftRect.id }); setDraftRect(null); };

  const onBaseUpload = async (f?: File) => { if (!f) return; updateScene({ baseImage: await fileToDataURL(f) }); };
  const onRefUpload = async (f?: File) => { if (!f || !selectedSlot) return; updateSlot(selectedSlot.id, { referenceImages: [...selectedSlot.referenceImages, await fileToDataURL(f)] }); };
  const onSaveDraft = async () => { await saveDraft(project); markSaved(); setProjectsIndex(await loadAllDrafts()); };
  const onGeneratePrompt = () => updateScene({ localPrompt: generateLocalPrompt(scene) });
  const onCopyPrompt = async () => { if (scene.localPrompt) await navigator.clipboard.writeText(scene.localPrompt); };
  const onValidatePromptJson = () => {
    const result = validatePromptImportJson(promptJsonInput);
    setPromptValidation(result);
  };
  const onLoadPromptJsonFile = async (f?: File) => {
    if (!f) return;
    setPromptJsonInput(await f.text());
  };
  const onImportPromptPackage = () => {
    const result = validatePromptImportJson(promptJsonInput);
    setPromptValidation(result);
    if (result.status === 'error' || !result.parsed) return;
    const entry = toHistoryEntry(result.parsed);
    updateScene({ promptPackages: [...(scene.promptPackages || []), entry], activePromptPackageId: entry.id });
  };
  const onGenerateRevisionPrompt = () => {
    const prompt = buildRevisionPrompt(scene, activePromptPackage, revisionDraft);
    const entry: RevisionPromptEntry = { ...revisionDraft, id: id(), createdAt: new Date().toISOString(), prompt };
    updateScene({ revisionPrompts: [...(scene.revisionPrompts || []), entry] });
  };

  const createBoards = async () => {
    const health = sceneHealth(scene);
    const boards = await generateBoards(scene, project.name, health);
    setBoardsPreview(boards.files);
    setBoardsGeneratedAt(boards.generatedAt);
    return boards;
  };

  const buildZip = async () => {
    const zip = new JSZip(); const root = zip.folder('visual-brief-package')!;
    const prompt = scene.localPrompt || generateLocalPrompt(scene);
    const boards = await createBoards();
    const overlay = boards.files['images/overlays/scene_mapping_overlay.png'] || '';
    const baseSmall = scene.baseImage ? await resizeDataUrl(scene.baseImage, 1600, 'image/jpeg', 0.82) : '';
    const overlaySmall = overlay ? await resizeDataUrl(overlay, 1600, 'image/png') : '';
    const board = overlay ? await resizeDataUrl(overlay, 2000, 'image/png') : '';
    const stale = boardsGeneratedAt && new Date(boardsGeneratedAt).getTime() < new Date(project.updatedAt).getTime();
    const manifest = { schemaVersion: 'visual-brief-package-v1', packageStatus: scene.packageStatus, project: { id: project.id, name: project.name }, scene: { id: scene.id, name: scene.name, type: scene.type }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), appVersion: '0.3.0', files: { baseImage: 'images/base/scene_base_small.jpg', mappingOverlay: 'images/overlays/scene_mapping_overlay.png', aiBrief: 'data/ai-brief.json', boards: ['boards/material_board.png', 'boards/prop_board.png', 'boards/lighting_board.png', 'boards/environment_board.png', 'boards/atmosphere_board.png', 'boards/package_summary.png', 'boards/mapping_overlay_board.png'] }, boards: { generatedAt: boards.generatedAt, boardStatus: stale ? 'stale' : 'generated' }, promptPackagesCount: scene.promptPackages?.length || 0, activePromptPackageId: scene.activePromptPackageId || null, revisionPromptsCount: scene.revisionPrompts?.length || 0, outputSpec: scene.outputSpec };
    root.file('manifest.json', JSON.stringify(manifest, null, 2));
    root.file('README_FOR_AI.txt', 'Read ai-brief.json and these visual boards: mapping_overlay_board.png for tag placement; material_board.png for material tone/finish/texture; prop_board.png for styling/prop intent; lighting_board.png for light direction and glow; environment_board.png for background/site context; atmosphere_board.png for photography mood/output size; package_summary.png for overview. prompts/imported-prompt-package.json may contain previous Jarvis B prompt outputs. prompts/revision-prompts.json may contain follow-up correction prompts. Preserve geometry, camera, perspective, architectural form, layout, and mapped material placement. Thai descriptions are design intent to convert into precise English prompt language. Image-only references allow moderate creative interpretation. Return prompt package outputs and dashboard import JSON.');
    root.folder('data')!.file('project.json', JSON.stringify({ id: project.id, name: project.name }, null, 2)).file('scene.json', JSON.stringify(scene, null, 2)).file('slots.json', JSON.stringify(scene.slots, null, 2)).file('mapping.json', JSON.stringify(scene.slots.map((s) => ({ slotId: s.id, pins: s.pins, regions: s.regions })), null, 2)).file('output-spec.json', JSON.stringify(scene.outputSpec, null, 2)).file('ai-brief.json', JSON.stringify({ schemaVersion: 'visual-brief-ai-export-v1', mode: 'archviz_prompt_generation', scene, preserveRules: scene.preserveRules, materials: scene.slots.filter((s) => s.category === 'materials'), props: scene.slots.filter((s) => s.category === 'props'), lighting: scene.slots.filter((s) => s.category === 'lighting'), people: scene.people, environment: scene.slots.filter((s) => s.category === 'environment'), atmosphere: scene.atmosphere, outputSpec: scene.outputSpec, promptPackageImported: (scene.promptPackages?.length || 0) > 0, activePromptPackageSummary: activePromptPackage ? { id: activePromptPackage.id, assistantName: activePromptPackage.assistantName, importedAt: activePromptPackage.importedAt } : null, requestedOutputs: ['fullRenderPrompt', 'shortPrompt', 'materialPrompt', 'atmospherePrompt', 'negativePrompt', 'revisionPromptTemplate', 'dashboardImportJson'] }, null, 2));
    if (baseSmall) root.folder('images')!.folder('base')!.file('scene_base_small.jpg', baseSmall.split(',')[1], { base64: true });
    if (overlaySmall) root.folder('images')!.folder('overlays')!.file('scene_mapping_overlay.png', overlaySmall.split(',')[1], { base64: true });
    if (board) root.folder('images')!.folder('previews')!.file('scene_board_preview.png', board.split(',')[1], { base64: true });
    const refs = root.folder('refs')!; ['materials', 'props', 'lighting', 'environment'].forEach((k) => refs.folder(k));
    for (const s of scene.slots) for (let i = 0; i < s.referenceImages.length; i += 1) { const out = await resizeDataUrl(s.referenceImages[i], 768, 'image/jpeg', 0.8); refs.folder(s.category)!.file(`${s.code}_${i + 1}.jpg`, out.split(',')[1], { base64: true }); }
    const boardsFolder = root.folder('boards')!;
    Object.entries(boards.files).forEach(([p, dataUrl]) => {
      if (!p.startsWith('boards/')) return;
      const name = p.replace('boards/', '');
      boardsFolder.file(name, dataUrl.split(',')[1], { base64: true });
    });
    root.folder('prompts')!
      .file('prompt-draft.txt', scene.promptDraft || '')
      .file('local-prompt.txt', prompt)
      .file('imported-prompt-package.json', JSON.stringify(activePromptPackage || {}, null, 2))
      .file('prompt-history.json', JSON.stringify(scene.promptPackages || [], null, 2))
      .file('active-prompt-package.txt', activePromptPackage?.promptPackage?.fullRenderPrompt || '')
      .file('revision-prompts.json', JSON.stringify(scene.revisionPrompts || [], null, 2));
    return { zip, filename: `${project.name.replace(/\s+/g, '_')}_visual-brief.zip` };
  };

  const exportZip = async () => {
    const built = await buildZip();
    const health = await zipHealth(built.zip);
    const blob = await built.zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = built.filename; a.click(); URL.revokeObjectURL(a.href);
    setExportResult({ filename: built.filename, health, sizeBytes: blob.size });
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
    const normalizedScene: Scene = {
      ...importedScene,
      promptPackages: restoredPromptHistory || [],
      revisionPrompts: restoredRevisions || [],
      activePromptPackageId: importedScene.activePromptPackageId || importedPromptObj?.id || restoredPromptHistory?.[0]?.id,
    };
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
      setProjectsIndex(await loadAllDrafts());
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

  return <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
    <header className="h-16 flex-none border-b border-slate-200 bg-white px-3 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
      <div className="flex h-full items-center gap-2 overflow-x-auto">
        <input className="h-9 w-52 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={project.name} onChange={(e) => updateProject({ ...project, name: e.target.value })} />
        <input className="h-9 w-44 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={scene.name} onChange={(e) => updateScene({ name: e.target.value })} />
        <button className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50" onClick={onSaveDraft}><Save className="mr-1 inline h-4 w-4" />Save Local Draft</button>
        <button className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50" onClick={exportZip}><Download className="mr-1 inline h-4 w-4" />Export Draft ZIP</button>
        <label className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium leading-7 text-slate-700 transition hover:bg-slate-50"><Upload className="mr-1 inline h-4 w-4" />Import ZIP<input className="hidden" type="file" accept=".zip" onChange={(e) => importZip(e.target.files?.[0])} /></label>
        <button className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50" onClick={onGeneratePrompt}><WandSparkles className="mr-1 inline h-4 w-4" />Generate Local Prompt</button>
        <label className="h-9 rounded-md bg-blue-600 px-3 py-1.5 font-semibold leading-7 text-white shadow-sm transition hover:bg-blue-700">Upload Base Image<input id="toolbar-base-upload" className="hidden" type="file" accept="image/*" onChange={(e) => onBaseUpload(e.target.files?.[0])} /></label>
        <span className={`ml-auto rounded-full border px-2.5 py-1 text-xs font-medium ${saveStatus === 'saved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{saveStatus === 'saved' ? `Saved locally ${lastSavedAt ? `(${lastSavedAt})` : ''}` : 'Unsaved changes'}</span>
      </div>
    </header>
    <main className="flex-1 min-h-0 overflow-hidden grid" style={{ gridTemplateColumns: '280px minmax(0,1fr) 380px' }}>
      <aside className="h-full min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
          <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Modes</p>
          <div className="flex flex-col gap-1">
            {topTabs.map((c) => <button key={c} className={`rounded-md px-2.5 py-2 text-left text-xs font-semibold capitalize transition ${activeTab === c ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white hover:text-slate-900'}`} onClick={() => setActiveTab(c)}>{c.replace('-', ' ')}</button>)}
          </div>
        </div>
        {slotTabs.includes(activeTab as SlotCategory) && <button className="mb-2 w-full rounded-md bg-blue-600 p-2 text-sm font-semibold text-white transition hover:bg-blue-700" onClick={addSlot}>Add Slot</button>}
        <select className="mb-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700" onChange={(e) => applyRecipe(e.target.value)}><option>Smart recipe presets</option>{Object.keys(smartRecipes).map((s) => <option key={s}>{s}</option>)}</select>
        {slotTabs.includes(activeTab as SlotCategory) && <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Active: {activeTab}</p>
          {currentCategorySlots.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">No {activeTab} yet. Add {categoryPrefix[activeTab as SlotCategory]}01 to start.</div> : currentCategorySlots.map((s) => <button key={s.id} onClick={() => setSelectedSlotId(s.id)} className={`w-full rounded-md border p-2 text-left transition ${selectedSlotId === s.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border border-white shadow-sm" style={{ background: s.color }} /><span className="text-xs font-bold text-slate-700">{s.code}</span></div><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.category}</span></div><div className="mt-1 truncate text-sm font-medium text-slate-800">{s.name}</div></button>)}
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
          <button className="w-full rounded bg-blue-700 p-2" onClick={createBoards}>Generate Boards</button>
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
        <div className="flex flex-none flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm">{(['select', 'pin', 'rect', 'move', 'delete'] as CanvasTool[]).map((t) => <button key={t} data-testid={`tool-${t}`} onClick={() => setTool(t)} className={`rounded-md px-2.5 py-1.5 font-semibold capitalize transition ${tool === t ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{t}</button>)}<button className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setShowOverlay((v) => !v)}>{showOverlay ? 'Hide overlays' : 'Show overlays'}</button><button className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50" onClick={fitToView}>Fit to View</button><div className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Zoom</span><input type="range" min={0.4} max={2.5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></div></div>
        <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {!imgObj ? (
          <div className="flex h-full items-center justify-center rounded-md border-2 border-dashed border-neutral-300 bg-white p-8 text-center">
            <div className="max-w-xl">
              <h2 className="mb-3 text-2xl font-semibold text-neutral-900">Start with a Base Image</h2>
              <p className="mb-5 text-neutral-600">Upload a SketchUp, massing, site photo, or base render image to begin mapping materials, props, lighting, and environment references.</p>
              <button type="button" className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white" onClick={() => document.getElementById('toolbar-base-upload')?.click()}>Upload Base Image</button>
              <p className="mt-4 text-sm text-neutral-500">Then add slots and place tags on the image.</p>
            </div>
          </div>
        ) : <div className="flex h-full min-h-0 items-center justify-center overflow-auto rounded-md bg-slate-100 p-4"><Stage data-testid="mapping-stage" ref={stageRef} width={(imgObj?.width || 900) * zoom} height={(imgObj?.height || 600) * zoom} draggable={tool === 'move'} onClick={onCanvasClick} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} className="rounded-md bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
          <Layer>{imgObj && <KonvaImage image={imgObj} width={imgObj.width * zoom} height={imgObj.height * zoom} />}</Layer>
          {showOverlay && <Layer>{scene.slots.map((s) => <Group key={s.id}>
            {s.regions.map((r) => <Rect key={r.id} x={r.x * (imgObj?.width || 1) * zoom} y={r.y * (imgObj?.height || 1) * zoom} width={r.width * (imgObj?.width || 1) * zoom} height={r.height * (imgObj?.height || 1) * zoom} fill={`${s.color}55`} stroke={selectedObject?.id === r.id ? '#ffffff' : s.color} strokeWidth={selectedObject?.id === r.id ? 2 : 1} draggable={tool === 'select'} onClick={() => { setSelectedObject({ type: 'rect', slotId: s.id, id: r.id }); setSelectedSlotId(s.id); }} onDragEnd={(e) => updateSlot(s.id, { regions: s.regions.map((x) => x.id === r.id ? { ...x, x: e.target.x() / ((imgObj?.width || 1) * zoom), y: e.target.y() / ((imgObj?.height || 1) * zoom) } : x) })} />)}
            {s.pins.map((p) => <Group key={p.id}><Circle x={p.x * (imgObj?.width || 1) * zoom} y={p.y * (imgObj?.height || 1) * zoom} radius={selectedObject?.id === p.id ? 10 : 8} fill={s.color} stroke={selectedObject?.id === p.id ? '#ffffff' : undefined} strokeWidth={selectedObject?.id === p.id ? 2 : 0} draggable={tool === 'select'} onClick={() => { setSelectedObject({ type: 'pin', slotId: s.id, id: p.id }); setSelectedSlotId(s.id); }} onDragEnd={(e) => updateSlot(s.id, { pins: s.pins.map((x) => x.id === p.id ? { ...x, x: e.target.x() / ((imgObj?.width || 1) * zoom), y: e.target.y() / ((imgObj?.height || 1) * zoom) } : x) })} /><Text x={p.x * (imgObj?.width || 1) * zoom + 10} y={p.y * (imgObj?.height || 1) * zoom - 8} text={s.code} fontSize={12} fill={selectedObject?.id === p.id ? '#ffffff' : s.color} /></Group>)}
          </Group>)}
          {draftRect && <Rect x={draftRect.x * (imgObj?.width || 1) * zoom} y={draftRect.y * (imgObj?.height || 1) * zoom} width={draftRect.width * (imgObj?.width || 1) * zoom} height={draftRect.height * (imgObj?.height || 1) * zoom} stroke="#fff" dash={[4, 4]} />}
          </Layer>}
        </Stage></div>}
        </div>
      </section>
      <aside className="h-full min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
        {selectedObject && <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs font-medium text-blue-900">Selected object: {selectedObject.type} on slot {scene.slots.find((s) => s.id === selectedObject.slotId)?.code}</div>}
        {selectedSlot ? <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-semibold text-slate-800">{selectedSlot.code} Inspector</h3>
          <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" value={selectedSlot.name} onChange={(e) => updateSlot(selectedSlot.id, { name: e.target.value })} />
          <textarea className="h-36 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="Thai description" value={selectedSlot.descriptionThai} onChange={(e) => updateSlot(selectedSlot.id, { descriptionThai: e.target.value })} />
          <p className="text-xs text-slate-500">คำอธิบายไทยนี้จะถูกใช้เป็น design intent ตอนสร้าง prompt package</p>
          <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="applyTo" value={selectedSlot.applyTo || ''} onChange={(e) => updateSlot(selectedSlot.id, { applyTo: e.target.value })} />
          <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="finish" value={selectedSlot.finish || ''} onChange={(e) => updateSlot(selectedSlot.id, { finish: e.target.value })} />
          <input className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" placeholder="texture" value={selectedSlot.texture || ''} onChange={(e) => updateSlot(selectedSlot.id, { texture: e.target.value })} />
          <select className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm" value={selectedSlot.creativeFreedom || 'medium'} onChange={(e) => updateSlot(selectedSlot.id, { creativeFreedom: e.target.value as any })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select>
          <input type="color" value={selectedSlot.color} onChange={(e) => updateSlot(selectedSlot.id, { color: e.target.value })} />
          <label className="block rounded-md border border-slate-300 bg-white p-2 text-center text-sm">Upload reference<input className="hidden" type="file" accept="image/*" onChange={(e) => onRefUpload(e.target.files?.[0])} /></label>
          <button className="w-full rounded-md bg-red-600 p-2 text-sm font-medium text-white" onClick={() => { updateScene({ slots: scene.slots.filter((s) => s.id !== selectedSlot.id) }); setSelectedSlotId(''); }}>Delete slot</button>
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
        {activeTab === 'boards' && <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Boards</h4>
          <button className="w-full rounded-md bg-blue-600 p-2 text-white" onClick={createBoards}>Generate Boards</button>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">Generated at: {boardsGeneratedAt || 'not generated'}</div>
          {['boards/mapping_overlay_board.png', 'boards/material_board.png', 'boards/prop_board.png', 'boards/lighting_board.png', 'boards/environment_board.png', 'boards/atmosphere_board.png', 'boards/package_summary.png'].map((k) => (
            <div key={k} className="grid grid-cols-[1fr_auto] gap-1">
              <button className="rounded-md border border-slate-300 bg-white p-2 text-left text-xs" onClick={() => setSelectedBoardKey(k)}>{k.replace('boards/', '')}</button>
              <button className="rounded-md border border-slate-300 bg-white px-2 text-xs" onClick={() => exportBoardPng(k)}>Export</button>
            </div>
          ))}
          {boardsPreview[selectedBoardKey] && <img src={boardsPreview[selectedBoardKey]} alt="board preview" className="rounded border border-slate-300" />}
        </div>}
        {activeTab === 'ai-prompt' && <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Prompt Package</h4>
          <textarea className="h-28 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs" placeholder="Paste visual-brief-ai-import-v1 JSON" value={promptJsonInput} onChange={(e) => setPromptJsonInput(e.target.value)} />
          <div className="grid grid-cols-2 gap-1">
            <button className="rounded-md border border-slate-300 bg-white p-2 text-xs" onClick={onValidatePromptJson}>Validate</button>
            <label className="rounded-md border border-slate-300 bg-white p-2 text-center text-xs">Load File<input className="hidden" type="file" accept=".json" onChange={(e) => onLoadPromptJsonFile(e.target.files?.[0])} /></label>
          </div>
          <button className="w-full rounded-md bg-blue-600 p-2 text-xs text-white" onClick={onImportPromptPackage}>Import into current scene</button>
          {promptValidation && <div className={`rounded-md p-2 text-xs ${promptValidation.status === 'valid' ? 'bg-emerald-50 text-emerald-800' : promptValidation.status === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
            <div>Status: {promptValidation.status}</div>
            <div>Schema: {(promptValidation.parsed as any)?.schemaVersion || '-'}</div>
          </div>}
        </div>}
        {currentHealth && <div className={`mt-3 rounded-md border p-2 text-xs ${currentHealth.status === 'healthy' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : currentHealth.status === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <div className="font-semibold">Package Health: {currentHealth.status}</div>
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
  </div>;
}
