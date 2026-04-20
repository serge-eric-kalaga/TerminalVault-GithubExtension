import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/lib/utils/formatting';

export function JobCard({ job }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{job.title}</h3><Badge className="border-blue-200 bg-blue-50 text-blue-600">{job.status}</Badge></div>
      <p className="text-sm text-slate-500">{job.department} • {job.location}</p>
      <p className="text-sm text-emerald-600">{formatMoney(job.salaryMin, job.salaryMax)}</p>
      <div className="flex gap-2"><Link className="btn border border-slate-200 text-sm" href={`/jobs/${job.id}`}>Voir le pipeline</Link></div>
    </Card>
  );
}
