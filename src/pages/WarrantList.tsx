
import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';

import { generateWarrantPDF } from '../services/pdfReportService';
import { useWarrants } from '../contexts/WarrantContext';

const WarrantList = () => {
    const { warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant, availableCrimes, availableRegimes } = useWarrants();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const initialStatus = searchParams.get('status') || '';
    const initialType = searchParams.get('type') || '';
    const initialPriority = searchParams.get('priority') || '';
    const initialExpired = searchParams.get('expired') === 'true';
    const initialExpiring = searchParams.get('expiring') === 'true';
    const initialLocation = searchParams.get('city') || '';
    const initialIncludedMonth = searchParams.get('includedMonth') || '';
    const initialFulfilledMonth = searchParams.get('fulfilledMonth') || '';
    const initialReportsMonth = searchParams.get('reportsMonth') || '';
    const initialFulfilledSource = searchParams.get('fulfilledSource') || '';
    const initialFulfillmentResult = searchParams.get('fulfillmentResult') || '';

    const [searchTerm, setSearchTerm] = useState(query || initialType || initialLocation);

    // Sync search term with URL query if changed from outside
    React.useEffect(() => {
        if (query !== undefined && query !== searchTerm && query !== '') {
            setSearchTerm(query);
        }
    }, [query]);

    const [showFilters, setShowFilters] = useState(initialStatus !== '' || initialType !== '' || initialPriority !== '' || initialExpired);

    // Helper to check if a date string falls within a given YYYY-MM month key
    const isDateInMonth = (dateStr: string | undefined | null, monthKey: string): boolean => {
        if (!dateStr) return false;
        let d: Date | null = null;
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (dateStr.includes('-')) {
            const clean = dateStr.split('T')[0].split(' ')[0];
            const parts = clean.split('-');
            if (parts.length === 3) d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === monthKey;
    };

    const getMonthFromUrl = (url: string): string | null => {
        const match = url.match(/\/(\d{13})_/);
        if (match) {
            const d = new Date(parseInt(match[1]));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        return null;
    };

    // Filter states
    const [filterCrime, setFilterCrime] = useState('');
    const [filterRegime, setFilterRegime] = useState('');
    const [filterDpRegion, setFilterDpRegion] = useState('');
    const [filterStatus, setFilterStatus] = useState(initialStatus);
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [observationKeyword, setObservationKeyword] = useState('');
    const [filterPriority, setFilterPriority] = useState(initialPriority);
    const [filterExpired, setFilterExpired] = useState(initialExpired);
    const [filterExpiring, setFilterExpiring] = useState(initialExpiring);

    const statuses = useMemo(() => Array.from(new Set(warrants.map(w => w.status))).sort(), [warrants]);

    const filteredWarrants = warrants.filter(w => {
        // Text Search
        const term = searchTerm.toLowerCase();
        const matchesText = (
            (w.name || '').toLowerCase().includes(term) ||
            (w.number || '').toLowerCase().includes(term) ||
            (w.location && w.location.toLowerCase().includes(term)) ||
            (w.rg && w.rg.toLowerCase().includes(term)) ||
            (w.type || '').toLowerCase().includes(term) ||
            (w.crime && w.crime.toLowerCase().includes(term)) ||
            (w.description && w.description.toLowerCase().includes(term)) ||
            (w.dpRegion && w.dpRegion.toLowerCase().replace('º', '').replace(' ', '').includes(term.replace('º', '').replace(' ', '')))
        );

        // Advanced Filters
        const matchesCrime = filterCrime ? w.crime === filterCrime : true;
        const matchesRegime = filterRegime ? w.regime === filterRegime : true;

        const matchesDpRegion = filterDpRegion
            ? (filterDpRegion === 'Não Mapeado' ? (!w.dpRegion || w.dpRegion.trim() === '') : w.dpRegion === filterDpRegion)
            : true;

        const matchesStatus = filterStatus ? w.status === filterStatus : true;
        const matchesDate = (!dateStart || (w.date && w.date >= dateStart)) && (!dateEnd || (w.date && w.date <= dateEnd));
        const matchesObservation = observationKeyword ? (w.observation || '').toLowerCase().includes(observationKeyword.toLowerCase()) : true;
        const matchesPriority = filterPriority === 'urgent' ? (w.priority === 'urgent' || (w.tags || []).includes('Urgente')) : true;

        // Expiration logic
        let matchesExpired = true;
        if (filterExpired) {
            if (!w.expirationDate || w.status !== 'EM ABERTO') {
                matchesExpired = false;
            } else {
                const today = new Date();
                let expDate: Date | null = null;
                if (w.expirationDate.includes('/')) {
                    const [day, month, year] = w.expirationDate.split('/');
                    expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                    expDate = new Date(w.expirationDate);
                }
                if (expDate) expDate.setHours(0, 0, 0, 0);
                if (today) today.setHours(0, 0, 0, 0);
                matchesExpired = !!(expDate && expDate <= today);
            }
        }

        // Expiring soon (within 30 days)
        let matchesExpiring = true;
        if (filterExpiring) {
            if (!w.expirationDate || w.status !== 'EM ABERTO') {
                matchesExpiring = false;
            } else {
                const today = new Date();
                let expDate: Date | null = null;
                if (w.expirationDate.includes('/')) {
                    const [day, month, year] = w.expirationDate.split('/');
                    expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                    expDate = new Date(w.expirationDate);
                }
                if (expDate) expDate.setHours(0, 0, 0, 0);
                if (today) today.setHours(0, 0, 0, 0);
                const diff = expDate ? (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) : 999;
                matchesExpiring = !!(expDate && diff > 0 && diff <= 30);
            }
        }

        // Monthly analytics filters (from URL params, no UI controls needed)
        let matchesIncludedMonth = true;
        if (initialIncludedMonth) {
            matchesIncludedMonth = isDateInMonth(w.createdAt, initialIncludedMonth) || isDateInMonth(w.entryDate, initialIncludedMonth);
        }
        let matchesFulfilledMonth = true;
        if (initialFulfilledMonth) {
            const isPositive = w.fulfillmentResult === 'PRESO' || w.fulfillmentResult === 'APREENDIDO';
            matchesFulfilledMonth = isPositive && (isDateInMonth(w.dischargeDate, initialFulfilledMonth) || isDateInMonth(w.updatedAt, initialFulfilledMonth));
        }
        let matchesReportsMonth = true;
        if (initialReportsMonth) {
            matchesReportsMonth = (w.reports || []).some(url => getMonthFromUrl(url) === initialReportsMonth);
        }
        let matchesFulfilledSource = true;
        if (initialFulfilledSource) {
            matchesFulfilledSource = w.fulfillmentSource === initialFulfilledSource;
        }
        let matchesFulfillmentResult = true;
        if (initialFulfillmentResult) {
            matchesFulfillmentResult = w.fulfillmentResult === initialFulfillmentResult;
        }

        return matchesText && matchesCrime && matchesRegime && matchesDpRegion && matchesStatus && matchesDate && matchesObservation && matchesPriority && matchesExpired && matchesExpiring && matchesIncludedMonth && matchesFulfilledMonth && matchesReportsMonth && matchesFulfilledSource && matchesFulfillmentResult;
    }).sort((a, b) => {
        if (filterExpiring) {
            const parseDate = (w: typeof a) => {
                if (!w.expirationDate) return '9999-99-99';
                if (w.expirationDate.includes('/')) {
                    const [d, m, y] = w.expirationDate.split('/');
                    return `${y}-${m}-${d}`;
                }
                return w.expirationDate;
            };
            return parseDate(a).localeCompare(parseDate(b));
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    const clearFilters = () => {
        setFilterCrime('');
        setFilterRegime('');
        setFilterDpRegion('');
        setFilterStatus('');
        setDateStart('');
        setDateEnd('');
        setObservationKeyword('');
        setSearchTerm('');
        setFilterPriority('');
        setFilterExpired(false);
        setFilterExpiring(false);
    };

    const hasActiveFilters = filterCrime || filterRegime || filterDpRegion || filterStatus || dateStart || dateEnd || observationKeyword;

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Mandados" back />
            <div className="p-4">
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Nome, crime, RG, endereço, nº..."
                            className="w-full rounded-xl border-none bg-surface-light py-3 pl-10 pr-4 text-sm shadow-md dark:bg-surface-dark dark:text-white placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl transition-colors shadow-md ${showFilters || hasActiveFilters
                            ? 'bg-primary text-white'
                            : 'bg-surface-light dark:bg-surface-dark text-text-secondary-light dark:text-text-secondary-dark'
                            }`}
                    >
                        <Filter size={20} />
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mb-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-md border border-border-light dark:border-border-dark animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-text-light dark:text-text-dark text-sm">Filtros Avançados</h3>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="text-xs text-primary font-bold hover:underline">
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Crime</label>
                                <select
                                    value={filterCrime}
                                    onChange={(e) => setFilterCrime(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Todos</option>
                                    {availableCrimes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Regime</label>
                                <select
                                    value={filterRegime}
                                    onChange={(e) => setFilterRegime(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Todos</option>
                                    {availableRegimes.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Região DP</label>
                                <select
                                    value={filterDpRegion}
                                    onChange={(e) => setFilterDpRegion(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Todas</option>
                                    <option value="1º DP">1º DP</option>
                                    <option value="2º DP">2º DP</option>
                                    <option value="3º DP">3º DP</option>
                                    <option value="4º DP">4º DP</option>
                                    <option value="Outras Cidades">Outras Cidades</option>
                                    <option value="Não Mapeado">Não Mapeado / Sem DP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Todos</option>
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Observações (Palavra-chave)</label>
                                <div className="relative">
                                    <Eye className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={observationKeyword}
                                        onChange={(e) => setObservationKeyword(e.target.value)}
                                        placeholder="Busca em obs..."
                                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 pl-8 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Data de Emissão</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input
                                        type="date"
                                        value={dateStart}
                                        onChange={(e) => setDateStart(e.target.value)}
                                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <span className="self-center text-gray-400">-</span>
                                <div className="flex-1">
                                    <input
                                        type="date"
                                        value={dateEnd}
                                        onChange={(e) => setDateEnd(e.target.value)}
                                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {filteredWarrants.length > 0 ? filteredWarrants.map(w => (
                        <WarrantCard
                            key={w.id}
                            data={w}
                            onDelete={deleteWarrant}
                            isPlanned={routeWarrants.includes(w.id)}
                            onRouteToggle={toggleRouteWarrant}
                            onPrint={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                generateWarrantPDF(w, updateWarrant);
                            }}
                        />
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Search size={40} className="mb-2" />
                            <p className="text-sm">Nenhum resultado encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarrantList;
