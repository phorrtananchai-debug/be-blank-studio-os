export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-[#111111] bg-[#111111] text-[#f3f2ee] shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:bg-[#2a2a28]',
    secondary: 'border-black/[0.08] bg-[#f3f2ee] text-[#111111] hover:border-black/20 hover:bg-[#e5e2da]',
  };

  return (
    <button
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
