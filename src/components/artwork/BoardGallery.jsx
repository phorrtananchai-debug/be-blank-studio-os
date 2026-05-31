import { Layers, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../Badge.jsx';
import { useOverlayContract } from '../../overlays/useOverlayContract.js';

export function BoardGallery({ projects, onSelect }) {
  const [search, setSearch] = useState('');
  const { openOverlay, overlayKinds } = useOverlayContract();

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-studio-ink">Studio Spaces</h2>
          <p className="mt-2 text-studio-muted">Select a project design surface to begin spatial thinking.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-studio-muted" />
          <input
            type="text"
            placeholder="Filter projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-black/5 rounded-full pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-studio-ink/10"
          />
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((project) => (
          <button
            key={project.id}
            onClick={() => openOverlay(overlayKinds.ARTWORK_PREVIEW_MODAL, {
              artwork: {
                client: project.client || '',
                name: project.name,
                projectName: project.name,
                title: `${project.name} board`,
              },
              confirmLabel: 'Open Space',
              description: 'Preview studio board context before opening the full artwork surface.',
              onConfirm: () => onSelect(project.id),
              title: 'Artwork Preview',
            })}
            className="group relative flex flex-col text-left rounded-2xl border border-black/[0.05] bg-white overflow-hidden shadow-studioSoft hover:shadow-studio hover:border-black/10 transition-all"
          >
            {/* Thumbnail Placeholder */}
            <div className="aspect-[16/10] bg-studio-stone/20 relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                  <Layers size={48} strokeWidth={1} />
               </div>
               <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-studio-ink group-hover:text-studio-orange transition-colors truncate">
                  {project.name}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted truncate">
                  {project.client || 'Internal'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/[0.03]">
                 <Badge tone={project.status}>{project.status}</Badge>
                 <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-studio-muted">
                    Open Space
                    <ChevronRight size={10} />
                 </div>
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
           <div className="col-span-full py-24 text-center border-2 border-dashed border-black/[0.05] rounded-[32px]">
              <p className="text-sm font-medium text-studio-muted">No projects match your search.</p>
           </div>
        )}
      </div>
    </div>
  );
}
