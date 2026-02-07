
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
                <Link to="/" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/') ? 'text-white bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-500/30' : 'text-indigo-400/70 hover:text-indigo-400 hover:bg-indigo-500/10 hover:drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]'}`}>
                    <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Início</span>
                    {isActive('/') && <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-sm"></div>}
                </Link>

                <Link to="/advanced-search" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/advanced-search') ? 'text-sky-400 bg-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.3)] border border-sky-500/30' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-sky-400 hover:bg-sky-500/10 hover:drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]'}`}>
                    {isActive('/advanced-search') && <span className="absolute inset-0 bg-sky-500/10 rounded-xl blur-sm"></span>}
                    <Search size={20} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Busca</span>
                </Link>

                <a
                    href="https://portalbnmp.cnj.jus.br/#/pesquisa-peca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all text-text-secondary-light dark:text-text-secondary-dark hover:text-blue-400 hover:bg-blue-500/10 hover:drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]"
                >
                    <ShieldCheck size={20} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">BNMP</span>
                </a>

                {isAdmin && (
                    <Link to="/audit" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/audit') ? 'text-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.3)] border border-emerald-500/30' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-emerald-400 hover:bg-emerald-500/10 hover:drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]'}`}>
                        {isActive('/audit') && <span className="absolute inset-0 bg-emerald-500/10 rounded-xl blur-sm"></span>}
                        <ClipboardList size={20} strokeWidth={isActive('/audit') ? 2.5 : 2} className="relative z-10" />
                        <span className="text-[9px] font-bold relative z-10 font-display">ADM</span>
                    </Link>
                )}

                <Link to="/profile" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/profile') ? 'text-indigo-400 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-500/30' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-indigo-400 hover:bg-indigo-500/10 hover:drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]'}`}>
                    {isActive('/profile') && <span className="absolute inset-0 bg-indigo-500/10 rounded-xl blur-sm"></span>}
                    <User size={20} strokeWidth={isActive('/profile') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
