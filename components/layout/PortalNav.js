'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

export function PortalNav() {
  const { user, logout } = useAuth();
  return <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-900"><Link href="/portal/jobs" className="font-semibold text-primary">RecrutIA</Link><nav className="flex gap-4 text-sm"><Link href="/portal/jobs">Offres</Link><Link href="/portal/dashboard">Mes Candidatures</Link><Link href="/portal/messages">Messages</Link><Link href="/portal/profile">Profil</Link></nav><div className="flex items-center gap-2 text-sm"><span>{user?.name}</span><button onClick={logout} className="text-red-500">Déconnexion</button></div></header>;
}
