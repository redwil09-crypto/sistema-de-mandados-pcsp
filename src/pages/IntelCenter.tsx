
import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Warrant } from '../types';
import Header from '../components/Header';
import {
    Map as MapIcon, Share2,
    Target, Users, Search,
    Filter, Info, Shield
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
    const [view, setView] = useState<'map' | 'network'>('map');

    // Only show open warrants with location
    const geocodedWarrants = useMemo(() => {
        return warrants.filter(w => w.latitude && w.longitude && w.status === 'EM ABERTO');
    }, [warrants]);

    // Simple Link Analysis Logic
    const connections = useMemo(() => {
        const links: { source: string, target: string, reason: string }[] = [];
        const active = warrants.filter(w => w.status === 'EM ABERTO').slice(0, 30);

        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const w1 = active[i];
                const w2 = active[j];

                // Check crime similarity
                if (w1.crime && w2.crime && w1.crime === w2.crime && w1.crime !== 'Não informado') {
                    links.push({ source: w1.name, target: w2.name, reason: 'Mesmo Crime' });
                }
                // Check address proximity (approx same street/neighborhood)
                else if (w1.location && w2.location && w1.location.substring(0, 15) === w2.location.substring(0, 15)) {
                    links.push({ source: w1.name, target: w2.name, reason: 'Mesmo Logradouro' });
                }
                // Check process similarity
                else if (w1.number && w2.number && w1.number === w2.number) {
                    links.push({ source: w1.name, target: w2.name, reason: 'Mesmo Processo' });
                }
            }
        }
        return links;
    }, [warrants]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 pb-20 flex flex-col">
            <Header title="Inteligência Operacional" back showHome />

            {/* Navigation Tabs - Simple and Direct */}
            <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-4 gap-4">
                <button
                    onClick={() => setView('map')}
                    className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold transition-all border-b-2 ${view === 'map'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Target size={18} />
                    Mapeamento de Alvos
                </button>
                <button
                    onClick={() => setView('network')}
                    className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold transition-all border-b-2 ${view === 'network'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Share2 size={18} />
                    Vínculos Detectados
                </button>
            </div>

            <main className="flex-1 relative">

                {/* 1. SIMPLE MAP VIEW */}
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

                        {/* Simple Info Overlay */}
                        <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 pointer-events-none">
                            <h5 className="text-[10px] font-black uppercase text-slate-400 mb-2">Monitoramento Ativo</h5>
                            <div className="space-y-1">
                                <div className="flex justify-between gap-6 text-sm font-bold">
                                    <span>Total em Aberto:</span>
                                    <span className="text-primary">{geocodedWarrants.length}</span>
                                </div>
                                <p className="text-[9px] text-slate-400">Visualizando alvos com localização</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. SIMPLE NETWORK VIEW */}
                {view === 'network' && (
                    <div className="p-4 md:p-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-black">Teia de Vínculos</h3>
                            <p className="text-sm text-slate-500">Alvos que compartilham crimes, locais ou processos.</p>
                        </div>

                        {connections.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                                <Info size={40} className="mx-auto text-slate-300 mb-4" />
                                <p className="font-bold text-slate-400">Nenhum vínculo óbvio detectado entre os alvos atuais.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {connections.slice(0, 15).map((c, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">{c.reason}</span>
                                            <Share2 size={16} className="text-slate-300" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">A</div>
                                                <p className="text-sm font-bold truncate">{c.source}</p>
                                            </div>
                                            <div className="h-4 border-l-2 border-slate-100 dark:border-slate-800 ml-4 relative">
                                                <div className="absolute top-1/2 -left-[5px] w-2 h-2 rounded-full bg-primary" />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">B</div>
                                                <p className="text-sm font-bold truncate">{c.target}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Practical Status Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50">
                <div className="max-w-md mx-auto flex items-center justify-center gap-3 text-[10px] font-bold text-slate-500">
                    <Shield size={14} className="text-primary" />
                    <span>MODO DE OPERAÇÃO LOCAL</span>
                    <span className="opacity-30">|</span>
                    <span>DADOS CRIPTOGRAFADOS</span>
                </div>
            </div>
        </div>
    );
};

export default IntelCenter;
