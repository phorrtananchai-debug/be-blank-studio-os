import { initialPortfolioItems } from '../data/seed.js';

export function ProjectFact({ label, value }) {
  return (
    <div className="grid grid-cols-[90px_1fr] border-t border-[#d8d5cc]/18 pt-3">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#777269]">{label}</span>
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

export function PortfolioDetailPage({ item, navigate }) {
  const portfolioItem = item || initialPortfolioItems[0];
  const gallery = getGalleryImages(portfolioItem);

  return (
    <div className="min-h-screen bg-[#12110f] text-[#d8d5cc]">
      <header className="flex items-center justify-between border-b border-[#d8d5cc]/18 px-5 py-5 text-xs font-black uppercase tracking-[0.22em] text-[#a9a49a] md:px-8">
        <button className="transition hover:text-[#d8d5cc]" type="button" onClick={() => navigate('/')}>
          projects
        </button>
        <button className="transition hover:text-[#d8d5cc]" type="button" onClick={() => navigate('/os')}>
          studio os
        </button>
      </header>
      <main>
        <section className="grid gap-10 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#777269]">{portfolioItem.category || 'Project'}</p>
            <h1 className="mt-4 text-[clamp(3.5rem,12vw,11rem)] font-black uppercase leading-[0.8] text-[#d8d5cc]">
              {portfolioItem.title}
            </h1>
          </div>
          <div className="grid content-end gap-5 text-sm leading-6 text-[#a9a49a]">
            <ProjectFact label="Client" value={portfolioItem.client} />
            <ProjectFact label="Location" value={portfolioItem.location} />
            <ProjectFact label="Year" value={portfolioItem.year} />
            <ProjectFact label="Area" value={portfolioItem.areaSqm ? `${portfolioItem.areaSqm} sqm` : ''} />
          </div>
        </section>

        <section className="px-5 md:px-8">
          <img alt={portfolioItem.title} className="max-h-[78vh] w-full object-cover" src={portfolioItem.imageUrl} />
        </section>

        <section className="grid gap-10 px-5 py-14 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#777269]">Design story</p>
          <div className="grid gap-8">
            <p className="max-w-4xl text-3xl font-black leading-tight text-[#d8d5cc] md:text-5xl">{portfolioItem.description}</p>
            <p className="max-w-3xl text-lg leading-8 text-[#a9a49a]">{portfolioItem.concept || portfolioItem.description}</p>
            {portfolioItem.credits && (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777269]">{portfolioItem.credits}</p>
            )}
          </div>
        </section>

        <section className="grid gap-4 px-5 pb-16 md:grid-cols-2 md:px-8">
          {gallery.map((imageUrl) => (
            <img key={imageUrl} alt={portfolioItem.title} className="aspect-[4/3] w-full object-cover" src={imageUrl} />
          ))}
        </section>
      </main>
    </div>
  );
}
