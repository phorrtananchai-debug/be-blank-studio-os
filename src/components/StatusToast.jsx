const toneStyles = {
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-black/[0.08] bg-white text-studio-ink',
  success: 'border-emerald-700/20 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-700/20 bg-amber-50 text-amber-800',
};

export function StatusToast({ className = '', message, tone = 'success' }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`rounded-[18px] border px-4 py-3 text-sm font-medium shadow-studioSoft ${toneStyles[tone] || toneStyles.info} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  );
}
