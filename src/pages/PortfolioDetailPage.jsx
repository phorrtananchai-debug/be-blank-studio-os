import { initialPortfolioItems } from '../data/seed.js';
import { ProjectFact } from '../utils/portfolio.jsx';
import { getGalleryImages } from '../utils/portfolioImages.js';

export function PortfolioDetailPage({ item, navigate }) {
  const portfolioItem = item || initialPortfolioItems[0];
  const gallery = getGalleryImages(portfolioItem);

  return (
    <div className="min-h-screen bg-studio-paper text-studio-ink">
      <header className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-studio-muted md:px-8">
        <button className="transition hover:text-studio-ink" type="button" onClick={() => navigate('/')}>
          projects
        </button>
        <button className="transition hover:text-studio-ink" type="button" onClick={() => navigate('/os')}>
          studio os
        </button>
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
          <img alt={portfolioItem.title} className="rounded-xl shadow-studio w-full object-cover" src={portfolioItem.imageUrl} />
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
          {gallery.map((imageUrl) => (
            <img key={imageUrl} alt={portfolioItem.title} className="aspect-[4/3] w-full rounded-xl object-cover shadow-studioSoft" src={imageUrl} />
          ))}
        </section>
      </main>
    </div>
  );
}
