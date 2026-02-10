
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Home,
    Search,
    PlusCircle,
    BarChart2,
    Map,
    Bot,
    ShieldAlert,
    User,
    Menu,
    X,
    FileText,
    Activity,
    LogOut,
    ChevronRight,
    ChevronLeft,
    Siren,
    Sun,
    Moon,
    Bell,
    Settings,
    FileSearch,
    Database
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

interface SidebarProps {
    routeCount?: number;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    isDark: boolean;
    toggleTheme: () => void;
    hasNotifications?: boolean;
}

const Sidebar = ({ routeCount = 0, isCollapsed, toggleCollapse, isDark, toggleTheme, hasNotifications = false }: SidebarProps) => {
    const [isOpen, setIsOpen] = useState(false); // Mobile state
    const location = useLocation();

    // Fecha a sidebar ao navegar em mobile
    React.useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const mainNavItems = [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: FileText, label: 'Mandados', path: '/warrant-list' },
        { icon: FileSearch, label: 'Busca e Apreensão', path: '/minor-search' },
        { icon: PlusCircle, label: 'Novo Registro', path: '/new-warrant' },
        { icon: Search, label: 'Investigação', path: '/advanced-search' },
    ];

    const operationalNavItems = [
        { icon: Map, label: 'Roteiro Tático', path: '/route-planner', badge: routeCount },
        { icon: Bot, label: 'Assistente IA', path: '/ai-assistant' },
        { icon: BarChart2, label: 'Estatísticas', path: '/stats' },
    ];

    const systemNavItems = [
        { icon: Activity, label: 'Log de Atividade', path: '/recents' },
        { icon: Database, label: 'Banco de Dados', path: '/ai-assistant?tab=database' },
        { icon: ShieldAlert, label: 'Auditoria', path: '/audit' },
    ];

    const NavGroup = ({ title, items }: { title?: string, items: { icon: any; label: string; path: string; badge?: number }[] }) => (
        <div className="mb-4">
            {title && !isCollapsed && (
                <h3 className="px-5 mb-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] fade-in">
                    {title}
                </h3>
            )}
            <div className="space-y-1">
                {items.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? item.label : ''}
                        className={({ isActive }) => `
                            flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start px-4'} py-3 mx-3 rounded-xl transition-all duration-300 group relative
                            ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`flex items-center gap-3 relative z-10`}>
                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                                    />
                                    {!isCollapsed && (
                                        <span className={`text-sm font-bold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300`}>
                                            {item.label}
                                        </span>
                                    )}
                                </div>

                                {item.badge ? (
                                    isCollapsed ? (
                                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
                                    ) : (
                                        <span className="ml-auto relative z-10 flex h-5 w-5 items-center justify-center rounded-md bg-blue-500 text-[10px] font-bold text-white shadow-md shadow-blue-500/50">
                                            {item.badge}
                                        </span>
                                    )
                                ) : null}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header / Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-neon-blue">
                        <Siren size={18} className="text-white" />
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors active:scale-95"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed top-0 bottom-0 left-0 z-50
                bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-white/5
                flex flex-col
                transform transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                pt-16 md:pt-0
                ${isCollapsed ? 'w-20' : 'w-56'}
                ${isOpen ? 'translate-x-0 shadow-2xl shadow-black w-56' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Desktop Header */}
                <div className={`hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} h-20 border-b border-white/5 relative`}>
                    <div className="flex items-center gap-3">
                        <img
                            src="/brasao_pcsp_nova.png"
                            alt="Brasão PCSP"
                            className="h-10 w-auto object-contain shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-transform hover:scale-110"
                        />
                        {!isCollapsed && (
                            <h1 className="font-display font-black text-xl text-white tracking-widest whitespace-nowrap overflow-hidden">
                                PCSP
                            </h1>
                        )}
                    </div>

                    <button
                        onClick={toggleCollapse}
                        className={`
                            h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center 
                            text-zinc-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all
                            absolute -right-3 top-1/2 -translate-y-1/2 shadow-lg z-20
                            ${isCollapsed ? '' : ''}
                        `}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overflow-x-hidden">
                    <NavGroup title="Principal" items={mainNavItems} />
                    <NavGroup title="Operacional" items={operationalNavItems} />
                    <NavGroup title="Sistema" items={systemNavItems} />
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-white/5 bg-zinc-900/30 backdrop-blur-sm flex flex-col gap-3">
                    {/* Theme and Notifications */}
                    <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between px-2'}`}>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-all border border-transparent hover:border-white/10 group relative"
                            title={isDark ? "Modo Claro" : "Modo Escuro"}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button
                            onClick={() => toast.info(hasNotifications ? 'Novas notificações' : 'Nenhuma notificação nova')}
                            className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-all border border-transparent hover:border-white/10 group relative"
                            title="Notificações"
                        >
                            <Bell size={20} />
                            {hasNotifications && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#09090b]" />
                            )}
                        </button>
                    </div>

                    {/* User Profile */}
                    <NavLink
                        to="/profile"
                        className={`
                        flex items-center gap-3 p-2 rounded-xl border border-white/5 bg-white/5 
                        ${isCollapsed ? 'justify-center border-0 bg-transparent p-0' : 'hover:bg-white/10 hover:border-blue-500/30'} 
                        transition-all duration-300 group
                    `}>
                        {isCollapsed ? (
                            <div className="relative cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-blue-500 transition-all overflow-hidden">
                                    <User size={20} className="text-zinc-400 group-hover:text-white" />
                                </div>
                                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-[#09090b]" />
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-blue-500 transition-all overflow-hidden">
                                        <User size={18} className="text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-[#09090b]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">Investigador</p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">Em Serviço</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleLogout();
                                    }}
                                    className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Sair"
                                >
                                    <LogOut size={16} />
                                </button>
                            </>
                        )}
                    </NavLink>
                </div>
            </aside >
        </>
    );
};

export default Sidebar;
