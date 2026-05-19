import { lazy, Suspense } from 'react';
import { LoadingState } from '../components/LoadingState.jsx';
import { MobileLogin } from './MobileLogin.jsx';
import { useStudioAuth } from '../hooks/useStudioAuth.js';

const MobileDashboard = lazy(() => import('./MobileDashboard.jsx').then((module) => ({ default: module.MobileDashboard })));

function MobileLoadingFallback() {
  return (
    <LoadingState
      backgroundClass="bg-studio-mobile-canvas"
      eyebrow="Be blank to behind studio"
      message="Studio OS"
      messageClass="text-sm"
      textClass="text-[#111111]"
    />
  );
}

export function MobileStudioApp({ navigate }) {
  const {
    user,
    setUser,
    isCheckingAuth,
    authMessage,
    signIn,
    signOut,
  } = useStudioAuth();

  const handleMobileSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      // Message is set by hook
    }
  };

  const handleMobileSignOut = async () => {
    await signOut();
  };

  const previewMobileDashboard = () => {
    if (import.meta.env.DEV) {
      setUser({ email: 'preview@local.dev' });
    }
  };

  if (isCheckingAuth) {
    return <MobileLoadingFallback />;
  }

  if (!user) {
    return (
      <MobileLogin
        errorMessage={authMessage}
        onPreviewDashboard={previewMobileDashboard}
        onSignIn={handleMobileSignIn}
      />
    );
  }

  return (
    <Suspense fallback={<MobileLoadingFallback />}>
      <MobileDashboard
        user={user}
        onOpenDesktop={() => navigate('/os')}
        onSignOut={handleMobileSignOut}
      />
    </Suspense>
  );
}
