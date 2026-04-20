'use client';
import { Bell, Search } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/hooks/useAuth';

export function Header() {
  const { notifications } = useNotifications();
  const { user } = useAuth();
  const unread = notifications.filter((n) => n.userId === user?.id && !n.read).length;
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500"><Search size={16} /> Cmd+K</div>
      <button className="relative rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Bell size={18} />{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unread}</span>}</button>
    </header>
  );
}
