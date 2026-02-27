
import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import { generateWarrantPDF } from '../services/pdfReportService';
import { maskDate } from '../utils/helpers';
import { useWarrants } from '../contexts/WarrantContext';

const AdvancedSearch = () => {
    const { warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant, availableCrimes, availableRegimes } = useWarrants();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [searchTerm, setSearchTerm] = useState(query);
    const [scope, setScope] = useState<'all' | 'arrest' | 'seizure' | 'counter'>('all');

    // Filter states
    const [filterCrime, setFilterCrime] = useState('');
    const [filterRegime, setFilterRegime] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [observationKeyword, setObservationKeyword] = useState('');
    const [filterDp, setFilterDp] = useState('');

    const statuses = useMemo(() => Array.from(new Set(warrants.map(w => w.status))).sort(), [warrants]);

    const filteredWarrants = warrants.filter(w => {
        // Scope Filter
        if (scope === 'arrest' && (w.type.toLowerCase().includes('busca') || w.type.toLowerCase().includes('contramandado'))) return false;
        if (scope === 'seizure' && !w.type.toLowerCase().includes('busca')) return false;
        if (scope === 'counter' && !w.type.toLowerCase().includes('contramandado') && w.regime?.toLowerCase() !== 'contramandado') return false;

        // Text Search
        const term = searchTerm.toLowerCase();
        const matchesText = (
            w.name.toLowerCase().includes(term) ||
            w.number.toLowerCase().includes(term) ||
            (w.location && w.location.toLowerCase().includes(term)) ||
            (w.rg && w.rg.toLowerCase().includes(term)) ||
            w.type.toLowerCase().includes(term) ||
            (w.description && w.description.toLowerCase().includes(term))
        );

        // Advanced Filters
        const matchesCrime = filterCrime ? w.crime === filterCrime : true;
        const matchesRegime = filterRegime ? w.regime === filterRegime : true;
        const matchesStatus = filterStatus ? w.status === filterStatus : true;

        // Date comparison logic
        const matchesDate = true;
        let matchesDateLocal = true;
        if (dateStart || dateEnd) {
            const wDateStr = w.date || '';
            const wDate = wDateStr.includes('-') ? wDateStr.split('T')[0] : (wDateStr.includes('/') ? wDateStr.split('/').reverse().join('-') : '');

            if (dateStart && dateStart.length === 10) {
                const startISO = dateStart.split('/').reverse().join('-');
                if (!wDate || wDate < startISO) matchesDateLocal = false;
            }
            if (dateEnd && dateEnd.length === 10) {
                const endISO = dateEnd.split('/').reverse().join('-');
                if (!wDate || wDate > endISO) matchesDateLocal = false;
            }
        }

        const matchesObservation = observationKeyword ? (w.observation || '').toLowerCase().includes(observationKeyword.toLowerCase()) : true;
        const matchesDp = filterDp ? w.dpRegion === filterDp : true;

        return matchesText && matchesCrime && matchesRegime && matchesStatus && matchesDateLocal && matchesObservation && matchesDp;
    });

    const clearFilters = () => {
        setFilterCrime('');
        setFilterRegime('');
        setFilterStatus('');
        setDateStart('');
        setDateEnd('');
        setObservationKeyword('');
        setSearchTerm('');
        setFilterDp('');
        setScope('all');
    };

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Busca Avançada" back />
            <div className="p-4">

                {/* Search Input */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Pesquisar em tudo..."
                        className="w-full rounded-xl border-none bg-surface-light py-3.5 pl-10 pr-4 text-sm shadow-md dark:bg-surface-dark dark:text-white placeholder:text-text-secondary-light focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>

                {/* Filters Panel - Always Visible in Advanced Search */}
                <div className="mb-6 bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-md border border-border-light dark:border-border-dark">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <Filter size={16} className="text-primary" /> Filtros
                        </h3>
                        <button onClick={clearFilters} className="text-xs text-primary font-bold hover:underline">
                            Limpar Tudo
                        </button>
                    </div>

                    {/* Scope Tabs */}
                    <div className="flex bg-background-light dark:bg-background-dark p-1 rounded-lg mb-4">
                        <button
                            onClick={() => setScope('all')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scope === 'all' ? 'bg-white dark:bg-surface-light text-primary shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setScope('arrest')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scope === 'arrest' ? 'bg-white dark:bg-surface-light text-primary shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                        >
                            Prisão
                        </button>
                        <button
                            onClick={() => setScope('seizure')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scope === 'seizure' ? 'bg-white dark:bg-surface-light text-primary shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                        >
                            Busca
                        </button>
                        <button
                            onClick={() => setScope('counter')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scope === 'counter' ? 'bg-emerald-500 text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                        >
                            Contramandado
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Natureza / Crime</label>
                            <select
                                value={filterCrime}
                                onChange={(e) => setFilterCrime(e.target.value)}
                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Qualquer</option>
                                {availableCrimes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Regime / Situação</label>
                            <select
                                value={filterRegime}
                                onChange={(e) => setFilterRegime(e.target.value)}
                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Qualquer</option>
                                {availableRegimes.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Status Atual</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Qualquer</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Região (DP)</label>
                            <select
                                value={filterDp}
                                onChange={(e) => setFilterDp(e.target.value)}
                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Qualquer DP</option>
                                <option value="1º DP">1º DP</option>
                                <option value="2º DP">2º DP</option>
                                <option value="3º DP">3º DP</option>
                                <option value="4º DP">4º DP</option>
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
                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Data de Emissão (Início - Fim)</label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={dateStart}
                                onChange={(e) => setDateStart(maskDate(e.target.value))}
                                placeholder="DD/MM/YYYY"
                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <span className="self-center text-gray-400">-</span>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(maskDate(e.target.value))}
                                placeholder="DD/MM/YYYY"
                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark">Resultados</span>
                    <span className="text-xs text-gray-400">{filteredWarrants.length} encontrados</span>
                </div>

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

export default AdvancedSearch;
