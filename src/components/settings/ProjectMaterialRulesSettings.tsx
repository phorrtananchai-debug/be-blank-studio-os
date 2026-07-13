import {
  MaterialRuleCategory,
  MaterialRuleProtectionLevel,
  MaterialRuleReferenceScope,
  ProjectMaterialRule,
  ProjectSourceOfTruth,
} from '../../types';
import {
  applicableProjectRuleReferences,
  scopedColorCastCorrectionLine,
} from '../../projectSourceOfTruth';

export type MaterialRuleCategoryOption = { value: MaterialRuleCategory; label: string };
export type MaterialRuleProtectionOption = { value: MaterialRuleProtectionLevel; label: string };
export type MaterialReferenceScopeOption = { value: MaterialRuleReferenceScope; label: string };

type Props = {
  sourceOfTruth: ProjectSourceOfTruth;
  activeRuleCount: number;
  warnings: string[];
  categoryOptions: MaterialRuleCategoryOption[];
  protectionOptions: MaterialRuleProtectionOption[];
  scopeOptions: MaterialReferenceScopeOption[];
  onAddRule: () => void;
  onRestoreDefaults: () => void;
  onUpdateRule: (ruleId: string, patch: Partial<ProjectMaterialRule>) => void;
  onUpdateListField: (ruleId: string, field: 'approvedCharacteristics' | 'forbiddenCharacteristics', value: string) => void;
  onDuplicateRule: (rule: ProjectMaterialRule) => void;
  onDeleteRule: (rule: ProjectMaterialRule) => void;
  onAddReferences: (ruleId: string, files: FileList | null) => void;
  onUpdateReference: (ruleId: string, refId: string, patch: Partial<ProjectMaterialRule['referenceImages'][number]>) => void;
  onRemoveReference: (ruleId: string, refId: string) => void;
};

