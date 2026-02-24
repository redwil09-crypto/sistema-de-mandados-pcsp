
import React, { useState, useEffect } from 'react';
import { Zap, Clock, Database, Shield, X } from 'lucide-react';

interface PerformanceOptimizationModalProps {
    onAccept: () => void;
}

export default function PerformanceOptimizationModal({ onAccept }: PerformanceOptimizationModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Show after a small delay for better effect
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#1a1f26] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 relative">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Zap size={24} className="text-amber-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Otimização de Performance</h2>
                    </div>

                    <p className="text-sm text-white/70 leading-relaxed mb-8">
                        Para oferecer uma experiência mais rápida e fluida, este sistema utiliza <span className="text-white font-bold italic">cache local em memória</span> no seu navegador.
                    </p>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="mt-1">
                                <Clock size={18} className="text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Navegação instantânea</h3>
                                <p className="text-[11px] text-white/50 leading-relaxed">
                                    As próximas páginas de resultados são pré-carregadas em segundo plano, eliminando tempos de espera.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 text-amber-500">
                                <Database size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Dados temporários</h3>
                                <p className="text-[11px] text-white/50 leading-relaxed">
                                    Os dados em cache são mantidos apenas durante a sessão atual e descartados ao fechar o navegador.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 text-amber-500">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Segurança preservada</h3>
                                <p className="text-[11px] text-white/50 leading-relaxed">
                                    Nenhum dado sensível é armazenado permanentemente. Todas as políticas de acesso e autenticação permanecem ativas.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onAccept();
                            }}
                            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.1em] text-xs rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                        >
                            Entendi e aceito
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
