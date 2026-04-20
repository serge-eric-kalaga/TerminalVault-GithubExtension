'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { read, write } from '@/lib/data/storage';
import { STORAGE_KEYS } from '@/lib/utils/constants';

export default function ApplyPage(){const {id}=useParams();const router=useRouter();const [step,setStep]=useState(1);const [loading,setLoading]=useState(false);const [name,setName]=useState('');const submit=()=>{setLoading(true);setTimeout(()=>{const apps=read(STORAGE_KEYS.applications,[]);apps.unshift({id:`a${Date.now()}`,jobId:id,candidateId:'c1',appliedAt:new Date().toISOString(),stage:'applied',aiScore:7.8,scoreBreakdown:{technical:80,experience:75,education:70,softSkills:82},scoreExplanation:'Votre profil est prometteur.',recommendation:'good',screeningAnswers:[],coverLetter:'',recruiterNotes:[],status:'applied',rejectionReason:'',updatedAt:new Date().toISOString()});write(STORAGE_KEYS.applications,apps);setLoading(false);router.push('/portal/dashboard');},700)};return <Card className="max-w-2xl space-y-4"><h1 className="text-lg font-semibold">Postuler — Étape {step}/4</h1>{step===1&&<Input placeholder="Nom" value={name} onChange={e=>setName(e.target.value)} />}{step===2&&<Input placeholder="LinkedIn" />}{step===3&&<textarea className="input min-h-24" placeholder="Réponses" />}{step===4&&<p className="text-sm">Confirmez votre candidature.</p>}<div className="flex justify-between"><Button variant="outline" onClick={()=>setStep(s=>Math.max(1,s-1))}>Précédent</Button>{step<4?<Button onClick={()=>setStep(s=>s+1)}>Suivant</Button>:<Button onClick={submit}>{loading?'Analyse en cours...':'Soumettre ma candidature'}</Button>}</div></Card>}
