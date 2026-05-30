import { useCallback, useMemo, useState } from 'react';
import { OverlayContext } from './OverlayContext.js';
import { initialOverlayState, overlayKinds } from './overlayContract.js';

export function OverlayProvider({ children }) {
  const [overlay, setOverlay] = useState(initialOverlayState);

  const openOverlay = useCallback((kind, payload = null) => {
    setOverlay({ active: kind, payload });
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlay(initialOverlayState);
  }, []);

  const isOpen = useCallback((kind) => overlay.active === kind, [overlay.active]);

  const value = useMemo(() => ({
    closeOverlay,
    isOpen,
    openOverlay,
    overlay,
    overlayKinds,
  }), [closeOverlay, isOpen, openOverlay, overlay]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  );
}
