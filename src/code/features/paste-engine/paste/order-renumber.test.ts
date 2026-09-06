import { describe, it, expect } from 'vitest';
import { computePasteOrderAssignments } from './order-renumber';
import type { CanvasNode } from '@/code/parsing/parser';

const mk = (id: string, styles: Record<string, string> = {}, extra: Partial<CanvasNode> = {}): CanvasNode =>
  ({ id, type: 'div', children: [], styles, attrs: {}, isCanvasNode: false, ...extra } as CanvasNode);

describe('computePasteOrderAssignments', () => {
  it('Cmd+D on a flex child: clone lands right after its source, siblings renumbered uniquely', () => {
    const parent = mk('p', { display: 'flex' }, { children: ['a', 'b', 'c'] });
    const nodes = new Map([['p', parent], ['a', mk('a', { order: '0' })], ['b', mk('b', { order: '1' })], ['c', mk('c', { order: '2' })]]);
    const out = computePasteOrderAssignments(parent, nodes, [{ sourceId: 'a', newId: 'a2' }]);
    // desired: a, a2, b, c → a stays 0, a2=1, b→2, c→3
    expect(out).toEqual([{ nodeId: 'a2', order: 1 }, { nodeId: 'b', order: 2 }, { nodeId: 'c', order: 3 }]);
  });
  it('respects VISUAL order (numeric order beats source index) — the shuffled-sections case', () => {
    const parent = mk('p', { display: 'flex' }, { children: ['a', 'b', 'c'] });
    // source order a,b,c but visual order c,a,b via `order`
    const nodes = new Map([['p', parent], ['a', mk('a', { order: '1' })], ['b', mk('b', { order: '2' })], ['c', mk('c', { order: '0' })]]);
    const out = computePasteOrderAssignments(parent, nodes, [{ sourceId: 'c', newId: 'c2' }]);
    // desired: c, c2, a, b → c 0 (same), c2 1, a 2, b 3
    expect(out).toEqual([{ nodeId: 'c2', order: 1 }, { nodeId: 'a', order: 2 }, { nodeId: 'b', order: 3 }]);
  });
  it('a flex child with NO explicit order still gets sequential numbers (component instance case)', () => {
    const parent = mk('p', { display: 'flex', flexDirection: 'row' }, { children: ['x', 'inst'] });
    const nodes = new Map([['p', parent], ['x', mk('x')], ['inst', mk('inst', { order: '0' }, { componentFile: 'components/D.tsx' })]]);
    const out = computePasteOrderAssignments(parent, nodes, [{ sourceId: 'inst', newId: 'inst2' }]);
    // x had no explicit order → stamped 0 (like the drag path); inst 0→1; clone 2
    expect(out).toEqual([{ nodeId: 'x', order: 0 }, { nodeId: 'inst', order: 1 }, { nodeId: 'inst2', order: 2 }]);
  });
  it('no-op for a non-layout parent, and for a source outside the parent', () => {
    const block = mk('p', { display: 'block' }, { children: ['a'] });
    expect(computePasteOrderAssignments(block, new Map([['p', block], ['a', mk('a')]]), [{ sourceId: 'a', newId: 'a2' }])).toEqual([]);
    const flex = mk('p', { display: 'flex' }, { children: ['a'] });
    expect(computePasteOrderAssignments(flex, new Map([['p', flex], ['a', mk('a')]]), [{ sourceId: 'zzz', newId: 'z2' }])).toEqual([]);
  });
  it('never renumbers template chrome, the children slot or overlays', () => {
    const parent = mk('p', { display: 'flex' }, { children: ['layout::nav', 'a', 'children-slot', 'ov'] });
    const nodes = new Map([['p', parent], ['layout::nav', mk('layout::nav', { order: '0' })], ['a', mk('a', { order: '1' })],
      ['ov', mk('ov', { order: '5' }, { attrs: { 'data-overlay': '{}' } } as any)]]);
    const out = computePasteOrderAssignments(parent, nodes, [{ sourceId: 'a', newId: 'a2' }]);
    expect(out.map(o => o.nodeId)).toEqual(['a', 'a2']);
    expect(out).toEqual([{ nodeId: 'a', order: 0 }, { nodeId: 'a2', order: 1 }]);
  });
});
