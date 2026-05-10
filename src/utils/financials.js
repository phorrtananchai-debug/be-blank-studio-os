export const financeTones = {
  healthy: 'text-emerald-700',
  watch: 'text-amber-700',
  loss: 'text-red-700',
  neutral: 'text-[#111111]',
};

export const profitLabels = {
  healthy: 'Profit',
  watch: 'Low margin',
  loss: 'Loss',
};

export const profitTones = {
  healthy: 'low',
  watch: 'medium',
  loss: 'high',
};

export function getProfitBarClass(status) {
  if (status === 'loss') {
    return 'bg-red-400';
  }
  if (status === 'watch') {
    return 'bg-amber-300';
  }
  return 'bg-emerald-400';
}
