import {
  MaterialRuleReferenceScope,
  ProjectSourceOfTruth,
  ResultRound,
} from '../../types';
import { enabledMaterialRules } from '../../projectSourceOfTruth';

export type CopilotActionType =
  | 'set_goal'
  | 'remove_goal'
  | 'set_user_request'
  | 'add_generation_note'
  | 'add_deviation_note'
  | 'add_global_revision'
  | 'add_local_revision'
  | 'compose_revision_prompt'
  | 'enable_material_rule'
  | 'disable_material_rule_proposal'
  | 'update_material_rule_draft'
  | 'create_material_rule_draft'
  | 'attach_reference'
  | 'set_reference_scope'
  | 'protect_asset'
  | 'open_panel'
  | 'inspect_compiled_prompt'
  | 'validate_prompt_conflict'
  | 'prepare_generation'
  | 'explain_result'
  | 'compare_versions'
  | 'summarize_changes'
  | 'request_missing_information'
  | 'no_action_information';

export type CopilotRiskLevel = 'low' | 'medium' | 'high';
export type CopilotActionStatus = 'proposed' | 'applied' | 'rejected' | 'blocked';

export type CopilotActionProposal = {
  id: string;
  type: CopilotActionType;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  affectedScope: 'ui' | 'scene' | 'project' | 'result' | 'prompt' | 'reference';
  riskLevel: CopilotRiskLevel;
  requiresConfirmation: boolean;
  sourceMessage: string;
  status: CopilotActionStatus;
};

export type CopilotMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string;
  actions?: CopilotActionProposal[];
  providerId?: string;
  model?: string;
  fallbackUsed?: boolean;
  warnings?: string[];
  conflicts?: string[];
};

export type CopilotThreadState = {
  id: string;
  projectId: string;
  sceneId: string;
  createdAt: string;
  updatedAt: string;
  messages: CopilotMessage[];
  minimized?: boolean;
  expanded?: boolean;
};

export type CopilotContext = {
  projectId: string;
  sceneId: string;
  projectName: string;
  sceneName: string;
  sourceOfTruth?: ProjectSourceOfTruth;
  activeGoalIds: string[];
  activeResultRound?: ResultRound | null;
  providerLabel?: string;
  modelLabel?: string;
  referencesCount?: number;
  mode?: string;
  compiledPromptSummary?: string;
  recentAppliedActionIds?: string[];
};

export type CopilotInterpretation = {
  summary: string;
  actions: CopilotActionProposal[];
  warnings: string[];
  contextChips: string[];
  providerId?: string;
  model?: string;
  confidence?: number;
  conflicts?: string[];
  missingInformation?: string[];
  fallbackUsed?: boolean;
};

