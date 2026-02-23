
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Search, Sun, Moon, Bell, Gavel, Baby, FilePlus,
    BarChart2, Route as RouteIcon, Siren, ChevronRight,
    Activity, CalendarClock, X, CheckCircle, Bot, Shield
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
    onToggleNotifications?: () => void;
}

const HomePage = ({ isDark, toggleTheme, onToggleNotifications }: HomePageProps) => {
    const { warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant } = useWarrants();
    const navigate = useNavigate();

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            navigate(`/advanced-search?q=${encodeURIComponent(e.currentTarget.value)}`);
        }
    };

    // Calculate priority warrants from all warrants
    const priorityWarrants = warrants.filter(w => (w as any).tags?.includes('Urgente') || (w as any).tags?.includes('Ofício de Cobrança'));
    const urgentCount = priorityWarrants.filter(w => (w as any).tags?.includes('Urgente')).length;
    const oficioCount = priorityWarrants.filter(w => (w as any).tags?.includes('Ofício de Cobrança')).length;

    // Real Notification Logic (Expiring warrants)
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
            .filter(w => w.daysLeft <= 30)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [warrants]);

    const hasUrgentNotifications = urgentNotifications.some(w => w.daysLeft <= 7);

    return (
        <div className="min-h-screen pb-20 relative">

            <header className="sticky top-0 z-40 bg-background-light dark:bg-background-dark px-4 py-4 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <img
                            src="/brasao_police_siren.png"
                            alt="Brasão"
                            className="h-14 w-auto object-contain tactical-shield-clip drop-shadow-[0_0_6px_rgba(255,0,0,1)]"
                        />
                        <div>
                            <h1 className="text-lg font-black text-text-light dark:text-text-dark uppercase tracking-widest leading-none">Polícia Civil</h1>
                            <p className="text-[8px] font-black text-text-secondary-light/60 dark:text-text-dark/50 tracking-[0.2em] uppercase mt-1">Sistema de Mandados</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-text-light dark:text-text-dark"
                            aria-label="Alternar tema"
                        >
                            {isDark ? <Sun size={24} /> : <Moon size={24} />}
                        </button>
                        <button
                            onClick={() => onToggleNotifications?.()}
                            className={`relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}
                        >
                            <Bell size={24} />
                            {hasUrgentNotifications && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-background-light dark:border-background-dark animate-pulse"></span>}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light/60 dark:text-text-secondary-dark/80" size={20} />
                    <input
                        type="text"
                        placeholder="Nome, RG, endereço, crime, nº mandado..."
                        onKeyDown={handleSearch}
                        className="w-full rounded-xl border border-border-light dark:border-white/20 bg-surface-light dark:bg-surface-dark py-3.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-text-secondary-light/60 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
            </header>

            <main className="px-4 py-2 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/warrant-list" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 group-hover:shadow-neon-blue-card transition-shadow">
                            <Gavel size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Mandados de Prisão</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Todos os mandados</p>
                        </div>
                    </Link>

                    <Link to="/minor-search" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-orange-500 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500 group-hover:shadow-neon-orange-card transition-shadow">
                            <Baby size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Busca de Menores</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Busca e Apreensão</p>
                        </div>
                    </Link>

                    <Link to="/new-warrant" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-green-500 hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-500 group-hover:shadow-neon-green-card transition-shadow">
                            <FilePlus size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Novo</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Registrar mandado</p>
                        </div>
                    </Link>



                    <Link to="/stats" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-yellow-500 hover:shadow-[0_0_25px_rgba(234,179,8,0.6)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-500 group-hover:shadow-neon-yellow-card transition-shadow">
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Estatística</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Análise de BI</p>
                        </div>
                    </Link>

                    <Link to="/route-planner" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-cyan-500 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] relative">
                        {routeWarrants.length > 0 && (
                            <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white shadow-lg animate-bounce">
                                {routeWarrants.length}
                            </span>
                        )}
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 group-hover:shadow-neon-cyan-card transition-shadow">
                            <RouteIcon size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Roteiro</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Planejar diligência</p>
                        </div>
                    </Link>

                    <Link to="/ai-assistant" className="group flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-blue-500/5 to-cyan-500/10 p-4 shadow-sm transition-all active:scale-[0.98] dark:from-surface-dark dark:to-surface-dark-elevated border border-blue-500/30 hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Assistente IA</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60 tracking-tight">Extração e Voz</p>
                        </div>
                    </Link>
                </div>

                {/* Duty Summary Card */}
                <Link to="/priority-list" className="block mt-4 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 border border-transparent group-hover:border-red-500/30 transition-colors">
                                <Siren size={24} />
                            </div>
                            <div>
                                <h2 className="font-bold text-text-light dark:text-text-dark">Prioridades</h2>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    {urgentCount} Urgentes &bull; {oficioCount} Cobranças
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <span className="block text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wider group-hover:scale-105 transition-transform">Atenção</span>
                            </div>
                            <ChevronRight size={20} className="text-gray-500 dark:text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </Link>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <Activity size={18} className="text-secondary" /> Recentes
                        </h2>
                        <Link to="/recents" className="text-xs font-bold bg-secondary/10 text-secondary px-3 py-1.5 rounded-full hover:bg-secondary/20 transition-colors">
                            Ver todos
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {[...warrants]
                            .sort((a, b) => {
                                const dateA = a.updatedAt || a.createdAt || '';
                                const dateB = b.updatedAt || b.createdAt || '';
                                return dateB.localeCompare(dateA);
                            })
                            .slice(0, 3)
                            .map((warrant) => (
                                <WarrantCard
                                    key={warrant.id}
                                    data={warrant}
                                    onDelete={deleteWarrant}
                                    onRouteToggle={toggleRouteWarrant}
                                    isPlanned={routeWarrants.includes(warrant.id)}
                                    onPrint={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        generateWarrantPDF(warrant, updateWarrant);
                                    }}
                                />
                            ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HomePage;
