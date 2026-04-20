'use client';
import Link from 'next/link';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { Card } from '@/components/ui/Card';

export default function PortalJobsPage(){const jobs=read(STORAGE_KEYS.jobs,[]).filter(j=>j.status==='active');return <div className="space-y-6"><section className="card p-6"><h1 className="text-2xl font-semibold tracking-tight">Trouvez votre prochain défi</h1><input className="input mt-4" placeholder="Rechercher un poste" /></section><div className="grid gap-4 md:grid-cols-2">{jobs.map(j=><Card key={j.id}><p className="font-semibold">{j.title}</p><p className="text-sm text-slate-500">{j.department} • {j.location}</p><p className="text-sm text-emerald-600">{j.salaryMin.toLocaleString()}-{j.salaryMax.toLocaleString()} FCFA</p><Link href={`/portal/jobs/${j.id}`} className="mt-2 inline-block text-sm text-primary">Voir l'offre</Link></Card>)}</div></div>}
