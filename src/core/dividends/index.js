const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DEFAULT_YIELD_BY_TYPE = {
  'Dividend ETF': 0.045,
  'Thai Mutual Fund': 0.02,
  'Thai RMF': 0.02,
  'US ETF': 0.018,
  'US Stock': 0.012,
  'Sandbox Asset': 0,
  Cash: 0,
};

export const buildDividendSummary = (holdings = [], settings = {}) => {
  const dividendAssets = holdings.filter((holding) => safeNumber(holding.dividendYield, DEFAULT_YIELD_BY_TYPE[holding.assetType] || 0) > 0);
  const rows = dividendAssets.map((holding) => {
    const yieldRate = safeNumber(holding.dividendYield, DEFAULT_YIELD_BY_TYPE[holding.assetType] || 0);
    const annualIncome = safeNumber(holding.marketValueBase) * yieldRate;
    const monthlyIncome = annualIncome / 12;

    return {
      id: holding.id,
      ticker: holding.ticker,
      displayName: holding.displayName,
      annualIncome,
      monthlyIncome,
      yieldRate,
      layerNote: holding.allocationBucket === 'Dividend / Behavior Layer'
        ? 'Supports the dividend behavior layer.'
        : 'Income estimate based on current holding value.',
    };
  });

  return {
    dividendAssets: rows,
    expectedMonthlyDividend: rows.reduce((sum, row) => sum + row.monthlyIncome, 0),
    annualizedDividendIncome: rows.reduce((sum, row) => sum + row.annualIncome, 0),
    reinvestmentPreference: settings?.portfolio?.reinvestmentPreference || 'auto-review',
    notes: rows.length > 0
      ? 'Dividend estimates are planning inputs only and should be reviewed manually.'
      : 'No dividend-focused holdings yet.',
  };
};
