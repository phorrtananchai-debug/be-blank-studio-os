import { PortfolioCardMeta } from './PublicHomepage.jsx';

export function PortfolioPage({ portfolioItems, navigate }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-studio-ink selection:bg-studio-ink/10">
      <header className="fixed left-0 right-0 top-0 z-[100] border-b border-black/[0.05] bg-white/80 px-5 py-4 backdrop-blur-md md:px-8">
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-[#111111]">
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-2">
            <button className="opacity-100" type="button" onClick={() => navigate('/work')}>WORK</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>ABOUT</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>JOURNAL</button>
          </div>
          <div className="flex flex-wrap justify-end gap-3 text-[10px] tracking-tight">
            <button className="transition hover:text-[#777777]" type="button" onClick={() => navigate('/os')}>
              OS
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 pt-32 pb-24 md:px-8">
        <header className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-studio-ink md:text-5xl">Archive</h1>
          <p className="mt-4 max-w-2xl text-lg font-medium text-studio-muted leading-relaxed">
            A comprehensive record of architectural delivery, spatial exploration, and material studies.
          </p>
        </header>

        <div className="grid gap-x-10 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
          {portfolioItems.map((item) => (
            <button
              key={item.id}
              className="group text-left"
              type="button"
              onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#f1f3f5] rounded-sm shadow-studioSoft transition-all duration-700 group-hover:shadow-studio">
                <img
                  alt={item.title}
                  className="h-full w-full object-cover transition-all duration-[1500ms] ease-studio-out group-hover:scale-[1.05]"
                  src={item.imageUrl}
                />
              </div>
              <div className="mt-6">
                <PortfolioCardMeta item={item} />
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="border-t border-black/[0.05] px-5 py-8 md:px-8">
        <div className="flex flex-col gap-5 text-[10px] font-bold uppercase tracking-widest text-studio-muted md:flex-row md:items-center md:justify-between">
          <span>Be Blank Studio OS &bull; Work Archive</span>
          <span>© 2024</span>
        </div>
      </footer>
    </div>
  );
}
