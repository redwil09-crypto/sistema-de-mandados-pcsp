
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

const UserApprovalPage = React.lazy(() => import('./pages/UserApprovalPage'));

import Sidebar from './components/Sidebar';
import NotificationOverlay from './components/NotificationOverlay';
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
        <div className="min-h-screen bg-[#f0f9f4] flex flex-col items-center justify-center px-4 space-y-8">
            <div className="w-full max-w-sm bg-[#ff4b4b] text-white p-6 rounded-2xl shadow-xl flex items-start gap-4 animate-in slide-in-from-top-6 duration-500">
                <div className="mt-1">
                    <AlertCircle size={28} />
                </div>
                <div>
                    <h3 className="font-extrabold text-lg uppercase tracking-wider leading-none">Acesso recusado</h3>
                    <p className="text-sm opacity-90 leading-relaxed mt-2 font-medium">
                        Seu acesso ainda não foi aprovado por um administrador. Por favor, aguarde a liberação.
                    </p>
                </div>
            </div>

            <div className="text-center space-y-6">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-1 w-12 bg-[#2eb872] rounded-full animate-pulse"></div>
                    <p className="text-[#2eb872] font-black uppercase tracking-[0.2em] text-[10px]">
                        Status: Aguardando Validação
                    </p>
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-8 py-3 bg-[#1a1c1e] text-white rounded-xl text-xs font-bold hover:bg-black transition-all active:scale-95 shadow-lg"
                >
                    <LogOut size={16} /> Sair da Conta
                </button>
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
    const [profile, setProfile] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const syncProfile = async (currentSession: Session) => {
            try {
                let { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id)
                    .maybeSingle();

                if (!profileData) {
                    const metadata = currentSession.user.user_metadata || {};
                    const { data: newProfile } = await supabase.from('profiles').insert({
                        id: currentSession.user.id,
                        email: currentSession.user.email || metadata.email,
                        full_name: metadata.full_name,
                        rg: metadata.rg,
                        cargo: metadata.cargo,
                        phone: metadata.phone,
                        workplace: metadata.workplace,
                        role: metadata.role || 'agente',
                        authorized: false
                    }).select().maybeSingle();

                    if (newProfile) {
                        profileData = newProfile;
                    }
                }

                if (mounted) {
                    setProfile(profileData);
                }
            } catch (err) {
                console.error("Profile sync error:", err);
            }
        };

        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            if (mounted) {
                setSession(initialSession);
                if (initialSession) {
                    syncProfile(initialSession).finally(() => {
                        if (mounted) setAuthLoading(false);
                    });
                } else {
                    setAuthLoading(false);
                }
            }
        }).catch(err => {
            console.error("Auth Session Error:", err);
            if (mounted) setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (mounted) {
                setSession(newSession);
                if (newSession) {
                    syncProfile(newSession);
                } else {
                    setProfile(null);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
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
            </>
        );
    }

    // Authorization Check - William Castro is Master Admin by Email
    const isMasterAdmin = session.user.email === 'william.castro@policiacivil.sp.gov.br';

    // Check both profile and user_metadata to be safe, but profile takes precedence if it exists
    const isAuthorized = isMasterAdmin ||
        (profile ? profile.authorized === true : session.user.user_metadata?.authorized === true);

    if (!isAuthorized) {
        return (
            <>
                <PendingApproval />
            </>
        );
    }

    return (
        <WarrantProvider>
            <HashRouter>
                <AppContent session={session} isDark={isDark} toggleTheme={toggleTheme} />
            </HashRouter>
        </WarrantProvider>
    );
}

function AppContent({ session, isDark, toggleTheme }: { session: Session; isDark: boolean; toggleTheme: () => void }) {
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

                            {/* Rota Administrativa Secreta */}
                            <Route path="/admin/users" element={
                                (session.user.user_metadata?.role === 'admin' || session.user.email === 'william.castro@policiacivil.sp.gov.br')
                                    ? <UserApprovalPage />
                                    : <Navigate to="/" replace />
                            } />

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </React.Suspense>
            </div>
        </div>
    );
}

export default App;
