import { describe, it, expect } from 'vitest';
import { updateBorderOverlayStyle, removeBorderOverlayStyle, borderOverlaySelector } from './generator-styles';
import { extractBorderAfterRuleBody, extractVariantBorderAfterRuleBody } from '@/editor/ui/border-utils';
import { extractStyleCSS } from '@/code/parsing/parser';

// Per-variant border overlay (reference parity, 2026-09-06): a design-component
// variant can carry its OWN ::after border via a `data-variant`-scoped rule
// while the other variants keep the base rule.
const MASTER = `'use client';
import React, { useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
const variantConfig = [{ name: 'default', label: 'A', x: 0, y: 0, isPrimary: true }, { name: 'default-hover', label: 'A - Hover', x: 10, y: 0 }];
function A({ style, initialVariant = 'default', ...rest }: any) {
  const [variant, setVariant] = useState(initialVariant);
  return <LayoutGroup>
 <motion.div data-id="r1" {...rest} data-mroot="r1" style={{ position: 'absolute', ...style }}>
  <style>{\`
    [data-id="r1"]::after {
  content: '';
  border-width: 1px;
  border-color: #ffffff;
    }
  \`}</style>
    <div data-id="c1" />
  </motion.div>
 </LayoutGroup>;
}
export default withResponsiveProps(A);`;
const BODY = "  content: '';\n  border-width: 61px;\n  border-color: #ffffff;";

describe('per-variant border overlay', () => {
  it('selector shapes', () => {
    expect(borderOverlaySelector('r1')).toBe('[data-id="r1"]::after');
    expect(borderOverlaySelector('r1', 'default')).toBe('[data-id="r1"]::after');
    expect(borderOverlaySelector('r1', 'default-hover')).toBe('[data-variant="default-hover"] [data-id="r1"]::after, [data-id="r1"][data-variant="default-hover"]::after');
  });

  it('writing on the hover variant adds a scoped rule, keeps the base, and stamps data-variant on the root', () => {
    const out = updateBorderOverlayStyle(MASTER, 'r1', BODY, 'default-hover');
    const css = extractStyleCSS(out);
    expect(css).toContain('[data-id="r1"]::after {');                 // base untouched
    expect(css).toContain('border-width: 1px');
    expect(css).toContain('[data-variant="default-hover"] [data-id="r1"]::after, [data-id="r1"][data-variant="default-hover"]::after {');
    expect(css).toContain('border-width: 61px');
    expect(out).toMatch(/data-variant=\{variant\}/);                  // live carrier
    // reader: hover sees its own rule, default sees the base
    expect(extractBorderAfterRuleBody(css, 'r1', 'default-hover')).toContain('61px');
    expect(extractBorderAfterRuleBody(css, 'r1')).toContain('1px');
    expect(extractVariantBorderAfterRuleBody(css, 'r1', 'default')).toBeNull();
  });

  it('a later BASE write never clobbers the variant rule, and vice versa; removal is per rule', () => {
    let out = updateBorderOverlayStyle(MASTER, 'r1', BODY, 'default-hover');
    out = updateBorderOverlayStyle(out, 'r1', "  content: '';\n  border-width: 3px;\n  border-color: #000000;");
    let css = extractStyleCSS(out);
    expect(css).toContain('border-width: 3px');
    expect(css).toContain('border-width: 61px');
    expect((css.match(/::after\s*\{/g) ?? []).length).toBe(2);
    out = updateBorderOverlayStyle(out, 'r1', "  content: '';\n  border-width: 9px;", 'default-hover');
    css = extractStyleCSS(out);
    expect(css).toContain('border-width: 9px');
    expect(css).not.toContain('border-width: 61px');
    expect(css).toContain('border-width: 3px');
    out = removeBorderOverlayStyle(out, 'r1', 'default-hover');
    css = extractStyleCSS(out);
    expect(css).not.toContain('data-variant="default-hover"');
    expect(css).toContain('border-width: 3px');
    out = removeBorderOverlayStyle(out, 'r1');
    expect(extractStyleCSS(out)).not.toContain('::after');
  });

  it('a variant write on a CHILD node is descendant-scoped too', () => {
    const out = updateBorderOverlayStyle(MASTER, 'c1', BODY, 'default-hover');
    expect(extractStyleCSS(out)).toContain('[data-variant="default-hover"] [data-id="c1"]::after, [data-id="c1"][data-variant="default-hover"]::after {');
  });
});

// Motion needs the DEFAULT entry to carry the vars it animates back to; the
// variant write seeds it from the inline base like any other property.
import { updateNodeInCode } from './generator-crud';
import { updateVariantStyleInCode } from './generator-styles';
import { parseJSXToNodes } from '@/code/parsing/parser';
describe('overlay border vars ride the variants machinery', () => {
  it('inline base + hover entry + seeded default, all parseable', () => {
    const VARS_MASTER = MASTER.replace('<div data-id="c1" />', '<div data-id="c1" />').replace("const variantConfig", "const r1Variants = { default: { display: 'flex' } };\nconst variantConfig")
      .replace('<motion.div data-id="r1" {...rest}', '<motion.div data-id="r1" variants={r1Variants} {...rest}');
    let out = updateNodeInCode(VARS_MASTER, 'r1', { '--rvb-bw': '61px', '--rvb-bs': 'solid', '--rvb-bc': '#ffffff' });
    expect(out).toMatch(/'--rvb-bw': '61px'/);
    out = updateVariantStyleInCode(out, 'r1', 'default-hover', { '--rvb-bw': '2px' });
    const nodes = parseJSXToNodes(out);
    const mv = nodes.get('r1')!.motionVariants as Record<string, Record<string, string>>;
    expect(mv['default-hover']['--rvb-bw']).toBe('2px');
    expect(mv.default['--rvb-bw']).toBe('61px');          // seeded base → animates back
    expect(nodes.get('r1')!.styles['--rvb-bc']).toBe('#ffffff');
  });
});
