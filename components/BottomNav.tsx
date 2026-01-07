
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Search, Bot, Route as RouteIcon, BarChart2, User } from 'lucide-react';

interface BottomNavProps {
    routeCount?: number;
}

const BottomNav = ({ routeCount = 0 }: BottomNavProps) => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    const hideNav = ['/warrant-detail', '/new-warrant', '/ai-assistant'].some(p => location.pathname.startsWith(p));

    if (hideNav) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-light bg-surface-light/95 backdrop-blur dark:bg-surface-dark/95 dark:border-border-dark pb-safe">
            <div className="mx-auto flex h-14 max-w-md items-center justify-around px-2">
                <Link to="/" className={`relative flex flex-col items-center gap-0.5 p-2 ${isActive('/') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} fill={isActive('/') ? "currentColor" : "none"} className={isActive('/') ? "opacity-20" : ""} />
                    {isActive('/') && <span className="text-[10px] font-bold">Início</span>}
                </Link>
                <Link to="/advanced-search" className={`flex flex-col items-center gap-0.5 p-2 ${isActive('/advanced-search') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <Search size={22} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} />
                    {isActive('/advanced-search') && <span className="text-[10px] font-bold">Busca</span>}
                </Link>

                <Link to="/ai-assistant" className="relative -top-3 bg-gradient-to-tr from-primary-dark to-primary p-2 rounded-full shadow-lg shadow-primary/40 border-4 border-background-light dark:border-background-dark transform transition-transform active:scale-95 group">
                    <Bot size={20} className="text-white" />
                </Link>

                <Link to="/route-planner" className={`relative flex flex-col items-center gap-0.5 p-2 ${isActive('/route-planner') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    {routeCount > 0 && (
                        <span className="absolute top-0 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm animate-bounce">
                            {routeCount}
                        </span>
                    )}
                    <RouteIcon size={22} strokeWidth={isActive('/route-planner') ? 2.5 : 2} />
                    {isActive('/route-planner') && <span className="text-[10px] font-bold">Roteiro</span>}
                </Link>

                <Link to="/stats" className={`flex flex-col items-center gap-0.5 p-2 ${isActive('/stats') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <BarChart2 size={22} strokeWidth={isActive('/stats') ? 2.5 : 2} />
                    {isActive('/stats') && <span className="text-[10px] font-bold">Estatísticas</span>}
                </Link>
                <Link to="/profile" className={`flex flex-col items-center gap-0.5 p-2 ${isActive('/profile') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                    {isActive('/profile') && <span className="text-[10px] font-bold">Perfil</span>}
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
