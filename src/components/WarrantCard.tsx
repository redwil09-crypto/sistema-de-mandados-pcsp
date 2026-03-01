
import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Gavel, MapPin, Calendar, Route as RouteIcon, Printer, CheckCircle, Trash2 } from 'lucide-react';
import { Warrant } from '../types';
import { formatDate } from '../utils/helpers';
import { normalizeCrimeName } from '../utils/crimeUtils';

interface WarrantCardProps {
    data: Warrant;
    onPrint?: (e: React.MouseEvent) => void;
    isPlanned?: boolean;
    onRouteToggle?: (id: string) => void;
    onFinalize?: (e: React.MouseEvent, data: Warrant) => void;
    onDelete?: (id: string) => void;
    [key: string]: any;
}

const WarrantCard = ({ data, onPrint, isPlanned, onRouteToggle, onFinalize, onDelete, ...props }: WarrantCardProps) => {
    // Determine stripe color based on search/seizure vs arrest vs counter-warrant
    const isSearch = data.type ? (data.type.toLowerCase().includes('busca') || data.type.toLowerCase().includes('apreensão')) : false;
    const isCounterWarrant = (data.regime && data.regime.toLowerCase() === 'contramandado') || (data.type && data.type.toLowerCase().includes('contramandado'));

    let hoverClasses = 'hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]';
    let stripeClasses = 'bg-blue-600 shadow-[2px_0_15px_rgba(37,99,235,0.6)]';

    if (isSearch) {
        hoverClasses = 'hover:border-orange-500 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]';
        stripeClasses = 'bg-orange-600 shadow-[2px_0_15px_rgba(234,88,12,0.6)]';
    } else if (isCounterWarrant) {
        hoverClasses = 'hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] border-emerald-500/30';
        stripeClasses = 'bg-emerald-500 shadow-[2px_0_15px_rgba(16,185,129,0.6)]';
    }

    return (
        <Link
            to={`/warrant-detail/${data.id}`}
            className={`group block relative overflow-hidden rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-white/10 transition-all duration-300 shadow-sm ${hoverClasses}`}
            {...props}
        >
            {/* Type Indicator Strip (Left Border) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${stripeClasses}`}></div>

            {/* Hover Tech Pattern Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex gap-4 p-4 pl-5 relative z-10">
                {/* Visual Stamp for Fulfilled/Counter-Warrant */}
                {(data.status === 'CUMPRIDO' || isCounterWarrant) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.15] dark:opacity-[0.1] pointer-events-none z-0">
                        <div className={`border-[6px] ${isSearch ? 'border-orange-500 text-orange-500' : 'border-emerald-500 text-emerald-500'} px-6 py-2 rounded-lg font-black text-6xl tracking-tighter uppercase`}>
                            {isCounterWarrant ? 'BAIXADO' : 'CUMPRIDO'}
                        </div>
                    </div>
                )}

                {/* Photo Section */}
                <div className="shrink-0 relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img
                        src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`}
                        alt={data.name}
                        className="h-14 w-14 rounded-full object-cover border-2 border-border-light dark:border-white/10 group-hover:border-primary/50 transition-colors bg-background-light dark:bg-surface-dark-elevated"
                    />
                    {isPlanned && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-surface-dark shadow-neon-blue">
                            <RouteIcon size={10} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header: Name and Status */}
                    <div className="flex justify-between items-start mb-1.5">
                        <h3 className="font-display font-bold text-text-light dark:text-text-dark text-base leading-tight whitespace-normal break-words pr-2 hover:text-secondary hover:scale-[1.01] transition-all">
                            {data.name}
                        </h3>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* Action Buttons (Hover Only on Desktop, Always on Mobile if needed) */}
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                {onFinalize && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFinalize(e, data); }}
                                        className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors"
                                        title="Marcar como Cumprido"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            if (window.confirm("Deseja realmente excluir este mandado?")) onDelete(data.id);
                                        }}
                                        className="p-1.5 text-risk-high hover:bg-risk-high/10 rounded-md transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Status Badge */}
                            {(data.dpRegion && data.latitude && data.longitude) && (
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 mr-1" title="Mapeado e Setor Definido">
                                    {data.dpRegion}
                                </span>
                            )}
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${data.status === 'EM ABERTO' ? 'bg-risk-high/10 text-rose-600 dark:text-risk-high border-risk-high/20' :
                                data.status === 'CUMPRIDO' ? 'bg-success/10 text-emerald-600 dark:text-success border-success/20' :
                                    'bg-risk-med/10 text-amber-600 dark:text-risk-med border-risk-med/20'
                                }`}>
                                {data.status}
                            </span>
                        </div>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="grid grid-cols-1 gap-1 mb-3">
                        <div className="flex items-center gap-2">
                            {isSearch ? (
                                <Briefcase size={12} className="text-orange-500" />
                            ) : isCounterWarrant ? (
                                <CheckCircle size={12} className="text-emerald-500" />
                            ) : (
                                <Gavel size={12} className="text-secondary" />
                            )}

                            <span className={`text-xs font-medium ${isCounterWarrant ? 'text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                                {isCounterWarrant ? 'CONTRAMANDADO' : data.type}
                            </span>
                        </div>

                        {(data.crime || data.regime) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {data.crime && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Natureza: <span className="text-text-secondary-light dark:text-text-secondary-dark">{normalizeCrimeName(data.crime)}</span></span>}
                                {data.regime && <span className="text-[10px] text-slate-500 dark:text-slate-400">Regime: <span className="text-text-secondary-light dark:text-text-secondary-dark">{data.regime}</span></span>}
                            </div>
                        )}
                    </div>

                    {/* Footer: Tech Data */}
                    <div className="pt-2 border-t border-border-light dark:border-white/5 flex items-end justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-white/20"></span>
                                {data.number}
                            </p>
                            {data.location && (
                                <p className="text-[10px] font-medium text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1.5 truncate max-w-[200px]">
                                    <MapPin size={10} className="text-primary-light" />
                                    {data.location}
                                </p>
                            )}
                            {data.status === 'CUMPRIDO' && data.dischargeDate && (
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-green-400 flex items-center gap-1.5 mt-0.5">
                                    <CheckCircle size={10} />
                                    {formatDate(data.dischargeDate)}
                                </p>
                            )}
                        </div>

                        {/* Route & Print Actions */}
                        <div className="flex items-center gap-2">
                            {data.tags && data.tags.includes('Urgente') && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-high opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-risk-high"></span>
                                </span>
                            )}

                            {onRouteToggle && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRouteToggle(data.id); }}
                                    className={`p-2 rounded-lg transition-all ${isPlanned
                                        ? 'bg-primary text-white shadow-neon-blue'
                                        : 'text-text-muted hover:text-primary hover:bg-white/5'
                                        }`}
                                >
                                    <RouteIcon size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default WarrantCard;
