import { describe, it, expect } from 'vitest';
import { isCanvasChromeWheel, CANVAS_WHEEL_MARKER } from './useCanvasTransform';

// A pinch/wheel with the cursor on a body-portalled connection handle zoomed
// the BROWSER instead of the canvas (2026-09-07): the handle sits outside the
// canvas container, so its wheel never reached the container listener. Marked
// chrome outside the container is routed to the canvas zoom handler.
describe('isCanvasChromeWheel', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  it('routes marked chrome outside the container', () => {
    const handle = document.createElement('svg');
    handle.setAttribute(CANVAS_WHEEL_MARKER, '');
    const inner = document.createElement('path');
    handle.appendChild(inner);
    document.body.appendChild(handle);
    expect(isCanvasChromeWheel(inner, container)).toBe(true);
    expect(isCanvasChromeWheel(handle, container)).toBe(true);
  });

  it('ignores unmarked elements (panels) and anything inside the container', () => {
    const panel = document.createElement('div');
    document.body.appendChild(panel);
    expect(isCanvasChromeWheel(panel, container)).toBe(false);
    const inside = document.createElement('div');
    inside.setAttribute(CANVAS_WHEEL_MARKER, '');
    container.appendChild(inside);
    expect(isCanvasChromeWheel(inside, container)).toBe(false); // container's own listener handles it
    expect(isCanvasChromeWheel(null, container)).toBe(false);
  });
});
