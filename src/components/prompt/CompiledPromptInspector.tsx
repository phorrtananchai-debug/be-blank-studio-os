import { CompiledPromptTrace } from '../../types';

type Props = {
  trace: CompiledPromptTrace;
  enabled?: boolean;
  onCopy?: (text: string) => void;
};

export function CompiledPromptInspector({ trace, enabled = true, onCopy }: Props) {
  if (!enabled) return null;

  return (
    <div className="mt-2 rounded-lg border border-[#ff8800]/25 bg-[#fff7ed] p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wide text-[#9a5000]">Compiled Prompt Inspector</div>
          <div className="mt-1 text-[11px] font-bold text-slate-600">
            Profile: {trace.projectProfileName || 'Project'} · {trace.activeRuleIds.length} rules · {trace.referencesSent.length} refs sent
          </div>
        </div>
        <button
          className="rounded-md border border-[#ff8800]/40 bg-white px-2 py-1 text-[11px] font-black text-[#9a5000]"
          onClick={() => onCopy?.(trace.finalPrompt)}
        >
          Copy Final
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {trace.sections.map((section) => (
          <details key={section.id} className="rounded-md border border-[#ff8800]/15 bg-white p-2">
            <summary className="cursor-pointer text-[11px] font-black text-slate-800">
              {section.label} <span className="font-semibold text-slate-500">({section.source})</span>
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{section.content}</pre>
            {section.ruleIds?.length ? <div className="mt-1 text-[10px] font-bold text-[#9a5000]">Rules: {section.ruleIds.join(', ')}</div> : null}
          </details>
        ))}
      </div>
      {trace.referenceInstructions.length ? (
        <div className="mt-2 rounded-md bg-white p-2 text-[11px] leading-5 text-slate-700">
          <div className="font-black text-[#9a5000]">Reference usage</div>
          {trace.referenceInstructions.map((line) => <div key={line}>{line}</div>)}
        </div>
      ) : null}
      {trace.warnings.length ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] font-semibold text-amber-800">{trace.warnings.join(' ')}</div>
      ) : null}
    </div>
  );
}
