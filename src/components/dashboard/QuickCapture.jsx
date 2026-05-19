import { CalendarClock, ClipboardList, FileText, Image, NotebookPen, Plus, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

const supportedModes = new Set(['project', 'note']);
const stagedCopy = {
  deadline: 'Deadline capture is staged. Add the date inside a project timeline for now.',
  meeting: 'Meeting capture is staged. Keep the decision in a note for now.',
  reference: 'Reference capture is staged. Open Artwork Space to attach images to a board.',
  task: 'Task capture is staged. Add the next action inside the project for now.',
};

export function QuickCapture({ onAddNote, onAddProject, onOpenArtwork, onOpenProjects, onToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('task');
  const [content, setContent] = useState('');
  const modes = [
    { id: 'task', icon: ClipboardList, label: 'Task', placeholder: 'What needs to move today?', staged: 'coming soon' },
    { id: 'project', icon: Plus, label: 'Project', placeholder: 'Create a project shell, then refine it in Projects.' },
    { id: 'note', icon: NotebookPen, label: 'Note', placeholder: 'Capture studio context. This saves to Journal as an idea.' },
    { id: 'meeting', icon: CalendarClock, label: 'Meeting', placeholder: 'Who, when, and what decision is needed?', staged: 'draft only' },
    { id: 'reference', icon: Image, label: 'Reference', placeholder: 'Add a reference note or open the artwork board.', staged: 'open board' },
    { id: 'deadline', icon: FileText, label: 'Deadline', placeholder: 'Project, date, and consequence...', staged: 'coming soon' },
  ];
  const currentMode = modes.find((mode) => mode.id === activeMode) || modes[0];
  const isSupported = supportedModes.has(activeMode);

  const handleSave = () => {
    if (activeMode === 'project') {
      onAddProject?.();
      onOpenProjects?.();
      setIsOpen(false);
      setContent('');
      return;
    }

    if (activeMode === 'note') {
      if (!content.trim()) {
        return;
      }
      onAddNote?.(content.trim());
      setIsOpen(false);
      setContent('');
      return;
    }

    onToast?.(stagedCopy[activeMode] || 'This quick action is staged and has not been saved yet.', 'info');
    if (activeMode === 'reference') {
      onOpenArtwork?.();
      setIsOpen(false);
      setContent('');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-12 right-12 z-[200] flex h-16 w-16 items-center justify-center rounded-full bg-studio-ink text-white shadow-deep transition-all duration-500 hover:scale-110 hover:shadow-glow active:scale-95"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
      <div
        className="absolute inset-0 bg-black/5"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[40px] border border-white/40 bg-white/60 p-8 shadow-deep backdrop-blur-3xl animate-in fade-in zoom-in duration-500">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-studio-orange/10 text-studio-orange">
              <Sparkles size={14} strokeWidth={2} />
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-studio-ink">Quick Capture</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full text-studio-muted transition hover:bg-black/5 hover:text-studio-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="mb-8 flex gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`flex flex-1 flex-col items-center gap-2 rounded-2xl py-4 transition-all duration-300 ${
                  isActive
                    ? 'bg-studio-ink text-white shadow-md'
                    : 'bg-black/[0.03] text-studio-muted hover:bg-black/[0.06]'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{mode.label}</span>
                {mode.staged && <span className="text-[8px] font-bold uppercase tracking-wider opacity-60">{mode.staged}</span>}
              </button>
            );
          })}
        </div>

        <div className="relative">
          {activeMode === 'project' ? (
            <div className="space-y-5 py-3">
              <p className="text-lg font-medium text-studio-ink">
                {currentMode.placeholder}
              </p>
              <p className="type-caption">
                This creates a new operational project and opens the project queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {!isSupported && (
                <p className="type-caption border-l border-black/[0.12] pl-3 text-studio-muted">
                  {stagedCopy[activeMode]} Nothing will be saved from this mode yet.
                </p>
              )}
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!isSupported}
                placeholder={isSupported ? currentMode.placeholder : 'Capture disabled until this workflow has real persistence.'}
                className="w-full border-none bg-transparent p-0 text-xl font-medium leading-relaxed text-studio-ink placeholder:text-black/10 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-45"
                rows={4}
              />
            </div>
          )}
        </div>

        <footer className="mt-10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={(activeMode === 'note' && !content.trim()) || (!isSupported && activeMode !== 'reference')}
            className="group flex items-center gap-3 rounded-full bg-studio-ink px-8 py-4 text-[11px] font-bold uppercase  text-white shadow-glow transition-all duration-500 hover:scale-105 disabled:opacity-20 disabled:grayscale"
          >
            <span>{activeMode === 'project' ? 'Create Project' : activeMode === 'note' ? 'Save Note' : activeMode === 'reference' ? 'Open Board' : 'Coming Soon'}</span>
            <Send size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        </footer>
      </div>
    </div>
  );
}
