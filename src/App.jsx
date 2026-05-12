import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePortfolioItems } from './hooks/usePortfolioItems.js';

const MobileStudioApp = lazy(() => import('./pages/MobileStudioApp.jsx').then((module) => ({ default: module.MobileStudioApp })));
const PortfolioDetailPage = lazy(() => import('./pages/PortfolioDetailPage.jsx').then((module) => ({ default: module.PortfolioDetailPage })));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.jsx').then((module) => ({ default: module.PortfolioPage })));
const PublicHomepage = lazy(() => import('./pages/PublicHomepage.jsx').then((module) => ({ default: module.PublicHomepage })));
const StudioOSApp = lazy(() => import('./pages/StudioOSApp.jsx').then((module) => ({ default: module.StudioOSApp })));

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

function RouteFallback({ children }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function StudioOSRoute({ navigate, routePath }) {
  return (
    <RouteFallback>
      <StudioOSApp navigate={navigate} routePath={routePath} />
    </RouteFallback>
  );
}

function PortfolioDetailRoute({ navigate, portfolioItems }) {
  const { portfolioId = '' } = useParams();

  return (
    <RouteFallback>
      <PortfolioDetailPage item={portfolioItems.find((item) => item.id === portfolioId)} navigate={navigate} />
    </RouteFallback>
  );
}

function PublicHomepageRoute({ navigate, portfolioItems }) {
  return (
    <RouteFallback>
      <PublicHomepage portfolioItems={portfolioItems} navigate={navigate} />
    </RouteFallback>
  );
}

function PortfolioRoute({ navigate, portfolioItems }) {
  return (
    <RouteFallback>
      <PortfolioPage portfolioItems={portfolioItems} navigate={navigate} />
    </RouteFallback>
  );
}

function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const isPublicPortfolioRoute = (
    location.pathname === '/' ||
    location.pathname === '/about' ||
    location.pathname === '/journal' ||
    location.pathname === '/work' ||
    location.pathname === '/portfolio' ||
    location.pathname.startsWith('/portfolio/')
  );
  const { portfolioItems: publicPortfolioItems } = usePortfolioItems({ enabled: isPublicPortfolioRoute });

  useEffect(() => {
    if (location.pathname === '/' && isMobileDevice()) {
      routerNavigate('/m', { replace: true });
    }
  }, [location.pathname, routerNavigate]);

  const navigate = (path, options = {}) => {
    routerNavigate(path, options);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Routes>
      <Route path="/" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/about" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/journal" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/work" element={<PortfolioRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/portfolio" element={<PortfolioRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/portfolio/:portfolioId" element={<PortfolioDetailRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/dashboard" element={<StudioOSRoute navigate={navigate} routePath={location.pathname} />} />
      <Route path="/os/*" element={<StudioOSRoute navigate={navigate} routePath={location.pathname} />} />
      <Route
        path="/m"
        element={(
          <RouteFallback>
            <MobileStudioApp navigate={navigate} />
          </RouteFallback>
        )}
      />
      <Route path="*" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
    </Routes>
  );
}

export default App;
