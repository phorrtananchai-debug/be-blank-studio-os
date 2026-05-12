import { studioOsTabs } from './studioOsTabs.js';

export function StudioOSNavigation({ activeTab, onTabChange }) {
  return (
    <div className="sticky top-0 z-[100] -mx-8 bg-studio-bone/80 px-8 py-4 backdrop-blur-md border-b border-black/[0.05]">
      <nav className="flex items-center gap-1">
        {studioOsTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-bold transition-all ${
                isActive
                  ? 'bg-black text-white'
                  : tab.id === 'artwork'
                    ? 'bg-studio-orange/5 text-studio-ink hover:bg-studio-orange/10'
                    : 'text-studio-muted hover:bg-black/[0.05] hover:text-studio-ink'
              }`}
              type="button"
              onClick={() => onTabChange(tab.id)}
            >
              <Icon size={14} strokeWidth={2.5} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
