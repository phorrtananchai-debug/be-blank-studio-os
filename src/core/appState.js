import { buildAiExportContext, buildAiPromptText, applyAiImportPlan, validateAiImportPayload } from './ai-import/index.js';
import { buildRebalanceGuidance, calculateAllocationDrift, calculateCurrentAllocation } from './allocation/index.js';
import { buildDcaPlan, updateContributionStatus } from './dca/index.js';
import { buildDividendSummary } from './dividends/index.js';
import { buildPortfolioSummary, normalizeHolding } from './portfolio/index.js';
import { compareAllocationSnapshot, createSnapshot } from './snapshots/index.js';
import {
  createSampleAequitasState,
  exportAequitasBackup,
  importAequitasBackup,
  loadAequitasState,
  persistAequitasState,
} from './storage/index.js';
import { normalizeSettings } from './settings/index.js';

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

let appState = loadAequitasState();
const subscribers = new Set();

const emitChange = () => {
  subscribers.forEach((listener) => listener());
};

const withDerivedState = (state) => {
  const portfolioSummary = buildPortfolioSummary(state.holdings || [], state.settings || {});
  const currentAllocation = calculateCurrentAllocation(portfolioSummary.holdings);
  const targetAllocation = state.targetAllocation || state.settings?.portfolio?.targetAllocation || {};
  const allocationDrift = calculateAllocationDrift(currentAllocation, targetAllocation);
  const rebalanceGuidance = buildRebalanceGuidance(allocationDrift);
  const dcaPlan = buildDcaPlan({
    monthlyBudget: state.dcaPlan?.monthlyBudget || state.settings?.portfolio?.monthlyBudget || 0,
    currentAllocation,
    targetAllocation,
    holdings: portfolioSummary.holdings,
    cashAvailable: portfolioSummary.cashBufferValue,
  });
  const dividends = buildDividendSummary(portfolioSummary.holdings, state.settings || {});

  return {
    ...state,
    derived: {
      portfolioSummary,
      currentAllocation,
      allocationDrift,
      rebalanceGuidance,
      dcaPlan,
      dividends,
      aiExportContext: buildAiExportContext({
        ...state,
        holdings: portfolioSummary.holdings,
      }),
      aiPromptText: buildAiPromptText({
        ...state,
        holdings: portfolioSummary.holdings,
      }),
    },
  };
};

const setState = (updater) => {
  appState = typeof updater === 'function' ? updater(appState) : updater;
  persistAequitasState(appState);
  emitChange();
};

