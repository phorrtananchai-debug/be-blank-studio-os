import { aequitasTabs } from './aequitasTabs.js';

export function AequitasNavigation({ activeTab, onTabChange }) {
  return (
    <div className="sticky top-0 z-[100] -mx-8 border-b border-black/[0.05] bg-studio-bone/80 px-8 py-4 backdrop-blur-md">
      <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {aequitasTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`type-control flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 transition-all ${
                isActive
                  ? 'bg-black text-white'
                  : 'text-studio-muted hover:bg-black/[0.05] hover:text-studio-ink'
              }`}
              type="button"
              onClick={() => onTabChange(tab.id)}
            >
              <Icon size={14} strokeWidth={2.25} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
