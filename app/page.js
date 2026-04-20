'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    if (!user) router.replace('/login');
    else router.replace(user.role === 'candidate' ? '/portal/dashboard' : '/dashboard');
  }, [user, router]);
  return null;
}
