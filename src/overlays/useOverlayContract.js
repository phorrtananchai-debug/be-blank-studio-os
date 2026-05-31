import { useContext } from 'react';
import { OverlayContext } from './OverlayContext.js';

export function useOverlayContract() {
  return useContext(OverlayContext);
}
