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

import { overlayShowRuleBody } from './overlay-preplace';
// Regression: the show rule bakes display with !important; it must follow the
// overlay when a Layout is added after the overlay was opened (block → flex).
describe('overlayShowRuleBody', () => {
  it('reveals with the overlay\'s own layout display', () => {
    expect(overlayShowRuleBody({ styles: { display: 'flex' } })).toContain('display: flex !important');
    expect(overlayShowRuleBody({ styles: { display: 'grid' } })).toContain('display: grid !important');
  });
  it('prefers the default variant entry and falls back to block', () => {
    expect(overlayShowRuleBody({ styles: { display: 'block' }, motionVariants: { default: { display: 'flex' } } })).toContain('display: flex');
    expect(overlayShowRuleBody({ styles: {} })).toContain('display: block !important');
    expect(overlayShowRuleBody({ styles: { display: 'none' } })).toContain('display: block !important');
    expect(overlayShowRuleBody(undefined)).toContain('display: block !important');
  });
  it('changes body when the layout changes, so the injecting effect re-fires', () => {
    expect(overlayShowRuleBody({ styles: { display: 'block' } })).not.toBe(overlayShowRuleBody({ styles: { display: 'flex' } }));
  });
});
