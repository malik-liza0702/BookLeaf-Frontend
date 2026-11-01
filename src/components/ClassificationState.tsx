import { Sparkles } from 'lucide-react';
import type { AiStatus } from '@/api/types';
import { Spinner } from './ui/Spinner';

/** Inline "Classifying…" while AI triage is running. */
export function ClassifyingLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700" role="status">
      <Spinner className="h-3 w-3" />
      Classifying…
    </span>
  );
}

/** Small provenance hint under a category/priority value. */
export function ClassificationHint({ aiStatus }: { aiStatus: AiStatus }) {
  if (aiStatus === 'failed') {
    return (
      <span
        className="text-[11px] text-slate-400"
        title="AI classification failed, so category and priority were set by keyword rules. Review before acting."
      >
        rules fallback
      </span>
    );
  }
  if (aiStatus === 'done') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-violet-500" title="Classified by AI">
        <Sparkles className="h-3 w-3" aria-hidden />
        AI
      </span>
    );
  }
  return null;
}
