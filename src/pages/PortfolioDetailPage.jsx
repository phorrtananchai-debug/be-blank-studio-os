import { initialPortfolioItems } from '../data/seed.js';
import { ProjectFact } from '../utils/portfolio.jsx';
import { getCoverImage, getGalleryImageObjects } from '../utils/portfolioImages.js';
import { useEffect, useMemo, useState } from 'react';

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

function Lightbox({ images, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const image = images[index];
  const canMove = images.length > 1;

  const move = (direction) => setIndex((value) => (value + direction + images.length) % images.length);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: document.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="fixed inset-0 z-[500] grid bg-black text-white">
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/70">
        <button className="transition hover:text-white" type="button" onClick={onClose}>close</button>
        <div className="flex items-center gap-5">
          <button className="transition hover:text-white" type="button" onClick={share}>share</button>
          {document.fullscreenEnabled && (
            <button className="transition hover:text-white" type="button" onClick={() => document.documentElement.requestFullscreen?.()}>fullscreen</button>
          )}
          <span>{index + 1} / {images.length}</span>
        </div>
      </div>
      {canMove && (
        <>
          <button className="absolute left-5 top-1/2 z-10 -translate-y-1/2 text-3xl text-white/70 transition hover:text-white" type="button" onClick={() => move(-1)}>←</button>
          <button className="absolute right-5 top-1/2 z-10 -translate-y-1/2 text-3xl text-white/70 transition hover:text-white" type="button" onClick={() => move(1)}>→</button>
        </>
      )}
      <figure className="grid h-screen place-items-center px-8 py-16">
        <img alt={image.alt || ''} className="max-h-full max-w-full object-contain" src={image.fullUrl || image.url} />
        {image.caption && <figcaption className="absolute bottom-5 max-w-xl text-center text-xs font-medium text-white/60">{image.caption}</figcaption>}
      </figure>
    </div>
  );
}

export function PortfolioDetailPage({ item, navigate }) {
  const portfolioItem = item || initialPortfolioItems[0];
  const cover = getCoverImage(portfolioItem);
  const gallery = useMemo(() => getGalleryImageObjects(portfolioItem), [portfolioItem]);
  const allImages = useMemo(() => {
    const coverImage = cover ? [{ ...cover, relationship: 'cover' }] : [];
    const combined = [...coverImage, ...gallery];
    const seen = new Set();
    return combined.filter((image) => {
      const url = image.fullUrl || image.url;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [cover, gallery]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    const title = `${portfolioItem.title || 'Project'} | Be Blank to Behind Studio`;
    const description = portfolioItem.subtitle || portfolioItem.description || portfolioItem.location || 'Be Blank to Behind Studio project archive.';
    const url = window.location.href;
    const image = cover?.mediumUrl || cover?.fullUrl || cover?.url || '';
    document.title = title;
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
    }
  }, [cover, portfolioItem]);

  const shareProject = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: portfolioItem.title, text: portfolioItem.subtitle || portfolioItem.description, url });
        setShareMessage('Shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied.');
      }
      window.setTimeout(() => setShareMessage(''), 1800);
    } catch {
      setShareMessage('Share cancelled.');
    }
  };

  return (
    <div className="min-h-screen bg-studio-paper text-studio-ink">
      <header className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-studio-muted md:px-8">
        <button className="transition hover:text-studio-ink" type="button" onClick={() => navigate('/')}>
          projects
        </button>
        <div className="flex items-center gap-5">
          <button className="transition hover:text-studio-ink" type="button" onClick={shareProject}>share</button>
          <button className="transition hover:text-studio-ink" type="button" onClick={() => navigate('/os')}>
            studio os
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">
        <section className="grid gap-12 px-5 py-20 md:grid-cols-2 md:px-8">
          <div className="space-y-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">{portfolioItem.category || 'Project'}</p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-studio-ink">
              {portfolioItem.title}
            </h1>
          </div>
          <div className="grid content-end gap-4 border-t border-black/[0.08] pt-8 md:border-t-0 md:pt-0">
            <ProjectFact label="Client" value={portfolioItem.client} />
            <ProjectFact label="Location" value={portfolioItem.location} />
            <ProjectFact label="Year" value={portfolioItem.year} />
            <ProjectFact label="Area" value={portfolioItem.areaSqm ? `${portfolioItem.areaSqm} sqm` : ''} />
          </div>
        </section>

        <section className="px-5 md:px-8">
          <button className="block w-full text-left" type="button" onClick={() => setLightboxIndex(0)}>
            <img alt={portfolioItem.title} className="w-full rounded-xl object-cover shadow-studio" loading="eager" src={cover?.mediumUrl || portfolioItem.imageUrl} />
          </button>
        </section>

        <section className="grid gap-12 px-5 py-24 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">Design story</p>
          <div className="grid gap-8">
            <p className="max-w-4xl text-3xl font-bold leading-tight text-studio-ink md:text-4xl">{portfolioItem.description}</p>
            <p className="max-w-3xl text-lg font-medium text-studio-muted leading-relaxed">{portfolioItem.concept || portfolioItem.description}</p>
            {portfolioItem.credits && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">{portfolioItem.credits}</p>
            )}
          </div>
        </section>

        <section className="grid gap-8 px-5 pb-24 md:grid-cols-2 md:px-8">
          {gallery.map((image, index) => (
            <button key={`${image.fullUrl || image.url}-${index}`} className="text-left" type="button" onClick={() => setLightboxIndex(allImages.findIndex((candidate) => (candidate.fullUrl || candidate.url) === (image.fullUrl || image.url)))}>
              <img alt={image.alt || portfolioItem.title} className="aspect-[4/3] w-full rounded-xl object-cover shadow-studioSoft" loading="lazy" sizes="(max-width: 768px) 100vw, 50vw" src={image.mediumUrl || image.url} />
            </button>
          ))}
        </section>
      </main>
      {shareMessage && (
        <div className="fixed bottom-5 left-1/2 z-[520] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
          {shareMessage}
        </div>
      )}
      {lightboxIndex !== null && allImages.length > 0 && (
        <Lightbox images={allImages} initialIndex={Math.max(0, lightboxIndex)} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
