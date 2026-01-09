
import React, { useEffect, useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

// Pages
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import HomePage from './pages/HomePage';
import WarrantList from './pages/WarrantList';
import AdvancedSearch from './pages/AdvancedSearch';
import RecentActivityPage from './pages/RecentActivityPage';
import Stats from './pages/Stats';
import MinorSearch from './pages/MinorSearch';
import PriorityList from './pages/PriorityList';
import WarrantDetail from './pages/WarrantDetail';
import NewWarrant from './pages/NewWarrant';
import AIAssistantPage from './pages/AIAssistantPage';
import RoutePlanner from './pages/RoutePlanner';
import OperationalMap from './pages/OperationalMap';
import IntelCenter from './pages/IntelCenter';

// Components
import BottomNav from './components/BottomNav';

// Services & Utils
import { createWarrant, getWarrants, updateWarrant as updateWarrantDb, deleteWarrant as deleteWarrantDb } from './supabaseService';
import { Warrant } from './types';

import { Toaster, toast } from 'sonner';
import { useLocation as useRouteLocation } from 'react-router-dom';

function ScrollToTop() {
    const { pathname } = useRouteLocation();
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
        const saved = localStorage.getItem('routeWarrants');
        return saved ? JSON.parse(saved) : [];
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

    // Determine if BottomNav should be hidden
    const hideNav = ['/warrant-detail', '/new-warrant', '/ai-assistant'].some(p => location.pathname.startsWith(p));

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
            <ScrollToTop />
            <Toaster richColors position="top-right" />
            <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-200">

                <Routes>
                    <Route path="/" element={<HomePage isDark={isDark} toggleTheme={toggleTheme} warrants={warrants} routeCount={routeWarrants.length} />} />

                    {/* Main Routes */}
                    <Route path="/warrant-list" element={<WarrantList warrants={prisonWarrants} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                    <Route path="/advanced-search" element={<AdvancedSearch warrants={warrants} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                    <Route path="/recents" element={<RecentActivityPage warrants={warrants} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                    <Route path="/minor-search" element={<MinorSearch warrants={searchWarrants} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />
                    <Route path="/priority-list" element={<PriorityList warrants={priorityWarrants} routeWarrants={routeWarrants} onRouteToggle={toggleRouteWarrant} />} />

                    {/* specialized pages */}
                    <Route path="/route-planner" element={<RoutePlanner
                        warrants={selectedRouteWarrants}
                        onRouteToggle={toggleRouteWarrant}
                        onUpdate={handleUpdateWarrant}
                    />} />

                    <Route path="/stats" element={<Stats warrants={warrants} />} />
                    <Route path="/intel" element={<IntelCenter warrants={warrants} />} />
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

                {!hideNav && <BottomNav routeCount={routeWarrants.length} />}
            </div>
        </HashRouter>
    );
}

export default App;