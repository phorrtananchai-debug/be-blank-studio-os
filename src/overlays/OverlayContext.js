import { createContext } from 'react';
import { initialOverlayState, overlayKinds } from './overlayContract.js';

export const OverlayContext = createContext({
  closeOverlay: () => {},
  isOpen: () => false,
  openOverlay: () => {},
  overlay: initialOverlayState,
  overlayKinds,
});