export function ProjectMaterialRulesSettings({
  sourceOfTruth,
  activeRuleCount,
  warnings,
  categoryOptions,
  protectionOptions,
  scopeOptions,
  onAddRule,
  onRestoreDefaults,
  onUpdateRule,
  onUpdateListField,
  onDuplicateRule,
  onDeleteRule,
  onAddReferences,
  onUpdateReference,
  onRemoveReference,
}: Props) {
  const groupedProjectRules = sourceOfTruth.materialRules.reduce<Record<string, ProjectMaterialRule[]>>((acc, rule) => {
    const label = categoryOptions.find((option) => option.value === rule.category)?.label || rule.category;
    acc[label] = [...(acc[label] || []), rule];
    return acc;
  }, {});

  return (
    <div className="rounded-[32px] bg-white/8 p-6 ring-1 ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb15c]">Project → {sourceOfTruth.profileName} → Rules</p>
          <h2 className="mt-2 text-2xl font-black">Material Rules Source of Truth</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            These editable project rules are injected before generic mood, luxury, editorial, and color-cast instructions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
            <span className="rounded-full bg-[#ff8800]/15 px-3 py-1 text-[#ffb15c]">{activeRuleCount} active rules</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">{applicableProjectRuleReferences(sourceOfTruth).length} scoped references</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">{warnings.length} warnings</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center rounded-2xl bg-[#ff8800] px-4 text-xs font-black text-white" onClick={onAddRule}>Add Rule</button>
          <button className="inline-flex h-10 items-center rounded-2xl border border-white/10 bg-white/10 px-4 text-xs font-black text-slate-200" onClick={onRestoreDefaults}>Restore Karun Defaults</button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#ff8800]/25 bg-[#ff8800]/10 p-4 text-sm leading-6 text-slate-200">
        <div className="font-black text-[#ffb15c]">Prompt priority policy</div>
        <div className="mt-1 text-xs text-slate-300">{sourceOfTruth.promptPriorityPolicy.join(' → ')}</div>
        <div className="mt-2 text-xs text-slate-300">Scoped correction: {scopedColorCastCorrectionLine(sourceOfTruth)}</div>
      </div>

      <div className="mt-5 space-y-5">
        {Object.entries(groupedProjectRules).map(([categoryLabel, rules]) => (
          <div key={categoryLabel}>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{categoryLabel}</div>
            <div className="grid gap-4">
              {rules.map((rule) => (
                <details key={rule.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4 open:bg-black/28">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`h-7 rounded-full px-3 py-1.5 text-[11px] font-black ${rule.enabled ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400'}`}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-black text-white">{rule.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{rule.protectionLevel} · priority {rule.priority} · {rule.referenceImages.length} refs</div>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-slate-300">{rule.category}</span>
                    </div>
                  </summary>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs font-bold text-slate-400">Rule actions</div>
                    <button
                      type="button"
                      className={`h-8 rounded-full px-3 text-[11px] font-black ${rule.enabled ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-300'}`}
                      onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                    >
                      {rule.enabled ? 'Disable rule' : 'Enable rule'}
                    </button>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <label className="text-xs font-black text-slate-400">Rule name<input className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.name} onChange={(e) => onUpdateRule(rule.id, { name: e.target.value })} /></label>
                    <label className="text-xs font-black text-slate-400">Category<select className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.category} onChange={(e) => onUpdateRule(rule.id, { category: e.target.value as MaterialRuleCategory })}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="text-xs font-black text-slate-400">Protection<select className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.protectionLevel} onChange={(e) => onUpdateRule(rule.id, { protectionLevel: e.target.value as MaterialRuleProtectionLevel })}>{protectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="text-xs font-black text-slate-400">Priority<input type="number" className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white" value={rule.priority} onChange={(e) => onUpdateRule(rule.id, { priority: Number(e.target.value) || 100 })} /></label>
                    <label className="col-span-2 text-xs font-black text-slate-400">Description<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.description} onChange={(e) => onUpdateRule(rule.id, { description: e.target.value })} /></label>
                    <label className="text-xs font-black text-slate-400">Approved characteristics<textarea className="mt-1 h-28 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.approvedCharacteristics.join('\n')} onChange={(e) => onUpdateListField(rule.id, 'approvedCharacteristics', e.target.value)} /></label>
                    <label className="text-xs font-black text-slate-400">Forbidden substitutions<textarea className="mt-1 h-28 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.forbiddenCharacteristics.join('\n')} onChange={(e) => onUpdateListField(rule.id, 'forbiddenCharacteristics', e.target.value)} /></label>
                    <label className="text-xs font-black text-slate-400">Color guidance<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.colorGuidance} onChange={(e) => onUpdateRule(rule.id, { colorGuidance: e.target.value })} /></label>
                    <label className="text-xs font-black text-slate-400">Finish guidance<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.finishGuidance} onChange={(e) => onUpdateRule(rule.id, { finishGuidance: e.target.value })} /></label>
                    <label className="col-span-2 text-xs font-black text-slate-400">Prompt injection<textarea className="mt-1 h-24 w-full rounded-xl border border-[#ff8800]/30 bg-[#ff8800]/10 p-3 font-mono text-xs leading-5 text-white" value={rule.promptInjection} onChange={(e) => onUpdateRule(rule.id, { promptInjection: e.target.value })} /></label>
                    <label className="col-span-2 text-xs font-black text-slate-400">QC validation guidance<textarea className="mt-1 h-20 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white" value={rule.qcValidationGuidance} onChange={(e) => onUpdateRule(rule.id, { qcValidationGuidance: e.target.value })} /></label>
                    <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div><div className="text-sm font-black text-white">Reference images</div><p className="mt-1 text-xs text-slate-400">References are scoped material truth, not composition or architecture instructions.</p></div>
                        <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-white/10 px-3 text-xs font-black text-slate-200">Upload refs<input className="hidden" type="file" accept="image/*" multiple onChange={(e) => onAddReferences(rule.id, e.target.files)} /></label>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {rule.referenceImages.map((ref) => (
                          <div key={ref.id} className="rounded-xl border border-white/10 bg-black/20 p-2">
                            <div className="flex gap-2"><img src={ref.dataUrl} alt={ref.name} className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><input className="h-8 w-full rounded-lg border border-white/10 bg-white/10 px-2 text-xs text-white" value={ref.name} onChange={(e) => onUpdateReference(rule.id, ref.id, { name: e.target.value })} /><textarea className="mt-1 h-12 w-full rounded-lg border border-white/10 bg-white/10 p-2 text-xs text-white" value={ref.notes || ''} placeholder="Reference notes" onChange={(e) => onUpdateReference(rule.id, ref.id, { notes: e.target.value })} /></div></div>
                            <div className="mt-2 flex flex-wrap gap-1">{scopeOptions.map((scope) => <button key={scope.value} type="button" className={`rounded-full px-2 py-1 text-[10px] font-black ${ref.scopes.includes(scope.value) ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400'}`} onClick={() => onUpdateReference(rule.id, ref.id, { scopes: ref.scopes.includes(scope.value) ? ref.scopes.filter((item) => item !== scope.value) : [...ref.scopes, scope.value] })}>{scope.label}</button>)}</div>
                            <button className="mt-2 text-[11px] font-black text-red-300" onClick={() => onRemoveReference(rule.id, ref.id)}>Remove reference</button>
                          </div>
                        ))}
                        {!rule.referenceImages.length && <div className="rounded-xl border border-dashed border-white/15 p-4 text-xs text-slate-500">No source-of-truth references yet.</div>}
                      </div>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-slate-950/60 p-3">
                      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Compiled prompt preview</div>
                      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{[
                        rule.promptInjection,
                        rule.colorGuidance ? `Color rule: ${rule.colorGuidance}` : '',
                        rule.finishGuidance ? `Finish rule: ${rule.finishGuidance}` : '',
                        rule.forbiddenCharacteristics.length ? `Forbidden: ${rule.forbiddenCharacteristics.join(', ')}` : '',
                      ].filter(Boolean).join('\n')}</pre>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2">
                      <button className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-slate-200" onClick={() => onDuplicateRule(rule)}>Duplicate</button>
                      {!rule.isDefault && <button className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200" onClick={() => onDeleteRule(rule)}>Delete custom rule</button>}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
