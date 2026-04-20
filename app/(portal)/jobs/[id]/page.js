'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { Card } from '@/components/ui/Card';

export default function PortalJobDetail(){const {id}=useParams();const jobs=read(STORAGE_KEYS.jobs,[]);const j=jobs.find(x=>x.id===id);if(!j)return <p>Offre indisponible</p>;return <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><h1 className="text-2xl font-semibold">{j.title}</h1><p className="mt-2 text-sm text-slate-600">{j.description}</p></Card><Card><Link href={`/portal/apply/${id}`} className="btn w-full bg-primary text-white">Postuler</Link></Card></div>}
