import { Sparkles } from 'lucide-react';
import { MetricCard } from '../MetricCard.jsx';

export function StudioOSHeader({ activeProjects, contentApproved, nextHandover, onBackHome, portfolioCount }) {
  return (
    <header className="grid gap-12 xl:grid-cols-[1fr_auto] xl:items-end border-b border-black/[0.08] pb-12">
      <div className="space-y-10">
        <button
          className="text-[9px] font-bold uppercase  text-studio-muted transition hover:text-studio-ink"
          type="button"
          onClick={onBackHome}
        >
          &larr; Studio Profile
        </button>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-studio-orange">
            <Sparkles size={14} strokeWidth={2} />
            Operating System
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none text-studio-ink">
            Be Blank Studio OS
          </h1>
          <p className="max-w-2xl text-base font-medium text-studio-muted leading-relaxed">
            A calm workspace for architectural delivery, content strategy, and portfolio management.
          </p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 xl:w-[700px]">
        <MetricCard label="Active Projects" value={activeProjects} />
        <MetricCard label="Approved posts" value={contentApproved} />
        <MetricCard label="Archive Items" value={portfolioCount} />
        <MetricCard label="Next Handover" value={nextHandover} />
      </div>
    </header>
  );
}
