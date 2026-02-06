
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Printer, CheckCircle, Trash2, Settings, FileText, Menu } from 'lucide-react';

interface FloatingDockProps {
    onBack: () => void;
    onPrint: () => void;
    onFinalize: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

const FloatingDock = ({ onBack, onPrint, onFinalize, onDelete, onSettings }: FloatingDockProps) => {
    const navigate = useNavigate();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
            {/* Home / Back Button */}
            <button
                onClick={onBack}
                className="group flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-transparent hover:border-white/20"
                title="Início"
            >
                <Home size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[9px] font-black uppercase mt-0.5 tracking-wider opacity-0 group-hover:opacity-100 absolute -bottom-4 bg-black/80 px-2 rounded transition-opacity whitespace-nowrap">Início</span>
            </button>

            <div className="w-px h-8 bg-white/10 mx-1"></div>

            {/* Action Buttons */}
            <button
                onClick={onFinalize}
                className="group flex flex-col items-center justify-center w-14 h-14 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-all active:scale-95"
                title="Finalizar"
            >
                <CheckCircle size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[9px] font-black uppercase mt-0.5 tracking-wider opacity-0 group-hover:opacity-100 absolute -bottom-4 bg-black/80 px-2 rounded transition-opacity whitespace-nowrap">Fechar</span>
            </button>

            <button
                onClick={onPrint}
                className="group flex flex-col items-center justify-center w-20 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 border border-indigo-400/30"
                title="Gerar Dossiê"
            >
                <Printer size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[9px] font-black uppercase mt-1 tracking-wider">DOSSIÊ PDF</span>
            </button>

            {onSettings && (
                <button
                    onClick={onSettings}
                    className="group flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
                    title="Ajustes"
                >
                    <Settings size={20} className="group-hover:rotate-45 transition-transform" />
                    <span className="text-[9px] font-black uppercase mt-0.5 tracking-wider opacity-0 group-hover:opacity-100 absolute -bottom-4 bg-black/80 px-2 rounded transition-opacity whitespace-nowrap">Ajustes</span>
                </button>
            )}

            {onDelete && (
                <button
                    onClick={onDelete}
                    className="group flex flex-col items-center justify-center w-14 h-14 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all active:scale-95 ml-1"
                    title="Excluir"
                >
                    <Trash2 size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                </button>
            )}

        </div>
    );
};

export default FloatingDock;
