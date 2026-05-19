const toneStyles = {
  error: 'border-red-900/20 bg-studio-bone/80 text-red-700',
  info: 'border-black/[0.08] bg-studio-bone/80 text-studio-ink',
  success: 'border-black/[0.08] bg-studio-bone/80 text-studio-ink',
  warning: 'border-black/[0.12] bg-studio-bone/80 text-studio-ink',
};

export function StatusToast({ className = '', message, tone = 'success' }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`rounded-md border px-4 py-3 text-sm font-medium ${toneStyles[tone] || toneStyles.info} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  );
}
