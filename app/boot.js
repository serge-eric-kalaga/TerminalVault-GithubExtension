'use client';
import { useEffect } from 'react';

export default function Boot({ seedData }) {
  useEffect(() => { seedData?.(); }, [seedData]);
  return null;
}
