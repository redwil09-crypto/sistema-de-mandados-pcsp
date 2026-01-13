
import React, { useMemo } from 'react';
import Header from '../components/Header';
import WarrantCard from '../components/WarrantCard';
import { Warrant } from '../types';

import { generateWarrantPDF } from '../services/pdfReportService';

interface RecentActivityPageProps {
    warrants: Warrant[];
    onUpdate: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    routeWarrants?: string[];
    onRouteToggle?: (id: string) => void;
}

const RecentActivityPage = ({ warrants, onUpdate, onDelete, routeWarrants = [], onRouteToggle }: RecentActivityPageProps) => {
    const sortedWarrants = useMemo(() => {
        return [...warrants].sort((a, b) => {
            const dateA = a.updatedAt || a.createdAt || '';
            const dateB = b.updatedAt || b.createdAt || '';
            return dateB.localeCompare(dateA);
        });
    }, [warrants]);

    return (
        <div className="min-h-screen pb-20 bg-background-light dark:bg-background-dark">
            <Header title="Atividades Recentes" back />
            <div className="p-4 space-y-3">
                {sortedWarrants.slice(0, 20).map((warrant) => (
                    <WarrantCard
                        key={warrant.id}
                        data={warrant}
                        onDelete={onDelete}
                        isPlanned={routeWarrants.includes(warrant.id)}
                        onRouteToggle={onRouteToggle}
                        onPrint={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            generateWarrantPDF(warrant, onUpdate);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default RecentActivityPage;
