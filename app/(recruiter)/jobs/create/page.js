'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { read, write } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { useRouter } from 'next/navigation';

export default function CreateJobPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [weights, setWeights] = useState({ technical: 40, experience: 30, education: 15, softSkills: 15 });
  const router = useRouter();
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const publish = (status) => {
    const jobs = read(STORAGE_KEYS.jobs, []);
    const job = { id: `j${Date.now()}`, title, department, location: 'Ouagadougou', locationType: 'hybrid', contractType: 'cdi', salaryMin: 600000, salaryMax: 900000, currency: 'FCFA', description: '', responsibilities: [], requiredSkills: ['Communication'], niceSkills: [], scoringWeights: weights, screeningQuestions: [], status, createdBy: 'u2', createdAt: new Date().toISOString(), publishedAt: status === 'active' ? new Date().toISOString() : null, applicationsCount: 0, blindMode: false };
    write(STORAGE_KEYS.jobs, [job, ...jobs]);
    router.push('/jobs');
  };

  const stepWidth = step === 1 ? 'w-1/5' : step === 2 ? 'w-2/5' : step === 3 ? 'w-3/5' : step === 4 ? 'w-4/5' : 'w-full';

  return <div className="space-y-6"><PageHeader title="Créer une offre" description={`Step ${step} of 5`} />
    <Card><div className="mb-4 h-2 rounded bg-slate-100"><div className={`h-2 rounded bg-primary ${stepWidth}`} /></div>
      {step === 1 && <div className="space-y-3"><Input placeholder="Titre du poste" value={title} onChange={(e) => setTitle(e.target.value)} /><select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}><option>Engineering</option><option>Design</option><option>Product</option></select></div>}
      {step === 3 && <div className="space-y-3">{Object.keys(weights).map((k) => <label key={k} className="block text-sm">{k}: {weights[k]}%<input className="w-full" type="range" min="0" max="100" value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} /></label>)}<p className={total === 100 ? 'text-emerald-600' : 'text-red-500'}>Total: {total}%</p></div>}
      {step !== 1 && step !== 3 && <p className="text-sm text-slate-500">Étape {step} configurée pour la démo.</p>}
      <div className="mt-4 flex justify-between"><Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>Précédent</Button>{step < 5 ? <Button onClick={() => setStep((s) => s + 1)}>Suivant</Button> : <div className="space-x-2"><Button variant="outline" onClick={() => publish('draft')}>Sauvegarder en brouillon</Button><Button onClick={() => publish('active')}>Publier l'offre</Button></div>}</div>
    </Card>
  </div>;
}
