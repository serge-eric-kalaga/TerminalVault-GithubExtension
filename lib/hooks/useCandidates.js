'use client';
import { useEffect, useState } from 'react';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';

export function useCandidates() {
  const [candidates, setCandidates] = useState([]);
  useEffect(() => setCandidates(read(STORAGE_KEYS.candidates, [])), []);
  return { candidates, setCandidates };
}
