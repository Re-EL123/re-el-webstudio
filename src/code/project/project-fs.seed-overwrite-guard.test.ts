import { describe, it, expect } from 'vitest';
import { InMemoryProjectFS, createDefaultProject, createEmptyProject, isSeedPageBody } from './project-fs';

// A real page must never be replaced by a byte-identical starter page body
// (Home page lost to the default starter on 2026-09-06).
describe('ProjectFS seed-overwrite guard', () => {
  const seedHome = createDefaultProject().get('app/page.client.tsx')!;
  const emptyHome = createEmptyProject().get('app/page.client.tsx')!;
  const real = `'use client';\nexport default function Page() { return <div data-id="root"><section data-id="hero">mine</section></div>; }`;

  it('refuses to overwrite a real page with the default or empty starter body', () => {
    const fs = new InMemoryProjectFS(new Map([['app/page.client.tsx', real]]));
    fs.writeFile('app/page.client.tsx', seedHome);
    expect(fs.readFile('app/page.client.tsx')).toBe(real);
    fs.writeFile('app/page.client.tsx', emptyHome);
    expect(fs.readFile('app/page.client.tsx')).toBe(real);
  });
  it('still allows seeding a file that does not exist, replacing a seed with a seed, and normal edits', () => {
    const fs = new InMemoryProjectFS(new Map<string, string>());
    fs.writeFile('app/page.client.tsx', seedHome);          // fresh project
    expect(fs.readFile('app/page.client.tsx')).toBe(seedHome);
    fs.writeFile('app/page.client.tsx', emptyHome);         // seed → seed
    expect(fs.readFile('app/page.client.tsx')).toBe(emptyHome);
    fs.writeFile('app/page.client.tsx', real);              // user edit
    expect(fs.readFile('app/page.client.tsx')).toBe(real);
    fs.writeFile('app/page.client.tsx', real + '\n// edit'); // another edit
    expect(fs.readFile('app/page.client.tsx')).toContain('// edit');
  });
  it('isSeedPageBody recognises only the byte-identical starter bodies', () => {
    expect(isSeedPageBody(seedHome)).toBe(true);
    expect(isSeedPageBody(emptyHome)).toBe(true);
    expect(isSeedPageBody(seedHome + ' ')).toBe(false);
    expect(isSeedPageBody(real)).toBe(false);
  });
});
