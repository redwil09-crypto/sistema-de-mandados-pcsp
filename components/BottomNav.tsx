
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Search, User } from 'lucide-react';

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
            <div className="mx-auto flex h-16 max-w-md items-center justify-around px-6">
                <Link to="/" className={`flex flex-col items-center gap-1 min-w-[60px] ${isActive('/') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Início</span>
                </Link>

                <Link to="/advanced-search" className={`flex flex-col items-center gap-1 min-w-[60px] ${isActive('/advanced-search') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <Search size={24} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Busca</span>
                </Link>

                <Link to="/profile" className={`flex flex-col items-center gap-1 min-w-[60px] ${isActive('/profile') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
