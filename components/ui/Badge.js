import { cn } from '@/lib/utils/formatting';
export function Badge({ children, className }) { return <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-medium', className)}>{children}</span>; }
export function scoreBadge(score) {
  if (score <= 4) return 'text-red-600 bg-red-50 border-red-200';
  if (score <= 6) return 'text-amber-600 bg-amber-50 border-amber-200';
  if (score <= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  return 'text-blue-600 bg-blue-50 border-blue-200';
}
