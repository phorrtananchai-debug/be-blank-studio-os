import { Mic, Camera, FileText, Plus, X, Sparkles, Send, Layers } from 'lucide-react';
import { useState } from 'react';

export function QuickCapture({ onOpenArtwork }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('note'); // note, inspiration, voice, photo
  const [content, setContent] = useState('');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 z-[200] flex h-11 w-11 items-center justify-center rounded-md border border-black/[0.12] bg-studio-bone/70 text-studio-ink backdrop-blur-sm transition-all duration-300 hover:bg-studio-bone active:scale-[0.98]"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
      <div
        className="absolute inset-0 bg-black/5"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-lg border border-black/[0.08] bg-studio-bone/85 p-8 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center border border-black/[0.07] text-studio-muted">
              <Sparkles size={14} strokeWidth={2} />
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-studio-ink">Quick Capture</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="grid h-8 w-8 place-items-center text-studio-muted transition hover:bg-black/5 hover:text-studio-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="mb-8 flex gap-2">
          {[
            { id: 'note', icon: FileText, label: 'Note' },
            { id: 'inspiration', icon: Sparkles, label: 'Inspiration' },
            { id: 'artwork', icon: Layers, label: 'Space' },
            { id: 'voice', icon: Mic, label: 'Voice' },
            { id: 'photo', icon: Camera, label: 'Photo' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`flex flex-1 flex-col items-center gap-2 rounded-md border py-4 transition-all duration-300 ${
                  isActive
                    ? 'border-studio-ink bg-studio-ink text-white'
                    : 'border-black/[0.06] bg-transparent text-studio-muted hover:bg-black/[0.035]'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{mode.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          {activeMode === 'note' || activeMode === 'inspiration' ? (
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={activeMode === 'note' ? "Capture a fleeting thought..." : "What inspired you?"}
              className="w-full border-none bg-transparent p-0 text-xl font-medium leading-relaxed text-studio-ink placeholder:text-black/10 focus:ring-0"
              rows={4}
            />
          ) : activeMode === 'artwork' ? (
            <div className="space-y-6 py-4 text-center">
              <p className="text-lg font-medium text-studio-ink">Start a new spatial board?</p>
              <button
                onClick={() => {
                  onOpenArtwork?.();
                  setIsOpen(false);
                }}
                className="rounded-md bg-studio-ink px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-studio-inkLight"
              >
                Create Artwork Space
              </button>
            </div>
          ) : (
            <div className="grid h-32 place-items-center rounded-md border border-dashed border-black/[0.08] bg-studio-bone/30">
              <p className="text-[10px] font-bold uppercase  text-studio-muted/40 italic">
                {activeMode === 'voice' ? 'Recording placeholder' : 'Camera stream placeholder'}
              </p>
            </div>
          )}
        </div>

        <footer className="mt-10 flex justify-end">
          <button
            onClick={() => {
              // In a real app, this would save the content
              setIsOpen(false);
              setContent('');
            }}
            disabled={!content && activeMode !== 'voice' && activeMode !== 'photo'}
            className="group flex items-center gap-3 rounded-md bg-studio-ink px-6 py-3 text-[11px] font-bold uppercase text-white transition-all duration-300 hover:bg-studio-inkLight disabled:opacity-20 disabled:grayscale"
          >
            <span>Save Entry</span>
            <Send size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        </footer>
      </div>
    </div>
  );
}
