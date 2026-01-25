
import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Gavel, MapPin, Calendar, Route as RouteIcon, Printer, CheckCircle, Trash2 } from 'lucide-react';
import { Warrant } from '../types';
import { formatDate } from '../utils/helpers';

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
    // Determine stripe color based on search/seizure vs arrest
    const isSearch = data.type ? (data.type.toLowerCase().includes('busca') || data.type.toLowerCase().includes('apreensão')) : false;

    return (
        <Link
            to={`/warrant-detail/${data.id}`}
            className="group block relative overflow-hidden rounded-lg bg-surface-dark/60 backdrop-blur-md border border-white/5 hover:border-primary/50 transition-all duration-300"
            {...props}
        >
            {/* Type Indicator Strip (Left Border) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 ${isSearch ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]' : 'bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.3)]'}`}></div>

            {/* Hover Tech Pattern Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex gap-4 p-4 pl-5 relative z-10">
                {/* Photo Section */}
                <div className="shrink-0 relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img
                        src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`}
                        alt={data.name}
                        className="h-14 w-14 rounded-full object-cover border-2 border-white/10 group-hover:border-primary/50 transition-colors bg-surface-dark-elevated"
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
                        <h3 className="font-display font-bold text-text-dark text-base leading-tight whitespace-normal break-words pr-2 group-hover:text-primary transition-colors">
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
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${data.status === 'EM ABERTO' ? 'bg-risk-high/10 text-risk-high border-risk-high/20' :
                                data.status === 'CUMPRIDO' ? 'bg-success/10 text-success border-success/20' :
                                    'bg-risk-med/10 text-risk-med border-risk-med/20'
                                }`}>
                                {data.status}
                            </span>
                        </div>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="grid grid-cols-1 gap-1 mb-3">
                        <div className="flex items-center gap-2">
                            {isSearch ? <Briefcase size={12} className="text-risk-med" /> : <Gavel size={12} className="text-primary" />}
                            <span className="text-xs font-medium text-text-secondary-dark">{data.type}</span>
                        </div>

                        {(data.crime || data.regime) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {data.crime && <span className="text-[10px] text-text-muted">Art: <span className="text-text-secondary-dark">{data.crime}</span></span>}
                                {data.regime && <span className="text-[10px] text-text-muted">Reg: <span className="text-text-secondary-dark">{data.regime}</span></span>}
                            </div>
                        )}
                    </div>

                    {/* Footer: Tech Data */}
                    <div className="pt-2 border-t border-white/5 flex items-end justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-mono text-text-muted flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                {data.number}
                            </p>
                            {data.location && (
                                <p className="text-[10px] font-medium text-text-secondary-dark flex items-center gap-1.5 truncate max-w-[200px]">
                                    <MapPin size={10} className="text-primary-light" />
                                    {data.location}
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
