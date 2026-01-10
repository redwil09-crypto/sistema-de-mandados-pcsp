
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
    Navigation, Microscope, FileText,
    Brain, FileSearch, Sparkles
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
    const [view, setView] = useState<'advisor' | 'map' | 'network' | 'lab'>('advisor');
    const [labInput, setLabInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [labResult, setLabResult] = useState<{
        entities: { type: string, value: string, match?: string }[],
        intelligence: string[],
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    } | null>(null);

    // Only show open warrants with location
    const openWarrants = useMemo(() => warrants.filter(w => w.status === 'EM ABERTO'), [warrants]);
    const geocodedWarrants = useMemo(() => openWarrants.filter(w => w.latitude && w.longitude), [openWarrants]);

    // --- Tactical Advisor Logic ---
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

        const crimes = openWarrants.reduce((acc, w) => {
            const c = w.crime || 'Outros';
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostCommonCrime = Object.entries(crimes).sort((a, b) => b[1] - a[1])[0];
        if (mostCommonCrime) {
            insights.dailyAdvice = `Foco sugerido para hoje: ${mostCommonCrime[0]}. Existem ${mostCommonCrime[1]} alvos ativos com essa natureza. Recomenda-se abordagem tática concentrada.`;
        }

        const neighborhoodGroups = openWarrants.reduce((acc, w) => {
            if (w.location) {
                const parts = w.location.split(',');
                const neighborhood = parts.length > 1 ? parts[1].trim() : 'Região Geral';
                acc[neighborhood] = acc[neighborhood] || [];
                acc[neighborhood].push(w);
            }
            return acc;
        }, {} as Record<string, Warrant[]>);

        Object.entries(neighborhoodGroups).slice(0, 3).forEach(([name, targets]) => {
            if (targets.length >= 2) {
                insights.missions.push({
                    title: `Saturação: ${name}`,
                    count: targets.length,
                    targets: targets.map(t => t.name),
                    reason: `Concentração detectada no bairro ${name}.`
                });
            }
        });

        const urgencyCount = openWarrants.filter(w => (w as any).tags?.includes('Urgente')).length;
        if (urgencyCount > 0) {
            insights.criticalAlerts.push({
                title: "Prioridade Urgente",
                type: "HIGH",
                detail: `Existem ${urgencyCount} mandados urgentes aguardando cumprimento.`
            });
        }

        return insights;
    }, [openWarrants]);

    // --- Lab Analysis Logic ---
    const handleLabAnalyze = () => {
        if (!labInput.trim()) return;
        setIsAnalyzing(true);
        setLabResult(null);

        // Simulated AI/Confrontation Logic
        setTimeout(() => {
            const results: typeof labResult = {
                entities: [],
                intelligence: [],
                riskLevel: 'LOW'
            };

            // 1. Simple Entity Extraction (Regex based sim)
            const cpfMatch = labInput.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g);
            if (cpfMatch) {
                cpfMatch.forEach(cpf => {
                    const match = warrants.find(w => w.cpf === cpf);
                    results.entities.push({ type: 'CPF', value: cpf, match: match ? match.name : undefined });
                });
            }

            const plateMatch = labInput.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/g); // Mercosul/Old sim
            if (plateMatch) {
                plateMatch.forEach(p => results.entities.push({ type: 'PLACA', value: p }));
            }

            // 2. Cross Check against existing targets names
            warrants.forEach(w => {
                if (labInput.toLowerCase().includes(w.name.toLowerCase().split(' ')[0])) {
                    if (!results.entities.some(e => e.value === w.name)) {
                        results.entities.push({ type: 'ALVO', value: w.name, match: 'Detectado no Banco' });
                    }
                }
            });

            // 3. Generate Intelligence Points
            if (results.entities.length > 0) {
                results.intelligence.push(`Identificado(s) ${results.entities.length} item(ns) de interesse jurídico no texto.`);
            }
            if (results.entities.some(e => e.match)) {
                results.intelligence.push("ALERTA: O texto menciona alvos que já possuem mandados ativos no banco.");
                results.riskLevel = 'HIGH';
            } else {
                results.riskLevel = labInput.length > 500 ? 'MEDIUM' : 'LOW';
            }

            if (labInput.toLowerCase().includes('tiro') || labInput.toLowerCase().includes('arma')) {
                results.intelligence.push("Nota: Menção a armamento ou violência detectada.");
                results.riskLevel = 'HIGH';
            }

            setLabResult(results);
            setIsAnalyzing(false);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 pb-20 flex flex-col">
            <Header title="Inteligência Operacional" back showHome />

            {/* Navigation Tabs */}
            <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 gap-2 overflow-x-auto scrollbar-hide">
                <TabButton
                    active={view === 'advisor'}
                    onClick={() => setView('advisor')}
                    icon={<Zap size={18} />}
                    label="Assessor"
                />
                <TabButton
                    active={view === 'lab'}
                    onClick={() => setView('lab')}
                    icon={<Microscope size={18} />}
                    label="Laboratório Analítico"
                />
                <TabButton
                    active={view === 'map'}
                    onClick={() => setView('map')}
                    icon={<Target size={18} />}
                    label="Mapa"
                />
                <TabButton
                    active={view === 'network'}
                    onClick={() => setView('network')}
                    icon={<Share2 size={18} />}
                    label="Vínculos"
                />
            </div>

            <main className="flex-1 relative overflow-y-auto">

                {/* 1. TACTICAL ADVISOR */}
                {view === 'advisor' && (
                    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
                        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-20"><Lightbulb size={80} /></div>
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Briefing de Viatura</h4>
                                <h3 className="text-xl font-bold mb-4">Conselho Estratégico</h3>
                                <p className="text-sm leading-relaxed text-indigo-50 font-medium italic">"{tacticalInsights.dailyAdvice}"</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <h5 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><TrendingUp size={14} /> Missões Sugeridas</h5>
                                {tacticalInsights.missions.map((m, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h6 className="font-bold text-sm text-primary">{m.title}</h6>
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-black">{m.count} ALVOS</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mb-3">{m.reason}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <h5 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><AlertTriangle size={14} /> Alertas Críticos</h5>
                                {tacticalInsights.criticalAlerts.length > 0 ? tacticalInsights.criticalAlerts.map((a, idx) => (
                                    <div key={idx} className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0"><AlertTriangle size={20} /></div>
                                        <div>
                                            <h6 className="font-bold text-sm text-rose-600 dark:text-rose-400">{a.title}</h6>
                                            <p className="text-[10px] text-rose-500/80 mt-1">{a.detail}</p>
                                        </div>
                                    </div>
                                )) : <div className="p-8 text-center text-slate-400 text-xs">Nenhum alerta crítico.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. INVESTIGATIVE LAB (The requested feature) */}
                {view === 'lab' && (
                    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Input Panel */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-lg font-black flex items-center gap-2">
                                        <FileSearch className="text-primary" /> Entrada de Inteligência
                                    </h3>
                                    <p className="text-xs text-slate-500">Cole relatórios, depoimentos ou dados diversos para cruzamento analítico.</p>
                                </div>
                                <div className="relative">
                                    <textarea
                                        className="w-full h-64 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner resize-none focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                                        placeholder="Cole aqui as informações brutas (Ex: Relatório de Campo, Transcrições, Dados iFood...)"
                                        value={labInput}
                                        onChange={(e) => setLabInput(e.target.value)}
                                    />
                                    <button
                                        onClick={handleLabAnalyze}
                                        disabled={!labInput.trim() || isAnalyzing}
                                        className="absolute bottom-4 right-4 bg-primary text-white px-6 py-2.5 rounded-xl font-black text-sm uppercase shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={16} />}
                                        Confrontar Dados
                                    </button>
                                </div>
                            </div>

                            {/* Info Panel */}
                            <div className="w-full md:w-80 space-y-4">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
                                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                                        <Brain size={16} /> Como funciona:
                                    </h4>
                                    <ul className="space-y-3">
                                        <LabStep icon={<Target size={14} />} text="Extração de CPFs, Placas e Nomes vinculados." />
                                        <LabStep icon={<Users size={14} />} text="Cruzamento com Mandados Ativos no Banco." />
                                        <LabStep icon={<Shield size={14} />} text="Identificação de pontos de risco e interesse." />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Results */}
                        {labResult && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pt-4">
                                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Intelligence Summary */}
                                    <div className="md:col-span-2 space-y-4">
                                        <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">Resumo da Análise</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {labResult.intelligence.map((item, i) => (
                                                <div key={i} className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex gap-3 text-sm">
                                                    <Info size={18} className="text-primary shrink-0" />
                                                    <p className="font-medium">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Risk Badge */}
                                    <div>
                                        <h4 className="text-xs font-black uppercase text-slate-400 mb-4">Nível de Interesse</h4>
                                        <div className={`p-6 rounded-3xl border text-center ${labResult.riskLevel === 'HIGH' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30' :
                                                labResult.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30' :
                                                    'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                                            }`}>
                                            <h2 className={`text-3xl font-black ${labResult.riskLevel === 'HIGH' ? 'text-rose-600' :
                                                    labResult.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                                                }`}>{labResult.riskLevel === 'HIGH' ? 'CRÍTICO' : labResult.riskLevel === 'MEDIUM' ? 'ALTO' : 'NORMAL'}</h2>
                                            <p className="text-[10px] uppercase font-bold text-slate-500 mt-2">Prioridade de Investigação</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Entities Grid */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-400">Entidades Extraídas e Confrontadas</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {labResult.entities.map((en, i) => (
                                            <div key={i} className={`p-3 rounded-xl border ${en.match ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                                <p className={`text-[8px] font-black uppercase ${en.match ? 'text-white/70' : 'text-slate-400'}`}>{en.type}</p>
                                                <p className="text-xs font-bold truncate">{en.value}</p>
                                                {en.match && (
                                                    <div className="mt-1 flex items-center gap-1 group">
                                                        <Search size={10} className="animate-pulse" />
                                                        <span className="text-[9px] font-black truncate">{en.match}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. MAP VIEW */}
                {view === 'map' && (
                    <div className="h-[calc(100vh-140px)] w-full relative">
                        <MapContainer center={[-23.5505, -46.6333] as any} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                            {geocodedWarrants.map(w => (
                                <Marker key={w.id} position={[w.latitude!, w.longitude!]}>
                                    <Popup><div className="p-1 min-w-[150px] font-bold">{w.name}</div></Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                )}

                {/* 4. NETWORK VIEW */}
                {view === 'network' && (
                    <div className="p-6">
                        <h3 className="text-xl font-black mb-6">Teia de Vínculos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {openWarrants.slice(0, 9).map((w, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-primary uppercase mb-1">Link de Interesse</p>
                                        <p className="text-xs font-bold truncate">{w.name}</p>
                                    </div>
                                    <Share2 size={16} className="text-slate-300 ml-4" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50">
                <div className="max-w-md mx-auto flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sistema Online
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase"><Shield size={10} /> Canal Criptografado</div>
                </div>
            </div>
        </div>
    );
};

// --- Helpers ---
const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 pb-3 pt-2 text-[11px] font-bold uppercase tracking-tight transition-all border-b-2 whitespace-nowrap ${active ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
        {icon}
        {label}
    </button>
);

const LabStep = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <li className="flex gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        <div className="mt-0.5 text-primary">{icon}</div>
        <span>{text}</span>
    </li>
);

export default IntelCenter;
