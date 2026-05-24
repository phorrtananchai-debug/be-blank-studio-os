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

export function resolvePortfolioImageUrl(image, preferred = ['fullUrl', 'mediumUrl', 'url', 'imageUrl', 'thumbnailUrl']) {
  if (!image) return '';
  if (typeof image === 'string') return image.trim();

  return preferred
    .map((key) => image[key])
    .find((value) => typeof value === 'string' && value.trim()) || '';
}

export function createImageRecordDefaults(image = {}) {
  return {
    ...image,
    aspectIntent: ['auto', 'portrait', 'landscape', 'square', 'wide'].includes(image.aspectIntent) ? image.aspectIntent : 'auto',
    cropMode: ['cover', 'contain', 'natural'].includes(image.cropMode) ? image.cropMode : 'cover',
    cropNotes: image.cropNotes || '',
    focusX: Number.isFinite(Number(image.focusX)) ? Math.min(100, Math.max(0, Number(image.focusX))) : 50,
    focusY: Number.isFinite(Number(image.focusY)) ? Math.min(100, Math.max(0, Number(image.focusY))) : 50,
  };
}

export function getImageFocusStyle(image, { fallbackFit = 'cover' } = {}) {
  const normalized = createImageRecordDefaults(image || {});
  const fit = normalized.cropMode === 'natural' ? 'contain' : normalized.cropMode || fallbackFit;

  return {
    objectFit: fit,
    objectPosition: `${normalized.focusX}% ${normalized.focusY}%`,
  };
}

// Current public previews are client-side meta updates. True Facebook crawler previews
// need static, SSR, or edge-rendered project metadata later. The image metadata shape
// already allows thumbnail/medium/full URLs; generating resized assets remains a
// future storage pipeline rather than a Firestore responsibility.

export function getCoverImage(item) {
  return normalizeImageRecord(item.coverImage, item.title) || normalizeImageRecord(item.imageUrl, item.title);
}

export function getGalleryImageObjects(item) {
  const uploadedGallery = Array.isArray(item.galleryImages)
    ? item.galleryImages.map((image) => normalizeImageRecord(image, item.title)).filter(Boolean)
    : [];
  const urlGallery = String(item.galleryUrls || '')
    .split(/\n|,/)
    .map((url) => normalizeImageRecord(url.trim(), item.title))
    .filter(Boolean);
  const cover = getCoverImage(item);
  const images = [...uploadedGallery, ...urlGallery];

  return images.length ? images : [cover].filter(Boolean);
}

export function getGalleryImages(item) {
  return getGalleryImageObjects(item).map((image) => resolvePortfolioImageUrl(image)).filter(Boolean);
}
