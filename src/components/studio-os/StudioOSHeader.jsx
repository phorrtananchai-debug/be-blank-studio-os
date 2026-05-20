import { Sparkles } from 'lucide-react';
import { MetricCard } from '../MetricCard.jsx';
import { getOperationalTaskSummary, getPressureState } from '../../utils/operationalTasks.js';

const dayInMs = 1000 * 60 * 60 * 24;

function getDaysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : Math.ceil((date - today) / dayInMs);
}

function getOperationalMetrics(projects = [], contentItems = [], tasks = []) {
  const activeProjects = projects.filter((project) => project.status !== 'open');
  const taskSummary = getOperationalTaskSummary(tasks);
  const openingSoon = activeProjects.filter((project) => {
    const days = getDaysUntil(project.openingDate);
    return days !== null && days >= 0 && days <= 21;
  }).length;
  const waitingApproval = taskSummary.waiting.length
    + contentItems.filter((item) => ['idea', 'draft', 'review'].includes(String(item.status || '').toLowerCase())).length;
  const blocked = taskSummary.blocked.length;
  const handoverRisk = activeProjects.filter((project) => {
    const pressure = getPressureState({ project, tasks });
    return ['RISK', 'CRITICAL'].includes(pressure.state) && pressure.handoverDays !== null && pressure.handoverDays <= 14;
  }).length;

  return { blocked, handoverRisk, openingSoon, overdue: taskSummary.overdue.length, waitingApproval };
}

export function StudioOSHeader({ contentItems, onBackHome, projects, tasks }) {
  const metrics = getOperationalMetrics(projects, contentItems, tasks);

  return (
    <header className="grid rhythm-section xl:grid-cols-[1fr_auto] xl:items-end border-b border-black/[0.08] pb-12">
      <div className="space-y-10">
        <button
          className="type-control text-studio-muted transition hover:text-studio-ink"
          type="button"
          onClick={onBackHome}
        >
          &larr; Studio Profile
        </button>
        <div className="space-y-4">
          <div className="type-label flex items-center rhythm-control-gap text-studio-orange">
            <Sparkles size={14} strokeWidth={2} />
            Operating System
          </div>
          <h1 className="type-display">
            Be Blank Studio OS
          </h1>
          <p className="type-body max-w-2xl">
            A calm workspace for architectural delivery, content strategy, and portfolio management.
          </p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 rhythm-grid sm:grid-cols-5 xl:w-[760px]">
        <MetricCard label="Overdue" value={metrics.overdue} />
        <MetricCard label="Opening soon" value={metrics.openingSoon} />
        <MetricCard label="Waiting approval" value={metrics.waitingApproval} />
        <MetricCard label="Blocked" value={metrics.blocked} />
        <MetricCard label="Handover risk" value={metrics.handoverRisk} />
      </div>
    </header>
  );
}
