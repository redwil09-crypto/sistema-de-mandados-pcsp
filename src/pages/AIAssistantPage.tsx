
import React, { useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { Database, Save, RefreshCw, Printer, ListTodo, Trash2, Cpu, Home, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import ConfirmModal from '../components/ConfirmModal';
import BottomNav from '../components/BottomNav';
import { toast } from 'sonner';
import { useWarrants } from '../contexts/WarrantContext';
import ExtractionTab from '../components/ai-assistant/ExtractionTab';
import DatabaseTab from '../components/ai-assistant/DatabaseTab';
import FilesTab from '../components/ai-assistant/FilesTab';

const AIAssistantPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'extraction' | 'database' | 'files'>(
        (searchParams.get('tab') as 'extraction' | 'database' | 'files') || 'extraction'
    );
    const [databaseSelectionCount, setDatabaseSelectionCount] = useState(0);
    const [extractionSaveInfo, setExtractionSaveInfo] = useState<{ count: number; lastSavedId?: string }>({ count: 0 });

    const { warrants } = useWarrants();
    const navigate = useNavigate();

    // Atualiza a URL quando a aba muda
    React.useEffect(() => {
        setSearchParams({ tab: activeTab }, { replace: true });
    }, [activeTab, setSearchParams]);

    const handleDatabaseSelectionChange = useCallback((count: number) => {
        setDatabaseSelectionCount(count);
    }, []);

    const handleExtractionSaveSuccess = useCallback(() => {
        setExtractionSaveInfo(prev => ({ count: prev.count + 1 }));
    }, []);

    // Funções para impressão
    const handlePrintList = useCallback(async () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Relatório de Inteligência - Lista de Alvos", 105, 20, { align: 'center' });
            doc.setFontSize(10);
            let y = 40;

            const loadImage = (url: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = url;
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });
            };

            for (let i = 0; i < warrants.length; i++) {
                const w = warrants[i];
                if (y > 250) { doc.addPage(); y = 20; }

                doc.setDrawColor(200);
                doc.roundedRect(15, y - 5, 180, 25, 2, 2);

                if (w.img) {
                    try {
                        const img = await loadImage(w.img);
                        doc.addImage(img, 'JPEG', 20, y - 2, 18, 18);
                    } catch (e) {
                        doc.setDrawColor(230);
                        doc.rect(20, y - 2, 18, 18);
                        doc.setFontSize(6);
                        doc.text("S/ FOTO", 24, y + 8);
                    }
                } else {
                    doc.setDrawColor(230);
                    doc.rect(20, y - 2, 18, 18);
                    doc.setFontSize(6);
                    doc.text("S/ FOTO", 24, y + 8);
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`${i + 1}. ${w.name.toUpperCase()}`, 45, y + 2);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`RG: ${w.rg || '-'} | CPF: ${w.cpf || '-'}`, 45, y + 7);
                doc.text(`PROCESSO: ${w.number}`, 45, y + 12);
                doc.text(`CRIME: ${w.crime || '-'} | REGIME: ${w.regime || '-'}`, 45, y + 17);

                doc.setTextColor(220, 38, 38);
                doc.setFont('helvetica', 'bold');
                doc.text(`STATUS: ${w.status}`, 150, y + 2);
                doc.setTextColor(0, 0, 0);

                y += 27;
            }

            toast.success("Lista de inteligência com fotos gerada!");
            doc.save(`Lista_Inteligencia_${new Date().getTime()}.pdf`);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao imprimir lista com fotos.");
        }
    }, [warrants]);

    const handlePrintDatabaseSplit = useCallback(() => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(220, 38, 38);
            doc.text("MANDADOS DE PRISÃO", 105, 20, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            let y = 40;
            const prison = warrants.filter(w => !w.type.toLowerCase().includes('busca'));

            prison.forEach((w, index) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}. ${w.name}`, 20, y);
                doc.setFont('helvetica', 'normal');
                doc.text(`RG: ${w.rg || '-'} | Proc: ${w.number} | Crime: ${w.crime || '-'}`, 20, y + 5);
                y += 15;
            });

            doc.addPage();
            doc.setFontSize(20);
            doc.setTextColor(249, 115, 22);
            doc.text("BUSCA E APREENSÃO", 105, 20, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            y = 40;
            const search = warrants.filter(w => w.type.toLowerCase().includes('busca'));

            search.forEach((w, index) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}. ${w.name}`, 20, y);
                doc.setFont('helvetica', 'normal');
                doc.text(`RG: ${w.rg || '-'} | Proc: ${w.number} | Crime: ${w.crime || '-'}`, 20, y + 5);
                y += 15;
            });

            toast.success("Banco de dados completo gerado!");
            doc.save("Banco_Dados_Completo.pdf");
        } catch (e) { toast.error("Erro ao imprimir banco de dados."); }
    }, [warrants]);

    const handlePrintSelected = useCallback(async (selectedIds: string[]) => {
        if (selectedIds.length === 0) {
            toast.error("Nenhum mandado selecionado.");
            return;
        }

        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Relatório de Inteligência - Mandados Selecionados", 105, 20, { align: 'center' });
            doc.setFontSize(10);
            let y = 40;

            const loadImage = (url: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = url;
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });
            };

            const selectedData = warrants.filter(w => selectedIds.includes(w.id));

            for (let i = 0; i < selectedData.length; i++) {
                const w = selectedData[i];
                if (y > 250) { doc.addPage(); y = 20; }

                doc.setDrawColor(200);
                doc.roundedRect(15, y - 5, 180, 25, 2, 2);

                if (w.img) {
                    try {
                        const img = await loadImage(w.img);
                        doc.addImage(img, 'JPEG', 20, y - 2, 18, 18);
                    } catch (e) {
                        doc.setDrawColor(230);
                        doc.rect(20, y - 2, 18, 18);
                        doc.setFontSize(6);
                        doc.text("S/ FOTO", 24, y + 8);
                    }
                } else {
                    doc.setDrawColor(230);
                    doc.rect(20, y - 2, 18, 18);
                    doc.setFontSize(6);
                    doc.text("S/ FOTO", 24, y + 8);
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`${i + 1}. ${w.name.toUpperCase()}`, 45, y + 2);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`RG: ${w.rg || '-'} | CPF: ${w.cpf || '-'}`, 45, y + 7);
                doc.text(`PROCESSO: ${w.number}`, 45, y + 12);
                doc.text(`CRIME: ${w.crime || '-'} | REGIME: ${w.regime || '-'}`, 45, y + 17);

                doc.setTextColor(220, 38, 38);
                doc.setFont('helvetica', 'bold');
                doc.text(`STATUS: ${w.status}`, 150, y + 2);
                doc.setTextColor(0, 0, 0);

                y += 27;
            }

            toast.success(`${selectedIds.length} mandados selecionados foram impressos.`);
            doc.save(`Mandados_Selecionados_${new Date().getTime()}.pdf`);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao imprimir selecionados.");
        }
    }, [warrants]);

    return (
        <div className="min-h-screen pb-32 bg-background-light dark:bg-background-dark">
            <Header title="Assistente IA - DIG" back />

            <div className="px-4 pt-4">
                <div className="flex bg-surface-light dark:bg-surface-dark p-1 rounded-xl border border-border-light dark:border-border-dark shadow-md">
                    <button
                        onClick={() => setActiveTab('extraction')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'extraction' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Nova Extração
                    </button>
                    <button
                        onClick={() => setActiveTab('database')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${activeTab === 'database' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Banco de Dados
                        {databaseSelectionCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-surface-light dark:border-surface-dark animate-in zoom-in">
                                {databaseSelectionCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'files' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        ARQUIVOS
                    </button>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'extraction' && <ExtractionTab key="extraction" onSaveSuccess={handleExtractionSaveSuccess} />}
                {activeTab === 'database' && (
                    <DatabaseTab
                        key="database"
                        onSelectionChange={handleDatabaseSelectionChange}
                        onPrintSelected={handlePrintSelected}
                        onPrintList={handlePrintList}
                        onPrintDatabaseSplit={handlePrintDatabaseSplit}
                    />
                )}
                {activeTab === 'files' && <FilesTab key="files" />}
            </div>

            <div className="mt-8 mb-4 p-2 sm:p-4 bg-surface-light/50 dark:bg-surface-dark/50 rounded-2xl border border-border-light dark:border-border-dark">
                <div className="max-w-md mx-auto flex items-stretch gap-2">
                    <Link
                        to="/"
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 transition-all active:scale-95 touch-manipulation hover:bg-gray-500/20"
                    >
                        <Home size={20} />
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">Início</span>
                    </Link>

                    {activeTab === 'database' && (
                        <>
                            {databaseSelectionCount > 0 && (
                                <button
                                    onClick={() => handlePrintSelected(warrants.filter(w => databaseSelectionCount > 0).map(w => w.id).slice(0, databaseSelectionCount))}
                                    className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 touch-manipulation hover:bg-emerald-700 animate-in zoom-in"
                                >
                                    <Printer size={20} />
                                    <span className="text-[9px] font-bold uppercase truncate w-full text-center">Selecionados ({databaseSelectionCount})</span>
                                </button>
                            )}
                            <button
                                onClick={handlePrintList}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 transition-all active:scale-95 touch-manipulation hover:bg-gray-500/20"
                            >
                                <ListTodo size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Imprimir Lista</span>
                            </button>
                            <button
                                onClick={handlePrintDatabaseSplit}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 touch-manipulation hover:bg-blue-700"
                            >
                                <Printer size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Tudo</span>
                            </button>
                        </>
                    )}

                    {activeTab === 'extraction' && (
                        <div className="flex-1"></div>
                    )}

                    {activeTab === 'files' && (
                        <div className="flex-1"></div>
                    )}
                </div>
                <BottomNav />
            </div>
        </div>
    );
};

export default AIAssistantPage;
