import {
  ExternalLink,
  Download,
  Image,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../Button.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';

function UploadControl({ accept = 'image/*', children, multiple = false, onChange }) {
  return (
    <label className="type-control inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-studio-bone/45 px-4 text-studio-muted transition hover:border-studio-ink/20 hover:text-studio-ink">
      <Upload size={14} />
      {children}
      <input
        accept={accept}
        className="sr-only"
        multiple={multiple}
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          onChange(multiple ? files : files[0]);
          event.target.value = '';
        }}
      />
    </label>
  );
}

export function PortfolioManager({
  lastAddedPortfolioId,
  onAdd,
  onDelete,
  onExport,
  onOpenHomepageEditor,
  onUpdate,
  onUploadImage,
  portfolioItems,
}) {
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
      {lastAddedPortfolioId && (
        <div className="mb-8 flex flex-col gap-4 rounded-md border border-black/[0.07] bg-studio-bone/45 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="type-label flex items-center gap-2 text-studio-muted"><span className="studio-signal-dot" data-tone="risk" />New archive item placed</p>
            <p className="type-caption mt-2">Adjust layout visually on the public homepage editor when the content is ready.</p>
          </div>
          <Button variant="secondary" onClick={() => onOpenHomepageEditor?.(lastAddedPortfolioId)}>
            <ExternalLink size={14} />
            Open homepage editor
          </Button>
        </div>
      )}
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
              <div className="grid gap-4 rounded-md border border-black/[0.06] bg-studio-bone/35 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="type-label">Image Uploads</p>
                    <p className="type-caption mt-1">Stored in Firebase Storage when configured. URL fields remain available.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <UploadControl onChange={(file) => file && onUploadImage?.(item.id, file, 'cover')}>
                      Upload cover
                    </UploadControl>
                    <UploadControl multiple onChange={(files) => files?.forEach((file) => onUploadImage?.(item.id, file, 'gallery'))}>
                      Upload gallery
                    </UploadControl>
                  </div>
                </div>
                {Array.isArray(item.galleryImages) && item.galleryImages.length > 0 && (
                  <div className="grid gap-2 border-t border-black/[0.05] pt-4">
                    {item.galleryImages.map((image, index) => (
                      <p key={`${image.path || image.url}-${index}`} className="type-caption truncate">
                        {String(index + 1).padStart(2, '0')} / {image.caption || image.alt || image.path || image.url}
                      </p>
                    ))}
                  </div>
                )}
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

              <details className="mt-4 border-t border-black/[0.05] pt-6">
                <summary className="type-control cursor-pointer text-studio-muted transition hover:text-studio-ink">Advanced Layout Settings</summary>
                <p className="type-caption mt-2">Usually handled visually in homepage edit mode.</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-5">
                  <Field label="X %" value={item.x || ''} onChange={(value) => onUpdate(item.id, { x: value })} />
                  <Field label="Y %" value={item.y || ''} onChange={(value) => onUpdate(item.id, { y: value })} />
                  <Field label="Width %" value={item.width || ''} onChange={(value) => onUpdate(item.id, { width: value })} />
                  <Field label="Height %" value={item.height || ''} onChange={(value) => onUpdate(item.id, { height: value })} />
                  <Field label="Z index" value={item.zIndex || ''} onChange={(value) => onUpdate(item.id, { zIndex: value })} />
                </div>
                <div className="mt-5">
                  <Button variant="secondary" onClick={() => onOpenHomepageEditor?.(item.id)}>
                    <ExternalLink size={14} />
                    Adjust layout on homepage
                  </Button>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
