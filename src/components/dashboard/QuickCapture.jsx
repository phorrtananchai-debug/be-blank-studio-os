import { CalendarClock, ClipboardList, FileText, Image, NotebookPen, Plus, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export function QuickCapture({ onAddProject, onOpenArtwork, onOpenProjects }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('task');
  const [content, setContent] = useState('');
  const modes = [
    { id: 'task', icon: ClipboardList, label: 'Task', placeholder: 'What needs to move today?' },
    { id: 'project', icon: Plus, label: 'Project', placeholder: 'Create a project shell, then refine it in Projects.' },
    { id: 'note', icon: NotebookPen, label: 'Note', placeholder: 'Capture studio context...' },
    { id: 'meeting', icon: CalendarClock, label: 'Meeting', placeholder: 'Who, when, and what decision is needed?' },
    { id: 'reference', icon: Image, label: 'Reference', placeholder: 'Add a reference note or open the artwork board.' },
    { id: 'deadline', icon: FileText, label: 'Deadline', placeholder: 'Project, date, and consequence...' },
  ];
  const currentMode = modes.find((mode) => mode.id === activeMode) || modes[0];

  const handleSave = () => {
    if (activeMode === 'project') {
      onAddProject?.();
      onOpenProjects?.();
    }

    if (activeMode === 'reference') {
      onOpenArtwork?.();
    }

    setIsOpen(false);
    setContent('');
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
              </button>
            );
          })}
        </div>

        <div className="relative">
          {activeMode === 'project' || activeMode === 'reference' ? (
            <div className="space-y-5 py-3">
              <p className="text-lg font-medium text-studio-ink">
                {currentMode.placeholder}
              </p>
              <p className="type-caption">
                {activeMode === 'project'
                  ? 'This creates a new operational project and opens the project queue.'
                  : 'Reference captures continue inside Artwork Space so visual material stays attached to a board.'}
              </p>
            </div>
          ) : (
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={currentMode.placeholder}
              className="w-full border-none bg-transparent p-0 text-xl font-medium leading-relaxed text-studio-ink placeholder:text-black/10 focus:ring-0"
              rows={4}
            />
          )}
        </div>

        <footer className="mt-10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!content && activeMode !== 'project' && activeMode !== 'reference'}
            className="group flex items-center gap-3 rounded-full bg-studio-ink px-8 py-4 text-[11px] font-bold uppercase  text-white shadow-glow transition-all duration-500 hover:scale-105 disabled:opacity-20 disabled:grayscale"
          >
            <span>{activeMode === 'project' ? 'Create Project' : activeMode === 'reference' ? 'Open Board' : 'Save Command'}</span>
            <Send size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        </footer>
      </div>
    </div>
  );
}
