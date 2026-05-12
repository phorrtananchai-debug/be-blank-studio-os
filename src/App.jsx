import { lazy, Suspense, useEffect, useState } from 'react';
import { isFirebaseConfigured, subscribeToCollection } from './services/firebase.js';
import { initialPortfolioItems } from './data/seed.js';

const MobileStudioApp = lazy(() => import('./pages/MobileStudioApp.jsx').then((module) => ({ default: module.MobileStudioApp })));
const PortfolioDetailPage = lazy(() => import('./pages/PortfolioDetailPage.jsx').then((module) => ({ default: module.PortfolioDetailPage })));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.jsx').then((module) => ({ default: module.PortfolioPage })));
const PublicHomepage = lazy(() => import('./pages/PublicHomepage.jsx').then((module) => ({ default: module.PublicHomepage })));
const StudioOSApp = lazy(() => import('./pages/StudioOSApp.jsx').then((module) => ({ default: module.StudioOSApp })));

function getRoutePath() {
  return window.location.pathname || '/';
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
}

function LoadingFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F5FA] px-5 text-[#212121]">
      <div className="text-center">
        <p className="text-sm font-medium tracking-tight">Studio OS</p>
        <div className="mx-auto my-4 h-px w-10 bg-black/[0.18]" />
        <p className="text-xs tracking-tight text-[#777777]">Loading workspace</p>
      </div>
    </main>
  );
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
    return (
      <Suspense fallback={<LoadingFallback />}>
        <MobileStudioApp navigate={navigate} />
      </Suspense>
    );
  }

  if (routePath === '/os' || routePath === '/dashboard' || routePath.startsWith('/os/')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <StudioOSApp navigate={navigate} routePath={routePath} />
      </Suspense>
    );
  }

  if (routePath === '/work' || routePath === '/portfolio') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PortfolioPage portfolioItems={publicPortfolioItems} navigate={navigate} />
      </Suspense>
    );
  }

  if (routePath.startsWith('/portfolio/')) {
    const portfolioId = decodeURIComponent(routePath.replace('/portfolio/', ''));
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PortfolioDetailPage item={publicPortfolioItems.find((item) => item.id === portfolioId)} navigate={navigate} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PublicHomepage portfolioItems={publicPortfolioItems} navigate={navigate} />
    </Suspense>
  );
}

export default App;
