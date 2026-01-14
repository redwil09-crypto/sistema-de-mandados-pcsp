
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer, XAxis, YAxis,
    Tooltip, BarChart, Bar, Cell, Legend,
    CartesianGrid, PieChart, Pie, RadarChart,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
    TrendingUp, Zap,
    Calendar, Shield, AlertTriangle,
    Download, MapPin, Users, Database, Navigation,
    ShieldAlert, Activity, Scale, Search, Clock,
    ChevronDown, FileText, CheckCircle2, History,
    Target, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { Warrant } from '../types';

interface StatsProps {
    warrants: Warrant[];
}

const Stats = ({ warrants }: StatsProps) => {
    // --- Data Processing Helpers ---
    const parseDate = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        const date = dateStr.includes('/')
            ? new Date(dateStr.split('/').reverse().join('-'))
            : new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    };

    const calculateAge = (birthDateStr: string | undefined) => {
        const birth = parseDate(birthDateStr);
        if (!birth) return null;
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        return age;
    };

    // --- Calculations for Top Inventory ---
    const inventory = useMemo(() => {
        const total = warrants.length;
        const abertos = warrants.filter(w => w.status === 'EM ABERTO').length;
        const cumpridos = warrants.filter(w => w.status === 'CUMPRIDO').length;
        const buscaEapreensao = warrants.filter(w => (w.type || '').toUpperCase().includes('BUSCA')).length;
        const prisoes = total - buscaEapreensao;

        return { total, abertos, cumpridos, buscaEapreensao, prisoes };
    }, [warrants]);

    // --- Helper to get data for specific periods ---
    const getPeriodData = (typeFilter: (w: Warrant) => boolean) => {
        const now = new Date();
        const days = [30, 60, 90, 360];

        return days.map(d => {
            const periodDate = new Date();
            periodDate.setDate(now.getDate() - d);

            const filtered = warrants.filter(typeFilter).filter(w => {
                const date = parseDate(w.issueDate || w.entryDate);
                return date && date >= periodDate;
            });

            return {
                name: `${d}D`,
                Abertos: filtered.filter(w => w.status === 'EM ABERTO').length,
                Cumpridos: filtered.filter(w => w.status === 'CUMPRIDO').length
            };
        });
    };

    const prisonFlowData = useMemo(() =>
        getPeriodData(w => !(w.type || '').toUpperCase().includes('BUSCA')),
        [warrants]);

    const searchFlowData = useMemo(() =>
        getPeriodData(w => (w.type || '').toUpperCase().includes('BUSCA')),
        [warrants]);

    // --- New: Natureza Criminal (Top 5) ---
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

    // --- New: Idade vs Tipo de Crime ---
    const ageCrimeData = useMemo(() => {
        const ranges = [
            { name: '18-25', min: 18, max: 25 },
            { name: '26-35', min: 26, max: 35 },
            { name: '36-50', min: 36, max: 50 },
            { name: '50+', min: 51, max: 120 }
        ];

        return ranges.map(range => {
            const inRange = warrants.filter(w => {
                const age = calculateAge(w.birthDate);
                return age !== null && age >= range.min && age <= range.max;
            });

            const crimeTypes = {
                Homicidio: inRange.filter(w => (w.crime || '').toUpperCase().includes('HOMICIDIO')).length,
                Roubo: inRange.filter(w => (w.crime || '').toUpperCase().includes('ROUBO')).length,
                Trafico: inRange.filter(w => (w.crime || '').toUpperCase().includes('TRAFICO')).length,
                Outros: inRange.filter(w => {
                    const c = (w.crime || '').toUpperCase();
                    return !c.includes('HOMICIDIO') && !c.includes('ROUBO') && !c.includes('TRAFICO');
                }).length
            };

            return { name: range.name, ...crimeTypes };
        });
    }, [warrants]);

    // --- New: Meta de Eficiência DIG (85% Target) ---
    const efficiency = useMemo(() => {
        const total = warrants.length;
        const cumpridos = warrants.filter(w => w.status === 'CUMPRIDO').length;
        const percent = total > 0 ? (cumpridos / total) * 100 : 0;
        return { percent: Math.round(percent), target: 85 };
    }, [warrants]);

    const kpis = useMemo(() => {
        const active = warrants.filter(w => w.status === 'EM ABERTO');
        const highRisk = active.filter(w => {
            const crime = (w.crime || '').toUpperCase();
            return crime.includes('HOMICIDIO') || crime.includes('ROUBO') || crime.includes('TRAFICO');
        }).length;

        const expiring30 = active.filter(w => {
            const expDate = parseDate(w.expirationDate);
            if (!expDate) return false;
            const diff = expDate.getTime() - new Date().getTime();
            return diff > 0 && diff <= (30 * 24 * 60 * 60 * 1000);
        }).length;

        return { highRisk, expiring30 };
    }, [warrants]);

    return (
        <div className="min-h-screen pb-24 bg-[#05070a] text-slate-300 font-sans">
            <Header title="Inteligência Operacional" back showHome />

            <main className="p-4 space-y-10 max-w-7xl mx-auto">

                {/* 1. TOP: DADOS COMPLETOS DO INVENTÁRIO */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <History size={16} className="text-blue-500" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Panorama Geral do Acervo</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <CompactStat label="Total Base" value={inventory.total} icon={<Database size={14} />} color="gray" />
                        <CompactStat label="Prisões" value={inventory.prisoes} icon={<Shield size={14} />} color="blue" />
                        <CompactStat label="Busca/Apreens." value={inventory.buscaEapreensao} icon={<Search size={14} />} color="amber" />
                        <CompactStat label="Em Aberto" value={inventory.abertos} icon={<AlertTriangle size={14} />} color="rose" highlight />
                        <CompactStat label="Cumpridos" value={inventory.cumpridos} icon={<CheckCircle2 size={14} />} color="emerald" />
                    </div>
                </section>

                {/* 2. GRÁFICOS DE FLUXO (PRISÃO VS BUSCA) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FlowChartCard title="Fluxo de Mandados de Prisão" data={prisonFlowData} icon={<Shield size={60} />} accent="blue" />
                    <FlowChartCard title="Fluxo de Busca e Apreensão" data={searchFlowData} icon={<Search size={60} />} accent="amber" />
                </div>

                {/* 3. NATUREZAS E IDADE (NOVA SEÇÃO) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* TOP NATUREZAS */}
                    <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-6">
                            <ShieldAlert className="text-rose-500" size={18} />
                            <h3 className="text-sm font-black uppercase text-white">Top Naturezas Criminais</h3>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={natureData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {natureData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#f43f5e', '#3b82f6', '#f59e0b', '#10b981', '#6366f1'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* IDADE VS TIPO DE CRIME */}
                    <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-6">
                            <User className="text-blue-500" size={18} />
                            <h3 className="text-sm font-black uppercase text-white">Idade vs. Tipo de Crime</h3>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ageCrimeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                                    <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                                    <Legend iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                    <Bar dataKey="Homicidio" fill="#f43f5e" stackId="a" />
                                    <Bar dataKey="Roubo" fill="#3b82f6" stackId="a" />
                                    <Bar dataKey="Trafico" fill="#f59e0b" stackId="a" />
                                    <Bar dataKey="Outros" fill="#475569" stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 4. META DE EFICIÊNCIA DIG */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* GAUGE DE EFICIÊNCIA */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Meta Eficiência DIG</h3>
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                                    strokeDasharray={364.4}
                                    strokeDashoffset={364.4 - (364.4 * efficiency.percent) / 100}
                                    className="text-blue-500 transition-all duration-1000"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">{efficiency.percent}%</span>
                                <span className="text-[8px] font-bold text-blue-400 uppercase">Fulfillment</span>
                            </div>
                        </div>
                        <div className="mt-4 space-y-1">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Target: {efficiency.target}%</p>
                            <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${(efficiency.percent / efficiency.target) * 100}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* TACTICAL CARDS (AGRUPADOS) */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-6 rounded-3xl bg-slate-900/50 border ${kpis.highRisk > 0 ? 'border-amber-500/40' : 'border-slate-800'} flex items-center justify-between`}>
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Impacto de Crimes Graves</h4>
                                    <p className="text-2xl font-black text-white">{kpis.highRisk} <span className="text-xs text-slate-500 font-bold ml-1">ALVOS</span></p>
                                </div>
                            </div>
                            <Target size={32} className="text-slate-800" />
                        </div>

                        <div className={`p-6 rounded-3xl bg-slate-900/50 border ${kpis.expiring30 > 0 ? 'border-rose-500/40' : 'border-slate-800'} flex items-center justify-between`}>
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Vencimento Próximo</h4>
                                    <p className="text-2xl font-black text-white">{kpis.expiring30} <span className="text-xs text-slate-500 font-bold ml-1">ORDENS</span></p>
                                </div>
                            </div>
                            <Activity size={32} className="text-slate-800" />
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

// --- Sub-Components ---

const FlowChartCard = ({ title, data, icon, accent }: any) => {
    const color = accent === 'blue' ? '#3b82f6' : '#f59e0b';
    return (
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-${accent}-500`}>
                {icon}
            </div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] text-${accent}-500 mb-1`}>Controle de Produção</h3>
                    <p className="text-xl font-black text-white">{title}</p>
                </div>
                <div className="flex gap-2">
                    <LegendBadge color="bg-rose-500" label="Abertos" />
                    <LegendBadge color="bg-emerald-500" label="Cumpridos" />
                </div>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} />
                        <Bar dataKey="Abertos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={25} />
                        <Bar dataKey="Cumpridos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const LegendBadge = ({ color, label }: any) => (
    <div className={`flex items-center gap-1.5 ${color.replace('bg-', 'bg-')}/10 border border-${color.replace('bg-', '')}/20 px-2 py-1 rounded-md`}>
        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
        <span className={`text-[8px] font-black ${color.replace('bg-', 'text-')} uppercase`}>{label}</span>
    </div>
);

const CompactStat = ({ label, value, icon, color, highlight }: any) => {
    const colorMap: any = {
        blue: 'text-blue-500 border-blue-500/20 bg-blue-500/5',
        gray: 'text-slate-400 border-slate-700 bg-slate-800/20',
        amber: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
        rose: 'text-rose-500 border-rose-500/20 bg-rose-500/5',
        emerald: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
    };

    return (
        <div className={`p-3 rounded-2xl border ${colorMap[color]} group hover:bg-slate-800/40 transition-all ${highlight ? 'ring-1 ring-rose-500/20' : ''}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="opacity-60 group-hover:scale-110 transition-transform">{icon}</span>
                <span className="text-lg font-black tracking-tighter">{value}</span>
            </div>
            <p className="text-[8px] font-black uppercase tracking-tighter opacity-60 leading-none">{label}</p>
        </div>
    );
};

export default Stats;
