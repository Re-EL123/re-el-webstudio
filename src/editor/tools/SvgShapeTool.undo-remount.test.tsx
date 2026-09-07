import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { getDefaultStore } from 'jotai';

// Undo with a SHAPE selected made the Fill/Stroke sections flash (user report
// 2026-09-06) while a frame's panel stayed put. This replays the restore
// sequence useMutationQueueLifecycle runs (seed cache + live version bumps,
// then the deferred fan-out) against the real panel and counts SvgShapeTool
// mounts: a flash is a remount.
// `child` = the toolbar's base polygon (no child data-id) or the stamped path
// the first shape-edit commit writes; the flash only showed between those two.
const page = (fill: string, child: 'polygon' | 'path' = 'path') => `'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative' }}>
      <svg data-id="shape-1" data-name="Triangle" viewBox="0 0 100 100" style={{ position: 'absolute', left: '10px', top: '10px', width: '100px', height: '100px' }}>
        ${child === 'path' ? `<path data-id="shape-1-g0" d="M0 0 L100 0 L50 100 Z" fill="${fill}" />` : `<polygon points="50,0 100,100 0,100" fill="${fill}" />`}
      </svg>
    </div>
  );
}`;

describe('SvgShapeTool — undo does not remount the shape sections', () => {
  it('keeps one mount across a history restore', async () => {
    if (!(globalThis as any).ResizeObserver) (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    const { trace } = await import('@/shared/debug-trace');
    const { projectVersionAtom } = await import('@/code/project/project-fs');
    const { codeAtom, selectedIdsAtom, nodeStylesVersionAtom, nodeTreeStructureVersionAtom, seedNodesForCode } = await import('@/code/stores/store');
    const PropertiesPanel = (await import('../PropertiesPanel')).default;
    const store = getDefaultStore();
    store.set(codeAtom, page('#3b82f6', 'polygon'));
    store.set(selectedIdsAtom, ['shape-1']);

    const counts: Record<string, number> = {};
    const realAction = trace.action.bind(trace);
    trace.action = ((category: string, data?: unknown) => {
      counts[category] = (counts[category] ?? 0) + 1;
      realAction(category, data);
    }) as typeof trace.action;
    try {
      const r = render(<PropertiesPanel />);
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
      expect(counts['svg-shape-tool:mount'] ?? 0).toBe(1);
      expect(r.container.textContent).toContain('Stroke');

      // Restore step 2+4: seed + wake live readers (nodesAtom still old).
      const restored = page('#ff0000');
      await act(async () => {
        seedNodesForCode(restored, 1);
        store.set(nodeStylesVersionAtom, (v) => v + 1);
        store.set(nodeTreeStructureVersionAtom, (v) => v + 1);
      });
      // The sections must survive the window between the cache seed and the parsed fan-out.
      expect(r.container.textContent).toContain('Stroke');
      expect(r.container.textContent).toContain('#FF0000');
      // Deferred fan-out: code + version bump + reselect.
      await act(async () => {
        store.set(codeAtom, restored);
        store.set(projectVersionAtom, (v) => v + 1);
        store.set(selectedIdsAtom, ['shape-1']);
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(r.container.textContent).toContain('Stroke');
      expect(counts['properties-panel:unresolvable-selection-shell'] ?? 0).toBe(0);
      expect(counts['svg-shape-tool:unmount'] ?? 0).toBe(0);
      expect(counts['svg-shape-tool:mount']).toBe(1);
    } finally {
      trace.action = realAction;
    }
  }, 30_000);
});
