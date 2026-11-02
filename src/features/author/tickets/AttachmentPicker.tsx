import { useId, useRef, useState } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from '@/lib/constants';
import { formatFileSize } from '@/lib/format';
import { Button } from '@/components/ui/Button';

interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function AttachmentPicker({ files, onChange, disabled }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [rejections, setRejections] = useState<string[]>([]);

  const addFiles = (picked: FileList | null) => {
    if (!picked) return;
    const next = [...files];
    const problems: string[] = [];
    for (const file of Array.from(picked)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        problems.push(`${file.name} is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`);
      } else if (next.some((f) => f.name === file.name && f.size === file.size)) {
        problems.push(`${file.name} is already attached.`);
      } else if (next.length >= MAX_ATTACHMENTS) {
        problems.push(`You can attach up to ${MAX_ATTACHMENTS} files. ${file.name} was not added.`);
      } else {
        next.push(file);
      }
    }
    setRejections(problems);
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (index: number) => {
    setRejections([]);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
          aria-controls={inputId}
        >
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
          Add files
        </Button>
        <span className="text-xs text-slate-500">
          Optional · up to {MAX_ATTACHMENTS} files, {formatFileSize(MAX_ATTACHMENT_BYTES)} each (screenshots, statements)
        </span>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-slate-800">{file.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejections.length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-700" role="alert">
          {rejections.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
