export const DEFAULT_AI_IMPORT_SCHEMA = {
  schemaVersion: 'aequitas-ai-import-v2',
};

export const DEFAULT_TARGET_ALLOCATION = {
  'Core ETF Layer': 35,
  'Growth Layer': 25,
  'Dividend / Behavior Layer': 15,
  'Thai Tax Wrapper Layer': 15,
  'Sandbox Layer': 5,
  'Cash Buffer': 5,
};

export const DEFAULT_SETTINGS = {
  general: {
    locale: 'th-TH',
    baseCurrency: 'THB',
    displayCurrency: 'THB',
    timezone: 'Asia/Bangkok',
  },
  portfolio: {
    usdThbRate: 36,
    cashBufferTargetPercent: 5,
    targetAllocation: DEFAULT_TARGET_ALLOCATION,
    sampleMode: false,
  },
  aiServices: {
    preferredProvider: 'OpenAI',
    secondaryProvider: 'Gemini',
    persistSensitive: false,
    rawApiKeys: {
      openai: '',
      gemini: '',
    },
  },
  syncStorage: {
    mode: 'local-first',
    exportFormatVersion: 1,
    lastBackupAt: '',
  },
  labs: {
    enableSandbox: true,
    separateSandboxFromProduction: true,
  },
  thaiNav: {
    bridgeMode: 'manual',
    googleSheetBridgeUrl: '',
    staleAfterBusinessDays: 3,
  },
};

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const mergeSettings = (base, incoming) => {
  if (!isObject(base) || !isObject(incoming)) return incoming ?? base;

  return Object.keys(base).reduce((result, key) => {
    const baseValue = base[key];
    const incomingValue = incoming[key];
    result[key] = isObject(baseValue)
      ? mergeSettings(baseValue, isObject(incomingValue) ? incomingValue : {})
      : incomingValue ?? baseValue;
    return result;
  }, {});
};

export const normalizeSettings = (settings = {}) => {
  const merged = mergeSettings(DEFAULT_SETTINGS, isObject(settings) ? settings : {});

  if (!merged.aiServices.persistSensitive) {
    merged.aiServices.rawApiKeys = {
      openai: '',
      gemini: '',
    };
  }

  return merged;
};
