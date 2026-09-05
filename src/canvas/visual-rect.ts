// visual-rect.ts — the parent-relative LAYOUT-BOX rect of a node in CSS px,
// read through the iframe bridge caches (never the canvas DOM).
//
// Lifted verbatim from PinControl's captureRectViaBridge so the pin toggles,
// the shape position model (resize start / align / X-Y fields) and any future
// writer derive positions from ONE implementation — the rotated-AABB → layout
// box correction below is exactly the kind of math that drifts when copied.

import { getNodesSnapshot } from '@/code/stores/store';
import { transformManager } from '@/canvas/transform';
import { findNodeRect, findNodeComputedStyles, findNodeParentInnerSize } from '@/canvas/node-ops';
import { trace } from '@/shared/debug-trace';
import type { VisualRect } from '@/shared/position-utils';

export function captureVisualRect(nodeId: string, vpId: string): VisualRect | null {
  const node = getNodesSnapshot().get(nodeId);
  const parentId = node?.parentId;
  if (!parentId) return null;
  const scale = transformManager.getTransform().scale || 1;

  const elScreen = findNodeRect(nodeId, vpId);
  const parentScreen = findNodeRect(parentId, vpId);
  if (!elScreen || !parentScreen) return null;

  const computed = findNodeComputedStyles(nodeId, vpId, ['width', 'height']);
  const width = parseFloat(computed.width) || elScreen.width / scale;
  const height = parseFloat(computed.height) || elScreen.height / scale;

  const parentInner = findNodeParentInnerSize(nodeId, vpId);
  const parentWidth = parentInner.width || parentScreen.width / scale;
  const parentHeight = parentInner.height || parentScreen.height / scale;

  // CSS left/top for absolute children resolve against the parent's PADDING
  // box; the BCR delta is from the border edge — subtract the parent borders.
  const parentBorders = findNodeComputedStyles(parentId, vpId, ['borderLeftWidth', 'borderTopWidth']);
  const borderL = parseFloat(parentBorders.borderLeftWidth) || 0;
  const borderT = parseFloat(parentBorders.borderTopWidth) || 0;

  // Layout-box top-left from the (possibly rotated) screen AABB: with
  // transform-origin 50% 50% the AABB centre IS the layout-box centre, so
  // layoutLeft = aabbCentreX - layoutW / 2 (collapses to the plain formula
  // when un-rotated).
  const aabbCssW = elScreen.width / scale;
  const aabbCssH = elScreen.height / scale;
  const aabbLeft = (elScreen.left - parentScreen.left) / scale - borderL;
  const aabbTop = (elScreen.top - parentScreen.top) / scale - borderT;
  const left = aabbLeft + (aabbCssW - width) / 2;
  const top = aabbTop + (aabbCssH - height) / 2;

  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const centerXPercent = parentWidth > 0 ? (centerX / parentWidth) * 100 : 50;
  const centerYPercent = parentHeight > 0 ? (centerY / parentHeight) * 100 : 50;

  trace.action('visual-rect:capture', { nodeId, vpId, parentId, scale, borderL, borderT, parentWidth, parentHeight, result: { left, top, width, height } });
  return { left, top, width, height, parentWidth, parentHeight, centerXPercent, centerYPercent };
}
