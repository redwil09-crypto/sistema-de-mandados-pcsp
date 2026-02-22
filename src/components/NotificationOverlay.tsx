import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, X, CheckCircle } from 'lucide-react';
import { Warrant } from '../types';
import { formatDate } from '../utils/helpers';
import { EXPIRING_WARRANTS } from '../data/mockData';

interface NotificationOverlayProps {
    warrants: Warrant[];
    isOpen: boolean;
    onClose: () => void;
}

const NotificationOverlay = ({ warrants, isOpen, onClose }: NotificationOverlayProps) => {
    const [showAllNotifications, setShowAllNotifications] = useState(false);

    const urgentNotifications = useMemo(() => {
        const today = new Date();
        return warrants
            .filter(w => w.status === 'EM ABERTO' && w.expirationDate)
            .map(w => {
                const expDate = w.expirationDate!.includes('/')
                    ? new Date(w.expirationDate!.split('/').reverse().join('-'))
                    : new Date(w.expirationDate!);
                const diffTime = expDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...w, daysLeft: diffDays };
            })
            .filter(w => w.daysLeft <= 30 && w.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [warrants]);

    const displayedNotifications = showAllNotifications
        ? urgentNotifications.slice(0, 10)
        : urgentNotifications.filter(w => w.daysLeft <= 7);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark animate-in slide-in-from-top-4 duration-200">
                <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                    <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <CalendarClock className="text-orange-500" size={18} /> Vencendo em Breve
                    </h3>
                    <button onClick={onClose} className="text-text-secondary-light hover:text-primary">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {displayedNotifications.length > 0 ? (
                        <div className="space-y-2">
                            <div className="px-2 py-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded">
                                {showAllNotifications ? "Próximos 10 Vencimentos" : "Urgente (Menos de 7 dias)"}
                            </div>
                            {displayedNotifications.map(item => (
                                <Link to={`/warrant-detail/${item.id}`} key={item.id} onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-background-light dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-border-light dark:hover:border-border-dark">
                                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold text-xs shrink-0">
                                        {item.daysLeft}d
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-text-light dark:text-text-dark truncate">{item.name}</p>
                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{item.type}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Vence em: {formatDate(item.expirationDate || item.date)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-text-secondary-light">
                            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                            <p className="text-sm">Nenhum mandado urgente.</p>
                            {!showAllNotifications && EXPIRING_WARRANTS.length > 0 && (
                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Clique em "Ver completo" para ver os próximos.</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-white/5 rounded-b-xl">
                    <button
                        onClick={() => setShowAllNotifications(!showAllNotifications)}
                        className="w-full py-2 text-xs font-bold text-primary hover:underline"
                    >
                        {showAllNotifications ? "Ver menos" : "Ver completo"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationOverlay;
