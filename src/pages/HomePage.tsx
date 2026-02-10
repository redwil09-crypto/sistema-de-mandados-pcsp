
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
            .filter(w => w.daysLeft <= 30 && w.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [warrants]);

    const hasUrgentNotifications = urgentNotifications.some(w => w.daysLeft <= 7);

    const displayedNotifications = showAllNotifications
        ? urgentNotifications.slice(0, 10)
        : urgentNotifications.filter(w => w.daysLeft <= 7);

    return (
        <div className="min-h-screen pb-20 relative">
            {/* Notification Overlay */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setShowNotifications(false)}></div>
                    <div className="relative w-full max-w-sm bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark animate-in slide-in-from-top-4 duration-200">
                        <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                            <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                                <CalendarClock className="text-orange-500" size={18} /> Vencendo em Breve
                            </h3>
                            <button onClick={() => setShowNotifications(false)} className="text-text-secondary-light hover:text-primary">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                            {displayedNotifications.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="px-2 py-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded">
                                        {showAllNotifications ? "Próximos 10 Vencimentos" : "Urgente (Menos de 7 dias)"}
                                    </div>
                                    {displayedNotifications.map(item => (
                                        <Link to={`/warrant-detail/${item.id}`} key={item.id} className="flex items-center gap-3 p-3 hover:bg-background-light dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-border-light dark:hover:border-border-dark">
                                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold text-xs shrink-0">
                                                {item.daysLeft}d
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-text-light dark:text-text-dark truncate">{item.name}</p>
                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{item.type}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Vence em: {formatDate(item.expirationDate || item.date)}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-text-secondary-light">
                                    <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                                    <p className="text-sm">Nenhum mandado urgente.</p>
                                    {!showAllNotifications && EXPIRING_WARRANTS.length > 0 && (
                                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Clique em "Ver completo" para ver os próximos.</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-white/5 rounded-b-xl">
                            <button
                                onClick={() => setShowAllNotifications(!showAllNotifications)}
                                className="w-full py-2 text-xs font-bold text-primary hover:underline"
                            >
                                {showAllNotifications ? "Ver menos" : "Ver completo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-40 bg-background-light dark:bg-background-dark px-4 py-4 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-lg font-black text-text-light dark:text-text-dark uppercase tracking-widest">Polícia Civil</h1>
                        <p className="text-xs font-black text-text-secondary-light/60 dark:text-text-dark/50 tracking-wide uppercase">Sistema de Mandados</p>
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
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${showNotifications ? 'bg-black/5 dark:bg-white/10' : ''}`}
                        >
                            <Bell size={24} />
                            {hasUrgentNotifications && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-background-light dark:border-background-dark animate-pulse"></span>}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light/60 dark:text-text-secondary-dark/60" size={20} />
                    <input
                        type="text"
                        placeholder="Nome, RG, endereço, crime, nº mandado..."
                        onKeyDown={handleSearch}
                        className="w-full rounded-xl border border-border-light dark:border-white/5 bg-surface-light dark:bg-surface-dark py-3.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-text-secondary-light/60 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
            </header>

            <main className="px-4 py-2 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/warrant-list" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-[#09090b] border border-transparent hover:border-blue-400 hover:shadow-neon-blue">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 group-hover:shadow-neon-blue-card transition-shadow">
                            <Gavel size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Mandados de Prisão</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Todos os mandados</p>
                        </div>
                    </Link>

                    <Link to="/minor-search" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-[#09090b] border border-transparent hover:border-orange-500 hover:shadow-neon-orange">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500 group-hover:shadow-neon-orange-card transition-shadow">
                            <Baby size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Busca de Menores</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Busca e Apreensão</p>
                        </div>
                    </Link>

                    <Link to="/new-warrant" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-[#09090b] border border-transparent hover:border-green-500 hover:shadow-neon-green">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-500 group-hover:shadow-neon-green-card transition-shadow">
                            <FilePlus size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Novo</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Registrar mandado</p>
                        </div>
                    </Link>



                    <Link to="/stats" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-[#09090b] border border-transparent hover:border-yellow-500 hover:shadow-neon-yellow">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-500 group-hover:shadow-neon-yellow-card transition-shadow">
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Estatística</h3>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-dark/60">Análise de BI</p>
                        </div>
                    </Link>

                    <Link to="/route-planner" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-[#09090b] border border-transparent hover:border-cyan-500 hover:shadow-neon-cyan relative">
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

                    <Link to="/ai-assistant" className="group flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-blue-500/5 to-cyan-500/10 p-4 shadow-sm transition-all active:scale-[0.98] dark:from-[#09090b] dark:to-[#0c0c0e] border border-blue-500/30 hover:border-blue-500 hover:shadow-neon-blue">
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
                <Link to="/priority-list" className="block rounded-2xl bg-surface-light dark:bg-surface-dark p-4 shadow-[0_0_10px_rgba(239,68,68,0.6)] border border-red-500 relative overflow-hidden transition-transform active:scale-[0.98]">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/10 blur-xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-500/20">
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
                                <span className="block text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Atenção</span>
                            </div>
                            <ChevronRight size={20} className="text-gray-500 dark:text-gray-400" />
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
