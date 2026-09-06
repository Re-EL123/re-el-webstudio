import { describe, it, expect } from 'vitest';
import { keepsVariableBindings } from './text-variable-reinject';
import { bindTextNodeToPropInCode } from '@/code/features/variable-ops';

describe('keepsVariableBindings', () => {
  it('true only for a paste into the SAME component master', () => {
    expect(keepsVariableBindings({ activeFilePath: 'components/A.tsx', sourceFilePath: 'components/A.tsx' })).toBe(true);
    expect(keepsVariableBindings({ activeFilePath: 'components/B.tsx', sourceFilePath: 'components/A.tsx' })).toBe(false);
    expect(keepsVariableBindings({ activeFilePath: 'app/page.client.tsx', sourceFilePath: 'app/page.client.tsx' })).toBe(false);
    expect(keepsVariableBindings({ activeFilePath: 'components/A.tsx', sourceFilePath: null })).toBe(false);
  });
});

describe('bindTextNodeToPropInCode', () => {
  const MASTER = `function A({ style, content = "Stack", ...rest }: any) {
  return <div data-id="r1" {...rest}>
    <p data-id="t1">{content}</p>
    <p data-id="t2">Stack</p>
  </div>;
}`;
  it('binds the clone to the existing prop and leaves the declared default alone', () => {
    const out = bindTextNodeToPropInCode(MASTER, 't2', 'content');
    expect(out).toMatch(/data-id="t2">\s*\{content\}\s*<\/p>/);
    expect(out).toContain('content = "Stack"');
    expect((out.match(/content = /g) ?? []).length).toBe(1);
  });
});
