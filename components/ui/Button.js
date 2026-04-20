import { cn } from '@/lib/utils/formatting';

export function Button({ className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'btn bg-primary text-white hover:bg-primary-hover',
    outline: 'btn border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
    ghost: 'btn text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
  };
  return <button className={cn(variants[variant], className)} {...props} />;
}
