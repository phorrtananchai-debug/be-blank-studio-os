import { buildPortfolioSummary } from '../portfolio/index.js';
import { calculateAllocationDrift, calculateCurrentAllocation } from '../allocation/index.js';
import { buildDcaPlan } from '../dca/index.js';

const safeString = (value, fallback = '') => {
  const normalized = typeof value === 'string' ? value.trim() : String(value || '').trim();
  return normalized || fallback;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const safeObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export const buildAiExportContext = (state = {}) => {
  const portfolioSummary = buildPortfolioSummary(state.holdings || [], state.settings || {});
  const currentAllocation = calculateCurrentAllocation(portfolioSummary.holdings);
  const targetAllocation = state.targetAllocation || state.settings?.portfolio?.targetAllocation || {};
  const drift = calculateAllocationDrift(currentAllocation, targetAllocation);
  const dcaPlan = buildDcaPlan({
    monthlyBudget: state.dcaPlan?.monthlyBudget || 0,
    currentAllocation,
    targetAllocation,
    holdings: portfolioSummary.holdings,
    cashAvailable: portfolioSummary.cashBufferValue,
  });

  return {
    portfolioSummary,
    holdingsSummary: portfolioSummary.holdings.map((holding) => ({
      ticker: holding.ticker,
      displayName: holding.displayName,
      assetType: holding.assetType,
      allocationBucket: holding.allocationBucket,
      allocationPercent: holding.allocationPercent,
      marketValueBase: holding.marketValueBase,
      gainLossPercent: holding.gainLossPercent,
      notes: holding.notes,
    })),
    allocationByCategory: portfolioSummary.allocationByCategory,
    targetVsCurrentAllocation: drift,
    monthlyDcaSuggestion: dcaPlan,
    watchlist: state.watchlistItems || [],
    journalNotes: (state.journalEntries || []).slice(0, 8),
  };
};

export const buildAiPromptText = (state = {}) => {
  const context = buildAiExportContext(state);
  const allocationLines = context.targetVsCurrentAllocation
    .map((row) => `- ${row.bucket}: ปัจจุบัน ${row.currentPercent.toFixed(1)}% | เป้าหมาย ${row.targetPercent.toFixed(1)}% | ส่วนต่าง ${row.driftPercent.toFixed(1)}%`)
    .join('\n');
  const holdingsLines = context.holdingsSummary
    .slice(0, 12)
    .map((row) => `- ${row.ticker} (${row.displayName}): มูลค่า ${Math.round(row.marketValueBase).toLocaleString()} บาท | สัดส่วน ${row.allocationPercent.toFixed(1)}% | ผลต่าง ${row.gainLossPercent.toFixed(1)}%`)
    .join('\n');
  const watchlistLines = context.watchlist.length > 0
    ? context.watchlist.slice(0, 8).map((row) => `- ${row.ticker}: ${safeString(row.thesis || row.note || row.status)}`).join('\n')
    : '- ยังไม่มี watchlist';
  const journalLines = context.journalNotes.length > 0
    ? context.journalNotes.slice(0, 6).map((row) => `- ${safeString(row.title)}: ${safeString(row.content)}`).join('\n')
    : '- ยังไม่มี journal note';

  return [
    'คุณเป็นผู้ช่วยวิเคราะห์พอร์ตการลงทุนแบบระมัดระวังของ Aequitas',
    'กรุณาสรุปภาพรวมพอร์ตแบบเข้าใจง่าย ไม่ใช้ภาษาชวนซื้อขาย และไม่ให้คำแนะนำการลงทุนแบบฟันธง',
    '',
    `มูลค่าพอร์ตรวม: ${Math.round(context.portfolioSummary.totalPortfolioValue).toLocaleString()} บาท`,
    `กำไร/ขาดทุนรวม: ${Math.round(context.portfolioSummary.gainLoss).toLocaleString()} บาท (${context.portfolioSummary.gainLossPercent.toFixed(1)}%)`,
    '',
    'สรุปสินทรัพย์:',
    holdingsLines,
    '',
    'สัดส่วนพอร์ตเทียบเป้าหมาย:',
    allocationLines,
    '',
    'สิ่งที่ควรเติมเงิน DCA เดือนนี้:',
    context.monthlyDcaSuggestion.contributions.slice(0, 3).map((item) => `- ${item.bucket}: ${Math.round(item.suggestedAmount).toLocaleString()} บาท`).join('\n') || '- ไม่มีคำแนะนำเพิ่มเติม',
    '',
    'Watchlist:',
    watchlistLines,
    '',
    'Journal ล่าสุด:',
    journalLines,
    '',
    'กรุณาตอบกลับเป็น JSON ตาม schema นี้เท่านั้น:',
    JSON.stringify({
      schemaVersion: 'aequitas-ai-import-v2',
      portfolioSummary: {},
      assetPlans: [],
      allocationPlan: {},
      dcaPlan: {},
      dividendNotes: '',
      dailyBrief: {},
      riskWarnings: [],
      labsSuggestions: [],
    }, null, 2),
  ].join('\n');
};

export const validateAiImportPayload = (payload) => {
  const errors = [];
  const data = safeObject(payload);
  if (safeString(data.schemaVersion) !== 'aequitas-ai-import-v2') {
    errors.push('schemaVersion must be aequitas-ai-import-v2');
  }
  if (!safeObject(data.portfolioSummary) || Array.isArray(data.portfolioSummary)) {
    errors.push('portfolioSummary must be an object');
  }
  if (!Array.isArray(data.assetPlans)) errors.push('assetPlans must be an array');
  if (!safeObject(data.allocationPlan)) errors.push('allocationPlan must be an object');
  if (!safeObject(data.dcaPlan)) errors.push('dcaPlan must be an object');
  if (data.riskWarnings !== undefined && !Array.isArray(data.riskWarnings)) errors.push('riskWarnings must be an array');
  if (data.labsSuggestions !== undefined && !Array.isArray(data.labsSuggestions)) errors.push('labsSuggestions must be an array');

  return {
    valid: errors.length === 0,
    errors,
    data: {
      schemaVersion: safeString(data.schemaVersion),
      portfolioSummary: safeObject(data.portfolioSummary),
      assetPlans: safeArray(data.assetPlans),
      allocationPlan: safeObject(data.allocationPlan),
      dcaPlan: safeObject(data.dcaPlan),
      dividendNotes: safeString(data.dividendNotes),
      dailyBrief: safeObject(data.dailyBrief),
      riskWarnings: safeArray(data.riskWarnings),
      labsSuggestions: safeArray(data.labsSuggestions),
    },
  };
};

export const applyAiImportPlan = (currentState = {}, importedData = {}) => {
  const mergedAssetNotes = (currentState.holdings || []).map((holding) => {
    const importedPlan = safeArray(importedData.assetPlans)
      .find((item) => safeString(item.ticker).toUpperCase() === safeString(holding.ticker).toUpperCase());

    return importedPlan
      ? {
        ...holding,
        notes: [safeString(holding.notes), safeString(importedPlan.summary || importedPlan.reasoning || importedPlan.note)]
          .filter(Boolean)
          .join('\n\n'),
      }
      : holding;
  });

  return {
    ...currentState,
    holdings: mergedAssetNotes,
    aiPlan: {
      ...(currentState.aiPlan || {}),
      importedAt: new Date().toISOString(),
      portfolioSummary: importedData.portfolioSummary || {},
      assetPlans: importedData.assetPlans || [],
      allocationPlan: importedData.allocationPlan || {},
      dcaPlan: importedData.dcaPlan || {},
      dividendNotes: importedData.dividendNotes || '',
      dailyBrief: importedData.dailyBrief || {},
      riskWarnings: importedData.riskWarnings || [],
      labsSuggestions: importedData.labsSuggestions || [],
    },
    dailyBrief: {
      ...(currentState.dailyBrief || {}),
      ...(importedData.dailyBrief || {}),
    },
    labs: {
      ...(currentState.labs || {}),
      experimentalIdeas: [
        ...safeArray(currentState.labs?.experimentalIdeas),
        ...safeArray(importedData.labsSuggestions),
      ].filter(Boolean),
    },
  };
};
