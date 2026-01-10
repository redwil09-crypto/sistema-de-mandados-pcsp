
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
import { EXPIRING_WARRANTS } from '../data/mockData';

interface HomePageProps {
    isDark: boolean;
    toggleTheme: () => void;
    warrants: Warrant[];
    onUpdate: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    routeCount?: number;
}

const HomePage = ({ isDark, toggleTheme, warrants, onUpdate, routeCount = 0 }: HomePageProps) => {
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
                                                <p className="text-[10px] text-gray-400 mt-0.5">Vence em: {item.date || item.expirationDate}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-text-secondary-light">
                                    <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                                    <p className="text-sm">Nenhum mandado urgente.</p>
                                    {!showAllNotifications && EXPIRING_WARRANTS.length > 0 && (
                                        <p className="text-xs mt-1 text-gray-400">Clique em "Ver completo" para ver os próximos.</p>
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
                        <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark tracking-wide">Sistema de Mandados</p>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light" size={20} />
                    <input
                        type="text"
                        placeholder="Nome, RG, endereço, crime, nº mandado..."
                        onKeyDown={handleSearch}
                        className="w-full rounded-xl border-none bg-surface-light py-3.5 pl-10 pr-4 text-sm shadow-md placeholder:text-text-secondary-light focus:ring-2 focus:ring-primary dark:bg-surface-dark dark:text-white"
                    />
                </div>
            </header>

            <main className="px-4 py-2 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/warrant-list" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-primary/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary dark:bg-primary/10">
                            <Gavel size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Mandados de Prisão</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Todos os mandados</p>
                        </div>
                    </Link>

                    <Link to="/minor-search" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-orange-500/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500">
                            <Baby size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Busca de Menores</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Busca e Apreensão</p>
                        </div>
                    </Link>

                    <Link to="/new-warrant" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-green-500/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-500">
                            <FilePlus size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Novo</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Registrar mandado</p>
                        </div>
                    </Link>

                    <Link to="/intel" className="group flex flex-col gap-3 rounded-2xl bg-slate-900 p-4 shadow-xl transition-all active:scale-[0.98] border border-indigo-500/30 hover:border-indigo-500 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/40 transition-all" />
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                            <Shield size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Centro de Inteligência</h3>
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-tight">Radar & Vínculos</p>
                        </div>
                    </Link>

                    <Link to="/stats" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-purple-500/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-500">
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Estatística</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Análise de BI</p>
                        </div>
                    </Link>

                    <Link to="/route-planner" className="group flex flex-col gap-3 rounded-2xl bg-surface-light p-4 shadow-md transition-all active:scale-[0.98] dark:bg-surface-dark border border-transparent hover:border-indigo-500/20 relative">
                        {routeCount > 0 && (
                            <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-lg animate-bounce">
                                {routeCount}
                            </span>
                        )}
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <RouteIcon size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Roteiro</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Planejar diligência</p>
                        </div>
                    </Link>

                    <Link to="/ai-assistant" className="group flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm transition-all active:scale-[0.98] dark:from-primary/10 dark:to-primary/20 border border-primary/20 hover:border-primary/40">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark">Assistente IA</h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark tracking-tight">Extração e Voz</p>
                        </div>
                    </Link>
                </div>

                {/* Duty Summary Card */}
                <Link to="/priority-list" className="block rounded-2xl bg-surface-light dark:bg-surface-dark p-4 shadow-[0_0_10px_rgba(239,68,68,0.6)] border border-red-500 relative overflow-hidden transition-transform active:scale-[0.98]">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/10 blur-xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
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
                            <ChevronRight size={20} className="text-gray-400" />
                        </div>
                    </div>
                </Link>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <Activity size={18} className="text-primary" /> Recentes
                        </h2>
                        <Link to="/recents" className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
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
                                    onPrint={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        generateWarrantPDF(warrant, onUpdate);
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
