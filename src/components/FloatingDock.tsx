
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
        <nav className="fixed bottom-0 left-0 right-0 z-[999] animate-in slide-in-from-bottom duration-500 pointer-events-auto bg-[#0a0a0c]/95 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
            <div className="flex h-14 w-full items-center justify-around gap-1 max-w-[1600px] mx-auto px-4">

                {onBack && (
                    <button
                        onClick={onBack}
                        className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all text-zinc-500 hover:text-white group"
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} className="group-hover:translate-x-[-2px] transition-transform" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Voltar</span>
                    </button>
                )}

                {onHome && (
                    <button
                        onClick={onHome}
                        className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all text-blue-500 group"
                    >
                        <Home size={20} strokeWidth={2.5} className="drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Home</span>
                        <div className="absolute -bottom-[1px] inset-x-4 h-[1.5px] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,1)] rounded-full"></div>
                    </button>
                )}

                {onSave && (
                    <button
                        onClick={onSave}
                        className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all text-zinc-500 hover:text-white group"
                    >
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Editar</span>
                    </button>
                )}

                {onPrint && (
                    <button
                        onClick={onPrint}
                        className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all text-zinc-500 hover:text-white group"
                    >
                        <Printer size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Imprimir</span>
                    </button>
                )}

                {onFinalize && (
                    <button
                        onClick={onFinalize}
                        className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all text-zinc-500 hover:text-white group"
                    >
                        {status === 'CUMPRIDO' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">
                            {status === 'CUMPRIDO' ? 'Reabrir' : 'Baixar'}
                        </span>
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all text-zinc-500 hover:text-red-500"
                    >
                        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black tracking-widest uppercase font-display">Apagar</span>
                    </button>
                )}
            </div>
        </nav>
    );
};

export default FloatingDock;
