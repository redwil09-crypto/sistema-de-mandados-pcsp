
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
        <div className="w-full bg-surface-light dark:bg-[#151517] backdrop-blur-xl border border-border-light dark:border-white/5 rounded-2xl shadow-glass overflow-hidden">
            <div className="flex h-20 w-full items-center justify-between px-3 sm:justify-center sm:gap-10 md:gap-16 whitespace-nowrap">

                {onBack && (
                    <button
                        onClick={onBack}
                        className="relative flex flex-col items-center justify-center gap-1.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black tracking-widest uppercase font-display">Voltar</span>
                    </button>
                )}

                {onHome && (
                    <button
                        onClick={onHome}
                        className="relative flex flex-col items-center justify-center gap-1.5 transition-all text-blue-500 group"
                    >
                        <Home size={22} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-[10px] font-black tracking-widest uppercase font-display">Home</span>
                        <div className="absolute -bottom-3 inset-x-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] rounded-full"></div>
                    </button>
                )}

                {onSave && (
                    <button
                        onClick={onSave}
                        className="relative flex flex-col items-center justify-center gap-1.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-[10px] font-black tracking-widest uppercase font-display">Editar</span>
                    </button>
                )}

                {onPrint && (
                    <button
                        onClick={onPrint}
                        className="relative flex flex-col items-center justify-center gap-1.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        <Printer size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black tracking-widest uppercase font-display">Imprimir</span>
                    </button>
                )}

                {onFinalize && (
                    <button
                        onClick={onFinalize}
                        className="relative flex flex-col items-center justify-center gap-1.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white group"
                    >
                        {status === 'CUMPRIDO' ? <RotateCcw size={20} /> : <CheckCircle size={20} />}
                        <span className="text-[10px] font-black tracking-widest uppercase font-display">
                            {status === 'CUMPRIDO' ? 'Reabrir' : 'Baixar'}
                        </span>
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="relative flex flex-col items-center justify-center gap-1.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-red-500 group"
                    >
                        <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black tracking-widest uppercase font-display">Apagar</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingDock;
