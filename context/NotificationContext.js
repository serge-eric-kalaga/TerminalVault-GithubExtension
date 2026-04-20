'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { read, write } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setNotifications(read(STORAGE_KEYS.notifications, []));
  }, []);

  const addToast = (toast) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 3));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const markAllRead = (userId) => {
    const updated = notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n));
    setNotifications(updated);
    write(STORAGE_KEYS.notifications, updated);
  };

  const value = useMemo(() => ({ toasts, addToast, notifications, markAllRead }), [toasts, notifications]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => useContext(NotificationContext);
