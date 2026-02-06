
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Search, User, ShieldCheck, ClipboardList, Bot } from 'lucide-react';
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
        <nav className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-border-light dark:border-white/5 bg-surface-light dark:bg-surface-dark/80 backdrop-blur-lg shadow-glass pb-safe">
            <div className="flex h-16 w-full items-center justify-center gap-8 px-2">
                <Link to="/" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/') ? 'text-white bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-500/30' : 'text-indigo-400 hover:text-white hover:bg-white/5'}`}>
                    <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Início</span>
                    {isActive('/') && <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-sm"></div>}
                </Link>

                <Link to="/advanced-search" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/advanced-search') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    {isActive('/advanced-search') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(15,23,42,0.1)] dark:shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                    <Search size={20} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Busca</span>
                </Link>

                <Link to="/ai-assistant" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/ai-assistant') ? 'text-purple-500' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    {isActive('/ai-assistant') && <span className="absolute inset-0 bg-purple-500/10 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)]"></span>}
                    <Bot size={20} strokeWidth={isActive('/ai-assistant') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">IA</span>
                </Link>

                <a
                    href="https://portalbnmp.cnj.jus.br/#/pesquisa-peca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5"
                >
                    <ShieldCheck size={20} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">BNMP</span>
                </a>

                {isAdmin && (
                    <Link to="/audit" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/audit') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        {isActive('/audit') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(15,23,42,0.1)] dark:shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                        <ClipboardList size={20} strokeWidth={isActive('/audit') ? 2.5 : 2} className="relative z-10" />
                        <span className="text-[9px] font-bold relative z-10 font-display">ADM</span>
                    </Link>
                )}

                <Link to="/profile" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/profile') ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    {isActive('/profile') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(15,23,42,0.1)] dark:shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                    <User size={20} strokeWidth={isActive('/profile') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
