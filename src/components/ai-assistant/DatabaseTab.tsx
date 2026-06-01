
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, User, Printer, ListTodo, Database, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useWarrants } from '../../contexts/WarrantContext';
import { Warrant } from '../../types';
import { maskDate } from '../../utils/helpers';

interface DatabaseTabProps {
    onSelectionChange?: (count: number) => void;
    onPrintSelected?: (selectedIds: string[]) => void;
    onPrintList?: () => void;
    onPrintDatabaseSplit?: () => void;
}

const DatabaseTab: React.FC<DatabaseTabProps> = ({
    onSelectionChange,
    onPrintSelected,
    onPrintList,
    onPrintDatabaseSplit
}) => {
    const { warrants, availableCrimes } = useWarrants();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterCrime, setFilterCrime] = useState('');
    const [filterRegime, setFilterRegime] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDpRegion, setFilterDpRegion] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [observationKeyword, setObservationKeyword] = useState('');
    const [selectedWarrants, setSelectedWarrants] = useState<string[]>([]);

    const filteredWarrants = useMemo(() => {
        return warrants.filter((w: Warrant) => {
            const term = searchTerm.toLowerCase();
            const matchesText = (
                w.name.toLowerCase().includes(term) ||
                w.number.toLowerCase().includes(term) ||
                (w.location && w.location.toLowerCase().includes(term)) ||
                (w.rg && w.rg.toLowerCase().includes(term)) ||
                (w.cpf && w.cpf.toLowerCase().includes(term)) ||
                w.type.toLowerCase().includes(term) ||
                (w.description && w.description.toLowerCase().includes(term))
            );

            const matchesCrime = filterCrime ? w.crime === filterCrime : true;
            const matchesRegime = filterRegime ? w.regime === filterRegime : true;
            const matchesStatus = filterStatus ? w.status === filterStatus : true;
            const matchesDpRegion = filterDpRegion ? w.dpRegion === filterDpRegion : true;

            let matchesDate = true;
            if (dateStart || dateEnd) {
                const wDateStr = w.date || '';
                const wDate = wDateStr.includes('-') ? wDateStr.split('T')[0] : (wDateStr.includes('/') ? wDateStr.split('/').reverse().join('-') : '');

                if (dateStart && dateStart.length === 10) {
                    const startISO = dateStart.split('/').reverse().join('-');
                    if (!wDate || wDate < startISO) matchesDate = false;
                }
                if (dateEnd && dateEnd.length === 10) {
                    const endISO = dateEnd.split('/').reverse().join('-');
                    if (!wDate || wDate > endISO) matchesDate = false;
                }
            }

            const matchesObservation = observationKeyword ? (w.observation || '').toLowerCase().includes(observationKeyword.toLowerCase()) : true;

            return matchesText && matchesCrime && matchesRegime && matchesStatus && matchesDpRegion && matchesDate && matchesObservation;
        });
    }, [warrants, searchTerm, filterCrime, filterRegime, filterStatus, filterDpRegion, dateStart, dateEnd, observationKeyword]);

    const hasActiveFilters = filterCrime || filterRegime || filterStatus || filterDpRegion || dateStart || dateEnd || observationKeyword || searchTerm;

    // Notifica mudanças na seleção
    React.useEffect(() => {
        onSelectionChange?.(selectedWarrants.length);
    }, [selectedWarrants, onSelectionChange]);

    const toggleWarrantSelection = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedWarrants(prev =>
            prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
        );
    }, []);

    const clearFilters = useCallback(() => {
        setFilterCrime('');
        setFilterRegime('');
        setFilterStatus('');
        setFilterDpRegion('');
        setDateStart('');
        setDateEnd('');
        setObservationKeyword('');
        setSearchTerm('');
    }, []);

    const handlePrintSelected = useCallback(async () => {
        if (selectedWarrants.length === 0) {
            toast.error("Nenhum mandado selecionado.");
            return;
        }
        onPrintSelected?.(selectedWarrants);
    }, [selectedWarrants, onPrintSelected]);

    return (
        <div className="space-y-4 animate-in fade-in pb-4">
            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary dark:text-blue-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, CPF, RG, processo..."
                        className="w-full rounded-xl border-2 border-border-light dark:border-white/10 bg-white dark:bg-zinc-900/50 py-3 pl-10 pr-4 text-sm shadow-sm dark:text-white placeholder:text-text-secondary-light dark:placeholder:text-zinc-500 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
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

            {showFilters && (
                <div className="bg-surface-light dark:bg-[#151517] p-5 rounded-2xl shadow-xl border border-border-light dark:border-white/10 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-text-light dark:text-white text-xs uppercase tracking-widest">Filtros Avançados</h3>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    if (selectedWarrants.length === filteredWarrants.length) {
                                        setSelectedWarrants([]);
                                    } else {
                                        setSelectedWarrants(filteredWarrants.map((w: Warrant) => w.id));
                                    }
                                }}
                                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline uppercase tracking-tighter"
                            >
                                {selectedWarrants.length === filteredWarrants.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </button>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="text-[10px] text-primary font-bold hover:underline uppercase tracking-tighter">
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-text-secondary-light dark:text-zinc-500 uppercase tracking-widest ml-1">Crime</label>
                            <select value={filterCrime} onChange={e => setFilterCrime(e.target.value)} className="w-full rounded-xl border border-border-light dark:border-white/10 bg-white dark:bg-black/40 text-zinc-900 dark:text-zinc-200 text-xs p-3 outline-none focus:ring-2 focus:ring-primary/30 appearance-none transition-all">
                                <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Todos os Crimes</option>
                                {availableCrimes.map((c: string) => <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-text-secondary-light dark:text-zinc-500 uppercase tracking-widest ml-1">Status</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-xl border border-border-light dark:border-white/10 bg-white dark:bg-black/40 text-zinc-900 dark:text-zinc-200 text-xs p-3 outline-none focus:ring-2 focus:ring-primary/30 appearance-none transition-all">
                                <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Todos</option>
                                <option value="EM ABERTO" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Em Aberto</option>
                                <option value="CUMPRIDO" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Cumprido</option>
                                <option value="PRESO" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Preso</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-text-secondary-light dark:text-zinc-500 uppercase tracking-widest ml-1">Região DP</label>
                            <select value={filterDpRegion} onChange={e => setFilterDpRegion(e.target.value)} className="w-full rounded-xl border border-border-light dark:border-white/10 bg-white dark:bg-black/40 text-zinc-900 dark:text-zinc-200 text-xs p-3 outline-none focus:ring-2 focus:ring-primary/30 appearance-none transition-all">
                                <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Qualquer DP</option>
                                <option value="1º DP" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">1º DP</option>
                                <option value="2º DP" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">2º DP</option>
                                <option value="3º DP" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">3º DP</option>
                                <option value="4º DP" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">4º DP</option>
                                <option value="Outras Cidades" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Outras Cidades</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-text-secondary-light dark:text-zinc-500 uppercase tracking-widest ml-1">Data Início</label>
                            <input
                                type="text"
                                value={dateStart}
                                onChange={(e) => setDateStart(maskDate(e.target.value))}
                                placeholder="DD/MM/YYYY"
                                className="w-full rounded-xl border border-border-light dark:border-white/10 bg-white dark:bg-black/40 text-zinc-900 dark:text-zinc-200 text-xs p-3 outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-text-secondary-light dark:text-zinc-500 uppercase tracking-widest ml-1">Data Fim</label>
                            <input
                                type="text"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(maskDate(e.target.value))}
                                placeholder="DD/MM/YYYY"
                                className="w-full rounded-xl border border-border-light dark:border-white/10 bg-white dark:bg-black/40 text-zinc-900 dark:text-zinc-200 text-xs p-3 outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {filteredWarrants.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-text-secondary-light">Nenhum mandado encontrado.</p>
                    </div>
                ) : (
                    filteredWarrants.map((w: Warrant) => (
                        <div key={w.id} onClick={() => navigate(`/warrant-detail/${w.id}`)} className={`bg-surface-light dark:bg-surface-dark p-3 rounded-xl border-2 shadow-sm hover:border-primary transition-colors cursor-pointer group relative active:scale-[0.99] flex gap-4 items-start ${selectedWarrants.includes(w.id) ? 'border-primary dark:border-blue-500 bg-primary/5 dark:bg-blue-500/5' : 'border-border-light dark:border-border-dark'}`}>
                            <div
                                onClick={(e) => toggleWarrantSelection(w.id, e)}
                                className={`absolute -top-2 -left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all z-10 shadow-md ${selectedWarrants.includes(w.id)
                                    ? 'bg-primary border-white dark:border-zinc-900 text-white scale-110'
                                    : 'bg-white dark:bg-zinc-800 border-border-light dark:border-white/10 text-transparent hover:scale-105'
                                    }`}
                            >
                                <CheckCircle size={16} className={selectedWarrants.includes(w.id) ? 'opacity-100' : 'opacity-0'} />
                            </div>

                            <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-border-light dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                {w.img ? (
                                    <img src={w.img} alt={w.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className="text-zinc-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-bold text-sm text-text-light dark:text-white truncate uppercase tracking-tight">{w.name}</h3>
                                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-mono font-medium">{w.number}</p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 border ${w.status === 'EM ABERTO' ? 'bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-500/20 dark:text-red-400' :
                                        w.status === 'CUMPRIDO' || w.status === 'PRESO' ? 'bg-green-500/10 text-green-600 border-green-500/30 dark:bg-green-500/20 dark:text-green-400' : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                        }`}>
                                        {w.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-text-secondary-light dark:text-zinc-500 font-medium">
                                    <p className="truncate"><span className="font-black text-blue-600 dark:text-blue-500 uppercase mr-1">RG:</span> <span className="text-zinc-900 dark:text-zinc-300">{w.rg || '-'}</span></p>
                                    <p className="truncate"><span className="font-black text-blue-600 dark:text-blue-500 uppercase mr-1">CPF:</span> <span className="text-zinc-900 dark:text-zinc-300">{w.cpf || '-'}</span></p>
                                    <p className="truncate"><span className="font-black text-orange-600 dark:text-orange-500 uppercase mr-1">Crime:</span> <span className="text-zinc-900 dark:text-zinc-300">{w.crime || '-'}</span></p>
                                    <p className="truncate"><span className="font-black text-indigo-600 dark:text-indigo-500 uppercase mr-1">Regime:</span> <span className="text-zinc-900 dark:text-zinc-300">{w.regime || '-'}</span></p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(DatabaseTab);
