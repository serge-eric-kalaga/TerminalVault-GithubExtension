'use client';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { Card } from '@/components/ui/Card';

export default function PortalDashboard(){const apps=read(STORAGE_KEYS.applications,[]);return <div className="space-y-4"><h1 className="text-2xl font-semibold tracking-tight">Bonjour, voici vos candidatures</h1><div className="grid gap-4 md:grid-cols-4">{[['Candidatures soumises',apps.length],['En attente',apps.filter(a=>a.stage==='applied').length],['Entretiens',apps.filter(a=>a.stage==='interview').length],['Offres',apps.filter(a=>a.stage==='offer').length]].map(x=><Card key={x[0]}><p className="text-xl font-semibold">{x[1]}</p><p className="text-xs text-slate-500">{x[0]}</p></Card>)}</div></div>}
