export function getGalleryImages(item) {
  const gallery = String(item.galleryUrls || '')
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);

  return gallery.length ? gallery : [item.imageUrl].filter(Boolean);
}
