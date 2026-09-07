// overlay-preplace.ts — put an overlay at its FINAL position BEFORE it is
// revealed for edit mode.
//
// Entering overlay edit mode used to inject the `display: block` show rule
// and then force a render that positioned the portal copy from its trigger.
// For a frame or two the overlay painted at its stale left/top (top-left of
// the tile, or wherever it last sat) and then snapped into place — "it
// appears offset for 0.1s and re-adjusts" (2026-09-06). The Renderer's
// placement is pure math over cached rects (computeOverlayPosition), so we
// run the same math here for every visible tile and patch left/top on the
// still-hidden element first; the render that follows lands on identical
// values and nothing moves on screen.

import { getDefaultStore } from 'jotai';
import { nodesAtom } from '@/code/stores/store';
import { visibleViewportsAtom } from '@/code/stores/viewport-store';
import { findNodeRect, patchNodeStyles, isPrimaryViewport, getActiveFilePath } from '@/canvas/node-ops';
import { isComponentFilePath } from '@/code/project/active-file-store';
import { computeOverlayPosition } from '@/canvas/renderer/overlay-portals';
import { resolveOverlayConfig } from '@/code/parsing/overlay-parser';
import { transformManager } from '@/canvas/transform';
import { trace } from '@/shared/debug-trace';
import type { NodeMap, OverlayConfig } from '@/shared/types';

function topLevelAncestor(nodeId: string, nodes: NodeMap): string {
  let cur = nodes.get(nodeId);
  const seen = new Set<string>();
  while (cur && cur.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const next = nodes.get(cur.parentId);
    if (!next) break;
    cur = next;
  }
  return cur?.id ?? nodeId;
}

/** Pure: the overlay's box for placement — its px width/height from styles. */
export function overlayBoxFromStyles(styles: Record<string, string> | undefined): { w: number; h: number } | null {
  const w = parseFloat(styles?.width ?? '');
  const h = parseFloat(styles?.height ?? '');
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  if (!/px$/.test(styles!.width) || !/px$/.test(styles!.height)) return null;
  return { w, h };
}

/** Patch the overlay's left/top on every visible tile from its trigger. Returns
 *  the number of tiles placed (0 when the overlay has no px box / no trigger). */
export function prePlaceOverlayForEdit(overlayId: string, contentEl: HTMLElement): number {
  const store = getDefaultStore();
  const nodes = store.get(nodesAtom);
  const ov = nodes.get(overlayId);
  const raw = ov?.attrs?.['data-overlay'];
  if (!ov || !raw) return 0;
  let cfg: OverlayConfig;
  try { cfg = JSON.parse(raw) as OverlayConfig; } catch { return 0; }
  if (cfg.type !== 'relative' || !cfg.triggerId) return 0;
  const box = overlayBoxFromStyles(ov.styles as Record<string, string>);
  if (!box) { trace.action('overlay-preplace:skip-no-px-box', { overlayId }); return 0; }
  const scale = transformManager.getTransform().scale || 1;
  const clamp = !isComponentFilePath(getActiveFilePath());
  const rootId = topLevelAncestor(cfg.triggerId, nodes);
  let placed = 0;
  for (const vp of store.get(visibleViewportsAtom)) {
    const v = vp.id;
    const trig = findNodeRect(cfg.triggerId, v);
    const rootR = findNodeRect(rootId, v) ?? findNodeRect('layout::root', v) ?? findNodeRect('root', v);
    if (!trig || !rootR) continue;
    const cfgV = resolveOverlayConfig(cfg, v, vp.width ?? 0);
    const pos = computeOverlayPosition(
      cfgV, box.w, box.h,
      { left: trig.left, top: trig.top, width: trig.width, height: trig.height, right: trig.left + trig.width, bottom: trig.top + trig.height },
      { left: rootR.left, top: rootR.top, width: rootR.width, height: rootR.height },
      scale, clamp,
    );
    patchNodeStyles(contentEl, overlayId, isPrimaryViewport(v) ? '' : `${v}-`, {
      left: `${Math.round(pos.left)}px`, top: `${Math.round(pos.top)}px`,
    });
    placed++;
  }
  trace.action('overlay-preplace:done', { overlayId, placed });
  return placed;
}

/** Body of the overlay-edit SHOW rule: reveal with the overlay's OWN display
 *  (flex / grid / block — never a hard `block`, which wiped its flex on the
 *  canvas) and lift it above the tint. Reads the default variant entry first,
 *  then the inline style. Pure so the rule can be re-derived whenever the
 *  node changes (a Layout added after the overlay was opened). */
export function overlayShowRuleBody(node: { styles?: Record<string, string>; motionVariants?: unknown } | undefined | null): string {
  const entry = (node?.motionVariants as Record<string, Record<string, string>> | undefined)?.default;
  const display = String(entry?.display || node?.styles?.display || 'block');
  const showDisplay = /^(flex|grid|inline-flex|inline-grid|block|inline-block)$/.test(display) ? display : 'block';
  return `/*persist*/ display: ${showDisplay} !important; z-index: 50 !important;`;
}
