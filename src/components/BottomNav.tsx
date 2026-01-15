
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Search, User, ShieldCheck, ClipboardList } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface BottomNavProps {
    routeCount?: number;
}

const BottomNav = ({ routeCount = 0 }: BottomNavProps) => {
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);
    const isActive = (path: string) => location.pathname === path;

    useEffect(() => {
        const getRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Check metadata first
                if (user.user_metadata?.role === 'admin') {
                    setIsAdmin(true);
                    return;
                }

                // Then check profiles table
                const { data } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (data?.role?.toLowerCase() === 'admin') {
                    setIsAdmin(true);
                }
            }
        };
        getRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            getRole();
        });

        return () => subscription.unsubscribe();
    }, []);

    const hideNav = ['/warrant-detail', '/new-warrant', '/ai-assistant'].some(p => location.pathname.startsWith(p));

    if (hideNav) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-light bg-surface-light/95 backdrop-blur dark:bg-surface-dark/95 dark:border-border-dark pb-safe">
            <div className="mx-auto flex h-16 w-full items-center px-1">
                <Link to="/" className={`flex-1 flex flex-col items-center justify-center gap-1 ${isActive('/') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
                    <span className="text-[9px] font-bold">Início</span>
                </Link>

                <Link to="/advanced-search" className={`flex-1 flex flex-col items-center justify-center gap-1 ${isActive('/advanced-search') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <Search size={22} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} />
                    <span className="text-[9px] font-bold">Busca</span>
                </Link>

                <a
                    href="https://portalbnmp.cnj.jus.br/#/pesquisa-peca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-text-secondary-light dark:text-text-secondary-dark"
                >
                    <ShieldCheck size={22} />
                    <span className="text-[9px] font-bold">BNMP</span>
                </a>

                {isAdmin && (
                    <Link to="/audit" className={`flex-1 flex flex-col items-center justify-center gap-1 ${isActive('/audit') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                        <ClipboardList size={22} strokeWidth={isActive('/audit') ? 2.5 : 2} />
                        <span className="text-[9px] font-bold">ADM</span>
                    </Link>
                )}

                <Link to="/profile" className={`flex-1 flex flex-col items-center justify-center gap-1 ${isActive('/profile') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                    <span className="text-[9px] font-bold">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
