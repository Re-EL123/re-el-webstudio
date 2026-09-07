// ExportConfirmModal.tsx — fidelity confirmation for TRANSFORMATIVE export
// formats (plain Vite project, static HTML + CSS). Source export ships the
// project verbatim and never shows this. Same compact centered shell as the
// component-name dialog, so it reads as part of the same family.

import { CompactModalShell } from './NameInputModal';
import type { ExportFormat } from '../header/ExportDropdown';
import { trace } from '@/shared/debug-trace';

/** Formats that go through a transform step and need the confirmation. */
export const TRANSFORMATIVE_FORMATS: ReadonlySet<ExportFormat> = new Set<ExportFormat>(['vite', 'static']);

const COPY: Record<'vite' | 'static', { title: string; body: string }> = {
  vite: {
    title: 'Export as Vite project',
    body: 'This export rewrites the project from Next.js into a plain Vite + React app. Routing, links and translations run on replacement libraries, so the result may not match the source project exactly.',
  },
  static: {
    title: 'Export as HTML + CSS',
    body: 'This export renders each page once and removes all JavaScript. Animations, variants, hover states, overlays, forms and other interactive features will not work, and the result may not match the source project exactly.',
  },
};

interface Props {
  format: ExportFormat | null;
  exporting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ExportConfirmModal({ format, exporting, onConfirm, onClose }: Props) {
  const copy = format === 'vite' || format === 'static' ? COPY[format] : null;
  const isOpen = !!copy;
  return (
    <CompactModalShell isOpen={isOpen} onClose={onClose} title={copy?.title ?? ''}>
      <div className="p-3 flex flex-col gap-3">
        <p className="text-[11px] leading-snug text-[var(--text-secondary)]">{copy?.body}</p>
        <button
          type="button"
          onClick={() => { trace.action('export-confirm:accept', { format }); onConfirm(); }}
          disabled={exporting}
          className="w-full h-8 text-xs font-medium cut-corners transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: 'var(--accent, #3388ff)', color: 'var(--accent-fg)' }}
        >
          {exporting ? 'Exporting…' : 'I understand, download'}
        </button>
      </div>
    </CompactModalShell>
  );
}
