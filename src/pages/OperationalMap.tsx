import React, { useEffect, useState, useMemo } from 'react';
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
import { RefreshCw, User, MapPin } from 'lucide-react';

// Custom Icons for different warrant types
const createIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const prisonIcon = createIcon('blue');
const searchIcon = createIcon('orange');

const getMarkerIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('busca') || t.includes('apreensão')) {
        return searchIcon;
    }
    return prisonIcon;
};

interface OperationalMapProps {
    warrants?: Warrant[];
    onUpdate?: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
}

const OperationalMap = ({ warrants: initialWarrants, onUpdate }: OperationalMapProps) => {
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = initialWarrants || await getWarrants();
                // Show only mapped ones
                setWarrants(data.filter(w => w.latitude && w.longitude));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [initialWarrants]);

    const handleBulkSync = async () => {
        if (!onUpdate) return;
        const all = initialWarrants || await getWarrants();
        const unmapped = all.filter(w => w.status === 'EM ABERTO' && (!w.latitude || !w.longitude) && w.location);

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
                await onUpdate(w.id, { latitude: res.lat, longitude: res.lng });
                count++;
            }
            // Small delay to respect Nominatim usage policy
            await new Promise(r => setTimeout(r, 1000));
        }

        setIsSyncing(false);
        toast.success(`${count} endereços mapeados com sucesso!`, { id: tid });
    };

    const center = useMemo(() => {
        const pLat = searchParams.get('lat');
        const pLng = searchParams.get('lng');

        if (pLat && pLng) {
            return [parseFloat(pLat), parseFloat(pLng)] as any;
        }

        if (warrants.length === 0) return [-23.55052, -46.633309]; // Default SP Center

        // Simple clustering: finding the warrant that has more neighbors within ~2km
        let bestWarrant = warrants[0];
        let maxNeighbors = -1;

        warrants.forEach(w1 => {
            let neighbors = 0;
            warrants.forEach(w2 => {
                const dLat = Math.abs(w1.latitude! - w2.latitude!);
                const dLng = Math.abs(w1.longitude! - w2.longitude!);
                if (dLat < 0.02 && dLng < 0.02) neighbors++; // approx 2km
            });
            if (neighbors > maxNeighbors) {
                maxNeighbors = neighbors;
                bestWarrant = w1;
            }
        });

        return [bestWarrant.latitude!, bestWarrant.longitude!] as any;
    }, [warrants, searchParams]);

    return (
        <div className="min-h-screen bg-background-dark text-text-dark font-display flex flex-col relative overflow-hidden">
            <Header title="Mapa Tático" back showHome />

            {/* Map Container */}
            <div className="flex-1 relative z-0">
                {typeof window !== 'undefined' && (
                    <MapContainer
                        center={center}
                        zoom={13}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', background: '#09090b' }}
                        zoomControl={false}
                    >
                        {/* Dark Matter Tiles (Tactical Look) */}
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {warrants.map(w => (
                            <Marker
                                key={w.id}
                                position={[w.latitude!, w.longitude!]}
                                icon={getMarkerIcon(w)}
                            >
                                <Popup className="tactical-popup border-none bg-transparent shadow-none" closeButton={false}>
                                    <div className="w-[220px] bg-surface-dark/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-glass overflow-hidden font-display text-text-dark">
                                        {/* Header Color Bar */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 ${getMarkerIcon(w) === highRiskMarker ? 'bg-risk-high' : (getMarkerIcon(w) === searchMarker ? 'bg-amber-500' : 'bg-primary')}`}></div>

                                        <div className="flex justify-between items-start mb-2 mt-1">
                                            <h3 className="font-bold text-sm text-white leading-tight pr-2">{w.name}</h3>
                                            {getMarkerIcon(w) === highRiskMarker && <ShieldAlert size={14} className="text-risk-high shrink-0 animate-pulse" />}
                                        </div>

                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getMarkerIcon(w) === highRiskMarker ? 'bg-risk-high' : 'bg-primary'}`}></div>
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
                            className="w-full mt-3 bg-white/5 hover:bg-white/10 border border-white/5 text-text-secondary-dark text-[9px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'SYNC...' : 'ATUALIZAR GPS'}
                        </button>
                    </div>
                </div>
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

            <BottomNav />
        </div>
    );
}

export default OperationalMap;
