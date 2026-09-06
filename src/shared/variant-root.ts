// variant-root.ts — LEAF (no imports): shared by generator-styles and
// project-fs (a project-fs → generator-styles import cycles into the store,
// which reads projectFS at module init).

/** The variant ROOT's data-id in a component master: the first `data-id` inside
 *  the component's JSX `return`. The JSX return is the `return` whose next
 *  token is `<` (optionally after `(`). The OLD lookup took the FIRST `return`
 *  in the file — which, once a master carried a `MotionLink` wrapper
 *  (`return href ? <Link data-id=…>`) or an overlay effect cleanup
 *  (`return () => {…}`), pointed at the wrong element, so the root's canvas
 *  left/top leaked into its inline style + variants entry and every live
 *  instance rendered shifted by the tile offset (live find 2026-09-06). */
export function findVariantRootId(code: string): string | null {
  const re = /\breturn\s*\(?\s*</g;
  let last = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) last = m.index;
  if (last < 0) return null;
  const first = code.slice(last).match(/data-id="([^"]*)"/);
  return first?.[1] ?? null;
}

/** Span [start, end) of the variant ROOT's opening tag (`<tag … >`), or null. */
export function findVariantRootOpeningTag(code: string): { rootId: string; start: number; end: number } | null {
  const rootId = findVariantRootId(code);
  if (!rootId) return null;
  const idIdx = code.indexOf(`data-id="${rootId}"`);
  if (idIdx < 0) return null;
  const start = code.lastIndexOf('<', idIdx);
  // Walk to the tag's closing `>` honouring {…} expression nesting and quotes.
  let depth = 0; let quote: string | null = null;
  for (let i = start; i < code.length; i++) {
    const ch = code[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return { rootId, start, end: i + 1 };
  }
  return null;
}

/** Insert `attrText` (with its leading space) right after the root's `{...rest}`
 *  (or before it when `before` is set). Returns the code unchanged when the
 *  root tag has no `{...rest}`. */
export function insertAtRootRestSpread(code: string, attrText: string, before = false): string {
  const tag = findVariantRootOpeningTag(code);
  if (!tag) return code;
  const tagText = code.slice(tag.start, tag.end);
  const restIdx = tagText.indexOf('{...rest}');
  if (restIdx < 0) return code;
  const at = before ? restIdx : restIdx + '{...rest}'.length;
  const nextTag = before
    ? tagText.slice(0, at) + attrText.trimStart() + ' ' + tagText.slice(at)
    : tagText.slice(0, at) + attrText + tagText.slice(at);
  return code.slice(0, tag.start) + nextTag + code.slice(tag.end);
}

/** Ensure the variant ROOT carries `data-variant={variant|initialVariant}` — the
 *  live-site carrier for variant-scoped CSS (`[data-variant="v"] …` rules:
 *  per-variant border overlay, :lang). `{variant}` when the master has
 *  connection state, else `{initialVariant}`. Drops a misplaced copy (the old
 *  regex stamper could not cross the `=>` of a root handler attribute and hit
 *  the NEXT data-id element — an overlay — or nothing at all, 2026-09-06).
 *  Returns the code unchanged when no root can be found. Leaf: no imports. */
export function stampRootDataVariantAttr(code: string): string {
  const expr = code.includes('useState(initialVariant)') ? '{variant}' : '{initialVariant}';
  const want = expr.slice(1, -1);
  const tag = findVariantRootOpeningTag(code);
  if (!tag) return code;
  const rootTag = code.slice(tag.start, tag.end);
  const onRoot = rootTag.match(/\sdata-variant=\{(variant|initialVariant)\}/);
  if (onRoot) {
    if (onRoot[1] === want) return code;
    return code.slice(0, tag.start) + rootTag.replace(/data-variant=\{(?:variant|initialVariant)\}/, `data-variant=${expr}`) + code.slice(tag.end);
  }
  const out = code.replace(/\sdata-variant=\{(?:variant|initialVariant)\}/g, '');
  const tag2 = findVariantRootOpeningTag(out);
  if (!tag2) return code;
  const rootTag2 = out.slice(tag2.start, tag2.end);
  const marker = `data-id="${tag2.rootId}"`;
  const at = rootTag2.indexOf(marker) + marker.length;
  return out.slice(0, tag2.start) + rootTag2.slice(0, at) + ` data-variant=${expr}` + rootTag2.slice(at) + out.slice(tag2.end);
}
