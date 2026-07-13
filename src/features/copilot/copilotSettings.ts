export type CopilotMode = 'ai_assisted' | 'deterministic_only' | 'auto_fallback';
export type CopilotProviderId = 'deterministic' | 'mock_ai' | 'gemini_text' | 'openai_compatible';
export type CopilotLanguagePreference = 'auto' | 'thai' | 'english';
export type CopilotDetailLevel = 'concise' | 'balanced' | 'detailed';

export type CopilotSettings = {
  mode: CopilotMode;
  providerId: CopilotProviderId;
  model: string;
  endpoint: string;
  sendImagesExplicitOnly: boolean;
  maxContextMessages: number;
  languagePreference: CopilotLanguagePreference;
  detailLevel: CopilotDetailLevel;
  timeoutMs: number;
  retryCount: number;
};

export type CopilotProviderConfig = {
  id: CopilotProviderId;
  displayName: string;
  defaultModel: string;
  defaultEndpoint?: string;
  keyStorageKey?: string;
  reusesKeyStorageKey?: string;
  supportsVisionContextImages: boolean;
  supportsStructuredJson: boolean;
  requiresApiKey: boolean;
  enabled: boolean;
  timeoutMs: number;
  retryCount: number;
};

export const COPILOT_SETTINGS_STORAGE_KEY = 'visual-local-copilot-settings-v1';
export const COPILOT_KEY_PREFIX = 'visual-local-copilot-key:';
export const GEMINI_API_KEY_STORAGE_KEY = 'visual-local-gemini-api-key';

export const copilotProviders: CopilotProviderConfig[] = [
  {
    id: 'deterministic',
    displayName: 'Deterministic Local',
    defaultModel: 'local-rules-v1',
    supportsVisionContextImages: false,
    supportsStructuredJson: true,
    requiresApiKey: false,
    enabled: true,
    timeoutMs: 0,
    retryCount: 0,
  },
  {
    id: 'mock_ai',
    displayName: 'Mock AI Interpreter',
    defaultModel: 'mock-structured-v1',
    supportsVisionContextImages: false,
    supportsStructuredJson: true,
    requiresApiKey: false,
    enabled: true,
    timeoutMs: 0,
    retryCount: 0,
  },
  {
    id: 'gemini_text',
    displayName: 'Gemini Text',
    defaultModel: 'gemini-2.5-flash',
    keyStorageKey: `${COPILOT_KEY_PREFIX}gemini_text`,
    reusesKeyStorageKey: GEMINI_API_KEY_STORAGE_KEY,
    supportsVisionContextImages: true,
    supportsStructuredJson: true,
    requiresApiKey: true,
    enabled: true,
    timeoutMs: 45000,
    retryCount: 0,
  },
  {
    id: 'openai_compatible',
    displayName: 'OpenAI-Compatible',
    defaultModel: 'deepseek-chat',
    defaultEndpoint: 'https://api.deepseek.com/chat/completions',
    keyStorageKey: `${COPILOT_KEY_PREFIX}openai_compatible`,
    supportsVisionContextImages: false,
    supportsStructuredJson: true,
    requiresApiKey: true,
    enabled: true,
    timeoutMs: 45000,
    retryCount: 0,
  },
];

export function defaultCopilotSettings(): CopilotSettings {
  return {
    mode: 'auto_fallback',
    providerId: 'mock_ai',
    model: 'mock-structured-v1',
    endpoint: '',
    sendImagesExplicitOnly: true,
    maxContextMessages: 8,
    languagePreference: 'auto',
    detailLevel: 'balanced',
    timeoutMs: 45000,
    retryCount: 0,
  };
}

export function loadCopilotSettings(): CopilotSettings {
  try {
    const raw = localStorage.getItem(COPILOT_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultCopilotSettings();
    return normalizeCopilotSettings(JSON.parse(raw));
  } catch {
    return defaultCopilotSettings();
  }
}

export function saveCopilotSettings(settings: CopilotSettings) {
  localStorage.setItem(COPILOT_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeCopilotSettings(settings)));
}

export function normalizeCopilotSettings(input: Partial<CopilotSettings> = {}): CopilotSettings {
  const defaults = defaultCopilotSettings();
  const provider = copilotProviders.find((item) => item.id === input.providerId) || copilotProviders.find((item) => item.id === defaults.providerId)!;
  return {
    ...defaults,
    ...input,
    providerId: provider.id,
    model: input.model || provider.defaultModel,
    endpoint: input.endpoint || provider.defaultEndpoint || '',
    maxContextMessages: Math.min(20, Math.max(2, Number(input.maxContextMessages || defaults.maxContextMessages))),
    timeoutMs: Math.min(120000, Math.max(5000, Number(input.timeoutMs || provider.timeoutMs || defaults.timeoutMs))),
    retryCount: Math.min(2, Math.max(0, Number(input.retryCount || provider.retryCount || defaults.retryCount))),
  };
}

export function resolveCopilotApiKey(providerId: CopilotProviderId) {
  const provider = copilotProviders.find((item) => item.id === providerId);
  if (!provider?.requiresApiKey) return '';
  const direct = provider.keyStorageKey ? localStorage.getItem(provider.keyStorageKey) || '' : '';
  if (direct) return direct;
  return provider.reusesKeyStorageKey ? localStorage.getItem(provider.reusesKeyStorageKey) || '' : '';
}

export function saveCopilotApiKey(providerId: CopilotProviderId, value: string) {
  const provider = copilotProviders.find((item) => item.id === providerId);
  if (!provider?.keyStorageKey) return;
  localStorage.setItem(provider.keyStorageKey, value);
}

export function clearCopilotApiKey(providerId: CopilotProviderId) {
  const provider = copilotProviders.find((item) => item.id === providerId);
  if (!provider?.keyStorageKey) return;
  localStorage.removeItem(provider.keyStorageKey);
}

export function hasCopilotApiKey(providerId: CopilotProviderId) {
  return Boolean(resolveCopilotApiKey(providerId));
}
