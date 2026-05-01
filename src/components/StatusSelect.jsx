export function StatusSelect({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-studio-muted">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-black/[0.08] bg-[#f3f2ee] px-3.5 text-sm font-semibold capitalize text-[#111111] outline-none transition focus:border-black/25 focus:bg-[#f7f6f2] focus:ring-2 focus:ring-black/[0.04]"
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
