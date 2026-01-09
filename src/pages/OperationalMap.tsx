import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getWarrants } from '../supabaseService';
import { Warrant } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
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
        if (warrants.length === 0) return [-23.55052, -46.633309]; // Default SP Center

        const avgLat = warrants.reduce((sum, w) => sum + w.latitude!, 0) / warrants.length;
        const avgLng = warrants.reduce((sum, w) => sum + w.longitude!, 0) / warrants.length;
        return [avgLat, avgLng] as any;
    }, [warrants]);

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

                {/* Floating Info Card */}
                <div className="absolute top-4 right-4 z-[500] bg-white dark:bg-surface-dark p-3 rounded-xl shadow-lg border border-border-light dark:border-border-dark max-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-primary" />
                        <span className="text-xs font-bold">Alvos Plotados</span>
                    </div>
                    <p className="text-2xl font-bold text-center">{warrants.length}</p>
                    <p className="text-[10px] text-gray-500 text-center mt-1 mb-3">Mandados com geolocalização</p>

                    <div className="space-y-1.5 mb-3 border-t border-border-light dark:border-border-dark pt-3 text-[10px]">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                            <span className="font-bold text-gray-600 dark:text-gray-400 uppercase">Prisão</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></div>
                            <span className="font-bold text-gray-600 dark:text-gray-400 uppercase">Busca e Apr.</span>
                        </div>
                    </div>

                    <button
                        onClick={handleBulkSync}
                        disabled={isSyncing}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${isSyncing
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-600 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-700'
                            }`}
                    >
                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR ALVOS'}
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}

export default OperationalMap;
