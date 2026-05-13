import { Sparkles } from 'lucide-react';
import { MetricCard } from '../MetricCard.jsx';

export function StudioOSHeader({ activeProjects, contentApproved, nextHandover, onBackHome, portfolioCount }) {
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
      <div className="grid w-full grid-cols-2 rhythm-grid sm:grid-cols-4 xl:w-[700px]">
        <MetricCard label="Active Projects" value={activeProjects} />
        <MetricCard label="Approved posts" value={contentApproved} />
        <MetricCard label="Archive Items" value={portfolioCount} />
        <MetricCard label="Next Handover" value={nextHandover} />
      </div>
    </header>
  );
}
