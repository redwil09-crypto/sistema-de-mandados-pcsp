
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Bell, Navigation, AlertCircle, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { Warrant } from '../types';
import { calculateDistance } from '../utils/geoUtils';
import { useNavigate } from 'react-router-dom';

interface PatrolModeProps {
    warrants: Warrant[];
    variant?: 'fab' | 'button';
}

const PatrolMode = ({ warrants, variant = 'fab' }: PatrolModeProps) => {
    const [isActive, setIsActive] = useState(false);
    const [userPos, setUserPos] = useState<{ lat: number, lng: number } | null>(null);
    const [nearbyWarrants, setNearbyWarrants] = useState<{ warrant: Warrant, distance: number }[]>([]);
    const [radius, setRadius] = useState(500); // Default to 500m
    const watchId = useRef<number | null>(null);
    const navigate = useNavigate();
    const lastAlertedIds = useRef<Set<string>>(new Set());
    const lastAnnouncedIds = useRef<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(false);

    const speak = (text: string) => {
        if (!('speechSynthesis' in window)) return;
        // Optimization: Cancel any ongoing speech before starting a new urgent alert
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1; // Slightly faster for clarity
        window.speechSynthesis.speak(utterance);
    };

    const startPatrol = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalização não suportada no seu dispositivo.");
            return;
        }

        setIsActive(true);
        toast.success("Modo Patrulhamento Ativado", {
            description: `Rastreando alvos num raio de ${radius}m.`
        });

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserPos({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Erro GPS:", error);
                toast.error("Erro GPS.");
                stopPatrol();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const stopPatrol = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsActive(false);
        setUserPos(null);
        setNearbyWarrants([]);
        lastAlertedIds.current = new Set();
        toast.info("Modo Patrulhamento Desativado.");
    };

    useEffect(() => {
        if (!isActive || !userPos) return;

        const filtered = warrants
            .filter(w => w.status === 'EM ABERTO' && w.latitude && w.longitude)
            .map(w => ({
                warrant: w,
                distance: calculateDistance(userPos.lat, userPos.lng, w.latitude!, w.longitude!)
            }))
            .filter(item => item.distance <= radius)
            .sort((a, b) => a.distance - b.distance);

        setNearbyWarrants(filtered);

        // Alert for new entries in radius
        filtered.forEach(item => {
            const w = item.warrant;
            if (!lastAlertedIds.current.has(w.id)) {
                lastAlertedIds.current.add(w.id);
                // Trigger a tactical alert
                toast.error(`PROCIDADE: ${w.name}`, {
                    duration: 10000,
                    description: `Alvo a ${Math.round(item.distance)} metros de distância!`,
                    action: {
                        label: 'DETALHES',
                        onClick: () => navigate(`/warrant-detail/${w.id}`)
                    }
                });
                // Vibrate
                if ('vibrate' in navigator) navigator.vibrate([500, 200, 500]);
            }

            // Voice announcement specifically for < 200m
            if (item.distance <= 200 && !lastAnnouncedIds.current.has(w.id)) {
                lastAnnouncedIds.current.add(w.id);
                speak(`Atenção Policial: Alvo próximo. ${w.name} a menos de duzentos metros.`);
            }
        });
    }, [userPos, warrants, isActive, navigate, radius]);

    if (variant === 'button') {
        return (
            <button
                onClick={isActive ? stopPatrol : startPatrol}
                className={`flex flex-col items-center justify-center gap-1 py-2 font-bold rounded-xl shadow-lg active:scale-95 transition-all ${isActive
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-emerald-600 text-white'
                    }`}
            >
                {isActive ? <Shield size={18} className="animate-spin-slow" /> : <Shield size={18} />}
                <span className="text-[10px] uppercase">{isActive ? 'Ativo' : 'Patrulha'}</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-32 right-4 z-[100] flex flex-col items-end gap-3 pointer-events-none">
            {isActive && (
                <div className="flex flex-col items-end gap-2 pointer-events-auto">
                    {/* Radius Selector */}
                    <div className="flex items-center gap-1 bg-surface-dark/90 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-tactic mb-1">
                        {[300, 500, 1000].map(r => (
                            <button
                                key={r}
                                onClick={() => setRadius(r)}
                                className={`px-2 py-1 rounded-full text-[8px] font-black uppercase transition-all ${radius === r ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                            >
                                {r < 1000 ? `${r}m` : '1km'}
                            </button>
                        ))}
                    </div>

                    {/* Proximity Alerts */}
                    <div className="space-y-2 max-w-[240px]">
                        {nearbyWarrants.map(item => (
                            <div
                                key={item.warrant.id}
                                onClick={() => navigate(`/warrant-detail/${item.warrant.id}`)}
                                className="bg-risk-high/90 backdrop-blur-xl text-white p-3 rounded-2xl shadow-tactic border border-white/20 animate-in slide-in-from-right-4 transition-all hover:scale-105 active:scale-95 flex flex-col gap-1 cursor-pointer"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Alvo em Raio</span>
                                    </div>
                                    <span className="text-xs font-black">{Math.round(item.distance)}m</span>
                                </div>
                                <p className="text-xs font-bold truncate">{item.warrant.name}</p>
                                <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden mt-1">
                                    <div
                                        className="h-full bg-white transition-all duration-500"
                                        style={{ width: `${Math.max(10, 100 - (item.distance / radius * 100))}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={stopPatrol}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-tactic ring-4 ring-white/10 transition-transform active:scale-90"
                    >
                        <X size={28} />
                    </button>

                    <div className="bg-primary/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 border border-white/20">
                        <Navigation size={14} className="animate-spin-slow text-white" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Patrulha Ativa</span>
                            <span className="text-[7px] text-white/70 uppercase">Escaneando...</span>
                        </div>
                    </div>
                </div>
            )}

            {!isActive && (
                <button
                    onClick={startPatrol}
                    className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-tactic ring-4 ring-white/10 transition-all hover:scale-110 active:scale-90 animate-pulse"
                >
                    <Shield size={28} />
                </button>
            )}
        </div>
    );
};

export default PatrolMode;
