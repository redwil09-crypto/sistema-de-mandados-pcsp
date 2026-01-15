
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
        <Link to={`/warrant-detail/${data.id}`} className="block bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-md border border-border-light dark:border-border-dark relative overflow-hidden transition-all active:scale-[0.99]" {...props}>
            {/* Type Indicator Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSearch ? 'bg-orange-400' : 'bg-blue-500'}`}></div>

            <div className="flex gap-3 pl-2">
                {/* Photo Section */}
                <div className="shrink-0">
                    <img
                        src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`}
                        alt={data.name}
                        className="h-12 w-12 rounded-full object-cover border border-border-light dark:border-border-dark bg-gray-100 dark:bg-gray-800"
                    />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header: Name and Status */}
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm leading-tight whitespace-normal break-words pr-2">{data.name}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                            {onFinalize && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onFinalize(e, data);
                                    }}
                                    className="p-1.5 bg-status-completed text-white rounded-lg shadow-sm hover:scale-110 active:scale-95 transition-all"
                                    title="Marcar como Cumprido"
                                >
                                    <CheckCircle size={14} />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (window.confirm("Deseja realmente excluir este mandado? Esta ação não pode ser desfeita.")) {
                                            onDelete(data.id);
                                        }
                                    }}
                                    className="p-1.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-lg transition-colors"
                                    title="Excluir Mandado Rápido"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${data.status === 'EM ABERTO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                data.status === 'CUMPRIDO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>{data.status}</span>
                        </div>
                    </div>

                    {/* Body: Type, Crime, Regime, Priority */}
                    <div className="flex flex-col gap-0.5 mb-2">
                        <div className="flex items-center gap-1.5">
                            {isSearch ? (
                                <Briefcase size={12} className="text-orange-500 shrink-0" />
                            ) : (
                                <Gavel size={12} className="text-blue-500 shrink-0" />
                            )}
                            <p className="text-xs font-medium text-text-secondary-light dark:text-text-dark/80 flex-1 whitespace-normal leading-tight">{data.type}</p>
                        </div>
                        {data.crime && <p className="text-[10px] text-text-secondary-light dark:text-text-dark/60 ml-4.5">Crime: {data.crime}</p>}
                        {data.regime && <p className="text-[10px] text-text-secondary-light dark:text-text-dark/60 ml-4.5">Regime: {data.regime}</p>}
                        {data.priority && <p className="text-[10px] font-bold text-red-500 ml-4.5">Prioridade: {data.priority}</p>}
                        {data.tags && data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-4.5 mt-0.5">
                                {data.tags.map(tag => (
                                    <span key={tag} className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${tag === 'Urgente'
                                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                                        }`}>
                                        {tag.toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer: Details (Number, RG, Location, Date/Timestamp) */}
                    <div className="pt-2 border-t border-border-light dark:border-border-dark space-y-0.5 relative">
                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-mono">{data.number}</p>
                        {data.rg && <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">RG: {data.rg}</p>}
                        <div className="flex justify-between items-end mt-1">
                            {data.location ? (
                                <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark truncate flex items-center gap-1 flex-1 mr-2"><MapPin size={10} /> {data.location}</p>
                            ) : <div></div>}
                            {(data.date || data.timestamp) && (
                                <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1 whitespace-nowrap">
                                    <Calendar size={10} /> {data.date ? formatDate(data.date) : data.timestamp}
                                </p>
                            )}
                        </div>

                        {/* Route Toggle Button */}
                        {onRouteToggle && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRouteToggle(data.id);
                                }}
                                className={`absolute right-0 bottom-6 p-2 rounded-full transition-all z-10 ${isPlanned
                                    ? 'bg-indigo-600 text-white shadow-lg scale-110'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                                    }`}
                                title={isPlanned ? "Remover do Roteiro" : "Adicionar ao Roteiro"}
                            >
                                <RouteIcon size={16} />
                            </button>
                        )}

                        {/* Print Button (if provided) */}
                        {onPrint && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onPrint(e);
                                }}
                                className={`absolute right-9 bottom-6 p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors z-10 ${onRouteToggle ? 'right-9' : 'right-0'}`}
                                title="Imprimir Ficha"
                            >
                                <Printer size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default WarrantCard;
