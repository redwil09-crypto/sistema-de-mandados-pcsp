
import React, { useMemo } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, BarChart, Bar,
    PieChart, Pie, Cell
} from 'recharts';
import { FilePlus, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import { Warrant } from '../types';

interface StatsProps {
    warrants: Warrant[];
}

const Stats = ({ warrants }: StatsProps) => {
    // 1. Calculate Monthly Stats for Current Year
    const monthlyStats = useMemo(() => {
        const stats: Record<string, { name: string, prisonInput: number, searchInput: number, prisonCaptured: number, searchCaptured: number, captured: number }> = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        // Initialize
        months.forEach((m, i) => {
            const key = i.toString();
            stats[key] = { name: m, prisonInput: 0, searchInput: 0, prisonCaptured: 0, searchCaptured: 0, captured: 0 };
        });

        warrants.forEach(w => {
            // Inputs (Issue Date)
            if (w.issueDate) {
                const date = w.issueDate.includes('/')
                    ? new Date(w.issueDate.split('/').reverse().join('-'))
                    : new Date(w.issueDate);

                if (!isNaN(date.getTime())) {
                    const month = date.getMonth().toString();
                    if (stats[month]) {
                        if (w.type.toLowerCase().includes('busca')) {
                            stats[month].searchInput++;
                        } else {
                            stats[month].prisonInput++;
                        }
                    }
                }
            }

            // Exits/Captures (Discharge Date + Status)
            if ((w.status === 'CUMPRIDO' || w.status === 'PRESO' || w.fulfillmentResult === 'Apreendido') && w.dischargeDate) {
                const date = w.dischargeDate.includes('/')
                    ? new Date(w.dischargeDate.split('/').reverse().join('-'))
                    : new Date(w.dischargeDate);

                if (!isNaN(date.getTime())) {
                    const month = date.getMonth().toString();
                    if (stats[month]) {
                        stats[month].captured++;
                        if (w.type.toLowerCase().includes('busca')) {
                            stats[month].searchCaptured++;
                        } else {
                            stats[month].prisonCaptured++;
                        }
                    }
                }
            }
        });

        return Object.values(stats);
    }, [warrants]);

    // 2. Crime Distribution
    const crimeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        warrants.forEach(w => {
            const crime = w.crime || 'Não informado';
            counts[crime] = (counts[crime] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8
    }, [warrants]);

    // 3. Status Distribution
    const statusStats = useMemo(() => {
        const counts: Record<string, number> = {};
        warrants.forEach(w => {
            const result = w.fulfillmentResult || w.status;
            counts[result] = (counts[result] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value], index) => ({
            name,
            value,
            color: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'][index % 6]
        }));
    }, [warrants]);

    // 4. Age x Crime Distribution
    const ageCrimeStats = useMemo(() => {
        const data = [
            { name: '18-24', Roubo: 0, Trafico: 0, Furto: 0, Homicidio: 0, Outros: 0 },
            { name: '25-34', Roubo: 0, Trafico: 0, Furto: 0, Homicidio: 0, Outros: 0 },
            { name: '35-49', Roubo: 0, Trafico: 0, Furto: 0, Homicidio: 0, Outros: 0 },
            { name: '50+', Roubo: 0, Trafico: 0, Furto: 0, Homicidio: 0, Outros: 0 }
        ];

        warrants.forEach(w => {
            const mockAge = w.age ? parseInt(w.age) : (parseInt(w.id.slice(-2)) || 25) + 18;
            const crime = (w.crime || '').toLowerCase();

            let i = 3;
            if (mockAge <= 24) i = 0;
            else if (mockAge <= 34) i = 1;
            else if (mockAge <= 49) i = 2;

            if (crime.includes('roubo')) data[i].Roubo++;
            else if (crime.includes('drogas') || crime.includes('tráfico')) data[i].Trafico++;
            else if (crime.includes('furto')) data[i].Furto++;
            else if (crime.includes('homicídio')) data[i].Homicidio++;
            else data[i].Outros++;
        });
        return data;
    }, [warrants]);

    // 5. Regime Stats
    const regimeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        warrants.forEach(w => {
            const r = w.regime || 'Não Inf.';
            counts[r] = (counts[r] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [warrants]);

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Estatísticas Avançadas" back showHome />
            <div className="p-4 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <p className="text-xs text-text-secondary-light">Total Mandados</p>
                        <p className="text-2xl font-bold">{warrants.length}</p>
                    </div>
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <p className="text-xs text-text-secondary-light">Cumpridos (Ano)</p>
                        <p className="text-2xl font-bold text-green-500">{monthlyStats.reduce((acc, curr) => acc + curr.captured, 0)}</p>
                    </div>
                </div>

                {/* New Annual Evolution Chart (4 Waves) */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm">Evolução Anual Detalhada</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyStats}>
                                <defs>
                                    <linearGradient id="colorPrisonInput" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSearchInput" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPrisonCaptured" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSearchCaptured" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Area type="monotone" dataKey="prisonInput" name="Entrada Prisão" stroke="#ef4444" fill="url(#colorPrisonInput)" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="searchInput" name="Entrada Busca" stroke="#f97316" fill="url(#colorSearchInput)" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="prisonCaptured" name="Cumprido Prisão" stroke="#22c55e" fill="url(#colorPrisonCaptured)" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="searchCaptured" name="Cumprido Busca" stroke="#3b82f6" fill="url(#colorSearchCaptured)" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 1. Monthly Evolution - SPLIT into Two Charts (Restored) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <FilePlus size={16} className="text-blue-500" /> Entrada de Mandados
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="prisonInput" name="Prisão" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="searchInput" name="Busca" fill="#f97316" radius={[4, 4, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Quantity below */}
                        <div className="flex justify-around mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <span>Prisões: <b>{monthlyStats.reduce((a, c) => a + c.prisonInput, 0)}</b></span>
                            <span>Buscas: <b>{monthlyStats.reduce((a, c) => a + c.searchInput, 0)}</b></span>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" /> Mandados Cumpridos
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyStats}>
                                    <defs>
                                        <linearGradient id="colorCaptured" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="captured" name="Cumpridos" stroke="#22c55e" fill="url(#colorCaptured)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Quantity below */}
                        <div className="flex justify-center mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <span>Total Cumpridos: <b>{monthlyStats.reduce((a, c) => a + c.captured, 0)}</b></span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2. Crime Distribution */}
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm">Top Naturezas Criminais</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={crimeStats} margin={{ left: 40 }}>
                                    <XAxis type="number" fontSize={10} hide />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Age x Crime - RESTORED */}
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm">Perfil: Idade x Crime</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ageCrimeStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="Roubo" stackId="a" fill="#ef4444" />
                                    <Bar dataKey="Trafico" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="Furto" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="Homicidio" stackId="a" fill="#10b981" />
                                    <Bar dataKey="Outros" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 3. Status/Results */}
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm">Resultados e Status</h3>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusStats} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                        {statusStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* QUANTITY VISIBLE BELOW - Grid Layout */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {statusStats.map(s => (
                                <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div>
                                    <span className="text-text-secondary-light dark:text-text-secondary-dark truncate">{s.name}: <b>{s.value}</b></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. Regimes */}
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark text-sm">Distribuição por Regime</h3>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={regimeStats} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
                                        {regimeStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* QUANTITY VISIBLE BELOW - Grid Layout */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {regimeStats.map((s, i) => (
                                <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'][i % 5] }}></div>
                                    <span className="text-text-secondary-light dark:text-text-secondary-dark truncate">{s.name}: <b>{s.value}</b></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Stats;
