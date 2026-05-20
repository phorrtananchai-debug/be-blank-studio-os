export function ProjectFact({ label, value }) {
  return (
    <div className="grid grid-cols-[90px_1fr] border-t border-[#d8d5cc]/18 pt-3">
      <span className="public-utility-meta uppercase text-[#777269]">{label}</span>
      <span className="public-project-meta text-[#8a857b]">{value || '-'}</span>
    </div>
  );
}
