import { describe, it, expect } from 'vitest';
import { formatBorderAfterCSSVars, borderStateToOverlayVars, clearedOverlayVars, isVarBackedBorderAfterBody, resolveBorderAfterBodyVars } from './border-overlay-vars';
import { parseBorderAfterCSS, type BorderState } from './border-utils';

const side = (width: number, color = '#ffffff', style = 'solid') => ({ width, style, color });
const uniform: BorderState = { top: side(61), right: side(61), bottom: side(61), left: side(61), isUniform: true };
const mixed: BorderState = { top: side(1, '#a7a7a7'), right: side(0, '#000000'), bottom: side(1, '#a7a7a7'), left: side(0, '#000000'), isUniform: false };

describe('variable-backed overlay border', () => {
  it('the ::after body reads the three variables and keeps the layer geometry', () => {
    const body = formatBorderAfterCSSVars();
    expect(body).toContain('position: absolute;');
    expect(body).toContain('inset: 0;');
    expect(body).toContain('pointer-events: none;');
    expect(body).toContain('border-width: var(--rvb-bw);');
    expect(body).toContain('border-style: var(--rvb-bs);');
    expect(body).toContain('border-color: var(--rvb-bc);');
    expect(isVarBackedBorderAfterBody(body)).toBe(true);
    expect(isVarBackedBorderAfterBody("border-width: 61px;")).toBe(false);
  });
  it('state ↔ vars round-trips through the literal parser (uniform + per-side)', () => {
    for (const st of [uniform, mixed]) {
      const vars = borderStateToOverlayVars(st);
      const literal = resolveBorderAfterBodyVars(formatBorderAfterCSSVars(), (n) => vars[n]);
      const parsed = parseBorderAfterCSS(literal)!;
      expect(parsed.isUniform).toBe(st.isUniform);
      expect(parsed.top.width).toBe(st.top.width);
      expect(parsed.right.width).toBe(st.right.width);
      expect(parsed.top.color.toLowerCase()).toBe(st.top.color);
    }
    expect(borderStateToOverlayVars(mixed)['--rvb-bw']).toBe('1px 0px 1px 0px');
  });
  it('cleared vars delete all three', () => {
    expect(clearedOverlayVars()).toEqual({ '--rvb-bw': '', '--rvb-bs': '', '--rvb-bc': '' });
  });
});
