import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Clock,
  Target,
  Image as ImageIcon,
  StickyNote,
  ArrowUpRight
} from 'lucide-react';
import { formatDate } from '../../utils/dashboard.js';

export function DailyFlow({ projects = [] }) {
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [focus, setFocus] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activePhases = projects
    .filter(p => p.status === 'in-progress' || p.status === 'concept')
    .slice(0, 3);

  const upcomingDeadlines = projects
    .filter(p => p.openingDate)
    .sort((a, b) => new Date(a.openingDate) - new Date(b.openingDate))
    .slice(0, 3);

  const hour = time.getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const Icon = hour < 18 ? Sun : Moon;

  return (
    <div className="space-y-16 page-fade">
      {/* Functional Header */}
      <section className="border-b border-black/[0.08] pb-8">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-studio-muted">
              <Icon size={12} strokeWidth={2.5} />
              {greeting} / {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-studio-ink">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h2>
          </div>

          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-studio-muted">Studio Capacity</p>
              <p className="text-sm font-bold">Optimal Focus</p>
            </div>
            <div className="h-6 w-px bg-black/[0.08]" />
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-studio-muted">Active Pulse</p>
              <p className="text-sm font-bold">{activePhases.length} Projects</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-16">

          {/* Daily Focus */}
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">Primary Focus</h3>
              <Target size={12} className="text-studio-ink" />
            </header>
            <div className="group relative">
              <textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Today's core objective..."
                className="w-full bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-black/[0.1] resize-none overflow-hidden h-auto py-1"
                rows={1}
              />
              <div className="absolute -bottom-1 left-0 h-px w-full bg-black/[0.08] transition-colors group-focus-within:bg-studio-ink" />
            </div>
          </section>

          {/* Active Phases & Deadlines */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-studio-muted">Studio Phases</h3>
              <div className="space-y-6">
                {activePhases.map((project) => (
                  <div key={project.id} className="group flex items-start justify-between border-b border-black/[0.05] pb-4 transition-colors hover:border-black/10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-studio-orange">{project.status}</p>
                      <h4 className="text-lg font-semibold tracking-tight text-studio-ink">{project.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-studio-muted">Progress</p>
                      <p className="text-sm font-semibold">{Math.floor(Math.random() * 40) + 60}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-studio-muted">Deliverables</h3>
              <div className="space-y-4">
                {upcomingDeadlines.map((project) => (
                  <div key={project.id} className="flex items-center gap-4 rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-studio-bone">
                      <Clock size={16} strokeWidth={2} className="text-studio-muted" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[13px] font-bold uppercase tracking-wide text-studio-ink">{project.name}</h4>
                      <p className="text-xs font-medium text-studio-muted">{formatDate(project.openingDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Inspiration Strip */}
          <section className="space-y-8">
            <header className="flex items-center justify-between border-b border-black/[0.05] pb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-studio-muted">Reference & Atmosphere</h3>
              <ImageIcon size={14} className="text-studio-muted" />
            </header>
            <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="relative aspect-[4/5] min-w-[280px] overflow-hidden rounded-sm bg-studio-stone/20 transition-transform hover:scale-[1.02] duration-700">
                   <img
                    src={`https://images.unsplash.com/photo-${1600585154340 + i}-be6161a20a61?auto=format&fit=crop&q=80&w=800`}
                    alt="Atmosphere"
                    className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-12">
          {/* Quick Notes */}
          <section className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-studio">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote size={12} className="text-studio-ink" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">Scratchpad</h3>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transient thoughts..."
              className="min-h-[240px] w-full bg-transparent text-xs font-medium leading-relaxed text-studio-ink outline-none placeholder:text-studio-muted/40"
            />
          </section>

          {/* Timeline Progression */}
          <section className="space-y-6">
             <h3 className="text-[11px] font-bold uppercase tracking-wider text-studio-muted">Q2 Progression</h3>
             <div className="space-y-3">
                <div className="h-1.5 w-full bg-black/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-studio-ink w-2/3 rounded-full" />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-studio-muted">
                  <span>April</span>
                  <span>June</span>
                </div>
             </div>
          </section>

          {/* Action Callouts */}
          <section className="space-y-3">
            <button className="group flex w-full items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-5 transition-all hover:bg-black/[0.02] hover:shadow-sm">
              <span className="text-[13px] font-bold uppercase tracking-wide">Review Journal</span>
              <ArrowUpRight size={14} className="text-studio-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button className="group flex w-full items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-5 transition-all hover:bg-black/[0.02] hover:shadow-sm">
              <span className="text-[13px] font-bold uppercase tracking-wide">Archive Session</span>
              <ArrowUpRight size={14} className="text-studio-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
