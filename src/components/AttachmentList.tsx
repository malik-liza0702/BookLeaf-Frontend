import { Paperclip } from 'lucide-react';
import type { Attachment } from '@/api/types';
import { formatFileSize } from '@/lib/format';

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">Attachments ({attachments.length})</p>
      <ul className="flex flex-wrap gap-2">
        {attachments.map((a, i) => (
          <li
            key={`${a.name}-${i}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            title="File name and size only. Files are not uploaded in this demo."
          >
            <Paperclip className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{a.name}</span>
            <span className="shrink-0 text-slate-400">{formatFileSize(a.size)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
