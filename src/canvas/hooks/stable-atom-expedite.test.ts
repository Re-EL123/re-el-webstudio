// stable-atom-expedite.test.ts — the mirror's canvas budget must not become the
// panel's latency.
//
// `useStableAtomSync` defers mirroring code/nodes into the stable atoms by
// 450ms so the canvas iframe paints before the ~14-atom parser cascade. Right
// for a drag or an undo; wrong for a PANEL edit, because the properties panel
// reads the mirror — binding a CMS field parsed in 5ms and appeared ~466ms
// later (trace 2026-08-08). `expediteStableAtomSync()` marks the next mirror as
// panel-originated so it runs on the next tick instead.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expediteStableAtomSync, consumeExpedite } from './useStableAtomSync';

describe('expedite flag', () => {
  beforeEach(() => { consumeExpedite(); }); // clear any leak between tests

  it('is off by default — drags and undo keep the paint-first budget', () => {
    expect(consumeExpedite()).toBe(false);
  });

  it('arms for a panel-originated write', () => {
    expediteStableAtomSync();
    expect(consumeExpedite()).toBe(true);
  });

  it('is ONE-SHOT — one click cannot leave the mirror permanently eager', () => {
    expediteStableAtomSync();
    expect(consumeExpedite()).toBe(true);
    expect(consumeExpedite()).toBe(false);
  });

  it('repeated arming before a read still consumes exactly once', () => {
    expediteStableAtomSync();
    expediteStableAtomSync();
    expect(consumeExpedite()).toBe(true);
    expect(consumeExpedite()).toBe(false);
  });
});

describe('expedite TTL — a no-op panel write cannot leak onto a later gesture', () => {
  it('drops a flag older than the TTL window', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-06T12:00:00Z'));
      expediteStableAtomSync();
      vi.setSystemTime(new Date('2026-09-06T12:00:05Z')); // 5s later: a drag end / undo
      expect(consumeExpedite()).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('honours a fresh flag', () => {
    expediteStableAtomSync();
    expect(consumeExpedite()).toBe(true);
    expect(consumeExpedite()).toBe(false); // one-shot
  });
});
