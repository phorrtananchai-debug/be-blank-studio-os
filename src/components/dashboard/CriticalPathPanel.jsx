import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '../Badge.jsx';
import { Field } from '../Field.jsx';
import {
  criticalPathRiskLevels,
  criticalPathStatuses,
  getBlockedCriticalDependencies,
  getCriticalDaysUntil,
  getNextCriticalMilestone,
  normalizeCriticalPath,
} from '../../utils/criticalPath.js';

function formatDaysLabel(days) {
  if (days === null) return 'No target';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  return `${days}d left`;
}

function getTone(milestone) {
  if (milestone.status === 'BLOCKED' || milestone.riskLevel === 'CRITICAL' || milestone.riskLevel === 'RISK') return 'risk';
  if (milestone.status === 'WAITING' || milestone.riskLevel === 'WATCH') return 'waiting';
  if (milestone.status === 'DONE') return 'safe';
  return 'neutral';
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="type-control mb-2 block text-studio-muted/60">{label}</span>
      <select
        className="type-field min-h-11 w-full rounded-md border border-black/[0.07] bg-studio-bone/55 px-4 py-3 text-[#111111] outline-none transition-all duration-700 ease-studio-out focus:border-studio-accent/30 focus:bg-studio-bone"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
        ))}
      </select>
    </label>
  );
}

function CriticalMilestoneRow({ dependencies, milestone, onUpdate }) {
  const days = getCriticalDaysUntil(milestone.targetDate);
  const tone = getTone(milestone);

  return (
    <article className="studio-accent-left border-b border-black/[0.06] py-5 pl-4 last:border-b-0" data-tone={tone}>
      <div className="grid gap-5 xl:grid-cols-[1fr_12rem_12rem]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="type-card-title">{milestone.label}</p>
            <Badge tone={milestone.status.toLowerCase()}>{milestone.status.replaceAll('_', ' ')}</Badge>
            <Badge tone={milestone.riskLevel.toLowerCase()}>{milestone.riskLevel}</Badge>
          </div>
          <p className={`type-caption mt-2 ${days !== null && days < 0 ? 'text-studio-rust' : 'text-studio-muted'}`}>
            {formatDaysLabel(days)}
            {dependencies.length ? ` / depends on ${dependencies.map((item) => item.label).join(', ')}` : ' / first milestone'}
          </p>
        </div>

        <Field
          label="Target date"
          type="date"
          value={milestone.targetDate || ''}
          onChange={(value) => onUpdate(milestone.id, { targetDate: value })}
        />
        <SelectField
          label="Status"
          options={criticalPathStatuses}
          value={milestone.status}
          onChange={(value) => onUpdate(milestone.id, { status: value })}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
        <SelectField
          label="Risk"
          options={criticalPathRiskLevels}
          value={milestone.riskLevel}
          onChange={(value) => onUpdate(milestone.id, { riskLevel: value })}
        />
        <Field
          label="Owner"
          value={milestone.owner || ''}
          onChange={(value) => onUpdate(milestone.id, { owner: value })}
        />
        <Field
          label="Dependency notes"
          value={milestone.notes || ''}
          onChange={(value) => onUpdate(milestone.id, { notes: value })}
        />
      </div>
    </article>
  );
}

export function CriticalPathPanel({ project, onUpdate }) {
  const milestones = normalizeCriticalPath(project);
  const nextMilestone = getNextCriticalMilestone(project);
  const blockedDependencies = getBlockedCriticalDependencies(milestones).filter(({ milestone }) => milestone.status !== 'DONE');
  const byId = Object.fromEntries(milestones.map((milestone) => [milestone.id, milestone]));

  const updateMilestone = (id, updates) => {
    onUpdate({
      criticalPath: milestones.map((milestone) => (milestone.id === id ? { ...milestone, ...updates } : milestone)),
    });
  };

  return (
    <section className="rounded-lg border border-black/[0.06] bg-studio-bone/38 p-6">
      <header className="flex flex-col gap-4 border-b border-black/[0.06] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="type-label text-studio-muted">Critical Path</p>
          <h3 className="type-section-title mt-2">Delivery Dependency Chain</h3>
          <p className="type-body mt-2 max-w-2xl">
            Lightweight milestone chain from design freeze to opening. Use it to see blocked dependencies before they become delivery pressure.
          </p>
        </div>
        {nextMilestone && (
          <div className="studio-accent-left min-w-64 rounded-md border border-black/[0.06] bg-studio-bone/45 p-4" data-tone={getTone(nextMilestone)}>
            <p className="type-label text-studio-muted">Next critical milestone</p>
            <p className="type-card-title mt-2">{nextMilestone.label}</p>
            <p className="type-caption mt-1">{formatDaysLabel(getCriticalDaysUntil(nextMilestone.targetDate))}</p>
          </div>
        )}
      </header>

      {blockedDependencies.length > 0 && (
        <div className="mt-5 rounded-md border border-studio-orange/20 bg-studio-bone/50 p-4">
          <p className="type-label flex items-center gap-2 text-studio-rust">
            <AlertTriangle size={14} />
            Blocked dependency warning
          </p>
          <div className="mt-3 grid gap-2">
            {blockedDependencies.slice(0, 4).map(({ dependency, milestone }) => (
              <p key={`${milestone.id}-${dependency.id}`} className="type-caption text-studio-muted">
                {milestone.label} waits for {dependency.label} ({dependency.status.replaceAll('_', ' ')}).
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-black/[0.06] py-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="flex items-center gap-2">
            <span className="type-control flex items-center gap-2 text-studio-muted">
              <span className="studio-signal-dot" data-tone={getTone(milestone)} />
              {milestone.label}
            </span>
            {index < milestones.length - 1 && <ArrowRight size={13} className="text-studio-muted/40" />}
          </div>
        ))}
      </div>

      <div className="mt-2">
        {milestones.map((milestone) => (
          <CriticalMilestoneRow
            key={milestone.id}
            dependencies={(milestone.dependsOn || []).map((id) => byId[id]).filter(Boolean)}
            milestone={milestone}
            onUpdate={updateMilestone}
          />
        ))}
      </div>
    </section>
  );
}
