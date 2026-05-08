import { Mic, Camera, FileText, Plus, X, Sparkles, Send } from 'lucide-react';
import { useState } from 'react';

export function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('note'); // note, inspiration, voice, photo
  const [content, setContent] = useState('');

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
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-studio-orange/10 text-studio-orange">
              <Sparkles size={14} strokeWidth={2} />
            </div>
            <h2 className="text-[10px] font-bold uppercase tracking-cinema text-studio-ink">Quick Capture</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full text-studio-muted transition hover:bg-black/5 hover:text-studio-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="mb-10 flex gap-2">
          {[
            { id: 'note', icon: FileText, label: 'Note' },
            { id: 'inspiration', icon: Sparkles, label: 'Inspiration' },
            { id: 'voice', icon: Mic, label: 'Voice' },
            { id: 'photo', icon: Camera, label: 'Photo' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`flex flex-1 flex-col items-center gap-3 rounded-3xl py-6 transition-all duration-500 ${
                  isActive
                    ? 'bg-studio-ink text-white shadow-premium'
                    : 'bg-black/[0.02] text-studio-muted hover:bg-black/[0.05]'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{mode.label}</span>
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
              className="w-full border-none bg-transparent p-0 font-serif text-2xl font-light leading-relaxed text-studio-ink placeholder:text-black/10 focus:ring-0"
              rows={4}
            />
          ) : (
            <div className="grid h-32 place-items-center rounded-3xl border-2 border-dashed border-black/5 bg-black/[0.01]">
              <p className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted/40 italic">
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
            className="group flex items-center gap-3 rounded-full bg-studio-ink px-8 py-4 text-[11px] font-bold uppercase tracking-editorial text-white shadow-glow transition-all duration-500 hover:scale-105 disabled:opacity-20 disabled:grayscale"
          >
            <span>Save Entry</span>
            <Send size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        </footer>
      </div>
    </div>
  );
}
