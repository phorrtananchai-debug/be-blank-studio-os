import { buildCopilotContextPackage, CopilotContextPackage } from './copilotContext';
import {
  copilotProviders,
  CopilotProviderId,
  CopilotSettings,
  resolveCopilotApiKey,
} from './copilotSettings';
import {
  mergeInterpretations,
  parseCopilotJson,
  validateCopilotAiResponse,
} from './copilotSchema';
import {
  CopilotContext,
  CopilotInterpretation,
  CopilotMessage,
  interpretCopilotMessage,
  stripSecretsFromCopilotText,
} from './visualLocalCopilot';

export type CopilotProviderResult = {
  interpretation: CopilotInterpretation;
  providerId: CopilotProviderId;
  model: string;
  fallbackUsed: boolean;
  status: 'success' | 'fallback' | 'error';
  errorMessage?: string;
  durationMs: number;
  contextPackage: CopilotContextPackage;
};

export type CopilotProviderDiagnostics = {
  provider: string;
  model: string;
  endpoint?: string;
  status?: number;
  contentType?: string;
  durationMs?: number;
  topLevelShape?: string[];
  choices0Shape?: string[];
  messageContentType?: string;
  messageContentPreview?: string;
  hasToolCalls?: boolean;
  finishReason?: string;
  detectedError?: string;
  jsonExtraction?: 'ok' | 'empty' | 'malformed';
  schemaValidation?: 'ok' | 'error';
  validationIssues?: string[];
  retriedWithoutResponseFormat?: boolean;
  repairAttempted?: boolean;
  repairSucceeded?: boolean;
  failureStage?: string;
};

type InterpretArgs = {
  message: string;
  context: CopilotContext;
  settings: CopilotSettings;
  recentMessages: CopilotMessage[];
  attachedReference?: { name: string; dataUrl: string };
};

export async function interpretWithCopilotProvider(args: InterpretArgs): Promise<CopilotProviderResult> {
  const started = performance.now();
  const cleaned = stripSecretsFromCopilotText(args.message);
  const fallback = {
    ...interpretCopilotMessage(cleaned, args.context, args.attachedReference),
    providerId: 'deterministic',
    model: 'local-rules-v1',
    fallbackUsed: args.settings.providerId !== 'deterministic',
  } satisfies CopilotInterpretation;
  const contextPackage = buildCopilotContextPackage({
    context: args.context,
    userRequest: cleaned,
    recentMessages: args.recentMessages,
    maxMessages: args.settings.maxContextMessages,
  });

  if (args.settings.mode === 'deterministic_only' || args.settings.providerId === 'deterministic') {
    return result(fallback, 'deterministic', 'local-rules-v1', false, 'success', started, contextPackage);
  }

  try {
    const providerInterpretation = await runProvider(args.settings.providerId, args.settings, cleaned, contextPackage);
    const merged = mergeInterpretations(providerInterpretation, fallback);
    return result({ ...merged, fallbackUsed: false }, args.settings.providerId, args.settings.model, false, 'success', started, contextPackage);
  } catch (error) {
    const classified = classifyCopilotProviderError(error);
    if (args.settings.mode === 'ai_assisted') {
      const errorInterpretation: CopilotInterpretation = {
        summary: classified.userMessage,
        actions: [{
          id: `copilot-error-${Date.now()}`,
          type: 'no_action_information',
          title: classified.title,
          rationale: `${classified.userMessage} No state was changed. You can retry or use deterministic fallback.`,
          payload: { category: classified.category },
          affectedScope: 'ui',
          riskLevel: 'low',
          requiresConfirmation: false,
          sourceMessage: cleaned,
          status: 'proposed',
        }],
        contextChips: fallback.contextChips,
        warnings: [...fallback.warnings, classified.detail],
        fallbackUsed: false,
      };
      return result(errorInterpretation, args.settings.providerId, args.settings.model, false, 'error', started, contextPackage, errorInterpretation.warnings[0]);
    }
    return result({
      ...fallback,
      summary: `${fallback.summary} ${classified.userMessage} Deterministic fallback was used.`,
      warnings: [...fallback.warnings, classified.detail],
      fallbackUsed: true,
    }, args.settings.providerId, args.settings.model, true, 'fallback', started, contextPackage, error instanceof Error ? error.message : 'Provider failed');
  }
}

