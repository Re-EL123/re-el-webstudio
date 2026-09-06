import { describe, it, expect } from 'vitest';
import { overlayBoxFromStyles } from './overlay-preplace';
describe('overlayBoxFromStyles', () => {
  it('px box → placement size; anything else → null (fall back to the render pass)', () => {
    expect(overlayBoxFromStyles({ width: '200px', height: '100px' })).toEqual({ w: 200, h: 100 });
    expect(overlayBoxFromStyles({ width: 'auto', height: '100px' })).toBeNull();
    expect(overlayBoxFromStyles({ width: '50%', height: '100px' })).toBeNull();
    expect(overlayBoxFromStyles(undefined)).toBeNull();
  });
});
