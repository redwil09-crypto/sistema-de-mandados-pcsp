
import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Warrant } from '../types';
import {
    createWarrant,
    getWarrants,
    updateWarrant as updateWarrantDb,
    deleteWarrant as deleteWarrantDb
} from '../supabaseService';
import { toast } from 'sonner';
import { CRIME_OPTIONS, REGIME_OPTIONS } from '../data/constants';

interface WarrantContextType {
    warrants: Warrant[];
    loading: boolean;
    refreshWarrants: (silent?: boolean) => Promise<void>;
    addWarrant: (w: Partial<Warrant>) => Promise<{ success: boolean; error?: string; id?: string }>;
    updateWarrant: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    deleteWarrant: (id: string) => Promise<boolean>;

    // Route Planning
    routeWarrants: string[];
    toggleRouteWarrant: (id: string) => void;
    selectedRouteWarrants: Warrant[];

    // Patrol Mode State
    isPatrolActive: boolean;
    startPatrol: () => void;
    stopPatrol: () => void;
    userPos: { lat: number, lng: number } | null;

    // Computed Lists
    prisonWarrants: Warrant[];
    searchWarrants: Warrant[];
    priorityWarrants: Warrant[];

    // Dynamic Form Options
    availableCrimes: string[];
    availableRegimes: string[];
}

const WarrantContext = createContext<WarrantContextType | undefined>(undefined);

