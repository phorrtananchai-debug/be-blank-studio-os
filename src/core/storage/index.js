import { DEFAULT_SETTINGS, DEFAULT_TARGET_ALLOCATION, normalizeSettings } from '../settings/index.js';
import { normalizeAccount, normalizeHolding } from '../portfolio/index.js';
import { normalizeJournalEntry, normalizeLabsState, normalizeWatchlistItem } from '../labs/index.js';

export const AEQUITAS_STORAGE_KEY = 'aequitas-core-storage-v1';
export const AEQUITAS_STORAGE_VERSION = 1;

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export const createSampleAequitasState = () => ({
  version: AEQUITAS_STORAGE_VERSION,
  accounts: [
    { id: 'primary', name: 'Manual Investment Account', provider: 'Local First', baseCurrency: 'THB', type: 'Long-term' },
    { id: 'tax-wrapper', name: 'Thai Tax Wrapper', provider: 'Manual NAV', baseCurrency: 'THB', type: 'RMF / Fund' },
  ],
  holdings: [
    {
      id: 'voo-core',
      accountId: 'primary',
      ticker: 'VOO',
      displayName: 'Vanguard S&P 500 ETF',
      assetType: 'US ETF',
      units: 8,
      averageCost: 430,
      currentPrice: 485,
      currency: 'USD',
      dividendYield: 0.015,
    },
    {
      id: 'msft-growth',
      accountId: 'primary',
      ticker: 'MSFT',
      displayName: 'Microsoft',
      assetType: 'US Stock',
      units: 5,
      averageCost: 370,
      currentPrice: 423,
      currency: 'USD',
      dividendYield: 0.008,
    },
    {
      id: 'jepi-income',
      accountId: 'primary',
      ticker: 'JEPI',
      displayName: 'JPMorgan Equity Premium Income ETF',
      assetType: 'Dividend ETF',
      units: 12,
      averageCost: 55,
      currentPrice: 57,
      currency: 'USD',
      dividendYield: 0.072,
    },
    {
      id: 'rmf-tax',
      accountId: 'tax-wrapper',
      ticker: 'K-TNZ-SSF',
      displayName: 'Thai RMF Example Fund',
      assetType: 'Thai RMF',
      units: 530,
      averageCost: 11.2,
      manualNavOverride: 12.4,
      navUpdatedAt: new Date().toISOString().slice(0, 10),
      currency: 'THB',
    },
    {
      id: 'cash-buffer',
      accountId: 'primary',
      ticker: 'THB-CASH',
      displayName: 'Cash Buffer',
      assetType: 'Cash',
      units: 55000,
      averageCost: 1,
      currentPrice: 1,
      currency: 'THB',
    },
  ],
  targetAllocation: DEFAULT_TARGET_ALLOCATION,
  journalEntries: [
    {
      id: 'journal-1',
      date: new Date().toISOString(),
      title: 'เดือนนี้ควรรักษาวินัย DCA',
      content: 'พอร์ตยังไม่ต้องรีบทำอะไรเพิ่ม นอกจากเติมเงินตามแผนและทบทวน Thai fund NAV ให้ล่าสุด',
      mood: 'Calm',
      tags: ['DCA', 'Review'],
    },
  ],
  watchlistItems: [
    { id: 'watch-nvda', ticker: 'NVDA', displayName: 'NVIDIA', thesis: 'ติดตาม valuation หลังวิ่งแรง', conviction: 'Medium', status: 'Watching' },
    { id: 'watch-bblam', ticker: 'SCBSET50', displayName: 'Thai Index Fund', thesis: 'พิจารณาเป็น core TH wrapper', conviction: 'Low', status: 'Watching' },
  ],
  aiSnapshots: [],
  snapshots: [],
  aiPlan: null,
  dailyBrief: {
    title: 'เดือนนี้ควรทำอะไร',
    summary: 'เติมเงินเข้าชั้น Core ETF Layer ก่อน จากนั้นค่อยดู Thai Tax Wrapper Layer',
    priorities: ['เติม DCA ตามแผน', 'อัปเดต NAV กองทุนไทย', 'ทบทวน watchlist ก่อนเพิ่มสินทรัพย์ใหม่'],
  },
  dcaPlan: {
    monthlyBudget: 12000,
  },
  settings: normalizeSettings({
    ...DEFAULT_SETTINGS,
    portfolio: {
      ...DEFAULT_SETTINGS.portfolio,
      sampleMode: true,
      monthlyBudget: 12000,
    },
  }),
  labs: normalizeLabsState({
    watchlist: [
      { ticker: 'TSLA', displayName: 'Tesla', thesis: 'ติดตามเฉย ๆ ใน sandbox', conviction: 'Low', status: 'Idea' },
    ],
    experimentalIdeas: ['ลองจำลองพอร์ตแยกสำหรับ growth ที่เสี่ยงสูงขึ้น'],
  }),
  activity: [
    { id: 'activity-1', type: 'system', title: 'Aequitas core initialized', createdAt: new Date().toISOString() },
  ],
});

export const normalizeAequitasState = (state = {}) => {
  const next = safeObject(state);
  const base = createSampleAequitasState();

  return {
    version: AEQUITAS_STORAGE_VERSION,
    accounts: safeArray(next.accounts).map(normalizeAccount),
    holdings: safeArray(next.holdings).map((holding, index) => normalizeHolding(holding, index, next.settings || base.settings)),
    targetAllocation: Object.keys(safeObject(next.targetAllocation)).length > 0
      ? safeObject(next.targetAllocation)
      : DEFAULT_TARGET_ALLOCATION,
    journalEntries: safeArray(next.journalEntries).map(normalizeJournalEntry),
    watchlistItems: safeArray(next.watchlistItems).map(normalizeWatchlistItem),
    aiSnapshots: safeArray(next.aiSnapshots),
    snapshots: safeArray(next.snapshots),
    aiPlan: next.aiPlan || null,
    dailyBrief: safeObject(next.dailyBrief),
    dcaPlan: safeObject(next.dcaPlan),
    settings: normalizeSettings(next.settings || base.settings),
    labs: normalizeLabsState(next.labs || {}),
    activity: safeArray(next.activity),
  };
};

export const loadAequitasState = () => {
  try {
    const saved = window.localStorage.getItem(AEQUITAS_STORAGE_KEY);
    if (!saved) {
      return createSampleAequitasState();
    }

    const parsed = JSON.parse(saved);
    if (!parsed || parsed.version !== AEQUITAS_STORAGE_VERSION) {
      return createSampleAequitasState();
    }

    return normalizeAequitasState(parsed);
  } catch {
    return createSampleAequitasState();
  }
};

export const persistAequitasState = (state) => {
  const normalized = normalizeAequitasState(state);
  window.localStorage.setItem(AEQUITAS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const exportAequitasBackup = (state) => JSON.stringify({
  version: AEQUITAS_STORAGE_VERSION,
  exportedAt: new Date().toISOString(),
  state: normalizeAequitasState(state),
}, null, 2);

export const importAequitasBackup = (jsonText = '') => {
  const parsed = JSON.parse(jsonText);
  const payload = safeObject(parsed.state || parsed);
  return normalizeAequitasState({
    ...payload,
    version: AEQUITAS_STORAGE_VERSION,
  });
};
