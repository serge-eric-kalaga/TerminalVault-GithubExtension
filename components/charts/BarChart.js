'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function FunnelBarChart({ data }) {
  return <div className="h-64 w-full"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#10B981" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>;
}
