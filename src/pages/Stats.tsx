
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, BarChart, Bar,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    FilePlus, CheckCircle, TrendingUp, Zap,
    Calendar, Shield, Clock, AlertTriangle,
    Filter, Download, ChevronRight, BarChart3
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
        const total = filteredWarrants.length;
        const fulfilled = filteredWarrants.filter(w => w.status === 'CUMPRIDO' || w.status === 'PRESO').length;
        const efficiency = total > 0 ? (fulfilled / total) * 100 : 0;

        // Expiration Alert (next 30 days)
        const upcomingExpirations = warrants.filter(w => {
            if (w.status === 'CUMPRIDO' || w.status === 'PRESO') return false;
            const expDate = parseDate(w.expirationDate);
            if (!expDate) return false;
            const diff = expDate.getTime() - new Date().getTime();
            const days = diff / (1000 * 60 * 60 * 24);
            return days > 0 && days <= 30;
        }).length;

        // Avg Fulfillment Time (simplified logic)
        let totalDays = 0;
        let count = 0;
        filteredWarrants.forEach(w => {
            if (w.dischargeDate && w.issueDate) {
                const start = parseDate(w.issueDate);
                const end = parseDate(w.dischargeDate);
                if (start && end) {
                    totalDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                    count++;
                }
            }
        });
        const avgTime = count > 0 ? Math.round(totalDays / count) : 0;

        return { total, fulfilled, efficiency, upcomingExpirations, avgTime };
    }, [filteredWarrants, warrants]);

    // 2. Annual Evolution
    const monthlyStats = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = months.map(m => ({ name: m, entrada: 0, cumprido: 0 }));

        filteredWarrants.forEach(w => {
            const issueDate = parseDate(w.issueDate);
            if (issueDate) {
                data[issueDate.getMonth()].entrada++;
            }
            if ((w.status === 'CUMPRIDO' || w.status === 'PRESO') && w.dischargeDate) {
                const dischargeDate = parseDate(w.dischargeDate);
                if (dischargeDate) {
                    data[dischargeDate.getMonth()].cumprido++;
                }
            }
        });
        return data;
    }, [filteredWarrants]);

    // 3. Crime Distro
    const crimeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredWarrants.forEach(w => {
            const crime = w.crime || 'Outros';
            counts[crime] = (counts[crime] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [filteredWarrants]);

    // 4. Status Pie
    const statusStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredWarrants.forEach(w => {
            const s = w.status || 'ABERTO';
            counts[s] = (counts[s] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredWarrants]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    return (
        <div className="min-h-screen pb-24 bg-[#f8fafc] dark:bg-[#0f172a]">
            <Header title="Painel de Inteligência" back showHome />

            {/* Top Toolbar */}
            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {(['30d', '90d', '1y', 'all'] as FilterRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRange(r)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterRange === r
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            {r === 'all' ? 'TUDO' : r.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Link to="/intel" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                        <Shield size={14} /> INTELIGÊNCIA
                    </Link>
                    <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:shadow-md transition-all active:scale-95">
                        <Download size={14} /> EXPORTAR PDF
                    </button>
                </div>
            </div>

            <main className="px-4 space-y-6">

                {/* KPI Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Mandados Ativos"
                        value={kpis.total}
                        icon={<FilePlus className="text-indigo-600" size={20} />}
                        trend="+4.2%"
                        color="indigo"
                    />
                    <KPICard
                        title="Taxa Eficiência"
                        value={`${Math.round(kpis.efficiency)}%`}
                        icon={<Zap className="text-emerald-600" size={20} />}
                        trend="+12%"
                        color="emerald"
                        progress={kpis.efficiency}
                    />
                    <KPICard
                        title="Tempo Médio"
                        value={`${kpis.avgTime} dias`}
                        icon={<Clock className="text-amber-600" size={20} />}
                        trend="-2 dias"
                        color="amber"
                    />
                    <KPICard
                        title="Alertas Críticos"
                        value={kpis.upcomingExpirations}
                        icon={<AlertTriangle className="text-rose-600" size={20} />}
                        trend="Venc. 30d"
                        color="rose"
                        urgent={kpis.upcomingExpirations > 0}
                    />
                </div>

                {/* Main Evolution Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <TrendingUp size={18} className="text-indigo-500" /> Fluxo de Operações
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Entradas vs Cumprimentos (Distribuição Mensal)</p>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyStats}>
                                <defs>
                                    <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradCumprido" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="entrada" name="Registros" stroke="#6366f1" strokeWidth={3} fill="url(#gradEntrada)" animationDuration={1500} />
                                <Area type="monotone" dataKey="cumprido" name="Capturas" stroke="#10b981" strokeWidth={3} fill="url(#gradCumprido)" animationDuration={1500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Crime Analysis */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                            <Shield size={18} className="text-blue-500" /> Top Naturezas Criminais
                        </h3>
                        <div className="space-y-4">
                            {crimeStats.map((crime, i) => (
                                <div key={crime.name} className="group">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[80%] uppercase">{crime.name}</span>
                                        <span className="text-xs font-black text-slate-900 dark:text-white">{crime.value}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-1000"
                                            style={{ width: `${(crime.value / crimeStats[0].value) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                            <BarChart3 size={18} className="text-emerald-500" /> Situação da Base
                        </h3>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="h-48 w-48 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusStats}
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusStats.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{kpis.total}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                                {statusStats.map((s, i) => (
                                    <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{s.name}</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{s.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Efficiency Gauge Section */}
                <div className="bg-indigo-600 dark:bg-indigo-900 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                    <div className="relative z-10 flex-1">
                        <h2 className="text-3xl font-black mb-4">Meta de Eficiência DIG</h2>
                        <p className="text-indigo-100 text-sm max-w-md">O monitoramento de metas ajuda a DIG a manter o padrão de excelência operacional no cumprimento de ordens judiciais.</p>
                        <div className="flex gap-4 mt-8">
                            <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/20">
                                <p className="text-[10px] font-bold opacity-70 uppercase">Taxa Atual</p>
                                <p className="text-2xl font-black">{Math.round(kpis.efficiency)}%</p>
                            </div>
                            <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/20">
                                <p className="text-[10px] font-bold opacity-70 uppercase">Meta Semanal</p>
                                <p className="text-2xl font-black">75%</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-64 h-4 text-center">
                        <div className="h-40 flex items-end justify-center gap-2">
                            {[40, 60, 45, 80, 50, 90, 75].map((h, i) => (
                                <div
                                    key={i}
                                    className="w-4 bg-white/20 rounded-t-lg transition-all hover:bg-white/50 cursor-help"
                                    style={{ height: `${h}%` }}
                                    title={`Volume Dia ${i + 1}`}
                                />
                            ))}
                        </div>
                        <p className="text-[9px] font-bold mt-4 uppercase tracking-widest opacity-60">Volume de Atividade Diária</p>
                    </div>
                </div>

            </main>
        </div>
    );
};

// --- Subcomponents ---

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend: string;
    color: 'indigo' | 'emerald' | 'amber' | 'rose';
    progress?: number;
    urgent?: boolean;
}

const KPICard = ({ title, value, icon, trend, color, progress, urgent }: KPICardProps) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
        rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
    };

    return (
        <div className={`p-5 rounded-2xl bg-white dark:bg-slate-800 border ${urgent ? 'border-rose-300 dark:border-rose-900 animate-pulse' : 'border-slate-100 dark:border-slate-700'} shadow-sm hover:shadow-md transition-all group`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50'} dark:bg-slate-900/50`}>
                    {trend}
                </div>
            </div>
            <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
            </div>
            {progress !== undefined && (
                <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default Stats;
