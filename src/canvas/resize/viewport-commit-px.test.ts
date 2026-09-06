// The px a viewport-root resize forwards to onViewportResize (2026-09-06):
// only a px string is trusted; vh/% (a `100vh` page root) fall back to the
// live measured px. `parseInt('135vh')` = 135 was written as the breakpoint
// height and the root's inline `height: '135px'` — the first drag snapped
// back to ~150px, the second (now px) stuck.
import { describe, it, expect } from 'vitest';
import { viewportCommitPx } from './ResizeManager';

describe('viewportCommitPx', () => {
  it('trusts a px string', () => { expect(viewportCommitPx('1215px', 999)).toBe(1215); expect(viewportCommitPx('1215.4px', 1)).toBe(1215); });
  it('the live bug: a vh string falls back to the measured px', () => { expect(viewportCommitPx('135vh', 1215)).toBe(1215); });
  it('a % string falls back too (root width is 100%)', () => { expect(viewportCommitPx('100%', 1440)).toBe(1440); });
  it('undefined / auto → live px, rounded', () => { expect(viewportCommitPx(undefined, 900.6)).toBe(901); expect(viewportCommitPx('auto', 900)).toBe(900); });
});
