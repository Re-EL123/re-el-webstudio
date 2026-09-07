import { trace } from '@/shared/debug-trace';

/**
 * Hand keyboard focus back to the parent window after an in-iframe editing
 * session (text edit, shape edit) ends.
 *
 * Both editors live INSIDE the sandbox iframe and are exited by a click that
 * lands in the iframe document (outside-click commit, pen "click away").
 * That click focuses the iframe, so every parent `keydown` listener — undo,
 * copy/paste, duplicate, nudge — goes dead until some later click lands in the
 * parent document (the "I have to click somewhere else first" find). Blurring
 * the focused iframe + `window.focus()` restores the parent as the key target
 * without touching selection.
 */
export function reclaimKeyboardFocus(source: 'text-edit' | 'shape-edit'): void {
  try {
    window.focus();
    const active = document.activeElement as HTMLElement | null;
    const wasIframe = !!active && active.tagName === 'IFRAME';
    if (wasIframe) active!.blur();
    trace.action(`canvas:${source}-focus-reclaimed`, { wasIframe });
  } catch { /* ignore */ }
}