async function runProvider(
  providerId: CopilotProviderId,
  settings: CopilotSettings,
  message: string,
  contextPackage: CopilotContextPackage,
): Promise<CopilotInterpretation> {
  if (providerId === 'mock_ai') return mockAiInterpret(message, contextPackage);
  if (providerId === 'gemini_text') return callGeminiText(settings, message, contextPackage);
  if (providerId === 'openai_compatible') return callOpenAiCompatible(settings, message, contextPackage);
  throw new Error('Unsupported Copilot provider.');
}

function mockAiInterpret(message: string, contextPackage: CopilotContextPackage): CopilotInterpretation {
  const lower = message.toLowerCase();
  const rules = contextPackage.projectRules;
  const benchRule = rules.find((rule) => /bench|upholstery|เบาะ|หนัง/i.test(rule.name)) || rules.find((rule) => rule.id.includes('bench'));
  const brassRule = rules.find((rule) => /brass|ทอง|metal/i.test(rule.name));
  const neutralRule = rules.find((rule) => /neutral|white|mall|ceiling|column/i.test(rule.name));
  const proposedActions: unknown[] = [];
  const warnings: string[] = [];
  const conflicts: string[] = [];

  const wantsCreamBench = /(cream|beige|taupe|tan|ครีม|เบจ)/i.test(lower) && /(bench|seat|upholstery|เบาะ)/i.test(lower);
  if (wantsCreamBench && benchRule?.protectionLevel === 'protected') {
    conflicts.push('Requested upholstery color conflicts with protected Karun Bench Upholstery.');
    proposedActions.push({
      type: 'validate_prompt_conflict',
      title: 'Protected Karun upholstery conflict',
      rationale: 'Karun Bench Upholstery is protected, so cream/beige cannot silently replace the approved maroon/tea-red leather.',
      payload: { conflictingRuleId: benchRule.id, options: ['scene-only temporary override', 'project rule edit proposal', 'cancel conflicting change'] },
      affectedScope: 'project',
      riskLevel: 'high',
      requiresConfirmation: true,
    });
    proposedActions.push({
      type: 'open_panel',
      title: 'Open Source of Truth settings',
      rationale: 'A protected project rule change must be reviewed explicitly.',
      payload: { productSection: 'settings' },
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  if (/(maroon|oxblood|red|leather|upholstery|น้ำตาล|มารูน|แดง|หนัง|เบาะ|แพง)/i.test(lower) && !conflicts.length) {
    proposedActions.push({
      type: 'set_goal',
      title: 'Enable Better Materials',
      rationale: 'The request asks for material color, leather realism, or premium material detail.',
      payload: { goalId: 'better_materials' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    if (benchRule) proposedActions.push({
      type: 'enable_material_rule',
      title: `Use ${benchRule.name}`,
      rationale: 'The request targets the protected upholstery material identity.',
      payload: { ruleId: benchRule.id },
      affectedScope: 'project',
      riskLevel: benchRule.protectionLevel === 'protected' ? 'medium' : 'low',
      requiresConfirmation: benchRule.protectionLevel === 'protected',
    });
    proposedActions.push({
      type: 'add_local_revision',
      title: 'Restore premium Karun upholstery',
      rationale: 'Add a scoped instruction that improves material quality while preserving form.',
      payload: {
        text: 'Copilot revision instruction: restore the bench upholstery to approved Karun deep tea-red / maroon / oxblood leather. Improve leather grain, soft cushion depth, refined stitching, subtle sheen, and premium texture. Preserve bench shape, seams, proportions, position, and scale exactly.',
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  if (/(white|ceiling|column|yellow|ฝ้า|เสา|ขาว|เหลือง|ทอง)/i.test(lower)) {
    proposedActions.push({
      type: 'set_goal',
      title: 'Enable Better Lighting',
      rationale: 'The request asks for scoped white-balance or lighting/color correction.',
      payload: { goalId: 'better_lighting' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    if (neutralRule) proposedActions.push({
      type: 'enable_material_rule',
      title: `Use ${neutralRule.name}`,
      rationale: 'Neutral mall context should guide ceiling/column white balance without neutralizing protected brand colors.',
      payload: { ruleId: neutralRule.id },
      affectedScope: 'project',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    if (brassRule) proposedActions.push({
      type: 'enable_material_rule',
      title: `Use ${brassRule.name}`,
      rationale: 'The request mentions brass/gold warmth and reflection control.',
      payload: { ruleId: brassRule.id },
      affectedScope: 'project',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    proposedActions.push({
      type: 'add_global_revision',
      title: 'Scope neutral surfaces and brass warmth',
      rationale: 'Correct white balance locally while preserving warm Karun accents.',
      payload: {
        text: 'Copilot lighting instruction: make ceiling, white columns, and neutral mall ambient light cleaner neutral white. Keep kiosk lighting warm where physically motivated. Keep brass warm but softer and less harsh yellow; avoid mirror-gold or global yellow cast. Do not cool or desaturate Karun red/maroon materials.',
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  if (/(people|customer|staff|opening day|คน|เปิดร้าน|วันเปิดร้าน)/i.test(lower)) {
    proposedActions.push({
      type: 'set_goal',
      title: 'Enable Add People',
      rationale: 'The request asks for human activity.',
      payload: { goalId: 'add_people' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    proposedActions.push({
      type: 'set_goal',
      title: 'Enable Opening Day',
      rationale: 'The request describes light opening-day activity.',
      payload: { goalId: 'opening_day' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    proposedActions.push({
      type: 'add_global_revision',
      title: 'Add restrained opening-day activity',
      rationale: 'People should support the architecture without blocking protected assets.',
      payload: {
        text: 'Copilot people instruction: add sparse opening-day customers/staff only around circulation and queue zones. Do not block logo, menus, counters, canopy, key corners, or design features. Architecture remains hero.',
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  if (/(cinematic|filter|architectural photography|photo|real|แพง|สมจริง|ภาพถ่าย)/i.test(lower)) {
    proposedActions.push({
      type: 'set_goal',
      title: 'Enable Photographic Finish',
      rationale: 'The request asks for real architectural photography instead of stylized/cinematic treatment.',
      payload: { goalId: 'photographic_finish' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    proposedActions.push({
      type: 'add_global_revision',
      title: 'Return to architectural photography',
      rationale: 'Avoid cinematic/luxury glow language while keeping premium realism.',
      payload: {
        text: 'Copilot photography instruction: make the result feel like real architectural editorial photography, not cinematic grading, Instagram filter, dreamy stylization, or warm luxury glow. Preserve camera and architecture.',
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  if (/(review|qc|revision|หลุด|แก้|ล่าสุด|base)/i.test(lower)) {
    proposedActions.push({
      type: 'add_deviation_note',
      title: 'Add QC deviation note',
      rationale: 'Store the user observation as a revision/QC note before composing a correction prompt.',
      payload: { text: `Copilot QC note: ${message}` },
      affectedScope: 'result',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    proposedActions.push({
      type: 'compose_revision_prompt',
      title: 'Prepare revision prompt',
      rationale: 'Use current QC metadata and protected rules to restore the base design.',
      payload: { text: `Create a revision prompt from this note: ${message}` },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  if (!proposedActions.length) {
    proposedActions.push({
      type: 'request_missing_information',
      title: 'Ask one clarifying question',
      rationale: 'The request is broad; propose restrained options before changing goals.',
      payload: { question: 'Do you want material realism, lighting realism, or photographic finish most?' },
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  } else if (!conflicts.length) {
    proposedActions.push({
      type: 'set_user_request',
      title: 'Save request as generation note',
      rationale: 'The original natural-language intent should remain visible in the shared prompt compiler.',
      payload: { text: message },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
    proposedActions.push({
      type: 'inspect_compiled_prompt',
      title: 'Open Compiled Prompt Inspector',
      rationale: 'Review the exact provider-ready prompt before generation.',
      payload: { activeTab: 'render-pass', renderPassViewMode: 'advanced' },
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  const validation = validateCopilotAiResponse({
    assistantMessage: conflicts.length
      ? 'I found a Source of Truth conflict. I will not change protected Karun materials without explicit confirmation.'
      : 'I interpreted the request into reviewable Visual Local actions. No generation will run until you click Generate.',
    understoodIntent: message,
    proposedActions,
    conflicts,
    warnings,
    confidence: 0.82,
  }, message);
  if (validation.errors.length || !validation.interpretation) throw new Error(validation.errors.join(' '));
  return {
    ...validation.interpretation,
    providerId: 'mock_ai',
    model: 'mock-structured-v1',
    contextChips: [],
  };
}

async function callGeminiText(settings: CopilotSettings, message: string, contextPackage: CopilotContextPackage) {
  const key = resolveCopilotApiKey('gemini_text');
  if (!key) throw new Error('Gemini text key is missing. Save a Copilot/Gemini key or use deterministic fallback.');
  const prompt = copilotSystemPrompt(message, contextPackage);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(settings.timeoutMs),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Gemini text request failed (${response.status}).`);
  const data = JSON.parse(body);
  const raw = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n') || body;
  const parsed = parseCopilotJson(raw);
  if (parsed.error || !parsed.parsed) throw new Error(`Gemini returned malformed Copilot JSON: ${parsed.error || 'empty response'}`);
  const validation = validateCopilotAiResponse(parsed.parsed, message);
  if (validation.errors.length || !validation.interpretation) throw new Error(`Gemini Copilot validation failed: ${validation.errors.join(' ')}`);
  return { ...validation.interpretation, providerId: 'gemini_text', model: settings.model };
}

async function callOpenAiCompatible(settings: CopilotSettings, message: string, contextPackage: CopilotContextPackage) {
  const key = resolveCopilotApiKey('openai_compatible');
  if (!key) throw new Error('OpenAI-compatible Copilot key is missing.');
  const endpoint = normalizeOpenAiCompatibleEndpoint(settings.endpoint);
  const prompt = copilotSystemPrompt(message, contextPackage);
  const makeBody = (useResponseFormat: boolean) => JSON.stringify({
    model: settings.model,
    messages: [
      { role: 'system', content: openAiCompatibleSystemInstruction() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 1800,
    ...(useResponseFormat ? { response_format: { type: 'json_object' } } : {}),
  });

  const first = await submitOpenAiCompatibleRequest({ endpoint, key, body: makeBody(true), settings, model: settings.model });
  const diagnostics = first.diagnostics;
  if (!first.response.ok) {
    throw new Error(`OpenAI-compatible request failed (${first.response.status}). ${formatDiagnostics({ ...diagnostics, failureStage: 'http' })}`);
  }
  const extracted = extractOpenAiCompatibleOutput(first.data, first.body);
  if (extracted.error) {
    throw new Error(`${extracted.error} ${formatDiagnostics({ ...diagnostics, ...extracted.diagnostics, failureStage: 'response-extraction' })}`);
  }
  const raw = extracted.text;
  const parsed = parseCopilotJson(raw);
  if (parsed.error || !parsed.parsed) {
    throw new Error(`Provider returned malformed Copilot JSON: ${parsed.error || 'empty response'}. ${formatDiagnostics({
      ...diagnostics,
      ...extracted.diagnostics,
      jsonExtraction: parsed.jsonText ? 'malformed' : 'empty',
      failureStage: 'json-extraction',
    })}`);
  }
  const validation = validateCopilotAiResponse(parsed.parsed, message);
  if (validation.errors.length || !validation.interpretation) {
    const repaired = await attemptOpenAiCompatibleRepair({
      endpoint,
      key,
      settings,
      model: settings.model,
      invalidJson: parsed.jsonText,
      validationIssues: validation.errors,
      sourceMessage: message,
    });
    if (repaired.interpretation) {
      logCopilotDiagnostics({ ...diagnostics, ...extracted.diagnostics, repairAttempted: true, repairSucceeded: true, jsonExtraction: 'ok', schemaValidation: 'ok' });
      return { ...repaired.interpretation, providerId: 'openai_compatible', model: settings.model };
    }
    throw new Error(`Copilot validation failed: ${validation.errors.join(' ')} ${formatDiagnostics({
      ...diagnostics,
      ...extracted.diagnostics,
      jsonExtraction: 'ok',
      schemaValidation: 'error',
      validationIssues: validation.errors,
      repairAttempted: true,
      repairSucceeded: false,
      failureStage: 'schema-validation',
    })}`);
  }
  logCopilotDiagnostics({ ...diagnostics, ...extracted.diagnostics, jsonExtraction: 'ok', schemaValidation: 'ok' });
  return { ...validation.interpretation, providerId: 'openai_compatible', model: settings.model };
}

async function submitOpenAiCompatibleRequest(args: {
  endpoint: string;
  key: string;
  body: string;
  settings: CopilotSettings;
  model: string;
}) {
  const started = performance.now();
  let response = await fetch(args.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.key}` },
    body: args.body,
    signal: AbortSignal.timeout(args.settings.timeoutMs),
  });
  let body = await response.text();
  let retriedWithoutResponseFormat = false;
  if (!response.ok && shouldRetryWithoutResponseFormat(response.status, body)) {
    retriedWithoutResponseFormat = true;
    const retryBody = JSON.stringify({
      ...JSON.parse(args.body),
      response_format: undefined,
    });
    response = await fetch(args.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.key}` },
      body: retryBody,
      signal: AbortSignal.timeout(args.settings.timeoutMs),
    });
    body = await response.text();
  }
  const data = safeJsonParse(body);
  const diagnostics = buildOpenAiCompatibleDiagnostics({
    provider: 'openai_compatible',
    model: args.model,
    endpoint: args.endpoint,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    durationMs: Math.round(performance.now() - started),
    body,
    data,
    retriedWithoutResponseFormat,
  });
  return { response, body, data, diagnostics };
}

async function attemptOpenAiCompatibleRepair(args: {
  endpoint: string;
  key: string;
  settings: CopilotSettings;
  model: string;
  invalidJson: string;
  validationIssues: string[];
  sourceMessage: string;
}): Promise<{ interpretation?: CopilotInterpretation; diagnostics?: Partial<CopilotProviderDiagnostics> }> {
  const repairBody = JSON.stringify({
    model: args.model,
    messages: [
      { role: 'system', content: openAiCompatibleRepairInstruction() },
      {
        role: 'user',
        content: [
          'Repair this Visual Local Copilot JSON so it passes the schema.',
          'Return corrected JSON only.',
          `Validation issues: ${args.validationIssues.join(' | ')}`,
          `Original user request, sanitized: ${stripSecretsFromCopilotText(args.sourceMessage).slice(0, 600)}`,
          'Invalid JSON:',
          args.invalidJson.slice(0, 6000),
        ].join('\n'),
      },
    ],
    temperature: 0,
    max_tokens: 1400,
    response_format: { type: 'json_object' },
  });
  try {
    const result = await submitOpenAiCompatibleRequest({ endpoint: args.endpoint, key: args.key, body: repairBody, settings: args.settings, model: args.model });
    if (!result.response.ok) return { diagnostics: { ...result.diagnostics, repairAttempted: true, repairSucceeded: false } };
    const extracted = extractOpenAiCompatibleOutput(result.data, result.body);
    if (extracted.error) return { diagnostics: { ...result.diagnostics, ...extracted.diagnostics, repairAttempted: true, repairSucceeded: false } };
    const parsed = parseCopilotJson(extracted.text);
    if (parsed.error || !parsed.parsed) return { diagnostics: { ...result.diagnostics, ...extracted.diagnostics, repairAttempted: true, repairSucceeded: false, jsonExtraction: parsed.jsonText ? 'malformed' : 'empty' } };
    const validation = validateCopilotAiResponse(parsed.parsed, args.sourceMessage);
    if (validation.errors.length || !validation.interpretation) return { diagnostics: { ...result.diagnostics, ...extracted.diagnostics, repairAttempted: true, repairSucceeded: false, schemaValidation: 'error', validationIssues: validation.errors } };
    return { interpretation: validation.interpretation, diagnostics: { ...result.diagnostics, ...extracted.diagnostics, repairAttempted: true, repairSucceeded: true } };
  } catch (error) {
    logCopilotDiagnostics({ provider: 'openai_compatible', model: args.model, endpoint: args.endpoint, repairAttempted: true, repairSucceeded: false, detectedError: error instanceof Error ? preview(error.message) : 'repair failed' });
    return {};
  }
}

export function normalizeOpenAiCompatibleEndpoint(input: string) {
  const value = input.trim().replace(/\/+$/, '');
  if (!value) throw new Error('OpenAI-compatible endpoint is missing.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('OpenAI-compatible endpoint must be a valid http(s) URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OpenAI-compatible endpoint must use http or https.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '' || path === '/') {
    url.pathname = '/chat/completions';
  } else if (path === '/v1') {
    url.pathname = '/v1/chat/completions';
  } else if (/\/chat\/completions$/i.test(path)) {
    url.pathname = path;
  } else {
    url.pathname = `${path}/chat/completions`;
  }
  return url.toString();
}

function openAiCompatibleSystemInstruction() {
  return [
    'Return exactly one top-level JSON object for Visual Local Copilot.',
    'Do not wrap the JSON in markdown fences.',
    'Do not include prose before or after the JSON object.',
    'Use only supported action types from the provided schema.',
    'All proposed actions must include type, title, rationale, payload, affectedScope, riskLevel, and requiresConfirmation.',
    'Do not propose image generation or claim that state has already changed.',
    'Do not include API keys, localStorage data, raw image data, or local file paths.',
  ].join(' ');
}

function openAiCompatibleRepairInstruction() {
  return [
    'You repair JSON for Visual Local Copilot.',
    'Return exactly one corrected top-level JSON object.',
    'No markdown fences. No prose.',
    'Use only supported action types from the original schema.',
    'Do not add image-generation actions.',
    'If a field is missing and safe to infer, fill affectedScope and riskLevel conservatively.',
    'If an action cannot be safely repaired, replace it with request_missing_information or no_action_information.',
  ].join(' ');
}

function shouldRetryWithoutResponseFormat(status: number, body: string) {
  return status >= 400 && status < 500 && /response_format|json_object|unsupported|unknown parameter|invalid_request_error/i.test(body);
}

function safeJsonParse(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export function extractOpenAiCompatibleOutput(data: unknown, fallbackBody: string): {
  text: string;
  error?: string;
  diagnostics: Partial<CopilotProviderDiagnostics>;
} {
  const diagnostics: Partial<CopilotProviderDiagnostics> = {};
  if (isRecord(data) && (isRecord(data.error) || typeof data.error === 'string')) {
    diagnostics.detectedError = summarizeProviderError(data.error);
    return { text: '', error: `Provider error: ${diagnostics.detectedError}`, diagnostics };
  }
  if (isRecord(data) && (typeof data.assistantMessage === 'string' || Array.isArray(data.proposedActions))) {
    return { text: JSON.stringify(data), diagnostics: { messageContentType: 'json-envelope', messageContentPreview: preview(JSON.stringify(data)) } };
  }
  const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
  const choice = choices[0];
  diagnostics.choices0Shape = isRecord(choice) ? Object.keys(choice).slice(0, 20) : [];
  diagnostics.finishReason = isRecord(choice) ? safeString(choice.finish_reason) : '';
  const message = isRecord(choice) && isRecord(choice.message) ? choice.message : undefined;
  const content = message?.content;
  diagnostics.hasToolCalls = Array.isArray(message?.tool_calls);
  diagnostics.messageContentType = Array.isArray(content) ? 'array' : typeof content;

  if (typeof content === 'string' && content.trim()) {
    diagnostics.messageContentPreview = preview(content);
    return { text: content, diagnostics };
  }
  if (Array.isArray(content)) {
    const text = content.map((part) => {
      if (typeof part === 'string') return part;
      if (!isRecord(part)) return '';
      return safeString(part.text) || safeString(part.content) || safeString(part.output_text);
    }).filter(Boolean).join('\n');
    diagnostics.messageContentPreview = preview(text);
    if (text.trim()) return { text, diagnostics };
  }
  if (Array.isArray(message?.tool_calls)) {
    const toolText = message.tool_calls.map((tool) => {
      if (!isRecord(tool)) return '';
      const fn = isRecord(tool.function) ? tool.function : undefined;
      return safeString(fn?.arguments) || safeString(tool.arguments);
    }).filter(Boolean).join('\n');
    diagnostics.messageContentPreview = preview(toolText);
    if (toolText.trim()) return { text: toolText, diagnostics };
  }
  if (typeof fallbackBody === 'string' && fallbackBody.trim().startsWith('{')) {
    diagnostics.messageContentPreview = preview(fallbackBody);
    return { text: fallbackBody, diagnostics };
  }
  return { text: '', error: 'Provider returned an empty or unsupported message content shape.', diagnostics };
}

function buildOpenAiCompatibleDiagnostics(args: {
  provider: string;
  model: string;
  endpoint: string;
  status: number;
  contentType: string;
  durationMs: number;
  body: string;
  data: unknown;
  retriedWithoutResponseFormat: boolean;
}): CopilotProviderDiagnostics {
  const topLevelShape = isRecord(args.data) ? Object.keys(args.data).slice(0, 20) : [];
  const choices = isRecord(args.data) && Array.isArray(args.data.choices) ? args.data.choices : [];
  const choice = choices[0];
  const message = isRecord(choice) && isRecord(choice.message) ? choice.message : undefined;
  return {
    provider: args.provider,
    model: args.model,
    endpoint: args.endpoint,
    status: args.status,
    contentType: args.contentType,
    durationMs: args.durationMs,
    topLevelShape,
    choices0Shape: isRecord(choice) ? Object.keys(choice).slice(0, 20) : [],
    messageContentType: Array.isArray(message?.content) ? 'array' : typeof message?.content,
    messageContentPreview: typeof message?.content === 'string' ? preview(message.content) : '',
    hasToolCalls: Array.isArray(message?.tool_calls),
    finishReason: isRecord(choice) ? safeString(choice.finish_reason) : '',
    detectedError: isRecord(args.data) && 'error' in args.data ? summarizeProviderError(args.data.error) : undefined,
    retriedWithoutResponseFormat: args.retriedWithoutResponseFormat,
  };
}

function formatDiagnostics(diagnostics: Partial<CopilotProviderDiagnostics>) {
  const parts = [
    diagnostics.failureStage ? `stage=${diagnostics.failureStage}` : '',
    diagnostics.endpoint ? `endpoint=${diagnostics.endpoint}` : '',
    diagnostics.status ? `status=${diagnostics.status}` : '',
    diagnostics.contentType ? `contentType=${diagnostics.contentType}` : '',
    diagnostics.finishReason ? `finishReason=${diagnostics.finishReason}` : '',
    diagnostics.messageContentType ? `messageContentType=${diagnostics.messageContentType}` : '',
    diagnostics.messageContentPreview ? `contentPreview="${diagnostics.messageContentPreview}"` : '',
    diagnostics.hasToolCalls ? 'toolCalls=true' : '',
    diagnostics.detectedError ? `providerError="${diagnostics.detectedError}"` : '',
    diagnostics.jsonExtraction ? `jsonExtraction=${diagnostics.jsonExtraction}` : '',
    diagnostics.schemaValidation ? `schemaValidation=${diagnostics.schemaValidation}` : '',
    diagnostics.validationIssues?.length ? `validationIssues=${diagnostics.validationIssues.join(' | ')}` : '',
    diagnostics.retriedWithoutResponseFormat ? 'retriedWithoutResponseFormat=true' : '',
    diagnostics.repairAttempted ? `repairAttempted=true` : '',
    diagnostics.repairSucceeded ? `repairSucceeded=true` : '',
  ].filter(Boolean);
  return parts.length ? `Diagnostics: ${parts.join('; ')}` : '';
}

function classifyCopilotProviderError(error: unknown) {
  const detail = error instanceof Error ? error.message : 'Provider failed.';
  const lower = detail.toLowerCase();
  if (/api key|authentication|unauthorized|401|403|forbidden/.test(lower)) {
    return { category: 'authentication', title: 'Authentication failed', userMessage: 'Authentication failed. Check the saved Copilot API key.', detail };
  }
  if (/unsupported type/.test(lower)) {
    return { category: 'unsupported_actions', title: 'Unsupported actions returned', userMessage: 'The provider returned action types Visual Local will not apply.', detail };
  }
  if (/validation|schema|repair/.test(lower)) {
    return { category: 'schema_validation', title: 'Schema validation failed', userMessage: 'The provider returned JSON, but it did not match the safe Copilot action schema.', detail };
  }
  if (/malformed|json|no json object/.test(lower)) {
    return { category: 'malformed_json', title: 'Malformed JSON', userMessage: 'The provider responded, but the JSON could not be parsed safely.', detail };
  }
  if (/valid http|must be a valid|must use http|404|not found/.test(lower)) {
    return { category: 'endpoint', title: 'Invalid endpoint', userMessage: 'The OpenAI-compatible endpoint looks invalid or unreachable.', detail };
  }
  if (/failed to fetch|cors|network|timeout|abort/.test(lower)) {
    return { category: 'network', title: 'Network or CORS error', userMessage: 'The provider request could not complete because of network, timeout, or CORS behavior.', detail };
  }
  if (/response_format|retriedwithoutresponseformat/.test(lower)) {
    return { category: 'response_format', title: 'Provider rejected JSON mode', userMessage: 'The provider rejected JSON mode. Visual Local retried without it, but the response still was not usable.', detail };
  }
  if (/empty|unsupported message content/.test(lower)) {
    return { category: 'empty_response', title: 'Empty AI response', userMessage: 'The provider returned an empty or unsupported response shape.', detail };
  }
  return { category: 'provider', title: 'AI interpretation failed', userMessage: 'AI Copilot could not return a valid structured response.', detail };
}

function logCopilotDiagnostics(diagnostics: Partial<CopilotProviderDiagnostics>) {
  try {
    if (localStorage.getItem('visual-local-developer-mode') !== 'true') return;
    console.info('[Visual Local Copilot diagnostics]', diagnostics);
  } catch {
    // Diagnostics are optional and local-only.
  }
}

function summarizeProviderError(error: unknown) {
  if (typeof error === 'string') return preview(error);
  if (!isRecord(error)) return 'unknown provider error';
  return preview([safeString(error.type), safeString(error.code), safeString(error.message)].filter(Boolean).join(' / '));
}

function preview(text: string) {
  return stripSecretsFromCopilotText(text).replace(/\s+/g, ' ').slice(0, 220);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function copilotSystemPrompt(message: string, contextPackage: CopilotContextPackage) {
  return [
    'You are Visual Local Copilot for an architectural visualization workflow.',
    'Return only JSON. Do not generate images. Do not trigger generation. Do not mutate state.',
    'The user reviews proposed actions before any action is applied.',
    'Project Source of Truth and protected assets outrank generic language such as premium, neutral, luxury, or cinematic.',
    'If the request conflicts with protected rules, propose validate_prompt_conflict and safe alternatives.',
    'Use only supported action types. Keep actions specific and low-risk.',
    'Do not include API keys, raw image data, local file paths, or unrelated project history.',
    '',
    'Supported response shape:',
    JSON.stringify({
      assistantMessage: '',
      understoodIntent: '',
      proposedActions: [{
        type: 'set_goal',
        title: '',
        rationale: '',
        payload: {},
        affectedScope: 'scene',
        riskLevel: 'low',
        requiresConfirmation: false,
      }],
      conflicts: [],
      missingInformation: [],
      warnings: [],
      suggestedNextStep: '',
      confidence: 0.8,
      noActionReason: '',
    }, null, 2),
    '',
    'Context package:',
    JSON.stringify(contextPackage, null, 2),
    '',
    `User request: ${message}`,
  ].join('\n');
}

function result(
  interpretation: CopilotInterpretation,
  providerId: CopilotProviderId,
  model: string,
  fallbackUsed: boolean,
  status: CopilotProviderResult['status'],
  started: number,
  contextPackage: CopilotContextPackage,
  errorMessage?: string,
): CopilotProviderResult {
  const provider = copilotProviders.find((item) => item.id === providerId);
  return {
    interpretation: {
      ...interpretation,
      providerId,
      model,
      fallbackUsed,
      contextChips: [
        ...(interpretation.contextChips || []),
        `${provider?.displayName || providerId}${fallbackUsed ? ' fallback' : ''}`,
      ],
    },
    providerId,
    model,
    fallbackUsed,
    status,
    errorMessage,
    durationMs: Math.round(performance.now() - started),
    contextPackage,
  };
}
