import Link from 'next/link';
import { Badge, scoreBadge } from '@/components/ui/Badge';

export function CandidateCard({ app, candidate }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"><div className="mb-2 flex items-center justify-between"><p className="font-medium">{candidate?.name || 'Candidat'}</p><Badge className={scoreBadge(app.aiScore)}>{app.aiScore}/10</Badge></div><p className="mb-2 text-xs text-slate-500">{candidate?.title}</p><Link href={`/candidates/${candidate?.id}`} className="text-xs text-primary">Voir profil</Link></div>;
}
