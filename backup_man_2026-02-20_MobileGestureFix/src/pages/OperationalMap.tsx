import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getWarrants } from '../supabaseService';
import { Warrant } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { geocodeAddress } from '../services/geocodingService';
import { toast } from 'sonner';
import { RefreshCw, MapPin, Navigation, Info, ShieldAlert } from 'lucide-react';
import { useWarrants } from '../contexts/WarrantContext';
import PatrolMode from '../components/PatrolMode';

// --- Tactical Markers (CSS-based DivIcons) ---
const createPulseIcon = (colorClass: string, glowColor: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `
        <div class="relative flex items-center justify-center w-6 h-6">
            <span class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse ${colorClass}" style="animation-duration: 3s; scale: 1.5;"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 ${colorClass}" style="box-shadow: 0 0 10px ${glowColor}"></span>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

const createStaticIcon = (colorClass: string, glowColor: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `
        <div class="relative flex items-center justify-center w-6 h-6">
            <span class="relative inline-flex rounded-full h-3 w-3 ${colorClass}" style="box-shadow: 0 0 8px ${glowColor}"></span>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

const userIcon = L.divIcon({
    className: 'user-div-icon',
    html: `
        <div class="relative flex items-center justify-center w-4 h-4">
            <div class="absolute inset-0 bg-blue-400 rounded-full opacity-40 animate-ping"></div>
            <div class="relative w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

// Preset Markers (Static)
const prisonMarkerStatic = createStaticIcon('bg-primary', '#6366f1');
const searchMarkerStatic = createStaticIcon('bg-amber-500', '#f59e0b');
const highRiskMarkerStatic = createStaticIcon('bg-risk-high', '#f43f5e');

// Preset Markers (Pulse)
const prisonMarkerPulse = createPulseIcon('bg-primary', '#6366f1');
const searchMarkerPulse = createPulseIcon('bg-amber-500', '#f59e0b');
const highRiskMarkerPulse = createPulseIcon('bg-risk-high', '#f43f5e');

const getMarkerIcon = (warrant: Warrant) => {
    const t = (warrant.type || '').toLowerCase();
    const tags = warrant.tags || [];

    // Priority markers (tagged as Urgente, Prioridade, etc.)
    const isPriority = tags.some(tag => ['Urgente', 'Prioridade', 'Ofício de Cobrança', 'Alto Risco'].includes(tag));

    if (isPriority) {
        return highRiskMarkerPulse; // Red and pulsing
    }

    if (t.includes('busca') || t.includes('apreensão')) {
        return searchMarkerStatic; // Amber/Orange static
    }

    return prisonMarkerStatic; // Primary/Blue static
};

const OperationalMap = () => {
    const { warrants: allWarrants, updateWarrant } = useWarrants();
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'prison' | 'search'>('all');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        // Filter only mapped and OPEN warrants
        let filtered = allWarrants.filter(w => w.latitude && w.longitude && w.status === 'EM ABERTO');

        // Apply type filter
        if (filter === 'prison') {
            filtered = filtered.filter(w => (w.type || '').toLowerCase().includes('prisão') || (w.type || '').toLowerCase().includes('detenção'));
        } else if (filter === 'search') {
            filtered = filtered.filter(w => (w.type || '').toLowerCase().includes('busca') || (w.type || '').toLowerCase().includes('apreensão'));
        }

        setWarrants(filtered);
        setLoading(false);

        // Get Real-time User Location (High Sensitivity)
        if ("geolocation" in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLat = pos.coords.latitude;
                    const newLng = pos.coords.longitude;

                    // Jitter Filter: Only update if moved more than ~7 meters to prevent "jumping"
                    // (Adjusted for vehicle use/higher stability)
                    setUserLocation(prev => {
                        if (!prev) return [newLat, newLng];
                        const latDiff = Math.abs(prev[0] - newLat);
                        const lngDiff = Math.abs(prev[1] - newLng);
                        if (latDiff > 0.00007 || lngDiff > 0.00007) { // Approx 7 meters
                            return [newLat, newLng];
                        }
                        return prev;
                    });
                },
                (err) => console.log("Geolocation error:", err),
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
            );
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [allWarrants, filter]); // Added filter to dependencies

    const handleBulkSync = async () => {
        const unmapped = allWarrants.filter(w => w.status === 'EM ABERTO' && (!w.latitude || !w.longitude) && w.location);

        if (unmapped.length === 0) {
            toast.info("Todos os mandados em aberto já estão mapeados.");
            return;
        }

        setIsSyncing(true);
        const tid = toast.loading(`Sincronizando ${unmapped.length} endereços...`);
        let count = 0;

        for (const w of unmapped) {
            const res = await geocodeAddress(w.location!);
            if (res) {
                await updateWarrant(w.id, { latitude: res.lat, longitude: res.lng });
                count++;
            }
            await new Promise(r => setTimeout(r, 1000)); // Rate limiting
        }

        setIsSyncing(false);
        toast.success(`${count} endereços mapeados com sucesso!`, { id: tid });
    };

    const JACAREI_COORDS = [-23.3055, -45.9642] as [number, number];

    const center = useMemo(() => {
        const pLat = searchParams.get('lat');
        const pLng = searchParams.get('lng');
        if (pLat && pLng) return [parseFloat(pLat), parseFloat(pLng)] as [number, number];

        // Default fallback
        return JACAREI_COORDS;
    }, [searchParams]);

    // Track if we have already auto-centered on user
    const [hasAutoCentered, setHasAutoCentered] = useState(false);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (userLocation && mapRef.current && !hasAutoCentered && !searchParams.get('lat')) {
            setHasAutoCentered(true);
            mapRef.current.setView(userLocation, 14);
        }
    }, [userLocation, hasAutoCentered, searchParams, mapRef.current]);

    // Ensure map updates if search params change (e.g. from Detail back to Map)
    useEffect(() => {
        const pLat = searchParams.get('lat');
        const pLng = searchParams.get('lng');
        if (pLat && pLng && mapRef.current) {
            mapRef.current.setView([parseFloat(pLat), parseFloat(pLng)], 16);
        }
    }, [searchParams]);

    const handleRecenter = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.setView(userLocation, 16, { animate: true });
        } else {
            toast.error("Localização não disponível.");
        }
    };

    // Force re-mount of map when center changes to ensure Leaflet updates correctly
    const mapKey = useMemo(() => `${center[0]}-${center[1]}`, [center]);

    return (
        <div className="h-screen bg-background-dark text-text-dark font-display flex flex-col relative overflow-hidden">
            <Header title="Mapa Tático" back showHome />

            {/* Quick Filter Top Bar */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[400] flex bg-surface-dark/80 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-tactic">
                {[
                    { id: 'all', label: 'Todos', icon: ShieldAlert },
                    { id: 'prison', label: 'Prisão', icon: Info },
                    { id: 'search', label: 'Busca', icon: MapPin }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setFilter(item.id as any)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${filter === item.id ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Map Container - Explicit Height */}
            <div className="w-full relative z-0 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
                {typeof window !== 'undefined' && (
                    <MapContainer
                        center={center}
                        zoom={14}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', background: '#09090b' }}
                        zoomControl={false}
                        ref={(map) => { mapRef.current = map; }}
                    >
                        {/* Dark Matter Tiles (Tactical Look) */}
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {userLocation && (
                            <Marker position={userLocation} icon={userIcon} zIndexOffset={1000}>
                                <Popup className="tactical-popup border-none bg-transparent shadow-none" closeButton={false}>
                                    <div className="bg-surface-dark/95 backdrop-blur-xl border border-blue-500/30 rounded-lg p-2 text-[10px] font-black uppercase text-blue-400">
                                        Sua Posição Atual
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {warrants.map(w => (
                            <Marker
                                key={w.id}
                                position={[w.latitude!, w.longitude!]}
                                icon={getMarkerIcon(w)}
                            >
                                <Popup className="tactical-popup border-none bg-transparent shadow-none" closeButton={false}>
                                    <div className="w-[220px] bg-surface-dark/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-glass overflow-hidden font-display text-text-dark">
                                        {/* Header Color Bar */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 ${(w.crime || '').toUpperCase().includes('HOMICIDIO') || (w.crime || '').toUpperCase().includes('ROUBO') || (w.crime || '').toUpperCase().includes('TRÁFICO') || (w.crime || '').toUpperCase().includes('ESTUPRO') ? 'bg-risk-high' : ((w.type || '').toLowerCase().includes('busca') ? 'bg-amber-500' : 'bg-primary')}`}></div>

                                        <div className="flex justify-between items-start mb-2 mt-1">
                                            <h3 className="font-bold text-sm text-white leading-tight pr-2">{w.name}</h3>
                                            {((w.crime || '').toUpperCase().includes('HOMICIDIO') || (w.crime || '').toUpperCase().includes('ROUBO')) && <ShieldAlert size={14} className="text-risk-high shrink-0 animate-pulse" />}
                                        </div>

                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${w.tags?.some(tag => ['Urgente', 'Prioridade', 'Ofício de Cobrança', 'Alto Risco'].includes(tag)) ? 'bg-risk-high' : 'bg-primary'}`}></div>
                                                <span className="text-[10px] font-bold uppercase text-text-secondary-dark truncate max-w-[150px]">{w.crime || 'Crime não inf.'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-1">
                                                <MapPin size={10} className="text-text-muted" />
                                                <span className="text-[9px] text-text-muted truncate">{w.location}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/warrant-detail/${w.id}`)}
                                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Info size={12} /> DETALHES
                                            </button>
                                            <a
                                                href={`https://waze.com/ul?ll=${w.latitude},${w.longitude}&navigate=yes`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Navigation size={12} /> IR
                                            </a>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}

                {/* Floating HUD Controller */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                    <div className="bg-surface-dark/90 backdrop-blur border border-white/10 p-3 rounded-xl shadow-tactic w-40">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                            <MapPin className="text-primary" size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary-dark">Radares</span>
                        </div>
                        <div className="text-2xl font-black text-white leading-none mb-1">{warrants.length}</div>
                        <div className="text-[9px] text-text-muted uppercase font-bold">Alvos na Área</div>

                        <button
                            onClick={handleBulkSync}
                            disabled={isSyncing}
                            className="w-full mt-3 bg-white/5 hover:bg-white/10 border border-white/5 text-text-secondary-dark text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'SYNC' : 'ATUALIZAR GPS'}
                        </button>
                    </div>

                    <button
                        onClick={handleRecenter}
                        className="bg-primary text-white p-3 rounded-xl shadow-tactic border border-white/10 flex items-center justify-center transition-all active:scale-95"
                    >
                        <Navigation size={20} />
                    </button>
                </div>

                {/* Integration with Patrol Mode */}
                <PatrolMode warrants={allWarrants} variant="fab" />
            </div>

            {/* Custom CSS for Popup override */}
            <style>{`
                .leaflet-popup-content-wrapper {
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    border: none !important;
                }
                .leaflet-popup-tip {
                    background: #18181b !important; /* surface-dark */
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                .leaflet-container {
                    font-family: 'Manrope', sans-serif !important;
                }
            `}</style>
        </div>
    );
}

export default OperationalMap;
