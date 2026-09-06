import { describe, it, expect } from 'vitest';
import { excludeVariantRoots } from './index';

const nodes = new Map<string, { parentId?: string | null; isCanvasNode?: boolean; attrs?: Record<string, string> }>([
  ['root-1', { parentId: null }],
  ['child-1', { parentId: 'root-1' }],
  ['canvas-1', { parentId: null, isCanvasNode: true }],
  ['ov-1', { parentId: null, attrs: { 'data-overlay': '{}' } }],
]);

describe('excludeVariantRoots', () => {
  it('drops variant roots in a component master, keeps children / canvas nodes / overlays', () => {
    expect(excludeVariantRoots(['root-1', 'child-1', 'canvas-1', 'ov-1'], nodes, 'components/A.tsx'))
      .toEqual(['child-1', 'canvas-1', 'ov-1']);
    expect(excludeVariantRoots(['root-1'], nodes, 'components/A.tsx')).toEqual([]);
  });
  it('is a no-op on pages (top-level page nodes are copyable)', () => {
    expect(excludeVariantRoots(['root-1', 'child-1'], nodes, 'app/page.client.tsx')).toEqual(['root-1', 'child-1']);
  });
});
