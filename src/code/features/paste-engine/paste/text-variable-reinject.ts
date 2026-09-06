// text-variable-reinject.ts — keep a text node's Content variable across a
// paste / duplicate INSIDE the same design component master.
//
// A copied text bound to a component prop (`{content}`) is baked to its
// literal for the clipboard so it can land anywhere. When the paste target is
// the very master that declares the prop, the clone must stay bound — the
// user's rule (2026-09-06): "the same variable should be kept, only within the
// same design component". Anywhere else the literal stays (the prop does not
// exist there).

import { queueMutation } from '@/code/mutation/mutation-queue';
import { isComponentFilePath } from '@/code/project/active-file-store';
import { trace } from '@/shared/debug-trace';
import type { ClipboardNode, PasteContext } from '../types';
import type { IdMapper } from '../core/id-mapper';

/** Pure decision: does this paste keep component-variable bindings? */
export function keepsVariableBindings(ctx: Pick<PasteContext, 'activeFilePath' | 'sourceFilePath'>): boolean {
  return !!ctx.activeFilePath && !!ctx.sourceFilePath
    && ctx.activeFilePath === ctx.sourceFilePath
    && isComponentFilePath(ctx.activeFilePath);
}

export function reinjectTextVariables(
  clipboardNodes: ClipboardNode[],
  idMapper: IdMapper,
  ctx: Pick<PasteContext, 'activeFilePath' | 'sourceFilePath'>,
): number {
  if (!keepsVariableBindings(ctx)) return 0;
  let n = 0;
  for (const cn of clipboardNodes) {
    if (!cn.textVariable) continue;
    for (const newId of idMapper.getNewIdsForClipboard(cn.id)) {
      queueMutation({ type: 'bindTextVariable', nodeId: newId, propName: cn.textVariable });
      n++;
    }
  }
  if (n) trace.action('paste:text-variables-rebound', { count: n, file: ctx.activeFilePath });
  return n;
}
