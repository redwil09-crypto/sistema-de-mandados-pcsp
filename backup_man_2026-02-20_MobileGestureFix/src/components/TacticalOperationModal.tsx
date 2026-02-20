import React from 'react';
import { Target, MapPin, Users, Zap, X, ShieldAlert } from 'lucide-react';

interface OperationGroup {
    operationName: string;
    reason: string;
    targetIds: string[];
    suggestedAction: string;
    priority: 'High' | 'Medium' | 'Low';
}

interface TacticalOperationModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: OperationGroup[];
    isAnalyzing?: boolean;
}

const TacticalOperationModal: React.FC<TacticalOperationModalProps> = ({ isOpen, onClose, groups, isAnalyzing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-light dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl border border-border-light dark:border-border-dark flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent">
                    <div className="flex items-center gap-2">
                        <Target className="text-indigo-600 dark:text-indigo-400" size={24} />
                        <div>
                            <h2 className="text-lg font-black text-text-light dark:text-text-dark uppercase tracking-wide">
                                Análise Tática de Grupo
                            </h2>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                Inteligência Artificial Operacional
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-text-secondary-light" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Zap size={24} className="text-indigo-500 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-sm font-bold text-text-light dark:text-text-dark animate-pulse">
                                Cruzando dados e identificando padrões táticos...
                            </p>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary-light dark:text-text-secondary-dark">
                            <ShieldAlert size={48} className="mx-auto mb-3 opacity-50" />
                            <p>Nenhum agrupamento tático relevante identificado nesta análise.</p>
                        </div>
                    ) : (
                        groups.map((group, idx) => (
                            <div
                                key={idx}
                                className="bg-background-light dark:bg-white/5 rounded-xl border border-border-light dark:border-border-dark overflow-hidden hover:border-indigo-500/50 transition-colors group"
                            >
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center">
                                    <h3 className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                        <CrosshairIcon className="w-4 h-4" />
                                        {group.operationName}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${group.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                            group.priority === 'Medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        }`}>
                                        Prioridade {group.priority === 'High' ? 'Alta' : group.priority === 'Medium' ? 'Média' : 'Baixa'}
                                    </span>
                                </div>

                                <div className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-text-secondary-light uppercase">Motivo do Agrupamento</p>
                                            <p className="text-sm text-text-light dark:text-text-dark">{group.reason}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Zap size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-text-secondary-light uppercase">Sugestão de Ação</p>
                                            <p className="text-sm text-text-light dark:text-text-dark">{group.suggestedAction}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-border-light dark:border-white/5">
                                        <Users size={16} className="text-slate-400" />
                                        <span className="text-xs text-text-secondary-light">
                                            {group.targetIds.length} Alvos Identificados
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-white/5 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

const CrosshairIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
);

export default TacticalOperationModal;
