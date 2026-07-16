import { ImagePlus, ShieldCheck, Sparkles } from 'lucide-react';
import {
  GeneralReferenceDirection,
  GeneralReferenceRole,
  GeneralReferenceScope,
  VisualDirectionAnalysis,
  VisualDirectionApplyScope,
  GeneralProductionState,
  ProviderCapabilitySummary,
  SpaceType,
} from '../../types';

type Props = {
  baseImage?: string;
  references: GeneralReferenceDirection[];
  analysis?: VisualDirectionAnalysis;
  analyzing?: boolean;
  roleOptions: Array<{ value: GeneralReferenceRole; label: string }>;
  scopeOptions: Array<{ value: GeneralReferenceScope; label: string }>;
  onUpload: (files: FileList | null) => void;
  onUpdate: (id: string, patch: Partial<GeneralReferenceDirection>) => void;
  onRemove: (id: string) => void;
  onAnalyze: () => void;
  onApply: (scope: VisualDirectionApplyScope) => void;
  onSkip: () => void;
  visionAvailable: boolean;
  visionApproved: boolean;
  onVisionApprovalChange: (approved: boolean) => void;
  generalProduction: GeneralProductionState;
  providerCapability: ProviderCapabilitySummary;
  spaceTypeOptions: Array<{ value: SpaceType; label: string }>;
  onSpaceTypeChange: (value: SpaceType) => void;
  onGenerationChange: (intent: GeneralProductionState['generationIntent'], freedom: GeneralProductionState['designFreedom']) => void;
  onResolveConflict: (conflictId: string, referenceId: string) => void;
};

