import { AlertTriangle, CheckCircle2, CircleDashed, ClipboardList, Sparkles } from 'lucide-react';
import { useState } from 'react';

const energies = [
  { id: 'calm', icon: CheckCircle2, label: 'On Track' },
  { id: 'steady', icon: CircleDashed, label: 'In Progress' },
  { id: 'high', icon: AlertTriangle, label: 'At Risk' },
  { id: 'rest', icon: ClipboardList, label: 'Awaiting Input' },
];

export function NarrativePanel({ project, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (field, value) => {
    onUpdate(project.id, { [field]: value });
  };

  return (
    <section className="group relative overflow-hidden rounded-3xl border border-black/[0.03] bg-white/40 p-10 backdrop-blur-xl transition-all duration-700 hover:bg-white/60">
      <div className="absolute -right-20 -top-20 size-64 rounded-full bg-studio-orange/5 blur-3xl transition-opacity duration-1000 group-hover:opacity-100 opacity-0" />

      <header className="mb-12 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-studio-orange">
            <Sparkles size={14} strokeWidth={2} />
            Project Intelligence
          </div>
          <p className="text-3xl font-bold tracking-tight text-studio-ink">
            {project.name || 'Operational Profile'}
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="rounded-full border border-black/[0.1] px-5 py-2 text-[12px] font-bold uppercase tracking-wide text-studio-muted transition hover:bg-studio-ink hover:text-white"
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </header>

      <div className="grid gap-16 lg:grid-cols-2">
        {/* Left Column: Objective & Tags */}
        <div className="space-y-12">
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted/60">Project Objective</label>
            {isEditing ? (
              <textarea
                value={project.mood || ''}
                onChange={(e) => handleUpdate('mood', e.target.value)}
                placeholder="Define delivery strategy, approvals, procurement, contractor coordination..."
                className="w-full border-none bg-transparent p-0 text-xl font-medium leading-relaxed text-studio-ink placeholder:text-black/10 focus:ring-0"
                rows={3}
              />
            ) : (
              <p className="text-xl font-medium leading-relaxed text-studio-ink/80">
                {project.mood || 'delivery strategy, approvals, procurement, contractor coordination'}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted/60">Operational Tags</label>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {isEditing ? (
                <input
                  type="text"
                  value={project.atmosphericDescriptors || ''}
                  onChange={(e) => handleUpdate('atmosphericDescriptors', e.target.value)}
                  placeholder="approvals, procurement, blockers, dependencies"
                  className="w-full border-b border-black/10 bg-transparent py-1.5 text-sm font-semibold focus:border-studio-orange focus:ring-0"
                />
              ) : (
                (project.atmosphericDescriptors || 'approvals, procurement, handover readiness, timeline risk').split(',').map((tag, i) => (
                  <span key={i} className="text-[11px] font-bold uppercase tracking-wide text-studio-muted">
                    {tag.trim()}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Delivery & Priority */}
        <div className="space-y-12">
          <div className="space-y-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted/60">Delivery Status</label>
            <div className="grid grid-cols-2 gap-3">
              {energies.map((energy) => {
                const Icon = energy.icon;
                const isActive = project.timelineEnergy === energy.id;
                return (
                  <button
                    key={energy.id}
                    onClick={() => handleUpdate('timelineEnergy', energy.id)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-500 ${
                      isActive
                        ? 'border-studio-orange bg-studio-orange/5 text-studio-ink'
                        : 'border-black/[0.03] bg-transparent text-studio-muted hover:border-black/10'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-studio-orange' : ''} />
                    <span className="text-[11px] font-bold uppercase ">{energy.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase  text-studio-muted/60">Current Priority</label>
            {isEditing ? (
              <input
                type="text"
                value={project.currentFocus || ''}
                onChange={(e) => handleUpdate('currentFocus', e.target.value)}
                placeholder="Current priority, approval, dependency, or blocker..."
                className="w-full border-none bg-transparent p-0 text-xl font-medium tracking-tight text-studio-ink placeholder:text-black/10 focus:ring-0"
              />
            ) : (
              <p className="text-xl font-medium tracking-tight text-studio-ink">
                {project.currentFocus || 'handover readiness and contractor coordination'}
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-20 border-t border-black/[0.03] pt-10">
        <div className="flex items-center gap-12">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-studio-muted/40">Open Operational Tasks</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-studio-ink">{project.inspirationCount || 0}</span>
              <div className="flex -space-x-1.5">
                {[...Array(Math.min(project.inspirationCount || 0, 5))].map((_, i) => (
                  <div key={i} className="size-6 rounded-full border-2 border-white bg-studio-stone" />
                ))}
                {(project.inspirationCount || 0) > 5 && (
                  <div className="grid size-6 place-items-center rounded-full border-2 border-white bg-studio-bone text-[8px] font-bold">
                    +{(project.inspirationCount || 0) - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-black/[0.03]" />

          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase  text-studio-muted/40">Delivery Constraints</span>
            <p className="text-xs font-medium italic text-studio-muted">
              {project.phaseNotes || 'No delivery constraints recorded yet.'}
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
