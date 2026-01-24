
import React, { useMemo } from 'react';
import {
    ResponsiveContainer, XAxis, YAxis,
    Tooltip, BarChart, Bar, Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import {
    Database, AlertTriangle, CheckCircle2, Activity,
    Shield, Briefcase, Gavel, Clock, Siren, TrendingUp
} from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useWarrants } from '../contexts/WarrantContext';
import { Warrant } from '../types';

const Stats = () => {
    const { warrants } = useWarrants();

    // Data Processing
    const stats = useMemo(() => {
        const total = warrants.length;
        const active = warrants.filter(w => w.status === 'EM ABERTO');
        const countActive = active.length;
        const countDone = warrants.filter(w => w.status === 'CUMPRIDO' || w.status === 'PRESO').length;
        const successRate = total > 0 ? Math.round((countDone / total) * 100) : 0;

        // Types
        const searchWarrants = active.filter(w => (w.type || '').toUpperCase().includes('BUSCA')).length;
        const prisonWarrants = countActive - searchWarrants;

        // Expiration Check
        const today = new Date();
        const expired = active.filter(w => {
            if (!w.expirationDate) return false;
            let d: Date | null = null;
            if (w.expirationDate.includes('/')) {
                const [day, month, year] = w.expirationDate.split('/');
                d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (w.expirationDate.includes('-')) {
                d = new Date(w.expirationDate);
            }
            return d && d < today;
        }).length;

        // Urgent
        const urgent = active.filter(w => {
            return (w.priority === 'urgent' || (w.tags || []).includes('Urgente'));
        }).length;

        return {
            total,
            active: countActive,
            done: countDone,
            successRate,
            search: searchWarrants,
            prison: prisonWarrants,
            expired,
            urgent
        };
    }, [warrants]);

    // Charts Data
    const chartData = useMemo(() => {
        return [
            { name: 'Em Aberto', value: stats.active, color: '#ef4444' }, // red-500
            { name: 'Cumpridos', value: stats.done, color: '#22c55e' },   // green-500
        ];
    }, [stats]);

    const natureData = useMemo(() => {
        const counts: Record<string, number> = {};
        warrants.filter(w => w.status === 'EM ABERTO').forEach(w => {
            const crime = (w.crime || 'OUTROS').split(' - ')[0].split(' (')[0].toUpperCase();
            counts[crime] = (counts[crime] || 0) + 1;
        });

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value], index) => ({
                name,
                value,
                color: ['#6366f1', '#f43f5e', '#06b6d4', '#8b5cf6', '#f59e0b'][index % 5]
            }));
    }, [warrants]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
            <Header title="Estatísticas Operacionais" back showHome />

            <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

                {/* 1. Main Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Acervo"
                        value={stats.total}
                        icon={<Database size={20} />}
                        className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                    />
                    <StatCard
                        label="Em Aberto"
                        value={stats.active}
                        icon={<AlertTriangle size={20} />}
                        className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"
                    />
                    <StatCard
                        label="Cumpridos"
                        value={stats.done}
                        icon={<CheckCircle2 size={20} />}
                        className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30"
                    />
                    <StatCard
                        label="Taxa de Êxito"
                        value={`${stats.successRate}%`}
                        icon={<Activity size={20} />}
                        className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
                    />
                </div>

                {/* 2. Secondary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Prisão"
                        value={stats.prison}
                        icon={<Gavel size={18} />}
                        subtext="Mandados"
                        className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark"
                    />
                    <StatCard
                        label="Busca e Apreensão"
                        value={stats.search}
                        icon={<Briefcase size={18} />}
                        subtext="Mandados"
                        className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark"
                    />
                    <StatCard
                        label="Vencidos"
                        value={stats.expired}
                        icon={<Clock size={18} />}
                        subtext="Atenção"
                        className="bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-500/30"
                    />
                    <StatCard
                        label="Prioridade"
                        value={stats.urgent}
                        icon={<Siren size={18} />}
                        subtext="Alta"
                        className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-500/30"
                    />
                </div>

                {/* 3. Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* General Status Chart */}
                    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark mb-6 flex items-center gap-2">
                            <TrendingUp size={16} /> Status Geral
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barSize={60}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Crimes Chart */}
                    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark mb-6 flex items-center gap-2">
                            <Shield size={16} /> Crimes Recorrentes
                        </h3>
                        <div className="h-64 w-full relative">
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
                                        {natureData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-text-light dark:text-text-dark">{stats.active}</span>
                                <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase">Ativos</span>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                            {natureData.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span>{item.name}</span>
                                    <span className="font-bold text-text-light dark:text-text-dark">({item.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </main>
            <BottomNav />
        </div>
    );
};

const StatCard = ({ label, value, icon, className = "", subtext }: any) => (
    <div className={`p-4 rounded-2xl border flex flex-col justify-between h-32 relative overflow-hidden transition-transform active:scale-[0.98] ${className}`}>
        <div className="flex justify-between items-start">
            <span className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                {icon}
            </span>
            {subtext && <span className="text-[10px] font-bold uppercase opacity-70">{subtext}</span>}
        </div>
        <div>
            <div className="text-3xl font-black tracking-tight">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
        </div>
    </div>
);

export default Stats;
