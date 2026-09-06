// Layers-tree reparent of a `position: fixed` node (2026-09-06): fixed is
// page-level only; inside any frame it must become absolute — the canvas drag
// already does this on entry, the layers drop didn't for flex/grid targets.
import { describe, it, expect } from 'vitest';
import { positionFixupForLayersReparent } from './drag';

describe('positionFixupForLayersReparent', () => {
  it('fixed → absolute (pins kept by the caller)', () => {
    expect(positionFixupForLayersReparent({ position: 'fixed', left: '10px', bottom: '20px' })).toEqual({ position: 'absolute' });
  });
  it('relative / absolute / static / missing → no change', () => {
    expect(positionFixupForLayersReparent({ position: 'relative' })).toBeNull();
    expect(positionFixupForLayersReparent({ position: 'absolute' })).toBeNull();
    expect(positionFixupForLayersReparent({ position: 'static' })).toBeNull();
    expect(positionFixupForLayersReparent({})).toBeNull();
    expect(positionFixupForLayersReparent(undefined)).toBeNull();
  });
});
