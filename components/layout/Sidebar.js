'use client';
import Link from 'next/link';
import { Briefcase, LayoutDashboard, Users, Calendar, MessageSquare, BarChart3, Settings, Moon, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/lib/hooks/useAuth';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Offres', icon: Briefcase },
  { href: '/candidates', label: 'Candidats', icon: Users },
  { href: '/interviews', label: 'Entretiens', icon: Calendar },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 }
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const path = usePathname();
  const { toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  return (
    <aside className={`flex h-screen flex-col border-r border-slate-200 bg-white p-4 transition-all duration-150 dark:border-slate-700 dark:bg-slate-900 ${collapsed ? 'w-16' : 'w-60'}`}>
      <button onClick={() => setCollapsed((p) => !p)} className="mb-4 rounded-md border border-slate-200 p-2 text-left font-semibold text-primary">🧠 {!collapsed && 'RecrutIA'}</button>
      {!collapsed && <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><p className="font-medium">{user?.name}</p><p className="text-xs text-slate-500">{user?.role}</p></div>}
      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = path.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${active ? 'border-l-2 border-primary bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}><Icon size={16} /> {!collapsed && item.label}</Link>;
        })}
      </nav>
      <div className="mt-auto space-y-1">
        <Link href="/settings" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Settings size={16} /> {!collapsed && 'Settings'}</Link>
        <button onClick={toggleTheme} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Moon size={16} /> {!collapsed && 'Dark mode'}</button>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-50"><LogOut size={16} /> {!collapsed && 'Logout'}</button>
      </div>
    </aside>
  );
}
