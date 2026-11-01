import { AlertCircle, RefreshCw } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { Button } from './ui/Button';

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({ error, title = 'Could not load this', onRetry, retrying }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <AlertCircle className="mb-3 h-8 w-8 text-red-500" aria-hidden />
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-700">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry} loading={retrying}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
