'use client';
import Link from 'next/link';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { Card } from '@/components/ui/Card';
export default function CandidatesPage(){const c=read(STORAGE_KEYS.candidates,[]);return <div className="grid gap-3 md:grid-cols-2">{c.map(x=><Card key={x.id}><p className="font-medium">{x.name}</p><p className="text-sm text-slate-500">{x.title}</p><Link className="text-sm text-primary" href={`/candidates/${x.id}`}>Voir profil</Link></Card>)}</div>}
