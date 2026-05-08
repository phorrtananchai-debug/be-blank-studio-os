import {
  Download,
  Image,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../Button.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';

export function PortfolioManager({ portfolioItems, onAdd, onDelete, onExport, onUpdate }) {
  return (
    <SectionCard
      action={
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onExport}>
            <Download size={16} />
            Export JSON
          </Button>
          <Button onClick={onAdd}>
            <Plus size={16} />
            New Item
          </Button>
        </div>
      }
      eyebrow="Portfolio Asset Manager"
      title="Selected Studio Works"
    >
      <div className="grid gap-10 lg:grid-cols-2">
        {portfolioItems.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-black/[0.05] bg-white shadow-sm transition-all duration-300 hover:shadow-glow">
            <div className="aspect-[16/9] bg-studio-ink/5 relative group">
              {item.imageUrl ? (
                <img alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={item.imageUrl} />
              ) : (
                <div className="grid h-full place-items-center text-studio-muted/30">
                  <Image size={48} strokeWidth={1} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
            </div>
            <div className="grid gap-8 p-8">
              <div className="flex items-start gap-6">
                <Field
                  label="Project title"
                  value={item.title}
                  wrapperClassName="flex-1"
                  onChange={(value) => onUpdate(item.id, { title: value })}
                />
                <button
                  aria-label="Delete portfolio item"
                  className="mt-8 grid size-10 place-items-center rounded-full border border-black/[0.05] text-studio-muted/30 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  type="button"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label="Category"
                  value={item.category}
                  onChange={(value) => onUpdate(item.id, { category: value })}
                />
                <Field label="Location" value={item.location || ''} onChange={(value) => onUpdate(item.id, { location: value })} />
                <Field label="Client" value={item.client || ''} onChange={(value) => onUpdate(item.id, { client: value })} />
                <Field label="Year" value={item.year || ''} onChange={(value) => onUpdate(item.id, { year: value })} />
                <Field label="Area / sqm" value={item.areaSqm || ''} onChange={(value) => onUpdate(item.id, { areaSqm: value })} />
                <Field label="Cover image URL" value={item.imageUrl || ''} onChange={(value) => onUpdate(item.id, { imageUrl: value })} />
              </div>
              <Field label="Subtitle" value={item.subtitle || ''} onChange={(value) => onUpdate(item.id, { subtitle: value })} />
              <Field
                label="Gallery image URLs"
                multiline
                value={item.galleryUrls || ''}
                onChange={(value) => onUpdate(item.id, { galleryUrls: value })}
              />
              <Field
                label="Description"
                multiline
                value={item.description}
                onChange={(value) => onUpdate(item.id, { description: value })}
              />
              <Field
                label="Design story / concept"
                multiline
                value={item.concept || ''}
                onChange={(value) => onUpdate(item.id, { concept: value })}
              />
              <Field label="Credits" value={item.credits || ''} onChange={(value) => onUpdate(item.id, { credits: value })} />
              <Field label="Tags" value={item.tags} onChange={(value) => onUpdate(item.id, { tags: value })} />

              <div className="mt-4 border-t border-black/[0.05] pt-8">
                <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.25em] text-studio-orange">Homepage Canvas Configuration</p>
                <div className="grid gap-6 sm:grid-cols-5">
                  <Field label="X %" value={item.x || ''} onChange={(value) => onUpdate(item.id, { x: value })} />
                  <Field label="Y %" value={item.y || ''} onChange={(value) => onUpdate(item.id, { y: value })} />
                  <Field label="Width %" value={item.width || ''} onChange={(value) => onUpdate(item.id, { width: value })} />
                  <Field label="Height %" value={item.height || ''} onChange={(value) => onUpdate(item.id, { height: value })} />
                  <Field label="Z index" value={item.zIndex || ''} onChange={(value) => onUpdate(item.id, { zIndex: value })} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
