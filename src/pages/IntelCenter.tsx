
import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Warrant } from '../types';
import Header from '../components/Header';
import {
    Shield, Map as MapIcon, Share2,
    Activity, Zap, Target, Users,
    Search, Filter, LayoutGrid
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
    const [view, setView] = useState<'map' | 'network' | 'warroom' | 'ai'>('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ title: string, content: string } | null>(null);

    const geocodedWarrants = useMemo(() => {
        return warrants.filter(w => w.latitude && w.longitude && w.status !== 'CUMPRIDO');
    }, [warrants]);

    // Simple Network Logic: Link people by same crime or same fragment of location/observation
    const connections = useMemo(() => {
        const links: { source: string, target: string, reason: string }[] = [];
        const active = warrants.slice(0, 20); // Limit for performance/viz

        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const w1 = active[i];
                const w2 = active[j];

                if (w1.crime && w2.crime && w1.crime === w2.crime) {
                    links.push({ source: w1.name, target: w2.name, reason: 'Mesma Natureza' });
                } else if (w1.location && w2.location && w1.location.split(',')[0] === w2.location.split(',')[0]) {
                    links.push({ source: w1.name, target: w2.name, reason: 'Proximidade Residencial' });
                }
            }
        }
        return links;
    }, [warrants]);

    const runScan = (type: string) => {
        setIsScanning(true);
        setScanResult(null);

        // Simulate intelligence processing
        setTimeout(() => {
            setIsScanning(false);
            if (type === 'cross') {
                const duplicates = warrants.filter(w => w.cpf && warrants.filter(x => x.cpf === w.cpf).length > 1);
                setScanResult({
                    title: "Cruzamento de Dados - Resultado",
                    content: duplicates.length > 0
                        ? `Identificados ${duplicates.length} registros com CPFs duplicados ou vínculos diretos de parentesco.`
                        : "Nenhuma duplicidade crítica encontrada no banco atual. Vínculos por endereço estão sendo mapeados."
                });
            } else if (type === 'ifood') {
                const ifoodCount = warrants.filter(w => w.ifoodNumber).length;
                setScanResult({
                    title: "Análise iFood - Inteligência",
                    content: `Temos ${ifoodCount} alvos com dados de iFood ativos. Cruzando horários de pedidos para predição de presença.`
                });
            } else if (type === 'tactical') {
                setScanResult({
                    title: "Plano Tático Sugerido",
                    content: "Baseado na densidade de alvos na Zona Norte, recomenda-se Operação Saturação entre 04:00 e 06:00 de amanhã."
                });
            }
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 pb-20 overflow-hidden flex flex-col relative">
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .scan-line {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #6366f1, transparent);
                    box-shadow: 0 0 15px #6366f1;
                    z-index: 1000;
                    animation: scan 3s linear infinite;
                    pointer-events: none;
                }
                .leaflet-container {
                    filter: saturate(0.8) contrast(1.1);
                }
            `}</style>

            <Header title="Centro de Inteligência PCSP" back showHome />

            {/* Sub-Header / Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-4 py-2 gap-2 overflow-x-auto">
                <TabButton
                    active={view === 'map'}
                    onClick={() => setView('map')}
                    icon={<MapIcon size={16} />}
                    label="Radar Geográfico"
                />
                <TabButton
                    active={view === 'network'}
                    onClick={() => setView('network')}
                    icon={<Share2 size={16} />}
                    label="Análise de Vínculos"
                />
                <TabButton
                    active={view === 'warroom'}
                    onClick={() => setView('warroom')}
                    icon={<Activity size={16} />}
                    label="War Room Live"
                />
                <TabButton
                    active={view === 'ai'}
                    onClick={() => setView('ai')}
                    icon={<Zap size={16} />}
                    label="IA Conselheira"
                />
            </div>

            <div className="flex flex-1 relative overflow-hidden">
                {/* Left Sidebar - Action Center */}
                <aside className="w-16 md:w-64 border-r border-slate-800 bg-[#020617] hidden lg:flex flex-col p-4 gap-6">
                    <div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Comandos de Elite</h4>
                        <div className="space-y-2">
                            <ActionButton
                                icon={<Search size={18} />}
                                label="Cruzamento CPFs"
                                sublabel="Busca Vínculos"
                                onClick={() => runScan('cross')}
                            />
                            <ActionButton
                                icon={<Target size={18} />}
                                label="Análise iFood"
                                sublabel="Predição Loc."
                                onClick={() => runScan('ifood')}
                            />
                            <ActionButton
                                icon={<LayoutGrid size={18} />}
                                label="Invasão Tática"
                                sublabel="Simular Cerco"
                                onClick={() => runScan('tactical')}
                            />
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield size={16} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase">Status Cripto</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-slate-400">CONEXÃO SEGURA</span>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 relative overflow-y-auto">

                    {/* 1. TACTICAL MAP VIEW */}
                    {view === 'map' && (
                        <div className="h-full w-full relative">
                            <MapContainer
                                center={[-23.5505, -46.6333] as any}
                                zoom={12}
                                style={{ height: '100%', width: '100%' }}
                                className="z-0"
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                />
                                {geocodedWarrants.map(w => (
                                    <React.Fragment key={w.id}>
                                        <Marker position={[w.latitude!, w.longitude!]}>
                                            <Popup className="custom-popup">
                                                <div className="p-2 text-slate-900 min-w-[200px]">
                                                    <h4 className="font-black border-b pb-1 mb-1">{w.name}</h4>
                                                    <p className="text-[10px] uppercase font-bold text-rose-600">{w.type}</p>
                                                    <p className="text-[10px] mt-1"><b>CRIME:</b> {w.crime}</p>
                                                    <p className="text-[10px]"><b>STATUS:</b> {w.status}</p>
                                                    <button className="mt-2 w-full bg-indigo-600 text-white text-[10px] font-bold py-1 rounded">GERAR ROTA TÁTICA</button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                        <Circle
                                            center={[w.latitude!, w.longitude!]}
                                            radius={500}
                                            pathOptions={{ fillColor: 'red', color: 'transparent', fillOpacity: 0.1 }}
                                        />
                                    </React.Fragment>
                                ))}
                            </MapContainer>

                            <div className="scan-line" />

                            {/* Map Overlay Stats */}
                            <div className="absolute top-4 right-4 z-[1000] space-y-2">
                                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl">
                                    <h5 className="text-[10px] font-black uppercase text-indigo-400 mb-2">Resumo de Área</h5>
                                    <div className="space-y-2">
                                        <AreaStat label="Alvos Detectados" value={geocodedWarrants.length} color="blue" />
                                        <AreaStat label="Crimes de Sangue" value={geocodedWarrants.filter(w => (w.crime || '').includes('Homicídio')).length} color="rose" />
                                        <AreaStat label="Tráfico / Narcóticos" value={geocodedWarrants.filter(w => (w.crime || '').toLowerCase().includes('tráfico')).length} color="emerald" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. NETWORK ANALYSIS VIEW */}
                    {view === 'network' && (
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white">Análise Gráfica de Vínculos</h3>
                                    <p className="text-xs text-slate-400">Identificação automática de associações criminosas baseada em padrões de dados.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="bg-white/5 border border-white/10 p-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">EXPORTAR GRAFO</button>
                                    <button className="bg-indigo-600 p-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20">RECALCULAR</button>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-900/40 rounded-3xl border border-white/5 p-8 relative overflow-hidden">
                                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                    {geocodedWarrants.slice(0, 9).map(w => (
                                        <div key={w.id} className="bg-[#1e293b]/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col gap-3 group hover:border-indigo-500/50 transition-all duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 overflow-hidden bg-slate-800 shrink-0">
                                                    <img src={w.img || `https://ui-avatars.com/api/?name=${w.name}&background=random`} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-black truncate">{w.name}</h4>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase">{w.crime}</p>
                                                </div>
                                                <Share2 size={14} className="text-indigo-400" />
                                            </div>
                                            <div className="space-y-1.5 pt-3 border-t border-white/5">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase">Vínculos Gerados:</p>
                                                {connections.filter(c => c.source === w.name || c.target === w.name).map((c, i) => (
                                                    <div key={i} className="flex items-center justify-between text-[10px] bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
                                                        <span className="font-bold text-indigo-300">{c.source === w.name ? c.target : c.source}</span>
                                                        <span className="text-[8px] bg-indigo-500/20 px-1.5 rounded-full text-indigo-400">{c.reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. WAR ROOM LIVE VIEW */}
                    {view === 'warroom' && (
                        <div className="h-full p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Live Notifications */}
                                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full text-[10px] font-black animate-pulse">
                                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> LIVE MONITORING
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                                        <Activity className="text-indigo-500" /> Atividade em Tempo Real
                                    </h3>
                                    <div className="space-y-4">
                                        <LiveLog
                                            time="09:42"
                                            type="UPDATE"
                                            msg={`Informação iFood recebida para: ${warrants[0]?.name}`}
                                            color="indigo"
                                        />
                                        <LiveLog
                                            time="09:15"
                                            type="ROUTE"
                                            msg="Equipe BRAVO iniciou rota operacional na Zona Sul"
                                            color="emerald"
                                        />
                                        <LiveLog
                                            time="08:30"
                                            type="ALERT"
                                            msg="Tentativa de captura sem sucesso: ALVO J. SILVA fugiu pelo telhado"
                                            color="rose"
                                        />
                                        <LiveLog
                                            time="07:45"
                                            type="SUCCESS"
                                            msg="MANDADO CUMPRIDO: Alvo preso no bairro Jd. Planalto"
                                            color="emerald"
                                        />
                                    </div>
                                </div>

                                {/* Tactical Radar Widget */}
                                <div className="bg-indigo-600 rounded-3xl p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/20">
                                    <div>
                                        <Target className="text-white mb-4" size={32} />
                                        <h4 className="text-xl font-black leading-tight mb-2">Prioridade Nível 01</h4>
                                        <p className="text-xs text-indigo-100 opacity-80 uppercase font-bold tracking-widest">Alvos Mais Procurados por Região</p>
                                    </div>
                                    <div className="mt-8 space-y-3">
                                        <PriorityItem label="Zona Norte" value="12 Alvos" progress={75} />
                                        <PriorityItem label="Zona Leste" value="08 Alvos" progress={45} />
                                        <PriorityItem label="Central" value="04 Alvos" progress={30} />
                                    </div>
                                </div>
                            </div>

                            {/* Operative Grid */}
                            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
                                <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Base de Dados Tática - Seleção Inteligência</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {warrants.slice(0, 12).map(w => (
                                        <div key={w.id} className="bg-slate-800/50 p-2 rounded-xl border border-white/5 hover:bg-slate-700 transition-colors">
                                            <div className="w-full aspect-square bg-slate-900 rounded-lg mb-2 overflow-hidden">
                                                <img src={w.img || `https://ui-avatars.com/api/?name=${w.name}&background=random`} alt="" className="w-full h-full object-cover opacity-80" />
                                            </div>
                                            <p className="text-[10px] font-black truncate">{w.name}</p>
                                            <p className="text-[8px] font-bold text-slate-500 group-hover:text-indigo-400">{w.status}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. AI ADVISOR VIEW */}
                    {view === 'ai' && (
                        <div className="h-full p-8 flex flex-col gap-6 max-w-4xl mx-auto">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                                    <Zap size={32} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white">Conselheiro IA</h2>
                                    <p className="text-slate-400">Insights estratégicos baseados em Big Data Policial.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-indigo-500/50 transition-colors">
                                    <h4 className="font-black text-indigo-400 text-xs uppercase mb-4">Recomendações Prisionais</h4>
                                    <ul className="space-y-4">
                                        <li className="flex gap-3 text-sm">
                                            <div className="w-1 h-auto bg-amber-500 rounded-full" />
                                            <span>Foco em alvos de <b>Regime Semiaberto</b>: 15% de chance de evasão na zona sul nas próximas 48h.</span>
                                        </li>
                                        <li className="flex gap-3 text-sm">
                                            <div className="w-1 h-auto bg-rose-500 rounded-full" />
                                            <span>Priorizar capturas de <b>Homicídio</b> na Central; padrões sugerem deslocamento para o litoral.</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-indigo-500/50 transition-colors">
                                    <h4 className="font-black text-emerald-400 text-xs uppercase mb-4">Logística Operacional</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                                            <span className="text-xs font-bold">Eficiência de Rota</span>
                                            <span className="text-emerald-400 font-black">+22%</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                                            <span className="text-xs font-bold">Risco de Resistência</span>
                                            <span className="text-rose-400 font-black">MÉDIO</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-600 p-8 rounded-[40px] relative overflow-hidden mt-auto">
                                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                                <h3 className="text-2xl font-black mb-2">Relatório Sintético IA</h3>
                                <p className="text-indigo-100 text-sm opacity-80 mb-6">"O banco de dados atual possui uma concentração anômala de mandados na região Central. Recomenda-se força-tarefa multidisciplinar para cumprimento simultâneo em 4 endereços vinculados pelo mesmo processo."</p>
                                <button className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-transform">Baixar Ordem de Missão</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Global Scanners & Modals */}
            {isScanning && (
                <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-[2000] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-32 h-32 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
                        <h4 className="text-2xl font-black text-white animate-pulse">PROCESSANDO BIG DATA...</h4>
                        <p className="text-indigo-400 font-mono mt-2 uppercase tracking-widest text-[10px]">Criptografando Canais | Cruzando Metadados</p>
                    </div>
                </div>
            )}

            {scanResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2001] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-black text-indigo-400">{scanResult.title}</h3>
                                <button onClick={() => setScanResult(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Shield size={20} /></button>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">{scanResult.content}</p>
                            <button onClick={() => setScanResult(null)} className="w-full bg-indigo-600 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-500/20">FECHAR TERMINAL</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Helpers ---

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 translate-y-[-2px]'
            : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
    >
        {icon}
        {label}
    </button>
);

const ActionButton = ({ icon, label, sublabel, onClick }: { icon: React.ReactNode, label: string, sublabel: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-left hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
    >
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            {icon}
        </div>
        <div>
            <p className="text-xs font-black text-white">{label}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{sublabel}</p>
        </div>
    </button>
);

const AreaStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex items-center justify-between gap-8">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
        <span className={`text-sm font-black text-${color}-500`}>{value}</span>
    </div>
);

const LiveLog = ({ time, type, msg, color }: { time: string, type: string, msg: string, color: string }) => {
    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };
    return (
        <div className={`p-3 rounded-2xl border flex items-start gap-4 ${colorMap[color] || colorMap.indigo}`}>
            <span className="text-[10px] font-black opacity-50 pt-0.5">{time}</span>
            <div className="flex-1">
                <p className="text-[10px] font-black uppercase mb-0.5">{type}</p>
                <p className="text-xs font-bold">{msg}</p>
            </div>
        </div>
    );
};

const PriorityItem = ({ label, value, progress }: { label: string, value: string, progress: number }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-black uppercase text-indigo-100">
            <span>{label}</span>
            <span>{value}</span>
        </div>
        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
    </div>
);

export default IntelCenter;
