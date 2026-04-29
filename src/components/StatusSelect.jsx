export function StatusSelect({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3.5 text-sm font-semibold capitalize text-white outline-none transition focus:border-studio-orange focus:bg-black/35 focus:ring-2 focus:ring-studio-orange/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
