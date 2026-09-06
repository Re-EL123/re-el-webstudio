import { describe, it, expect } from 'vitest';
import { InMemoryProjectFS } from './project-fs';

// Masters created before 2026-09-06 spread {...rest} on the root without the
// `data-mroot` marker; loadSnapshot adds it once (attribute-only insert).
describe('loadSnapshot — master root marker heal', () => {
  const master = `'use client';
function A({ style, ...rest }: any) {
  return <motion.div data-id="frame-abc" {...rest} data-name="Frame" style={{ ...style }}>
    <motion.div data-id="child-1" />
  </motion.div>;
}
export default withResponsiveProps(A);`;
  it('adds data-mroot with the root id after {...rest}', () => {
    const fs = new InMemoryProjectFS(new Map<string, string>());
    fs.loadSnapshot(new Map([['components/A.tsx', master], ['app/page.client.tsx', '<div data-id="root" />']]));
    const healed = fs.readFile('components/A.tsx') as string;
    expect(healed).toContain('data-id="frame-abc" {...rest} data-mroot="frame-abc"');
    expect((healed.match(/data-mroot=/g) ?? []).length).toBe(1);
    expect(fs.readFile('app/page.client.tsx')).toBe('<div data-id="root" />');
  });
  it('finds {...rest} even when variants={…} sits between data-id and the spread', () => {
    const m = `'use client';
const variantConfig = [{ name: 'default', label: 'Frame', x: 0, y: 0, isPrimary: true }];
const frameAbcVariants = { default: { display: 'flex' } };
function A({ style, ...rest }: any) {
  const [o, setO] = useState(false);
  useLayoutEffect(() => { if (!o) return; return () => {}; }, [o]);
  return <LayoutGroup>
 <motion.div layout={true} data-id="frame-abc" variants={__applyInstanceSize(frameAbcVariants, __instW, __instH)} {...rest} data-name="Frame" style={{ ...style }}>
    <div data-id="child-1" />
  </motion.div>
 </LayoutGroup>;
}
export default withResponsiveProps(A);`;
    const fs = new InMemoryProjectFS(new Map<string, string>());
    fs.loadSnapshot(new Map([['components/A.tsx', m]]));
    const healed = fs.readFile('components/A.tsx') as string;
    expect(healed).toContain('{...rest} data-mroot="frame-abc"');
    expect((healed.match(/data-mroot=/g) ?? []).length).toBe(1);
  });
  it('attaches ref={ovRootRef} to the root when the master declares the ref but the root lacks it', () => {
    const m = `const variantConfig = [];
function A({ style, ...rest }: any) {
  const ovRootRef = useRef(null);
  return <LayoutGroup>
 <motion.div data-id="frame-abc" variants={v} {...rest} data-name="Frame" style={{ ...style }} />
 </LayoutGroup>;
}`;
    const fs = new InMemoryProjectFS(new Map<string, string>());
    fs.loadSnapshot(new Map([['components/A.tsx', m]]));
    const healed = fs.readFile('components/A.tsx') as string;
    expect(healed).toContain('variants={v} ref={ovRootRef} {...rest} data-mroot="frame-abc"');
  });
  it('is idempotent and leaves masters that already carry it alone', () => {
    const fs = new InMemoryProjectFS(new Map<string, string>());
    const already = master.replace('{...rest}', '{...rest} data-mroot="frame-abc"');
    fs.loadSnapshot(new Map([['components/A.tsx', already]]));
    expect(fs.readFile('components/A.tsx')).toBe(already);
  });
});
