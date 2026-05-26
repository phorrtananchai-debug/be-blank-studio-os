const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeThaiFundTicker = (ticker = '') => String(ticker).trim().replace(/\s+/g, '').toUpperCase();

export const isThaiNavAssetType = (assetType = '') => ['Thai Mutual Fund', 'Thai RMF'].includes(String(assetType));

export const isThaiNavStale = (navUpdatedAt = '', staleAfterBusinessDays = 3) => {
  if (!navUpdatedAt) return true;

  const navDate = new Date(`${String(navUpdatedAt).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(navDate.getTime())) return true;

  const today = new Date();
  let businessDays = 0;
  const cursor = new Date(navDate);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= today) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) businessDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return businessDays > staleAfterBusinessDays;
};

export const getThaiNavValuation = (holding = {}, settings = {}) => {
  const units = safeNumber(holding.units);
  const manualNav = safeNumber(holding.manualNavOverride || holding.currentNav || holding.manualNav);
  const navUpdatedAt = holding.navUpdatedAt || holding.lastNavDate || '';
  const stale = isThaiNavStale(navUpdatedAt, settings?.thaiNav?.staleAfterBusinessDays);

  return {
    ticker: normalizeThaiFundTicker(holding.ticker),
    currentNav: manualNav,
    marketValue: units * manualNav,
    navUpdatedAt,
    stale,
    bridgeMode: settings?.thaiNav?.bridgeMode || 'manual',
    bridgeUrl: settings?.thaiNav?.googleSheetBridgeUrl || '',
  };
};
