
import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Eye, FileCheck, CheckCircle2 } from 'lucide-react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';

import { generateWarrantPDF } from '../services/pdfReportService';
import { useWarrants } from '../contexts/WarrantContext';

const CounterWarrantList = () => {
    const { warrants: allWarrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant, availableCrimes } = useWarrants();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [searchTerm, setSearchTerm] = useState(query);
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [filterCrime, setFilterCrime] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [observationKeyword, setObservationKeyword] = useState('');

    // Filter ONLY Counter Warrants
    const counterWarrants = useMemo(() => {
        return allWarrants.filter(w =>
            w.type?.toUpperCase().includes('CONTRAMANDADO') ||
            w.regime === 'Contramandado' ||
            (w.status === 'CUMPRIDO' && w.fulfillmentResult === 'CONTRAMANDADO')
        );
    }, [allWarrants]);

    const filteredWarrants = counterWarrants.filter(w => {
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
        const matchesDate = (!dateStart || (w.date && w.date >= dateStart)) && (!dateEnd || (w.date && w.date <= dateEnd));
        const matchesObservation = observationKeyword ? (w.observation || '').toLowerCase().includes(observationKeyword.toLowerCase()) : true;

        return matchesText && matchesCrime && matchesDate && matchesObservation;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const clearFilters = () => {
        setFilterCrime('');
        setDateStart('');
        setDateEnd('');
        setObservationKeyword('');
        setSearchTerm('');
    };

    const hasActiveFilters = filterCrime || dateStart || dateEnd || observationKeyword;

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Contramandados" back />

            {/* Context Banner */}
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-4 mb-4">
                <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30">
                        <FileCheck className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Arquivo de Contramandados</h2>
                        <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 font-medium">
                            Mandados revogados, alvarás de soltura e contramandados de prisão.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar contramandado..."
                            className="w-full rounded-xl border-none bg-surface-light py-3 pl-10 pr-4 text-sm shadow-md dark:bg-surface-dark dark:text-white placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl transition-colors shadow-md ${showFilters || hasActiveFilters
                            ? 'bg-emerald-600 text-white'
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
                                <button onClick={clearFilters} className="text-xs text-emerald-500 font-bold hover:underline">
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Crime Original</label>
                                <select
                                    value={filterCrime}
                                    onChange={(e) => setFilterCrime(e.target.value)}
                                    className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">Todos</option>
                                    {availableCrimes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Observações (Palavra-chave)</label>
                                <div className="relative">
                                    <Eye className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={observationKeyword}
                                        onChange={(e) => setObservationKeyword(e.target.value)}
                                        placeholder="Busca em obs..."
                                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 pl-8 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-emerald-500 outline-none"
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
                                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <span className="self-center text-gray-400">-</span>
                                <div className="flex-1">
                                    <input
                                        type="date"
                                        value={dateEnd}
                                        onChange={(e) => setDateEnd(e.target.value)}
                                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-emerald-500 outline-none"
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
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                            <div className="bg-emerald-500/10 p-4 rounded-full">
                                <CheckCircle2 size={48} className="text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-text-light dark:text-white">Nenhum contramandado encontrado</p>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Use a IA para importar ou altere o status de um mandado existente.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CounterWarrantList;
