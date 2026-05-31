const DEFAULT_TIMEOUT_MS = 8000;

function resolveEnvEndpoint(runtimeEnv = import.meta?.env || {}) {
  return String(runtimeEnv.VITE_GOOGLE_COREBASE_ENDPOINT || '').trim();
}

export function getGoogleCorebaseProviderConfig(runtimeEnv = import.meta?.env || {}) {
  const endpoint = resolveEnvEndpoint(runtimeEnv);
  const endpointConfigured = Boolean(endpoint);
  return {
    endpoint,
    endpointConfigured,
    mode: endpointConfigured ? 'google-readonly' : 'mock',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export function getCorebaseModeLabel(config = getGoogleCorebaseProviderConfig()) {
  return config.mode === 'google-readonly' ? 'google-readonly' : 'mock';
}
