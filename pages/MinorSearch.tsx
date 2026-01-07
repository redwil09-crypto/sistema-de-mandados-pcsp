
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import { Warrant } from '../types';
import { CRIME_OPTIONS, REGIME_OPTIONS } from '../data/constants';

interface MinorSearchProps {
    warrants: Warrant[];
    routeWarrants?: string[];
    onRouteToggle?: (id: string) => void;
}

const MinorSearch = ({ warrants, routeWarrants = [], onRouteToggle }: MinorSearchProps) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [filterCrime, setFilterCrime] = useState('');
    const [filterRegime, setFilterRegime] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [observationKeyword, setObservationKeyword] = useState('');

    const statuses = useMemo(() => Array.from(new Set(warrants.map(w => w.status))).sort(), [warrants]);

    const filteredWarrants = warrants.filter(w => {
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
        const matchesDate = (!dateStart || (w.date && w.date >= dateStart)) && (!dateEnd || (w.date && w.date <= dateEnd));
        const matchesObservation = observationKeyword ? (w.observation || '').toLowerCase().includes(observationKeyword.toLowerCase()) : true;

        return matchesText && matchesCrime && matchesRegime && matchesStatus && matchesDate && matchesObservation;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const clearFilters = () => {
        setFilterCrime('');
        setFilterRegime('');
        setFilterStatus('');
        setDateStart('');
        setDateEnd('');
        setObservationKeyword('');
        setSearchTerm('');
    };

    const hasActiveFilters = filterCrime || filterRegime || filterStatus || dateStart || dateEnd || observationKeyword;

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Busca de Menores" back onBack={() => navigate('/')} />
            <div className="p-4">
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Pesquisar menores..."
                            className="w-full rounded-xl border-none bg-surface-light py-3 pl-10 pr-4 text-sm shadow-sm dark:bg-surface-dark dark:text-white placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl transition-colors shadow-sm ${showFilters || hasActiveFilters
                            ? 'bg-primary text-white'
                            : 'bg-surface-light dark:bg-surface-dark text-text-secondary-light dark:text-text-secondary-dark'
                            }`}
                    >
                        <Filter size={20} />
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mb-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark animate-in slide-in-from-top-2">
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
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Natureza / Crime</label>
                                <select
                                    value={filterCrime}
                                    onChange={(e) => setFilterCrime(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Todos</option>
                                    {CRIME_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Regime / Situação</label>
                                <select
                                    value={filterRegime}
                                    onChange={(e) => setFilterRegime(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Todos</option>
                                    {REGIME_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Palavra-chave</label>
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
                            isPlanned={routeWarrants.includes(w.id)}
                            onRouteToggle={onRouteToggle}
                        />
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Search size={40} className="mb-2" />
                            <p className="text-sm">Nenhum menor encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MinorSearch;
