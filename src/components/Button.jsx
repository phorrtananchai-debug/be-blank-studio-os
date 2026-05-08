export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-studio-ink bg-studio-ink text-white shadow-premium hover:bg-studio-inkLight hover:-translate-y-1 active:translate-y-0',
    secondary: 'border-black/[0.03] bg-white/50 backdrop-blur text-studio-ink hover:bg-white hover:border-black/[0.1] hover:-translate-y-1 active:translate-y-0 shadow-studioSoft',
  };

  return (
    <button
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full border px-7 text-[12px] font-bold uppercase tracking-editorial transition-all duration-300 ease-out ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
