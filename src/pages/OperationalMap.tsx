import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getWarrants } from '../supabaseService';
import { Warrant } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet Default Icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const OperationalMap = () => {
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getWarrants();
                // Filter warrants that have valid lat/long (placeholder logic as we don't have lat/long populated yet)
                // For demo purposes, if no lat/long, we won't show them.
                // Or I can add a mock location for testing if the user wants.
                // Let's filter strict for now.
                setWarrants(data.filter(w => w.latitude && w.longitude));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const center: [number, number] = [-23.55052, -46.633309]; // São Paulo Center

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
                            <Marker key={w.id} position={[w.latitude!, w.longitude!]}>
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
                    <p className="text-[10px] text-gray-500 text-center mt-1">Mandados com geolocalização</p>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}

export default OperationalMap;
