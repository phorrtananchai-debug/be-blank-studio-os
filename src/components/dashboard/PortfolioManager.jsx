import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Download,
  Eye,
  Image,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../Button.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';
import { createImageRecordDefaults, getImageFocusStyle, resolvePortfolioImageUrl } from '../../utils/portfolioImages.js';

function normalizeImageRecord(image, fallbackAlt = '') {
  if (!image) return null;
  if (typeof image === 'string') {
    return createImageRecordDefaults({ alt: fallbackAlt, caption: '', fullUrl: image, mediumUrl: image, thumbnailUrl: image, url: image });
  }

  const url = resolvePortfolioImageUrl(image);
  if (!url) return null;

  return createImageRecordDefaults({
    alt: image.alt || fallbackAlt,
    aspectIntent: image.aspectIntent,
    blurhash: image.blurhash || '',
    caption: image.caption || '',
    cropMode: image.cropMode,
    cropNotes: image.cropNotes || '',
    focusX: image.focusX,
    focusY: image.focusY,
    fullUrl: image.fullUrl || url,
    height: image.height || null,
    mediumUrl: image.mediumUrl || image.fullUrl || url,
    order: image.order,
    orientation: image.orientation || '',
    path: image.path || image.fullPath || '',
    placeholder: image.placeholder || '',
    relationship: image.relationship || '',
    thumbnailUrl: image.thumbnailUrl || image.mediumUrl || image.fullUrl || url,
    url,
    width: image.width || null,
  });
}

function getCoverImage(item) {
  return normalizeImageRecord(item.coverImage, item.title) || normalizeImageRecord(item.imageUrl, item.title);
}

function getGalleryImages(item) {
  return Array.isArray(item.galleryImages)
    ? item.galleryImages
      .map((image, index) => ({ ...normalizeImageRecord(image, item.title), originalIndex: index }))
      .filter((image) => image?.url)
      .sort((left, right) => (Number(left.order) || left.originalIndex) - (Number(right.order) || right.originalIndex))
    : [];
}

function getImageKey(image, index = 0) {
  return image?.path || image?.url || image?.fullUrl || `image-${index}`;
}

function formatMediaDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getOrientation(width, height) {
  if (!width || !height) return '';
  if (height > width * 1.12) return 'portrait';
  if (width > height * 1.12) return 'landscape';
  return 'square';
}

function withOrderedImages(images) {
  return images.map((image, index) => ({
    ...image,
    order: index,
    relationship: image.relationship || 'gallery',
  }));
}

