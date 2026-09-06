import { describe, it, expect } from 'vitest';
import { radiusHandleFits, MIN_ELEMENT_SCREEN_PX } from './BorderRadiusHandle';
const box = (w: number, h: number) => ({ TL: { x: 100, y: 100 }, TR: { x: 100 + w, y: 100 }, BL: { x: 100, y: 100 + h }, BR: { x: 100 + w, y: 100 + h } });
describe('radiusHandleFits', () => {
  it('hides on a small on-screen element, shows once both axes have room', () => {
    expect(radiusHandleFits(box(40, 40))).toBe(false);
    expect(radiusHandleFits(box(200, 30))).toBe(false);
    expect(radiusHandleFits(box(MIN_ELEMENT_SCREEN_PX, MIN_ELEMENT_SCREEN_PX))).toBe(true);
    expect(radiusHandleFits(box(300, 120))).toBe(true);
    expect(radiusHandleFits(null)).toBe(false);
  });
  it('measures screen size even when the element is rotated', () => {
    const rot = { TL: { x: 0, y: 0 }, TR: { x: 60, y: 60 }, BL: { x: -60, y: 60 }, BR: { x: 0, y: 120 } }; // 85px sides
    expect(radiusHandleFits(rot)).toBe(true);
  });
});
