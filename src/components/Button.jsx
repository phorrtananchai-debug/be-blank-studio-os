export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-studio-ink bg-studio-ink text-white shadow-premium hover:bg-studio-inkLight hover:shadow-studio active:scale-[0.98]',
    secondary: 'border-black/[0.03] bg-white/50 backdrop-blur text-studio-ink hover:bg-white hover:border-black/[0.1] hover:shadow-studioSoft active:scale-[0.98]',
  };

  return (
    <button
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full border px-7 text-[10px] font-bold uppercase tracking-architectural transition-all duration-500 ease-out ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
