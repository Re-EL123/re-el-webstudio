import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reclaimKeyboardFocus } from './reclaim-keyboard-focus';

// Regression: after a shape-edit outside-click commit the sandbox iframe kept
// keyboard focus, so the parent's Cmd+Z never fired until the user clicked
// somewhere else. Text edit had the same find earlier; both share this helper.
describe('reclaimKeyboardFocus', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('blurs a focused iframe and focuses the parent window', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.focus();
    expect(document.activeElement).toBe(iframe);
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {});
    reclaimKeyboardFocus('shape-edit');
    expect(focusSpy).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(iframe);
  });

  it('leaves a focused parent input alone', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    vi.spyOn(window, 'focus').mockImplementation(() => {});
    reclaimKeyboardFocus('text-edit');
    expect(document.activeElement).toBe(input);
  });
});
