
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
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[1600px] z-[999] animate-in slide-in-from-bottom duration-500">
            <div className="bg-surface-light dark:bg-surface-dark/80 backdrop-blur-xl border border-border-light dark:border-white/10 rounded-2xl shadow-glass overflow-hidden">
                <div className="flex h-16 w-full items-center justify-around px-2 sm:gap-4 md:gap-8">

                    {onBack && (
                        <button
                            onClick={onBack}
                            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all text-zinc-500 hover:text-text-light dark:hover:text-white group"
                        >
                            <ChevronLeft size={18} strokeWidth={2.5} className="group-hover:translate-x-[-2px] transition-transform" />
                            <span className="text-[9px] font-black tracking-widest uppercase font-display">Voltar</span>
                        </button>
                    )}

                    {onHome && (
                        <button
                            onClick={onHome}
                            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all text-blue-500 group"
                        >
                            <Home size={20} strokeWidth={2.5} className="drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                            <span className="text-[9px] font-black tracking-widest uppercase font-display leading-none">Home</span>
                            <div className="absolute -bottom-[2px] inset-x-3 h-[2px] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,1)] rounded-full"></div>
                        </button>
                    )}

                    {onSave && (
                        <button
                            onClick={onSave}
                            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all text-zinc-500 hover:text-text-light dark:hover:text-white group"
                        >
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                            <span className="text-[9px] font-black tracking-widest uppercase font-display">Editar</span>
                        </button>
                    )}

                    {onPrint && (
                        <button
                            onClick={onPrint}
                            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all text-zinc-500 hover:text-text-light dark:hover:text-white group"
                        >
                            <Printer size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black tracking-widest uppercase font-display">Imprimir</span>
                        </button>
                    )}

                    {onFinalize && (
                        <button
                            onClick={onFinalize}
                            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all text-zinc-500 hover:text-text-light dark:hover:text-white group"
                        >
                            {status === 'CUMPRIDO' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                            <span className="text-[9px] font-black tracking-widest uppercase font-display">
                                {status === 'CUMPRIDO' ? 'Reabrir' : 'Baixar'}
                            </span>
                        </button>
                    )}

                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all text-zinc-500 hover:text-red-500 group"
                        >
                            <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black tracking-widest uppercase font-display">Apagar</span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default FloatingDock;
