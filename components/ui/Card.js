import { cn } from '@/lib/utils/formatting';
export function Card({ className, ...props }) { return <div className={cn('card p-4', className)} {...props} />; }
