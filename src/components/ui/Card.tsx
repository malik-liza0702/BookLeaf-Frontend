import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3', className)}>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}
