
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
    LogOut
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

    const navItems = [
        { icon: Home, label: 'Início', path: '/' },
        { icon: FileText, label: 'Mandados', path: '/warrant-list' },
        { icon: Search, label: 'Busca Avançada', path: '/advanced-search' },
        { icon: PlusCircle, label: 'Novo Mandado', path: '/new-warrant' },
        { icon: Map, label: 'Roteiro', path: '/route-planner', badge: routeCount },
        { icon: BarChart2, label: 'Estatísticas', path: '/stats' },
        { icon: Bot, label: 'Assistente IA', path: '/ai-assistant' },
        { icon: Activity, label: 'Atividade', path: '/recents' },
        { icon: ShieldAlert, label: 'Auditoria', path: '/audit' },
    ];

    return (
        <>
            {/* Mobile Header / Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-white/5 flex items-center justify-between px-4 z-50">
                <span className="font-display font-black text-lg text-white tracking-wider">
                    PCSP <span className="text-blue-500">TACTICAL</span>
                </span>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed top-0 bottom-0 left-0 z-50
                w-72 bg-zinc-950 border-r border-white/5
                transform transition-transform duration-300 ease-in-out
                md:translate-x-0 pt-16 md:pt-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Desktop Header */}
                <div className="hidden md:flex flex-col items-center justify-center h-20 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md">
                    <h1 className="font-display font-black text-xl text-white tracking-widest">
                        PCSP <span className="text-blue-600 neon-text-blue">INTEL</span>
                    </h1>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Sistema de Capturas</span>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                                ${isActive
                                    ? 'bg-blue-600/10 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/20'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Indicator Line */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-blue-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />

                                    <item.icon
                                        size={20}
                                        className={`transition-colors duration-200 ${isActive ? 'text-blue-500' : 'group-hover:text-blue-400'}`}
                                    />

                                    <span className="font-medium text-sm tracking-wide">{item.label}</span>

                                    {item.badge ? (
                                        <span className="ml-auto w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-blue-600 text-white rounded-full shadow-neon-blue">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer / Profile */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                    <NavLink
                        to="/profile"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors mb-2 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 group-hover:shadow-neon-blue transition-all">
                            <User size={20} className="text-zinc-400 group-hover:text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">Investigador</p>
                            <p className="text-xs text-zinc-500 truncate">Configurações</p>
                        </div>
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        <LogOut size={16} />
                        Desconectar
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