function UploadControl({ accept = 'image/*', children, disabled = false, multiple = false, onChange }) {
  return (
    <label className={`type-control inline-flex min-h-10 items-center gap-2 rounded-md border border-black/[0.08] bg-studio-bone/45 px-4 text-studio-muted transition ${disabled ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-studio-ink/20 hover:text-studio-ink'}`}>
      <Upload size={14} />
      {children}
      <input
        accept={accept}
        className="sr-only"
        disabled={disabled}
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

function FocusPicker({ image, label, onChange }) {
  const focus = createImageRecordDefaults(image || {});
  const imageUrl = resolvePortfolioImageUrl(image, ['mediumUrl', 'thumbnailUrl', 'url', 'imageUrl', 'fullUrl']);
  const setFocus = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const focusX = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const focusY = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    onChange({ focusX: Math.min(100, Math.max(0, focusX)), focusY: Math.min(100, Math.max(0, focusY)) });
  };

  return (
    <div className="grid gap-3">
      <p className="type-label text-studio-muted">{label}</p>
      <button className="relative block overflow-hidden rounded-md border border-black/[0.07] bg-studio-bone/35" type="button" onClick={setFocus}>
        {imageUrl ? (
          <img
            alt={image?.alt || label}
            className="aspect-[16/10] w-full"
            loading="lazy"
            src={imageUrl}
            style={getImageFocusStyle(image)}
          />
        ) : (
          <span className="grid aspect-[16/10] w-full place-items-center text-studio-muted/35">
            <Image size={28} strokeWidth={1} />
          </span>
        )}
        <span
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-studio-orange shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
          style={{ left: `${focus.focusX}%`, top: `${focus.focusY}%` }}
        />
      </button>
      <div className="flex flex-wrap gap-2">
        <button className="type-control rounded-md border border-black/[0.08] px-3 py-2 text-studio-muted transition hover:text-studio-ink" type="button" onClick={() => onChange({ focusX: 50, focusY: 50 })}>
          Reset focus
        </button>
        <span className="type-caption self-center text-studio-muted">Focus point</span>
      </div>
      <details className="border-t border-black/[0.05] pt-3">
        <summary className="type-control cursor-pointer text-studio-muted transition hover:text-studio-ink">Advanced Framing</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="type-control mb-2 block text-studio-muted/60">Crop mode</span>
            <select className="type-field min-h-11 w-full rounded-md border border-black/[0.07] bg-studio-bone/55 px-4 py-3 text-[#111111] outline-none" value={focus.cropMode} onChange={(event) => onChange({ cropMode: event.target.value })}>
              {['cover', 'contain', 'natural'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="type-control mb-2 block text-studio-muted/60">Aspect intent</span>
            <select className="type-field min-h-11 w-full rounded-md border border-black/[0.07] bg-studio-bone/55 px-4 py-3 text-[#111111] outline-none" value={focus.aspectIntent} onChange={(event) => onChange({ aspectIntent: event.target.value })}>
              {['auto', 'portrait', 'landscape', 'square', 'wide'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2">
            <Field label="Crop notes" value={focus.cropNotes || ''} onChange={(value) => onChange({ cropNotes: value })} />
          </div>
        </div>
      </details>
    </div>
  );
}

function CoverPreview({ coverImage, isUploading, item, onFocusChange, onPreview, onRemove, onUploadImage }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="type-label">Cover Image Preview</p>
          <p className="type-caption mt-1">Primary archive image and social preview source.</p>
        </div>
        {coverImage && <span className="type-control rounded-full border border-black/[0.08] px-3 py-1 text-studio-muted">Cover</span>}
      </div>
      <div className="relative overflow-hidden rounded-md border border-black/[0.07] bg-studio-bone/35">
        <div className="aspect-[16/10]">
          {coverImage ? (
            <button className="group h-full w-full text-left" type="button" onClick={() => onPreview(coverImage)}>
              <img
                alt={coverImage.alt || item.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                loading="lazy"
                src={resolvePortfolioImageUrl(coverImage, ['mediumUrl', 'thumbnailUrl', 'url', 'imageUrl', 'fullUrl'])}
                style={getImageFocusStyle(coverImage)}
              />
            </button>
          ) : (
            <div className="grid h-full place-items-center text-studio-muted/35">
              <Image size={42} strokeWidth={1} />
            </div>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-black/[0.04]">
            <div className="h-full w-2/3 animate-pulse bg-studio-orange/80" />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <UploadControl disabled={isUploading} onChange={(file) => file && onUploadImage?.(item.id, file, 'cover')}>
          {coverImage ? 'Replace cover' : 'Upload cover'}
        </UploadControl>
        {coverImage && (
          <>
            <button className="type-control inline-flex min-h-10 items-center gap-2 rounded-md border border-black/[0.08] px-4 text-studio-muted transition hover:border-studio-ink/20 hover:text-studio-ink" type="button" onClick={() => onPreview(coverImage)}>
              <Eye size={14} />
              Preview
            </button>
            <button className="type-control inline-flex min-h-10 items-center gap-2 rounded-md border border-black/[0.08] px-4 text-studio-muted transition hover:border-studio-rust/30 hover:text-studio-rust" type="button" onClick={onRemove}>
              <Trash2 size={14} />
              Remove
            </button>
          </>
        )}
      </div>
      {coverImage && (
        <div className="mt-5">
          <FocusPicker image={coverImage} label="Cover focus" onChange={onFocusChange} />
        </div>
      )}
    </section>
  );
}

function GalleryImageCard({
  canMoveDown,
  canMoveUp,
  image,
  index,
  isCover,
  onDelete,
  onImageLoad,
  onMove,
  onPreview,
  onSetCover,
  onUpdate,
}) {
  const orientation = image.orientation || getOrientation(image.width, image.height) || 'pending';
  return (
    <article
      className={`studio-accent-left overflow-hidden rounded-md border border-black/[0.06] bg-studio-bone/32 ${orientation === 'portrait' ? 'md:row-span-2' : ''}`}
      data-tone={isCover ? 'risk' : 'neutral'}
    >
      <button className="group relative block w-full bg-studio-ink/[0.03]" type="button" onClick={() => onPreview(image)}>
        <img
          alt={image.alt || `Gallery image ${index + 1}`}
          className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${orientation === 'portrait' ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}
          loading="lazy"
          src={resolvePortfolioImageUrl(image, ['thumbnailUrl', 'mediumUrl', 'url', 'imageUrl', 'fullUrl'])}
          style={getImageFocusStyle(image)}
          onLoad={(event) => onImageLoad(index, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="type-control rounded-full bg-studio-paper/90 px-2 py-1 text-studio-muted">{String(index + 1).padStart(2, '0')}</span>
          {isCover && <span className="type-control rounded-full bg-studio-ink px-2 py-1 text-studio-paper">Cover</span>}
        </div>
      </button>
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="type-caption text-studio-muted">{orientation}</p>
          <div className="flex items-center gap-1">
            <IconButton disabled={!canMoveUp} label="Move image up" onClick={() => onMove(index, -1)}>
              <ArrowUp size={13} />
            </IconButton>
            <IconButton disabled={!canMoveDown} label="Move image down" onClick={() => onMove(index, 1)}>
              <ArrowDown size={13} />
            </IconButton>
            <IconButton label="Set as cover" onClick={() => onSetCover(image)}>
              <Star size={13} />
            </IconButton>
            <IconButton label="Remove image" tone="danger" onClick={() => onDelete(index)}>
              <Trash2 size={13} />
            </IconButton>
          </div>
        </div>
        <Field
          label="Caption"
          value={image.caption || ''}
          onChange={(value) => onUpdate(index, { caption: value })}
        />
        <Field
          label="Alt text"
          value={image.alt || ''}
          onChange={(value) => onUpdate(index, { alt: value })}
        />
        <FocusPicker image={image} label="Image focus" onChange={(updates) => onUpdate(index, updates)} />
      </div>
    </article>
  );
}

function IconButton({ children, disabled = false, label, onClick, tone = 'neutral' }) {
  return (
    <button
      aria-label={label}
      className={`grid size-8 place-items-center rounded-full border border-black/[0.07] text-studio-muted transition ${disabled ? 'cursor-not-allowed opacity-35' : tone === 'danger' ? 'hover:border-studio-rust/30 hover:text-studio-rust' : 'hover:border-studio-ink/20 hover:text-studio-ink'}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function GalleryManager({ galleryImages, isUploading, item, onPreview, onUpdate, onUploadImage }) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const commitGallery = (images) => onUpdate(item.id, { galleryImages: withOrderedImages(images) });
  const updateGalleryImage = (index, updates) => {
    const nextImages = galleryImages.map((image, imageIndex) => (imageIndex === index ? { ...image, ...updates } : image));
    commitGallery(nextImages);
  };
  const moveGalleryImage = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= galleryImages.length) return;
    const nextImages = [...galleryImages];
    const [image] = nextImages.splice(index, 1);
    nextImages.splice(nextIndex, 0, image);
    commitGallery(nextImages);
  };
  const deleteGalleryImage = (index) => {
    commitGallery(galleryImages.filter((_, imageIndex) => imageIndex !== index));
  };
  const setCover = (image) => {
    const url = resolvePortfolioImageUrl(image);
    onUpdate(item.id, {
      coverImage: { ...image, relationship: 'cover' },
      imageUrl: url,
    });
  };
  const recordDimensions = (index, width, height) => {
    const image = galleryImages[index];
    if (!image || (image.width && image.height && image.orientation)) return;
    updateGalleryImage(index, { height, orientation: getOrientation(width, height), width });
  };
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const nextImages = [...galleryImages];
    const [image] = nextImages.splice(draggedIndex, 1);
    nextImages.splice(index, 0, image);
    setDraggedIndex(null);
    commitGallery(nextImages);
  };

  return (
    <section className="border-t border-black/[0.06] pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="type-label">Uploaded Media</p>
          <p className="type-caption mt-1">Gallery order feeds the public project page and lightbox.</p>
        </div>
        <UploadControl disabled={isUploading} multiple onChange={(files) => files?.forEach((file) => onUploadImage?.(item.id, file, 'gallery'))}>
          {isUploading ? 'Uploading...' : 'Upload gallery'}
        </UploadControl>
      </div>

      {isUploading && (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((value) => (
            <div key={value} className="aspect-[4/3] animate-pulse rounded-md border border-black/[0.05] bg-studio-bone/55" />
          ))}
        </div>
      )}

      {galleryImages.length ? (
        <div className="grid auto-rows-auto gap-4 md:grid-cols-2 xl:grid-cols-3">
          {galleryImages.map((image, index) => (
            <div
              key={getImageKey(image, index)}
              draggable
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedIndex(index)}
              onDrop={() => handleDrop(index)}
            >
              <GalleryImageCard
                canMoveDown={index < galleryImages.length - 1}
                canMoveUp={index > 0}
                image={image}
                index={index}
                isCover={getImageKey(image, index) === getImageKey(getCoverImage(item))}
                onDelete={deleteGalleryImage}
                onImageLoad={recordDimensions}
                onMove={moveGalleryImage}
                onPreview={onPreview}
                onSetCover={setCover}
                onUpdate={updateGalleryImage}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center rounded-md border border-dashed border-black/[0.08] bg-studio-bone/30 text-center">
          <div>
            <Image className="mx-auto text-studio-muted/35" size={34} strokeWidth={1} />
            <p className="type-caption mt-3 text-studio-muted">No uploaded gallery images yet.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function MediaPreviewModal({ image, onClose }) {
  if (!image) return null;
  const imageUrl = image.previewUrl || resolvePortfolioImageUrl(image);

  return (
    <div className="fixed inset-0 z-[500] grid min-h-screen place-items-center bg-black p-6">
      <button
        aria-label="Close media preview"
        className="absolute right-5 top-5 z-20 grid size-10 place-items-center rounded-full border border-white/20 text-white/75 transition hover:text-white"
        type="button"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      {imageUrl ? (
        <img
          alt={image.alt || image.caption || 'Portfolio media preview'}
          className="relative z-10 block max-h-[88vh] max-w-[92vw] object-contain"
          src={imageUrl}
        />
      ) : (
        <div className="grid min-h-56 min-w-80 place-items-center rounded-md border border-white/15 text-center text-white/60">
          <div>
            <Image className="mx-auto text-white/35" size={36} strokeWidth={1} />
            <p className="type-caption mt-3 text-white/60">No valid image URL found.</p>
          </div>
        </div>
      )}
      {(image.caption || image.alt) && (
        <p className="type-caption absolute bottom-5 left-1/2 max-w-xl -translate-x-1/2 text-center text-white/70">
          {image.caption || image.alt}
        </p>
      )}
    </div>
  );
}

function PortfolioProjectIndex({ items, lastAddedPortfolioId, onManage }) {
  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const coverImage = getCoverImage(item);
        const galleryImages = getGalleryImages(item);
        const imageUrl = resolvePortfolioImageUrl(coverImage, ['thumbnailUrl', 'mediumUrl', 'url', 'imageUrl', 'fullUrl']) || item.imageUrl;
        const mediaCount = (coverImage ? 1 : 0) + galleryImages.length;
        const isNew = item.id === lastAddedPortfolioId;

        return (
          <article key={item.id} className="grid gap-4 border-t border-black/[0.06] py-5 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-center">
            <button className="relative aspect-[4/3] overflow-hidden rounded-md border border-black/[0.06] bg-studio-bone/45 text-studio-muted/35" type="button" onClick={() => onManage(item.id)}>
              {imageUrl ? (
                <img alt={item.title || 'Portfolio cover'} className="h-full w-full object-cover" loading="lazy" src={imageUrl} style={getImageFocusStyle(coverImage)} />
              ) : (
                <span className="grid h-full place-items-center"><Image size={26} strokeWidth={1} /></span>
              )}
              {isNew && <span className="absolute right-2 top-2 size-2 rounded-full bg-studio-orange" />}
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold tracking-normal text-studio-ink">{item.title || 'Untitled Project'}</h3>
                {coverImage && <span className="type-control rounded-full border border-black/[0.08] px-2 py-1 text-studio-muted">Cover ready</span>}
              </div>
              <p className="type-caption mt-2 text-studio-muted">
                {[item.category, item.location, item.year].filter(Boolean).join(' / ') || 'Portfolio item'}
              </p>
              <div className="type-control mt-3 flex flex-wrap gap-3 text-studio-muted/70">
                <span>{mediaCount} media</span>
                <span>{coverImage ? 'cover assigned' : 'no cover'}</span>
                <span>updated {formatMediaDate(item.updatedAt || item.createdAt)}</span>
              </div>
            </div>
            <Button variant="secondary" onClick={() => onManage(item.id)}>
              Manage Media
            </Button>
          </article>
        );
      })}
    </div>
  );
}

export function PortfolioManager({
  lastAddedPortfolioId,
  onAdd,
  onDelete,
  onExport,
  onOpenHomepageEditor,
  onToast,
  onUpdate,
  onUploadImage,
  portfolioItems,
}) {
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [uploadingKeys, setUploadingKeys] = useState({});
  const uploadMedia = async (itemId, file, relationship) => {
    const key = `${itemId}-${relationship}`;
    setUploadingKeys((items) => ({ ...items, [key]: true }));
    try {
      return await onUploadImage?.(itemId, file, relationship);
    } finally {
      setUploadingKeys((items) => ({ ...items, [key]: false }));
    }
  };
  const items = useMemo(() => portfolioItems || [], [portfolioItems]);
  const selectedItem = items.find((item) => item.id === selectedItemId) || null;
  const openPreview = (image) => {
    const previewUrl = resolvePortfolioImageUrl(image);
    if (!previewUrl) {
      onToast?.('No preview image available.', 'warning');
      return;
    }
    setPreviewImage({ ...image, previewUrl });
  };

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
      {!selectedItem ? (
        <PortfolioProjectIndex items={items} lastAddedPortfolioId={lastAddedPortfolioId} onManage={setSelectedItemId} />
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.06] pt-5">
            <button className="type-control inline-flex items-center gap-2 text-studio-muted transition hover:text-studio-ink" type="button" onClick={() => setSelectedItemId('')}>
              <ArrowLeft size={14} />
              Back to portfolio index
            </button>
            <Button variant="secondary" onClick={() => onOpenHomepageEditor?.(selectedItem.id)}>
              <ExternalLink size={14} />
              Adjust layout on homepage
            </Button>
          </div>
          {[selectedItem].map((item) => {
          const coverImage = getCoverImage(item);
          const galleryImages = getGalleryImages(item);
          const hasUploadedMedia = Boolean(item.coverImage || galleryImages.length);
          const isCoverUploading = Boolean(uploadingKeys[`${item.id}-cover`]);
          const isGalleryUploading = Boolean(uploadingKeys[`${item.id}-gallery`]);
          return (
            <article key={item.id} className="overflow-hidden rounded-lg border border-black/[0.06] bg-studio-bone/36">
              <div className="grid gap-8 p-7 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-6">
                  <CoverPreview
                    coverImage={coverImage}
                    isUploading={isCoverUploading}
                    item={item}
                    onFocusChange={(updates) => onUpdate(item.id, { coverImage: { ...coverImage, ...updates } })}
                    onPreview={openPreview}
                    onRemove={() => onUpdate(item.id, { coverImage: null, imageUrl: '' })}
                    onUploadImage={uploadMedia}
                  />
                  <div className="flex items-start gap-6 border-t border-black/[0.06] pt-6">
                    <Field
                      label="Project title"
                      value={item.title}
                      wrapperClassName="flex-1"
                      onChange={(value) => onUpdate(item.id, { title: value })}
                    />
                    <button
                      aria-label="Delete portfolio item"
                      className="mt-8 grid size-10 place-items-center rounded-full border border-black/[0.05] text-studio-muted/40 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      type="button"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Category" value={item.category} onChange={(value) => onUpdate(item.id, { category: value })} />
                    <Field label="Location" value={item.location || ''} onChange={(value) => onUpdate(item.id, { location: value })} />
                    <Field label="Client" value={item.client || ''} onChange={(value) => onUpdate(item.id, { client: value })} />
                    <Field label="Year" value={item.year || ''} onChange={(value) => onUpdate(item.id, { year: value })} />
                    <Field label="Area / sqm" value={item.areaSqm || ''} onChange={(value) => onUpdate(item.id, { areaSqm: value })} />
                  </div>
                  <Field label="Subtitle" value={item.subtitle || ''} onChange={(value) => onUpdate(item.id, { subtitle: value })} />
                  <Field label="Description" multiline value={item.description} onChange={(value) => onUpdate(item.id, { description: value })} />
                  <Field label="Design story / concept" multiline value={item.concept || ''} onChange={(value) => onUpdate(item.id, { concept: value })} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Credits" value={item.credits || ''} onChange={(value) => onUpdate(item.id, { credits: value })} />
                    <Field label="Tags" value={item.tags} onChange={(value) => onUpdate(item.id, { tags: value })} />
                  </div>
                </div>

                <div className="grid content-start gap-6">
                  <GalleryManager
                    galleryImages={galleryImages}
                    isUploading={isGalleryUploading}
                    item={item}
                    onPreview={openPreview}
                    onUpdate={onUpdate}
                    onUploadImage={uploadMedia}
                  />

                  <details className="border-t border-black/[0.06] pt-5" open={!hasUploadedMedia}>
                    <summary className="type-control cursor-pointer text-studio-muted transition hover:text-studio-ink">URL Fallbacks</summary>
                    <p className="type-caption mt-2">Use only when Firebase Storage upload is unavailable or an external hosted image is preferred.</p>
                    <div className="mt-5 grid gap-5">
                      <Field label="Cover image URL" value={item.imageUrl || ''} onChange={(value) => onUpdate(item.id, { imageUrl: value })} />
                      <Field label="Gallery image URLs" multiline value={item.galleryUrls || ''} onChange={(value) => onUpdate(item.id, { galleryUrls: value })} />
                    </div>
                  </details>

                  <details className="border-t border-black/[0.06] pt-5">
                    <summary className="type-control cursor-pointer text-studio-muted transition hover:text-studio-ink">Advanced Layout Settings</summary>
                    <p className="type-caption mt-2">Usually handled visually in homepage edit mode.</p>
                    <div className="mt-6 grid gap-5 sm:grid-cols-5">
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
              </div>
            </article>
          );
        })}
        </div>
      )}
      <MediaPreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
    </SectionCard>
  );
}
