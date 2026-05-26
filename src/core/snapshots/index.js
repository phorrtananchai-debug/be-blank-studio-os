import { buildPortfolioSummary } from '../portfolio/index.js';
import { calculateAllocationDrift, calculateCurrentAllocation } from '../allocation/index.js';
import { buildDcaPlan } from '../dca/index.js';

const safeString = (value, fallback = '') => {
  const normalized = typeof value === 'string' ? value.trim() : String(value || '').trim();
  return normalized || fallback;
};

export const createSnapshot = (state = {}) => {
  const portfolioSummary = buildPortfolioSummary(state.holdings || [], state.settings || {});
  const currentAllocation = calculateCurrentAllocation(portfolioSummary.holdings);
  const allocationDrift = calculateAllocationDrift(
    currentAllocation,
    state.targetAllocation || state.settings?.portfolio?.targetAllocation || {}
  );

  return {
    id: `snapshot-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: safeString(state.snapshotTitle, `Snapshot ${new Date().toLocaleString()}`),
    note: safeString(state.snapshotNote),
    data: {
      accounts: state.accounts || [],
      holdings: state.holdings || [],
      targetAllocation: state.targetAllocation || {},
      aiPlan: state.aiPlan || null,
      watchlistItems: state.watchlistItems || [],
      journalEntries: state.journalEntries || [],
      settings: state.settings || {},
      labs: state.labs || {},
    },
    derived: {
      portfolioSummary,
      currentAllocation,
      allocationDrift,
      dcaPlan: buildDcaPlan({
        monthlyBudget: state.dcaPlan?.monthlyBudget || 0,
        currentAllocation,
        targetAllocation: state.targetAllocation || state.settings?.portfolio?.targetAllocation || {},
        holdings: portfolioSummary.holdings,
        cashAvailable: portfolioSummary.cashBufferValue,
      }),
    },
  };
};

export const compareAllocationSnapshot = (snapshot = null, currentState = {}) => {
  if (!snapshot?.derived?.currentAllocation) return [];

  const portfolioSummary = buildPortfolioSummary(currentState.holdings || [], currentState.settings || {});
  const currentAllocation = calculateCurrentAllocation(portfolioSummary.holdings);
  const byBucket = new Map(snapshot.derived.currentAllocation.map((row) => [row.bucket, row]));

  return currentAllocation.map((row) => {
    const baseline = byBucket.get(row.bucket);
    return {
      bucket: row.bucket,
      currentPercent: row.percent,
      snapshotPercent: baseline?.percent || 0,
      differencePercent: row.percent - (baseline?.percent || 0),
    };
  });
};
