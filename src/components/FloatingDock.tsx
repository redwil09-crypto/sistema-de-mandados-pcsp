import React from 'react';
import { Home, Printer, CheckCircle, Trash2, RefreshCw } from 'lucide-react';

interface FloatingDockProps {
    onBack: () => void;
    onSave?: () => void;
    onPrint: () => void;
    onFinalize: () => void;
    onDelete?: () => void;
    className?: string;
}

const FloatingDock = ({ onBack, onSave, onPrint, onFinalize, onDelete, className }: FloatingDockProps) => {
    // Changed to sticky top-4 to satisfy "appear immediately" and "follow scroll"
    // and "not fixed footer". It acts as a top command bar.
    const containerClasses = className || "sticky top-4 mx-auto w-full max-w-2xl z-[200] rounded-2xl border border-white/10 bg-[#0f172a]/70 backdrop-blur-xl shadow-glass transition-all duration-300";

    return (
        <div className={`${containerClasses} animate-in slide-in-from-top-4 fade-in duration-500`}>
            {/* Inner Flex Container */}
            <div className="flex h-16 w-full items-center justify-center gap-6 sm:gap-8 px-2">

                {/* Botão VOLTAR/INÍCIO */}
                <DockItem
                    onClick={onBack}
                    icon={<Home size={22} />}
                    color="text-sky-400 group-hover:text-white"
                    bg="hover:bg-sky-500/20"
                    label="Início"
                />

                {/* Botão ATUALIZAR (Antigo Salvar) */}
                {onSave && (
                    <DockItem
                        onClick={onSave}
                        icon={<RefreshCw size={22} />}
                        color="text-amber-400 group-hover:text-white"
                        bg="hover:bg-amber-500/20"
                        label="Atualizar"
                    />
                )}

                {/* Ações Principais */}
                <DockItem
                    onClick={onPrint}
                    icon={<Printer size={22} />}
                    color="text-indigo-400 group-hover:text-white"
                    bg="hover:bg-indigo-500/20"
                    label="PDF"
                />

                <DockItem
                    onClick={onFinalize}
                    icon={<CheckCircle size={22} />}
                    color="text-emerald-400 group-hover:text-white"
                    bg="hover:bg-emerald-500/20"
                    label="Concluir"
                />

                {onDelete && (
                    <DockItem
                        onClick={onDelete}
                        icon={<Trash2 size={22} />}
                        color="text-rose-400 group-hover:text-white"
                        bg="hover:bg-rose-500/20"
                        label="Excluir"
                    />
                )}
            </div>
        </div>
    );
};

// Subcomponente para Item do Dock - Style adjusted slightly to match BottomNav size/feel
const DockItem = ({ onClick, icon, color, bg, label }: { onClick: () => void, icon: React.ReactNode, color: string, bg: string, label: string }) => {
    return (
        <button
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all duration-200 ${color} ${bg} active:scale-95`}
        >
            <div className="relative z-10">
                {icon}
            </div>

            {/* Label below icon like BottomNav */}
            <span className="text-[9px] font-bold relative z-10 font-display opacity-80 group-hover:opacity-100 transition-opacity">
                {label}
            </span>

            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${bg.replace('hover:bg-', 'bg-').replace('/20', '/10')}`}></div>
        </button>
    );
};

export default FloatingDock;
