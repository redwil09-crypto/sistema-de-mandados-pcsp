
import React from 'react';
import {
    ChevronLeft, Home, RefreshCw, Printer,
    CheckCircle, Trash2, RotateCcw
} from 'lucide-react';

interface FloatingDockProps {
    onBack?: () => void;
    onHome?: () => void;
    onSave?: () => void;
    onPrint?: () => void;
    onFinalize?: () => void;
    onDelete?: () => void;
    status?: string;
}

const FloatingDock = ({
    onBack, onHome, onSave, onPrint, onFinalize, onDelete, status
}: FloatingDockProps) => {

    return (
        <div className="w-full bg-white dark:bg-surface-dark/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-glass overflow-hidden">
            <div className="flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:justify-center sm:gap-10 md:gap-16 whitespace-nowrap">

                {onBack && (
                    <button
                        onClick={onBack}
                        className="relative flex flex-col items-center justify-center gap-1 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        <ChevronLeft size={18} className="sm:size-[20px] group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-display">Voltar</span>
                    </button>
                )}

                {onHome && (
                    <button
                        onClick={onHome}
                        className="relative flex flex-col items-center justify-center gap-1 transition-all text-blue-600 dark:text-blue-500 hover:text-blue-400 group"
                    >
                        <Home size={20} className="sm:size-[22px] drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-display">Início</span>
                        <div className="absolute -bottom-2 sm:-bottom-3 inset-x-0 h-1 bg-blue-600 dark:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,1)] rounded-full"></div>
                    </button>
                )}

                {onSave && (
                    <button
                        onClick={onSave}
                        className="relative flex flex-col items-center justify-center gap-1 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        <RefreshCw size={18} className="sm:size-[20px] group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-display">Editar</span>
                    </button>
                )}

                {onPrint && (
                    <button
                        onClick={onPrint}
                        className="relative flex flex-col items-center justify-center gap-1 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        <Printer size={18} className="sm:size-[20px] group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-display">Imprimir</span>
                    </button>
                )}

                {onFinalize && (
                    <button
                        onClick={onFinalize}
                        className="relative flex flex-col items-center justify-center gap-1 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        {status === 'CUMPRIDO' ? <RotateCcw size={18} className="sm:size-[20px]" /> : <CheckCircle size={18} className="sm:size-[20px]" />}
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-display">
                            {status === 'CUMPRIDO' ? 'Reabrir' : 'Baixar'}
                        </span>
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="relative flex flex-col items-center justify-center gap-1 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-red-500 group"
                    >
                        <Trash2 size={18} className="sm:size-[20px] group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-display">Apagar</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingDock;
