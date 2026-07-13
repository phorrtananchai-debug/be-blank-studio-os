import {
  RenderPassBuilderState,
  Scene,
  SceneReferenceImage,
  VisualLocalAiComposerResponse,
  ProjectSourceOfTruth,
} from './types';
import { materialRulePromptLines, projectRuleReferenceInstructions, scopedColorCastCorrectionLine } from './projectSourceOfTruth';

export const GEMINI_API_KEY_STORAGE_KEY = 'visual-local-gemini-api-key';

export const sceneReferenceRoleOptions: Array<{ value: SceneReferenceImage['role']; label: string }> = [
  { value: 'lighting_mood', label: 'Lighting Mood' },
  { value: 'material_mood', label: 'Material Mood' },
  { value: 'environment_mood', label: 'Environment Mood' },
  { value: 'color_grade', label: 'Color Grade' },
  { value: 'people_activity', label: 'People Activity' },
  { value: 'style_avoid', label: 'Style Avoid' },
  { value: 'do_not_copy_design', label: 'Do Not Copy Design' },
];

export function stripJsonFences(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] || trimmed).trim();
}

export function parseGeminiComposerResponse(raw: string): { parsed?: VisualLocalAiComposerResponse; error?: string; jsonText: string } {
  const jsonText = stripJsonFences(raw);
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed.schema !== 'visual-local-ai-composer-v1') {
      return { jsonText, error: `Unexpected schema: ${parsed.schema || 'missing'}` };
    }
    return { jsonText, parsed };
  } catch (error) {
    return { jsonText, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

function dataUrlToInlineData(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function composerInstruction(scene: Scene, state: RenderPassBuilderState, sourceOfTruth?: ProjectSourceOfTruth) {
  return [
    'You are Visual Local Scene Composer.',
    'You are an AI Art Director and Prompt QC assistant for architectural visualization.',
    '',
    'Do not generate an image.',
    'Do not edit the image.',
    'Do not redesign the project.',
    '',
    'The base render is the source of truth.',
    'Optional render pass inputs may be included. Treat them as technical guides only, not final appearance references.',
    'Object ID Pass: color-coded object segmentation guide only. Use it to understand object boundaries and protected groups.',
    'Material ID Pass: color-coded material zone guide only. Use it to understand material regions, not final colors.',
    'Depth Pass: grayscale spatial depth reference only. Use it for foreground/background and atmosphere planning.',
    'Reference images are only for mood, lighting, material feeling, atmosphere, color grading, or people/activity direction according to their assigned roles.',
    'Do not copy architecture, furniture, layout, signage, objects, or design elements from reference images.',
    '',
    'Project Source of Truth:',
    ...(materialRulePromptLines(sourceOfTruth).length ? materialRulePromptLines(sourceOfTruth) : ['No project-specific material source-of-truth rules active.']),
    `Scoped color-cast correction: ${scopedColorCastCorrectionLine(sourceOfTruth)}`,
    ...(projectRuleReferenceInstructions(sourceOfTruth).length ? ['Project material reference usage:', ...projectRuleReferenceInstructions(sourceOfTruth)] : []),
    '',
    'Analyze the base render and references.',
    'Return only valid JSON matching schema visual-local-ai-composer-v1.',
    '',
    'Current Visual Local scene context:',
    JSON.stringify({
      projectName: state.sceneSetup.projectName,
      sceneName: scene.name,
      sceneType: scene.type,
      sceneSetup: state.sceneSetup,
      designLock: state.designLock,
      protectedAssets: state.protectedAssets.map((asset) => ({ name: asset.name, status: asset.status, locked: asset.locked })),
      modes: {
        visualDirectionMode: state.visualDirectionMode,
        lightingMode: state.lightingMode,
        environmentMode: state.environmentMode,
        materialEnhancementLevel: state.materialEnhancementLevel,
        peopleActivityLayer: state.peopleActivityLayer,
        selectedPassType: state.selectedPassType,
        selectedModelAdapter: state.selectedModelAdapter,
        promptVerbosity: state.promptVerbosity,
      },
      referenceImages: state.aiComposer.references
        .filter((ref) => ref.included !== false)
        .map((ref) => ({ id: ref.id, name: ref.name, role: ref.role, notes: ref.notes || '' })),
      renderPassInputs: (state.renderPassInputs || [])
        .filter((input) => input.enabled)
        .map((input) => ({
          id: input.id,
          type: input.type,
          name: input.name,
          notes: input.notes || '',
          colorLegend: input.colorLegend || [],
        })),
    }, null, 2),
    '',
    'Required JSON shape:',
    JSON.stringify({
      schema: 'visual-local-ai-composer-v1',
      sceneAnalysis: {
        cameraSummary: '',
        compositionSummary: '',
        architectureToPreserve: [],
        protectedAssetsVisible: [],
        materialZones: [{ name: '', location: '', currentAppearance: '', recommendedDirection: '', confidence: 0 }],
        lightingCondition: '',
        environmentCondition: '',
        equipmentVisible: [],
        signageAndBranding: [],
        hallucinationRisks: [],
      },
      referenceAnalysis: [{ referenceId: '', role: '', usableDirection: '', doNotCopy: [], confidence: 0 }],
      recommendedDirection: {
        visualDirection: '',
        lightingDirection: '',
        materialDirection: '',
        environmentDirection: '',
        colorGradeDirection: '',
        peopleDirection: '',
      },
      passPlan: [{ pass: 'material_enhancement', reason: '', priority: 1 }],
      promptPackage: {
        selectedPass: '',
        fullPrompt: '',
        negativePrompt: '',
        revisionPromptTemplate: '',
      },
      confidence: { overall: 0, notes: [] },
      renderPassInputAnalysis: {
        objectIdMap: [{ colorHex: '', label: '', inferredObjectName: '', correspondingBaseRenderLocation: '', preservePriority: 'high', confidence: 0, notes: '' }],
        materialIdMap: [{ colorHex: '', materialName: '', correspondingBaseRenderLocation: '', recommendedDirection: '', confidence: 0 }],
        depthAnalysis: { foreground: [], midground: [], background: [], atmosphereNotes: '', confidence: 0 },
      },
    }, null, 2),
  ].join('\n');
}

export async function callGeminiSceneComposer(args: {
  apiKey: string;
  model: string;
  scene: Scene;
  state: RenderPassBuilderState;
  sourceOfTruth?: ProjectSourceOfTruth;
}): Promise<{ parsed?: VisualLocalAiComposerResponse; raw: string; error?: string }> {
  const { apiKey, model, scene, state, sourceOfTruth } = args;
  if (!apiKey.trim()) return { raw: '', error: 'Missing Gemini API key.' };
  if (!scene.baseImage) return { raw: '', error: 'Missing base render.' };

  const parts: any[] = [{ text: composerInstruction(scene, state, sourceOfTruth) }];
  const base = dataUrlToInlineData(scene.baseImage);
  if (base) {
    parts.push({ text: 'BASE RENDER - source of truth' });
    parts.push({ inlineData: base });
  }
  state.aiComposer.references.filter((ref) => ref.included !== false).forEach((ref) => {
    const inlineData = dataUrlToInlineData(ref.dataUrl);
    if (!inlineData) return;
    parts.push({ text: `REFERENCE IMAGE ${ref.id} (${ref.role}) - mood/context only. Notes: ${ref.notes || '-'}` });
    parts.push({ inlineData });
  });
  sourceOfTruth?.materialRules
    .filter((rule) => rule.enabled)
    .forEach((rule) => {
      rule.referenceImages.filter((ref) => ref.dataUrl).forEach((ref) => {
        const inlineData = dataUrlToInlineData(ref.dataUrl);
        if (!inlineData) return;
        parts.push({ text: `PROJECT MATERIAL SOURCE-OF-TRUTH REFERENCE ${ref.id} for ${rule.name}. Use scopes only: ${ref.scopes.join(', ')}. Notes: ${ref.notes || '-'}. Do not copy architecture, composition, furniture form, or layout unless explicitly allowed by the scope.` });
        parts.push({ inlineData });
      });
    });
  (state.renderPassInputs || []).filter((input) => input.enabled).forEach((input) => {
    const inlineData = dataUrlToInlineData(input.dataUrl);
    if (!inlineData) return;
    const roleLabel = input.type === 'object_id'
      ? 'OBJECT ID PASS - segmentation guide only, not final appearance'
      : input.type === 'material_id'
        ? 'MATERIAL ID PASS - material zone guide only, do not copy flat colors'
        : input.type === 'depth'
          ? 'DEPTH PASS - grayscale spatial depth guide only'
          : `RENDER PASS INPUT ${input.type} - technical guide only`;
    parts.push({ text: `${roleLabel}. Name: ${input.name}. Notes: ${input.notes || '-'}. Color legend: ${JSON.stringify(input.colorLegend || [])}` });
    parts.push({ inlineData });
  });

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
  const body = await response.text();
  if (!response.ok) return { raw: body, error: `Gemini HTTP ${response.status}: ${body.slice(0, 500)}` };
  let raw = body;
  try {
    const data = JSON.parse(body);
    raw = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n') || body;
  } catch {
    raw = body;
  }
  const parsed = parseGeminiComposerResponse(raw);
  return { raw, parsed: parsed.parsed, error: parsed.error };
}
