
import React from 'react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import { generateWarrantPDF } from '../services/pdfReportService';
import { useWarrants } from '../contexts/WarrantContext';
import { Siren, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const PriorityList = () => {
    const { priorityWarrants: warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant } = useWarrants();

    const urgentCount = warrants.filter(w => (w.tags || []).includes('Urgente')).length;
    const debtCount = warrants.filter(w => (w.tags || []).includes('Ofício de Cobrança')).length;

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Prioridades" back />

            {/* Header Stats */}
            <div className="px-4 py-4 grid grid-cols-2 gap-3">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <span className="text-2xl font-black text-red-600 dark:text-red-500">{urgentCount}</span>
                        <p className="text-[10px] uppercase font-bold text-red-600/70 dark:text-red-400">Urgentes</p>
                    </div>
                    <Siren className="text-red-500/50" size={24} />
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <span className="text-2xl font-black text-orange-600 dark:text-orange-500">{debtCount}</span>
                        <p className="text-[10px] uppercase font-bold text-orange-600/70 dark:text-orange-400">Cobranças</p>
                    </div>
                    <FileText className="text-orange-500/50" size={24} />
                </div>
            </div>

            <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <h3 className="text-xs font-black uppercase text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Lista de Prioridades</h3>
                </div>

                {warrants.map(w => (
                    <div key={w.id} className="relative">
                        {/* Custom Priority Badge Overlay */}
                        {(w.tags || []).includes('Urgente') && (
                            <div className="absolute -left-2 top-4 z-10 bg-red-600 text-white text-[9px] font-black uppercase py-1 px-2 rounded-r-md shadow-md animate-pulse">
                                Urgente
                            </div>
                        )}

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
                    </div>
                ))}

                {warrants.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                        <CheckCircle2 size={48} className="text-green-500 mb-4" />
                        <h3 className="font-bold text-lg text-text-light dark:text-text-dark">Tudo Limpo!</h3>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark max-w-[200px]">Nenhum mandado prioritário pendente no momento.</p>
                        <Link to="/" className="mt-6 text-xs font-bold text-primary hover:underline">Voltar ao Início</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriorityList;
