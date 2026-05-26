import { useMemo, useSyncExternalStore } from 'react';
import { aequitasStore } from '../core/appState.js';

export function useAequitasCore() {
  const snapshot = useSyncExternalStore(
    aequitasStore.subscribe,
    aequitasStore.getSnapshot,
    aequitasStore.getSnapshot,
  );

  return useMemo(() => ({
    ...snapshot,
    actions: aequitasStore.actions,
  }), [snapshot]);
}
