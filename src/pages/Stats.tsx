
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer, XAxis, YAxis,
    Tooltip, BarChart, Bar, Cell, Legend,
    CartesianGrid
} from 'recharts';
import {
    TrendingUp, Zap,
    Calendar, Shield, AlertTriangle,
    Download, MapPin, Users, Database, Navigation,
    ShieldAlert, Activity, Scale, Search, Clock,
    ChevronDown, FileText, CheckCircle2, History
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

    // --- High Risk & Deadlines (Existing Logic) ---
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
        <div className="min-h-screen pb-24 bg-[#05070a] text-slate-300 font-sans selection:bg-blue-500/30">
            <Header title="Estatísticas Operacionais" back showHome />

            <main className="p-4 space-y-8 max-w-7xl mx-auto">

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

                {/* 2. GRÁFICOS DE FLUXO (EM ABERTO VS CUMPRIDOS) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* MANDADOS DE PRISÃO */}
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={120} />
                        </div>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Produtividade</h3>
                                <p className="text-xl font-black text-white">Mandados de Prisão</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-[8px] font-black text-rose-500 uppercase">Abertos</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Cumpridos</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={prisonFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                                    />
                                    <Bar dataKey="Abertos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={25} />
                                    <Bar dataKey="Cumpridos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-4 text-center font-bold uppercase tracking-widest opacity-50">Comparativo temporal por intervalo de dias</p>
                    </div>

                    {/* BUSCA E APREENSÃO */}
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Search size={120} />
                        </div>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Produtividade</h3>
                                <p className="text-xl font-black text-white">Busca e Apreensão</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-[8px] font-black text-rose-500 uppercase">Abertos</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Cumpridos</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={searchFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                                    />
                                    <Bar dataKey="Abertos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={25} />
                                    <Bar dataKey="Cumpridos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-4 text-center font-bold uppercase tracking-widest opacity-50">Comparativo temporal por intervalo de dias</p>
                    </div>
                </div>

                {/* 3. TACTICAL CARDS (Existing focus) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-6 rounded-3xl bg-slate-900/50 border ${kpis.highRisk > 0 ? 'border-amber-500/30' : 'border-slate-800'} flex items-center justify-between`}>
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Crimes Graves (Abertos)</h4>
                                <p className="text-2xl font-black text-white">{kpis.highRisk} <span className="text-xs text-slate-500 font-bold ml-1">ALVOS</span></p>
                            </div>
                        </div>
                        {kpis.highRisk > 0 && <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-1 rounded-full animate-pulse">ALTA PRIORIDADE</span>}
                    </div>

                    <div className={`p-6 rounded-3xl bg-slate-900/50 border ${kpis.expiring30 > 0 ? 'border-rose-500/30' : 'border-slate-800'} flex items-center justify-between`}>
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Vencimento Próximo</h4>
                                <p className="text-2xl font-black text-white">{kpis.expiring30} <span className="text-xs text-slate-500 font-bold ml-1">PRAZOS</span></p>
                            </div>
                        </div>
                        {kpis.expiring30 > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-full">AGIR IMEDIATO</span>}
                    </div>
                </div>

            </main>
        </div>
    );
};

// --- Compact Helper Components ---

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
