'use client';
import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { read, write } from '@/lib/data/storage';

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => setJobs(read(STORAGE_KEYS.jobs, [])), []);
  const saveJobs = (next) => {
    setJobs(next);
    write(STORAGE_KEYS.jobs, next);
  };
  return { jobs, saveJobs };
}
