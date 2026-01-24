
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
    Target, User, Gavel
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Warrant } from '../types';
import { useWarrants } from '../contexts/WarrantContext';

const Stats = () => {
    const { warrants } = useWarrants();

    // Data Processing (Memozied)
    const inventory = useMemo(() => {
        const total = warrants.length;
        const abertos = warrants.filter(w => w.status === 'EM ABERTO').length;
        const cumpridos = warrants.filter(w => w.status === 'CUMPRIDO').length;
        const buscaEapreensao = warrants.filter(w => (w.type || '').toUpperCase().includes('BUSCA')).length;
        const prisoes = total - buscaEapreensao;
        const eficacia = total > 0 ? Math.round((cumpridos / total) * 100) : 0;
        return { total, abertos, cumpridos, buscaEapreensao, prisoes, eficacia };
    }, [warrants]);

    // Period Data Helper
    const getPeriodData = (typeFilter: (w: Warrant) => boolean) => {
        const now = new Date();
        const days = [30, 60, 90];

        return days.map(d => {
            const periodDate = new Date();
            periodDate.setDate(now.getDate() - d);

            const filtered = warrants.filter(typeFilter).filter(w => {
                const dateStr = w.issueDate || w.entryDate;
                if (!dateStr) return false;
                const part = w.issueDate?.includes('/') ? w.issueDate.split('/').reverse().join('-') : w.issueDate;
                return part && new Date(part) >= periodDate;
            });

            return {
                name: `${d} Dias`,
                Abertos: filtered.filter(w => w.status === 'EM ABERTO').length,
                Cumpridos: filtered.filter(w => w.status === 'CUMPRIDO').length
            };
        });
    };

    const prisonData = useMemo(() => getPeriodData(w => !(w.type || '').toUpperCase().includes('BUSCA')), [warrants]);
    const natureData = useMemo(() => {
        const counts: Record<string, number> = {};
        warrants.filter(w => w.status === 'EM ABERTO').forEach(w => {
            const c = (w.crime || 'OUTROS').split(' - ')[0].split(' (')[0].toUpperCase();
            counts[c] = (counts[c] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by value desc
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));
    }, [warrants]);

    return (
        <div className="min-h-screen bg-background-dark text-text-dark pb-24 relative overflow-hidden font-display">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
            <div className="fixed -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            <Header title="Intelligence Dashboard" back showHome />

            <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto relative z-10">

                {/* 1. HERO KPI ROW */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NeonStatCard
                        label="Total Acervo"
                        value={inventory.total}
                        icon={<Database size={18} />}
                        color="text-primary"
                        borderColor="border-primary/20"
                        delay={0}
                    />
                    <NeonStatCard
                        label="Em Aberto"
                        value={inventory.abertos}
                        icon={<AlertTriangle size={18} />}
                        color="text-risk-high"
                        borderColor="border-risk-high/30"
                        delay={100}
                        glow
                    />
                    <NeonStatCard
                        label="Cumpridos"
                        value={inventory.cumpridos}
                        icon={<CheckCircle2 size={18} />}
                        color="text-success"
                        borderColor="border-success/20"
                        delay={200}
                    />
                    <NeonStatCard
                        label="Taxa de Êxito"
                        value={`${inventory.eficacia}%`}
                        icon={<Activity size={18} />}
                        color="text-secondary"
                        borderColor="border-secondary/20"
                        delay={300}
                    />
                </section>

                {/* 2. OPERATIONAL STATUS (Charts) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-surface-dark/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-tactic">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-text-secondary-dark flex items-center gap-2">
                                <Shield size={16} className="text-secondary" />
                                Fluxo de Prisões
                            </h3>
                            <div className="flex gap-2">
                                <span className="flex items-center text-[10px] text-text-muted gap-1"><div className="w-2 h-2 rounded-full bg-risk-high"></div> Abertos</span>
                                <span className="flex items-center text-[10px] text-text-muted gap-1"><div className="w-2 h-2 rounded-full bg-success"></div> Cumpridos</span>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={prisonData} barGap={8}>
                                    <defs>
                                        <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                                    />
                                    <Bar dataKey="Abertos" fill="url(#colorOpen)" radius={[4, 4, 0, 0]} barSize={32} />
                                    <Bar dataKey="Cumpridos" fill="url(#colorDone)" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut Chart (Natureza) */}
                    <div className="bg-surface-dark/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-tactic flex flex-col">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-text-secondary-dark flex items-center gap-2 mb-4">
                            <Target size={16} className="text-secondary" />
                            Alvos por Crime
                        </h3>
                        <div className="flex-1 min-h-[200px] relative">
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
                                        stroke="none"
                                    >
                                        {natureData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#f43f5e', '#06b6d4', '#10b981', '#f59e0b'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Donuts Center Stats */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-white">{inventory.abertos}</span>
                                <span className="text-[10px] text-text-muted uppercase">Ativos</span>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            {natureData.slice(0, 3).map((n, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-2 text-text-secondary-dark">
                                        <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: ['#6366f1', '#f43f5e', '#06b6d4'][i] }}></span>
                                        {n.name}
                                    </span>
                                    <span className="font-bold text-white">{n.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. TACTICAL BREAKDOWN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-surface-dark-elevated to-surface-dark border border-white/5 flex items-center justify-between group hover:border-risk-high/30 transition-colors">
                        <div>
                            <p className="text-[10px] font-black uppercase text-risk-high mb-1 tracking-widest">Mandados de Prisão</p>
                            <div className="text-3xl font-display font-bold text-white group-hover:scale-105 transition-transform origin-left">{inventory.prisoes}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-risk-high/5 text-risk-high">
                            <Gavel size={24} />
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-surface-dark-elevated to-surface-dark border border-white/5 flex items-center justify-between group hover:border-amber-500/30 transition-colors">
                        <div>
                            <p className="text-[10px] font-black uppercase text-amber-500 mb-1 tracking-widest">Busca e Apreensão</p>
                            <div className="text-3xl font-display font-bold text-white group-hover:scale-105 transition-transform origin-left">{inventory.buscaEapreensao}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/5 text-amber-500">
                            <Search size={24} />
                        </div>
                    </div>
                </div>

            </main>
            <BottomNav />
        </div>
    );
};

// --- Modern Micro Components ---

const NeonStatCard = ({ label, value, icon, color, borderColor, glow, delay }: any) => {
    return (
        <div
            className={`
                bg-surface-dark/40 backdrop-blur-sm border ${borderColor} 
                p-5 rounded-2xl flex flex-col justify-between items-start 
                relative overflow-hidden group hover:bg-surface-dark/60 transition-all duration-500
                ${glow ? 'shadow-[0_0_15px_rgba(244,63,94,0.15)] border-risk-high/40' : ''}
            `}
            style={{ animation: `fade-in-up 0.5s ease-out ${delay}ms backwards` }}
        >
            <div className={`mb-3 p-2 rounded-lg bg-white/5 ${color} group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div>
                <div className="text-2xl md:text-3xl font-display font-black text-white tracking-tight mb-1">
                    {value}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${color}`}>
                    {label}
                </div>
            </div>
            {/* Hover Glare */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors duration-500 pointer-events-none" />
        </div>
    )
}

export default Stats;
