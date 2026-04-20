'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { read, write } from '@/lib/data/storage';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const saved = read(STORAGE_KEYS.currentUser, null);
    if (saved) setUser(saved);
  }, []);

  const login = (email, password) => {
    const users = read(STORAGE_KEYS.users, []);
    const found = users.find((u) => u.email === email && u.password === password && u.isActive);
    if (!found) return { ok: false, error: 'Identifiants invalides' };
    write(STORAGE_KEYS.currentUser, found);
    setUser(found);
    router.push(found.role === 'candidate' ? '/portal/dashboard' : '/dashboard');
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    setUser(null);
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'superadmin', isRecruiter: user?.role === 'recruiter', isCandidate: user?.role === 'candidate' }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
