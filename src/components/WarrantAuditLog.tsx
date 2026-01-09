import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../supabaseService';
import { AuditLog } from '../types';
import { History, User, Activity } from 'lucide-react';

const WarrantAuditLog = ({ warrantId }: { warrantId: string }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await getAuditLogs(warrantId);
                setLogs(data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [warrantId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-400 opacity-50">
            <Activity className="animate-spin mb-2" size={24} />
            <span className="text-xs">Carregando histórico...</span>
        </div>
    );

    if (logs.length === 0) return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-white/5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <History className="text-gray-300 mb-2" size={32} />
            <p className="text-sm text-gray-400 font-medium">Nenhum registro de alteração encontrado.</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-[11px] p-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-border-light dark:border-border-dark">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${log.action === 'CREATE' ? 'bg-green-100 text-green-600' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                                'bg-red-100 text-red-600'
                        }`}>
                        <History size={14} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-text-light dark:text-text-dark uppercase">
                                {log.action === 'CREATE' ? 'Criado' : log.action === 'UPDATE' ? 'Editado' : 'Excluído'}
                            </span>
                            <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-mono">
                                {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <p className="text-text-light dark:text-text-dark truncate">
                            {log.details?.replace('Updated fields: ', 'Campos: ')}
                        </p>

                        <div className="flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark mt-1">
                            <User size={10} />
                            <span className="truncate opacity-75">Usuário: {log.user_id.split('-')[0]}...</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WarrantAuditLog;
