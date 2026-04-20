'use client';
import Link from 'next/link';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { JobCard } from '@/components/recruitment/JobCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

export default function JobsPage() {
  const jobs = read(STORAGE_KEYS.jobs, []);
  return <div><PageHeader title="Offres d'emploi" description={`${jobs.length} offres`} actions={<Link href="/jobs/create"><Button>Créer une offre</Button></Link>} />
  <div className="grid gap-4 md:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div></div>;
}
