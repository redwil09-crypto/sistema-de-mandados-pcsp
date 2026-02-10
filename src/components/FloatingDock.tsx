import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Printer, CheckCircle, Trash2, RefreshCw, ChevronLeft } from 'lucide-react';

interface FloatingDockProps {
    onBack: () => void;
    onHome?: () => void;
    onSave?: () => void;
    onPrint: () => void;
    onFinalize: () => void;
    onDelete?: () => void;
    className?: string;
}

const FloatingDock = ({ onBack, onHome, onSave, onPrint, onFinalize, onDelete, className }: FloatingDockProps) => {
    const containerClasses = className || "w-full z-10 rounded-3xl border border-border-light dark:border-white/10 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-xl shadow-glass transition-all duration-300 px-4 py-4 mt-8 mb-2";

    return (
        <div className={`${containerClasses} animate-in fade-in slide-in-from-bottom-5 duration-500`}>
            <div className="flex w-full items-center justify-center gap-2 sm:gap-6 md:gap-10">
                {/* Botão VOLTAR (Histórico) */}
                <DockItem
                    onClick={onBack}
                    icon={<ChevronLeft size={24} />}
                    color="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary"
                    bg="hover:bg-primary/10"
                    label="Voltar"
                />

                {/* Botão INÍCIO (Casinha) - SEMPRE AZUL NEON */}
                <DockItem
                    onClick={onHome || onBack}
                    icon={<Home size={24} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                    color="text-blue-500"
                    bg="hover:bg-blue-500/10"
                    label="Home"
                />

                {/* Botão ATUALIZAR */}
                {onSave && (
                    <DockItem
                        onClick={onSave}
                        icon={<RefreshCw size={24} />}
                        color="text-text-secondary-light dark:text-text-secondary-dark hover:text-orange-500"
                        bg="hover:bg-orange-500/10"
                        label="Editar"
                    />
                )}

                {/* PDF */}
                <DockItem
                    onClick={onPrint}
                    icon={<Printer size={24} />}
                    color="text-text-secondary-light dark:text-text-secondary-dark hover:text-yellow-500"
                    bg="hover:bg-yellow-500/10"
                    label="Imprimir"
                />

                {/* CONCLUIR */}
                <DockItem
                    onClick={onFinalize}
                    icon={<CheckCircle size={24} />}
                    color="text-text-secondary-light dark:text-text-secondary-dark hover:text-green-500"
                    bg="hover:bg-green-500/10"
                    label="Baixar"
                />

                {/* EXCLUIR */}
                {onDelete && (
                    <DockItem
                        onClick={onDelete}
                        icon={<Trash2 size={24} />}
                        color="text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500"
                        bg="hover:bg-red-500/10"
                        label="Apagar"
                    />
                )}
            </div>
        </div>
    );
};

const DockItem = ({ onClick, icon, color, bg, label, active = false }: { onClick: () => void, icon: React.ReactNode, color: string, bg: string, label: string, active?: boolean }) => {
    // Extract base color to match border
    const borderClass = color.includes('primary') ? 'border-primary' :
        color.includes('orange') ? 'border-orange-500' :
            color.includes('yellow') ? 'border-yellow-500' :
                color.includes('blue') ? 'border-blue-500' :
                    color.includes('green') ? 'border-green-500' :
                        color.includes('red') ? 'border-red-500' : 'border-white/20';

    return (
        <button
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all duration-200 border ${borderClass} border-opacity-40 hover:border-opacity-100 ${color} bg-zinc-100 dark:bg-zinc-800/50 hover:shadow-lg active:scale-95`}
        >
            <div className="relative z-10 scale-90 transition-transform group-hover:scale-100">
                {icon}
            </div>

            <span className="text-[9px] font-black uppercase tracking-tighter relative z-10 font-display opacity-80 group-hover:opacity-100 transition-opacity">
                {label}
            </span>

            {/* Neon Glow Layer */}
            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)] ${bg.replace('hover:bg-', 'bg-').replace('/10', '/5')}`}></div>
            <div className={`absolute -inset-[1px] rounded-xl border-2 ${borderClass} opacity-0 group-hover:opacity-40 transition-opacity`}></div>
        </button>
    );
};

export default FloatingDock;
