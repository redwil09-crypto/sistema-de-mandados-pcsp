
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
    AlertCircle, User, Gavel, Calendar, MapPin, Map, Home,
    Bike, FileCheck, FileText, Paperclip, Edit,
    Route as RouteIcon, RotateCcw, CheckCircle, Printer,
    Trash2, Zap, Bell, Eye, History, Send, Copy,
    ShieldAlert, MessageSquare, Plus, PlusCircle, X, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import ConfirmModal from '../components/ConfirmModal';
import { Warrant } from '../types';

interface WarrantDetailProps {
    warrants: Warrant[];
    onUpdate: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    routeWarrants?: string[];
    onRouteToggle?: (id: string) => void;
}

const WarrantDetail = ({ warrants, onUpdate, onDelete, routeWarrants = [], onRouteToggle }: WarrantDetailProps) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [finalizeFormData, setFinalizeFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        reportNumber: '',
        digOffice: '',
        result: 'Fechado'
    });

    const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [tagToRemove, setTagToRemove] = useState<string | null>(null);

    // Investigative States
    const [newDiligence, setNewDiligence] = useState('');
    const [diligenceType, setDiligenceType] = useState<'observation' | 'attempt' | 'intelligence'>('observation');
    const [isDraftOpen, setIsDraftOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const data = useMemo(() => warrants.find(w => w.id === id), [warrants, id]);

    // Neighborhood Intelligence - Refined logic
    const nearbyWarrants = useMemo(() => {
        if (!data || !data.location) return [];
        // Extract street name more robustly (pre-comma or pre-number)
        const streetMatch = data.location.match(/^(.*?)(?:,|\s\d)/i);
        const street = streetMatch ? streetMatch[1].trim().toLowerCase() : data.location.split(' ')[0].trim().toLowerCase();

        if (street.length < 4) return [];

        return warrants.filter(w =>
            w.id !== data.id &&
            w.status === 'EM ABERTO' &&
            w.location?.toLowerCase().includes(street)
        );
    }, [warrants, data]);

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Mandado não encontrado</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">Voltar</button>
            </div>
        );
    }

    const handleFinalize = () => {
        const isSearch = data.type?.toLowerCase().includes('busca') || data.type?.toLowerCase().includes('apreensão');
        setFinalizeFormData(prev => ({
            ...prev,
            digOffice: data.digOffice || '',
            reportNumber: '',
            result: isSearch ? 'Apreendido' : 'Fechado'
        }));
        setIsFinalizeModalOpen(true);
    };

    const handleReopen = () => {
        setIsReopenConfirmOpen(true);
    };

    const handleConfirmReopen = async () => {
        const success = await onUpdate(data.id, {
            status: 'EM ABERTO'
        });
        if (success) {
            toast.success("Mandado reaberto com sucesso!");
        } else {
            toast.error("Erro ao reabrir mandado.");
        }
        setIsReopenConfirmOpen(false);
    };

    const handleConfirmFinalize = async () => {
        const success = await onUpdate(data.id, {
            status: 'CUMPRIDO',
            dischargeDate: finalizeFormData.date,
            digOffice: finalizeFormData.digOffice,
            fulfillmentResult: finalizeFormData.result,
            fulfillmentReport: finalizeFormData.reportNumber
        });
        if (success) {
            toast.success("Mandado finalizado com sucesso!");
        } else {
            toast.error("Erro ao finalizar mandado.");
        }
        setIsFinalizeModalOpen(false);
    };

    const handleConfirmRemoveTag = async () => {
        if (!tagToRemove || !data) return;
        const updatedTags = (data.tags || []).filter(t => t !== tagToRemove);
        const success = await onUpdate(data.id, { tags: updatedTags });
        if (success) {
            toast.success(`A etiqueta "${tagToRemove}" foi removida.`);
        }
        setTagToRemove(null);
    };

    const handleAddDiligence = async () => {
        if (!newDiligence.trim()) return;

        const entry: any = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            investigator: "Policial",
            notes: newDiligence,
            type: diligenceType
        };

        const updatedHistory = [...(data.diligentHistory || []), entry];
        const success = await onUpdate(data.id, { diligentHistory: updatedHistory });

        if (success) {
            setNewDiligence('');
            toast.success("Diligência registrada com sucesso!");
        }
    };

    const handleDeleteDiligence = async (diligenceId: string) => {
        const updatedHistory = (data.diligentHistory || []).filter(h => h.id !== diligenceId);
        const success = await onUpdate(data.id, { diligentHistory: updatedHistory });
        if (success) {
            toast.success("Diligência removida.");
        }
    };

    const getReportText = () => {
        return `
DELEGACIA DE INVESTIGAÇÕES GERAIS - DIG/PCSP
RELATÓRIO DE DILIGÊNCIA OPERACIONAL

DADOS DO ALVO:
NOME: ${data.name.toUpperCase()}
RG: ${data.rg || 'Não informado'}
CPF: ${data.cpf || 'Não informado'}
PROCESSO: ${data.number}
CRIME: ${data.crime || 'Não informado'}

LOCAL DA DILIGÊNCIA:
ENDEREÇO: ${data.location || 'Não informado'}

HISTÓRICO RECENTE:
${(data.diligentHistory || []).slice(-10).map(h => `- ${new Date(h.date).toLocaleDateString()} [${h.type.toUpperCase()}]: ${h.notes}`).join('\n') || '- Sem diligências anteriores.'}

OBSERVAÇÕES ADICIONAIS:
${data.observation || 'Nada a declarar.'}

RESULTADO ATUAL: ${data.status}
DATA DO RELATÓRIO: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

___________________________________
Equipe de Capturas - DIG / PCSP
        `.trim();
    };

    const handleCopyReportDraft = () => {
        const text = getReportText();
        navigator.clipboard.writeText(text);
        toast.success("Relatório copiado para a área de transferência!");
    };

    const handlePrintReport = () => {
        const text = getReportText();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Relatório - ${data.name}</title>
                        <style>
                            body { font-family: monospace; white-space: pre-wrap; padding: 40px; font-size: 14px; line-height: 1.5; color: #000; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>${text}</body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleDownloadReportPDF = () => {
        const doc = new jsPDF();
        const text = getReportText();
        const splitText = doc.splitTextToSize(text, 180);
        doc.setFont('courier', 'normal');
        doc.setFontSize(10);
        doc.text(splitText, 15, 20);
        doc.save(`Relatorio_DIG_${data.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF do relatório baixado!");
    };

    const handleDelete = () => {
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        const success = await onDelete(data.id);
        if (success) {
            toast.success("Mandado excluído permanentemente.");
            navigate(-1);
        } else {
            toast.error("Erro ao excluir mandado.");
        }
        setIsDeleteConfirmOpen(false);
    };

    const handleDownloadPDF = async () => {
        if (!data) return;
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            let y = 20;

            // --- HEADER ---
            try {
                const badgePC = new Image();
                badgePC.src = '/brasao_pcsp_colorido.png';
                const badgeSP = new Image();
                badgeSP.src = '/brasao_sp.png';

                const loadImg = (img: HTMLImageElement) => new Promise((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                });

                const [pcLoaded, spLoaded] = await Promise.all([loadImg(badgePC), loadImg(badgeSP)]);

                const badgeW = 18;
                const badgeH = 22;
                if (pcLoaded) {
                    doc.addImage(badgePC, 'PNG', margin, 12, badgeW, badgeH);
                }
                if (spLoaded) {
                    doc.addImage(badgeSP, 'PNG', pageWidth - margin - badgeW, 12, badgeW, badgeH);
                }
            } catch (e) {
                console.error("Badges load error", e);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text("POLÍCIA CIVIL DO ESTADO DE SÃO PAULO", pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(11);
            doc.text("DELEGACIA DE INVESTIGAÇÕES GERAIS - DIG", pageWidth / 2, 26, { align: 'center' });

            doc.setFontSize(12);
            doc.text("RELATÓRIO DE INTELIGÊNCIA POLICIAL", pageWidth / 2, 35, { align: 'center' });

            // Horizontal Line
            y = 42;
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;

            // --- PHOTO & MAIN INFO ---
            const photoWidth = 40;
            const photoMaxHeight = 50;
            let photoHeight = 0;

            try {
                const photoUrl = data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`;
                const img = new Image();
                img.src = photoUrl;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });

                const ratio = img.naturalWidth / img.naturalHeight;
                photoHeight = photoWidth / ratio;
                if (photoHeight > photoMaxHeight) {
                    photoHeight = photoMaxHeight;
                    const widthByHeight = photoMaxHeight * ratio;
                    if (widthByHeight <= photoWidth) {
                        doc.addImage(img, 'JPEG', margin, y, widthByHeight, photoMaxHeight);
                    } else {
                        doc.addImage(img, 'JPEG', margin, y, photoWidth, photoHeight);
                    }
                } else {
                    doc.addImage(img, 'JPEG', margin, y, photoWidth, photoHeight);
                }
            } catch (e) {
                console.warn("Photo error", e);
                doc.rect(margin, y, photoWidth, photoMaxHeight);
                doc.setFontSize(8);
                doc.text("Sem Foto", margin + 10, y + 20);
            }

            const textX = margin + photoWidth + 10;
            let textY = y + 5;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(data.name.toUpperCase(), textX, textY);
            textY += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const statusColor = data.status === 'CUMPRIDO' ? [34, 197, 94] : [239, 68, 68];
            doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.roundedRect(textX, textY - 4, 30, 6, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text((data.status || 'EM ABERTO'), textX + 15, textY, { align: 'center' });

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            textY += 10;

            const rows = [
                ["RG:", data.rg || "-"],
                ["CPF:", data.cpf || "-"],
                ["Tipo:", data.type],
                ["Prioridade:", (data.tags || []).join(", ") || "Normal"]
            ];

            rows.forEach(([label, value]) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label, textX, textY);
                doc.setFont('helvetica', 'normal');
                doc.text(value.toString().toUpperCase(), textX + 25, textY);
                textY += 5;
            });

            y = Math.max(y + photoHeight, textY) + 10;

            // --- SECTIONS ---
            const drawSection = (title: string, fields: [string, string][]) => {
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(title.toUpperCase(), margin + 2, y + 4.5);
                y += 10;

                fields.forEach(([label, val]) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(label, margin, y);

                    const value = val || "-";
                    doc.setFont('helvetica', 'normal');
                    const splitVal = doc.splitTextToSize(value, 130);
                    doc.text(splitVal, margin + 40, y);
                    y += (splitVal.length * 5) + 3;
                });
                y += 5;
            };

            drawSection("Dados Processuais", [
                ["Nº Processo:", data.number],
                ["Crime:", data.crime || "-"],
                ["Regime:", data.regime || "-"],
                ["Expedição:", data.issueDate || "-"],
                ["Vencimento:", data.expirationDate || "-"],
                ["Localização:", data.location || "-"],
            ]);

            drawSection("Investigação e Observações", [
                ["Ofício iFood:", data.ifoodNumber || "-"],
                ["Resultado iFood:", data.ifoodResult || "-"],
                ["Ofício DIG:", data.digOffice || "-"],
                ["Observações:", data.observation || "-"]
            ]);

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const today = new Date().toLocaleDateString('pt-BR');
            doc.text(`Gerado em: ${today} pelo Sistema de Mandados DIG/PCSP`, margin, 285);
            doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - margin, 285, { align: 'right' });

            toast.success(`Ficha de ${data.name} gerada com sucesso!`);
            doc.save(`Ficha_DIG_${data.name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Erro ao montar PDF. Verifique se a foto está acessível.");
        }
    };

    return (
        <div className="min-h-screen pb-safe bg-background-light dark:bg-background-dark">
            <Header
                title="Detalhes do Mandado"
                back
                showHome
            />
            <div className="p-4 pb-48 space-y-4">

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex gap-4">
                        <div className="shrink-0">
                            <img
                                src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`}
                                alt={data.name}
                                onClick={() => setIsPhotoModalOpen(true)}
                                className="h-40 w-40 rounded-2xl object-cover border-2 border-primary/20 shadow-lg bg-gray-100 dark:bg-gray-800 cursor-zoom-in hover:scale-[1.02] transition-transform active:scale-95"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{data.name}</h2>
                            <p className="text-sm text-primary font-medium mt-1">{data.type}</p>
                            <div className="mt-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${data.status === 'EM ABERTO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    data.status === 'CUMPRIDO' || data.status === 'PRESO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>{data.status}</span>
                            </div>
                            {data.tags && data.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {data.tags.map((tag: string) => (
                                        <button
                                            key={tag}
                                            onClick={() => setTagToRemove(tag)}
                                            title="Clique para remover prioridade"
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border-2 flex items-center gap-1 transition-all hover:scale-105 active:scale-95 ${tag === 'Urgente'
                                                ? 'bg-red-500 border-red-500 text-white shadow-md hover:bg-red-600'
                                                : 'bg-amber-500 border-amber-500 text-white shadow-md hover:bg-amber-600'
                                                }`}>
                                            {tag === 'Urgente' ? <Zap size={10} /> : <Bell size={10} />}
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                        <User size={18} className="text-primary" /> Dados Pessoais
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">RG</p>
                            <p className="text-sm font-mono text-text-light dark:text-text-dark">{data.rg || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">CPF</p>
                            <p className="text-sm font-mono text-text-light dark:text-text-dark">{data.cpf || "-"}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <Gavel size={18} className="text-primary" /> Processual
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Nº Processo</p>
                            <p className="text-sm font-mono text-text-light dark:text-text-dark">{data.number}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Crime</p>
                            <p className="text-sm text-text-light dark:text-text-dark">{data.crime || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Regime</p>
                            <p className="text-sm text-text-light dark:text-text-dark">{data.regime || "-"}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                        <Calendar size={18} className="text-primary" /> Datas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Expedição</p>
                            <p className="text-sm text-text-light dark:text-text-dark">{data.issueDate || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Entrada (Capturas)</p>
                            <p className="text-sm text-text-light dark:text-text-dark">{data.entryDate || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Vencimento</p>
                            <p className="text-sm text-red-500 font-bold">{data.expirationDate || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Baixa</p>
                            <p className="text-sm text-text-light dark:text-text-dark">{data.dischargeDate || "-"}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                        <MapPin size={18} className="text-primary" /> Localização
                    </h3>

                    {nearbyWarrants.length > 0 && (
                        <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
                            <ShieldAlert className="text-amber-600" size={18} />
                            <div>
                                <p className="text-[10px] font-bold text-amber-700 uppercase">Inteligência de Vizinhança</p>
                                <p className="text-[10px] text-amber-600">Existem {nearbyWarrants.length} outro(s) mandado(s) aberto(s) nesta mesma rua/região.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-border-light dark:border-border-dark">
                        <div className="flex-1">
                            <p className="text-sm text-text-light dark:text-text-dark font-medium">{data.location || "Endereço não informado"}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                title="Abrir Mapa"
                                onClick={() => data.location && window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`, '_blank')}
                                className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm px-2 py-2 rounded-lg text-primary hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
                            >
                                <Map size={18} />
                                <span className="text-[8px] font-bold">MAPA</span>
                            </button>
                            <button
                                title={routeWarrants.includes(data.id) ? "Remover da Rota" : "Adicionar à Rota"}
                                onClick={() => onRouteToggle?.(data.id)}
                                className={`flex flex-col items-center justify-center gap-1 border shadow-sm px-2 py-2 rounded-lg transition-all active:scale-95 ${routeWarrants.includes(data.id)
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                                    }`}
                            >
                                <RouteIcon size={18} />
                                <span className="text-[8px] font-bold">ROTA</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                        <Bike size={18} className="text-primary" /> Investigação
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Ofício iFood nº</p>
                            <p className="text-sm font-mono text-text-light dark:text-text-dark">{data.ifoodNumber || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Resultado iFood</p>
                            <p className="text-sm text-text-light dark:text-text-dark bg-gray-50 dark:bg-white/5 p-2 rounded mt-1 border border-border-light dark:border-border-dark">
                                {data.ifoodResult || "Sem resultado"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Ofício DIG</p>
                            <p className="text-sm text-text-light dark:text-text-dark">{data.digOffice || "-"}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                            <FileCheck size={18} className="text-primary" /> Relatórios
                        </h3>
                        {data.reports && data.reports.length > 0 ? (
                            <ul className="space-y-2">
                                {data.reports.map((report, idx) => (
                                    <li key={idx}
                                        onClick={() => alert(`Abrindo pré-visualização: ${report}`)}
                                        className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
                                    >
                                        <FileText size={14} /> {report}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400">Nenhum relatório.</p>
                        )}
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                            <Paperclip size={18} className="text-primary" /> Anexos
                        </h3>
                        {data.attachments && data.attachments.length > 0 ? (
                            <ul className="space-y-2">
                                {data.attachments.map((att, idx) => (
                                    <li key={idx}
                                        onClick={() => alert(`Visualizando anexo: ${att}`)}
                                        className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
                                    >
                                        <FileText size={14} /> {att}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400">Nenhum anexo.</p>
                        )}
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <History size={18} className="text-primary" /> Linha do Tempo e Relatório
                    </h3>

                    {isDraftOpen && (
                        <div className="mb-6 p-4 bg-gray-100 dark:bg-white/5 border border-primary/20 rounded-xl animate-in zoom-in-95 duration-200">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <span className="text-[10px] font-bold uppercase text-primary">Pré-visualização do Relatório</span>
                                <div className="flex gap-2">
                                    <button onClick={handleCopyReportDraft} className="text-[9px] bg-slate-500 text-white px-2 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 active:scale-95 transition-all">
                                        <Copy size={12} /> COPIAR
                                    </button>
                                    <button onClick={handleDownloadReportPDF} className="text-[9px] bg-indigo-600 text-white px-2 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 active:scale-95 transition-all">
                                        <FileText size={12} /> BAIXAR PDF
                                    </button>
                                    <button onClick={handlePrintReport} className="text-[9px] bg-emerald-600 text-white px-2 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 active:scale-95 transition-all">
                                        <Printer size={12} /> IMPRIMIR
                                    </button>
                                </div>
                            </div>
                            <div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-border-light dark:border-border-dark max-h-80 overflow-y-auto">
                                <pre className="text-[10px] font-mono whitespace-pre-wrap leading-tight text-text-light dark:text-text-dark">
                                    {getReportText()}
                                </pre>
                            </div>
                        </div>
                    )}

                    <div className="mb-6 bg-gray-100 dark:bg-white/5 p-4 rounded-xl border border-border-light dark:border-border-dark shadow-inner">
                        <span className="text-[10px] font-bold text-text-secondary-light uppercase mb-2 block">Nova Diligência / Modus Operandi</span>
                        <div className="flex gap-2 mb-3">
                            {(['observation', 'attempt', 'intelligence'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setDiligenceType(type)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${diligenceType === type
                                        ? type === 'observation' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' :
                                            type === 'attempt' ? 'bg-orange-600 border-orange-600 text-white shadow-lg' :
                                                'bg-purple-600 border-purple-600 text-white shadow-lg'
                                        : 'bg-white dark:bg-surface-dark border-border-light text-text-secondary-light hover:border-gray-400'
                                        }`}
                                >
                                    {type === 'observation' && <Eye size={18} />}
                                    {type === 'attempt' && <RotateCcw size={18} />}
                                    {type === 'intelligence' && <ShieldAlert size={18} />}
                                    <span className="leading-none">{type === 'observation' ? 'Visita' : type === 'attempt' ? 'Insucesso' : 'Intel'}</span>
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <textarea
                                value={newDiligence}
                                onChange={(e) => setNewDiligence(e.target.value)}
                                placeholder="Relate o que foi observado, pessoas que falaram com a equipe, ou inteligência obtida..."
                                className="w-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            />
                            <button
                                onClick={handleAddDiligence}
                                disabled={!newDiligence.trim()}
                                className="w-full mt-2 py-3 bg-primary text-white rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <PlusCircle size={18} /> INSERIR NA LINHA DO TEMPO
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-0 before:w-1 before:bg-primary/10">
                        {data.diligentHistory && data.diligentHistory.length > 0 ? (
                            [...data.diligentHistory].reverse().map((h) => (
                                <div key={h.id} className="relative pl-12 animate-in slide-in-from-left-4">
                                    <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-surface-light dark:border-surface-dark shadow-sm flex items-center justify-center ${h.type === 'observation' ? 'bg-blue-500' : h.type === 'attempt' ? 'bg-amber-500' : 'bg-purple-600'
                                        }`}>
                                        {h.type === 'observation' ? <Eye size={16} className="text-white" /> : h.type === 'attempt' ? <RotateCcw size={16} className="text-white" /> : <ShieldAlert size={16} className="text-white" />}
                                    </div>
                                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm group hover:border-primary/30 transition-colors">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-primary">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                                <span className="text-[10px] text-text-secondary-light">{new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteDiligence(h.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-text-light dark:text-text-dark leading-relaxed font-medium">{h.notes}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-gray-50/50 dark:bg-black/10 rounded-2xl border-2 border-dashed border-border-light dark:border-border-dark">
                                <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                                <p className="text-xs text-text-secondary-light font-bold">Nenhum registro tático disponível para este alvo.</p>
                                <p className="text-[10px] text-text-secondary-light/60 mt-1">Use o campo acima para registrar diligências.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                        <Eye size={18} className="text-primary" /> Observações do PDF
                    </h3>
                    <p className="text-sm text-text-light dark:text-text-dark leading-relaxed">
                        {data.observation || "Sem observações registradas."}
                    </p>
                </div>

            </div>

            <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 pb-6 sm:pb-6 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-border-light dark:border-border-dark z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.1)]">
                <div className="max-w-md mx-auto grid grid-cols-5 gap-1 sm:gap-2">
                    <Link
                        to="/"
                        className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 transition-all active:scale-90 touch-manipulation"
                    >
                        <Home size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">Início</span>
                    </Link>

                    <Link
                        to={`/new-warrant?edit=${data.id}`}
                        className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary transition-all active:scale-90 touch-manipulation"
                    >
                        <Edit size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">Editar</span>
                    </Link>


                    <button
                        onClick={data.status === 'CUMPRIDO' ? handleReopen : handleFinalize}
                        className={`flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl transition-all active:scale-90 touch-manipulation ${data.status === 'CUMPRIDO'
                            ? 'bg-blue-600/10 text-blue-600'
                            : 'bg-green-600/10 text-green-600'
                            }`}
                    >
                        {data.status === 'CUMPRIDO' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">{data.status === 'CUMPRIDO' ? 'REABRIR' : 'FECHAR'}</span>
                    </button>

                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl bg-indigo-600/10 text-indigo-600 transition-all active:scale-90 touch-manipulation"
                    >
                        <FileText size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">Relatório</span>
                    </button>

                    <button
                        onClick={handleDelete}
                        className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl bg-red-500/10 text-red-500 transition-all active:scale-90 touch-manipulation"
                    >
                        <Trash2 size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">APAGAR</span>
                    </button>
                </div>
            </div>

            {isReopenConfirmOpen && (
                <ConfirmModal
                    isOpen={isReopenConfirmOpen}
                    title="Reabrir Mandado"
                    message="Deseja alterar o status deste mandado para EM ABERTO?"
                    onConfirm={handleConfirmReopen}
                    onCancel={() => setIsReopenConfirmOpen(false)}
                    confirmText="reabrir"
                    cancelText="cancelar"
                />
            )}

            {tagToRemove && (
                <ConfirmModal
                    isOpen={!!tagToRemove}
                    title="Remover Prioridade"
                    message={`Deseja remover a prioridade "${tagToRemove}" deste mandado e voltar ao normal?`}
                    onConfirm={handleConfirmRemoveTag}
                    onCancel={() => setTagToRemove(null)}
                    confirmText="Sim, Remover"
                    cancelText="Não"
                    variant="danger"
                />
            )}
            {isDeleteConfirmOpen && (
                <ConfirmModal
                    isOpen={isDeleteConfirmOpen}
                    title="Excluir Permanentemente"
                    message="TEM CERTEZA que deseja EXCLUIR este mandado permanentemente? Esta ação não pode ser desfeita."
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    confirmText="Excluir"
                    variant="danger"
                />
            )}

            {isFinalizeModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl w-full max-w-md shadow-2xl border border-border-light dark:border-border-dark animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">Finalizar Mandado</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Data do Cumprimento</label>
                                    <input
                                        type="date"
                                        value={finalizeFormData.date}
                                        onChange={e => setFinalizeFormData({ ...finalizeFormData, date: e.target.value })}
                                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Número do Relatório</label>
                                    <input
                                        type="text"
                                        value={finalizeFormData.reportNumber}
                                        onChange={e => setFinalizeFormData({ ...finalizeFormData, reportNumber: e.target.value })}
                                        placeholder="Ex: REL-2024/001"
                                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Número de Ofício DIG</label>
                                    <input
                                        type="text"
                                        value={finalizeFormData.digOffice}
                                        onChange={e => setFinalizeFormData({ ...finalizeFormData, digOffice: e.target.value })}
                                        placeholder="Ex: 123/2024"
                                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Resultado</label>
                                    <select
                                        value={finalizeFormData.result}
                                        onChange={e => setFinalizeFormData({ ...finalizeFormData, result: e.target.value })}
                                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        {(data.type?.toLowerCase().includes('busca') || data.type?.toLowerCase().includes('apreensão'))
                                            ? ['Apreendido', 'Fora de Validade', 'Negativo', 'Encaminhado', 'Contra', 'Ofício Localiza', 'Óbito'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))
                                            : [
                                                'PRESO',
                                                'NEGATIVO',
                                                'ENCAMINHADO',
                                                'ÓBITO',
                                                'CONTRA',
                                                'LOCALIZADO',
                                                'OFÍCIO',
                                                'CUMPRIDO NO FÓRUM'
                                            ].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setIsFinalizeModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:opacity-90 transition-opacity"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmFinalize}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} />
                                    FECHAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Photo Zoom Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-surface-light dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-border-light dark:border-border-dark overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-black/20">
                            <div>
                                <h3 className="font-black text-text-light dark:text-text-dark text-lg uppercase tracking-tight">Centro de Relatórios</h3>
                                <p className="text-[10px] text-text-secondary-light font-bold flex items-center gap-1">
                                    <ShieldAlert size={10} /> SELECIONE O DOCUMENTO PARA GERAR
                                </p>
                            </div>
                            <button onClick={() => setIsReportModalOpen(false)} className="p-2 hover:bg-red-100 text-red-500 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Option 1: Full Qualification PDF */}
                            <button
                                onClick={() => {
                                    handleDownloadPDF();
                                    setIsReportModalOpen(false);
                                }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-500/10 border-2 border-orange-500/20 hover:border-orange-500/40 transition-all group active:scale-[0.98]"
                            >
                                <div className="h-12 w-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
                                    <Printer size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="font-bold text-text-light dark:text-text-dark">Ficha Operacional PDF</h4>
                                    <p className="text-[10px] text-text-secondary-light leading-tight">Qualificação completa, foto do réu, mandado e dados processuais formatados.</p>
                                </div>
                                <ChevronRight className="text-orange-500" size={20} />
                            </button>

                            {/* Option 2: Investigative Report (Draft/Print/PDF) */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setIsDraftOpen(!isDraftOpen)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group active:scale-[0.98] ${isDraftOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-indigo-600/10 border-indigo-600/20 hover:border-indigo-600/40'}`}
                                >
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform ${isDraftOpen ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                                        <FileText size={24} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <h4 className={`font-bold ${isDraftOpen ? 'text-white' : 'text-text-light dark:text-text-dark'}`}>Relatório de Investigação</h4>
                                        <p className={`text-[10px] leading-tight ${isDraftOpen ? 'text-indigo-100' : 'text-text-secondary-light'}`}>Histórico de diligências, visitas ao local e modus operandi para relatório de expediente.</p>
                                    </div>
                                    <ChevronRight className={isDraftOpen ? 'text-white' : 'text-indigo-600'} size={20} />
                                </button>

                                {isDraftOpen && (
                                    <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-indigo-500/30 animate-in zoom-in-95 duration-200">
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <button onClick={handleCopyReportDraft} className="flex-1 py-2.5 bg-slate-500 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                                                <Copy size={14} /> COPIAR
                                            </button>
                                            <button onClick={handleDownloadReportPDF} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                                                <FileText size={14} /> BAIXAR PDF
                                            </button>
                                            <button onClick={handlePrintReport} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                                                <Printer size={14} /> IMPRIMIR
                                            </button>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-black/40 rounded-xl border border-border-light dark:border-border-dark max-h-40 overflow-y-auto">
                                            <pre className="text-[9px] font-mono whitespace-pre-wrap leading-tight text-text-light dark:text-text-dark">
                                                {getReportText()}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Disclaimer */}
                        <div className="p-4 bg-red-500/5 text-center">
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Documento Interno - Uso Exclusivo Policial</p>
                        </div>
                    </div>
                </div>
            )}
            {/* Photo Zoom Modal */}
            {isPhotoModalOpen && (
                <div
                    className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsPhotoModalOpen(false)}
                >
                    <div className="relative max-w-4xl w-full flex flex-col items-center">
                        <button
                            className="absolute -top-12 right-0 text-white hover:text-primary transition-colors p-2"
                            onClick={() => setIsPhotoModalOpen(false)}
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`}
                            alt={data.name}
                            className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl border-2 border-white/10 object-contain animate-in zoom-in-95 duration-300"
                        />
                        <div className="mt-4 text-center">
                            <h2 className="text-white font-black text-xl uppercase tracking-widest">{data.name}</h2>
                            <p className="text-gray-400 text-sm">{data.number}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarrantDetail;
