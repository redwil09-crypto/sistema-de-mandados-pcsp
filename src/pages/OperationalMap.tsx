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
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20 flex flex-col">
            <Header title="Mapa Operacional (BETA)" />

            <div className="flex-1 relative z-0">
                {typeof window !== 'undefined' && (
                    <MapContainer center={center} zoom={11} scrollWheelZoom={true} style={{ height: '100%', width: '100%', minHeight: '80vh' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {warrants.map(w => (
                            <Marker
                                key={w.id}
                                position={[w.latitude!, w.longitude!]}
                                icon={getMarkerIcon(w.type)}
                            >
                                <Popup>
                                    <div className="min-w-[200px]">
                                        <h3 className="font-bold text-sm mb-1">{w.name}</h3>
                                        <div className="text-xs text-gray-600 mb-2">
                                            <p>{w.type}</p>
                                            <p className="font-mono text-[10px]">{w.status}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/warrant-detail/${w.id}`)}
                                            className="w-full bg-primary text-white py-1 px-3 rounded text-xs font-bold"
                                        >
                                            VER FICHA
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}

                {/* Floating Info Card - Compact */}
                <div className="absolute top-4 right-4 z-[500] bg-white dark:bg-surface-dark p-2 rounded-lg shadow-xl border border-border-light dark:border-border-dark max-w-[140px]">
                    <div className="flex items-center gap-1.5 mb-1">
                        <MapPin size={12} className="text-primary" />
                        <span className="text-[10px] font-black uppercase">Alvos</span>
                    </div>
                    <p className="text-xl font-black text-center leading-none">{warrants.length}</p>
                    <p className="text-[8px] text-gray-500 text-center mt-1 mb-2">Monitorados</p>

                    <div className="space-y-1 mb-2 border-t border-border-light dark:border-border-dark pt-2 text-[8px] flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-bold text-gray-500 uppercase">Prisão</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="font-bold text-gray-500 uppercase">Busca</span>
                        </div>
                    </div>

                    <button
                        onClick={handleBulkSync}
                        disabled={isSyncing}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[9px] font-black tracking-tight transition-all active:scale-95 ${isSyncing
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                            }`}
                    >
                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'SINC...' : 'ATUALIZAR'}
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}

export default OperationalMap;
