import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Search, Sun, Moon, Bell, Gavel, Baby, FilePlus,
    BarChart2, Route as RouteIcon, Siren, ChevronRight,
    Activity, CalendarClock, X, CheckCircle, Bot, Shield,
    Cpu, Database, Zap, MapPin
} from 'lucide-react';
import { generateWarrantPDF } from '../services/pdfReportService';
import { Warrant } from '../types';
import WarrantCard from '../components/WarrantCard';
import { formatDate } from '../utils/helpers';
import { EXPIRING_WARRANTS } from '../data/mockData';
import { useWarrants } from '../contexts/WarrantContext';

interface HomePageProps {
    isDark: boolean;
    toggleTheme: () => void;
}

const HomePage = ({ isDark, toggleTheme }: HomePageProps) => {
    const { warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant } = useWarrants();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            navigate(`/advanced-search?q=${encodeURIComponent(e.currentTarget.value)}`);
        }
    };

    // metrics
    const priorityWarrants = warrants.filter(w => (w as any).tags?.includes('Urgente') || (w as any).tags?.includes('Ofício de Cobrança'));
    const urgentCount = priorityWarrants.filter(w => (w as any).tags?.includes('Urgente')).length;
    const totalWarrants = warrants.length;

    // Real Notification Logic
    const urgentNotifications = useMemo(() => {
        const today = new Date();
        return warrants
            .filter(w => w.status === 'EM ABERTO' && w.expirationDate)
            .map(w => {
                const expDate = w.expirationDate!.includes('/')
                    ? new Date(w.expirationDate!.split('/').reverse().join('-'))
                    : new Date(w.expirationDate!);
                const diffTime = expDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...w, daysLeft: diffDays };
            })
            .filter(w => w.daysLeft <= 30 && w.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [warrants]);

    const hasUrgentNotifications = urgentNotifications.some(w => w.daysLeft <= 7);

    const displayedNotifications = showAllNotifications
        ? urgentNotifications.slice(0, 10)
        : urgentNotifications.filter(w => w.daysLeft <= 7);

    return (
        <div className="min-h-screen pb-24 bg-cyber-black text-white selection:bg-neon-red selection:text-white overflow-x-hidden">

            {/* BACKGROUND WARP SPEED EFFECT (CSS managed in index.css generally, but ensuring full coverage) */}
            <div className="fixed inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay"></div>

            {/* HEADER - COMMAND CENTER STYLE */}
            <header className="sticky top-0 z-50 bg-cyber-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neon-red/10 border border-neon-red/50 rounded-lg shadow-neon-red">
                            <Shield className="text-neon-red" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-bold tracking-widest text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                PCSP <span className="text-neon-red">SYSTEM</span>
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-neon-green/80 animate-pulse"></span>
                                <p className="text-[10px] font-mono text-neon-blue tracking-widest uppercase">
                                    ONLINE // v4.0.1
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-3 rounded-lg border border-white/10 hover:border-neon-blue hover:bg-neon-blue/10 transition-all ${showNotifications ? 'border-neon-blue shadow-neon-blue icon-glow-blue' : ''}`}
                        >
                            <Bell size={20} className={hasUrgentNotifications ? "text-neon-red animate-pulse" : "text-white"} />
                            {hasUrgentNotifications && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-neon-red shadow-[0_0_10px_#ff2a2a]"></span>}
                        </button>
                    </div>
                </div>

                {/* SEARCH MODULE */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-blue to-neon-purple opacity-30 group-hover:opacity-70 blur transition duration-500 rounded-xl"></div>
                    <div className="relative flex items-center bg-cyber-dark rounded-xl border border-white/10 overflow-hidden">
                        <Search className="ml-4 text-neon-blue/70" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH DATABASE..."
                            onKeyDown={handleSearch}
                            className="w-full bg-transparent py-4 px-4 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none uppercase tracking-wider"
                        />
                        <div className="mr-4 px-2 py-1 text-[10px] font-bold border border-white/20 rounded text-gray-500">RETKEY</div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 px-6 py-6 space-y-8">

                {/* STATUS DASHBOARD */}
                <div className="grid grid-cols-2 gap-4">
                    {/* TOTAL WARRANTS WIDGET */}
                    <div className="cyber-card p-4 flex flex-col justify-between h-32 border-t-4 border-t-neon-blue">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Active Cases</h3>
                            <Database size={16} className="text-neon-blue" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-display font-bold text-white text-glow-blue">{totalWarrants}</span>
                            <span className="text-xs text-neon-blue mb-1.5">+2 this week</span>
                        </div>
                        <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                            <div className="bg-neon-blue h-full w-3/4 shadow-[0_0_10px_#2a62ff]"></div>
                        </div>
                    </div>

                    {/* URGENT PRIORITY WIDGET */}
                    <div className="cyber-card p-4 flex flex-col justify-between h-32 border-t-4 border-t-neon-red cursor-pointer group hover:bg-neon-red/5 transition-all" onClick={() => navigate('/priority-list')}>
                        <div className="flex justify-between items-start">
                            <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest group-hover:text-neon-red transition-colors">Priority High</h3>
                            <Siren size={16} className="text-neon-red animate-pulse" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-display font-bold text-white text-glow-red">{urgentCount}</span>
                            <span className="text-xs text-neon-red mb-1.5 font-bold">CRITICAL</span>
                        </div>
                        <div className="flex gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full ${i < Math.min(urgentCount, 5) ? 'bg-neon-red shadow-[0_0_5px_#ff2a2a]' : 'bg-gray-800'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MAIN MODULES GRID */}
                <div>
                    <h2 className="text-sm font-mono text-gray-500 mb-4 flex items-center gap-2">
                        <Cpu size={14} /> SYSTEM MODLUES
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/warrant-list" className="cyber-card p-4 hover:border-neon-blue/50 group transition-all">
                            <div className="h-10 w-10 mt-1 mb-3 rounded-lg bg-neon-blue/10 flex items-center justify-center border border-neon-blue/30 group-hover:bg-neon-blue/20 group-hover:shadow-neon-blue transition-all">
                                <Gavel size={20} className="text-neon-blue" />
                            </div>
                            <h3 className="font-display font-bold text-lg leading-tight group-hover:text-neon-blue transition-colors">MANDADOS</h3>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">ACCESS ALL RECORDS</p>
                        </Link>

                        <Link to="/ai-assistant" className="cyber-card p-4 hover:border-neon-purple/50 group transition-all col-span-2 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-neon-purple/20 blur-[50px] rounded-full pointer-events-none"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="h-10 w-10 mb-3 rounded-lg bg-neon-purple/10 flex items-center justify-center border border-neon-purple/30 group-hover:bg-neon-purple/20 group-hover:shadow-neon-purple transition-all">
                                        <Bot size={20} className="text-neon-purple" />
                                    </div>
                                    <h3 className="font-display font-bold text-lg leading-tight group-hover:text-neon-purple transition-colors">AI ANALYST</h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">VOICE & DATA EXTRACTION</p>
                                </div>
                                <div className="h-16 w-16 rounded-full border border-neon-purple/30 flex items-center justify-center animate-pulse">
                                    <div className="h-12 w-12 rounded-full border border-neon-purple/50 flex items-center justify-center">
                                        <Zap size={20} className="text-neon-purple" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link to="/new-warrant" className="cyber-card p-4 hover:border-neon-cyan/50 group transition-all">
                            <div className="h-10 w-10 mt-1 mb-3 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/30 group-hover:bg-neon-cyan/20 group-hover:shadow-neon-cyan transition-all">
                                <FilePlus size={20} className="text-neon-cyan" />
                            </div>
                            <h3 className="font-display font-bold text-lg leading-tight group-hover:text-neon-cyan transition-colors">NOVO</h3>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">CREATE ENTRY</p>
                        </Link>

                        <Link to="/route-planner" className="cyber-card p-4 hover:border-white/50 group transition-all">
                            <div className="h-10 w-10 mt-1 mb-3 rounded-lg bg-white/5 flex items-center justify-center border border-white/20 group-hover:bg-white/10 group-hover:shadow-white transition-all">
                                <RouteIcon size={20} className="text-white" />
                            </div>
                            <h3 className="font-display font-bold text-lg leading-tight group-hover:text-white transition-colors">ROTEIRO</h3>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">TACTICAL MAP</p>
                            {routeWarrants.length > 0 && (
                                <div className="absolute top-4 right-4 px-2 py-0.5 bg-neon-blue text-xs font-bold rounded text-white shadow-neon-blue">
                                    {routeWarrants.length}
                                </div>
                            )}
                        </Link>
                    </div>
                </div>

                {/* RECENT DATA STREAM */}
                <div className="cyber-card p-1">
                    <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h2 className="text-xs font-mono text-neon-blue uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="animate-spin-slow" /> Data Stream
                        </h2>
                        <span className="text-[10px] text-gray-500">LIVE</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {warrants.length > 0 ? (
                            warrants
                                .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
                                .slice(0, 5)
                                .map((w) => (
                                    <Link to={`/warrant-detail/${w.id}`} key={w.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group">
                                        <div className={`h-2 w-2 rounded-full shadow-[0_0_5px] ${w.status === 'EM ABERTO' ? 'bg-neon-red shadow-neon-red' : 'bg-neon-green shadow-neon-green'}`}></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-gray-200 truncate group-hover:text-neon-blue transition-colors">{w.name}</h4>
                                            <p className="text-[10px] text-gray-500 font-mono uppercase truncate">{w.type} // {w.number}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                                    </Link>
                                ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-xs font-mono">NO DATA AVAILABLE</div>
                        )}
                    </div>
                </div>

            </main>

            {/* NOTIFICATIONS PANEL (Updated Style) */}
            {showNotifications && (
                <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 pt-20">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
                    <div className="relative w-full max-w-sm cyber-card bg-cyber-dark/95 border-neon-red/30 shadow-2xl animate-in slide-in-from-right-10 duration-300">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-neon-red/10 to-transparent">
                            <h3 className="font-display font-bold text-white flex items-center gap-2 tracking-wider">
                                <CalendarClock className="text-neon-red" size={18} /> CRITICAL DATES
                            </h3>
                            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {displayedNotifications.length > 0 ? (
                                displayedNotifications.map(item => (
                                    <Link to={`/warrant-detail/${item.id}`} key={item.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded transition-colors border-l-2 border-transparent hover:border-neon-red">
                                        <div className="h-8 w-8 rounded bg-neon-red/20 flex items-center justify-center text-neon-red font-bold text-xs shrink-0 border border-neon-red/30">
                                            {item.daysLeft}d
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-200">{item.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{item.type}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-6 text-center">
                                    <CheckCircle className="mx-auto text-gray-500 mb-2" size={24} />
                                    <p className="text-xs text-gray-500">ALL SYSTEMS NOMINAL</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;
