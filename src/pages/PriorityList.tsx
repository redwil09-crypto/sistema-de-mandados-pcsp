
import React from 'react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import { generateWarrantPDF } from '../services/pdfReportService';
import { useWarrants } from '../contexts/WarrantContext';

const PriorityList = () => {
    const { priorityWarrants: warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant } = useWarrants();

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Prioridades" back />
            <div className="p-4 space-y-4">
                {warrants.map(w => (
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
                ))}
                {warrants.length === 0 && (
                    <div className="text-center py-10 opacity-50 text-sm">
                        Nenhuma prioridade encontrada.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriorityList;


