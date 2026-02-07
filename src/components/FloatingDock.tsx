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
    // Determine position classes (support custom or fallback)
    const positionClasses = className || "fixed bottom-6 left-1/2 -translate-x-1/2";

    return (
        <div className={`${positionClasses} z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500 pointer-events-none`}>
            {/* Dock Container - Pointer events auto to allow clicking inside */}
            <div className="pointer-events-auto flex items-center gap-2 p-2 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_30px_rgba(42,98,255,0.2)] ring-1 ring-white/5 hover:ring-neon-blue/30 transition-all hover:scale-[1.02]">

                {/* Botão VOLTAR/INÍCIO */}
                <DockItem
                    onClick={onBack}
                    icon={<Home size={20} />}
                    color="text-neon-blue group-hover:text-white"
                    bg="hover:bg-neon-blue/20"
                    glow="group-hover:shadow-neon-blue"
                    label="HOME"
                />

                <div className="w-px h-5 bg-white/10 mx-1"></div>

                {/* Ações Principais */}
                <DockItem
                    onClick={onPrint}
                    icon={<Printer size={20} />}
                    color="text-neon-cyan group-hover:text-white"
                    bg="hover:bg-neon-cyan/20"
                    glow="group-hover:shadow-neon-cyan"
                    label="PRINT"
                />

                {onFinalize && (
                    <DockItem
                        onClick={onFinalize}
                        icon={<CheckCircle size={20} />}
                        color="text-neon-green group-hover:text-white"
                        bg="hover:bg-neon-green/20"
                        glow="group-hover:shadow-neon-green"
                        label="DONE"
                    />
                )}

                {onDelete && (
                    <DockItem
                        onClick={onDelete}
                        icon={<Trash2 size={20} />}
                        color="text-neon-red group-hover:text-white"
                        bg="hover:bg-neon-red/20"
                        glow="group-hover:shadow-neon-red"
                        label="DELETE"
                    />
                )}

                {/* Botão de Expansão/Settings (Opcional) */}
                {onSettings && (
                    <>
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        <DockItem
                            onClick={onSettings}
                            icon={<Settings size={18} />}
                            color="text-gray-400 group-hover:text-white"
                            bg="hover:bg-white/10"
                            glow="group-hover:shadow-white"
                            label="SETTINGS"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

// Subcomponente para Item do Dock
const DockItem = ({ onClick, icon, color, bg, glow, label }: { onClick: () => void, icon: React.ReactNode, color: string, bg: string, glow?: string, label: string }) => {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ${color} ${bg} active:scale-95`}
        >
            <div className={`relative z-10 transition-transform duration-300 group-hover:-translate-y-1`}>
                {icon}
            </div>

            {/* Tooltip ultra-minimalista flutuante */}
            <span className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-hover:-bottom-9 transition-all duration-300 text-[9px] font-mono tracking-widest text-white bg-black/80 border border-white/10 px-2 py-1 rounded backdrop-blur pointer-events-none whitespace-nowrap z-20 uppercase shadow-lg">
                {label}
            </span>

            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md ${bg.replace('hover:bg-', 'bg-')}`}></div>

            {/* Optional extra glow shadow */}
            {glow && <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 shadow-[0_0_15px] ${glow.replace('group-hover:shadow-', '')}`}></div>}
        </button>
    );
};

export default FloatingDock;
