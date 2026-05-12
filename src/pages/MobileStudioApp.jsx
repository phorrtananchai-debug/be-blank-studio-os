import { lazy, Suspense } from 'react';
import { MobileLogin } from './MobileLogin.jsx';
import { useStudioAuth } from '../hooks/useStudioAuth.js';

const MobileDashboard = lazy(() => import('./MobileDashboard.jsx').then((module) => ({ default: module.MobileDashboard })));

function MobileLoadingFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f5] px-5 text-[#111111]">
      <div className="text-center">
        <p className="whitespace-nowrap text-[15px] font-medium tracking-tight">Be blank to behind studio</p>
        <div className="mx-auto my-4 h-px w-10 bg-black/[0.18]" />
        <p className="text-sm tracking-tight text-[#777777]">Studio OS</p>
      </div>
    </main>
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