export const aequitasStore = {
  subscribe(listener) {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  },
  getSnapshot() {
    return withDerivedState(appState);
  },
  actions: {
    addHolding(holding) {
      setState((state) => ({
        ...state,
        holdings: [...state.holdings, normalizeHolding(holding, state.holdings.length, state.settings)],
        activity: [
          { id: `activity-${Date.now()}`, type: 'holding', title: `Added ${holding.ticker || 'holding'}`, createdAt: new Date().toISOString() },
          ...safeArray(state.activity),
        ],
      }));
    },
    updateHolding(id, updates) {
      setState((state) => ({
        ...state,
        holdings: state.holdings.map((holding, index) => (
          holding.id === id ? normalizeHolding({ ...holding, ...updates, id }, index, state.settings) : holding
        )),
      }));
    },
    addJournalEntry(entry) {
      setState((state) => ({
        ...state,
        journalEntries: [
          {
            id: `journal-${Date.now()}`,
            date: new Date().toISOString(),
            title: entry.title || 'Journal note',
            content: entry.content || '',
            mood: entry.mood || 'Neutral',
            tags: entry.tags || [],
          },
          ...state.journalEntries,
        ],
      }));
    },
    addWatchlistItem(item) {
      setState((state) => ({
        ...state,
        watchlistItems: [
          {
            id: item.id || `watch-${Date.now()}`,
            ticker: item.ticker,
            displayName: item.displayName || item.ticker,
            thesis: item.thesis || '',
            note: item.note || '',
            conviction: item.conviction || 'Medium',
            status: item.status || 'Watching',
          },
          ...state.watchlistItems,
        ],
      }));
    },
    updateSettings(updates) {
      setState((state) => ({
        ...state,
        settings: normalizeSettings({
          ...state.settings,
          ...safeObject(updates),
          portfolio: {
            ...state.settings.portfolio,
            ...safeObject(updates.portfolio),
          },
          general: {
            ...state.settings.general,
            ...safeObject(updates.general),
          },
          aiServices: {
            ...state.settings.aiServices,
            ...safeObject(updates.aiServices),
          },
          syncStorage: {
            ...state.settings.syncStorage,
            ...safeObject(updates.syncStorage),
          },
          labs: {
            ...state.settings.labs,
            ...safeObject(updates.labs),
          },
          thaiNav: {
            ...state.settings.thaiNav,
            ...safeObject(updates.thaiNav),
          },
        }),
      }));
    },
    setTargetAllocation(targetAllocation) {
      setState((state) => ({
        ...state,
        targetAllocation: safeObject(targetAllocation),
      }));
    },
    setMonthlyBudget(monthlyBudget) {
      setState((state) => ({
        ...state,
        dcaPlan: {
          ...state.dcaPlan,
          monthlyBudget: Number(monthlyBudget) || 0,
        },
        settings: normalizeSettings({
          ...state.settings,
          portfolio: {
            ...state.settings.portfolio,
            monthlyBudget: Number(monthlyBudget) || 0,
          },
        }),
      }));
    },
    updateContributionStatus(contributionId, status) {
      setState((state) => ({
        ...state,
        dcaPlan: updateContributionStatus(withDerivedState(state).derived.dcaPlan, contributionId, status),
      }));
    },
    importAiPlanFromJson(jsonText) {
      const parsed = JSON.parse(jsonText);
      const validation = validateAiImportPayload(parsed);
      if (!validation.valid) {
        return validation;
      }

      setState((state) => applyAiImportPlan(state, validation.data));
      return validation;
    },
    saveAiSnapshot(snapshotInput) {
      setState((state) => ({
        ...state,
        aiSnapshots: [
          {
            id: `ai-snapshot-${Date.now()}`,
            createdAt: new Date().toISOString(),
            title: snapshotInput.title || 'AI Snapshot',
            note: snapshotInput.note || '',
            content: snapshotInput.content || '',
          },
          ...state.aiSnapshots,
        ],
      }));
    },
    saveSnapshot(meta = {}) {
      const snapshot = createSnapshot({
        ...appState,
        snapshotTitle: meta.title,
        snapshotNote: meta.note,
      });
      setState((state) => ({
        ...state,
        aiSnapshots: state.aiSnapshots,
        snapshots: [snapshot, ...safeArray(state.snapshots || [])].slice(0, 24),
      }));
      return snapshot;
    },
    restoreSnapshot(snapshotId) {
      const snapshot = safeArray(appState.snapshots || []).find((item) => item.id === snapshotId);
      if (!snapshot?.data) return false;
      setState((state) => ({
        ...state,
        ...snapshot.data,
      }));
      return true;
    },
    exportBackup() {
      return exportAequitasBackup(appState);
    },
    importBackup(jsonText) {
      const nextState = importAequitasBackup(jsonText);
      setState(nextState);
      return true;
    },
    resetToSample() {
      setState(createSampleAequitasState());
    },
    resetToEmpty() {
      const sample = createSampleAequitasState();
      setState({
        ...sample,
        holdings: [],
        watchlistItems: [],
        journalEntries: [],
        aiSnapshots: [],
        aiPlan: null,
        snapshots: [],
        activity: [
          { id: `activity-${Date.now()}`, type: 'system', title: 'Reset to empty local workspace', createdAt: new Date().toISOString() },
        ],
      });
    },
    compareSnapshot(snapshotId) {
      const snapshot = safeArray(appState.snapshots || []).find((item) => item.id === snapshotId);
      return compareAllocationSnapshot(snapshot, appState);
    },
  },
};