export function ReferenceDirectionWorkspace({ baseImage, references, analysis, analyzing, roleOptions, scopeOptions, onUpload, onUpdate, onRemove, onAnalyze, onApply, onSkip, visionAvailable, visionApproved, onVisionApprovalChange, generalProduction, providerCapability, spaceTypeOptions, onSpaceTypeChange, onGenerationChange, onResolveConflict }: Props) {
  const included = references.filter((reference) => reference.included);
  return <div data-testid="general-reference-workspace" className="h-full overflow-auto bg-slate-950 p-6 text-slate-100">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb15c]">General / Custom</p>
          <h2 className="mt-2 text-3xl font-black">Reference Direction</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Build visual direction from the Base Render and scoped references. References guide appearance only; they never replace the project design.</p>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#ff8800] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,136,0,0.28)] hover:bg-[#e67800]">
          <ImagePlus className="mr-2 h-4 w-4" />Add References
          <input data-testid="general-reference-upload" className="hidden" type="file" accept="image/*" multiple onChange={(event) => onUpload(event.target.files)} />
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-[#ffb15c]" />Base truth</div>
          {baseImage ? <img src={baseImage} alt="Base Render source of truth" className="mt-3 aspect-[4/3] w-full rounded-2xl object-contain bg-black/30" /> : <div className="mt-3 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Upload a Base Render before analysis. The General baseline always protects its architecture and camera.</div>}
          <p className="mt-3 text-xs leading-5 text-slate-400">Safe defaults: do not copy architecture, geometry, furniture form, composition, camera, or signage from references.</p>
        </div>
        <div className="space-y-3">
          {!references.length && <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-6 text-sm text-slate-400">Add mood, material, lighting, landscape, people, or photography references. You can also continue with no references after explicitly choosing that path.</div>}
          {references.map((reference) => <div key={reference.id} className="rounded-3xl border border-white/10 bg-white/[0.055] p-3">
            <div className="flex gap-3">
              <img src={reference.dataUrl} alt={reference.name} className="h-20 w-24 rounded-2xl object-cover bg-black/30" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><input className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" value={reference.name} onChange={(event) => onUpdate(reference.id, { name: event.target.value })} /><button className="rounded-lg px-2 py-1 text-xs font-black text-red-300 hover:bg-red-500/10" onClick={() => onRemove(reference.id)}>Remove</button></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select className="h-8 rounded-xl border border-white/10 bg-slate-900 px-2 text-xs text-white" value={reference.role} onChange={(event) => onUpdate(reference.id, { role: event.target.value as GeneralReferenceRole })}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <select className="h-8 rounded-xl border border-white/10 bg-slate-900 px-2 text-xs text-white" value={reference.priority} onChange={(event) => onUpdate(reference.id, { priority: event.target.value as GeneralReferenceDirection['priority'] })}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select>
                </div>
                <textarea className="mt-2 h-16 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-2 text-xs leading-5 text-white outline-none focus:border-[#ff8800]" placeholder="What should this reference influence?" value={reference.userNote} onChange={(event) => onUpdate(reference.id, { userNote: event.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{scopeOptions.map((option) => <button key={option.value} type="button" className={`rounded-full px-2 py-1 text-[10px] font-black ${reference.scopes.includes(option.value) ? 'bg-[#ff8800] text-white' : 'bg-white/10 text-slate-400 hover:bg-white/15'}`} onClick={() => onUpdate(reference.id, { scopes: reference.scopes.includes(option.value) ? reference.scopes.filter((scope) => scope !== option.value) : [...reference.scopes, option.value] })}>{option.label}</button>)}</div>
          </div>)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="rounded-2xl border border-white/10 bg-white/[0.055] p-3"><span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Space</span><select data-testid="general-space-type" className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs font-black text-white" value={generalProduction.spaceType} onChange={(event) => onSpaceTypeChange(event.target.value as SpaceType)}>{spaceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="rounded-2xl border border-white/10 bg-white/[0.055] p-3"><span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Generation</span><select data-testid="general-generation-intent" className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs font-black text-white" value={generalProduction.generationIntent} onChange={(event) => onGenerationChange(event.target.value as GeneralProductionState['generationIntent'], generalProduction.designFreedom)}><option value="explore">Explore</option><option value="develop">Develop</option><option value="polish">Polish</option><option value="fix">Fix</option></select></label>
        <label className="rounded-2xl border border-white/10 bg-white/[0.055] p-3"><span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Design freedom</span><select data-testid="general-design-freedom" disabled={generalProduction.generationIntent === 'polish' || generalProduction.generationIntent === 'fix'} className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs font-black text-white disabled:opacity-50" value={generalProduction.designFreedom} onChange={(event) => onGenerationChange(generalProduction.generationIntent, event.target.value as GeneralProductionState['designFreedom'])}><option value="strict">Strict</option><option value="balanced">Balanced</option><option value="creative">Creative</option></select></label>
        <div data-testid="provider-capability-summary" className="rounded-2xl border border-white/10 bg-white/[0.055] p-3"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Provider disclosure</div><p className="mt-2 text-xs font-black text-white">{providerCapability.providerLabel}</p><p className="mt-1 text-[11px] leading-4 text-slate-400">Vision: {providerCapability.supportsVision ? 'yes' : 'no'} · refs: {providerCapability.referenceImagesSent.length} sent, {providerCapability.textOnlyReferences.length} text-only</p></div>
      </div>

      <details className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4"><summary className="cursor-pointer list-none text-sm font-black text-white">Scene Contract and recipes <span className="ml-2 text-xs font-semibold text-slate-400">{generalProduction.sceneContract.lockedElements.length} locked · {generalProduction.sceneContract.flexibleElements.length} flexible · {generalProduction.sceneContract.explicitlyEditableElements.length} editable</span></summary><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[#ffb15c]">Strict Scene Contract v{generalProduction.sceneContract.version}</div><ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{generalProduction.sceneContract.lockedElements.slice(0, 5).map((item) => <li key={item}>- {item}</li>)}</ul><p className="mt-2 text-[11px] text-slate-400">Camera: {generalProduction.sceneContract.cameraContract.lockMode}; {generalProduction.sceneContract.cameraContract.cameraMovementAllowance}</p></div><div className="rounded-2xl bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[#ffb15c]">Atmosphere Recipe v{generalProduction.atmosphereRecipe.version}</div><p className="mt-2 text-xs leading-5 text-slate-300">{generalProduction.atmosphereRecipe.timeOfDay.replace(/_/g, ' ')} · {generalProduction.atmosphereRecipe.whiteBalance.replace(/_/g, ' ')} · {generalProduction.atmosphereRecipe.photographyCharacter}</p><p className="mt-2 text-[11px] text-slate-400">Analysis: {generalProduction.atmosphereRecipe.analysisMode}</p></div><div className="rounded-2xl bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[#ffb15c]">Material Zones</div><p className="mt-2 text-xs leading-5 text-slate-300">{generalProduction.sceneContract.materialZones.map((zone) => `${zone.label} (${zone.flexibility})`).join(' · ') || 'No semantic zones yet.'}</p></div><div className="rounded-2xl bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[#ffb15c]">Reference delivery</div><p className="mt-2 text-xs leading-5 text-slate-300">Base image: {providerCapability.baseImageSent ? 'sent' : 'not sent'} · editable result: {providerCapability.editableResultSent ? 'sent' : 'not sent'}</p><p className="mt-2 text-[11px] text-slate-400">{providerCapability.omittedReferences.length ? `${providerCapability.omittedReferences.length} omitted: ${providerCapability.omittedReferences.map((item) => item.reason).join(' ')}` : 'No reference omission.'}</p></div></div></details>

      <div className="mt-5 flex flex-wrap gap-3 rounded-3xl border border-[#ff8800]/25 bg-[#ff8800]/10 p-4">
        <button data-testid="analyze-general-references" disabled={!baseImage || !included.length || analyzing} className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#ff8800] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onAnalyze}><Sparkles className="mr-2 h-4 w-4" />{analyzing ? 'Analyzing...' : 'Analyze References'}</button>
        <button data-testid="generate-without-references" disabled={!baseImage} className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white disabled:opacity-50" onClick={onSkip}>Generate without references</button>
        <p className="self-center text-xs text-orange-50">Analysis is reviewable before it can influence generation. {included.length ? `${included.length} included reference${included.length === 1 ? '' : 's'}.` : 'No references selected.'}</p>
        {visionAvailable && <label className="flex w-full cursor-pointer items-center gap-2 text-xs font-semibold text-orange-50"><input type="checkbox" className="accent-[#ff8800]" checked={visionApproved} onChange={(event) => onVisionApprovalChange(event.target.checked)} />Send the Base Render and included references to configured Gemini vision for this analysis.</label>}
      </div>

      {analysis && <div data-testid="visual-direction-review" className="mt-5 rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.08] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Agent reference analysis</p><h3 className="mt-2 text-xl font-black">Review Visual Direction</h3><p className="mt-1 text-xs text-emerald-100/75">{analysis.analysisSource === 'vision' ? `Vision-assisted analysis${analysis.provider ? ` via ${analysis.provider}` : ''}` : 'Metadata/text-based analysis. No visual claim is made without a configured vision provider.'}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-emerald-100">{analysis.status}</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{[
          ['What stays unchanged', analysis.protectedBaseElements.join('; ')],
          ['Overall atmosphere', analysis.overallAtmosphere],
          ['Lighting direction', analysis.lightingDirection],
          ['Material direction', analysis.materialDirection],
          ['Environment', analysis.landscapeEnvironmentDirection],
          ['Photography', analysis.photographicTreatment],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-emerald-300">{label}</div><p className="mt-1 text-xs leading-5 text-slate-200">{value}</p></div>)}</div>
        {(analysis.conflicts.length > 0 || generalProduction.conflicts.length > 0) && <div data-testid="general-reference-conflicts" className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50"><b>Reference conflicts</b><ul className="mt-1 list-disc pl-4">{analysis.conflicts.map((item) => <li key={item}>{item}</li>)}</ul>{generalProduction.conflicts.map((conflict) => <div key={conflict.id} className="mt-2 rounded-xl bg-black/20 p-2">{conflict.reason}<div className="mt-2 flex flex-wrap gap-2">{conflict.referenceIds.map((referenceId) => <button key={referenceId} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black" onClick={() => onResolveConflict(conflict.id, referenceId)}>Use {references.find((reference) => reference.id === referenceId)?.name || 'this reference'}</button>)}</div></div>)}</div>}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xs font-black text-white">Reference usage map</div>{analysis.referenceUsageMap.map((usage) => <div key={usage.referenceId} className="mt-2 border-t border-white/10 pt-2 text-xs leading-5 text-slate-300"><b>{usage.referenceName}</b>: borrow {usage.borrowed}. Do not borrow {usage.notBorrowed}. Apply to {usage.baseApplication}.</div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><button data-testid="apply-visual-direction-scene" disabled={generalProduction.conflicts.some((conflict) => conflict.requiresUserChoice && !conflict.resolvedReferenceId)} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#ff8800] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onApply('scene')}>Apply for this scene</button><button className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-black text-white" onClick={() => onApply('image')}>Use for this image only</button><button className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-black text-white" onClick={() => onApply('project')}>Save as project default</button></div>
      </div>}
    </div>
  </div>;
}
