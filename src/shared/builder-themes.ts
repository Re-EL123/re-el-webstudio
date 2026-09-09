// builder-themes.ts — accent palettes for the BUILDER's own chrome.
//
// This themes the editor UI (`src/styles/globals.css`), NOT the user's website
// tokens in `app/globals.css`. Those are two unrelated systems that happen to
// both use the word "accent".
//
// Only `--accent` and the foreground that sits ON it need declaring: the rest
// of the family is already derived in globals.css via color-mix —
// `--accent-hover`, `--accent-text`, `--accent-strong`, `--accent-muted` all
// key off `var(--accent)`, so overriding the base cascades to all of them.
// The exceptions are the three values that were hand-set hexes:
// `--accent-fg`, `--accent-strong-fg` and `--accent-surface` (a hardcoded
// orange rgba that would stay orange under a green accent).
//
// Per-mode values exist because Monochrome deliberately inverts. The stock
// palette does NOT change hue between light and dark on purpose — see the
// reasoning in globals.css — so Default and Forest simply repeat themselves.

export interface BuilderThemeColors {
  /** `--accent` — the base every other accent token color-mixes from. */
  accent: string;
  /** `--accent-fg` / `--accent-strong-fg` — the label sitting ON the accent. */
  accentFg: string;
}

export interface BuilderTheme {
  id: string;
  label: string;
  light: BuilderThemeColors;
  dark: BuilderThemeColors;
}

export const BUILDER_THEMES: BuilderTheme[] = [
  {
    id: 'default',
    label: 'Re-EL Gold & Navy',
    light: { accent: '#06124A', accentFg: '#ffffff' },
    dark: { accent: '#FFD700', accentFg: '#020A2B' },
  },
  {
    id: 'gold',
    label: 'Re-EL Gold',
    light: { accent: '#FFD700', accentFg: '#020A2B' },
    dark: { accent: '#D4AF00', accentFg: '#020A2B' },
  },
  {
    id: 'navy',
    label: 'Re-EL Navy',
    light: { accent: '#06124A', accentFg: '#ffffff' },
    dark: { accent: '#1E3A8A', accentFg: '#ffffff' },
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    light: { accent: '#111111', accentFg: '#ffffff' },
    dark: { accent: '#ffffff', accentFg: '#111111' },
  },
  {
    id: 'forest',
    label: 'Green Forest',
    light: { accent: '#297f54', accentFg: '#ffffff' },
    dark: { accent: '#297f54', accentFg: '#ffffff' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    light: { accent: '#2a6fbe', accentFg: '#ffffff' },
    dark: { accent: '#2a6fbe', accentFg: '#ffffff' },
  },
  {
    id: 'ember',
    label: 'Ember',
    light: { accent: '#c04832', accentFg: '#ffffff' },
    dark: { accent: '#c04832', accentFg: '#ffffff' },
  },
  {
    id: 'amber',
    label: 'Amber',
    light: { accent: '#e0a83c', accentFg: '#1a1206' },
    dark: { accent: '#e0a83c', accentFg: '#1a1206' },
  },
  {
    id: 'rose',
    label: 'Rose',
    light: { accent: '#ad3f68', accentFg: '#ffffff' },
    dark: { accent: '#ad3f68', accentFg: '#ffffff' },
  },
];

// NOTE: no purple/violet palette on purpose. `--accent-secondary` (#9a66ff)
// is what re-skins the whole chrome inside a component master (App.tsx), and
// a violet theme would make "am I in a component?" unreadable at a glance.

export const DEFAULT_BUILDER_THEME_ID = 'default';

/** Dark-mode `--accent-text` derivation: accent share of the accent/white
 *  color-mix that `editor/builder-theme.ts` paints for non-default themes.
 *  `.dark`'s stylesheet rule collapses --accent-text to the RAW accent —
 *  fine for the bright stock brass (6.4:1 on the dropdown surface), but the
 *  mid-dark palettes were unreadable as text there (Rose sat at 1.9:1 —
 *  the "Upgrade your plan" report). 50/50 is the strongest mix at which
 *  EVERY palette clears WCAG AA (4.5:1) on `--dropdown-bg` #3d3d3d, the
 *  lightest dark chrome surface accent text sits on; the test locks this. */
export const DARK_ACCENT_TEXT_MIX = 0.5;

export function getBuilderThemeById(id: string): BuilderTheme | undefined {
  return BUILDER_THEMES.find((t) => t.id === id);
}
