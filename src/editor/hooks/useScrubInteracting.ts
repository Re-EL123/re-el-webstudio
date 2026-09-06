// useScrubInteracting.ts — the setter panel value-scrub controls (color
// picker, slider, chevron hold) call on drag start/end. Flips
// `canvasInteractingAtom` (so the renderer skips re-renders and the canvas
// treats the gesture as live) AND `panelScrubAtom` (so overlays that only
// make sense for GEOMETRIC gestures — the InteractionOutline — stay hidden).
// Same signature as `useSetAtom(canvasInteractingAtom)` so call sites are
// unchanged.

import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { canvasInteractingAtom, panelScrubAtom } from '@/code/stores/store';

export function useScrubInteracting(): (active: boolean) => void {
  const setInteracting = useSetAtom(canvasInteractingAtom);
  const setScrub = useSetAtom(panelScrubAtom);
  return useCallback((active: boolean) => {
    setScrub(active);
    setInteracting(active);
  }, [setInteracting, setScrub]);
}
