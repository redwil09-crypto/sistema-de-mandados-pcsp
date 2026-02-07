import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    // Determine the container we are rendering into (usually body)
    // Using portal guarantees "Fixed to Viewport" behavior regardless of parent transforms or layout constraints.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // "Parte inferior da tela", "Centralizada", "Fixo ao Viewport".
    // Uses bottom-6 to provide the small margin requested.
    // Enhanced z-index to max to ensure it's above everything.
    const containerClasses = className || "fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-[9999] rounded-2xl border border-white/10 bg-[#0f172a]/80 backdrop-blur-xl shadow-2xl shadow-black/50 transition-all duration-300 pointer-events-auto";

    const content = (
        <div className={`${containerClasses} animate-in slide-in-from-bottom-6 fade-in duration-500`}>
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

    // Only render via portal when mounted on client to avoid hydration mismatch (if applicable) 
    // or just to be safe. Since this is likely client-side only (Vite/CRA), direct portal is fine, 
    // but the effect ensures document.body is ready.
    if (!mounted) return null;

    return createPortal(content, document.body);
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
