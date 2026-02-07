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

    // "Barra transparente" -> bg-transparent or very low opacity dark.
    // "Tons neon sutis" -> Text shadows and button glows.
    // "No celular passa da borda" -> max-w-[92vw], overflow-hidden protection.
    // "Justifique ela" -> justify-between on mobile if needed, or just center with smaller gaps.
    // "Mesma formatação da barra inicial" -> bg-surface-light, dark:bg-surface-dark/80, shadow-glass, border-border-light
    const containerClasses = className || "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[95vw] sm:max-w-2xl z-[9999] rounded-2xl border border-border-light dark:border-white/5 bg-surface-light/90 dark:bg-surface-dark/80 backdrop-blur-lg shadow-glass transition-all duration-300 pointer-events-auto px-2 sm:px-6";

    const content = (
        <div className={`${containerClasses} animate-in slide-in-from-bottom-6 fade-in duration-500`}>
            {/* Inner Flex Container - Reduced gap for mobile */}
            <div className="flex h-14 sm:h-16 w-full items-center justify-center gap-1.5 sm:gap-8">

                {/* Botão VOLTAR/INÍCIO */}
                <DockItem
                    onClick={onBack}
                    icon={<Home size={22} />}
                    color="text-sky-600 dark:text-sky-400"
                    bg="hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    label="Início"
                />

                {/* Botão ATUALIZAR (Antigo Salvar) */}
                {onSave && (
                    <DockItem
                        onClick={onSave}
                        icon={<RefreshCw size={22} />}
                        color="text-amber-600 dark:text-amber-400"
                        bg="hover:bg-amber-50 dark:hover:bg-amber-500/10"
                        label="Atualizar"
                    />
                )}

                {/* Ações Principais */}
                <DockItem
                    onClick={onPrint}
                    icon={<Printer size={22} />}
                    color="text-indigo-600 dark:text-indigo-400"
                    bg="hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                    label="PDF"
                />

                <DockItem
                    onClick={onFinalize}
                    icon={<CheckCircle size={22} />}
                    color="text-emerald-600 dark:text-emerald-400"
                    bg="hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    label="Concluir"
                />

                {onDelete && (
                    <DockItem
                        onClick={onDelete}
                        icon={<Trash2 size={22} />}
                        color="text-rose-600 dark:text-rose-400"
                        bg="hover:bg-rose-50 dark:hover:bg-rose-500/10"
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
            // Responsive width/height: w-12 on mobile, w-14 on desktop to fit screen
            className={`group relative flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-12 h-12 sm:w-14 sm:h-14 rounded-xl transition-all duration-200 ${color} ${bg} active:scale-95`}
        >
            <div className="relative z-10 scale-90 sm:scale-100">
                {icon}
            </div>

            {/* Label below icon like BottomNav */}
            <span className="text-[8px] sm:text-[9px] font-bold relative z-10 font-display opacity-80 group-hover:opacity-100 transition-opacity">
                {label}
            </span>

            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${bg.replace('hover:bg-', 'bg-').replace('/20', '/10')}`}></div>
        </button>
    );
};

export default FloatingDock;
