'use client';
import { useParams } from 'next/navigation';
import { read } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';
import { Card } from '@/components/ui/Card';
import { CandidateRadar } from '@/components/charts/RadarChart';

export default function CandidateProfilePage(){const {id}=useParams();const candidates=read(STORAGE_KEYS.candidates,[]);const apps=read(STORAGE_KEYS.applications,[]).filter(a=>a.candidateId===id);const jobs=read(STORAGE_KEYS.jobs,[]);const c=candidates.find(x=>x.id===id);if(!c)return <p>Not found</p>;const app=apps[0];const radar=[{subject:'Technique',score:app?.scoreBreakdown?.technical||65},{subject:'Expérience',score:app?.scoreBreakdown?.experience||60},{subject:'Formation',score:app?.scoreBreakdown?.education||70},{subject:'Soft Skills',score:app?.scoreBreakdown?.softSkills||65},{subject:'Culture Fit',score:72}];return <div className="grid gap-4 lg:grid-cols-3"><Card className="space-y-2"><p className="text-xl font-bold">{c.name}</p><p className="text-sm text-slate-500">{c.title}</p><p className="text-xs">{c.location}</p></Card><div className="space-y-4 lg:col-span-2"><Card><h2 className="mb-2 text-lg font-semibold">Analyse IA – {jobs.find(j=>j.id===app?.jobId)?.title||'Poste'}</h2><p className="text-3xl font-semibold text-primary">{app?.aiScore||0} / 10</p><CandidateRadar data={radar} /><p className="italic text-sm text-slate-600">{app?.scoreExplanation}</p></Card></div></div>}
