const DEFAULT_TIMEOUT_MS = 8000;
const SUPPORTED_MODES = new Set(['mock', 'google-readonly', 'karun-live-control']);

function resolveEnvEndpoint(runtimeEnv = import.meta?.env || {}) {
  return String(runtimeEnv.VITE_GOOGLE_COREBASE_ENDPOINT || '').trim();
}

function resolveEnvMode(runtimeEnv = import.meta?.env || {}) {
  const requestedMode = String(runtimeEnv.VITE_GOOGLE_COREBASE_MODE || '').trim().toLowerCase();
  if (!requestedMode) return 'google-readonly';
  return SUPPORTED_MODES.has(requestedMode) ? requestedMode : 'google-readonly';
}

export function getGoogleCorebaseProviderConfig(runtimeEnv = import.meta?.env || {}) {
  const endpoint = resolveEnvEndpoint(runtimeEnv);
  const endpointConfigured = Boolean(endpoint);
  const requestedMode = resolveEnvMode(runtimeEnv);
  const mode = endpointConfigured ? requestedMode : 'mock';
  return {
    endpoint,
    endpointConfigured,
    mode,
    requestedMode,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export function getCorebaseModeLabel(config = getGoogleCorebaseProviderConfig()) {
  if (config.mode === 'karun-live-control') return 'karun-live-control';
  return config.mode === 'google-readonly' ? 'google-readonly' : 'mock';
}
