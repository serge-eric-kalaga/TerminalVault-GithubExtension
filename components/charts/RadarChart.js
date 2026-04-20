'use client';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
export function CandidateRadar({ data }) { return <div className="h-64 w-full"><ResponsiveContainer><RadarChart data={data}><PolarGrid /><PolarAngleAxis dataKey="subject" /><Radar dataKey="score" stroke="#2563EB" fill="#2563EB" fillOpacity={0.4} /></RadarChart></ResponsiveContainer></div>; }
