import { describe, it, expect } from 'vitest';
import { checkFile, type FileKind } from './check-file';

// The page root IS the artboard — its size comes from the @canvas viewports
// entry. A viewport-relative size on it resolves against the BROWSER WINDOW,
// so the canvas tile, the Size panel and the live site disagree about how tall
// the page is. PAGE_ROOT_VIEWPORT_SIZE bounces it and names the native shape:
// keep the root px/auto and put the 100vh on a SECTION CHILD.

const CANVAS = `/** @canvas {"viewports":[{"id":"desktop","label":"Desktop","width":1440,"height":900,"isPrimary":true,"order":0}],"positions":{"desktop":{"x":0,"y":0}}} */`;

const page = (rootStyle: string, body = '') => `'use client';
${CANVAS}
export default function Page() {
  return <div data-id="root" data-name="Page" style={${rootStyle}}>
    <div data-id="doc" data-name="Document" style={{ position: 'relative', width: '100%', height: 'auto' }}>
      <p data-id="title" data-name="Title" style={{ position: 'relative', width: 'auto', height: 'auto', margin: '0' }}>Hello</p>
    </div>${body}
  </div>;
}`;

const codes = (code: string, kind: FileKind = 'page') => checkFile(code, { kind }).map((x) => x.code);
const RULE = 'PAGE_ROOT_VIEWPORT_SIZE';

describe('PAGE_ROOT_VIEWPORT_SIZE', () => {
  it('bounces height: 100vh on the page root', () => {
    const style = `{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }`;
    expect(codes(page(style))).toContain(RULE);
  });

  it('names the section-child fix in the message', () => {
    const style = `{ position: 'relative', width: '100%', height: '100vh' }`;
    const msg = checkFile(page(style), { kind: 'page' }).find((x) => x.code === RULE)!.message;
    expect(msg).toMatch(/SECTION CHILD/);
    expect(msg).toMatch(/height: '100vh'/);
  });

  it('bounces every viewport unit, on any size key', () => {
    for (const style of [
      `{ position: 'relative', width: '100vw', height: 'auto' }`,
      `{ position: 'relative', width: '100%', height: '100dvh' }`,
      `{ position: 'relative', width: '100%', height: 'auto', minHeight: '100svh' }`,
      `{ position: 'relative', width: '100%', height: 'auto', maxHeight: '80vmin' }`,
    ]) {
      expect(codes(page(style)), style).toContain(RULE);
    }
  });

  it('bounces a percentage height — no artboard to be a percentage of', () => {
    expect(codes(page(`{ position: 'relative', width: '100%', height: '100%' }`))).toContain(RULE);
  });

  it('accepts px and auto heights, and % or px widths', () => {
    for (const style of [
      `{ position: 'relative', width: '100%', height: 'auto' }`,
      `{ position: 'relative', width: '100%', height: '900px' }`,
      `{ position: 'relative', width: '1440px', height: '900px' }`,
      `{ position: 'relative', width: '100%' }`,
    ]) {
      expect(codes(page(style)), style).not.toContain(RULE);
    }
  });

  it('leaves a 100vh SECTION CHILD alone — that is the prescribed fix', () => {
    const section = `
    <section data-id="hero" data-name="Hero" style={{ position: 'relative', width: '100%', height: '100vh' }}></section>`;
    const out = codes(page(`{ position: 'relative', width: '100%', height: 'auto' }`, section));
    expect(out).not.toContain(RULE);
  });

  it('does not fire on components — only the page artboard has this rule', () => {
    const comp = `'use client';
export default function Card({ ...props }) {
  return <div data-id="root" data-name="Card" style={{ position: 'relative', width: '100%', height: '100vh', ...props.style }}></div>;
}`;
    expect(codes(comp, 'component')).not.toContain(RULE);
  });
});

describe('PAGE_ROOT_VIEWPORT_SIZE — template exemption', () => {
  it('leaves a template LayoutClient root alone (it owns viewport sizing)', () => {
    const tpl = `'use client';
${CANVAS}
export default function LayoutClient({ children }) {
  return <div data-id="root" data-name="Layout" style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>{children}</div>;
}`;
    expect(checkFile(tpl, { kind: 'template' as FileKind }).map((x) => x.code)).not.toContain(RULE);
  });
});
