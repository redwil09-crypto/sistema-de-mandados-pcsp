
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer, XAxis, YAxis,
    Tooltip, BarChart, Bar, Cell
} from 'recharts';
import {
    TrendingUp, Zap,
    Calendar, Shield, AlertTriangle,
    Download, MapPin, Users, Database, Navigation,
    ShieldAlert, Activity, Scale, Search, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { Warrant } from '../types';

interface StatsProps {
    warrants: Warrant[];
}

type FilterRange = '30d' | '90d' | '1y' | 'all';

const Stats = ({ warrants }: StatsProps) => {
    const [filterRange, setFilterRange] = useState<FilterRange>('all');

    // --- Data Processing Helpers ---
    const parseDate = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        const date = dateStr.includes('/')
            ? new Date(dateStr.split('/').reverse().join('-'))
            : new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    };

    const isWithinRange = (date: Date) => {
        if (filterRange === 'all') return true;
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = diff / (1000 * 60 * 60 * 24);

        if (filterRange === '30d') return days <= 30;
        if (filterRange === '90d') return days <= 90;
        if (filterRange === '1y') return days <= 365;
        return true;
    };

    const filteredWarrants = useMemo(() => {
        if (filterRange === 'all') return warrants;
        return warrants.filter(w => {
            const date = parseDate(w.issueDate || w.entryDate);
            return date ? isWithinRange(date) : false;
        });
    }, [warrants, filterRange]);

    // 1. Core KPIs with Comparative Logic
    const kpis = useMemo(() => {
        const active = warrants.filter(w => w.status === 'EM ABERTO');
        const totalActive = active.length;
        const totalMapped = active.filter(w => w.latitude && w.longitude).length;

        const highRisk = active.filter(w => {
            const crime = (w.crime || '').toUpperCase();
            return crime.includes('HOMICIDIO') || crime.includes('ROUBO') || crime.includes('TRAFICO') || (w as any).tags?.includes('Urgente');
        }).length;

        const expiring30 = active.filter(w => {
            const expDate = parseDate(w.expirationDate);
            if (!expDate) return false;
            const diff = expDate.getTime() - new Date().getTime();
            return diff > 0 && diff <= (30 * 24 * 60 * 60 * 1000);
        }).length;

        const expiring90 = active.filter(w => {
            const expDate = parseDate(w.expirationDate);
            if (!expDate) return false;
            const diff = expDate.getTime() - new Date().getTime();
            return diff > 0 && diff <= (90 * 24 * 60 * 60 * 1000);
        }).length;

        return { totalActive, totalMapped, highRisk, expiring30, expiring90 };
    }, [warrants]);

    // 2. Nature Breakdown
    const natureData = useMemo(() => {
        const counts: Record<string, number> = {};
        warrants.filter(w => w.status === 'EM ABERTO').forEach(w => {
            const c = (w.crime || 'OUTROS').split(' - ')[0].split(' (')[0].toUpperCase();
            counts[c] = (counts[c] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [warrants]);

    // 3. Squad Timeline
    const squadronTimeline = useMemo(() => {
        const timeline: any[] = [];
        warrants.forEach(w => {
            w.diligentHistory?.forEach(d => {
                timeline.push({
                    target: w.name || 'ALVO NÃO CADASTRADO',
                    action: d.type,
                    date: d.date,
                    notes: d.notes
                });
            });
        });
        return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
    }, [warrants]);

    return (
        <div className="min-h-screen pb-24 bg-[#0a0f1a] text-slate-300 font-sans">
            <Header title="Painel de Capturas • Equipe Alfa" back showHome />

            <main className="p-4 space-y-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <TacticalCard
                        title="Inventário Ativo"
                        value={kpis.totalActive}
                        footer={`Mapeados: ${kpis.totalMapped}`}
                        progress={(kpis.totalMapped / (kpis.totalActive || 1)) * 100}
                        icon={<Database size={20} className="text-blue-500" />}
                        color="blue"
                    />
                    <TacticalCard
                        title="Natureza Crítica"
                        value={kpis.highRisk}
                        footer="Homicídio / Roubo / Tráfico"
                        icon={<ShieldAlert size={20} className="text-amber-500" />}
                        color="amber"
                        urgent={kpis.highRisk > 0}
                    />
                    <TacticalCard
                        title="Janela de Prazos"
                        value={kpis.expiring30}
                        footer={`Próx. 90 dias: ${kpis.expiring90}`}
                        icon={<Clock size={20} className="text-rose-500" />}
                        color="rose"
                        urgent={kpis.expiring30 > 0}
                    />
                    <TacticalCard
                        title="Prontidão Digital"
                        value={`${Math.round((kpis.totalMapped / (kpis.totalActive || 1)) * 100)}%`}
                        footer="Alvos no GPS"
                        icon={<Navigation size={20} className="text-emerald-500" />}
                        color="emerald"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Carga Operacional</h3>
                                <p className="text-lg font-bold text-white">Análise por Natureza</p>
                            </div>
                            <TrendingUp className="text-slate-700" size={24} />
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={natureData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#94a3b8' }} width={100} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {natureData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#334155'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Timeline</h3>
                            <p className="text-lg font-bold text-white">Últimas do Squad</p>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            {squadronTimeline.length > 0 ? squadronTimeline.map((item, idx) => (
                                <div key={idx} className="relative pl-6 border-l-2 border-slate-800 pb-2">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <p className="text-[10px] font-black uppercase text-white truncate max-w-[120px]">{item.target}</p>
                                            <p className="text-[8px] font-bold text-slate-600 font-mono">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">{item.action}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-600 italic py-10 text-center">Nenhum registro</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg"><Activity className="text-white" size={24} /></div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Eficiência</h3>
                            <p className="text-2xl font-black text-white">{kpis.totalMapped} / {kpis.totalActive}</p>
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg"><Scale className="text-white" size={24} /></div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-rose-400">Vencimentos</h3>
                            <p className="text-2xl font-black text-white">{kpis.expiring30}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const TacticalCard = ({ title, value, footer, icon, color, progress, urgent }: any) => {
    const accents: any = {
        blue: 'border-blue-500/20 text-blue-500 bg-blue-500/10',
        amber: 'border-amber-500/20 text-amber-500 bg-amber-500/10',
        rose: 'border-rose-500/30 text-rose-500 bg-rose-500/10',
        emerald: 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10'
    };

    return (
        <div className={`p-5 rounded-2xl bg-slate-900 border ${urgent ? 'border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-slate-800'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl border ${accents[color]}`}>{icon}</div>
                {progress !== undefined && <div className="text-[10px] font-black text-slate-500">{Math.round(progress)}%</div>}
            </div>
            <div className="space-y-0.5 mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase">{title}</h4>
                <p className="text-3xl font-black text-white">{value}</p>
            </div>
            <div className="flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full ${urgent ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`} />
                <p className="text-[9px] font-bold text-slate-500 uppercase">{footer}</p>
            </div>
        </div>
    );
};

export default Stats;
