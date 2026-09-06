// order-renumber.ts — unique flex/grid `order` for a SIBLING paste (Cmd+D,
// paste-next-to-selected).
//
// The clone copies the source's inline styles verbatim, `order` included, so
// two siblings ended up with the same `order` ("Cmd+D on an instance kept
// order: 0", 2026-09-06). CSS breaks the tie by DOM position, so it LOOKS
// right until the next reorder: the engine renumbers by `order` and both
// twins snap to the same slot. Renumber the parent's flow siblings once,
// sequentially, in the visual order the user sees with the clones directly
// after their sources. Same flow rule the reorder math uses: numeric `order`
// (default 0), stable by source index.
//
// Pure over the node map so the rule is testable without a canvas.

import type { CanvasNode } from '@/code/parsing/parser';

/** Is this parent a flex/grid container (the only place `order` means anything)? */
export function isOrderedLayoutParent(parent: CanvasNode | undefined): boolean {
  const d = String(parent?.styles?.display ?? '');
  return d.includes('flex') || d.includes('grid');
}

/**
 * Sequential 0..N assignments for `parent`'s flow siblings with each new id
 * placed right after its source. Returns [] when nothing needs to change
 * (parent not flex/grid, or no clone lands in it). Template chrome
 * (`layout::`), the children slot and overlays are never renumbered — they
 * are not the user's flow content (see reorder rules).
 */
export function computePasteOrderAssignments(
  parent: CanvasNode | undefined,
  nodes: Map<string, CanvasNode>,
  pairs: { sourceId: string; newId: string }[],
): { nodeId: string; order: number }[] {
  if (!parent || !isOrderedLayoutParent(parent)) return [];
  const bySource = new Map<string, string[]>();
  for (const p of pairs) {
    if (!parent.children.includes(p.sourceId)) continue;
    const arr = bySource.get(p.sourceId) ?? [];
    arr.push(p.newId);
    bySource.set(p.sourceId, arr);
  }
  if (bySource.size === 0) return [];

  const flow = parent.children
    .filter((id) => !id.startsWith('layout::') && id !== 'children-slot' && !nodes.get(id)?.attrs?.['data-overlay'])
    .map((id, srcIdx) => {
      const raw = nodes.get(id)?.styles?.order;
      const n = typeof raw === 'string' || typeof raw === 'number' ? parseFloat(String(raw)) : NaN;
      return { id, srcIdx, order: Number.isFinite(n) ? n : 0 };
    })
    .sort((a, b) => a.order - b.order || a.srcIdx - b.srcIdx)
    .map((s) => s.id);

  const desired: string[] = [];
  for (const id of flow) {
    desired.push(id);
    for (const nid of bySource.get(id) ?? []) desired.push(nid);
  }
  const out: { nodeId: string; order: number }[] = [];
  desired.forEach((nodeId, i) => {
    const cur = nodes.get(nodeId)?.styles?.order;
    // New ids are not in the map yet → always written; existing siblings only
    // when their number actually moves (keeps the diff minimal).
    if (!nodes.has(nodeId) || String(cur ?? '') !== String(i)) out.push({ nodeId, order: i });
  });
  return out;
}
