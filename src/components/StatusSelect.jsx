export function StatusSelect({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-tight text-studio-muted/60">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-black/[0.05] bg-white px-4 text-[15px] font-medium capitalize text-[#111111] outline-none transition-all focus:border-studio-orange/30 focus:ring-4 focus:ring-studio-orange/5 appearance-none"
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
