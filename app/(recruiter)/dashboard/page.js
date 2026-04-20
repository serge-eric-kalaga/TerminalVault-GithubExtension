'use client';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApplicationsLineChart } from '@/components/charts/LineChart';
import { FunnelBarChart } from '@/components/charts/BarChart';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';

export default function DashboardPage() {
  const jobs = read(STORAGE_KEYS.jobs, []);
  const applications = read(STORAGE_KEYS.applications, []);
  const interviews = read(STORAGE_KEYS.interviews, []);
  const line = Array.from({ length: 12 }).map((_, i) => ({ day: `J${i + 1}`, applications: Math.floor(Math.random() * 8 + 4) }));
  const funnel = [{ name: 'Applied', value: 100 }, { name: 'Screen', value: 70 }, { name: 'Interview', value: 40 }, { name: 'Offer', value: 15 }, { name: 'Hired', value: 8 }];
  return <div className="space-y-6"><PageHeader title={`Bonjour 👋`} description="Voici votre vue d'ensemble" />
    <div className="grid gap-4 md:grid-cols-4">{[
      ['Offres actives', jobs.filter((j) => j.status === 'active').length, '↑ 2 ce mois'],
      ['Candidatures totales', applications.length, '↑ 12 cette semaine'],
      ['Entretiens planifiés', interviews.filter((i) => i.status === 'scheduled').length, "3 aujourd'hui"],
      ['Recrutements', applications.filter((a) => a.stage === 'hired').length, 'ce trimestre']
    ].map((k) => <Card key={k[0]}><p className="text-2xl font-semibold">{k[1]}</p><p className="text-sm text-slate-500">{k[0]}</p><p className="text-xs text-emerald-500">{k[2]}</p></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-5"><Card className="lg:col-span-3"><h2 className="mb-3 text-lg font-semibold">Applications over time</h2><ApplicationsLineChart data={line} /></Card><Card className="lg:col-span-2"><h2 className="mb-3 text-lg font-semibold">Recruitment funnel</h2><FunnelBarChart data={funnel} /></Card></div>
  </div>;
}
