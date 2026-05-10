import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Clock,
  Target,
  Flame,
  Image as ImageIcon,
  ChevronRight,
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
    <div className="space-y-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Cinematic Header */}
      <section className="relative overflow-hidden py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-black/[0.03] pb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-cinema text-studio-orange">
              <Icon size={14} strokeWidth={2} />
              {greeting} in the Studio
            </div>
            <h2 className="font-serif text-7xl md:text-9xl font-light tracking-tightest leading-[0.8] text-studio-ink">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h2>
            <p className="text-2xl font-light tracking-tight text-studio-muted">
              {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-8 text-right">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-muted">Studio Capacity</p>
              <p className="font-serif text-3xl font-light italic">Refined Focus</p>
            </div>
            <div className="h-16 w-px bg-black/[0.05]" />
            <div className="space-y-1 text-left">
              <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-muted">Project Pulse</p>
              <p className="font-serif text-3xl font-light">{activePhases.length} Active</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-32">

          {/* Daily Focus */}
          <section className="space-y-12">
            <header className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted">Primary Focus</h3>
              <Target size={14} className="text-studio-orange" />
            </header>
            <div className="group relative">
              <textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="What is the singular goal for today?"
                className="w-full bg-transparent font-serif text-4xl md:text-6xl font-light italic tracking-tightest outline-none placeholder:text-black/[0.05] resize-none overflow-hidden h-auto py-4"
                rows={2}
              />
              <div className="absolute -bottom-2 left-0 h-px w-full bg-black/[0.03] transition-colors group-focus-within:bg-studio-orange/30" />
            </div>
          </section>

          {/* Active Phases & Deadlines */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-24">
            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted">Studio Phases</h3>
              <div className="space-y-8">
                {activePhases.map((project, idx) => (
                  <div key={project.id} className="group flex items-start justify-between border-b border-black/[0.02] pb-6">
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-orange">{project.status}</p>
                      <h4 className="text-xl font-medium tracking-tight text-studio-ink">{project.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-muted">Progress</p>
                      <p className="text-sm font-medium">{Math.floor(Math.random() * 40) + 60}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-12">
              <h3 className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted">Deliverables</h3>
              <div className="space-y-8">
                {upcomingDeadlines.map((project, idx) => (
                  <div key={project.id} className="flex items-center gap-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-black/[0.03] shadow-sm">
                      <Clock size={16} strokeWidth={1.5} className="text-studio-muted" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold uppercase tracking-editorial text-studio-ink">{project.name}</h4>
                      <p className="text-xs text-studio-muted">{formatDate(project.openingDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Inspiration Strip */}
          <section className="space-y-12">
            <header className="flex items-center justify-between border-b border-black/[0.03] pb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted">Reference & Atmosphere</h3>
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
        <aside className="lg:col-span-4 space-y-24">
          {/* Quick Notes */}
          <section className="rounded-3xl border border-black/[0.03] bg-white p-10 shadow-premium paper-layer">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StickyNote size={14} className="text-studio-orange" />
                <h3 className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted">Scratchpad</h3>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transient thoughts and studio notes..."
              className="min-h-[300px] w-full bg-transparent text-sm leading-relaxed text-studio-ink outline-none placeholder:text-studio-muted/30"
            />
          </section>

          {/* Timeline Progression */}
          <section className="space-y-8">
             <h3 className="text-[10px] font-bold uppercase tracking-cinema text-studio-muted">Q2 Progression</h3>
             <div className="space-y-4">
                <div className="h-1 w-full bg-black/[0.03] rounded-full overflow-hidden">
                  <div className="h-full bg-studio-ink w-2/3" />
                </div>
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-cinema text-studio-muted">
                  <span>April</span>
                  <span>June</span>
                </div>
             </div>
          </section>

          {/* Action Callouts */}
          <section className="space-y-6">
            <button className="group flex w-full items-center justify-between rounded-xl border border-black/[0.03] p-6 transition-all hover:bg-studio-ink hover:text-white hover:shadow-deep">
              <span className="text-xs font-bold uppercase tracking-editorial">Review Journal</span>
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
            <button className="group flex w-full items-center justify-between rounded-xl border border-black/[0.03] p-6 transition-all hover:bg-studio-ink hover:text-white hover:shadow-deep">
              <span className="text-xs font-bold uppercase tracking-editorial">Archive Session</span>
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
