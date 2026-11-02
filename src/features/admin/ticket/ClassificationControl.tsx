import { RotateCcw, Sparkles } from 'lucide-react';
import type { AiStatus } from '@/api/types';
import { ClassificationHint, ClassifyingLabel } from '@/components/ClassificationState';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { formatConfidence } from '@/lib/format';

interface ClassificationControlProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  aiValue: T | null;
  aiStatus: AiStatus;
  aiConfidence: number | null;
  overridden: boolean;
  disabled?: boolean;
  onChange: (value: T) => void;
  onReset: () => void;
}

export function ClassificationControl<T extends string>({
  id,
  label,
  value,
  options,
  aiValue,
  aiStatus,
  aiConfidence,
  overridden,
  disabled,
  onChange,
  onReset,
}: ClassificationControlProps<T>) {
  const pending = aiStatus === 'pending';
  const differsFromAi = aiValue !== null && value !== aiValue;
  const confidence = formatConfidence(aiConfidence);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {pending ? (
          <ClassifyingLabel />
        ) : overridden && differsFromAi ? (
          <Badge tone="amber" title="Changed by an admin. The AI's suggestion is shown below.">
            Overridden
          </Badge>
        ) : (
          <ClassificationHint aiStatus={aiStatus} />
        )}
      </div>
      <Select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      {!pending && aiValue && (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Sparkles className="h-3 w-3 shrink-0 text-violet-500" aria-hidden />
            <span className="truncate">
              {aiStatus === 'failed' ? 'Rules suggested' : 'AI suggested'}: <span className="font-medium text-slate-700">{aiValue}</span>
              {confidence && aiStatus !== 'failed' ? ` · ${confidence} confidence` : ''}
            </span>
          </span>
          {differsFromAi && (
            <button
              type="button"
              onClick={onReset}
              disabled={disabled}
              className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700 hover:underline disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset to AI
            </button>
          )}
        </div>
      )}
    </div>
  );
}
