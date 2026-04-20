'use client';
import { useParams } from 'next/navigation';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS, KANBAN_STAGES } from '@/lib/utils/constants';
import { Card } from '@/components/ui/Card';
import { CandidateCard } from '@/components/recruitment/CandidateCard';

export default function JobDetailPage() {
  const { id } = useParams();
  const jobs = read(STORAGE_KEYS.jobs, []);
  const apps = read(STORAGE_KEYS.applications, []).filter((a) => a.jobId === id);
  const candidates = read(STORAGE_KEYS.candidates, []);
  const job = jobs.find((j) => j.id === id);
  if (!job) return <p>Offre introuvable.</p>;

  return <div className="space-y-4"><div><p className="text-sm text-slate-500">← Offres</p><h1 className="text-2xl font-semibold">{job.title}</h1></div>
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-6">{KANBAN_STAGES.map((stage) => <Card key={stage} className="lg:col-span-1 p-3"><h3 className="mb-2 font-medium capitalize">{stage} ({apps.filter((a) => a.stage === stage).length})</h3><div className="space-y-2">{apps.filter((a) => a.stage === stage).map((app) => <CandidateCard key={app.id} app={app} candidate={candidates.find((c) => c.id === app.candidateId)} />)}</div></Card>)}</div>
  </div>;
}