const makeId = () => globalThis.crypto?.randomUUID?.() || `copilot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const lower = (text: string) => text.toLowerCase();

function action(input: Omit<CopilotActionProposal, 'id' | 'status'>): CopilotActionProposal {
  return { ...input, id: makeId(), status: 'proposed' };
}

function karunBenchRuleId(source?: ProjectSourceOfTruth) {
  return enabledMaterialRules(source).find((rule) => (
    rule.id === 'karun-bench-upholstery'
    || /bench|upholstery|เบาะ|หนัง/i.test(rule.name)
  ))?.id;
}

function karunBrandConflict(text: string, source?: ProjectSourceOfTruth) {
  const hasKarunBench = Boolean(karunBenchRuleId(source));
  if (!hasKarunBench) return false;
  return includesAny(text, ['ครีม', 'เบจ', 'beige', 'cream', 'taupe', 'tan'])
    && includesAny(text, ['เบาะ', 'bench', 'seat', 'upholstery']);
}

export function interpretCopilotMessage(
  message: string,
  context: CopilotContext,
  attachedReference?: { name: string; dataUrl: string },
): CopilotInterpretation {
  const text = lower(stripSecretsFromCopilotText(message.trim()));
  const actions: CopilotActionProposal[] = [];
  const warnings: string[] = [];
  const sourceMessage = stripSecretsFromCopilotText(message);
  const benchRuleId = karunBenchRuleId(context.sourceOfTruth);
  const karunRulesActive = enabledMaterialRules(context.sourceOfTruth).length > 0;

  if (!text) {
    return {
      summary: 'Tell Copilot what you want to improve, preserve, review, or prepare.',
      actions: [action({
        type: 'no_action_information',
        title: 'Waiting for instruction',
        rationale: 'No request was provided.',
        payload: {},
        affectedScope: 'ui',
        riskLevel: 'low',
        requiresConfirmation: false,
        sourceMessage,
      })],
      warnings,
      contextChips: contextChips(context),
    };
  }

  if (karunBrandConflict(text, context.sourceOfTruth)) {
    warnings.push('This conflicts with the protected Karun bench upholstery rule. The active Source of Truth defines this upholstery as tea-red / maroon / oxblood.');
    actions.push(action({
      type: 'validate_prompt_conflict',
      title: 'Protected Karun material conflict',
      rationale: 'The request appears to recolor protected Karun upholstery into a cream/beige/tan family.',
      payload: {
        conflictingRuleId: benchRuleId,
        options: ['temporary_scene_override', 'edit_project_rule_with_confirmation', 'cancel_conflicting_change'],
      },
      affectedScope: 'project',
      riskLevel: 'high',
      requiresConfirmation: true,
      sourceMessage,
    }));
    actions.push(action({
      type: 'open_panel',
      title: 'Open Source of Truth settings',
      rationale: 'Protected project rules should be reviewed before changing brand material identity.',
      payload: { productSection: 'settings' },
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    return {
      summary: 'Copilot found a protected-rule conflict and will not silently change Karun material identity.',
      actions,
      warnings,
      contextChips: contextChips(context),
    };
  }

  if (includesAny(text, ['มารูน', 'แดง', 'red', 'maroon', 'oxblood', 'brown', 'น้ำตาล', 'หนัง', 'leather', 'upholstery', 'เบาะ'])) {
    actions.push(action({
      type: 'set_goal',
      title: 'Enable Better Materials',
      rationale: 'The request focuses on upholstery/material color and realism.',
      payload: { goalId: 'better_materials' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    if (benchRuleId) {
      actions.push(action({
        type: 'enable_material_rule',
        title: 'Use Karun Bench Upholstery rule',
        rationale: 'The request references the bench/upholstery material and Karun maroon/red identity.',
        payload: { ruleId: benchRuleId },
        affectedScope: 'project',
        riskLevel: 'medium',
        requiresConfirmation: true,
        sourceMessage,
      }));
    }
    actions.push(action({
      type: 'add_local_revision',
      title: 'Prepare bench material revision',
      rationale: 'Create a reviewable instruction without triggering generation.',
      payload: {
        text: [
          'Restore the curved bench upholstery to approved Karun deep tea-red / maroon / oxblood leather.',
          'Improve real leather grain, cushion softness, refined stitching/channel detail, and restrained satin highlights.',
          'Preserve bench shape, seam layout, position, scale, and proportions exactly.',
          'Do not convert the upholstery to beige, taupe, tan, cognac, orange leather, generic brown, or washed-out neutral leather.',
        ].join(' '),
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  }

  if (includesAny(text, ['คน', 'people', 'customer', 'opening day', 'วันเปิดร้าน', 'เปิดร้าน', 'queue', 'staff'])) {
    actions.push(action({
      type: 'set_goal',
      title: 'Enable Add People',
      rationale: 'The request asks for human activity.',
      payload: { goalId: 'add_people' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    actions.push(action({
      type: 'set_goal',
      title: 'Enable Opening Day',
      rationale: 'The request describes an opening-day atmosphere.',
      payload: { goalId: 'opening_day' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    actions.push(action({
      type: 'add_global_revision',
      title: 'Add human activity constraint',
      rationale: 'People should support the render without blocking the design.',
      payload: {
        text: 'Add subtle opening-day human activity around circulation and queue areas only. People must not block logo, menu boards, counters, kiosk geometry, or key design features.',
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  }

  if (includesAny(text, ['ขาว', 'white', 'ceiling', 'ฝ้า', 'เสา', 'column', 'yellow cast', 'yellow', 'เหลือง', 'brass', 'gold', 'ทอง'])) {
    actions.push(action({
      type: 'set_goal',
      title: 'Enable Better Lighting',
      rationale: 'The request involves white balance, ceiling/columns, or lighting color.',
      payload: { goalId: 'better_lighting' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    actions.push(action({
      type: 'add_global_revision',
      title: 'Scope white-balance correction',
      rationale: 'Neutral surfaces can be corrected without cooling protected brand materials.',
      payload: {
        text: 'Make ceiling, white columns, gray/neutral materials, and ambient mall light more neutral white. Do not cool or desaturate protected Karun red/maroon upholstery or red floor accents.',
      },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  }

  if (includesAny(text, ['แพง', 'premium', 'luxury', 'editorial', 'photographic', 'photo', 'realistic', 'สมจริง'])) {
    actions.push(action({
      type: 'set_goal',
      title: 'Enable Photographic Finish',
      rationale: 'The request asks for a premium or more photographic result.',
      payload: { goalId: 'photographic_finish' },
      affectedScope: 'scene',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  }

  if (includesAny(text, ['หลุด', 'drift', 'review', 'qc', 'ต่าง', 'deviation', 'comment', 'revision prompt', 'แก้'])) {
    actions.push(action({
      type: context.activeResultRound ? 'explain_result' : 'compose_revision_prompt',
      title: context.activeResultRound ? 'Review current result' : 'Compose revision prompt',
      rationale: context.activeResultRound ? 'Use current QC state and protected rules to explain known deviations.' : 'Prepare revision instructions from the provided comment.',
      payload: { resultRoundId: context.activeResultRound?.id, comment: sourceMessage },
      affectedScope: 'result',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    actions.push(action({
      type: 'add_deviation_note',
      title: 'Add deviation note',
      rationale: 'Store the user comment as a reviewable QC/revision note.',
      payload: { text: sourceMessage },
      affectedScope: 'result',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  }

  if (attachedReference) {
    actions.push(action({
      type: 'attach_reference',
      title: 'Attach scoped material reference',
      rationale: 'The attached image can be used as material/color/texture guidance without copying architecture or form.',
      payload: {
        ruleId: benchRuleId,
        reference: attachedReference,
        scopes: ['color_only', 'texture_only', 'do_not_copy_form', 'do_not_copy_composition', 'do_not_copy_architecture'] satisfies MaterialRuleReferenceScope[],
      },
      affectedScope: 'reference',
      riskLevel: 'medium',
      requiresConfirmation: true,
      sourceMessage,
    }));
  }

  if (!actions.length) {
    actions.push(action({
      type: 'no_action_information',
      title: 'Need more detail',
      rationale: 'The request did not map to a safe workflow action.',
      payload: { text: sourceMessage },
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  } else {
    actions.push(action({
      type: 'set_user_request',
      title: 'Save request as generation note',
      rationale: 'The natural-language request becomes explicit prompt input only after applying.',
      payload: { text: sourceMessage },
      affectedScope: 'prompt',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
    actions.push(action({
      type: 'inspect_compiled_prompt',
      title: 'Open Compiled Prompt Inspector',
      rationale: 'Review the actual provider-ready prompt before generating.',
      payload: { activeTab: 'render-pass', renderPassViewMode: 'advanced' },
      affectedScope: 'ui',
      riskLevel: 'low',
      requiresConfirmation: false,
      sourceMessage,
    }));
  }

  return {
    summary: summarizeActions(actions, karunRulesActive),
    actions,
    warnings,
    contextChips: contextChips(context),
  };
}

function summarizeActions(actions: CopilotActionProposal[], karunRulesActive: boolean) {
  const goals = actions.filter((item) => item.type === 'set_goal').length;
  const revisions = actions.filter((item) => item.type.includes('revision') || item.type === 'add_deviation_note').length;
  const conflicts = actions.filter((item) => item.type === 'validate_prompt_conflict').length;
  if (conflicts) return 'I found a protected Source of Truth conflict. Review the options before changing anything.';
  return `Prepared ${actions.length} action${actions.length === 1 ? '' : 's'}${goals ? `, ${goals} goal update${goals === 1 ? '' : 's'}` : ''}${revisions ? `, and ${revisions} revision note${revisions === 1 ? '' : 's'}` : ''}.${karunRulesActive ? ' Karun rules are active.' : ''}`;
}

export function contextChips(context: CopilotContext) {
  return [
    context.sourceOfTruth?.profileName ? `${context.sourceOfTruth.profileName} rules active` : 'No project rules',
    context.activeResultRound ? `Current result: ${context.activeResultRound.name}` : 'No result selected',
    context.activeGoalIds.length ? `${context.activeGoalIds.length} goals active` : 'No goals active',
    context.referencesCount ? `${context.referencesCount} references` : 'No references',
  ];
}

export function copilotStorageKey(projectId: string, sceneId: string) {
  return `visual-local-copilot:${projectId}:${sceneId}`;
}

export function createEmptyCopilotThread(projectId: string, sceneId: string): CopilotThreadState {
  const now = new Date().toISOString();
  return { id: makeId(), projectId, sceneId, createdAt: now, updatedAt: now, messages: [], minimized: false, expanded: false };
}

export function stripSecretsFromCopilotText(text: string) {
  return text
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[masked-google-key]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[masked-api-key]');
}
