import {
  CopilotActionProposal,
  CopilotActionStatus,
  CopilotActionType,
  CopilotInterpretation,
  CopilotRiskLevel,
} from './visualLocalCopilot';

export type CopilotAiResponse = {
  assistantMessage: string;
  understoodIntent?: string;
  proposedActions?: unknown[];
  conflicts?: string[];
  missingInformation?: string[];
  warnings?: string[];
  suggestedNextStep?: string;
  confidence?: number;
  noActionReason?: string;
};

const allowedActionTypes = new Set<CopilotActionType>([
  'set_goal',
  'remove_goal',
  'set_user_request',
  'add_generation_note',
  'add_deviation_note',
  'add_global_revision',
  'add_local_revision',
  'compose_revision_prompt',
  'enable_material_rule',
  'disable_material_rule_proposal',
  'update_material_rule_draft',
  'create_material_rule_draft',
  'attach_reference',
  'set_reference_scope',
  'protect_asset',
  'open_panel',
  'inspect_compiled_prompt',
  'validate_prompt_conflict',
  'prepare_generation',
  'explain_result',
  'compare_versions',
  'summarize_changes',
  'request_missing_information',
  'no_action_information',
]);

const scopes = new Set<CopilotActionProposal['affectedScope']>(['ui', 'scene', 'project', 'result', 'prompt', 'reference']);
const risks = new Set<CopilotRiskLevel>(['low', 'medium', 'high']);
const statuses = new Set<CopilotActionStatus>(['proposed', 'applied', 'rejected', 'blocked']);

