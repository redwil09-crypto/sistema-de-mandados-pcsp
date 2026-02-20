import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../supabaseService';
import { AuditLog } from '../types';
import { History, User, Activity } from 'lucide-react';

const WarrantAuditLog = ({ warrantId, excludeUserId }: { warrantId: string, excludeUserId?: string }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await getAuditLogs(warrantId);
                // Filter logs to exclude the current user if specified
                const filteredData = excludeUserId
                    ? (data || []).filter(log => log.user_id !== excludeUserId)
                    : (data || []);
                setLogs(filteredData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [warrantId, excludeUserId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-6 text-gray-400 opacity-50">
            <Activity className="animate-spin mb-2" size={20} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Carregando histórico...</span>
        </div>
    );

    if (logs.length === 0) return (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-white/5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <History className="text-gray-300 mb-2 opacity-50" size={24} />
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nenhuma alteração externa encontrada</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-2.5 text-[10px] p-2.5 bg-white dark:bg-black/20 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${log.action === 'CREATE' ? 'bg-green-500/10 text-green-500' :
                            log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-red-500/10 text-red-500'
                        }`}>
                        <History size={14} />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="font-black text-text-light dark:text-text-dark uppercase tracking-tight">
                                {log.action === 'CREATE' ? 'Criação' : log.action === 'UPDATE' ? 'Edição' : 'Exclusão'}
                            </span>
                            <span className="text-[9px] text-text-secondary-light dark:text-text-dark/40 font-bold">
                                {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <p className="text-text-secondary-light dark:text-text-dark/70 font-medium truncate">
                            {log.details?.replace('Updated fields: ', 'Campos: ')}
                        </p>

                        <div className="flex items-center gap-1 text-[9px] font-bold text-text-secondary-light/60 dark:text-text-dark/30 mt-1 uppercase tracking-wider">
                            <User size={8} />
                            <span>Agente: {log.user_email?.split('@')[0] || log.user_id.split('-')[0]}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WarrantAuditLog;
