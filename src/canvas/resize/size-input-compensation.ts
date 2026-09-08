// size-input-compensation.ts — typing a Width / Height into the Dimensions
// panel on a TRANSFORMED absolute element behaves like the ResizeManager's
// bottom-right handle: the element's own top-left corner (in its rotated
// frame) stays visually fixed, exactly as a handle drag pins the opposite
// corner. Before (2026-09-08) the panel wrote the bare width/height, so with
// transform-origin at the centre a 90°-rotated bar slid along its axis on
// every value change.
//
// Same model as ResizeManager's transform compensation (canvas-math
// getTransformedPoint): with pivot P (box centre) and 2×2 matrix M, the visual
// position of a layout point q is P + M·(q − P). Keep the visual top-left
// fixed across the size change → solve for the new layout left/top.

export interface LayoutBox { left: number; top: number; width: number; height: number }

export function parseMatrix2D(matrixStr: string | undefined | null): { a: number; b: number; c: number; d: number } | null {
  if (!matrixStr || matrixStr === 'none') return null;
  const m = matrixStr.match(/matrix\(([-\d.e+]+),\s*([-\d.e+]+),\s*([-\d.e+]+),\s*([-\d.e+]+),\s*([-\d.e+]+),\s*([-\d.e+]+)\)/);
  if (!m) return null;
  return { a: parseFloat(m[1]), b: parseFloat(m[2]), c: parseFloat(m[3]), d: parseFloat(m[4]) };
}

/** Rotation / skew / flip present (a pure translate or scale needs no compensation). */
export function needsSizeCompensation(matrixStr: string | undefined | null): boolean {
  const m = parseMatrix2D(matrixStr);
  if (!m) return false;
  return Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || m.a < 0 || m.d < 0;
}

function visualPoint(x: number, y: number, box: LayoutBox, m: { a: number; b: number; c: number; d: number }): { x: number; y: number } {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const dx = x - cx, dy = y - cy;
  return { x: cx + m.a * dx + m.c * dy, y: cy + m.b * dx + m.d * dy };
}

/** New layout left/top for the resized box such that the VISUAL top-left
 *  corner stays where it was. `box` is the current layout box (CSS px, parent
 *  space, as painted — i.e. including any translate). */
export function compensatedSizeInput(box: LayoutBox, newWidth: number, newHeight: number, matrixStr: string): { left: number; top: number } {
  const m = parseMatrix2D(matrixStr);
  if (!m) return { left: box.left, top: box.top };
  const fixed = visualPoint(box.left, box.top, box, m);
  const trial: LayoutBox = { left: box.left, top: box.top, width: newWidth, height: newHeight };
  const moved = visualPoint(trial.left, trial.top, trial, m);
  return { left: box.left + (fixed.x - moved.x), top: box.top + (fixed.y - moved.y) };
}

/** Existing translate offset in px for the NEW size (a `-50%` scales with the box). */
export function translateOffsetPx(transform: string | undefined, axis: 'x' | 'y', size: number): number {
  if (!transform) return 0;
  const pair = transform.match(/translate\(\s*([^,)]+)(?:,\s*([^)]+))?\)/i);
  const single = axis === 'x' ? transform.match(/translateX\(\s*([^)]+)\)/i) : transform.match(/translateY\(\s*([^)]+)\)/i);
  const raw = single ? single[1].trim() : pair ? (axis === 'x' ? pair[1] : (pair[2] ?? '0')).trim() : null;
  if (!raw) return 0;
  if (/%$/.test(raw)) return (parseFloat(raw) / 100) * size || 0;
  return parseFloat(raw) || 0;
}

export interface SizeInputWriteArgs {
  styles: Record<string, string>;
  /** Current painted layout box (captureVisualRect). */
  box: LayoutBox;
  parentWidth: number;
  parentHeight: number;
  /** Computed transform matrix string. */
  matrixStr: string;
  newWidth: number;
  newHeight: number;
}

const isPx = (v: string | undefined) => !!v && /^-?[\d.]+px$/.test(v.trim());

/**
 * The style write for a Dimensions-panel size change on a transformed
 * absolute element: the new size plus whichever px insets keep the visual
 * top-left fixed. Axes positioned by a percentage / centering channel are
 * left alone (no positional write on that axis). Null = no compensation
 * applies (no rotation/skew) — the caller writes the plain size.
 */
export function sizeInputWrite(a: SizeInputWriteArgs): Record<string, string> | null {
  if (!needsSizeCompensation(a.matrixStr)) return null;
  const { left, top } = compensatedSizeInput(a.box, a.newWidth, a.newHeight, a.matrixStr);
  // The painted box includes the translate; CSS left/top exclude it.
  const cssLeft = left - translateOffsetPx(a.styles.transform, 'x', a.newWidth);
  const cssTop = top - translateOffsetPx(a.styles.transform, 'y', a.newHeight);
  const out: Record<string, string> = {};
  const r2 = (n: number) => `${Math.round(n * 100) / 100}px`;
  if (a.newWidth !== a.box.width) out.width = r2(a.newWidth);
  if (a.newHeight !== a.box.height) out.height = r2(a.newHeight);
  if (isPx(a.styles.left)) out.left = r2(cssLeft);
  else if (isPx(a.styles.right)) out.right = r2(a.parentWidth - cssLeft - a.newWidth);
  if (isPx(a.styles.top)) out.top = r2(cssTop);
  else if (isPx(a.styles.bottom)) out.bottom = r2(a.parentHeight - cssTop - a.newHeight);
  return out;
}