export const WarrantProvider = ({ children }: { children: ReactNode }) => {
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [loading, setLoading] = useState(true);
    const [routeWarrants, setRouteWarrants] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('routeWarrants');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing routeWarrants from localStorage", e);
            return [];
        }
    });

    const [userPos, setUserPos] = useState<{ lat: number, lng: number } | null>(null);
    const [isPatrolActive, setIsPatrolActive] = useState(() => {
        return localStorage.getItem('isPatrolActive') === 'true';
    });
    const watchId = React.useRef<number | null>(null);
    const lastAlertedIds = React.useRef<Set<string>>(new Set());
    const lastAnnouncedIds = React.useRef<Set<string>>(new Set());

    const initialized = React.useRef(false);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            if (initialized.current) return;
            initialized.current = true;

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await refreshWarrants();
                // Resume patrol if it was active
                if (isPatrolActive) startPatrol();
            } else {
                setLoading(false);
            }
        };
        load();

        // Listen for auth changes to reload/clear
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Avoid reacting to INITIAL_SESSION if we are already handling it manually above
            if (event === 'INITIAL_SESSION' && initialized.current) return;

            if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                // If token refreshed, just update silently. DO NOT set loading true.
                refreshWarrants(true);
            } else if (!session) {
                setWarrants([]);
                setLoading(false);
                initialized.current = false;
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Persist Route Warrants
    useEffect(() => {
        localStorage.setItem('routeWarrants', JSON.stringify(routeWarrants));
    }, [routeWarrants]);

    const refreshWarrants = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await getWarrants();
            const formattedData = data || [];

            // Check for warrants that need correction (Suspensão de Regime should be OPEN)
            const needsCorrection = formattedData.filter(w =>
                (w.regime || '').toLowerCase().includes('suspensão') &&
                w.status !== 'EM ABERTO'
            );

            if (needsCorrection.length > 0) {
                console.log(`Fixing ${needsCorrection.length} warrants with regime 'Suspensão' that were closed.`);
                for (const w of needsCorrection) {
                    await updateWarrantDb(w.id, { status: 'EM ABERTO' });
                }
                // Refresh again to get the corrected state from DB
                const corrected = await getWarrants();
                setWarrants(corrected || []);
                toast.info(`${needsCorrection.length} mandados de Suspensão foram reabertos automaticamente.`);
            } else {
                setWarrants(formattedData);
            }

        } catch (err) {
            console.error("Error loading warrants:", err);
            toast.error("Erro ao carregar dados do banco.");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const addWarrant = async (w: Partial<Warrant>) => {
        const { data, error } = await createWarrant(w);
        if (data) {
            // Optimistic update or reload? Reload is safer for consistency, optimistic is faster.
            // Let's reload for now to adhere to original logic, but we can optimize later.
            await refreshWarrants();
            return { success: true, id: data.id };
        }
        return { success: false, error: error?.message || "Erro desconhecido ao salvar." };
    };

    const updateWarrant = async (id: string, updates: Partial<Warrant>) => {
        const result = await updateWarrantDb(id, updates);
        if (result) {
            // Optimistic update
            setWarrants(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
            // Background refresh to ensure consistency/triggers
            getWarrants().then(data => setWarrants(data || []));
            return true;
        }
        toast.error("Falha ao atualizar dados no servidor.");
        return false;
    };

    const deleteWarrant = async (id: string) => {
        const result = await deleteWarrantDb(id);
        if (result) {
            setWarrants(prev => prev.filter(w => w.id !== id));
            // Also remove from route if present
            setRouteWarrants(prev => prev.filter(rid => rid !== id));
            return true;
        }
        return false;
    };

    const toggleRouteWarrant = (id: string) => {
        if (!id) return;
        setRouteWarrants(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // --- Patrol Logic ---
    const speak = (text: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    };

    const startPatrol = () => {
        if (!navigator.geolocation) {
            toast.error("GPS não suportado.");
            return;
        }

        setIsPatrolActive(true);
        localStorage.setItem('isPatrolActive', 'true');
        toast.success("Patrulha Global Ativada");

        // Request Notification Permission
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        watchId.current = navigator.geolocation.watchPosition(
            (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
                console.error(err);
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
        setIsPatrolActive(false);
        localStorage.setItem('isPatrolActive', 'false');
        setUserPos(null);
        lastAlertedIds.current = new Set();
        lastAnnouncedIds.current = new Set();
        toast.info("Patrulha Desativada.");
    };

    // Haversine from geoUtils (duplicated to keep context self-contained or import if possible)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    useEffect(() => {
        if (!isPatrolActive || !userPos) return;

        const openWarrants = warrants.filter(w => w.status === 'EM ABERTO' && w.latitude && w.longitude);

        openWarrants.forEach(w => {
            const dist = calculateDistance(userPos.lat, userPos.lng, w.latitude!, w.longitude!);

            // Proximity logic
            if (dist <= 500 && !lastAlertedIds.current.has(w.id)) {
                lastAlertedIds.current.add(w.id);
                toast.error(`ALVO EM RAIO: ${w.name}`, { duration: 10000 });
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`🚨 ALVO PRÓXIMO: ${w.name}`, { body: `A aprox. ${Math.round(dist)}m.` });
                }
                if ('vibrate' in navigator) navigator.vibrate([500, 200, 500]);
            }

            if (dist <= 200 && !lastAnnouncedIds.current.has(w.id)) {
                lastAnnouncedIds.current.add(w.id);
                const crimeText = w.crime ? `, pelo crime de ${w.crime}` : '';
                speak(`Atenção Policial: Alvo próximo. ${w.name}${crimeText}, a menos de duzentos metros.`);
            }
        });
    }, [userPos, warrants, isPatrolActive]);

    // Media Session Update
    useEffect(() => {
        if (isPatrolActive && 'mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: '🔵 P. ATIVA',
                artist: 'PCSP - Sistema de Mandados',
                artwork: [{ src: 'https://img.icons8.com/color/512/police-badge.png', sizes: '512x512', type: 'image/png' }]
            });
        }
    }, [isPatrolActive]);

    // Computed Values
    const selectedRouteWarrants = useMemo(() => {
        return warrants.filter(w => routeWarrants.includes(w.id));
    }, [warrants, routeWarrants]);

    const prisonWarrants = useMemo(() => {
        return warrants.filter(w => {
            const type = (w.type || '').toLowerCase();
            const status = (w.status || '').toUpperCase();
            return !type.includes('busca') && !type.includes('apreensão') && status === 'EM ABERTO';
        });
    }, [warrants]);

    const searchWarrants = useMemo(() => {
        return warrants.filter(w => {
            const type = (w.type || '').toLowerCase();
            const status = (w.status || '').toUpperCase();
            return (type.includes('busca') || type.includes('apreensão')) && status === 'EM ABERTO';
        });
    }, [warrants]);

    const priorityWarrants = useMemo(() => {
        return warrants.filter(w => {
            const tags = w.tags || [];
            return tags.includes('Urgente') || tags.includes('Ofício de Cobrança');
        });
    }, [warrants]);

    const availableCrimes = useMemo(() => {
        const unique = new Set(CRIME_OPTIONS);
        warrants.forEach(w => {
            if (w.crime && w.crime.trim()) unique.add(w.crime.trim());
        });
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [warrants]);

    const availableRegimes = useMemo(() => {
        const unique = new Set(REGIME_OPTIONS);
        warrants.forEach(w => {
            if (w.regime && w.regime.trim()) unique.add(w.regime.trim());
        });
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [warrants]);

    return (
        <WarrantContext.Provider value={{
            warrants,
            loading,
            refreshWarrants,
            addWarrant,
            updateWarrant,
            deleteWarrant,
            routeWarrants,
            toggleRouteWarrant,
            selectedRouteWarrants,
            prisonWarrants,
            searchWarrants,
            priorityWarrants,
            availableCrimes,
            availableRegimes,
            isPatrolActive,
            startPatrol,
            stopPatrol,
            userPos
        }}>
            {children}
        </WarrantContext.Provider>
    );
};

export const useWarrants = () => {
    const context = useContext(WarrantContext);
    if (context === undefined) {
        throw new Error('useWarrants must be used within a WarrantProvider');
    }
    return context;
};
