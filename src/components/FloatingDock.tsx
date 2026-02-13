
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
        <nav className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-border-light dark:border-white/5 bg-surface-light dark:bg-surface-dark/80 backdrop-blur-lg shadow-glass pb-safe animate-in slide-in-from-bottom duration-500">
            <div className="flex h-16 w-full items-center justify-around px-2 sm:gap-4 md:gap-8">

                {onBack && (
                    <button
                        onClick={onBack}
                        className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-text-secondary-light dark:text-text-secondary-dark hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 hover:drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} className="relative z-10" />
                        <span className="text-[9px] font-black relative z-10 font-display tracking-widest uppercase">Voltar</span>
                    </button>
                )}

                {onHome && (
                    <button
                        onClick={onHome}
                        className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-indigo-600 dark:text-blue-400 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-500/30"
                    >
                        <Home size={22} strokeWidth={2.5} className="relative z-10" />
                        <span className="text-[9px] font-black relative z-10 font-display tracking-widest uppercase">Home</span>
                        <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-sm"></div>
                    </button>
                )}

                {onSave && (
                    <button
                        onClick={onSave}
                        className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-text-secondary-light dark:text-text-secondary-dark hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/10 hover:drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]"
                    >
                        <RefreshCw size={20} className="relative z-10" />
                        <span className="text-[9px] font-black relative z-10 font-display tracking-widest uppercase">Editar</span>
                    </button>
                )}

                {onPrint && (
                    <button
                        onClick={onPrint}
                        className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-text-secondary-light dark:text-text-secondary-dark hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 hover:drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]"
                    >
                        <Printer size={20} className="relative z-10" />
                        <span className="text-[9px] font-black relative z-10 font-display tracking-widest uppercase">Imprimir</span>
                    </button>
                )}

                {onFinalize && (
                    <button
                        onClick={onFinalize}
                        className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${status === 'CUMPRIDO'
                                ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10'
                                : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                            } hover:drop-shadow-[0_0_5px_currentColor]`}
                    >
                        {status === 'CUMPRIDO' ? <RotateCcw size={20} /> : <CheckCircle size={20} />}
                        <span className="text-[9px] font-black relative z-10 font-display tracking-widest uppercase">
                            {status === 'CUMPRIDO' ? 'Reabrir' : 'Baixar'}
                        </span>
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-red-500/70 hover:text-red-500 hover:bg-red-500/10 hover:drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                    >
                        <Trash2 size={20} className="relative z-10" />
                        <span className="text-[9px] font-black relative z-10 font-display tracking-widest uppercase">Apagar</span>
                    </button>
                )}
            </div>
        </nav>
    );
};

export default FloatingDock;
