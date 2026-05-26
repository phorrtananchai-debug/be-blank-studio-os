const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ALLOCATION_BUCKETS = [
  'Core ETF Layer',
  'Growth Layer',
  'Dividend / Behavior Layer',
  'Thai Tax Wrapper Layer',
  'Sandbox Layer',
  'Cash Buffer',
];

export const classifyAllocationBucket = (holding = {}) => {
  if (holding.allocationBucket && ALLOCATION_BUCKETS.includes(holding.allocationBucket)) {
    return holding.allocationBucket;
  }

  const assetType = String(holding.assetType || '');
  if (assetType === 'Cash') return 'Cash Buffer';
  if (assetType === 'Sandbox Asset') return 'Sandbox Layer';
  if (assetType === 'Dividend ETF') return 'Dividend / Behavior Layer';
  if (assetType === 'Thai Mutual Fund' || assetType === 'Thai RMF') return 'Thai Tax Wrapper Layer';
  if (assetType === 'US ETF') return 'Core ETF Layer';
  return 'Growth Layer';
};

export const calculateCurrentAllocation = (holdings = []) => {
  const totals = ALLOCATION_BUCKETS.reduce((result, bucket) => {
    result[bucket] = { bucket, marketValue: 0, percent: 0 };
    return result;
  }, {});

  const totalValue = holdings.reduce((sum, holding) => sum + safeNumber(holding.marketValueBase), 0);
  holdings.forEach((holding) => {
    const bucket = classifyAllocationBucket(holding);
    totals[bucket].marketValue += safeNumber(holding.marketValueBase);
  });

  return ALLOCATION_BUCKETS.map((bucket) => ({
    ...totals[bucket],
    percent: totalValue > 0 ? (totals[bucket].marketValue / totalValue) * 100 : 0,
  }));
};

export const calculateAllocationDrift = (currentAllocation = [], targetAllocation = {}) => {
  return currentAllocation.map((bucketRow) => {
    const targetPercent = safeNumber(targetAllocation[bucketRow.bucket]);
    const driftPercent = bucketRow.percent - targetPercent;
    return {
      ...bucketRow,
      targetPercent,
      driftPercent,
      driftDirection: driftPercent > 0.5 ? 'overweight' : driftPercent < -0.5 ? 'underweight' : 'in-range',
    };
  });
};

export const buildRebalanceGuidance = (driftRows = []) => {
  const underweight = driftRows
    .filter((row) => row.driftDirection === 'underweight')
    .sort((left, right) => left.driftPercent - right.driftPercent);
  const overweight = driftRows
    .filter((row) => row.driftDirection === 'overweight')
    .sort((left, right) => right.driftPercent - left.driftPercent);

  return {
    underweight,
    overweight,
    summary: underweight.length > 0
      ? `Focus new money on ${underweight[0].bucket}.`
      : overweight.length > 0
        ? `Current allocation is ahead of target in ${overweight[0].bucket}.`
        : 'Allocation is close to target.',
  };
};
