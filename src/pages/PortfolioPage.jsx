import { PortfolioCardMeta } from './PublicHomepage.jsx';

export function PortfolioPage({ portfolioItems, navigate }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-studio-ink selection:bg-studio-ink/10">
      <header className="fixed left-0 right-0 top-0 z-[100] bg-white/80 px-5 py-6 backdrop-blur-md md:px-8 border-b border-black/[0.03]">
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#111111]">
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-2">
            <button className="opacity-100" type="button" onClick={() => navigate('/work')}>WORK</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>ABOUT</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>JOURNAL</button>
          </div>
          <div className="flex flex-wrap justify-end gap-6 tracking-tight">
            <button className="transition hover:text-[#777777]" type="button" onClick={() => navigate('/os')}>
              OS
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-screen-2xl px-5 pt-48 pb-32 md:px-8">
        <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-black/[0.03] pb-16">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-studio-muted">Portfolio</span>
            <h1 className="text-5xl font-bold tracking-tight text-studio-ink md:text-6xl">Archive</h1>
          </div>
          <p className="max-w-md text-sm font-medium text-studio-muted leading-relaxed">
            A comprehensive record of architectural delivery, spatial exploration, and material studies. Filtered by year and typology.
          </p>
        </header>

        <div className="grid gap-x-12 gap-y-24 md:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item) => (
            <button
              key={item.id}
              className="group text-left"
              type="button"
              onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#f1f3f5] rounded-sm shadow-studioSoft transition-all duration-700 group-hover:shadow-premium">
                <img
                  alt={item.title}
                  className="h-full w-full object-cover transition-all duration-[1500ms] ease-studio-out group-hover:scale-[1.05] grayscale group-hover:grayscale-0"
                  src={item.imageUrl}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-studio-stone/10'); }}
                />
              </div>
              <div className="mt-8">
                <PortfolioCardMeta item={item} />
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="border-t border-black/[0.05] px-5 py-12 md:px-8">
        <div className="flex flex-col gap-5 text-[9px] font-bold uppercase tracking-[0.2em] text-studio-muted/40 md:flex-row md:items-center md:justify-between">
          <span>Be Blank Studio OS &bull; Project Archive</span>
          <span>© 2024</span>
        </div>
      </footer>
    </div>
  );
}
