'use client';
import { PortalNav } from '@/components/layout/PortalNav';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PortalLayout({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'candidate') router.replace('/dashboard');
  }, [user, router]);
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><PortalNav /><main className="p-6">{children}</main></div>;
}
