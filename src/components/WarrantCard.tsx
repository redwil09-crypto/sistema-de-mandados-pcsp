import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Gavel, MapPin, Route as RouteIcon, CheckCircle, Trash2, Siren, AlertTriangle } from 'lucide-react';
import { Warrant } from '../types';

interface WarrantCardProps {
    data: Warrant;
    onPrint?: (e: React.MouseEvent) => void;
    isPlanned?: boolean;
    onRouteToggle?: (id: string) => void;
    onFinalize?: (e: React.MouseEvent, data: Warrant) => void;
    onDelete?: (id: string, e: React.MouseEvent) => void;
    [key: string]: any;
}

const WarrantCard = ({ data, onPrint, isPlanned, onRouteToggle, onFinalize, onDelete, ...props }: WarrantCardProps) => {
    const isSearch = data.type ? (data.type.toLowerCase().includes('busca') || data.type.toLowerCase().includes('apreensão')) : false;
    const isUrgent = data.tags?.includes('Urgente');
    const statusColor = data.status === 'EM ABERTO' ? 'text-neon-red border-neon-red/30 bg-neon-red/10' : data.status === 'CUMPRIDO' ? 'text-neon-green border-neon-green/30 bg-neon-green/10' : 'text-neon-blue border-neon-blue/30 bg-neon-blue/10';
    const borderColor = isUrgent ? 'border-neon-red shadow-neon-red' : isSearch ? 'border-neon-orange shadow-neon-orange' : 'border-white/10 group-hover:border-neon-blue group-hover:shadow-neon-blue';

    return (
        <Link
            to={`/warrant-detail/${data.id}`}
            className={`group relative block overflow-hidden rounded-xl bg-black/40 backdrop-blur-md border ${borderColor} transition-all duration-300 hover:-translate-y-1`}
            {...props}
        >
            {/* Background Tech Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 group-hover:opacity-40 transition-opacity"></div>

            {/* Status Line */}
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${isUrgent ? 'bg-neon-red' : isSearch ? 'bg-orange-500' : 'bg-neon-blue'} shadow-[0_0_10px] shadow-current`}></div>

            <div className="relative p-4 pl-6 flex gap-4 items-start z-10">
                {/* Avatar / Identity Image */}
                <div className="relative shrink-0">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-spin-slow"></div>
                    <img
                        src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=050505&color=fff&bold=true`}
                        alt={data.name}
                        className="h-16 w-16 rounded-lg object-cover border border-white/20 group-hover:border-neon-blue transition-colors grayscale group-hover:grayscale-0"
                    />
                    {isPlanned && (
                        <div className="absolute -bottom-2 -right-2 bg-neon-blue text-white p-1 rounded border border-black shadow-neon-blue">
                            <RouteIcon size={12} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-display font-bold text-lg text-white group-hover:text-neon-blue transition-colors uppercase tracking-wide truncate pr-2">
                                {data.name}
                            </h3>
                            <p className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5 uppercase">
                                <span className={`w-1.5 h-1.5 rounded-full ${data.status === 'EM ABERTO' ? 'bg-neon-red animate-pulse' : 'bg-neon-green'}`}></span>
                                {data.number}
                            </p>
                        </div>
                        {/* Status Badge */}
                        <div className={`px-2 py-0.5 rounded border ${statusColor} text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_inset] shadow-current`}>
                            {data.status}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                            {isSearch ? <Briefcase size={12} className="text-orange-500" /> : <Gavel size={12} className="text-neon-blue" />}
                            <span className="font-mono truncate">{data.type}</span>
                        </div>
                        {data.location && (
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <MapPin size={12} className="text-gray-500" />
                                <span className="font-mono truncate">{data.location.split(',')[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions Row (Visible on Hover/Focus) */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                            {isUrgent && <span className="text-[10px] font-bold text-neon-red flex items-center gap-1"><Siren size={10} /> PRIORITY 1</span>}
                            {data.crime && <span className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">ART: {data.crime}</span>}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onFinalize && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFinalize(e, data); }}
                                    className="p-1.5 hover:bg-neon-green/10 text-neon-green rounded transition-colors"
                                    title="Complete"
                                >
                                    <CheckCircle size={14} />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        if (window.confirm("CONFIRM DELETE?")) onDelete(data.id, e);
                                    }}
                                    className="p-1.5 hover:bg-neon-red/10 text-neon-red rounded transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            {onRouteToggle && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRouteToggle(data.id); }}
                                    className={`p-1.5 rounded transition-all ${isPlanned ? 'text-neon-blue' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <RouteIcon size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Caution Striping for Urgent */}
            {isUrgent && (
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-4 bg-neon-red transform translate-x-10 translate-y-4 rotate-45 shadow-neon-red opacity-50"></div>
                </div>
            )}
        </Link>
    );
};

export default WarrantCard;
