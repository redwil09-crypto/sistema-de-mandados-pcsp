
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route as RouteIcon, Navigation, Map, Printer, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';
import { Warrant } from '../types';

interface RoutePlannerProps {
    warrants: Warrant[];
    onRouteToggle: (id: string) => void;
    onUpdate: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
}

const RoutePlanner = ({ warrants = [], onRouteToggle, onUpdate }: RoutePlannerProps) => {
    const navigate = useNavigate();
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'primary' | 'danger';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Debugging render
    useEffect(() => {
        console.log("RoutePlanner: Mounted with", warrants.length, "warrants");
    }, [warrants]);

    const openConfirm = (title: string, message: string, onConfirm: () => void, variant: 'primary' | 'danger' = 'primary') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, variant });
    };

    const handleFinalizeWarrant = async (w: Warrant) => {
        try {
            const success = await onUpdate(w.id, { status: 'CUMPRIDO' });
            if (success) {
                toast.success(`${w.name} marcado como cumprido.`);
                onRouteToggle(w.id); // Also remove from route
            } else {
                toast.error("Erro ao atualizar mandado.");
            }
        } catch (err) {
            console.error("Error finalizing warrant:", err);
            toast.error("Erro inesperado ao finalizar.");
        }
    };

    const handleOpenMap = () => {
        const locations = warrants
            .filter(w => w && w.location && w.location.trim().length > 0)
            .map(w => w.location as string);

        if (locations.length === 0) {
            toast.error("Nenhum endereço válido encontrado no roteiro.");
            return;
        }

        const path = locations.map(loc => encodeURIComponent(loc)).join('/');
        window.open(`https://www.google.com/maps/dir/${path}`, '_blank');
    };

    // Safety fallback
    if (!warrants || !Array.isArray(warrants)) {
        return (
            <div className="min-h-screen bg-background-light p-10 text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Erro de Dados</h2>
                <p>Não foi possível carregar a lista do roteiro.</p>
                <button onClick={() => navigate('/')} className="mt-4 text-primary font-bold">Voltar ao Início</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 bg-background-light dark:bg-background-dark overflow-x-hidden">
            <Header title="Roteiro de Diligências" back onBack={() => navigate('/')} />

            <div className="p-4 space-y-4 max-w-2xl mx-auto">
                {warrants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="p-6 rounded-full bg-gray-100 dark:bg-white/5">
                            <RouteIcon size={48} className="text-gray-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Roteiro Vazio</h3>
                            <p className="text-sm text-text-secondary-light max-w-xs mx-auto">
                                Adicione mandados ao roteiro clicando no ícone de roteiro presente nos cards de mandados.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/advanced-search')}
                            className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
                        >
                            Ir para Busca Avançada
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Summary Card */}
                        <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-xl space-y-1 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Navigation size={100} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold flex items-center gap-2 text-indigo-100">
                                    <Navigation size={20} /> Missão em Planejamento
                                </h3>
                                <p className="text-4xl font-black">{warrants.length} <span className="text-sm font-medium opacity-80 uppercase tracking-widest ml-1">Alvos</span></p>
                            </div>
                        </div>

                        {/* Warrant List */}
                        <div className="space-y-4 pt-2">
                            {warrants.map((w, index) => {
                                if (!w) return null;
                                return (
                                    <div key={w.id || `route-item-${index}`} className="flex items-center gap-2 relative group">
                                        {/* Counter Badge */}
                                        <div className="absolute -left-2 -top-2 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-background-light dark:ring-background-dark z-20 shadow-md transform group-hover:scale-110 transition-transform">
                                            {index + 1}
                                        </div>

                                        <div className="flex-1 min-w-0 transition-transform duration-200 group-hover:translate-x-1">
                                            <WarrantCard
                                                data={w}
                                                onRouteToggle={onRouteToggle}
                                                isPlanned={true}
                                            />
                                        </div>

                                        {/* Finalize Button - Placed outside the card to avoid overlap */}
                                        <div className="shrink-0 flex items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openConfirm(
                                                        "Finalizar Mandado",
                                                        "Deseja marcar este mandado como CUMPRIDO?",
                                                        () => handleFinalizeWarrant(w)
                                                    );
                                                }}
                                                className="h-10 w-10 bg-status-completed text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-green-500/20"
                                                title="Marcar como Cumprido"
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions Footer - Justified and smaller above BottomNav */}
                        <div className="fixed bottom-16 left-0 right-0 p-3 bg-surface-light border-t border-border-light dark:bg-surface-dark dark:border-border-dark backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95 z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.1)]">
                            <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleOpenMap}
                                    className="flex flex-col items-center justify-center gap-1 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all hover:bg-indigo-700"
                                >
                                    <Map size={18} />
                                    <span className="text-[10px] uppercase">Mapa</span>
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="flex flex-col items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark font-bold rounded-xl active:scale-95 transition-all"
                                >
                                    <Printer size={18} />
                                    <span className="text-[10px] uppercase">PDF</span>
                                </button>

                                <button
                                    onClick={() => {
                                        openConfirm(
                                            "Limpar Roteiro",
                                            "Tem certeza que deseja remover todos os itens do roteiro?",
                                            () => {
                                                warrants.forEach(w => onRouteToggle(w.id));
                                                toast.success("Roteiro limpo com sucesso!");
                                            },
                                            'danger'
                                        );
                                    }}
                                    className="flex flex-col items-center justify-center gap-1 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl active:scale-95 transition-all"
                                >
                                    <Trash2 size={18} />
                                    <span className="text-[10px] uppercase">Limpar</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                confirmText="Sim, Confirmar"
                cancelText="Cancelar"
                variant={confirmModal.variant}
            />
        </div>
    );
};

export default RoutePlanner;
