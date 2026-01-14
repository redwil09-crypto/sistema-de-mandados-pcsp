
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, BarChart, Bar,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    TrendingUp, Zap,
    Calendar, Shield, AlertTriangle,
    Download, MapPin, Users, Database, Navigation
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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

    // --- Calculations ---

    // 1. Core KPIs
    const kpis = useMemo(() => {
        const total = filteredWarrants.filter(w => w.status === 'EM ABERTO').length;
        const mapped = filteredWarrants.filter(w => w.status === 'EM ABERTO' && w.latitude && w.longitude).length;

        // Count total diligences in filtered warrants
        const totalDiligencias = filteredWarrants.reduce((acc, w) => acc + (w.diligentHistory?.length || 0), 0);

        // Expiration Alert (next 30 days)
        const upcomingExpirations = warrants.filter(w => {
            if (w.status !== 'EM ABERTO') return false;
            const expDate = parseDate(w.expirationDate);
            if (!expDate) return false;
            const diff = expDate.getTime() - new Date().getTime();
            const days = diff / (1000 * 60 * 60 * 24);
            return days > 0 && days <= 30;
        }).length;

        return { total, mapped, totalDiligencias, upcomingExpirations };
    }, [filteredWarrants, warrants]);

    // 2. Recent Diligences List
    const recentDiligences = useMemo(() => {
        const list: { name: string, date: string, type: string }[] = [];
        warrants.forEach(w => {
            w.diligentHistory?.forEach(d => {
                list.push({
                    name: w.name || 'N/I',
                    date: d.date,
                    type: d.type
                });
            });
        });
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [warrants]);

    return (
        <div className="min-h-screen pb-24 bg-[#0f172a] text-slate-200">
            <Header title="Painel Operacional" back showHome />

            {/* Simple Toolbar */}
            <div className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-16 z-20">
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                    {(['30d', '90d', 'all'] as FilterRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRange(r)}
                            className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${filterRange === r
                                ? 'bg-amber-500 text-black shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {r === 'all' ? 'TOTAL' : r.toUpperCase()}
                        </button>
                    ))}
                </div>

                <Link to="/intel" className="flex items-center gap-2 bg-slate-100 text-slate-900 px-4 py-1.5 rounded-lg text-[10px] font-black shadow-lg active:scale-95 transition-all">
                    RESUMO IA
                </Link>
            </div>

            <main className="p-4 space-y-6">
                {/* Team KPIs */}
                <div className="grid grid-cols-2 gap-4">
                    <OperationalCard
                        label="Banco de Dados"
                        value={kpis.total}
                        sub="Mandados Ativos"
                        icon={<Database size={16} className="text-amber-500" />}
                    />
                    <OperationalCard
                        label="Pronto p/ Campo"
                        value={kpis.mapped}
                        sub="Geolocalizados"
                        icon={<Navigation size={16} className="text-emerald-500" />}
                        trend={`${Math.round((kpis.mapped / (kpis.total || 1)) * 100)}%`}
                    />
                    <OperationalCard
                        label="Diligências"
                        value={kpis.totalDiligencias}
                        sub="Produção no Período"
                        icon={<TrendingUp size={16} className="text-blue-500" />}
                    />
                    <OperationalCard
                        label="Prazos Críticos"
                        value={kpis.upcomingExpirations}
                        sub="Vencimento 30d"
                        icon={<AlertTriangle size={16} className="text-rose-500" />}
                        urgent={kpis.upcomingExpirations > 0}
                    />
                </div>

                {/* Team Focus Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <Users size={20} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Atividade da Equipe</h3>
                            <p className="text-[10px] text-slate-500 font-bold">Últimas movimentações em campo</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {recentDiligences.length > 0 ? (
                            recentDiligences.map((d, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase truncate max-w-[180px]">{d.name}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">{d.type}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-mono text-slate-500">{new Date(d.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-xs text-slate-600 font-bold italic">Nenhuma diligência registrada no período.</p>
                        )}
                    </div>
                </div>

                {/* Bottom Tip */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                        <Zap size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase">Foco Operacional</p>
                        <p className="text-[10px] text-slate-300">Priorize atualizar as geolocalizações para otimizar os roteiros de campo.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- Minimalist Components ---

interface OperationalCardProps {
    label: string;
    value: number;
    sub: string;
    icon: React.ReactNode;
    trend?: string;
    urgent?: boolean;
}

const OperationalCard = ({ label, value, sub, icon, trend, urgent }: OperationalCardProps) => (
    <div className={`p-4 rounded-2xl bg-slate-900 border transition-all ${urgent ? 'border-rose-500/50 animate-pulse' : 'border-slate-800'}`}>
        <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                {icon}
            </div>
            {trend && (
                <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                    {trend}
                </span>
            )}
        </div>
        <div className="space-y-0.5">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</h4>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{value}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{sub}</span>
            </div>
        </div>
    </div>
);

export default Stats;
