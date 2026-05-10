export function ProjectFact({ label, value }) {
  return (
    <div className="grid grid-cols-[90px_1fr] border-t border-[#d8d5cc]/18 pt-3">
      <span className="text-xs font-black uppercase tracking-tight text-[#777269]">{label}</span>
      <span className="text-[#a9a49a]">{value || '-'}</span>
    </div>
  );
}

export function getGalleryImages(item) {
  const gallery = String(item.galleryUrls || '')
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);

  return gallery.length ? gallery : [item.imageUrl].filter(Boolean);
}
