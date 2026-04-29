export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-studio-orange bg-studio-orange text-black shadow-[0_8px_22px_rgba(255,136,0,0.12)] hover:bg-[#ff9d2b]',
    secondary: 'border-white/[0.1] bg-white/[0.035] text-studio-ink hover:border-studio-orange/70 hover:bg-studio-orange/[0.08] hover:text-studio-orange',
  };

  return (
    <button
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
