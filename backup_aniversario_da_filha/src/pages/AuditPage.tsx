import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ClipboardList, User, Calendar, Info, Search, AlertTriangle, Trash2, X } from 'lucide-react';
import { getAllAuditLogs, translateAction, translateField, deleteAuditLog, deleteAuditLogs } from '../supabaseService';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import Header from '../components/Header';

export default function AuditPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadLogs = async () => {
        const auditData = await getAllAuditLogs();
        setLogs(auditData);
        setLoading(false);
    };

    useEffect(() => {
        const checkAdminAndLoad = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }

            // 1. Check metadata
            if (user.user_metadata?.role === 'admin') {
                setIsAdmin(true);
                await loadLogs();
                return;
            }

            // 2. Check profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'admin') {
                setIsAdmin(true);
                await loadLogs();
            } else {
                toast.error("Acesso restrito ao Administrador.");
                navigate('/');
            }
            setLoading(false);
        };

        checkAdminAndLoad();
    }, [navigate]);

    const filteredLogs = logs.filter(log =>
        (log.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredLogs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredLogs.map(l => l.id));
        }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!confirm('Deseja excluir este registro de auditoria?')) return;
        setIsDeleting(true);
        const success = await deleteAuditLog(id);
        if (success) {
            toast.success('Registro excluído!');
            setLogs(prev => prev.filter(l => l.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            toast.error('Erro ao excluir registro.');
        }
        setIsDeleting(false);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Deseja excluir ${selectedIds.length} registros selecionados?`)) return;

        setIsDeleting(true);
        const success = await deleteAuditLogs(selectedIds);
        if (success) {
            toast.success(`${selectedIds.length} registros excluídos!`);
            setLogs(prev => prev.filter(l => !selectedIds.includes(l.id)));
            setSelectedIds([]);
        } else {
            toast.error('Erro ao excluir registros.');
        }
        setIsDeleting(false);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen pb-24 bg-background-light dark:bg-background-dark">
            <Header title="Central de Auditoria" back showHome />

            <div className="p-4 space-y-4">
                {/* Search and Bulk Actions */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar por usuário, ação ou detalhe..."
                            className="w-full pl-10 pr-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {filteredLogs.length > 0 && (
                        <div className="flex items-center justify-between bg-surface-light dark:bg-surface-dark p-3 rounded-xl border border-border-light dark:border-border-dark">
                            <label className="flex items-center gap-2 text-xs font-bold text-text-light dark:text-text-dark cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={filteredLogs.length > 0 && selectedIds.length === filteredLogs.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Selecionar Tudo ({filteredLogs.length})
                            </label>

                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={isDeleting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    Excluir ({selectedIds.length})
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {filteredLogs.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <Info size={48} className="mx-auto text-text-secondary-light/30" />
                            <p className="text-text-secondary-light dark:text-text-secondary-dark font-bold">Nenhum registro encontrado.</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div key={log.id} className={`flex gap-3 bg-surface-light dark:bg-surface-dark p-4 rounded-xl border transition-all ${selectedIds.includes(log.id) ? 'border-primary ring-1 ring-primary/20' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}>
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(log.id)}
                                        onChange={() => toggleSelect(log.id)}
                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${log.action === 'CREATE' ? 'bg-green-500/10 text-green-500' :
                                                log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {translateAction(log.action)}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-bold">
                                                <Calendar size={12} />
                                                {new Date(log.created_at).toLocaleString('pt-BR')}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div
                                                onClick={() => log.warrant_id && navigate(`/warrant-detail/${log.warrant_id}`)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-primary px-2 py-1 bg-primary/5 rounded cursor-pointer hover:bg-primary/10 transition-colors"
                                                title="Ver Mandado"
                                            >
                                                ID: {log.warrant_id ? log.warrant_id.substring(0, 8) : 'N/A'}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSingle(log.id)}
                                                className="p-1 text-text-secondary-light hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Excluir Registro"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-bold text-text-light dark:text-text-dark">
                                            <User size={14} className="text-text-secondary-light" />
                                            <span>{log.user_email || 'Sistema / Desconhecido'}</span>
                                        </div>

                                        <div className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light/50 dark:border-border-dark/50">
                                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
                                                {log.details || 'Sem detalhes informados.'}
                                            </p>
                                        </div>

                                        {log.changes && Object.keys(log.changes || {}).length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-[9px] font-black uppercase text-amber-500 mb-1 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Campos Alterados:
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.keys(log.changes).map(key => (
                                                        <span key={key} className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold rounded">
                                                            {translateField(key)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
