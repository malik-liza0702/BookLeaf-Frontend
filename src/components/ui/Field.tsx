import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const controlBase =
  'block w-full rounded-md border bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-50 disabled:text-slate-500';

function controlClass(invalid?: boolean, extra?: string) {
  return cn(controlBase, invalid ? 'border-red-400' : 'border-slate-300', extra);
}

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, aside, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn('h-10', className))} {...rest} />;
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn('py-2', className))} {...rest} />;
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, ...rest }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn('h-10 pr-8', className))} {...rest} />;
});

export function CharCount({ value, max, min }: { value: number; max: number; min?: number }) {
  const over = value > max;
  const near = !over && value > max * 0.9;
  const under = min !== undefined && value > 0 && value < min;
  return (
    <span
      className={cn('text-xs tabular-nums', over ? 'text-red-600' : near || under ? 'text-amber-600' : 'text-slate-400')}
      aria-live="polite"
    >
      {value.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
    </span>
  );
}
