import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ImagePlus,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CopilotActionProposal,
  CopilotContext,
  CopilotThreadState,
  copilotStorageKey,
  createEmptyCopilotThread,
  stripSecretsFromCopilotText,
} from './visualLocalCopilot';
import {
  clearCopilotApiKey,
  copilotProviders,
  CopilotProviderId,
  CopilotSettings,
  hasCopilotApiKey,
  loadCopilotSettings,
  saveCopilotApiKey,
  saveCopilotSettings,
} from './copilotSettings';
import { interpretWithCopilotProvider } from './copilotProviders';

type AttachedReference = { name: string; dataUrl: string };
type CopilotVisibilityState = 'expanded' | 'minimized' | 'hidden';

type VisualLocalCopilotProps = {
  context: CopilotContext;
  onApplyActions: (actions: CopilotActionProposal[]) => void;
};

const COPILOT_UI_STATE_STORAGE_KEY = 'visual-local-copilot-ui-state-v1';

const quickPrompts = [
  'เบาะยังน้ำตาลไป ทำให้เป็นแดงมารูนแบบ Karun หนังดูจริงขึ้น แต่ห้ามเปลี่ยนทรง',
  'Make the ceiling and columns neutral white, but keep Karun red materials warm.',
  'เพิ่มคนแบบ opening day เบาๆ ห้ามบังโลโก้และเคาน์เตอร์',
  'Review current result and prepare a revision prompt.',
];

const riskClass = {
  low: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  medium: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  high: 'border-red-400/30 bg-red-500/10 text-red-100',
};

