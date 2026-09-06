// border-overlay-vars.ts — the OVERLAY border (`::after` layer above the
// content, never in flow) driven by CSS custom properties so it ANIMATES with
// framer-motion's own physics (spring / mass / damping) on variant switches.
//
// A pseudo-element cannot be a motion target, but motion animates CSS
// variables on the element like any other value. So in a design-component
// master the rule reads `var(--rvb-*)` and the per-variant VALUES live in the
// variants object (`'--rvb-bw': '2px'`), exactly like backgroundColor: the
// component's transition eases the variables, the `::after` follows. This is
// how the reference gets an eased border while keeping it a layer (2026-09-06).
//
// Pages (no variants) keep the literal rule — nothing to animate between.

import type { BorderState } from './border-utils';

export const BORDER_OVERLAY_VAR_WIDTH = '--rvb-bw';
export const BORDER_OVERLAY_VAR_STYLE = '--rvb-bs';
export const BORDER_OVERLAY_VAR_COLOR = '--rvb-bc';
export const BORDER_OVERLAY_VARS = [BORDER_OVERLAY_VAR_WIDTH, BORDER_OVERLAY_VAR_STYLE, BORDER_OVERLAY_VAR_COLOR] as const;

/** The static `::after` body: geometry + `var()` reads. Written ONCE per node. */
export function formatBorderAfterCSSVars(): string {
  return [
    "content: '';",
    'position: absolute;',
    'inset: 0;',
    'border-radius: inherit;',
    'pointer-events: none;',
    'z-index: 1;',
    `border-width: var(${BORDER_OVERLAY_VAR_WIDTH});`,
    `border-style: var(${BORDER_OVERLAY_VAR_STYLE});`,
    `border-color: var(${BORDER_OVERLAY_VAR_COLOR});`,
  ].map((l) => '  ' + l).join('\n');
}

/** The variable values for a border state (uniform → single value; else the
 *  4-side shorthand — motion interpolates multi-number / multi-color strings). */
export function borderStateToOverlayVars(state: BorderState): Record<string, string> {
  const { top, right, bottom, left } = state;
  if (state.isUniform) {
    return {
      [BORDER_OVERLAY_VAR_WIDTH]: `${top.width}px`,
      [BORDER_OVERLAY_VAR_STYLE]: top.style,
      [BORDER_OVERLAY_VAR_COLOR]: top.color,
    };
  }
  return {
    [BORDER_OVERLAY_VAR_WIDTH]: `${top.width}px ${right.width}px ${bottom.width}px ${left.width}px`,
    [BORDER_OVERLAY_VAR_STYLE]: `${top.style} ${right.style} ${bottom.style} ${left.style}`,
    [BORDER_OVERLAY_VAR_COLOR]: `${top.color} ${right.color} ${bottom.color} ${left.color}`,
  };
}

/** '' for every variable — the delete-this-property write (removes the inline
 *  values on the primary, or a variant entry's override so it inherits). */
export function clearedOverlayVars(): Record<string, string> {
  return { [BORDER_OVERLAY_VAR_WIDTH]: '', [BORDER_OVERLAY_VAR_STYLE]: '', [BORDER_OVERLAY_VAR_COLOR]: '' };
}

export function isVarBackedBorderAfterBody(body: string | null | undefined): boolean {
  return !!body && body.includes(`var(${BORDER_OVERLAY_VAR_WIDTH}`);
}

/** Substitute `var(--rvb-*)` with the tile's effective values so the literal
 *  parser (`parseBorderAfterCSS`) can read the state. Unresolvable vars → ''. */
export function resolveBorderAfterBodyVars(body: string, lookup: (name: string) => string | undefined): string {
  return body.replace(/var\((--rvb-[a-z]+)\)/g, (_m, name: string) => lookup(name) ?? '');
}
