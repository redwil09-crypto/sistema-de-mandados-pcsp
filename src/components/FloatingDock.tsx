import React, { useState } from 'react';
import { Home, Printer, CheckCircle, Trash2, Settings, ArrowLeft, MoreHorizontal, X, FileText } from 'lucide-react';

interface FloatingDockProps {
    onBack: () => void;
    onPrint: () => void;
    onFinalize: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    className?: string;
}

const FloatingDock = ({ onBack, onPrint, onFinalize, onDelete, onSettings, className }: FloatingDockProps) => {
    const positionClasses = className || "fixed bottom-6 left-1/2 -translate-x-1/2";

    return (
        <div className={`${positionClasses} z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500`}>
            {/* Dock Container */}
            <div className="flex items-center gap-2 p-2 bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 hover:ring-white/20 transition-all hover:scale-[1.02]">

                {/* Botão VOLTAR/INÍCIO */}
                <DockItem
                    onClick={onBack}
                    icon={<Home size={20} />}
                    color="text-sky-400 group-hover:text-sky-300"
                    bg="hover:bg-sky-500/20"
                    label="Início"
                />

                <div className="w-px h-5 bg-white/10 mx-1"></div>

                {/* Ações Principais */}
                <DockItem
                    onClick={onPrint}
                    icon={<Printer size={20} />}
                    color="text-indigo-400 group-hover:text-indigo-300"
                    bg="hover:bg-indigo-500/20"
                    label="Gerar PDF"
                />

                <DockItem
                    onClick={onFinalize}
                    icon={<CheckCircle size={20} />}
                    color="text-emerald-400 group-hover:text-emerald-300"
                    bg="hover:bg-emerald-500/20"
                    label="Concluir"
                />

                {onDelete && (
                    <DockItem
                        onClick={onDelete}
                        icon={<Trash2 size={20} />}
                        color="text-rose-400 group-hover:text-rose-300"
                        bg="hover:bg-rose-500/20"
                        label="Excluir"
                    />
                )}

                {/* Botão de Expansão/Settings (Opcional) */}
                {onSettings && (
                    <>
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        <DockItem
                            onClick={onSettings}
                            icon={<Settings size={18} />}
                            color="text-slate-400 group-hover:text-white"
                            bg="hover:bg-white/10"
                            label="Opções"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

// Subcomponente para Item do Dock
const DockItem = ({ onClick, icon, color, bg, label }: { onClick: () => void, icon: React.ReactNode, color: string, bg: string, label: string }) => {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${color} ${bg} active:scale-95`}
        >
            <div className="relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
                {icon}
            </div>

            {/* Tooltip ultra-minimalista flutuante */}
            <span className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-hover:-bottom-6 transition-all duration-300 text-[10px] font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur pointer-events-none whitespace-nowrap z-20">
                {label}
            </span>

            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md ${bg.replace('hover:bg-', 'bg-')}`}></div>
        </button>
    );
};

export default FloatingDock;
