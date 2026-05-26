import { Sparkles } from 'lucide-react';
import { MetricCard } from '../MetricCard.jsx';

const formatNumber = (value) => Math.round(Number(value) || 0).toLocaleString();
const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;

export function AequitasHeader({ derived, onBackHome }) {
  const summary = derived.portfolioSummary;
  const dividends = derived.dividends;
  const dcaPlan = derived.dcaPlan;

  return (
    <header className="grid rhythm-section border-b border-black/[0.08] pb-12 xl:grid-cols-[1fr_auto] xl:items-end">
      <div className="space-y-10">
        <button
          className="type-control text-studio-muted transition hover:text-studio-ink"
          type="button"
          onClick={onBackHome}
        >
          &larr; Home
        </button>
        <div className="space-y-4">
          <div className="type-label flex items-center rhythm-control-gap text-studio-orange">
            <Sparkles size={14} strokeWidth={2} />
            Calm Financial OS
          </div>
          <h1 className="type-display">
            Aequitas
          </h1>
          <p className="type-body max-w-2xl">
            A local-first, manual-first workspace for portfolio planning, allocation review, AI-assisted reflection, and long-term capital decisions.
          </p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 rhythm-grid sm:grid-cols-5 xl:w-[760px]">
        <MetricCard label="Portfolio Value" value={`THB ${formatNumber(summary.totalPortfolioValue)}`} />
        <MetricCard label="Gain / Loss" value={`${summary.gainLoss >= 0 ? '+' : ''}THB ${formatNumber(summary.gainLoss)}`} />
        <MetricCard label="Gain %" value={formatPercent(summary.gainLossPercent)} />
        <MetricCard label="Monthly DCA" value={`THB ${formatNumber(dcaPlan.monthlyBudget)}`} />
        <MetricCard label="Monthly Income" value={`THB ${formatNumber(dividends.expectedMonthlyDividend)}`} />
      </div>
    </header>
  );
}
