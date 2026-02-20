
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
        <div className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-xl p-1.5 ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex h-14 w-full items-center justify-between whitespace-nowrap">

                {onBack && (
                    <button
                        onClick={onBack}
                        className="relative flex-1 group flex flex-col items-center justify-center gap-0.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Voltar</span>
                    </button>
                )}

                {onHome && (
                    <button
                        onClick={onHome}
                        className="relative flex-1 group flex flex-col items-center justify-center gap-0.5 transition-all text-blue-600 dark:text-blue-500 hover:text-blue-400"
                    >
                        <Home size={18} className="drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Início</span>
                        <div className="absolute -bottom-1.5 inset-x-4 h-0.5 bg-blue-600 dark:bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,1)] rounded-full"></div>
                    </button>
                )}

                {onSave && (
                    <button
                        onClick={onSave}
                        className="relative flex-1 group flex flex-col items-center justify-center gap-0.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white"
                    >
                        <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Editar</span>
                    </button>
                )}

                {onPrint && (
                    <button
                        onClick={onPrint}
                        className="relative flex-1 group flex flex-col items-center justify-center gap-0.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white"
                    >
                        <Printer size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Imprimir</span>
                    </button>
                )}

                {onFinalize && (
                    <button
                        onClick={onFinalize}
                        className="relative flex-1 group flex flex-col items-center justify-center gap-0.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-text-light dark:hover:text-white"
                    >
                        {status === 'CUMPRIDO' ? <RotateCcw size={16} /> : <CheckCircle size={16} />}
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">
                            {status === 'CUMPRIDO' ? 'Reabrir' : 'Baixar'}
                        </span>
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="relative flex-1 group flex flex-col items-center justify-center gap-0.5 transition-all text-text-secondary-light dark:text-zinc-500 hover:text-red-500"
                    >
                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Apagar</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingDock;
