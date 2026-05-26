import { classifyAllocationBucket } from '../allocation/index.js';
import { getThaiNavValuation, isThaiNavAssetType, normalizeThaiFundTicker } from '../thai-nav/index.js';

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeString = (value, fallback = '') => {
  const normalized = typeof value === 'string' ? value.trim() : String(value || '').trim();
  return normalized || fallback;
};

export const ASSET_TYPES = [
  'US Stock',
  'US ETF',
  'Thai Mutual Fund',
  'Thai RMF',
  'Dividend ETF',
  'Sandbox Asset',
  'Cash',
];

export const normalizeAccount = (account = {}, index = 0) => ({
  id: safeString(account.id, `account-${index + 1}`),
  name: safeString(account.name, `Account ${index + 1}`),
  provider: safeString(account.provider, 'Manual'),
  baseCurrency: safeString(account.baseCurrency, 'THB'),
  type: safeString(account.type, 'Investment'),
});

export const normalizeHolding = (holding = {}, index = 0) => {
  const assetType = ASSET_TYPES.includes(holding.assetType) ? holding.assetType : 'US Stock';
  const ticker = isThaiNavAssetType(assetType)
    ? normalizeThaiFundTicker(holding.ticker || holding.symbol || `THFUND${index + 1}`)
    : safeString(holding.ticker || holding.symbol || `ASSET${index + 1}`).toUpperCase();
  const units = Math.max(0, safeNumber(holding.units ?? holding.shares ?? holding.amount));
  const accountId = safeString(holding.accountId, 'primary');
  const currency = safeString(holding.currency, assetType === 'Cash' || isThaiNavAssetType(assetType) ? 'THB' : 'USD');
  const price = safeNumber(holding.currentPrice ?? holding.currentNav ?? holding.manualNavOverride);
  const averageCost = safeNumber(holding.averageCost ?? holding.avgCost ?? holding.costBasisPerUnit);
  const allocationBucket = classifyAllocationBucket({ ...holding, assetType });

  return {
    id: safeString(holding.id, `holding-${ticker}-${index + 1}`),
    accountId,
    ticker,
    displayName: safeString(holding.displayName || holding.companyName || ticker),
    assetType,
    categories: Array.isArray(holding.categories) ? holding.categories.filter(Boolean) : [],
    allocationBucket,
    currency,
    units,
    averageCost,
    currentPrice: price,
    manualNavOverride: safeNumber(holding.manualNavOverride),
    navUpdatedAt: safeString(holding.navUpdatedAt || holding.lastNavDate),
    dividendYield: safeNumber(holding.dividendYield),
    notes: safeString(holding.notes || holding.thesis),
    cashBuffer: assetType === 'Cash',
    provider: safeString(holding.provider, assetType === 'Cash' ? 'Manual Cash' : 'Manual'),
    lastPriceUpdatedAt: safeString(holding.lastPriceUpdatedAt || holding.updatedAt),
  };
};

const convertToBaseCurrency = (value, currency, settings) => {
  const amount = safeNumber(value);
  const fx = safeNumber(settings?.portfolio?.usdThbRate, 36);
  if (String(currency).toUpperCase() === 'USD') return amount * fx;
  return amount;
};

export const enrichHolding = (holding = {}, settings = {}) => {
  if (isThaiNavAssetType(holding.assetType)) {
    const thaiNav = getThaiNavValuation(holding, settings);
    const costBasis = holding.units * safeNumber(holding.averageCost);
    const marketValueBase = safeNumber(thaiNav.marketValue);
    const gainLossBase = marketValueBase - costBasis;

    return {
      ...holding,
      currentPriceDisplay: thaiNav.currentNav,
      marketValueBase,
      costBasisBase: costBasis,
      gainLossBase,
      gainLossPercent: costBasis > 0 ? (gainLossBase / costBasis) * 100 : 0,
      navStale: thaiNav.stale,
      navBridgeMode: thaiNav.bridgeMode,
      navBridgeUrl: thaiNav.bridgeUrl,
    };
  }

  const currentValue = holding.assetType === 'Cash'
    ? safeNumber(holding.units)
    : safeNumber(holding.units) * safeNumber(holding.currentPrice);
  const costBasisRaw = holding.assetType === 'Cash'
    ? safeNumber(holding.units)
    : safeNumber(holding.units) * safeNumber(holding.averageCost);
  const marketValueBase = convertToBaseCurrency(currentValue, holding.currency, settings);
  const costBasisBase = convertToBaseCurrency(costBasisRaw, holding.currency, settings);
  const gainLossBase = marketValueBase - costBasisBase;

  return {
    ...holding,
    marketValueBase,
    costBasisBase,
    gainLossBase,
    gainLossPercent: costBasisBase > 0 ? (gainLossBase / costBasisBase) * 100 : 0,
    currentPriceDisplay: safeNumber(holding.currentPrice),
    navStale: false,
    navBridgeMode: '',
    navBridgeUrl: '',
  };
};

export const buildPortfolioSummary = (holdings = [], settings = {}) => {
  const enrichedHoldings = holdings.map((holding) => enrichHolding(holding, settings));
  const totalPortfolioValue = enrichedHoldings.reduce((sum, holding) => sum + safeNumber(holding.marketValueBase), 0);
  const totalCostBasis = enrichedHoldings.reduce((sum, holding) => sum + safeNumber(holding.costBasisBase), 0);
  const gainLoss = totalPortfolioValue - totalCostBasis;

  const allocationByCategory = {};
  const allocationByAssetType = {};
  const allocationByCurrency = {};

  enrichedHoldings.forEach((holding) => {
    allocationByAssetType[holding.assetType] = (allocationByAssetType[holding.assetType] || 0) + safeNumber(holding.marketValueBase);
    allocationByCurrency[holding.currency] = (allocationByCurrency[holding.currency] || 0) + safeNumber(holding.marketValueBase);
    const bucket = holding.allocationBucket;
    allocationByCategory[bucket] = (allocationByCategory[bucket] || 0) + safeNumber(holding.marketValueBase);
  });

  const addPercents = (rows = {}) => Object.entries(rows).map(([label, value]) => ({
    label,
    value,
    percent: totalPortfolioValue > 0 ? (safeNumber(value) / totalPortfolioValue) * 100 : 0,
  })).sort((left, right) => right.value - left.value);

  return {
    holdings: enrichedHoldings.map((holding) => ({
      ...holding,
      allocationPercent: totalPortfolioValue > 0 ? (safeNumber(holding.marketValueBase) / totalPortfolioValue) * 100 : 0,
    })),
    totalPortfolioValue,
    totalCostBasis,
    gainLoss,
    gainLossPercent: totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0,
    allocationByCategory: addPercents(allocationByCategory),
    allocationByAssetType: addPercents(allocationByAssetType),
    allocationByCurrency: addPercents(allocationByCurrency),
    cashBufferValue: enrichedHoldings
      .filter((holding) => holding.assetType === 'Cash')
      .reduce((sum, holding) => sum + safeNumber(holding.marketValueBase), 0),
  };
};
