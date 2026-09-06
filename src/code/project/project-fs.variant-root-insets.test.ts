import { describe, it, expect } from 'vitest';
import { InMemoryProjectFS, stripVariantRootInsets } from './project-fs';
import { findVariantRootId } from '@/shared/variant-root';

// A master whose file has `return`s BEFORE the JSX return: a MotionLink wrapper
// (`return href ? <Link data-id=…>`) and an overlay effect cleanup
// (`return () => {…}`). The old root lookup took the first `return` in the
// file → wrong root → canvas left/top leaked into the root style + variants.
const MASTER = `'use client';
import React, { useState, useLayoutEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
const MotionLink = motion.create(React.forwardRef(function MotionLinkBase({ href, ...props }: any, ref: any) {
  return href ? <Link data-id="Link-mtpwdpyk-1" ref={ref} href={href} {...props} /> : <div ref={ref} {...props} />;
}));
const variantConfig = [{ name: 'default', label: 'Frame', x: -223, y: -90, isPrimary: true }];
const frameMtptz51xDVariants = {
  default: {
    display: 'flex',
    backgroundColor: '#000000', left: '-317px', top: '-152px',}
};
function DuLiPa({ style, initialVariant = 'default', ...rest }: any) {
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {};
    window.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); };
  }, [open]);
  return <LayoutGroup>
 <motion.div layout={true} data-id="frame-mtptz51x-d" variants={frameMtptz51xDVariants} {...rest} data-name="Frame" style={{
      position: 'absolute',
      backgroundColor: '#000000',
      display: 'flex',  left: '-317px', top: '-152px',  width: '126px', height: '184px', ...style
    }}>
      <div data-id="child-1" style={{ left: '4px', top: '4px' }} />
    </motion.div>
 </LayoutGroup>;
}
export default withResponsiveProps(DuLiPa);`;

describe('findVariantRootId', () => {
  it('skips non-JSX returns (MotionLink, effect cleanup) and finds the real root', () => {
    expect(findVariantRootId(MASTER)).toBe('frame-mtptz51x-d');
  });
  it('plain master', () => {
    expect(findVariantRootId(`function A(){ return (<motion.div data-id="r"><p data-id="t"/></motion.div>); }`)).toBe('r');
    expect(findVariantRootId(`const x = 1;`)).toBeNull();
  });
});

describe('stripVariantRootInsets + loadSnapshot heal', () => {
  it('removes px insets from the ROOT style and its variants object only', () => {
    const out = stripVariantRootInsets(MASTER);
    expect(out).not.toMatch(/left: '-317px'|top: '-152px'/);
    expect(out).toContain("display: 'flex',  width: '126px', height: '184px', ...style");
    expect(out).toContain("backgroundColor: '#000000',}");     // variants entry stripped
    expect(out).toContain("left: '4px', top: '4px'");           // child untouched
    expect(out).toContain("position: 'absolute'");              // position kept (master tiling)
    expect(stripVariantRootInsets(out)).toBe(out);              // idempotent
  });
  it('handles the instance-size spread (`...__instStyle`) — the shape the live file had', () => {
    const inst = MASTER.replace("display: 'flex',  left: '-317px', top: '-152px',  width: '126px', height: '184px', ...style",
      "display: 'flex',  left: '-356px', top: '-152px', ...__instStyle,  width: '291px', height: '289px'");
    const out = stripVariantRootInsets(inst);
    expect(out).not.toContain("'-356px'");
    expect(out).toContain("display: 'flex', ...__instStyle,  width: '291px', height: '289px'");
  });
  it('loadSnapshot applies it to components only and keeps the result parseable', () => {
    const fs = new InMemoryProjectFS(new Map<string, string>());
    fs.loadSnapshot(new Map([['components/DuLiPa.tsx', MASTER], ['app/page.client.tsx', "<div data-id=\"root\" style={{ left: '1px' }} />"]]));
    expect(fs.readFile('components/DuLiPa.tsx')).not.toContain("'-317px'");
    expect(fs.readFile('app/page.client.tsx')).toContain("left: '1px'");
  });
});

// data-variant must sit on the ROOT — the old regex stamper could not cross the
// `=>` of a root handler attribute (stamped the overlay, or nothing).
import { stampRootDataVariantAttr } from '@/shared/variant-root';
describe('stampRootDataVariantAttr + load heal', () => {
  const master = (rootExtra: string, overlayExtra = '') => `const variantConfig = [];
function A({ style, initialVariant = 'default', ...rest }: any) {
  const [variant, setVariant] = useState(initialVariant);
  return <LayoutGroup>
 <motion.div onHoverEnd={() => { const _n = variant === 'h' ? 'default' : null; if (_n) setVariant(_n); }} layout={true} data-id="r1"${rootExtra} {...rest} data-mroot="r1" style={{ ...style }}>
  <style>{\`
    [data-variant="h"] [data-id="r1"]::after, [data-id="r1"][data-variant="h"]::after { border-width: 2px; }
  \`}</style>
  <AnimatePresence>{open && (<motion.div key="ov" data-id="ov"${overlayExtra} data-overlay='{}' />)}</AnimatePresence>
 </motion.div>
 </LayoutGroup>;
}`;
  it('stamps the root even when handler arrows precede data-id', () => {
    const out = stampRootDataVariantAttr(master(''));
    expect(out).toContain('data-id="r1" data-variant={variant} {...rest}');
    expect(out).not.toContain('data-id="ov" data-variant');
  });
  it('moves a misplaced copy from the overlay onto the root', () => {
    const out = stampRootDataVariantAttr(master('', ' data-variant={variant}'));
    expect(out).toContain('data-id="r1" data-variant={variant} {...rest}');
    expect(out).not.toContain('data-id="ov" data-variant');
    expect((out.match(/data-variant=\{variant\}/g) ?? []).length).toBe(1);
  });
  it('idempotent, and upgrades initialVariant → variant when state exists', () => {
    const once = stampRootDataVariantAttr(master(''));
    expect(stampRootDataVariantAttr(once)).toBe(once);
    const up = stampRootDataVariantAttr(master(' data-variant={initialVariant}'));
    expect(up).toContain('data-id="r1" data-variant={variant} {...rest}');
  });
  it('loadSnapshot heals masters that carry [data-variant] rules', () => {
    const fs = new InMemoryProjectFS(new Map<string, string>());
    fs.loadSnapshot(new Map([['components/A.tsx', master('')]]));
    expect(fs.readFile('components/A.tsx')).toContain('data-id="r1" data-variant={variant}');
  });
});
