'use client';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
export default function PortalProfile(){return <Card className="max-w-3xl space-y-3"><h1 className="text-lg font-semibold">Mon profil</h1><Input placeholder="Nom" /><Input placeholder="Titre" /><textarea className="input min-h-24" placeholder="Bio" /><Button>Enregistrer</Button></Card>}
