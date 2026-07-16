import { CopilotContext, CopilotMessage } from './visualLocalCopilot';

export type CopilotContextPackage = {
  schema: 'visual-local-copilot-context-v1';
  project: { id: string; name: string };
  scene: { id: string; name: string };
  currentMode: string;
  activeGoals: string[];
  activeResult?: { id: string; name: string; status: string; hasQc: boolean } | null;
  projectRules: Array<{
    id: string;
    name: string;
    category: string;
    protectionLevel: string;
    enabled: boolean;
    summary: string;
    forbidden: string[];
    referencesCount: number;
  }>;
  protectedRuleNames: string[];
  qcSummary?: {
    deviationNotes: string[];
    revisionPromptExists: boolean;
    status?: string;
  };
  promptSummary?: string;
  providerSummary?: {
    activeProvider?: string;
    activeModel?: string;
    referencesCount?: number;
  };
  recentConversation: Array<{
    role: CopilotMessage['role'];
    text: string;
    appliedActions?: string[];
  }>;
  userRequest: string;
  safety: {
    noApiKeysIncluded: true;
    noRawImagesIncluded: true;
    generationForbidden: true;
    maxContextMessages: number;
  };
};

export function buildCopilotContextPackage(args: {
  context: CopilotContext;
  userRequest: string;
  recentMessages: CopilotMessage[];
  maxMessages: number;
}): CopilotContextPackage {
  const { context, userRequest, recentMessages, maxMessages } = args;
  const rules = (context.sourceOfTruth?.materialRules || [])
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    .slice(0, 16)
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      protectionLevel: rule.protectionLevel,
      enabled: rule.enabled,
      summary: compactText([
        rule.description,
        rule.colorGuidance,
        rule.finishGuidance,
        rule.usageGuidance,
        rule.promptInjection,
      ].filter(Boolean).join(' '), 420),
      forbidden: rule.forbiddenCharacteristics.slice(0, 8),
      referencesCount: rule.referenceImages.length,
    }));
  const activeResult = context.activeResultRound ? {
    id: context.activeResultRound.id,
    name: context.activeResultRound.name,
    status: context.activeResultRound.status,
    hasQc: Boolean(context.activeResultRound.qc),
  } : null;
  const qc = context.activeResultRound?.qc;
  return {
    schema: 'visual-local-copilot-context-v1',
    project: { id: context.projectId, name: context.projectName },
    scene: { id: context.sceneId, name: context.sceneName },
    currentMode: context.mode || 'studio',
    activeGoals: context.activeGoalIds.slice(0, 12),
    activeResult,
    projectRules: rules,
    protectedRuleNames: rules.filter((rule) => rule.protectionLevel === 'protected').map((rule) => rule.name),
    qcSummary: qc ? {
      deviationNotes: (qc.deviationNotes || []).slice(-5),
      revisionPromptExists: Boolean(qc.revisionPrompt),
      status: context.activeResultRound?.status,
    } : undefined,
    promptSummary: compactText(context.compiledPromptSummary || '', 700),
    providerSummary: {
      activeProvider: context.providerLabel,
      activeModel: context.modelLabel,
      referencesCount: context.referencesCount,
    },
    recentConversation: recentMessages.slice(-maxMessages).map((message) => ({
      role: message.role,
      text: compactText(message.text, 500),
      appliedActions: message.actions?.filter((action) => action.status === 'applied').map((action) => action.type).slice(0, 12),
    })),
    userRequest: compactText(userRequest, 1200),
    safety: {
      noApiKeysIncluded: true,
      noRawImagesIncluded: true,
      generationForbidden: true,
      maxContextMessages: maxMessages,
    },
  };
}

export function compactText(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}
