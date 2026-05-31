import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from './components/LoadingState.jsx';
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

function RouteFallback({ children }) {
  return <Suspense fallback={<LoadingState backgroundClass="bg-studio-mobile-canvas" textClass="text-studio-mobile-ink" />}>{children}</Suspense>;
}

function StudioOSRoute({ navigate, routePath }) {
  return (
    <RouteFallback>
      <StudioOSApp navigate={navigate} routePath={routePath} />
    </RouteFallback>
  );
}

function StudioOSAliasRoute({ navigate, routePath }) {
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

function PublicHomepageRoute({ navigate, portfolioItems, updatePortfolioItem }) {
  return (
    <RouteFallback>
      <PublicHomepage portfolioItems={portfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />
    </RouteFallback>
  );
}

function PortfolioRoute({ navigate, portfolioItems, updatePortfolioItem }) {
  return (
    <RouteFallback>
      <PortfolioPage portfolioItems={portfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />
    </RouteFallback>
  );
}

function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const isPublicPortfolioRoute = (
    location.pathname === '/'
    || location.pathname === '/about'
    || location.pathname === '/journal'
    || location.pathname === '/work'
    || location.pathname === '/portfolio'
    || location.pathname.startsWith('/portfolio/')
  );
  const { portfolioItems: publicPortfolioItems, updatePortfolioItem } = usePortfolioItems({ enabled: isPublicPortfolioRoute });

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
      <Route path="/" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />} />
      <Route path="/about" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />} />
      <Route path="/work" element={<PortfolioRoute portfolioItems={publicPortfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />} />
      <Route path="/portfolio" element={<PortfolioRoute portfolioItems={publicPortfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />} />
      <Route path="/portfolio/:portfolioId" element={<PortfolioDetailRoute portfolioItems={publicPortfolioItems} navigate={navigate} />} />
      <Route path="/dashboard" element={<StudioOSRoute navigate={navigate} routePath={location.pathname} />} />
      <Route path="/os/*" element={<StudioOSRoute navigate={navigate} routePath={location.pathname} />} />
      <Route path="/projects" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/projects" />} />
      <Route path="/projects/karun-phuket" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/projects/karun-phuket" />} />
      <Route path="/timeline" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/timeline" />} />
      <Route path="/artwork" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/artwork" />} />
      <Route path="/documents" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/documents" />} />
      <Route path="/work-queue" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/work-queue" />} />
      <Route path="/site-watch" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/site-watch" />} />
      <Route path="/gallery" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/portfolio" />} />
      <Route path="/settings" element={<StudioOSAliasRoute navigate={navigate} routePath="/os/settings" />} />
      <Route path="/os/projects/:projectAlias" element={<StudioOSRoute navigate={navigate} routePath={location.pathname} />} />
      <Route path="/journal" element={<Navigate replace to="/os/content" />} />
      <Route
        path="/m"
        element={(
          <RouteFallback>
            <MobileStudioApp navigate={navigate} />
          </RouteFallback>
        )}
      />
      <Route path="*" element={<PublicHomepageRoute portfolioItems={publicPortfolioItems} navigate={navigate} updatePortfolioItem={updatePortfolioItem} />} />
    </Routes>
  );
}

export default App;
