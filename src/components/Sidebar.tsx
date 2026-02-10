
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
    Siren
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface SidebarProps {
    routeCount?: number;
}

const Sidebar = ({ routeCount = 0 }: SidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
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
        { icon: ShieldAlert, label: 'Auditoria', path: '/audit' },
    ];

    const NavGroup = ({ title, items }: { title?: string, items: typeof mainNavItems }) => (
        <div className="mb-6">
            {title && (
                <h3 className="px-5 mb-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    {title}
                </h3>
            )}
            <div className="space-y-1">
                {items.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center justify-between px-5 py-2.5 mx-2 rounded-lg transition-all duration-300 group relative
                            ${isActive
                                ? 'bg-blue-600/10 text-white shadow-lg shadow-blue-900/20'
                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                {/* Active State Background Glow Effect */}
                                {isActive && (
                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/20 to-transparent opacity-50 blur-sm pointer-events-none" />
                                )}

                                {/* Left Active Bar */}
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-500 rounded-r-full transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />

                                <div className="flex items-center gap-3 relative z-10">
                                    <item.icon
                                        size={18}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-colors duration-300 ${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'group-hover:text-white'}`}
                                    />
                                    <span className={`text-sm font-medium tracking-wide transition-all ${isActive ? 'translate-x-1' : ''}`}>
                                        {item.label}
                                    </span>
                                </div>

                                {item.badge ? (
                                    <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/50">
                                        {item.badge}
                                    </span>
                                ) : (
                                    <ChevronRight size={14} className={`relative z-10 transition-all duration-300 ${isActive ? 'text-blue-500 opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                                )}
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
                    <span className="font-display font-black text-lg text-white tracking-wider">
                        PCSP <span className="text-blue-500">INTEL</span>
                    </span>
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
                w-72 bg-[#09090b] border-r border-white/5
                flex flex-col
                transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                md:translate-x-0 pt-16 md:pt-0
                ${isOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full'}
            `}>
                {/* Desktop Header */}
                <div className="hidden md:flex flex-col items-center justify-center h-24 border-b border-white/5 bg-gradient-to-b from-zinc-900 to-transparent relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30">
                            <Siren size={20} className="text-white fill-white/20" />
                        </div>
                        <h1 className="font-display font-black text-2xl text-white tracking-widest">
                            PCSP <span className="text-blue-500">INTEL</span>
                        </h1>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] pl-12">
                        Sistema de Capturas v2.0
                    </span>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-1 space-y-2 custom-scrollbar">
                    <NavGroup title="Principal" items={mainNavItems} />
                    <NavGroup title="Operacional" items={operationalNavItems} />
                    <NavGroup title="Sistema" items={systemNavItems} />
                </nav>

                {/* Footer / Profile */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/30 backdrop-blur-sm">
                    <NavLink
                        to="/profile"
                        className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 group mb-3"
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-blue-500 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all overflow-hidden">
                                <User size={20} className="text-zinc-400 group-hover:text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-[#09090b] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">Investigador</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">Em Serviço</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 justify-center p-2.5 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-xs font-bold uppercase tracking-widest border border-transparent hover:border-red-500/20 group"
                    >
                        <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Desconectar
                    </button>

                    <div className="mt-4 text-center">
                        <p className="text-[9px] text-zinc-700 font-mono">
                            SESSION ID: <span className="text-zinc-600">{Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
