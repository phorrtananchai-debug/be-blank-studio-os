function normalizeImageRecord(image, fallbackAlt = '') {
  if (!image) return null;
  if (typeof image === 'string') {
    return { alt: fallbackAlt, caption: '', fullUrl: image, mediumUrl: image, thumbnailUrl: image, url: image };
  }

  const url = image.url || image.fullUrl || image.mediumUrl || image.thumbnailUrl || '';
  if (!url) return null;

  return {
    alt: image.alt || fallbackAlt,
    caption: image.caption || '',
    fullUrl: image.fullUrl || url,
    mediumUrl: image.mediumUrl || image.fullUrl || url,
    order: image.order,
    path: image.path || image.fullPath || '',
    relationship: image.relationship || '',
    thumbnailUrl: image.thumbnailUrl || image.mediumUrl || image.fullUrl || url,
    url,
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
  return getGalleryImageObjects(item).map((image) => image.fullUrl || image.url).filter(Boolean);
}
