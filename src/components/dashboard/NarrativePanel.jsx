import { AlertTriangle, CheckCircle2, CircleDashed, ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getPressureState,
  normalizeTaskStatus,
} from '../../utils/operationalTasks.js';

const deliveryStates = [
  { id: 'calm', icon: CheckCircle2, label: 'On Track' },
  { id: 'steady', icon: CircleDashed, label: 'In Progress' },
  { id: 'high', icon: AlertTriangle, label: 'At Risk' },
  { id: 'rest', icon: ClipboardList, label: 'Awaiting Input' },
];

function compact(value) {
  return String(value || '').trim();
}

function formatReviewDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Undated';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

function splitText(value) {
  return compact(value).split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function getTaskCount(tasks, predicate) {
  return tasks.filter((task) => normalizeTaskStatus(task.status) !== 'DONE' && predicate(task)).length;
}

function IntelligenceBlock({ label, value, empty = 'Not recorded.' }) {
  const text = compact(value);
  return (
    <div className="border-t border-black/[0.06] pt-4">
      <p className="type-label text-studio-muted">{label}</p>
      <p className="type-body mt-2 text-studio-ink">{text || empty}</p>
    </div>
  );
}

function IntelligenceHistory({ history }) {
  if (!history.length) {
    return (
      <p className="type-caption border-t border-black/[0.06] pt-4 italic text-studio-muted/70">
        No AI intelligence reviews applied yet.
      </p>
    );
  }

  return (
    <div className="border-t border-black/[0.06] pt-4">
      <p className="type-label text-studio-muted">Intelligence History</p>
      <div className="mt-3 grid gap-2">
        {history.slice(-5).reverse().map((entry, index) => {
          const risks = Array.isArray(entry.keyRisks) ? entry.keyRisks : [];
          const focus = compact(entry.suggestedFocus) || compact(entry.summary) || risks[0] || 'Operational review recorded.';
          return (
            <div key={`${entry.generatedAt || 'review'}-${index}`} className="grid grid-cols-[4.5rem_1fr] gap-3 border-b border-black/[0.04] pb-2 last:border-b-0">
              <p className="type-control text-studio-muted">{formatReviewDate(entry.generatedAt)}</p>
              <div>
                <p className="type-body text-sm text-studio-ink">{focus}</p>
                {entry.pressureState && <p className="type-caption mt-0.5 text-studio-muted">{entry.pressureState}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NarrativePanel({ project, tasks = [], onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const projectTasks = useMemo(() => tasks.filter((task) => task.projectId === project.id), [project.id, tasks]);
  const pressure = useMemo(() => getPressureState({ project, tasks }), [project, tasks]);
  const history = Array.isArray(project.intelligenceHistory) ? project.intelligenceHistory : [];
  const waitingCount = getTaskCount(projectTasks, (task) => normalizeTaskStatus(task.status) === 'WAITING' || compact(task.waitingFor));
  const blockedCount = getTaskCount(projectTasks, (task) => normalizeTaskStatus(task.status) === 'BLOCKED' || compact(task.blockedBy));
  const procurementCount = getTaskCount(projectTasks, (task) => task.procurementFlag);
  const handoverCount = getTaskCount(projectTasks, (task) => task.handoverFlag);
  const dependencies = [
    ...projectTasks.flatMap((task) => splitText(task.dependencies)),
    ...splitText(project.dependencies),
  ].slice(0, 4);

  const handleUpdate = (field, value) => {
    onUpdate(project.id, { [field]: value });
  };

  return (
    <section className="studio-accent-left rounded-lg border border-black/[0.06] bg-studio-bone/42 p-7" data-tone={pressure.state === 'SAFE' ? 'neutral' : pressure.state.toLowerCase()}>
      <header className="flex flex-col gap-4 border-b border-black/[0.06] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="type-label flex items-center gap-2 text-studio-orange">
            <span className="studio-signal-dot" data-tone={pressure.state === 'SAFE' ? 'neutral' : 'risk'} />
            Project Intelligence
          </p>
          <h2 className="type-section-title mt-2">{project.name || 'Operational Profile'}</h2>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="type-control inline-flex h-9 items-center justify-center rounded-full border border-black/[0.08] px-4 text-studio-muted transition hover:border-studio-ink/20 hover:text-studio-ink"
          type="button"
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="grid gap-5">
          <div>
            <p className="type-label text-studio-muted">Objective</p>
            {isEditing ? (
              <textarea
                className="type-body mt-2 min-h-24 w-full resize-y rounded-md border border-black/[0.07] bg-studio-bone/35 p-3 text-studio-ink outline-none focus:border-studio-ink/20"
                onChange={(event) => handleUpdate('currentFocus', event.target.value)}
                placeholder="Delivery strategy, approvals, procurement, contractor coordination..."
                value={project.currentFocus || ''}
              />
            ) : (
              <p className="type-body mt-2 text-studio-ink">{project.currentFocus || project.nextAction || 'Delivery strategy and approval coordination.'}</p>
            )}
          </div>

          <IntelligenceBlock
            label="Current Risk"
            value={(Array.isArray(project.intelligenceRisks) && project.intelligenceRisks[0]) || project.blockers || (blockedCount ? `${blockedCount} blocked item(s).` : `${pressure.state} pressure.`)}
          />
          <IntelligenceBlock
            label="Dependencies"
            value={dependencies.length ? dependencies.join('\n') : ''}
            empty={waitingCount ? `${waitingCount} waiting approval(s).` : 'Dependencies not recorded.'}
          />
          <IntelligenceBlock
            label="Next Decision"
            value={project.currentFocus || project.nextAction}
            empty="Next decision not set."
          />
        </div>

        <div className="grid gap-5">
          <div>
            <p className="type-label text-studio-muted">Delivery Status</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {deliveryStates.map((state) => {
                const Icon = state.icon;
                const isActive = project.timelineEnergy === state.id;
                return (
                  <button
                    key={state.id}
                    className={`type-control flex items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-studio-orange/70 bg-studio-bone/60 text-studio-ink'
                        : 'border-black/[0.06] bg-transparent text-studio-muted hover:border-black/[0.12]'
                    }`}
                    onClick={() => handleUpdate('timelineEnergy', state.id)}
                    type="button"
                  >
                    <Icon size={15} className={isActive ? 'text-studio-orange' : ''} />
                    {state.label}
                  </button>
                );
              })}
            </div>
          </div>

          <IntelligenceBlock
            label="Procurement Status"
            value={project.procurementStatus || (procurementCount ? `${procurementCount} procurement task(s) flagged.` : '')}
            empty="Procurement status not recorded."
          />
          <IntelligenceBlock
            label="Handover Readiness"
            value={project.handoverReadiness || (handoverCount ? `${handoverCount} handover task(s) flagged.` : '')}
            empty="Handover readiness not recorded."
          />
          <IntelligenceBlock
            label="Delivery Constraints"
            value={project.phaseNotes}
            empty="No delivery constraints recorded."
          />
          <div className="border-t border-black/[0.06] pt-4">
            <p className="type-label text-studio-muted">Atmospheric Metadata</p>
            <p className="type-caption mt-2 text-studio-muted">
              {[compact(project.mood), compact(project.timelineEnergy)].filter(Boolean).join(' / ') || 'Atmospheric mood and energy not recorded.'}
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-6 grid gap-5 border-t border-black/[0.06] pt-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="type-label text-studio-muted">Open Operational Tasks</p>
          <p className="type-section-title mt-2">{projectTasks.filter((task) => normalizeTaskStatus(task.status) !== 'DONE').length}</p>
          <p className="type-caption mt-1 text-studio-muted">{waitingCount} waiting / {blockedCount} blocked</p>
        </div>
        <IntelligenceHistory history={history} />
      </footer>
    </section>
  );
}
