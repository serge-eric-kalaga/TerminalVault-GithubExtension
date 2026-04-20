'use client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RecruiterLayout({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role === 'candidate') router.replace('/portal/dashboard');
  }, [user, router]);
  return <div className="flex"><Sidebar /><main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950"><Header /><div className="p-6">{children}</div></main></div>;
}
