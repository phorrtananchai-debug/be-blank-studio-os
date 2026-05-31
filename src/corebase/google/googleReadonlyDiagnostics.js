const DEFAULT_STALE_AFTER_MS = 1000 * 60 * 30;

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function getEndpointHost(endpoint = '') {
  const raw = String(endpoint || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.host || '';
  } catch {
    return '';
  }
}

export function getGoogleReadonlyDiagnostics({
  adapterStatus = {},
  fallback = null,
  now = Date.now(),
  providerConfig = {},
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
} = {}) {
  const mode = String(providerConfig.mode || adapterStatus.mode || 'mock');
  const endpointConfigured = Boolean(providerConfig.endpointConfigured || adapterStatus.endpointConfigured);
  const endpointHost = getEndpointHost(providerConfig.endpoint || '');
  const lastSyncAt = toIsoOrNull(adapterStatus.lastSyncAt);
  const lastErrorCode = adapterStatus.lastErrorCode || null;
  const retryable = typeof adapterStatus.lastErrorRetryable === 'boolean'
    ? adapterStatus.lastErrorRetryable
    : Boolean(adapterStatus.lastErrorCode && adapterStatus.lastErrorRetryable);
  const suggestedRetryMs = Number.isFinite(Number(adapterStatus.lastErrorSuggestedRetryMs))
    ? Number(adapterStatus.lastErrorSuggestedRetryMs)
    : null;

  let stale = false;
  if (mode === 'google-readonly') {
    if (lastErrorCode && fallback === 'mock') {
      stale = true;
    } else if (lastSyncAt) {
      stale = now - new Date(lastSyncAt).getTime() > staleAfterMs;
    }
  }

  return {
    endpointConfigured,
    endpointHost,
    fallback: fallback || null,
    lastErrorCode,
    lastSyncAt,
    mode,
    readOnly: true,
    retryable,
    stale,
    suggestedRetryMs,
  };
}
