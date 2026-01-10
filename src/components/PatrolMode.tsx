
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Bell, Navigation, AlertCircle, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { Warrant } from '../types';
import { calculateDistance } from '../utils/geoUtils';
import { useNavigate } from 'react-router-dom';

interface PatrolModeProps {
    warrants: Warrant[];
}

const PatrolMode = ({ warrants }: PatrolModeProps) => {
    const [isActive, setIsActive] = useState(false);
    const [userPos, setUserPos] = useState<{ lat: number, lng: number } | null>(null);
    const [nearbyWarrants, setNearbyWarrants] = useState<Warrant[]>([]);
    const watchId = useRef<number | null>(null);
    const navigate = useNavigate();
    const lastAlertedIds = useRef<Set<string>>(new Set());

    const startPatrol = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalização não suportada no seu dispositivo.");
            return;
        }

        setIsActive(true);
        toast.success("Modo Patrulhamento Ativado. Monitorando 300m ao redor.");

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserPos({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Erro GPS:", error);
                toast.error("Erro ao obter localização. Verifique o GPS.");
                stopPatrol();
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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

        const filtered = warrants.filter(w => {
            if (w.status !== 'EM ABERTO' || !w.latitude || !w.longitude) return false;

            const dist = calculateDistance(userPos.lat, userPos.lng, w.latitude, w.longitude);
            return dist <= 300; // 300 meters
        });

        setNearbyWarrants(filtered);

        // Alert for new entries in radius
        filtered.forEach(w => {
            if (!lastAlertedIds.current.has(w.id)) {
                lastAlertedIds.current.add(w.id);
                // Trigger an alert
                toast.error(`ALVO DETECTADO! ${w.name} está na região (300m).`, {
                    duration: 10000,
                    description: `Endereço: ${w.location}`,
                    action: {
                        label: 'VER ALVO',
                        onClick: () => navigate(`/warrant-detail/${w.id}`)
                    }
                });
                // Attempt to vibrate if supported
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            }
        });

        // Cleanup old alerts from tracking if they are far now
        const currentIds = new Set(filtered.map(w => w.id));
        lastAlertedIds.current.forEach(id => {
            if (!currentIds.has(id)) {
                // If the target is no longer in range according to calculation, we keep it in alerted
                // to avoid double alerts if GPS jitters, but maybe we should expire it?
                // For now, let's just keep track of what was alerted during this session.
            }
        });

    }, [userPos, warrants, isActive, navigate]);

    return (
        <div className="fixed top-20 right-4 z-50 flex flex-col items-end gap-2">
            {!isActive ? (
                <button
                    onClick={startPatrol}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-white dark:ring-surface-dark transition-transform active:scale-95 animate-pulse"
                >
                    <Shield size={24} />
                </button>
            ) : (
                <div className="flex flex-col items-end gap-2">
                    <button
                        onClick={stopPatrol}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 ring-4 ring-white dark:ring-surface-dark transition-transform active:scale-95"
                    >
                        <X size={24} />
                    </button>

                    {nearbyWarrants.length > 0 && (
                        <div className="bg-red-600 text-white p-3 rounded-2xl shadow-xl border-4 border-white dark:border-surface-dark animate-bounce-subtle max-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Alerta de Proximidade</span>
                            </div>
                            <p className="text-xs font-bold leading-tight">
                                {nearbyWarrants.length} {nearbyWarrants.length === 1 ? 'Alvo detectado' : 'Alvos detectados'} a menos de 300m.
                            </p>
                        </div>
                    )}

                    <div className="bg-primary/90 backdrop-blur-md text-white p-2 px-3 rounded-full shadow-lg flex items-center gap-2 border border-white/20">
                        <Navigation size={12} className="animate-spin-slow" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Patrulha Ativa</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatrolMode;
