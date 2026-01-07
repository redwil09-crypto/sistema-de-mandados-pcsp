
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Search, Bot, User, Gavel, Baby, Plus } from 'lucide-react';

interface BottomNavProps {
    routeCount?: number;
}

const BottomNav = ({ routeCount = 0 }: BottomNavProps) => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    const hideNav = ['/warrant-detail', '/new-warrant', '/ai-assistant'].some(p => location.pathname.startsWith(p));

    if (hideNav) return null;

    return (
        <>
            {/* IA Floating Action Button */}
            <Link
                to="/ai-assistant"
                className="fixed bottom-20 right-4 z-50 bg-gradient-to-tr from-primary-dark to-primary p-4 rounded-full shadow-xl shadow-primary/30 border-2 border-white/20 transform transition-transform active:scale-95 group hover:rotate-12"
            >
                <Bot size={24} className="text-white" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border border-white">IA</span>
            </Link>

            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-light bg-surface-light/95 backdrop-blur dark:bg-surface-dark/95 dark:border-border-dark pb-safe">
                <div className="mx-auto flex h-14 max-w-md items-center justify-around px-1">
                    <Link to="/" className={`flex flex-col items-center gap-0.5 min-w-[50px] ${isActive('/') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <Home size={20} strokeWidth={isActive('/') ? 2.5 : 2} />
                        <span className="text-[9px] font-bold">Início</span>
                    </Link>

                    <Link to="/warrant-list" className={`flex flex-col items-center gap-0.5 min-w-[50px] ${isActive('/warrant-list') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <Gavel size={20} strokeWidth={isActive('/warrant-list') ? 2.5 : 2} />
                        <span className="text-[9px] font-bold">Prisão</span>
                    </Link>

                    <Link to="/minor-search" className={`flex flex-col items-center gap-0.5 min-w-[50px] ${isActive('/minor-search') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <Baby size={20} strokeWidth={isActive('/minor-search') ? 2.5 : 2} />
                        <span className="text-[9px] font-bold">Busca/Apr</span>
                    </Link>

                    <Link to="/new-warrant" className={`flex flex-col items-center gap-0.5 min-w-[50px] ${isActive('/new-warrant') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                            <Plus size={18} strokeWidth={3} />
                        </div>
                    </Link>

                    <Link to="/advanced-search" className={`flex flex-col items-center gap-0.5 min-w-[50px] ${isActive('/advanced-search') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <Search size={20} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} />
                        <span className="text-[9px] font-bold">Busca</span>
                    </Link>

                    <Link to="/profile" className={`flex flex-col items-center gap-0.5 min-w-[50px] ${isActive('/profile') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <User size={20} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                        <span className="text-[9px] font-bold">Perfil</span>
                    </Link>
                </div>
            </nav>
        </>
    );
};

export default BottomNav;
