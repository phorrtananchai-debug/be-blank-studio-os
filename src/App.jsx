import { useEffect, useState } from 'react';
import { MobileStudioApp } from './pages/MobileStudioApp.jsx';
import { StudioOSApp } from './pages/StudioOSApp.jsx';
import { PublicHomepage } from './pages/PublicHomepage.jsx';
import { PortfolioPage } from './pages/PortfolioPage.jsx';
import { PortfolioDetailPage } from './pages/PortfolioDetailPage.jsx';
import { isFirebaseConfigured, subscribeToCollection } from './services/firebase.js';
import { initialPortfolioItems } from './data/seed.js';

function getRoutePath() {
  return window.location.pathname || '/';
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
}

function App() {
  const [routePath, setRoutePath] = useState(getRoutePath);
  const [publicPortfolioItems, setPublicPortfolioItems] = useState(initialPortfolioItems);

  useEffect(() => {
    const handleRouteChange = () => setRoutePath(getRoutePath());
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (routePath === '/' && isMobileDevice()) {
      window.history.replaceState({}, '', '/m');
      setRoutePath('/m');
    }
  }, [routePath]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setPublicPortfolioItems(initialPortfolioItems);
      return undefined;
    }

    try {
      return subscribeToCollection(
        'portfolioItems',
        (items) => setPublicPortfolioItems(items.length ? items : initialPortfolioItems),
        () => setPublicPortfolioItems(initialPortfolioItems),
      );
    } catch {
      setPublicPortfolioItems(initialPortfolioItems);
      return undefined;
    }
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoutePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (routePath === '/m') {
    return <MobileStudioApp navigate={navigate} />;
  }

  if (routePath === '/os' || routePath === '/dashboard' || routePath.startsWith('/os/')) {
    return <StudioOSApp navigate={navigate} routePath={routePath} />;
  }

  if (routePath === '/work' || routePath === '/portfolio') {
    return <PortfolioPage portfolioItems={publicPortfolioItems} navigate={navigate} />;
  }

  if (routePath.startsWith('/portfolio/')) {
    const portfolioId = decodeURIComponent(routePath.replace('/portfolio/', ''));
    return <PortfolioDetailPage item={publicPortfolioItems.find((item) => item.id === portfolioId)} navigate={navigate} />;
  }

  return <PublicHomepage portfolioItems={publicPortfolioItems} navigate={navigate} />;
}

export default App;
