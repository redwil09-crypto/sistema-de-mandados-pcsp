
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

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

// Components
import BottomNav from './components/BottomNav';
import { useLocation } from 'react-router-dom';

import { Toaster } from 'sonner';

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

function App() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === null ? true : saved === 'dark';
    });

    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

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
            <div className="flex min-h-screen items-center justify-center bg-background-dark">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!session) {
        return <Auth />;
    }

    return (
        <WarrantProvider>
            <HashRouter>
                <AppContent isDark={isDark} toggleTheme={toggleTheme} />
            </HashRouter>
        </WarrantProvider>
    );
}

function AppContent({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
    const location = useLocation();
    const hideNav = ['/warrant-detail', '/new-warrant', '/ai-assistant'].some(p => location.pathname.startsWith(p));
    const { routeWarrants, loading } = useWarrants();

    if (loading) {
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
            <React.Suspense fallback={
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"></div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Sincronizando Módulos...</span>
                    </div>
                </div>
            }>
                <div key={location.pathname} className="page-enter">
                    <Routes>
                        {/* Passes theme props to Home since these are layout related, not warrant related */}
                        <Route path="/" element={<HomePage isDark={isDark} toggleTheme={toggleTheme} />} />

                        <Route path="/warrant-list" element={<WarrantList />} />
                        <Route path="/advanced-search" element={<AdvancedSearch />} />
                        <Route path="/recents" element={<RecentActivityPage />} />
                        <Route path="/minor-search" element={<MinorSearch />} />
                        <Route path="/priority-list" element={<PriorityList />} />

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

            {!hideNav && <BottomNav routeCount={routeWarrants.length} />}
        </div>
    );
}

export default App;
