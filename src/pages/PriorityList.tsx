
import React from 'react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import { Warrant } from '../types';

import { generateWarrantPDF } from '../services/pdfReportService';

interface PriorityListProps {
    warrants: Warrant[];
    onUpdate: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    routeWarrants?: string[];
    onRouteToggle?: (id: string) => void;
}

const PriorityList = ({ warrants, onUpdate, routeWarrants = [], onRouteToggle }: PriorityListProps) => (
    <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
        <Header title="Prioridades" back />
        <div className="p-4 space-y-4">
            {warrants.map(w => (
                <WarrantCard
                    key={w.id}
                    data={w}
                    isPlanned={routeWarrants.includes(w.id)}
                    onRouteToggle={onRouteToggle}
                    onPrint={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        generateWarrantPDF(w, onUpdate);
                    }}
                />
            ))}
            {warrants.length === 0 && (
                <div className="text-center py-10 opacity-50 text-sm">
                    Nenhuma prioridade encontrada.
                </div>
            )}
        </div>
    </div>
);

export default PriorityList;