export function VisualLocalCopilot({ context, onApplyActions }: VisualLocalCopilotProps) {
  const [thread, setThread] = useState<CopilotThreadState>(() => loadThread(context.projectId, context.sceneId));
  const [visibility, setVisibility] = useState<CopilotVisibilityState>(() => loadCopilotVisibilityState());
  const [input, setInput] = useState('');
  const [attachedReference, setAttachedReference] = useState<AttachedReference | undefined>();
  const [pendingActions, setPendingActions] = useState<CopilotActionProposal[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<CopilotSettings>(() => loadCopilotSettings());
  const [keyDraft, setKeyDraft] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const storageKey = useMemo(() => copilotStorageKey(context.projectId, context.sceneId), [context.projectId, context.sceneId]);
  const activeProvider = copilotProviders.find((item) => item.id === settings.providerId) || copilotProviders[0];
  const contextBadges = useMemo(() => [
    context.sourceOfTruth?.profileName ? `${context.sourceOfTruth.profileName} rules active` : 'No project rules',
    context.activeResultRound ? `Current result: ${context.activeResultRound.name}` : 'No result selected',
    context.activeGoalIds.length ? `${context.activeGoalIds.length} goals active` : 'No goals active',
    context.referencesCount ? `${context.referencesCount} references` : 'No references',
  ], [context]);

  useEffect(() => {
    const next = loadThread(context.projectId, context.sceneId);
    setThread(next);
    setVisibility(loadCopilotVisibilityState(next.minimized ? 'minimized' : 'expanded'));
    setPendingActions([]);
    setAttachedReference(undefined);
  }, [context.projectId, context.sceneId]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ ...thread, minimized: visibility !== 'expanded' }));
    saveCopilotVisibilityState(visibility);
  }, [storageKey, thread, visibility]);

  useEffect(() => {
    saveCopilotSettings(settings);
  }, [settings]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const cleaned = stripSecretsFromCopilotText(input);
    if (!cleaned && !attachedReference) return;
    setIsInterpreting(true);
    setStatusText(settings.mode === 'deterministic_only' ? 'Running deterministic local parser...' : `Asking ${activeProvider.displayName} for structured actions...`);
    const now = new Date().toISOString();
    try {
      const result = await interpretWithCopilotProvider({
        message: cleaned,
        context,
        settings,
        recentMessages: thread.messages,
        attachedReference,
      });
      const interpretation = result.interpretation;
      const actions = interpretation.actions.filter((item) => item.type !== 'no_action_information');
      const userMessage = { id: `copilot-user-${Date.now()}`, role: 'user' as const, text: cleaned, createdAt: now };
      const assistantMessage = {
        id: `copilot-assistant-${Date.now()}`,
        role: 'assistant' as const,
        text: interpretation.summary,
        createdAt: new Date().toISOString(),
        actions: interpretation.actions,
        providerId: result.providerId,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        warnings: interpretation.warnings,
        conflicts: interpretation.conflicts,
      };
      setThread((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        messages: [...current.messages, userMessage, assistantMessage].slice(-40),
      }));
      setPendingActions(actions);
      setSelectedActionIds(new Set(actions.filter((item) => item.riskLevel !== 'high').map((item) => item.id)));
      setInput('');
      setStatusText(result.status === 'error'
        ? interpretation.summary
        : result.status === 'fallback'
          ? 'AI failed; deterministic fallback prepared actions.'
          : `Prepared with ${activeProvider.displayName} in ${result.durationMs}ms.`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Copilot interpretation failed.');
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleApply = (mode: 'selected' | 'safe' | 'all' = 'selected') => {
    const candidates = mode === 'all'
      ? pendingActions
      : mode === 'safe'
        ? pendingActions.filter((item) => !item.requiresConfirmation && item.riskLevel !== 'high')
        : pendingActions.filter((item) => selectedActionIds.has(item.id));
    if (!candidates.length) return;
    const confirmNeeded = candidates.some((item) => item.requiresConfirmation || item.riskLevel === 'high');
    if (confirmNeeded && !confirm('Apply these Copilot actions? Protected Source of Truth rules will not be changed silently.')) return;
    onApplyActions(candidates);
    const appliedIds = new Set(candidates.map((item) => item.id));
    setThread((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      messages: current.messages.map((message) => ({
        ...message,
        actions: message.actions?.map((action) => appliedIds.has(action.id) ? { ...action, status: 'applied' } : action),
      })),
    }));
    setPendingActions((current) => current.filter((item) => !appliedIds.has(item.id)));
    setSelectedActionIds(new Set());
    setStatusText(`Applied ${appliedIds.size} Copilot action${appliedIds.size === 1 ? '' : 's'}. Prompt inspector can show the provider-ready prompt.`);
  };

  const rejectSelected = () => {
    const rejectedIds = new Set([...selectedActionIds]);
    setPendingActions((current) => current.filter((item) => !rejectedIds.has(item.id)));
    setThread((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      messages: current.messages.map((message) => ({
        ...message,
        actions: message.actions?.map((action) => rejectedIds.has(action.id) ? { ...action, status: 'rejected' } : action),
      })),
    }));
    setSelectedActionIds(new Set());
    setStatusText(`Rejected ${rejectedIds.size} Copilot action${rejectedIds.size === 1 ? '' : 's'}.`);
  };

  const handleReference = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setIsReadingFile(true);
    try {
      setAttachedReference({ name: file.name, dataUrl: await fileToDataUrl(file) });
    } finally {
      setIsReadingFile(false);
    }
  };

  if (visibility !== 'expanded') {
    const hasPending = pendingActions.length > 0;
    const hidden = visibility === 'hidden';
    return <button
      type="button"
      data-testid="visual-local-copilot-toggle"
      aria-label="Open Visual Local Copilot"
      title="Open Visual Local Copilot"
      className={`fixed bottom-5 right-5 z-[80] inline-flex items-center justify-center rounded-full border border-[#ff8800]/50 bg-slate-950 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] outline-none transition hover:-translate-y-0.5 hover:border-[#ff8800] hover:bg-slate-900 focus-visible:ring-4 focus-visible:ring-[#ff8800]/35 ${hidden ? 'h-11 w-11 opacity-90' : 'h-14 min-w-14 gap-3 px-4'}`}
      onClick={() => setVisibility('expanded')}
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ff8800]">
        <Bot className="h-4 w-4" />
        {hasPending && <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-black text-slate-950">{pendingActions.length}</span>}
      </span>
      {!hidden && <span className="pr-1 text-sm font-black">Copilot</span>}
    </button>;
  }

  return <section
    data-testid="visual-local-copilot"
    className="fixed bottom-5 right-5 z-[80] flex max-h-[78vh] w-[380px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 text-white shadow-[0_28px_90px_rgba(2,6,23,0.55)] backdrop-blur"
  >
    <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ff8800] text-white"><Bot className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-black">Visual Local Copilot</h3>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{activeProvider.displayName} / {settings.model}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <button type="button" aria-label={expandedHistory ? 'Collapse Copilot history' : 'Expand Copilot history'} className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-300 hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#ff8800]/50" onClick={() => setExpandedHistory(!expandedHistory)}>
          {expandedHistory ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button type="button" aria-label="Minimize Visual Local Copilot" className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-300 hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#ff8800]/50" onClick={() => setVisibility('minimized')}><ChevronDown className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Close Visual Local Copilot" className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-300 hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#ff8800]/50" onClick={() => setVisibility('hidden')}><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>

    <div className="flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {contextBadges.map((badge) => <span key={badge} className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-black text-slate-300">{badge}</span>)}
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${settings.mode === 'deterministic_only' ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>{settings.mode.replace(/_/g, ' ')}</span>
      </div>

      <div className="rounded-2xl border border-[#ff8800]/25 bg-[#ff8800]/10 p-3 text-xs leading-5 text-orange-50">
        <div className="mb-1 flex items-center gap-2 font-black"><ShieldCheck className="h-3.5 w-3.5" /> Review-before-apply</div>
        Copilot can prepare goals, revision notes, references, and prompt-inspector actions. It will not generate images or silently change protected project rules.
      </div>

      {expandedHistory && thread.messages.length > 0 && <div className="mt-3 space-y-2">
        {thread.messages.slice(-8).map((message) => <div key={message.id} className={`rounded-2xl border p-3 text-xs leading-5 ${message.role === 'user' ? 'border-white/10 bg-white/8 text-slate-100' : 'border-[#ff8800]/20 bg-[#ff8800]/8 text-orange-50'}`}>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{message.role === 'user' ? <MessageSquareText className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}{message.role}</div>
          {message.text}
        </div>)}
      </div>}

      {pendingActions.length > 0 && <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Proposed Actions</h4>
          <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-black text-slate-300">{pendingActions.length}</span>
        </div>
        {pendingActions.map((item) => <div key={item.id} data-testid="copilot-action-card" className={`rounded-2xl border p-3 ${riskClass[item.riskLevel]}`}>
          <div className="flex items-start justify-between gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-[#ff8800]"
              checked={selectedActionIds.has(item.id)}
              onChange={(event) => {
                const next = new Set(selectedActionIds);
                if (event.target.checked) next.add(item.id);
                else next.delete(item.id);
                setSelectedActionIds(next);
              }}
            />
            <div className="min-w-0">
              <div className="text-xs font-black">{item.title}</div>
              <p className="mt-1 text-[11px] leading-5 opacity-85">{item.rationale}</p>
              {typeof item.payload.text === 'string' && <div className="mt-2 rounded-xl bg-black/20 p-2 text-[10px] leading-4 opacity-90">{item.payload.text}</div>}
            </div>
            {item.requiresConfirmation && <AlertTriangle className="h-4 w-4 flex-none" />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">{item.affectedScope}</span>
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">{item.type.replace(/_/g, ' ')}</span>
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">{item.riskLevel} risk</span>
            {item.requiresConfirmation && <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">confirmation</span>}
          </div>
        </div>)}
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="rounded-xl bg-[#ff8800] px-2 py-2 text-[11px] font-black text-white" onClick={() => handleApply('selected')}>Apply selected</button>
          <button type="button" className="rounded-xl bg-white/10 px-2 py-2 text-[11px] font-black text-slate-200" onClick={() => handleApply('safe')}>Apply safe</button>
          <button type="button" className="rounded-xl bg-white/10 px-2 py-2 text-[11px] font-black text-slate-200" onClick={rejectSelected}>Reject selected</button>
        </div>
      </div>}

      {statusText && <div className="mt-3 rounded-2xl border border-white/10 bg-white/8 p-3 text-xs leading-5 text-slate-300">{statusText}</div>}

      {settingsOpen && <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/8 p-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Copilot Settings</div>
        <label className="block text-[11px] font-black text-slate-400">Mode
          <select className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs text-white" value={settings.mode} onChange={(event) => setSettings({ ...settings, mode: event.target.value as CopilotSettings['mode'] })}>
            <option value="auto_fallback">AI-assisted + fallback</option>
            <option value="ai_assisted">AI-assisted only</option>
            <option value="deterministic_only">Deterministic only</option>
          </select>
        </label>
        <label className="block text-[11px] font-black text-slate-400">Provider
          <select className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs text-white" value={settings.providerId} onChange={(event) => {
            const providerId = event.target.value as CopilotProviderId;
            const provider = copilotProviders.find((item) => item.id === providerId)!;
            setSettings({ ...settings, providerId, model: provider.defaultModel, endpoint: provider.defaultEndpoint || settings.endpoint });
          }}>
            {copilotProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-black text-slate-400">Model
          <input className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs text-white" value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} />
        </label>
        {activeProvider.id === 'openai_compatible' && <label className="block text-[11px] font-black text-slate-400">Endpoint
          <input className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs text-white" value={settings.endpoint} onChange={(event) => setSettings({ ...settings, endpoint: event.target.value })} />
        </label>}
        {activeProvider.requiresApiKey && <div className="rounded-xl border border-white/10 bg-black/20 p-2">
          <div className="mb-1 text-[11px] font-black text-slate-400">API key {hasCopilotApiKey(activeProvider.id) ? 'saved locally' : 'not saved'}</div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-1">
            <input className="h-8 min-w-0 rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white" type="password" placeholder={hasCopilotApiKey(activeProvider.id) ? '•••••••• saved locally' : 'Paste key'} value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} />
            <button type="button" className="rounded-lg bg-[#ff8800] px-2 text-[10px] font-black text-white" onClick={() => { if (keyDraft.trim()) { saveCopilotApiKey(activeProvider.id, keyDraft.trim()); setKeyDraft(''); setStatusText('Copilot API key saved locally.'); } }}>Save</button>
            <button type="button" className="rounded-lg bg-white/10 px-2 text-[10px] font-black text-slate-200" onClick={() => { clearCopilotApiKey(activeProvider.id); setKeyDraft(''); setStatusText('Copilot API key cleared.'); }}>Clear</button>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Keys stay in browser localStorage and are never stored in Copilot history or exports.</p>
        </div>}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] font-black text-slate-400">Language
            <select className="mt-1 h-8 w-full rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white" value={settings.languagePreference} onChange={(event) => setSettings({ ...settings, languagePreference: event.target.value as CopilotSettings['languagePreference'] })}>
              <option value="auto">Auto</option>
              <option value="thai">Thai</option>
              <option value="english">English</option>
            </select>
          </label>
          <label className="block text-[11px] font-black text-slate-400">History
            <input className="mt-1 h-8 w-full rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white" type="number" min={2} max={20} value={settings.maxContextMessages} onChange={(event) => setSettings({ ...settings, maxContextMessages: Number(event.target.value) || 8 })} />
          </label>
        </div>
        <button type="button" className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-slate-200" onClick={() => { setThread(createEmptyCopilotThread(context.projectId, context.sceneId)); setPendingActions([]); setSelectedActionIds(new Set()); setStatusText('Copilot thread cleared locally.'); }}>Clear current thread</button>
      </div>}
    </div>

    <form className="border-t border-white/10 p-4" onSubmit={submit}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {quickPrompts.slice(0, 3).map((prompt) => <button key={prompt} type="button" className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-left text-[10px] font-black text-slate-300 transition hover:border-[#ff8800]/50 hover:text-white" onClick={() => setInput(prompt)}>{prompt.slice(0, 28)}...</button>)}
      </div>
      <textarea
        data-testid="visual-local-copilot-input"
        className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-[#ff8800]/70 focus:ring-2 focus:ring-[#ff8800]/20"
        placeholder="Ask in Thai or English: improve, preserve, review, attach reference..."
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      {attachedReference && <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-bold text-slate-300">
        <span className="truncate"><Paperclip className="mr-1 inline h-3 w-3" />{attachedReference.name}</span>
        <button type="button" className="text-slate-400 hover:text-white" onClick={() => setAttachedReference(undefined)}>Remove</button>
      </div>}
      <div className="mt-3 grid grid-cols-[auto_1fr_auto] gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReference} />
        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-300 transition hover:border-[#ff8800]/60 hover:text-white" onClick={() => fileRef.current?.click()} disabled={isReadingFile}>
          {isReadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
        <button type="button" className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-3 text-xs font-black text-slate-300 transition hover:border-[#ff8800]/60 hover:text-white" onClick={() => handleApply('selected')} disabled={!pendingActions.length || !selectedActionIds.size}>
          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />Apply Proposed
        </button>
        <button type="submit" className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#ff8800] px-4 text-xs font-black text-white shadow-[0_12px_28px_rgba(255,136,0,0.26)] transition hover:-translate-y-0.5 disabled:opacity-60" disabled={isInterpreting || (!input.trim() && !attachedReference)}>
          {isInterpreting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}{isInterpreting ? 'Reading' : 'Interpret'}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-slate-300" onClick={() => setExpandedHistory(!expandedHistory)}>
          {expandedHistory ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          {expandedHistory ? 'Hide conversation' : 'Show conversation'}
        </button>
        <button type="button" className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-slate-300" onClick={() => setSettingsOpen(!settingsOpen)}>
          {settingsOpen ? 'Hide settings' : 'Copilot settings'}
        </button>
      </div>
    </form>
  </section>;
}

function loadThread(projectId: string, sceneId: string): CopilotThreadState {
  const key = copilotStorageKey(projectId, sceneId);
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as CopilotThreadState;
  } catch {
    // Local-only conversation history is non-critical.
  }
  return createEmptyCopilotThread(projectId, sceneId);
}

function loadCopilotVisibilityState(fallback: CopilotVisibilityState = 'expanded'): CopilotVisibilityState {
  try {
    const stored = localStorage.getItem(COPILOT_UI_STATE_STORAGE_KEY);
    if (stored === 'expanded' || stored === 'minimized' || stored === 'hidden') return stored;
  } catch {
    // Non-critical UI preference.
  }
  return fallback;
}

function saveCopilotVisibilityState(value: CopilotVisibilityState) {
  try {
    localStorage.setItem(COPILOT_UI_STATE_STORAGE_KEY, value);
  } catch {
    // Non-critical UI preference.
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
