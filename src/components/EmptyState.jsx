import { BriefcaseBusiness } from 'lucide-react';

export function EmptyState({ message }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-studio-line bg-studio-panelSoft p-8 text-center">
      <div>
        <BriefcaseBusiness className="mx-auto text-studio-orange" size={36} />
        <p className="mt-3 max-w-md text-sm leading-6 text-studio-muted">{message}</p>
      </div>
    </div>
  );
}
