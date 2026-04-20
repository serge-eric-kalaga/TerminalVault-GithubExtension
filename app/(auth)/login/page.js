'use client';
import { useState } from 'react';
import { Brain, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';

const demo = [
  ['admin@recrutia.com', 'Admin123!'],
  ['recruiter@recrutia.com', 'Recruiter123!'],
  ['candidat@recrutia.com', 'Candidat123!']
];

export default function LoginPage() {
  const [email, setEmail] = useState('admin@recrutia.com');
  const [password, setPassword] = useState('Admin123!');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [openDemo, setOpenDemo] = useState(true);
  const { login } = useAuth();

  const submit = (e) => {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) setError(result.error);
  };

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 bg-[length:200%_200%] p-10 text-white animate-gradient-shift lg:block">
        <div className="max-w-md space-y-6"><div className="flex items-center gap-2 text-2xl font-semibold"><Brain /> RecrutIA</div><p className="text-3xl font-semibold">Le recrutement intelligent, réinventé.</p><ul className="space-y-2 text-sm text-blue-100"><li>• Pipeline visuel intelligent</li><li>• Score IA transparent</li><li>• Collaboration temps réel</li></ul></div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className={`card w-full max-w-md space-y-4 p-6 ${error ? 'animate-shake border-red-300' : ''}`}>
          <h1 className="text-lg font-semibold">Connexion</h1>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <div className="relative"><Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" /><button type="button" onClick={() => setShow((p) => !p)} className="absolute right-2 top-2 text-slate-500">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" type="submit"><Sparkles size={16} /> Se connecter</Button>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:bg-slate-800"><button type="button" className="mb-2 font-medium" onClick={() => setOpenDemo((p) => !p)}>Identifiants démo</button>{openDemo && <div className="space-y-1">{demo.map(([e, p]) => <button key={e} type="button" onClick={() => { setEmail(e); setPassword(p); }} className="block text-left text-slate-600 hover:text-primary dark:text-slate-300">{e} / {p}</button>)}</div>}</div>
        </form>
      </section>
    </main>
  );
}
