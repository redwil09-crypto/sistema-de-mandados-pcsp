
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { AlertCircle, LogOut } from 'lucide-react';

// Context
import { WarrantProvider, useWarrants } from './contexts/WarrantContext';

// Pages
const Auth = React.lazy(() => import('./pages/Auth'));
const Profile = React.lazy(() => import('./pages/Profile'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const WarrantList = React.lazy(() => import('./pages/WarrantList'));
const AdvancedSearch = React.lazy(() => import('./pages/AdvancedSearch'));
const RecentActivityPage = React.lazy(() => import('./pages/RecentActivityPage'));
const Stats = React.lazy(() => import('./pages/Stats'));
const MinorSearch = React.lazy(() => import('./pages/MinorSearch'));
const PriorityList = React.lazy(() => import('./pages/PriorityList'));
const WarrantDetail = React.lazy(() => import('./pages/WarrantDetail'));
const NewWarrant = React.lazy(() => import('./pages/NewWarrant'));
const AIAssistantPage = React.lazy(() => import('./pages/AIAssistantPage'));
const AuditPage = React.lazy(() => import('./pages/AuditPage'));
const RoutePlanner = React.lazy(() => import('./pages/RoutePlanner'));
const OperationalMap = React.lazy(() => import('./pages/OperationalMap'));
const CounterWarrantList = React.lazy(() => import('./pages/CounterWarrantList'));

// Components
import Sidebar from './components/Sidebar';
import NotificationOverlay from './components/NotificationOverlay';
import PerformanceOptimizationModal from './components/PerformanceOptimizationModal';
import { useLocation } from 'react-router-dom';

import { Toaster } from 'sonner';

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

function PendingApproval() {
    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-[#f0f9f4] flex flex-col items-center justify-start pt-12 px-4 space-y-8">
            <div className="w-full max-w-md bg-[#ff4b4b] text-white p-4 rounded-xl shadow-lg flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="mt-1">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider">Acesso recusado</h3>
                    <p className="text-[11px] opacity-90 leading-relaxed mt-1">
                        Seu acesso ainda não foi aprovado por um administrador.
                    </p>
                </div>
            </div>

            <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-xl text-center space-y-6">
                <div className="flex justify-center gap-4 mb-4">
                    <div className="w-12 h-12 text-[#2eb872] animate-bounce">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-4xl font-black text-[#1a4d33] leading-tight">
                    Transforme seu lar em um jardim
                </h1>

                <p className="text-sm text-[#4a7a61] leading-relaxed">
                    Descubra o prazer de cultivar plantas e flores. Dicas, cuidados e inspiração para criar seu próprio oásis verde.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <button className="bg-[#10a37f] text-white font-bold py-4 rounded-xl text-xs flex items-center justify-center gap-2">
                        Começar Agora
                    </button>
                    <button className="bg-[#1a1c1e] text-white font-bold py-4 rounded-xl text-xs">
                        Saiba Mais
                    </button>
                </div>

                <div className="pt-8">
                    <button
                        onClick={handleSignOut}
                        className="text-[10px] font-black uppercase tracking-widest text-[#ff4b4b] hover:underline flex items-center justify-center gap-2 mx-auto"
                    >
                        <LogOut size={14} /> Sair da conta
                    </button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === null ? true : saved === 'dark';
    });

    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showPerformanceModal, setShowPerformanceModal] = useState(() => {
        return sessionStorage.getItem('performance_optimization_accepted') !== 'true';
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        }).catch(err => {
            console.error("Auth Session Error:", err);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    if (authLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background-dark relative overflow-hidden">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <>
                <Auth />
                {showPerformanceModal && (
                    <PerformanceOptimizationModal
                        onAccept={() => {
                            sessionStorage.setItem('performance_optimization_accepted', 'true');
                            setShowPerformanceModal(false);
                        }}
                    />
                )}
            </>
        );
    }

    // Authorization Check
    const isAuthorized = session.user.user_metadata?.authorized === true;

    if (!isAuthorized) {
        return (
            <>
                <PendingApproval />
                {showPerformanceModal && (
                    <PerformanceOptimizationModal
                        onAccept={() => {
                            sessionStorage.setItem('performance_optimization_accepted', 'true');
                            setShowPerformanceModal(false);
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <WarrantProvider>
            <HashRouter>
                <AppContent isDark={isDark} toggleTheme={toggleTheme} />
                {showPerformanceModal && (
                    <PerformanceOptimizationModal
                        onAccept={() => {
                            sessionStorage.setItem('performance_optimization_accepted', 'true');
                            setShowPerformanceModal(false);
                        }}
                    />
                )}
            </HashRouter>
        </WarrantProvider>
    );
}

function AppContent({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
    const location = useLocation();
    const { routeWarrants, warrants, loading } = useWarrants();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return sessionStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [showNotifications, setShowNotifications] = useState(false);

    const handleToggleCollapse = () => {
        const nextState = !isCollapsed;
        setIsCollapsed(nextState);
        sessionStorage.setItem('sidebar_collapsed', String(nextState));
    };

    const hasNotifications = React.useMemo(() => {
        if (!warrants) return false;
        const today = new Date();

        return warrants.some(w => {
            if (w.status !== 'EM ABERTO' || !w.expirationDate) return false;

            const expDate = w.expirationDate.includes('/')
                ? new Date(w.expirationDate.split('/').reverse().join('-'))
                : new Date(w.expirationDate);

            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays <= 7;
        });
    }, [warrants]);

    if (loading && (!warrants || warrants.length === 0)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Carregando Sistema...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-200">
            <ScrollToTop />
            <Toaster richColors position="top-right" />

            <Sidebar
                routeCount={routeWarrants.length}
                isCollapsed={isCollapsed}
                hasNotifications={hasNotifications}
                toggleCollapse={handleToggleCollapse}
                isDark={isDark}
                toggleTheme={toggleTheme}
                onToggleNotifications={() => setShowNotifications(!showNotifications)}
            />

            <NotificationOverlay
                warrants={warrants}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
            />

            <div className={`transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-56'} min-h-screen`}>
                <React.Suspense fallback={
                    <div className="flex h-[80vh] items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"></div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Sincronizando Módulos...</span>
                        </div>
                    </div>
                }>
                    <div key={location.pathname} className="page-enter pb-20 md:pb-0 pt-16 md:pt-4 px-4 w-full">
                        <Routes>
                            <Route path="/" element={<HomePage isDark={isDark} toggleTheme={toggleTheme} onToggleNotifications={() => setShowNotifications(!showNotifications)} hasNotifications={hasNotifications} />} />
                            <Route path="/warrant-list" element={<WarrantList />} />
                            <Route path="/advanced-search" element={<AdvancedSearch />} />
                            <Route path="/recents" element={<RecentActivityPage />} />
                            <Route path="/minor-search" element={<MinorSearch />} />
                            <Route path="/priority-list" element={<PriorityList />} />
                            <Route path="/counter-warrants" element={<CounterWarrantList />} />
                            <Route path="/route-planner" element={<RoutePlanner />} />
                            <Route path="/stats" element={<Stats />} />
                            <Route path="/audit" element={<AuditPage />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/ai-assistant" element={<AIAssistantPage />} />
                            <Route path="/map" element={<OperationalMap />} />
                            <Route path="/warrant-detail/:id" element={<WarrantDetail />} />
                            <Route path="/new-warrant" element={<NewWarrant />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </React.Suspense>
            </div>
        </div>
    );
}

export default App;
