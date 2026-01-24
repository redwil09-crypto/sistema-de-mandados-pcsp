
import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Warrant } from '../types';
import {
    createWarrant,
    getWarrants,
    updateWarrant as updateWarrantDb,
    deleteWarrant as deleteWarrantDb
} from '../supabaseService';
import { toast } from 'sonner';

interface WarrantContextType {
    warrants: Warrant[];
    loading: boolean;
    refreshWarrants: () => Promise<void>;
    addWarrant: (w: Partial<Warrant>) => Promise<boolean>;
    updateWarrant: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    deleteWarrant: (id: string) => Promise<boolean>;

    // Route Planning
    routeWarrants: string[];
    toggleRouteWarrant: (id: string) => void;
    selectedRouteWarrants: Warrant[];

    // Computed Lists
    prisonWarrants: Warrant[];
    searchWarrants: Warrant[];
    priorityWarrants: Warrant[];
}

const WarrantContext = createContext<WarrantContextType | undefined>(undefined);

export const WarrantProvider = ({ children }: { children: ReactNode }) => {
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [loading, setLoading] = useState(true);
    const [routeWarrants, setRouteWarrants] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('routeWarrants');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing routeWarrants from localStorage", e);
            return [];
        }
    });

    // Initial Load
    useEffect(() => {
        // Only load if we have a session (handled by App or protected routes, but good to check)
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await refreshWarrants();
            } else {
                setLoading(false);
            }
        };
        load();

        // Listen for auth changes to reload/clear
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                refreshWarrants();
            } else {
                setWarrants([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Persist Route Warrants
    useEffect(() => {
        localStorage.setItem('routeWarrants', JSON.stringify(routeWarrants));
    }, [routeWarrants]);

    const refreshWarrants = async () => {
        setLoading(true);
        try {
            const data = await getWarrants();
            setWarrants(data || []);
        } catch (err) {
            console.error("Error loading warrants:", err);
            toast.error("Erro ao carregar dados do banco.");
        } finally {
            setLoading(false);
        }
    };

    const addWarrant = async (w: Partial<Warrant>) => {
        const result = await createWarrant(w);
        if (result) {
            // Optimistic update or reload? Reload is safer for consistency, optimistic is faster.
            // Let's reload for now to adhere to original logic, but we can optimize later.
            await refreshWarrants();
            return true;
        }
        return false;
    };

    const updateWarrant = async (id: string, updates: Partial<Warrant>) => {
        const result = await updateWarrantDb(id, updates);
        if (result) {
            // Optimistic update
            setWarrants(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
            // Background refresh to ensure consistency/triggers
            getWarrants().then(data => setWarrants(data || []));
            return true;
        }
        toast.error("Falha ao atualizar dados no servidor.");
        return false;
    };

    const deleteWarrant = async (id: string) => {
        const result = await deleteWarrantDb(id);
        if (result) {
            setWarrants(prev => prev.filter(w => w.id !== id));
            // Also remove from route if present
            setRouteWarrants(prev => prev.filter(rid => rid !== id));
            return true;
        }
        return false;
    };

    const toggleRouteWarrant = (id: string) => {
        if (!id) return;
        setRouteWarrants(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Computed Values
    const selectedRouteWarrants = useMemo(() => {
        return warrants.filter(w => routeWarrants.includes(w.id));
    }, [warrants, routeWarrants]);

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

    return (
        <WarrantContext.Provider value={{
            warrants,
            loading,
            refreshWarrants,
            addWarrant,
            updateWarrant,
            deleteWarrant,
            routeWarrants,
            toggleRouteWarrant,
            selectedRouteWarrants,
            prisonWarrants,
            searchWarrants,
            priorityWarrants
        }}>
            {children}
        </WarrantContext.Provider>
    );
};

export const useWarrants = () => {
    const context = useContext(WarrantContext);
    if (context === undefined) {
        throw new Error('useWarrants must be used within a WarrantProvider');
    }
    return context;
};
