
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, XAxis, YAxis,
    Tooltip, BarChart, Bar, Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import {
    Database, AlertTriangle, CheckCircle2, Activity,
    Shield, Briefcase, Gavel, Clock, Siren, TrendingUp,
    AlertOctagon, Lock, Search
} from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useWarrants } from '../contexts/WarrantContext';
import { toast } from 'sonner';
import { inferDPRegion } from '../services/geminiService';
import { geocodeAddress } from '../services/geocodingService';

const Stats = () => {
    const { warrants, updateWarrant } = useWarrants();
    const navigate = useNavigate();

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

        const prisonPct = countActive > 0 ? Math.round((prisonWarrants / countActive) * 100) : 0;
        const searchPct = countActive > 0 ? Math.round((searchWarrants / countActive) * 100) : 0;

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
            prisonPct,
            searchPct,
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
                color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'][index % 5] // Violet, Blue, Emerald, Amber, Rose
            }));
    }, [warrants]);

    // Heatmap Data (Top Locations)
    const heatmapData = useMemo(() => {
        const locations: Record<string, number> = {};
        warrants.filter(w => w.status === 'EM ABERTO').forEach(w => {
            const city = (w.location || 'NÃO INFORMADO').split(',')[0].split('-')[0].trim().toUpperCase();
            locations[city] = (locations[city] || 0) + 1;
        });

        const sorted = Object.entries(locations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        const max = sorted[0]?.[1] || 1;
        return sorted.map(([name, value]) => ({
            name,
            value,
            intensity: Math.round((value / max) * 100)
        }));
    }, [warrants]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-[#050505] pb-24 relative overflow-hidden">
            {/* Background Aesthetic Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none"></div>

            <Header title="Estatísticas Operacionais" back showHome />

            <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto relative z-10">

                {/* TEMPORARY DEV BUTTON */}
                <div className="bg-dashed border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-[10px] text-black/50 dark:text-white/50 uppercase tracking-widest font-bold">Inteligência Artificial - Acervo em Lote</p>
                    <button
                        onClick={async () => {
                            let updated = 0;
                            let processed = 0;
                            toast.loading("Iniciando análise com IA dos endereços e coordenadas...", { id: 'dp-update' });

                            const validDps = ["1DP", "2DP", "3DP", "4DP", "1º DP", "2º DP", "3º DP", "4º DP", "DIG", "DISE", "DDM", "Plantão", "Outras Cidades"];
                            // Force re-evaluate ALL warrants to fix previously incorrect mappings (like 1DP for other cities)
                            const toProcess = warrants.filter(w => w.location);

                            if (toProcess.length === 0) {
                                toast.success("Todos os mandados com endereço já possuem Coordenadas e DP definidos corretamente.", { id: 'dp-update' });
                                return;
                            }

                            for (const w of toProcess) {
                                processed++;
                                toast.loading(`IA Analisando: ${processed}/${toProcess.length} mandados (Nome: ${w.name.substring(0, 15)}...)...`, { id: 'dp-update' });

                                try {
                                    let currentLat = w.latitude;
                                    let currentLng = w.longitude;
                                    let currentDp = w.dpRegion;
                                    let needsUpdate = false;

                                    const updates: any = {};

                                    const locLower = w.location.toLowerCase();
                                    const isUnmapped = locLower.includes('não informado') || locLower.includes('sem endereço');

                                    if (isUnmapped) {
                                        // O endereço não existe. Tem que garantir que vire "Não Mapeado"
                                        if (currentLat || currentLng || currentDp) {
                                            updates.latitude = null;
                                            updates.longitude = null;
                                            updates.dpRegion = '';
                                            needsUpdate = true;
                                        }
                                    } else {
                                        // 1. If missing coordinates, try to geocode first
                                        let geoFailed = false;
                                        if (!currentLat || !currentLng) {
                                            const geoResult = await geocodeAddress(w.location);
                                            if (geoResult) {
                                                currentLat = geoResult.lat;
                                                currentLng = geoResult.lng;
                                                updates.latitude = currentLat;
                                                updates.longitude = currentLng;
                                                needsUpdate = true;
                                            } else {
                                                geoFailed = true;
                                            }
                                            // Wait slightly to respect Nominatim API rate limits
                                            await new Promise(r => setTimeout(r, 1000));
                                        }

                                        if (geoFailed || !currentLat || !currentLng) {
                                            // Se não encontrou as coordenadas, não deve ter DP também!
                                            if (currentDp || currentLat || currentLng) {
                                                updates.latitude = null;
                                                updates.longitude = null;
                                                updates.dpRegion = '';
                                                needsUpdate = true;
                                            }
                                        } else {
                                            // 2. FORCE RE-INFERENCE FOR ALL to correct previous mistakes
                                            // SÓ FARÁ INFERÊNCIA SE TIVER COORDENADAS REAIS PASSADAS NO PARÂMETRO
                                            let detected = await inferDPRegion(w.location, currentLat, currentLng);

                                            // Map raw AI result to formatted string in our system
                                            if (detected === "1DP") detected = "1º DP";
                                            else if (detected === "2DP") detected = "2º DP";
                                            else if (detected === "3DP") detected = "3º DP";
                                            else if (detected === "4DP") detected = "4º DP";

                                            if (detected && currentDp !== detected) {
                                                updates.dpRegion = detected;
                                                needsUpdate = true;
                                            }
                                            // Wait slightly to respect Gemini rate limits
                                            await new Promise(r => setTimeout(r, 1000));
                                        }
                                    }

                                    if (needsUpdate) {
                                        await updateWarrant(w.id, updates);
                                        updated++;
                                    }
                                } catch (e) {
                                    console.error("Erro processando lote:", e);
                                }
                            }
                            toast.success(`Concluído! A IA atualizou Coordenadas/DP de ${updated} mandados antigos com sucesso.`, { id: 'dp-update' });
                        }}
                        className="bg-primary/20 hover:bg-primary/40 text-primary px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all"
                    >
                        Auto-Vincular Coordenadas e DPs (Com IA Gemini)
                    </button>
                    <p className="text-[9px] text-black/40 dark:text-white/30 max-w-sm">Esta ação vai varrer o acervo buscando mandados sem coordenadas exatas ou sem Jurisdição. Ele tentará geocodificar o local e acionará a Inteligência Artificial para decidir o Setor DP automaticamente.</p>
                </div>

                {/* 1. Main Metrics Grid - Cyber Style */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Acervo"
                        value={stats.total}
                        icon={<Database size={20} />}
                        className="bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] cursor-pointer hover:bg-blue-500/10"
                        onClick={() => navigate('/warrant-list')}
                    />
                    <StatCard
                        label="Em Aberto"
                        value={stats.active}
                        icon={<AlertTriangle size={20} />}
                        className="bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] cursor-pointer hover:bg-red-500/10"
                        onClick={() => navigate('/warrant-list?status=EM ABERTO')}
                    />
                    <StatCard
                        label="Cumpridos"
                        value={stats.done}
                        icon={<CheckCircle2 size={20} />}
                        className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer hover:bg-emerald-500/10"
                        onClick={() => navigate('/warrant-list?status=CUMPRIDO')}
                    />
                    <StatCard
                        label="Taxa de Êxito"
                        value={`${stats.successRate}%`}
                        icon={<Activity size={20} />}
                        className="bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] cursor-pointer hover:bg-indigo-500/10"
                        onClick={() => navigate('/warrant-list?status=CUMPRIDO')}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* General Status Chart - Glassmorphism */}
                    <div className="lg:col-span-2 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-xl dark:shadow-2xl">
                        <h3 className="font-bold text-[10px] uppercase tracking-[0.3em] text-black/40 dark:text-white/40 mb-8 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                            Distribuição de Status
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.03} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.8)', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', backdropFilter: 'blur(8px)' }}
                                        cursor={{ fill: 'rgba(128,128,128,0.05)' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer">
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                fillOpacity={0.8}
                                                onClick={() => navigate(`/warrant-list?status=${entry.name === 'Cumpridos' ? 'CUMPRIDO' : 'EM ABERTO'}`)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Heatmap Tático - Idea 3 implementation */}
                    <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-xl dark:shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl transition-all group-hover:bg-primary/10"></div>
                        <h3 className="font-bold text-[10px] uppercase tracking-[0.3em] text-black/40 dark:text-white/40 mb-8 flex items-center gap-3">
                            <Siren size={14} className="text-primary" />
                            Mapa de Calor Tático
                        </h3>

                        <div className="space-y-6 relative z-10">
                            {heatmapData.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="space-y-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-lg transition-colors group/row"
                                    onClick={() => navigate(`/warrant-list?city=${item.name}`)}
                                >
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black text-black/70 dark:text-white/70 uppercase tracking-wider group-hover/row:text-primary transition-colors">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-primary">{item.value} mandados</span>
                                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black">{item.intensity}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-600 to-primary rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-1000"
                                            style={{ width: `${item.intensity}%` }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {heatmapData.length === 0 && (
                                <div className="h-40 flex items-center justify-center text-black/40 dark:text-white/20 text-[10px] font-bold uppercase tracking-widest border border-dashed border-black/10 dark:border-white/5 rounded-2xl">
                                    Aguardando Dados Geográficos...
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 text-center">
                            <p className="text-[8px] font-black text-primary/50 uppercase tracking-[0.2em]">Zonas de maior incidência operacional</p>
                        </div>
                    </div>
                </div>

                {/* 3. Crimes & Nature Section - Glassmorphism */}
                <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-xl dark:shadow-2xl relative overflow-hidden group">
                    <h3 className="font-bold text-[10px] uppercase tracking-[0.3em] text-black/40 dark:text-white/40 mb-8 flex items-center gap-3">
                        <Shield size={14} className="text-primary" />
                        Top 5 Naturezas Criminais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-64 relative">
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
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                onClick={() => navigate(`/warrant-list?q=${encodeURIComponent(entry.name)}&status=EM+ABERTO`)}
                                                className="cursor-pointer outline-none"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.8)', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', backdropFilter: 'blur(8px)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div
                                    className="flex flex-col items-center justify-center pointer-events-auto cursor-pointer rounded-full w-24 h-24 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => navigate('/warrant-list?status=EM ABERTO')}
                                >
                                    <span className="text-2xl font-black text-black dark:text-white">{stats.active}</span>
                                    <span className="text-[8px] text-black/50 dark:text-white/40 uppercase font-bold tracking-widest">Ativos</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {natureData.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => navigate(`/warrant-list?q=${encodeURIComponent(item.name)}&status=EM+ABERTO`)}
                                    className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 hover:bg-primary/10 transition-colors cursor-pointer group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: item.color, backgroundColor: item.color }} />
                                        <span className="text-xs font-bold text-black/70 dark:text-white/70 group-hover/item:text-black dark:group-hover/item:text-white transition-colors uppercase tracking-tight">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-primary">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. TACTICAL ANALYSIS & RISKS - Cyber Glows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        onClick={() => navigate('/warrant-list?type=PRISÃO&status=EM+ABERTO')}
                        className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-5 rounded-3xl border border-red-500/10 shadow-2xl relative overflow-hidden group border-l-4 border-l-red-500 cursor-pointer hover:bg-red-500/5 transition-all"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-black dark:text-white text-lg tracking-tight uppercase">Prisão</h3>
                                    <p className="text-[10px] font-bold text-black/40 dark:text-white/30 uppercase tracking-widest">Mandados de Captura</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-4xl font-black text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">{stats.prison}</span>
                                <span className="text-[9px] font-black text-black/50 dark:text-white/20 uppercase tracking-widest">{stats.prisonPct}% Carga</span>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/warrant-list?type=BUSCA&status=EM+ABERTO')}
                        className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-5 rounded-3xl border border-orange-500/10 shadow-2xl relative overflow-hidden group border-l-4 border-l-orange-500 cursor-pointer hover:bg-orange-500/5 transition-all"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                                    <Search size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-black dark:text-white text-lg tracking-tight uppercase">Busca</h3>
                                    <p className="text-[10px] font-bold text-black/40 dark:text-white/30 uppercase tracking-widest">Busca e Apreensão</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-4xl font-black text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">{stats.search}</span>
                                <span className="text-[9px] font-black text-black/50 dark:text-white/20 uppercase tracking-widest">{stats.searchPct}% Carga</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Critical Alerts Row - Pulse Neon */}
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={() => navigate('/warrant-list?priority=urgent')}
                        className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center text-center gap-3 transition-all duration-500 cursor-pointer ${stats.urgent > 0 ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse hover:bg-red-500/20' : 'bg-white/60 dark:bg-zinc-900/40 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <Siren size={32} className={`${stats.urgent > 0 ? 'text-red-500' : 'text-black/20 dark:text-white/10'}`} />
                        <div>
                            <span className={`block text-3xl font-black mb-1 ${stats.urgent > 0 ? 'text-red-500' : 'text-black/50 dark:text-white/20'}`}>{stats.urgent}</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/50 dark:text-white/40">Alta Periculosidade</span>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/warrant-list?expired=true')}
                        className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center text-center gap-3 transition-all duration-500 cursor-pointer ${stats.expired > 0 ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-500/20' : 'bg-white/60 dark:bg-zinc-900/40 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <Clock size={32} className={`${stats.expired > 0 ? 'text-amber-500' : 'text-black/20 dark:text-white/10'}`} />
                        <div>
                            <span className={`block text-3xl font-black mb-1 ${stats.expired > 0 ? 'text-amber-500' : 'text-black/50 dark:text-white/20'}`}>{stats.expired}</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/50 dark:text-white/40">Prazos Expirados</span>
                        </div>
                    </div>
                </div>

            </main>
            <BottomNav />
        </div>
    );
};
const StatCard = ({ label, value, icon, className = "", subtext, onClick }: any) => (
    <div
        onClick={onClick}
        className={`p-4 rounded-2xl border flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-200 active:scale-[0.98] ${className}`}
    >
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