export function parseCopilotJson(raw: string): { parsed?: CopilotAiResponse; error?: string; jsonText: string } {
  const jsonText = extractCopilotJsonText(raw);
  if (!jsonText) return { jsonText: '', error: 'No JSON object found.' };
  try {
    const parsed = JSON.parse(jsonText);
    return { parsed, jsonText };
  } catch (error) {
    return { jsonText, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function validateCopilotAiResponse(raw: unknown, sourceMessage: string): { interpretation?: CopilotInterpretation; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(raw)) return { errors: ['Response is not an object.'] };
  const assistantMessage = safeString(raw.assistantMessage) || safeString(raw.message) || safeString(raw.summary) || safeString(raw.understoodIntent) || '';
  const proposed = Array.isArray(raw.proposedActions) ? raw.proposedActions : Array.isArray(raw.actions) ? raw.actions : [];
  if (!assistantMessage && !proposed.length) errors.push('Missing assistantMessage and proposedActions.');

  const actions: CopilotActionProposal[] = proposed.map((item, index) => validateAction(item, sourceMessage, index, errors)).filter(Boolean) as CopilotActionProposal[];
  if (!actions.length && !errors.length) {
    actions.push({
      id: makeId(),
      type: 'no_action_information',
      title: 'No safe action proposed',
      rationale: safeString(raw.noActionReason) || 'The provider did not propose a state-changing action.',
      payload: {},
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
      status: 'proposed',
    });
  }
  if (errors.length) return { errors };
  return {
    errors: [],
    interpretation: {
      summary: assistantMessage || summarizeActions(actions),
      actions,
      warnings: stringArray(raw.warnings),
      conflicts: stringArray(raw.conflicts),
      missingInformation: stringArray(raw.missingInformation),
      confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : undefined,
      contextChips: [],
    },
  };
}

function validateAction(raw: unknown, sourceMessage: string, index: number, errors: string[]) {
  if (!isRecord(raw)) {
    errors.push(`Action ${index + 1} is not an object.`);
    return null;
  }
  const type = (safeString(raw.type) || safeString(raw.actionType)) as CopilotActionType;
  if (!allowedActionTypes.has(type)) {
    errors.push(`Action ${index + 1} has unsupported type: ${type || 'missing'}.`);
    return null;
  }
  const explicitScope = safeString(raw.affectedScope) as CopilotActionProposal['affectedScope'];
  const affectedScope = explicitScope || defaultScopeForType(type);
  if (!scopes.has(affectedScope)) errors.push(`Action ${index + 1} has invalid affectedScope.`);
  const explicitRisk = safeString(raw.riskLevel) as CopilotRiskLevel;
  const riskLevel = explicitRisk || defaultRiskForType(type);
  if (!risks.has(riskLevel)) errors.push(`Action ${index + 1} has invalid riskLevel.`);
  const status = safeString(raw.status) as CopilotActionStatus;
  const payload = normalizePayload(type, raw);
  if (type === 'set_goal' && !safeString(payload.goalId)) errors.push(`Action ${index + 1} set_goal is missing payload.goalId.`);
  if ((type === 'add_global_revision' || type === 'add_local_revision' || type === 'add_generation_note') && !safeString(payload.text)) {
    errors.push(`Action ${index + 1} ${type} is missing payload.text.`);
  }
  if (type === 'enable_material_rule' && !safeString(payload.ruleId)) errors.push(`Action ${index + 1} enable_material_rule is missing payload.ruleId.`);
  if (errors.length) return null;
  return {
    id: safeString(raw.id) || makeId(),
    type,
    title: safeString(raw.title) || type.replace(/_/g, ' '),
    rationale: safeString(raw.rationale) || 'Provider proposed this action from the user request.',
    payload,
    affectedScope,
    riskLevel,
    requiresConfirmation: Boolean(raw.requiresConfirmation) || riskLevel === 'high',
    sourceMessage,
    status: statuses.has(status) ? status : 'proposed',
  } satisfies CopilotActionProposal;
}

function normalizePayload(type: CopilotActionType, raw: Record<string, unknown>) {
  const payload = isRecord(raw.payload) ? { ...raw.payload } : {};
  if (type === 'set_goal' && !safeString(payload.goalId)) {
    const goalId = safeString(raw.goalId) || safeString(raw.goal) || safeString(raw.id);
    if (goalId) payload.goalId = goalId;
  }
  if ((type === 'add_global_revision' || type === 'add_local_revision' || type === 'add_generation_note') && !safeString(payload.text)) {
    const text = safeString(raw.text) || safeString(raw.note) || safeString(raw.instruction) || safeString(raw.promptInstruction);
    if (text) payload.text = text;
  }
  if (type === 'enable_material_rule' && !safeString(payload.ruleId)) {
    const ruleId = safeString(raw.ruleId) || safeString(raw.materialRuleId);
    if (ruleId) payload.ruleId = ruleId;
  }
  return payload;
}

function defaultScopeForType(type: CopilotActionType): CopilotActionProposal['affectedScope'] {
  if (type.includes('material_rule') || type === 'protect_asset' || type === 'validate_prompt_conflict') return 'project';
  if (type.includes('reference')) return 'reference';
  if (type.includes('revision') || type.includes('deviation') || type.includes('result') || type === 'compare_versions') return 'result';
  if (type.includes('prompt') || type === 'set_user_request' || type === 'add_generation_note') return 'prompt';
  if (type === 'open_panel' || type === 'inspect_compiled_prompt' || type === 'request_missing_information' || type === 'no_action_information') return 'ui';
  return 'scene';
}

function defaultRiskForType(type: CopilotActionType): CopilotRiskLevel {
  if (type === 'validate_prompt_conflict' || type === 'protect_asset' || type.includes('material_rule')) return 'medium';
  return 'low';
}

export function mergeInterpretations(primary: CopilotInterpretation, fallback: CopilotInterpretation): CopilotInterpretation {
  const existing = new Set(primary.actions.map((action) => `${action.type}:${JSON.stringify(action.payload)}`));
  const mergedActions = [
    ...primary.actions,
    ...fallback.actions.filter((action) => !existing.has(`${action.type}:${JSON.stringify(action.payload)}`)),
  ];
  return {
    ...primary,
    actions: mergedActions,
    warnings: [...(primary.warnings || []), ...(fallback.warnings || [])],
    conflicts: [...(primary.conflicts || []), ...(fallback.conflicts || [])],
    contextChips: fallback.contextChips,
  };
}

export function stripJsonFences(raw: string) {
  const withoutBom = raw.replace(/^\uFEFF/, '');
  const trimmed = withoutBom.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] || trimmed).trim();
}

export function extractCopilotJsonText(raw: string) {
  const cleaned = stripJsonFences(raw);
  if (!cleaned) return '';
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) return cleaned;

  const objects: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(cleaned.slice(start, index + 1));
        start = -1;
      }
    }
  }

  if (objects.length === 1) return objects[0];
  if (objects.length > 1) {
    const unique = [...new Set(objects.map((item) => item.trim()))];
    if (unique.length === 1) return unique[0];
    return '';
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(safeString).filter(Boolean).slice(0, 12) : [];
}

function summarizeActions(actions: CopilotActionProposal[]) {
  return `Prepared ${actions.length} validated action${actions.length === 1 ? '' : 's'} for review.`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `copilot-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
