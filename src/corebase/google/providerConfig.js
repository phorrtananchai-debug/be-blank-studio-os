const DEFAULT_TIMEOUT_MS = 8000;
const SUPPORTED_MODES = new Set(['mock', 'google-readonly', 'karun-live-control']);
const LOCAL_OVERRIDE_KEY = 'beBlank.googleCorebase.override';

function resolveEnvEndpoint(runtimeEnv = import.meta?.env || {}) {
  return String(runtimeEnv.VITE_GOOGLE_COREBASE_ENDPOINT || '').trim();
}

function resolveEnvMode(runtimeEnv = import.meta?.env || {}) {
  const requestedMode = String(runtimeEnv.VITE_GOOGLE_COREBASE_MODE || '').trim().toLowerCase();
  if (!requestedMode) return 'google-readonly';
  return SUPPORTED_MODES.has(requestedMode) ? requestedMode : 'google-readonly';
}

function resolveLocalOverride() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_OVERRIDE_KEY);
    return normalizeOverridePayload(raw);
  } catch {
    return null;
  }
}

function normalizeOverridePayload(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;

    const endpoint = String(parsed.endpoint || '').trim();
    const requestedMode = String(parsed.mode || '').trim().toLowerCase();
    const mode = SUPPORTED_MODES.has(requestedMode) ? requestedMode : 'google-readonly';

    return {
      endpoint,
      endpointConfigured: Boolean(endpoint),
      mode,
      overrideActive: true,
      source: 'localStorage-override',
    };
  } catch {
    return null;
  }
}

export function getGoogleCorebaseProviderConfig(runtimeEnv = import.meta?.env || {}) {
  const envEndpoint = resolveEnvEndpoint(runtimeEnv);
  const envEndpointConfigured = Boolean(envEndpoint);
  const envRequestedMode = resolveEnvMode(runtimeEnv);

  const override = resolveLocalOverride();
  const endpoint = envEndpointConfigured ? envEndpoint : (override?.endpoint || '');
  const endpointConfigured = Boolean(endpoint);
  const requestedMode = envEndpointConfigured ? envRequestedMode : (override?.mode || envRequestedMode);
  const mode = endpointConfigured ? requestedMode : 'mock';
  const source = envEndpointConfigured ? 'env' : (override?.source || 'env');

  return {
    endpoint,
    endpointConfigured,
    envEndpointConfigured,
    envModeConfigured: Boolean(String(runtimeEnv.VITE_GOOGLE_COREBASE_MODE || '').trim()),
    mode,
    overrideActive: Boolean(override?.overrideActive),
    requestedMode,
    source,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export function getCorebaseModeLabel(config = getGoogleCorebaseProviderConfig()) {
  if (config.mode === 'karun-live-control') return 'karun-live-control';
  return config.mode === 'google-readonly' ? 'google-readonly' : 'mock';
}

export function getGoogleCorebaseOverrideStorageKey() {
  return LOCAL_OVERRIDE_KEY;
}

export function getGoogleCorebaseRuntimeOverride() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LOCAL_OVERRIDE_KEY);
  return normalizeOverridePayload(raw);
}

export function setGoogleCorebaseRuntimeOverride({ mode, endpoint } = {}) {
  if (typeof window === 'undefined') return false;
  const requestedMode = String(mode || '').trim().toLowerCase();
  const safeMode = SUPPORTED_MODES.has(requestedMode) ? requestedMode : 'google-readonly';
  const safeEndpoint = String(endpoint || '').trim();
  window.localStorage.setItem(LOCAL_OVERRIDE_KEY, JSON.stringify({
    mode: safeMode,
    endpoint: safeEndpoint,
  }));
  return true;
}

export function clearGoogleCorebaseRuntimeOverride() {
  if (typeof window === 'undefined') return false;
  window.localStorage.removeItem(LOCAL_OVERRIDE_KEY);
  return true;
}
