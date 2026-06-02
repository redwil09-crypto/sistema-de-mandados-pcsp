
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Paperclip, Cpu, Eye, Download, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useWarrants } from '../../contexts/WarrantContext';
import { extractMultipleDocumentNumbers } from '../../services/documentNumberExtractor';

interface FilesTabProps {
    initialSearchTerm?: string;
    onSearchTermChange?: (term: string) => void;
    onSelectionChange?: (count: number) => void;
}

const FilesTab: React.FC<FilesTabProps> = ({ initialSearchTerm = '', onSearchTermChange, onSelectionChange }) => {
    const { warrants, updateWarrant } = useWarrants();
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [documentNumbers, setDocumentNumbers] = useState<Record<string, { number: string | null; fullIdentifier: string | null }>>({});
    const [isExtractingNumbers, setIsExtractingNumbers] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        onSearchTermChange?.(searchTerm);
    }, [searchTerm, onSearchTermChange]);

    // Função para extrair números dos PDFs - só roda quando o usuário clica em "Atualizar"
    const handleRefreshNumbers = useCallback(async () => {
        const urlsToProcess: string[] = [];
        warrants.forEach(w => {
            const reports = w.reports || [];
            const ifoodDocs = w.ifoodDocs || [];
            const attachments = w.attachments || [];
            [...reports, ...ifoodDocs, ...attachments].forEach(url => {
                const lowerUrl = url.toLowerCase();
                if (!lowerUrl.includes('dossie') && !lowerUrl.includes('dossie_tatico')) {
                    urlsToProcess.push(url);
                }
            });
        });

        if (urlsToProcess.length === 0) {
            toast.info("Nenhum documento para processar.");
            return;
        }

        setIsExtractingNumbers(true);
        try {
            const results = await extractMultipleDocumentNumbers(urlsToProcess, () => { });
            setDocumentNumbers(results);
            setLastUpdate(new Date());
            toast.success(`${Object.keys(results).length} documentos processados!`);
        } catch (err) {
            toast.error("Erro ao processar documentos.");
        } finally {
            setIsExtractingNumbers(false);
        }
    }, [warrants]);

    const consolidatedFiles = useMemo(() => {
        if (!warrants || warrants.length === 0) {
            return {
                reports: [],
                attachments: [],
                ifoodDocs: []
            };
        }

        const reportsList: any[] = [];
        const attachmentsList: any[] = [];
        const ifoodDocsList: any[] = [];

        warrants.forEach(w => {
            if (w.reports && Array.isArray(w.reports)) {
                w.reports.forEach(url => {
                    const lowerUrl = url.toLowerCase();
                    if (!lowerUrl.includes('dossie') && !lowerUrl.includes('dossie_tatico')) {
                        reportsList.push({
                            url,
                            warrantId: w.id,
                            warrantName: w.name,
                            warrantNumber: w.number,
                            createdAt: w.createdAt || w.entryDate || ''
                        });
                    }
                });
            }

            if (w.attachments && Array.isArray(w.attachments)) {
                w.attachments.forEach(url => {
                    const lowerUrl = url.toLowerCase();
                    const isDossie = lowerUrl.includes('dossie') || lowerUrl.includes('dossie_tatico');
                    if (!isDossie) {
                        const isReport = lowerUrl.includes('/reports/') || lowerUrl.includes('relatorio');
                        const isIfood = lowerUrl.includes('/ifooddocs/') || lowerUrl.includes('oficio_ifood') || lowerUrl.includes('ifood');

                        const fileObj = {
                            url,
                            warrantId: w.id,
                            warrantName: w.name,
                            warrantNumber: w.number,
                            createdAt: w.createdAt || w.entryDate || ''
                        };

                        if (isIfood) {
                            ifoodDocsList.push(fileObj);
                        } else if (isReport) {
                            reportsList.push(fileObj);
                        } else {
                            attachmentsList.push(fileObj);
                        }
                    }
                });
            }

            if (w.ifoodDocs && Array.isArray(w.ifoodDocs)) {
                w.ifoodDocs.forEach(url => {
                    ifoodDocsList.push({
                        url,
                        warrantId: w.id,
                        warrantName: w.name,
                        warrantNumber: w.number,
                        createdAt: w.createdAt || w.entryDate || ''
                    });
                });
            }
        });

        const parseTimestamp = (url: string) => {
            const match = url.match(/\/(\d+)_/);
            return match ? parseInt(match[1]) : 0;
        };

        reportsList.sort((a, b) => parseTimestamp(a.url) - parseTimestamp(b.url));

        const numberedReports = reportsList.map((r, index) => {
            const extracted = documentNumbers[r.url];
            const docNum = extracted?.fullIdentifier || String(index + 1).padStart(2, '0');
            return {
                ...r,
                displayName: extracted?.fullIdentifier ? `Relatório ${extracted.fullIdentifier}` : `Relatório ${String(index + 1).padStart(2, '0')}`,
                downloadName: extracted?.fullIdentifier ? `relatorio_${extracted.fullIdentifier.replace(/\//g, '_')}.pdf` : `relatorio_${String(index + 1).padStart(2, '0')}.pdf`
            };
        });

        ifoodDocsList.sort((a, b) => parseTimestamp(a.url) - parseTimestamp(b.url));
        const numberedIfoodDocs = ifoodDocsList.map((doc, index) => {
            const extracted = documentNumbers[doc.url];
            const docNum = extracted?.fullIdentifier || String(index + 1).padStart(2, '0');
            return {
                ...doc,
                displayName: extracted?.fullIdentifier ? `Ofício ${extracted.fullIdentifier}` : `Ofício iFood ${String(index + 1).padStart(2, '0')}`,
                downloadName: extracted?.fullIdentifier ? `oficio_${extracted.fullIdentifier.replace(/\//g, '_')}.pdf` : `oficio_ifood_${String(index + 1).padStart(2, '0')}.pdf`
            };
        });

        const numberedAttachments = attachmentsList.map((a, index) => {
            const extracted = documentNumbers[a.url];
            const nameFromUrl = a.url.split('/').pop() || 'Anexo';
            const decodedName = decodeURIComponent(nameFromUrl).replace(/^\d+_/, '');
            return {
                ...a,
                displayName: extracted?.fullIdentifier ? extracted.fullIdentifier : decodedName,
                downloadName: extracted?.fullIdentifier ? `${extracted.fullIdentifier.replace(/\//g, '_')}.pdf` : decodedName
            };
        });

        const sortByNewest = (arr: any[]) => {
            return [...arr].sort((a, b) => parseTimestamp(b.url) - parseTimestamp(a.url));
        };

        return {
            reports: sortByNewest(numberedReports),
            attachments: sortByNewest(numberedAttachments),
            ifoodDocs: sortByNewest(numberedIfoodDocs)
        };
    }, [warrants, documentNumbers]);

    const filteredReports = useMemo(() => {
        if (!searchTerm) return consolidatedFiles.reports;
        const term = searchTerm.toLowerCase();
        return consolidatedFiles.reports.filter((f: any) =>
            f.displayName.toLowerCase().includes(term) ||
            f.warrantName.toLowerCase().includes(term) ||
            f.warrantNumber.toLowerCase().includes(term)
        );
    }, [consolidatedFiles.reports, searchTerm]);

    const filteredAttachments = useMemo(() => {
        if (!searchTerm) return consolidatedFiles.attachments;
        const term = searchTerm.toLowerCase();
        return consolidatedFiles.attachments.filter((f: any) => {
            const name = f.url.split('/').pop() || '';
            const decodedName = decodeURIComponent(name).replace(/^\d+_/, '');
            return decodedName.toLowerCase().includes(term) ||
                f.warrantName.toLowerCase().includes(term) ||
                f.warrantNumber.toLowerCase().includes(term);
        });
    }, [consolidatedFiles.attachments, searchTerm]);

    const filteredIfoodDocs = useMemo(() => {
        if (!searchTerm) return consolidatedFiles.ifoodDocs;
        const term = searchTerm.toLowerCase();
        return consolidatedFiles.ifoodDocs.filter((f: any) =>
            f.displayName.toLowerCase().includes(term) ||
            f.warrantName.toLowerCase().includes(term) ||
            f.warrantNumber.toLowerCase().includes(term)
        );
    }, [consolidatedFiles.ifoodDocs, searchTerm]);

    const filteredFilesCount = filteredReports.length + filteredAttachments.length + filteredIfoodDocs.length;

    const handleDownloadFile = async (url: string, filename: string) => {
        const toastId = toast.loading(`Iniciando download do arquivo...`);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success(`Download de ${filename} concluído!`, { id: toastId });
        } catch (error) {
            console.error("Erro no download:", error);
            window.open(url, '_blank');
            toast.error(`Falha no download direto. Arquivo aberto em nova aba.`, { id: toastId });
        }
    };

    const handleDeleteFile = async (warrantId: string, url: string, type: 'reports' | 'attachments' | 'ifoodDocs') => {
        if (!window.confirm("Deseja excluir permanentemente este arquivo?")) return;

        const toastId = toast.loading("Excluindo arquivo...");
        try {
            const warrant = warrants.find(w => w.id === warrantId);
            if (!warrant) throw new Error("Mandado não encontrado");

            const currentFiles = warrant[type] || [];
            const updatedFiles = currentFiles.filter((f: string) => f !== url);

            const success = await updateWarrant(warrantId, { [type]: updatedFiles });
            if (success) {
                toast.success("Arquivo excluído com sucesso!", { id: toastId });
            } else {
                toast.error("Erro ao atualizar dados no banco.", { id: toastId });
            }
        } catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir o arquivo.", { id: toastId });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary dark:text-blue-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar em todas as categorias por nome, mandato ou processo..."
                    className="w-full rounded-xl border-2 border-border-light dark:border-white/10 bg-white dark:bg-zinc-900/50 py-3 pl-10 pr-4 text-sm shadow-sm dark:text-white placeholder:text-text-secondary-light dark:placeholder:text-zinc-500 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                />
                {searchTerm && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        {filteredFilesCount}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between gap-2 p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-text-secondary-light dark:text-zinc-500">Numeração dos documentos</span>
                    <span className="text-[9px] text-text-secondary-light dark:text-zinc-500">
                        {lastUpdate
                            ? `Última atualização: ${lastUpdate.toLocaleString('pt-BR')}`
                            : 'Clique em atualizar para extrair a numeração dos PDFs'}
                    </span>
                </div>
                <button
                    onClick={handleRefreshNumbers}
                    disabled={isExtractingNumbers}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-[10px] uppercase disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                    <RefreshCw size={12} className={isExtractingNumbers ? 'animate-spin' : ''} />
                    {isExtractingNumbers ? 'Atualizando...' : 'Atualizar'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-4 shadow-md space-y-3 flex flex-col min-h-[200px] max-h-[500px]">
                    <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-2 shrink-0">
                        <FileText className="text-blue-600 dark:text-blue-500" size={18} />
                        <h3 className="font-black text-text-light dark:text-white text-xs uppercase tracking-widest flex-1">Relatórios</h3>
                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredReports.length}</span>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-2 scrollbar-thin">
                        {filteredReports.length === 0 ? (
                            <p className="text-xs text-text-secondary-light dark:text-zinc-500 text-center py-6">Nenhum relatório encontrado.</p>
                        ) : (
                            filteredReports.map((file: any, idx: number) => (
                                <div key={idx} className="py-2 px-2 flex items-center justify-between gap-2 group hover:bg-blue-500/5 rounded-lg transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-text-light dark:text-white truncate flex items-center gap-1.5">
                                            <FileText size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                            {file.displayName}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-text-secondary-light dark:text-zinc-500">
                                            <Link to={`/warrant-detail/${file.warrantId}`} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline truncate max-w-[100px]">
                                                {file.warrantName}
                                            </Link>
                                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                            <span className="truncate">{file.warrantNumber}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button onClick={() => window.open(file.url, '_blank')} title="Visualizar" className="p-1 rounded-md hover:bg-blue-500/10 text-gray-500 hover:text-blue-600 transition-all">
                                            <Eye size={12} />
                                        </button>
                                        <button onClick={() => handleDownloadFile(file.url, file.downloadName)} title="Baixar" className="p-1 rounded-md hover:bg-blue-500/10 text-gray-500 hover:text-blue-600 transition-all">
                                            <Download size={12} />
                                        </button>
                                        <button onClick={() => handleDeleteFile(file.warrantId, file.url, 'reports')} title="Excluir" className="p-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-600 transition-all">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-4 shadow-md space-y-3 flex flex-col min-h-[200px] max-h-[500px]">
                    <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-2 shrink-0">
                        <Paperclip className="text-orange-600 dark:text-orange-500" size={18} />
                        <h3 className="font-black text-text-light dark:text-white text-xs uppercase tracking-widest flex-1">Anexos</h3>
                        <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredAttachments.length}</span>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-2 scrollbar-thin">
                        {filteredAttachments.length === 0 ? (
                            <p className="text-xs text-text-secondary-light dark:text-zinc-500 text-center py-6">Nenhum anexo encontrado.</p>
                        ) : (
                            filteredAttachments.map((file: any, idx: number) => {
                                return (
                                    <div key={idx} className="py-2 px-2 flex items-center justify-between gap-2 group hover:bg-orange-500/5 rounded-lg transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-text-light dark:text-white truncate flex items-center gap-1.5">
                                                <Paperclip size={12} className="text-orange-600 dark:text-orange-400 shrink-0" />
                                                {file.displayName}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5 text-[9px] text-text-secondary-light dark:text-zinc-500">
                                                <Link to={`/warrant-detail/${file.warrantId}`} className="text-orange-600 dark:text-orange-400 font-semibold hover:underline truncate max-w-[100px]">
                                                    {file.warrantName}
                                                </Link>
                                                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                                <span className="truncate">{file.warrantNumber}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button onClick={() => window.open(file.url, '_blank')} title="Visualizar" className="p-1 rounded-md hover:bg-orange-500/10 text-gray-500 hover:text-orange-600 transition-all">
                                                <Eye size={12} />
                                            </button>
                                            <button onClick={() => handleDownloadFile(file.url, file.downloadName)} title="Baixar" className="p-1 rounded-md hover:bg-orange-500/10 text-gray-500 hover:text-orange-600 transition-all">
                                                <Download size={12} />
                                            </button>
                                            <button onClick={() => handleDeleteFile(file.warrantId, file.url, 'attachments')} title="Excluir" className="p-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-600 transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-4 shadow-md space-y-3 flex flex-col min-h-[200px] max-h-[500px]">
                    <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-2 shrink-0">
                        <Cpu className="text-emerald-600 dark:text-emerald-500" size={18} />
                        <h3 className="font-black text-text-light dark:text-white text-xs uppercase tracking-widest flex-1">Ofícios iFood</h3>
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredIfoodDocs.length}</span>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-2 scrollbar-thin">
                        {filteredIfoodDocs.length === 0 ? (
                            <p className="text-xs text-text-secondary-light dark:text-zinc-500 text-center py-6">Nenhum ofício encontrado.</p>
                        ) : (
                            filteredIfoodDocs.map((file: any, idx: number) => (
                                <div key={idx} className="py-2 px-2 flex items-center justify-between gap-2 group hover:bg-emerald-500/5 rounded-lg transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-text-light dark:text-white truncate flex items-center gap-1.5">
                                            <FileText size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            {file.displayName}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-text-secondary-light dark:text-zinc-500">
                                            <Link to={`/warrant-detail/${file.warrantId}`} className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline truncate max-w-[100px]">
                                                {file.warrantName}
                                            </Link>
                                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                            <span className="truncate">{file.warrantNumber}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button onClick={() => window.open(file.url, '_blank')} title="Visualizar" className="p-1 rounded-md hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-600 transition-all">
                                            <Eye size={12} />
                                        </button>
                                        <button onClick={() => handleDownloadFile(file.url, file.downloadName)} title="Baixar" className="p-1 rounded-md hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-600 transition-all">
                                            <Download size={12} />
                                        </button>
                                        <button onClick={() => handleDeleteFile(file.warrantId, file.url, 'ifoodDocs')} title="Excluir" className="p-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-600 transition-all">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(FilesTab);
