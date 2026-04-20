'use client';
import { useEffect, useState } from 'react';
import { read, write } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';

export function useMessages() {
  const [messages, setMessages] = useState([]);
  useEffect(() => setMessages(read(STORAGE_KEYS.messages, [])), []);
  const sendMessage = (payload) => {
    const next = [...messages, payload];
    setMessages(next);
    write(STORAGE_KEYS.messages, next);
  };
  return { messages, sendMessage };
}
