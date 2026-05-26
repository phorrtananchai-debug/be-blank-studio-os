const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildDcaPlan = ({
  monthlyBudget = 0,
  currentAllocation = [],
  targetAllocation = {},
  holdings = [],
  cashAvailable = 0,
}) => {
  const totalBudget = Math.max(safeNumber(monthlyBudget), safeNumber(cashAvailable));
  const currentByBucket = new Map(currentAllocation.map((row) => [row.bucket, row]));
  const priorities = Object.keys(targetAllocation)
    .map((bucket) => {
      const currentPercent = safeNumber(currentByBucket.get(bucket)?.percent);
      const targetPercent = safeNumber(targetAllocation[bucket]);
      const gap = Math.max(0, targetPercent - currentPercent);
      return {
        bucket,
        currentPercent,
        targetPercent,
        gap,
      };
    })
    .filter((item) => item.targetPercent > 0)
    .sort((left, right) => right.gap - left.gap);

  const totalGap = priorities.reduce((sum, item) => sum + item.gap, 0);
  const contributions = priorities.map((item, index) => {
    const suggestedAmount = totalGap > 0
      ? (item.gap / totalGap) * totalBudget
      : totalBudget / Math.max(priorities.length, 1);
    const representativeHolding = holdings.find((holding) => holding.allocationBucket === item.bucket);

    return {
      id: `${item.bucket}-${index}`,
      bucket: item.bucket,
      suggestedAmount,
      targetPercent: item.targetPercent,
      currentPercent: item.currentPercent,
      priorityOrder: index + 1,
      status: suggestedAmount > 0 ? 'pending' : 'not-needed',
      reminder: suggestedAmount > 0 ? `Add new money to ${item.bucket} this month.` : 'No extra contribution needed.',
      representativeTicker: representativeHolding?.ticker || '',
    };
  });

  return {
    monthlyBudget: totalBudget,
    cashAvailable: safeNumber(cashAvailable),
    contributions,
    nextContributionReminder: contributions[0]?.reminder || 'No DCA action needed.',
  };
};

export const updateContributionStatus = (dcaPlan = {}, contributionId = '', status = 'done') => ({
  ...dcaPlan,
  contributions: (dcaPlan.contributions || []).map((item) => (
    item.id === contributionId ? { ...item, status } : item
  )),
});
