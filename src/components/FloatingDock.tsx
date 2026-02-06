
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Printer, CheckCircle, Trash2, Settings, ArrowLeft } from 'lucide-react';

interface FloatingDockProps {
    onBack: () => void;
    onPrint: () => void;
    onFinalize: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

const FloatingDock = ({ onBack, onPrint, onFinalize, onDelete, onSettings }: FloatingDockProps) => {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-500">
            <div className="flex items-center gap-3 p-2.5 bg-surface-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5">

                {/* Botão INÍCIO (Corrigido de Pátio) */}
                <button
                    onClick={onBack}
                    className="group flex flex-col items-center justify-center w-16 h-14 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white transition-all border border-transparent hover:border-white/20"
                >
                    <Home size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                    <span className="text-[10px] font-black uppercase mt-1 tracking-wider text-gray-300 group-hover:text-white">INÍCIO</span>
                </button>

                <div className="w-px h-8 bg-white/10 mx-1"></div>

                {/* Botão FECHAR */}
                <button
                    onClick={onFinalize}
                    className="group flex flex-col items-center justify-center w-16 h-14 rounded-xl bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30 text-green-400 border border-transparent hover:border-green-500/30 transition-all"
                >
                    <CheckCircle size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                    <span className="text-[10px] font-black uppercase mt-1 tracking-wider group-hover:text-green-300">FECHAR</span>
                </button>

                {/* Botão DOSSIÊ PDF (Destaque) */}
                <button
                    onClick={onPrint}
                    className="group flex flex-col items-center justify-center w-24 h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all border-t border-indigo-400/30 hover:scale-[1.02]"
                >
                    <Printer size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                    <span className="text-[10px] font-black uppercase mt-1 tracking-wider">DOSSIÊ PDF</span>
                </button>

                {/* Botão DELETAR/EXCLUIR */}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="group flex flex-col items-center justify-center w-16 h-14 rounded-xl bg-risk-high/10 hover:bg-risk-high/20 active:bg-risk-high/30 text-risk-high border border-transparent hover:border-risk-high/30 transition-all ml-1"
                    >
                        <Trash2 size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                        <span className="text-[10px] font-black uppercase mt-1 tracking-wider group-hover:text-red-300">DELETAR</span>
                    </button>
                )}

                {/* Botão AJUSTES (Restaurado) */}
                {onSettings && (
                    <button
                        onClick={onSettings}
                        className="group flex flex-col items-center justify-center w-12 h-14 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all ml-1"
                    >
                        <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingDock;
