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
        <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
            {logs.map((log) => (
                <div key={log.id} className="relative pl-12 animate-in slide-in-from-bottom-2 duration-500">
                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-4 border-white dark:border-surface-dark flex items-center justify-center shadow-sm z-10 ${log.action === 'CREATE' ? 'bg-green-100 text-green-600' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                                'bg-red-100 text-red-600'
                        }`}>
                        <History size={18} />
                    </div>

                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${log.action === 'CREATE' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                        log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                            'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                    }`}>
                                    {log.action === 'CREATE' ? 'CRIAÇÃO' : log.action === 'UPDATE' ? 'ATUALIZAÇÃO' : 'EXCLUSÃO'}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(log.created_at).toLocaleDateString('pt-BR')} às {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-3 leading-relaxed">
                            {log.details}
                        </p>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-full">
                                <User size={12} className="text-gray-500 dark:text-gray-400" />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
                                ID: {log.user_id}
                            </span>
                        </div>

                        {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="mt-3 bg-gray-50 dark:bg-black/20 p-2 rounded text-[10px] font-mono text-gray-500 overflow-x-auto">
                                <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WarrantAuditLog;
