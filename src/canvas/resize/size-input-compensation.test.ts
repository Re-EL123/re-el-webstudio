import { describe, it, expect } from 'vitest';
import { compensatedSizeInput, sizeInputWrite, needsSizeCompensation, translateOffsetPx, parseMatrix2D } from './size-input-compensation';

const ROT90 = 'matrix(0, 1, -1, 0, 0, 0)';
const vis = (x: number, y: number, box: { left: number; top: number; width: number; height: number }, m: { a: number; b: number; c: number; d: number }) => {
  const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
  return { x: cx + m.a * (x - cx) + m.c * (y - cy), y: cy + m.b * (x - cx) + m.d * (y - cy) };
};

describe('compensatedSizeInput', () => {
  it('keeps the VISUAL top-left corner fixed when the width changes on a 90° bar (the user\'s case)', () => {
    const box = { left: 112, top: 610, width: 1119, height: 75.9 };
    const m = parseMatrix2D(ROT90)!;
    const before = vis(box.left, box.top, box, m);
    const { left, top } = compensatedSizeInput(box, 371, 75.9, ROT90);
    const after = vis(left, top, { left, top, width: 371, height: 75.9 }, m);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    // rotated 90°: shrinking the layout width moves the box along the visual Y axis, not X
    expect(left).toBeCloseTo(112 + (1119 - 371) / 2, 6);
  });
  it('is the identity without a rotation', () => {
    expect(compensatedSizeInput({ left: 10, top: 20, width: 100, height: 50 }, 300, 80, 'matrix(1, 0, 0, 1, 0, 0)')).toEqual({ left: 10, top: 20 });
    expect(needsSizeCompensation('matrix(1, 0, 0, 1, 5, 5)')).toBe(false);
    expect(needsSizeCompensation('none')).toBe(false);
    expect(needsSizeCompensation(ROT90)).toBe(true);
  });
});

describe('translateOffsetPx', () => {
  it('scales a percentage translate with the NEW size', () => {
    expect(translateOffsetPx('translateY(-50%) rotate(90deg)', 'y', 80)).toBe(-40);
    expect(translateOffsetPx('translateY(-50%) rotate(90deg)', 'x', 80)).toBe(0);
    expect(translateOffsetPx('translate(-50%, 10px)', 'x', 200)).toBe(-100);
    expect(translateOffsetPx('translate(-50%, 10px)', 'y', 200)).toBe(10);
  });
});

describe('sizeInputWrite', () => {
  it('writes width + the px insets that hold the corner (left px, bottom px)', () => {
    const styles = { position: 'absolute', width: '1119px', height: '75.9px', left: '112px', bottom: '101px', transform: 'translateY(-50%) rotate(90deg)' };
    const box = { left: 112, top: 610 - 37.95, width: 1119, height: 75.9 }; // painted box includes translateY(-50%)
    const out = sizeInputWrite({ styles, box, parentWidth: 1119, parentHeight: 671, matrixStr: ROT90, newWidth: 371, newHeight: 75.9 })!;
    expect(out.width).toBe('371px');
    expect(out.left).toBe(`${Math.round((112 + (1119 - 371) / 2) * 100) / 100}px`);
    expect(out.top).toBeUndefined();
    expect(out.bottom).toBeDefined();
    // bottom = parentH − (cssTop + h); cssTop = paintedTop − ty(new) = paintedTop + 37.95
    const paintedTop = box.top; // unchanged by a width change at 90°? no — compensation may shift it; recompute
    const { top } = compensatedSizeInput(box, 371, 75.9, ROT90);
    expect(parseFloat(out.bottom)).toBeCloseTo(671 - ((top + 37.95) + 75.9), 1);
    void paintedTop;
  });
  it('returns null (plain write) when nothing rotates, and skips a %-positioned axis', () => {
    expect(sizeInputWrite({ styles: { left: '10px', top: '10px' }, box: { left: 10, top: 10, width: 100, height: 50 }, parentWidth: 500, parentHeight: 500, matrixStr: 'none', newWidth: 200, newHeight: 50 })).toBeNull();
    const out = sizeInputWrite({ styles: { left: '50%', top: '10px', transform: 'translateX(-50%) rotate(45deg)' }, box: { left: 200, top: 10, width: 100, height: 50 }, parentWidth: 500, parentHeight: 500, matrixStr: 'matrix(0.707, 0.707, -0.707, 0.707, 0, 0)', newWidth: 200, newHeight: 50 })!;
    expect(out.left).toBeUndefined();
    expect(out.right).toBeUndefined();
    expect(out.top).toBeDefined();
  });
});
