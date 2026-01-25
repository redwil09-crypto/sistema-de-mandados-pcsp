
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
        <nav className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-white/5 bg-surface-dark/80 backdrop-blur-lg shadow-glass pb-safe">
            <div className="flex h-16 w-full items-center justify-center gap-8 px-2">
                <Link to="/" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/') ? 'text-primary' : 'text-text-secondary-dark hover:text-text-dark hover:bg-white/5'}`}>
                    {isActive('/') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                    <Home size={20} strokeWidth={isActive('/') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Início</span>
                </Link>

                <Link to="/advanced-search" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/advanced-search') ? 'text-primary' : 'text-text-secondary-dark hover:text-text-dark hover:bg-white/5'}`}>
                    {isActive('/advanced-search') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                    <Search size={20} strokeWidth={isActive('/advanced-search') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Busca</span>
                </Link>

                <div className="relative -mt-8">
                    <a
                        href="https://portalbnmp.cnj.jus.br/#/pesquisa-peca"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center group"
                    >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-surface-dark-elevated to-surface-dark border-2 border-white/10 text-text-secondary-dark shadow-tactic group-hover:border-primary/50 group-hover:text-primary transition-all active:scale-95 mb-1">
                            <ShieldCheck size={22} />
                        </div>
                        <span className="text-[9px] font-bold text-text-secondary-dark/60 font-display group-hover:text-primary transition-colors">BNMP</span>
                    </a>
                </div>

                {isAdmin && (
                    <Link to="/audit" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/audit') ? 'text-primary' : 'text-text-secondary-dark hover:text-text-dark hover:bg-white/5'}`}>
                        {isActive('/audit') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                        <ClipboardList size={20} strokeWidth={isActive('/audit') ? 2.5 : 2} className="relative z-10" />
                        <span className="text-[9px] font-bold relative z-10 font-display">ADM</span>
                    </Link>
                )}

                <Link to="/profile" className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${isActive('/profile') ? 'text-primary' : 'text-text-secondary-dark hover:text-text-dark hover:bg-white/5'}`}>
                    {isActive('/profile') && <span className="absolute inset-0 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]"></span>}
                    <User size={20} strokeWidth={isActive('/profile') ? 2.5 : 2} className="relative z-10" />
                    <span className="text-[9px] font-bold relative z-10 font-display">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
