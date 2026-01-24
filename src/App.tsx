
import React, { useEffect, useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

// Pages
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

// Services & Utils
import { createWarrant, getWarrants, updateWarrant as updateWarrantDb, deleteWarrant as deleteWarrantDb } from './supabaseService';
import { Warrant } from './types';

import { Toaster, toast } from 'sonner';

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
    const [loading, setLoading] = useState(true);
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [routeWarrants, setRouteWarrants] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('routeWarrants');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing routeWarrants from localStorage", e);
            return [];
        }
    });

    // Check active session on mount
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        }).catch(err => {
            console.error("Auth Session Error:", err);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load data when session is active
    useEffect(() => {
        if (session) {
            loadWarrants();
        }
    }, [session]);

    // Apply dark mode theme
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Persist routes
    useEffect(() => {
        localStorage.setItem('routeWarrants', JSON.stringify(routeWarrants));
    }, [routeWarrants]);

    const loadWarrants = async () => {
        try {
            const data = await getWarrants();
            setWarrants(data || []);
        } catch (err) {
            console.error("Error loading warrants:", err);
            toast.error("Erro ao carregar dados do banco.");
        }
    };

    const handleAddWarrant = async (w: Warrant) => {
        const result = await createWarrant(w);
        if (result) {
            await loadWarrants();
            return true;
        }
        return false;
    };

    const handleUpdateWarrant = async (id: string, updates: Partial<Warrant>) => {
        const result = await updateWarrantDb(id, updates);
        if (result) {
            await loadWarrants();
            return true;
        }
        toast.error("Falha ao atualizar dados no servidor.");
        return false;
    };

    const handleDeleteWarrant = async (id: string) => {
        const result = await deleteWarrantDb(id);
        if (result) {
            await loadWarrants();
            return true;
        }
        return false;
    };

    const toggleTheme = () => setIsDark(!isDark);

    const toggleRouteWarrant = (id: string) => {
        if (!id) return;
        setRouteWarrants(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Memoized selection for the route planner
    const selectedRouteWarrants = useMemo(() => {
        if (!warrants) return [];
        return warrants.filter(w => w && routeWarrants.includes(w.id));
    }, [warrants, routeWarrants]);

    // Filtered lists for specific pages
    const prisonWarrants = useMemo(() => {
        return warrants.filter(w => {
            const type = (w.type || '').toLowerCase();
            const status = (w.status || '').toUpperCase();
            return !type.includes('busca') && !type.includes('apreensão') && status === 'EM ABERTO';
        });
    }, [warrants]);

    const searchWarrants = useMemo(() => {
        return warrants.filter(w => {
            const type = (w.type || '').toLowerCase();
            const status = (w.status || '').toUpperCase();
            return (type.includes('busca') || type.includes('apreensão')) && status === 'EM ABERTO';
        });
    }, [warrants]);

    const priorityWarrants = useMemo(() => {
        return warrants.filter(w => {
            const tags = w.tags || [];
            return tags.includes('Urgente') || tags.includes('Ofício de Cobrança');
        });
    }, [warrants]);

    if (loading) {
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
        <HashRouter>
            <AppContent
                isDark={isDark}
                toggleTheme={toggleTheme}
                warrants={warrants}
                prisonWarrants={prisonWarrants}
                searchWarrants={searchWarrants}
                priorityWarrants={priorityWarrants}
                selectedRouteWarrants={selectedRouteWarrants}
                routeWarrants={routeWarrants}
                toggleRouteWarrant={toggleRouteWarrant}
                handleUpdateWarrant={handleUpdateWarrant}
                handleDeleteWarrant={handleDeleteWarrant}
                handleAddWarrant={handleAddWarrant}
            />
        </HashRouter>
    );
}

function AppContent({
    isDark, toggleTheme, warrants, prisonWarrants, searchWarrants,
    priorityWarrants, selectedRouteWarrants, routeWarrants,
    toggleRouteWarrant, handleUpdateWarrant, handleDeleteWarrant, handleAddWarrant
}: any) {
    const location = useLocation();
    const hideNav = ['/warrant-detail', '/new-warrant', '/ai-assistant'].some(p => location.pathname.startsWith(p));

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
                        <Route path="/" element={<HomePage isDark={isDark} toggleTheme={toggleTheme} warrants={warrants} onUpdate={handleUpdateWarrant} onDelete={handleDeleteWarrant} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />

                        {/* Main Routes */}
                        <Route path="/warrant-list" element={<WarrantList warrants={prisonWarrants} onUpdate={handleUpdateWarrant} onDelete={handleDeleteWarrant} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                        <Route path="/advanced-search" element={<AdvancedSearch warrants={warrants} onUpdate={handleUpdateWarrant} onDelete={handleDeleteWarrant} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                        <Route path="/recents" element={<RecentActivityPage warrants={warrants} onUpdate={handleUpdateWarrant} onDelete={handleDeleteWarrant} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                        <Route path="/minor-search" element={<MinorSearch warrants={searchWarrants} onUpdate={handleUpdateWarrant} onDelete={handleDeleteWarrant} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                        <Route path="/priority-list" element={<PriorityList warrants={priorityWarrants} onUpdate={handleUpdateWarrant} onDelete={handleDeleteWarrant} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />

                        {/* specialized pages */}
                        <Route path="/route-planner" element={<RoutePlanner
                            warrants={selectedRouteWarrants}
                            onRouteToggle={toggleRouteWarrant}
                            onUpdate={handleUpdateWarrant}
                        />} />

                        <Route path="/stats" element={<Stats warrants={warrants} />} />
                        <Route path="/audit" element={<AuditPage />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/ai-assistant" element={<AIAssistantPage onAdd={handleAddWarrant} warrants={warrants} />} />
                        <Route path="/map" element={<OperationalMap warrants={warrants} onUpdate={handleUpdateWarrant} />} />

                        {/* Detail and Creation */}
                        <Route path="/warrant-detail/:id" element={<WarrantDetail
                            warrants={warrants}
                            onUpdate={handleUpdateWarrant}
                            onDelete={handleDeleteWarrant}
                            onRouteToggle={toggleRouteWarrant}
                            routeWarrants={routeWarrants}
                        />} />
                        <Route path="/new-warrant" element={<NewWarrant
                            onAdd={handleAddWarrant}
                            onUpdate={handleUpdateWarrant}
                            warrants={warrants}
                        />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </React.Suspense>

            {!hideNav && <BottomNav routeCount={routeWarrants.length} />}
        </div>
    );
}

export default App;