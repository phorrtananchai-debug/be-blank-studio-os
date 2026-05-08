import {
  ClipboardCopy,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';
import { StatusSelect } from '../StatusSelect.jsx';
import { platforms, contentStatuses } from '../../data/seed.js';

export function ContentPlanner({ contentItems, copiedId, onAdd, onCopy, onDelete, onUpdate }) {
  return (
    <SectionCard
      action={
        <Button onClick={onAdd}>
          <Plus size={16} />
          New Post
        </Button>
      }
      eyebrow="Content Strategy"
      title="Studio Publishing Queue"
    >
      <div className="grid gap-10">
        {contentItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-black/[0.05] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-glow lg:p-8">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <Field
                label="Post title"
                value={item.title}
                wrapperClassName="lg:flex-1"
                onChange={(value) => onUpdate(item.id, { title: value })}
              />
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <Button variant="secondary" onClick={() => onCopy(item)}>
                  <ClipboardCopy size={16} />
                  {copiedId === item.id ? 'Copied' : 'Copy Caption'}
                </Button>
                <button
                  aria-label="Delete post"
                  className="grid size-10 place-items-center rounded-full border border-black/[0.05] text-studio-muted/30 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  type="button"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="mb-8 flex flex-wrap gap-3">
              <Badge tone={item.status}>{item.status}</Badge>
              <Badge tone="default">{item.platform}</Badge>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <StatusSelect
                label="Target Platform"
                options={platforms}
                value={item.platform}
                onChange={(value) => onUpdate(item.id, { platform: value })}
              />
              <StatusSelect
                label="Editorial Status"
                options={contentStatuses}
                value={item.status}
                onChange={(value) => onUpdate(item.id, { status: value })}
              />
              <Field
                label="Caption TH"
                multiline
                value={item.captionTH}
                onChange={(value) => onUpdate(item.id, { captionTH: value })}
              />
              <Field
                label="Caption EN"
                multiline
                value={item.captionEN}
                onChange={(value) => onUpdate(item.id, { captionEN: value })}
              />
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
