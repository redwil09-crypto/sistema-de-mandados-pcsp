import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Printer, CheckCircle, Trash2, RefreshCw, ChevronLeft, RotateCcw } from 'lucide-react';

interface FloatingDockProps {
    onBack: () => void;
    onHome?: () => void;
    onSave?: () => void;
    onPrint: () => void;
    onFinalize: () => void;
    onDelete?: () => void;
    className?: string;
    status?: string;
}

const FloatingDock = ({ onBack, onHome, onSave, onPrint, onFinalize, onDelete, className, status }: FloatingDockProps) => {
    const containerClasses = className || "fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl px-6 py-4 transition-all duration-300";

    return (
        <div className={`${containerClasses} animate-in fade-in slide-in-from-bottom-5 duration-500`}>
            <div className="flex w-full items-center justify-between gap-2 md:gap-4">
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

                {/* CONCLUIR / REABRIR */}
                <DockItem
                    onClick={onFinalize}
                    icon={status === 'CUMPRIDO' ? <RotateCcw size={24} /> : <CheckCircle size={24} />}
                    color={status === 'CUMPRIDO' ? "text-text-secondary-light dark:text-text-secondary-dark hover:text-cyan-500" : "text-text-secondary-light dark:text-text-secondary-dark hover:text-green-500"}
                    bg={status === 'CUMPRIDO' ? "hover:bg-cyan-500/10" : "hover:bg-green-500/10"}
                    label={status === 'CUMPRIDO' ? "Reabrir" : "Baixar"}
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
    return (
        <button
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all duration-200 ${color} ${active ? bg.replace('hover:bg-', 'bg-') : bg} active:scale-95`}
        >
            <div className="relative z-10 scale-90">
                {icon}
            </div>

            <span className="text-[9px] font-black uppercase tracking-tighter relative z-10 font-display opacity-80 group-hover:opacity-100 transition-opacity">
                {label}
            </span>

            <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${bg.replace('hover:bg-', 'bg-').replace('/20', '/10')}`}></div>
        </button>
    );
};

export default FloatingDock;
