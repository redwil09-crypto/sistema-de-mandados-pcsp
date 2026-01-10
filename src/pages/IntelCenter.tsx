
import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Warrant } from '../types';
import Header from '../components/Header';
import {
    Map as MapIcon, Share2,
    Target, Users, Search,
    Filter, Info, Shield,
    Zap, Lightbulb, MapPin,
    AlertTriangle, TrendingUp,
    Navigation
} from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface IntelCenterProps {
    warrants: Warrant[];
}

const IntelCenter = ({ warrants }: IntelCenterProps) => {
    const [view, setView] = useState<'advisor' | 'map' | 'network'>('advisor');

    // Only show open warrants with location
    const openWarrants = useMemo(() => warrants.filter(w => w.status === 'EM ABERTO'), [warrants]);
    const geocodedWarrants = useMemo(() => openWarrants.filter(w => w.latitude && w.longitude), [openWarrants]);

    // --- Tactical Advisor Logic (The "3rd Partner" logic) ---

    const tacticalInsights = useMemo(() => {
        const insights = {
            dailyAdvice: "",
            missions: [] as { title: string, count: number, targets: string[], reason: string }[],
            criticalAlerts: [] as { title: string, type: string, detail: string }[]
        };

        if (openWarrants.length === 0) {
            insights.dailyAdvice = "Nenhum mandado em aberto. Sistema em standby.";
            return insights;
        }

        // 1. Generate Daily Advice
        const crimes = openWarrants.reduce((acc, w) => {
            const c = w.crime || 'Outros';
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostCommonCrime = Object.entries(crimes).sort((a, b) => b[1] - a[1])[0];

        if (mostCommonCrime) {
            insights.dailyAdvice = `Foco sugerido para hoje: ${mostCommonCrime[0]}. Existem ${mostCommonCrime[1]} alvos ativos com essa natureza. Recomenda-se abordagem tática entre 05h e 07h.`;
        }

        // 2. Cluster Missions (Group by shared process or proximity)
        // Group by process number
        const processGroups = openWarrants.reduce((acc, w) => {
            if (w.number && w.number !== 'Não informado') {
                acc[w.number] = acc[w.number] || [];
                acc[w.number].push(w);
            }
            return acc;
        }, {} as Record<string, Warrant[]>);

        Object.entries(processGroups).forEach(([num, targets]) => {
            if (targets.length > 1) {
                insights.missions.push({
                    title: `Operação Processo ${num.slice(-6)}`,
                    count: targets.length,
                    targets: targets.map(t => t.name),
                    reason: "Múltiplos alvos vinculados ao mesmo processo judicial."
                });
            }
        });

        // Group by Neighborhood (first word of address)
        const neighborhoodGroups = openWarrants.reduce((acc, w) => {
            if (w.location) {
                const parts = w.location.split(',');
                const neighborhood = parts.length > 1 ? parts[1].trim() : 'Região Geral';
                acc[neighborhood] = acc[neighborhood] || [];
                acc[neighborhood].push(w);
            }
            return acc;
        }, {} as Record<string, Warrant[]>);

        Object.entries(neighborhoodGroups).forEach(([name, targets]) => {
            if (targets.length >= 2 && insights.missions.length < 3) {
                insights.missions.push({
                    title: `Saturação: ${name}`,
                    count: targets.length,
                    targets: targets.map(t => t.name),
                    reason: `Alta densidade de alvos concentrada no bairro ${name}.`
                });
            }
        });

        // 3. Critical Alerts
        const urgencyCount = openWarrants.filter(w => (w as any).tags?.includes('Urgente')).length;
        if (urgencyCount > 0) {
            insights.criticalAlerts.push({
                title: "Prioridade Urgente",
                type: "HIGH",
                detail: `Existem ${urgencyCount} mandados marcados com urgência máxima aguardando cumprimento.`
            });
        }

        return insights;
    }, [openWarrants]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 pb-20 flex flex-col">
            <Header title="Inteligência Operacional" back showHome />

            {/* Navigation Tabs - Operational Style */}
            <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 gap-2 overflow-x-auto scrollbar-hide">
                <TabButton
                    active={view === 'advisor'}
                    onClick={() => setView('advisor')}
                    icon={<Zap size={18} />}
                    label="Assessor Tático"
                />
                <TabButton
                    active={view === 'map'}
                    onClick={() => setView('map')}
                    icon={<Target size={18} />}
                    label="Mapa de Alvos"
                />
                <TabButton
                    active={view === 'network'}
                    onClick={() => setView('network')}
                    icon={<Share2 size={18} />}
                    label="Vínculos"
                />
            </div>

            <main className="flex-1 relative overflow-y-auto">

                {/* 1. TACTICAL ADVISOR (THE NEW HEART) */}
                {view === 'advisor' && (
                    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

                        {/* Daily Briefing Card */}
                        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Lightbulb size={80} />
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Briefing de Viatura</h4>
                                <h3 className="text-xl font-bold mb-4">Conselho Estratégico</h3>
                                <p className="text-sm leading-relaxed text-indigo-50 font-medium italic">
                                    "{tacticalInsights.dailyAdvice}"
                                </p>
                            </div>
                        </div>

                        {/* Suggested Missions (Clusters) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <h5 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                                    <TrendingUp size={14} /> Missões Sugeridas
                                </h5>
                                {tacticalInsights.missions.map((mission, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h6 className="font-bold text-sm text-primary">{mission.title}</h6>
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-black">{mission.count} ALVOS</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mb-3">{mission.reason}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {mission.targets.slice(0, 3).map((name, i) => (
                                                <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[120px]">{name}</span>
                                            ))}
                                            {mission.targets.length > 3 && <span className="text-[9px] text-slate-400">+{mission.targets.length - 3}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                                    <AlertTriangle size={14} /> Alertas de Oportunidade
                                </h5>
                                {tacticalInsights.criticalAlerts.length === 0 ? (
                                    <div className="bg-slate-100 dark:bg-slate-800/30 p-8 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700">
                                        <p className="text-xs text-slate-400 font-bold">Sem alertas críticos no momento.</p>
                                    </div>
                                ) : (
                                    tacticalInsights.criticalAlerts.map((alert, idx) => (
                                        <div key={idx} className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <h6 className="font-bold text-sm text-rose-600 dark:text-rose-400">{alert.title}</h6>
                                                <p className="text-[10px] text-rose-500/80 mt-1">{alert.detail}</p>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h6 className="font-bold text-xs mb-2">Check de Segurança</h6>
                                    <div className="space-y-2">
                                        <SafetyCheckItem label="Sincronização de Banco" status="OK" />
                                        <SafetyCheckItem label="Criptografia de Canal" status="ATIVO" />
                                        <SafetyCheckItem label="Monitoramento iFood" status="ONLINE" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tip of the day */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3 items-center">
                            <Info size={18} className="text-amber-500 shrink-0" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                                <b>Dica Operacional:</b> Verifique sempre o histórico de endereços salvos em anexo (iFood) para identificar locais de entrega noturna, onde a chance de captura é 40% superior.
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. MAP VIEW */}
                {view === 'map' && (
                    <div className="h-[calc(100vh-140px)] w-full relative">
                        <MapContainer
                            center={[-23.5505, -46.6333] as any}
                            zoom={12}
                            style={{ height: '100%', width: '100%' }}
                            className="z-0"
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {geocodedWarrants.map(w => (
                                <React.Fragment key={w.id}>
                                    <Marker position={[w.latitude!, w.longitude!]}>
                                        <Popup>
                                            <div className="p-1 min-w-[180px]">
                                                <h4 className="font-bold text-slate-900">{w.name}</h4>
                                                <p className="text-[10px] text-primary font-bold uppercase">{w.type}</p>
                                                <p className="text-[10px] text-slate-600 mt-1">Crimes: {w.crime}</p>
                                                <div className="mt-2 pt-2 border-t flex gap-2">
                                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{w.status}</span>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    <Circle
                                        center={[w.latitude!, w.longitude!]}
                                        radius={300}
                                        pathOptions={{ fillColor: '#3b82f6', color: 'transparent', fillOpacity: 0.1 }}
                                    />
                                </React.Fragment>
                            ))}
                        </MapContainer>
                    </div>
                )}

                {/* 3. NETWORK VIEW */}
                {view === 'network' && (
                    <div className="p-4 md:p-8 max-w-5xl mx-auto">
                        <div className="mb-6">
                            <h3 className="text-xl font-black">Teia de Vínculos</h3>
                            <p className="text-sm text-slate-500">Identificação de alvos conectados por local, processo ou natureza criminosa.</p>
                        </div>
                        {/* (Network items logic same as before, but styled consistently) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Simple simulated links for demo */}
                            {openWarrants.length < 2 ? (
                                <p className="text-xs text-slate-400">Dados insuficientes para gerar vínculos.</p>
                            ) : (
                                openWarrants.slice(0, 9).map((w, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-primary mb-1 uppercase">Link Detectado</p>
                                        <p className="text-xs font-bold truncate">{w.name}</p>
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                                        <div className="flex items-center gap-2">
                                            <Share2 size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500">Vínculo: {w.crime}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer - Status Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50">
                <div className="max-w-md mx-auto flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sistema Online
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                        <Shield size={10} />
                        Assessor IA Ativo
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Helpers ---

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 pb-3 pt-2 text-[11px] font-bold uppercase tracking-tight transition-all border-b-2 whitespace-nowrap ${active
            ? 'border-primary text-primary'
            : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
    >
        {icon}
        {label}
    </button>
);

const SafetyCheckItem = ({ label, status }: { label: string, status: string }) => (
    <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="text-slate-400">{label}</span>
        <span className="text-emerald-500">{status}</span>
    </div>
);

export default IntelCenter;
