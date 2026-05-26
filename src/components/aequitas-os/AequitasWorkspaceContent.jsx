import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, RefreshCcw, Save } from 'lucide-react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';

const formatCurrency = (value) => `THB ${Math.round(Number(value) || 0).toLocaleString()}`;
const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;

function SectionTitle({ eyebrow, title, caption }) {
  return (
    <div className="space-y-3">
      <p className="type-label text-studio-orange">{eyebrow}</p>
      <h2 className="type-display text-[2rem] sm:text-[2.25rem]">{title}</h2>
      {caption ? <p className="type-body max-w-3xl">{caption}</p> : null}
    </div>
  );
}

function DashboardView({ derived, state }) {
  const topHoldings = derived.portfolioSummary.holdings.slice(0, 6);
  const aiPlan = state.aiPlan;

  return (
    <div className="space-y-12 page-fade">
      <SectionCard eyebrow="Dashboard" title="Portfolio command surface" action={<Badge tone="safe">Local only</Badge>}>
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Portfolio Value" value={formatCurrency(derived.portfolioSummary.totalPortfolioValue)} />
            <MetricTile label="Gain / Loss" value={`${derived.portfolioSummary.gainLoss >= 0 ? '+' : ''}${formatCurrency(derived.portfolioSummary.gainLoss).replace('THB ', 'THB ')}`} />
            <MetricTile label="Cash Buffer" value={formatCurrency(derived.portfolioSummary.cashBufferValue)} />
            <MetricTile label="Monthly DCA" value={formatCurrency(derived.dcaPlan.monthlyBudget)} />
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white/45 p-6">
            <p className="type-label text-studio-orange">What should I do this month?</p>
            <p className="mt-4 type-section-title">{derived.dcaPlan.nextContributionReminder}</p>
            <div className="mt-5 space-y-3">
              {derived.rebalanceGuidance.underweight.slice(0, 3).map((row) => (
                <div key={row.bucket} className="flex items-center justify-between border-b border-black/[0.05] pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="type-card-title">{row.bucket}</p>
                    <p className="type-caption">Target {formatPercent(row.targetPercent)} / Current {formatPercent(row.percent)}</p>
                  </div>
                  <Badge tone="watch">{formatPercent(Math.abs(row.driftPercent))}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard compact eyebrow="Holdings" title="Top positions">
          {topHoldings.length === 0 ? (
            <EmptyState message="No holdings yet. Add your first manual holding to start the portfolio workspace." />
          ) : (
            <div className="space-y-3">
              {topHoldings.map((holding) => (
                <div key={holding.id} className="flex items-start justify-between border-b border-black/[0.05] pb-4 last:border-b-0 last:pb-0">
                  <div>
                    <p className="type-card-title">{holding.ticker} • {holding.displayName}</p>
                    <p className="type-caption">{holding.assetType} • {holding.allocationBucket}</p>
                  </div>
                  <div className="text-right">
                    <p className="type-card-title">{formatCurrency(holding.marketValueBase)}</p>
                    <p className="type-caption">{formatPercent(holding.allocationPercent)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard compact eyebrow="AI Insight" title="Strategic reading">
          {aiPlan?.portfolioSummary ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-black/[0.05] bg-studio-bone/55 p-5">
                <p className="type-label">Overall stance</p>
                <p className="mt-3 type-section-title">{aiPlan.portfolioSummary.overallStance || 'No stance yet'}</p>
                <p className="mt-3 type-body">{aiPlan.portfolioSummary.mainObservation || 'Import an AI plan to see summary reasoning here.'}</p>
              </div>
              <div className="space-y-2">
                {(aiPlan.portfolioSummary.actionPriority || []).slice(0, 4).map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-md border border-black/[0.05] bg-white/45 p-4">
                    <span className="type-control text-studio-orange">{index + 1}</span>
                    <p className="type-body text-studio-ink">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No AI plan imported yet. Export context, review it in ChatGPT or Gemini, then import the JSON plan back here." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white/45 p-5">
      <p className="type-label">{label}</p>
      <p className="mt-4 type-display text-[1.65rem] sm:text-[1.9rem]">{value}</p>
    </div>
  );
}

function DailyBriefView({ derived, state }) {
  const brief = state.dailyBrief || {};
  return (
    <SectionCard eyebrow="Daily Brief" title="Manual-first review" action={<Badge tone="review">Decision support</Badge>}>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <p className="type-section-title">{brief.title || 'Month in view'}</p>
          <p className="type-body">{brief.summary || derived.dcaPlan.nextContributionReminder}</p>
          <div className="space-y-3">
            {(brief.priorities || []).slice(0, 5).map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-md border border-black/[0.05] bg-white/45 p-4">
                <CheckCircle2 size={16} className="mt-0.5 text-studio-olive" />
                <p className="type-body text-studio-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Callout title="Next contribution" body={derived.dcaPlan.nextContributionReminder} />
          <Callout title="Rebalance note" body={derived.rebalanceGuidance.summary} />
          <Callout
            title="Dividend note"
            body={derived.dividends.notes}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function Callout({ title, body }) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white/45 p-5">
      <p className="type-label">{title}</p>
      <p className="mt-3 type-body text-studio-ink">{body}</p>
    </div>
  );
}

function HoldingsView({ derived, actions, showToast }) {
  const [draft, setDraft] = useState({
    ticker: '',
    displayName: '',
    assetType: 'US Stock',
    units: '',
    averageCost: '',
    currentPrice: '',
    currency: 'USD',
  });
  const [navDrafts, setNavDrafts] = useState({});

  const addHolding = () => {
    if (!draft.ticker.trim()) {
      showToast('Ticker is required.', 'error');
      return;
    }
    actions.addHolding({
      ...draft,
      units: Number(draft.units) || 0,
      averageCost: Number(draft.averageCost) || 0,
      currentPrice: Number(draft.currentPrice) || 0,
    });
    setDraft({
      ticker: '',
      displayName: '',
      assetType: 'US Stock',
      units: '',
      averageCost: '',
      currentPrice: '',
      currency: 'USD',
    });
    showToast('Holding added.', 'success');
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Holdings"
        title="Manual portfolio input"
        caption="This shell now reads real local holdings. Portfolio value, allocation, DCA, dividends, and AI context are derived from these records."
      />

      <SectionCard compact eyebrow="Add holding" title="New manual asset">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Ticker" value={draft.ticker} onChange={(value) => setDraft((prev) => ({ ...prev, ticker: value }))} />
          <Field label="Display name" value={draft.displayName} onChange={(value) => setDraft((prev) => ({ ...prev, displayName: value }))} />
          <SelectField label="Asset type" value={draft.assetType} onChange={(value) => setDraft((prev) => ({ ...prev, assetType: value }))} options={['US Stock', 'US ETF', 'Thai Mutual Fund', 'Thai RMF', 'Dividend ETF', 'Sandbox Asset', 'Cash']} />
          <SelectField label="Currency" value={draft.currency} onChange={(value) => setDraft((prev) => ({ ...prev, currency: value }))} options={['USD', 'THB']} />
          <Field label="Units" value={draft.units} onChange={(value) => setDraft((prev) => ({ ...prev, units: value }))} />
          <Field label="Average cost" value={draft.averageCost} onChange={(value) => setDraft((prev) => ({ ...prev, averageCost: value }))} />
          <Field label="Current price / NAV" value={draft.currentPrice} onChange={(value) => setDraft((prev) => ({ ...prev, currentPrice: value }))} />
        </div>
        <div className="mt-6">
          <Button onClick={addHolding}>Add Holding</Button>
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="Portfolio ledger" title="Current holdings">
        {derived.portfolioSummary.holdings.length === 0 ? (
          <EmptyState message="No holdings yet. Add your first holding above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08]">
                  <th className="py-3 text-left type-label">Ticker</th>
                  <th className="py-3 text-left type-label">Asset</th>
                  <th className="py-3 text-left type-label">Type</th>
                  <th className="py-3 text-right type-label">Value</th>
                  <th className="py-3 text-right type-label">P/L</th>
                  <th className="py-3 text-right type-label">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {derived.portfolioSummary.holdings.map((holding) => (
                  <tr key={holding.id} className="border-b border-black/[0.05]">
                    <td className="py-4 type-card-title">{holding.ticker}</td>
                    <td className="py-4 type-body text-studio-ink">{holding.displayName}</td>
                    <td className="py-4 type-caption">{holding.assetType}</td>
                    <td className="py-4 text-right type-card-title">{formatCurrency(holding.marketValueBase)}</td>
                    <td className="py-4 text-right type-caption">{formatPercent(holding.gainLossPercent)}</td>
                    <td className="py-4 text-right type-caption">{formatPercent(holding.allocationPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard compact eyebrow="Thai NAV" title="Manual NAV override">
        {derived.portfolioSummary.holdings.filter((holding) => ['Thai Mutual Fund', 'Thai RMF'].includes(holding.assetType)).length === 0 ? (
          <EmptyState message="No Thai mutual fund or RMF holdings yet." />
        ) : (
          <div className="space-y-4">
            {derived.portfolioSummary.holdings
              .filter((holding) => ['Thai Mutual Fund', 'Thai RMF'].includes(holding.assetType))
              .map((holding) => (
                <div key={holding.id} className="grid gap-4 rounded-lg border border-black/[0.05] bg-white/45 p-5 lg:grid-cols-[1fr_12rem_auto] lg:items-end">
                  <div>
                    <p className="type-card-title">{holding.ticker} • {holding.displayName}</p>
                    <p className="type-caption">
                      Current NAV {holding.currentPriceDisplay || 0} • Value {formatCurrency(holding.marketValueBase)}
                      {holding.navStale ? ' • NAV may be stale' : ''}
                    </p>
                  </div>
                  <Field
                    label="Manual NAV"
                    value={String(navDrafts[holding.id] ?? holding.currentPriceDisplay ?? '')}
                    onChange={(value) => setNavDrafts((prev) => ({ ...prev, [holding.id]: value }))}
                  />
                  <Button
                    onClick={() => {
                      actions.updateHolding(holding.id, {
                        manualNavOverride: Number(navDrafts[holding.id]) || 0,
                        navUpdatedAt: new Date().toISOString().slice(0, 10),
                      });
                      showToast('Thai NAV updated.', 'success');
                    }}
                  >
                    Save NAV
                  </Button>
                </div>
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AllocationView({ derived, state, actions, showToast }) {
  const [draftTargets, setDraftTargets] = useState(() => ({ ...state.targetAllocation }));

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Allocation" title="Bucket allocation and drift" caption="Target allocation, current allocation, drift, and monthly funding priorities are now derived from the real holdings state." />

      <SectionCard compact eyebrow="Current vs target" title="Allocation buckets">
        <div className="space-y-4">
          {derived.allocationDrift.map((row) => (
            <div key={row.bucket} className="grid gap-3 rounded-lg border border-black/[0.05] bg-white/45 p-5 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:items-center">
              <div>
                <p className="type-card-title">{row.bucket}</p>
                <p className="type-caption">{row.driftDirection}</p>
              </div>
              <p className="type-body text-studio-ink">Current {formatPercent(row.percent)}</p>
              <p className="type-body text-studio-ink">Target {formatPercent(row.targetPercent)}</p>
              <Badge tone={row.driftDirection === 'underweight' ? 'watch' : row.driftDirection === 'overweight' ? 'risk' : 'safe'}>
                {row.driftPercent >= 0 ? '+' : ''}{formatPercent(row.driftPercent)}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="Target allocation" title="Update target mix">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.keys(draftTargets).map((bucket) => (
            <Field
              key={bucket}
              label={bucket}
              value={String(draftTargets[bucket] ?? '')}
              onChange={(value) => setDraftTargets((prev) => ({ ...prev, [bucket]: Number(value) || 0 }))}
            />
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => {
            actions.setTargetAllocation(draftTargets);
            showToast('Target allocation updated.', 'success');
          }}
          >
            Save target allocation
          </Button>
          <Button variant="secondary" onClick={() => setDraftTargets({ ...state.targetAllocation })}>Reset</Button>
        </div>
      </SectionCard>
    </div>
  );
}

function DividendsView({ derived }) {
  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Dividends" title="Income estimate layer" caption="Expected dividend income is derived from current holdings, yield assumptions, and the dividend behavior layer." />

      <SectionCard compact eyebrow="Summary" title="Income estimates">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricTile label="Monthly estimate" value={formatCurrency(derived.dividends.expectedMonthlyDividend)} />
          <MetricTile label="Annual estimate" value={formatCurrency(derived.dividends.annualizedDividendIncome)} />
          <MetricTile label="Dividend assets" value={String(derived.dividends.dividendAssets.length)} />
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="Dividend assets" title="Current income contributors">
        {derived.dividends.dividendAssets.length === 0 ? (
          <EmptyState message="No dividend assets yet. Add a dividend ETF or yield-bearing holding to estimate income." />
        ) : (
          <div className="space-y-4">
            {derived.dividends.dividendAssets.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-lg border border-black/[0.05] bg-white/45 p-5 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div>
                  <p className="type-card-title">{item.ticker}</p>
                  <p className="type-caption">{item.layerNote}</p>
                </div>
                <p className="type-body text-studio-ink">Monthly {formatCurrency(item.monthlyIncome)}</p>
                <p className="type-body text-studio-ink">Yield {formatPercent(item.yieldRate * 100)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function DcaPlanView({ derived, actions, showToast }) {
  const [budget, setBudget] = useState(String(derived.dcaPlan.monthlyBudget || ''));

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="DCA Plan" title="Monthly contribution plan" caption="Priority order and suggested contribution amounts are derived from current allocation drift and available cash." />

      <SectionCard compact eyebrow="Monthly budget" title="Set monthly DCA">
        <div className="max-w-sm">
          <Field label="Monthly DCA budget (THB)" value={budget} onChange={setBudget} />
        </div>
        <div className="mt-6">
          <Button onClick={() => {
            actions.setMonthlyBudget(Number(budget) || 0);
            showToast('Monthly budget updated.', 'success');
          }}
          >
            Save monthly budget
          </Button>
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="Contribution queue" title="This month">
        <div className="space-y-4">
          {derived.dcaPlan.contributions.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-lg border border-black/[0.05] bg-white/45 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="type-card-title">{item.bucket}</p>
                <p className="type-caption">{item.reminder}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="type-card-title">{formatCurrency(item.suggestedAmount)}</p>
                <Badge tone={item.status === 'done' ? 'safe' : 'watch'}>{item.status}</Badge>
                <Button variant="secondary" onClick={() => {
                  actions.updateContributionStatus(item.id, item.status === 'done' ? 'pending' : 'done');
                  showToast('Contribution status updated.', 'success');
                }}
                >
                  Mark {item.status === 'done' ? 'pending' : 'done'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AIWorkflowView({ derived, state, actions, showToast }) {
  const [jsonInput, setJsonInput] = useState('');
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [snapshotNote, setSnapshotNote] = useState('');
  const latestSnapshot = state.aiSnapshots[0];

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(derived.aiPromptText);
      showToast('AI prompt copied.', 'success');
    } catch {
      showToast('Clipboard copy failed.', 'error');
    }
  };

  const importPlan = () => {
    try {
      const result = actions.importAiPlanFromJson(jsonInput);
      if (!result.valid) {
        throw new Error(result.errors[0] || 'AI import failed.');
      }
      showToast('AI plan imported.', 'success');
    } catch (error) {
      showToast(error.message || 'AI import failed.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="AI Workflow" title="Manual AI loop" caption="Manual Input → Dashboard Plot → Export AI Context → AI Review → Import AI JSON Plan → Dashboard Update → Snapshot History" />

      <SectionCard compact eyebrow="How it works" title="Three-step loop">
        <div className="grid gap-4 md:grid-cols-3">
          {['1. Copy Prompt', '2. Review in ChatGPT or Gemini', '3. Import AI JSON plan'].map((step) => (
            <div key={step} className="rounded-lg border border-black/[0.05] bg-white/45 p-5">
              <p className="type-card-title">{step}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="AI Prompt" title="Export real Aequitas context" action={<Button variant="secondary" onClick={copyPrompt}><Copy size={14} />Copy</Button>}>
        <textarea
          className="type-field min-h-[22rem] w-full rounded-md border border-black/[0.07] bg-studio-bone/55 p-5 outline-none"
          readOnly
          value={derived.aiPromptText}
        />
      </SectionCard>

      <SectionCard compact eyebrow="AI JSON Import" title="Import structured plan">
        <Field label="Paste AI JSON plan" multiline value={jsonInput} onChange={setJsonInput} />
        <div className="mt-6 flex gap-3">
          <Button onClick={importPlan}>Import AI Plan</Button>
          <Button variant="secondary" onClick={() => setJsonInput('')}>Clear</Button>
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="AI Snapshot" title="Save summary text">
        <div className="grid gap-4">
          <Field label="Snapshot title" value={snapshotTitle} onChange={setSnapshotTitle} />
          <Field label="Note" multiline value={snapshotNote} onChange={setSnapshotNote} />
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => {
            actions.saveAiSnapshot({ title: snapshotTitle, note: snapshotNote, content: jsonInput || derived.aiPromptText });
            setSnapshotTitle('');
            setSnapshotNote('');
            showToast('AI snapshot saved.', 'success');
          }}
          >
            Save AI Snapshot
          </Button>
        </div>
        {latestSnapshot ? (
          <div className="mt-6 rounded-lg border border-black/[0.05] bg-white/45 p-5">
            <p className="type-label">Latest snapshot</p>
            <p className="mt-3 type-card-title">{latestSnapshot.title}</p>
            <p className="mt-2 type-body text-studio-ink">{latestSnapshot.note || 'No note'}</p>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

function AIAdvisorView({ state }) {
  const plan = state.aiPlan;

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="AI Advisor" title="Imported plan reading layer" caption="This page reads the imported AI plan without mutating holdings, units, or average cost." />
      {!plan ? (
        <EmptyState message="No AI plan imported yet." />
      ) : (
        <>
          <SectionCard compact eyebrow="Portfolio Summary" title="Current AI reading">
            <div className="space-y-4">
              <Callout title="Overall stance" body={plan.portfolioSummary?.overallStance || 'Not provided'} />
              <Callout title="Main observation" body={plan.portfolioSummary?.mainObservation || 'Not provided'} />
              <Callout title="Dividend note" body={plan.dividendNotes || 'No dividend notes'} />
            </div>
          </SectionCard>

          <SectionCard compact eyebrow="Asset plans" title="Asset-level notes">
            {plan.assetPlans?.length ? (
              <div className="space-y-3">
                {plan.assetPlans.map((item, index) => (
                  <div key={`${item.ticker || index}-${index}`} className="rounded-lg border border-black/[0.05] bg-white/45 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="type-card-title">{item.ticker || 'Untitled asset'}</p>
                        <p className="type-caption">{item.summary || item.reasoning || item.note || 'No details provided'}</p>
                      </div>
                      <Badge tone="review">{item.stance || 'Review'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No asset-level plan items found." />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function SnapshotsView({ state, actions, showToast }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const snapshots = state.snapshots || [];

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Snapshots" title="State history and recovery" caption="Save the current dashboard state locally, compare allocation drift across snapshots, and restore earlier planning states." />

      <SectionCard compact eyebrow="Save snapshot" title="Create a local recovery point">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Snapshot title" value={title} onChange={setTitle} />
          <Field label="Note" value={note} onChange={setNote} />
        </div>
        <div className="mt-6">
          <Button onClick={() => {
            actions.saveSnapshot({ title, note });
            setTitle('');
            setNote('');
            showToast('Snapshot saved.', 'success');
          }}
          >
            <Save size={14} />
            Save snapshot
          </Button>
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="History" title="Saved snapshots">
        {snapshots.length === 0 ? (
          <EmptyState message="No saved snapshots yet." />
        ) : (
          <div className="space-y-4">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="rounded-lg border border-black/[0.05] bg-white/45 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="type-card-title">{snapshot.title}</p>
                    <p className="type-caption">{new Date(snapshot.createdAt).toLocaleString()}</p>
                    <p className="mt-3 type-body text-studio-ink">{snapshot.note || 'No note'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => {
                      const diff = actions.compareSnapshot(snapshot.id);
                      showToast(diff.length ? `Compared ${diff.length} allocation rows.` : 'No comparison data available.', 'info');
                    }}
                    >
                      Compare
                    </Button>
                    <Button variant="secondary" onClick={() => {
                      actions.restoreSnapshot(snapshot.id);
                      showToast('Snapshot restored.', 'success');
                    }}
                    >
                      <RefreshCcw size={14} />
                      Restore
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function WatchlistView({ state, actions, showToast }) {
  const [ticker, setTicker] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [thesis, setThesis] = useState('');

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Watchlist" title="Ideas kept outside the live portfolio" caption="Watchlist stays separate from production holdings and can be used for AI review or future DCA planning." />
      <SectionCard compact eyebrow="Add watchlist item" title="New idea">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Ticker" value={ticker} onChange={setTicker} />
          <Field label="Display name" value={displayName} onChange={setDisplayName} />
          <Field label="Thesis" value={thesis} onChange={setThesis} />
        </div>
        <div className="mt-6">
          <Button onClick={() => {
            actions.addWatchlistItem({ ticker, displayName, thesis });
            setTicker('');
            setDisplayName('');
            setThesis('');
            showToast('Watchlist item added.', 'success');
          }}
          >
            Add watchlist item
          </Button>
        </div>
      </SectionCard>

      <SectionCard compact eyebrow="Current watchlist" title="Tracked ideas">
        {state.watchlistItems.length === 0 ? (
          <EmptyState message="No watchlist items yet." />
        ) : (
          <div className="space-y-4">
            {state.watchlistItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-black/[0.05] bg-white/45 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="type-card-title">{item.ticker} • {item.displayName}</p>
                    <p className="type-body text-studio-ink">{item.thesis || item.note || 'No thesis yet'}</p>
                  </div>
                  <Badge tone="watch">{item.status || 'Watching'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SettingsView({ state, actions, showToast }) {
  const [usdThbRate, setUsdThbRate] = useState(String(state.settings.portfolio.usdThbRate));
  const [bridgeUrl, setBridgeUrl] = useState(state.settings.thaiNav.googleSheetBridgeUrl || '');

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Settings" title="Storage and planning preferences" caption="These settings stay local by default. Raw provider keys are not persisted unless explicitly enabled." />
      <SectionCard compact eyebrow="Portfolio settings" title="Base configuration">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="USD/THB rate" value={usdThbRate} onChange={setUsdThbRate} />
          <Field label="Thai NAV bridge URL (placeholder)" value={bridgeUrl} onChange={setBridgeUrl} />
        </div>
        <div className="mt-6">
          <Button onClick={() => {
            actions.updateSettings({
              portfolio: {
                ...state.settings.portfolio,
                usdThbRate: Number(usdThbRate) || state.settings.portfolio.usdThbRate,
              },
              thaiNav: {
                ...state.settings.thaiNav,
                googleSheetBridgeUrl: bridgeUrl,
              },
            });
            showToast('Settings updated.', 'success');
          }}
          >
            Save settings
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

function LabsView({ state }) {
  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Labs" title="Isolated experiments" caption="Labs stays separate from the production dashboard and can hold sandbox ideas, simulations, and experimental notes." />
      <SectionCard compact eyebrow="Experimental ideas" title="Ideas log">
        {state.labs.experimentalIdeas?.length ? (
          <div className="space-y-3">
            {state.labs.experimentalIdeas.map((idea, index) => (
              <div key={`${idea}-${index}`} className="rounded-lg border border-black/[0.05] bg-white/45 p-5">
                <p className="type-body text-studio-ink">{idea}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No lab ideas yet." />
        )}
      </SectionCard>
    </div>
  );
}

function ActivityView({ state }) {
  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Activity" title="Review history" caption="A running record of local actions and state events." />
      <SectionCard compact eyebrow="Timeline" title="Recent local activity">
        {state.activity.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <div className="space-y-3">
            {state.activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border border-black/[0.05] bg-white/45 p-4">
                <ArrowRight size={16} className="mt-1 text-studio-muted" />
                <div>
                  <p className="type-card-title">{item.title}</p>
                  <p className="type-caption">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-2 block type-control text-studio-muted/60">{label}</span>
      <select
        className="type-field min-h-11 w-full rounded-md border border-black/[0.07] bg-studio-bone/55 px-4 py-3 outline-none transition-all duration-700 ease-studio-out focus:border-studio-accent/30 focus:bg-studio-bone"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ImportWarning() {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white/45 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 text-studio-orange" />
        <div>
          <p className="type-card-title">AI import is non-destructive</p>
          <p className="type-body text-studio-ink">
            Imported plans update guidance, allocation notes, DCA context, daily brief content, and labs suggestions. Holdings units and average cost stay unchanged unless you edit them manually.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AequitasWorkspaceContent({ activeTab, derived, state, actions, showToast }) {
  const tab = useMemo(() => activeTab || 'dashboard', [activeTab]);

  return (
    <div className="space-y-32 page-fade">
      <ImportWarning />
      <div key={tab} className="page-fade">
        {tab === 'dashboard' && <DashboardView derived={derived} state={state} />}
        {tab === 'daily-brief' && <DailyBriefView derived={derived} state={state} />}
        {tab === 'holdings' && <HoldingsView derived={derived} actions={actions} showToast={showToast} />}
        {tab === 'allocation' && <AllocationView derived={derived} state={state} actions={actions} showToast={showToast} />}
        {tab === 'dividends' && <DividendsView derived={derived} />}
        {tab === 'dca-plan' && <DcaPlanView derived={derived} actions={actions} showToast={showToast} />}
        {tab === 'ai-workflow' && <AIWorkflowView derived={derived} state={state} actions={actions} showToast={showToast} />}
        {tab === 'ai-advisor' && <AIAdvisorView state={state} />}
        {tab === 'snapshots' && <SnapshotsView state={state} actions={actions} showToast={showToast} />}
        {tab === 'watchlist' && <WatchlistView state={state} actions={actions} showToast={showToast} />}
        {tab === 'settings' && <SettingsView state={state} actions={actions} showToast={showToast} />}
        {tab === 'labs' && <LabsView state={state} />}
        {tab === 'activity' && <ActivityView state={state} />}
      </div>
    </div>
  );
}
