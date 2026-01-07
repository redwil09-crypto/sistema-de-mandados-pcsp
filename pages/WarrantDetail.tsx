
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
    AlertCircle, User, Gavel, Calendar, MapPin, Map,
    Bike, FileCheck, FileText, Paperclip, Edit,
    Route as RouteIcon, RotateCcw, CheckCircle, Printer,
    Zap, Bell, Eye, StreetView, History, Send, Copy,
    ShieldAlert, MessageSquare, Plus, PlusCircle
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

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Investigative States
    const [newDiligence, setNewDiligence] = useState('');
    const [diligenceType, setDiligenceType] = useState<'observation' | 'attempt' | 'intelligence'>('observation');
    const [isDraftOpen, setIsDraftOpen] = useState(false);

    const data = useMemo(() => warrants.find(w => w.id === id), [warrants, id]);

    // Neighborhood Intelligence
    const nearbyWarrants = useMemo(() => {
        if (!data || !data.location) return [];
        const street = data.location.split(',')[0].trim().toLowerCase();
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

    const handleAddDiligence = async () => {
        if (!newDiligence.trim()) return;

        const entry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            investigator: "Investigador",
            notes: newDiligence,
            type: diligenceType
        };

        const updatedHistory = [...(data.diligentHistory || []), entry];
        const success = await onUpdate(data.id, { diligentHistory: updatedHistory });

        if (success) {
            setNewDiligence('');
            toast.success("Diligência registrada!");
        }
    };

    const handleCopyReportDraft = () => {
        const draft = `
RELATÓRIO DE DILIGÊNCIA POLICIAL - DIG PCSP
ALVO: ${data.name}
PROCESSO: ${data.number}
CRIME: ${data.crime}
DATA: ${new Date().toLocaleDateString('pt-BR')}

Diligência realizada no endereço ${data.location}.
RESULTADO: ${data.fulfillmentResult || 'EM ANDAMENTO'}
OBSERVAÇÕES: ${data.observation || 'Sem observações adicionais.'}

HISTÓRICO RECENTE:
${(data.diligentHistory || []).slice(-5).map(h => `- ${new Date(h.date).toLocaleDateString()}: ${h.notes}`).join('\n')}

___________________________________
Equipe de Capturas - DIG
        `;
        navigator.clipboard.writeText(draft.trim());
        toast.success("Draft copiado para a área de transferência!");
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
                                className="h-20 w-20 rounded-xl object-cover border border-border-light dark:border-border-dark bg-gray-100 dark:bg-gray-800"
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
                                        <span key={tag} className={`text-[10px] font-bold px-2 py-1 rounded-lg border-2 flex items-center gap-1 ${tag === 'Urgente'
                                            ? 'bg-red-500 border-red-500 text-white'
                                            : 'bg-amber-500 border-amber-500 text-white'
                                            }`}>
                                            {tag === 'Urgente' ? <Zap size={10} /> : <Bell size={10} />}
                                            {tag}
                                        </span>
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
                                title="Street View (Nível da Rua)"
                                onClick={() => data.location && window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(data.location)}`, '_blank')}
                                className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm px-2 py-2 rounded-lg text-blue-600 hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
                            >
                                <Eye size={18} />
                                <span className="text-[8px] font-bold">STREET</span>
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
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <History size={18} className="text-primary" /> Linha do Tempo de Diligências
                        </h3>
                        <button
                            onClick={handleCopyReportDraft}
                            className="text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg"
                        >
                            <Copy size={12} /> DRAFT RELATÓRIO
                        </button>
                    </div>

                    <div className="mb-6 space-y-3">
                        <div className="flex gap-2">
                            {(['observation', 'attempt', 'intelligence'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setDiligenceType(type)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${diligenceType === type
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-transparent border-border-light text-text-secondary-light'
                                        }`}
                                >
                                    {type === 'observation' ? 'Obs' : type === 'attempt' ? 'Tentativa' : 'Intel'}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <textarea
                                value={newDiligence}
                                onChange={(e) => setNewDiligence(e.target.value)}
                                placeholder="Descreva a diligência ou informação nova..."
                                className="w-full bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark rounded-xl p-3 text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                                onClick={handleAddDiligence}
                                disabled={!newDiligence.trim()}
                                className="absolute bottom-3 right-3 p-2 bg-primary text-white rounded-lg shadow-lg active:scale-90 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-1"
                            >
                                <Plus size={16} /> REGISTRAR
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-100 dark:before:bg-white/5">
                        {data.diligentHistory && data.diligentHistory.length > 0 ? (
                            [...data.diligentHistory].reverse().map((h) => (
                                <div key={h.id} className="relative pl-8 animate-in slide-in-from-left-2">
                                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-surface-light dark:border-surface-dark flex items-center justify-center ${h.type === 'observation' ? 'bg-blue-500' : h.type === 'attempt' ? 'bg-red-500' : 'bg-purple-500'
                                        }`}>
                                        {h.type === 'observation' ? <Eye size={10} className="text-white" /> : h.type === 'attempt' ? <MapPin size={10} className="text-white" /> : <ShieldAlert size={10} className="text-white" />}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-border-light dark:border-border-dark">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-text-secondary-light">{new Date(h.date).toLocaleDateString('pt-BR')} às {new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded uppercase font-bold text-text-secondary-light">{h.investigator}</span>
                                        </div>
                                        <p className="text-sm text-text-light dark:text-text-dark">{h.notes}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4">
                                <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-xs text-gray-400">Nenhuma diligência registrada ainda.</p>
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
                        to={`/new-warrant?edit=${data.id}`}
                        className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary transition-all active:scale-90 touch-manipulation"
                    >
                        <Edit size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">Editar</span>
                    </Link>

                    <button
                        onClick={() => onRouteToggle?.(data.id)}
                        className={`flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl transition-all active:scale-90 touch-manipulation ${routeWarrants.includes(data.id)
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-indigo-600/10 text-indigo-600'
                            }`}
                    >
                        <RouteIcon size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">{routeWarrants.includes(data.id) ? 'NA ROTA' : 'ROTA'}</span>
                    </button>

                    <button
                        onClick={data.status === 'CUMPRIDO' ? handleReopen : handleFinalize}
                        className={`flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl transition-all active:scale-90 touch-manipulation ${data.status === 'CUMPRIDO'
                            ? 'bg-blue-600/10 text-blue-600'
                            : 'bg-green-600/10 text-green-600'
                            }`}
                    >
                        {data.status === 'CUMPRIDO' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">{data.status === 'CUMPRIDO' ? 'REABRIR' : 'OK'}</span>
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 rounded-xl bg-orange-500/10 text-orange-600 transition-all active:scale-90 touch-manipulation"
                    >
                        <Printer size={18} />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">PDF</span>
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
                    message="Deseja realmente reabrir este mandado? O status será alterado para 'EM ABERTO'."
                    onConfirm={handleConfirmReopen}
                    onCancel={() => setIsReopenConfirmOpen(false)}
                    confirmText="Reabrir"
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
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarrantDetail;
