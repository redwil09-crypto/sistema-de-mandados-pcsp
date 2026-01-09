
import React, { useState, useMemo, useEffect } from 'react';
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
import { supabase } from '../supabaseClient';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import Header from '../components/Header';
import ConfirmModal from '../components/ConfirmModal';
import VoiceInput from '../components/VoiceInput';
import WarrantAuditLog from '../components/WarrantAuditLog';
import { Warrant } from '../types';
import { geocodeAddress } from '../services/geocodingService';

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
    const [isUploadingFile, setIsUploadingFile] = useState(false);

    // Capturas Report State
    const [isCapturasModalOpen, setIsCapturasModalOpen] = useState(false);
    const [capturasData, setCapturasData] = useState({
        reportNumber: '',
        court: '',
        body: '',
        signer: 'William Campos A. Castro',
        delegate: 'Luiz Antônio Cunha dos Santos'
    });

    const data = useMemo(() => warrants.find(w => w.id === id), [warrants, id]);

    const [localData, setLocalData] = useState<Partial<Warrant>>({});
    const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.role === 'admin') {
                setIsAdmin(true);
            }
        };
        checkAdmin();
    }, []);

    useEffect(() => {
        if (data) {
            setLocalData(data);
        }
    }, [data]);

    const hasChanges = useMemo(() => {
        if (!data) return false;
        const fields: (keyof Warrant)[] = [
            'name', 'type', 'rg', 'cpf', 'number', 'crime', 'regime',
            'location', 'ifoodNumber', 'ifoodResult', 'digOffice',
            'issueDate', 'entryDate', 'expirationDate', 'dischargeDate', 'observation'
        ];
        return fields.some(key => localData[key] !== data[key]);
    }, [localData, data]);

    const handleFieldChange = (field: keyof Warrant, value: any) => {
        setLocalData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveChanges = async () => {
        if (!data) return;

        // Extract only changed fields to send to onUpdate
        const updates: Partial<Warrant> = {};
        const fields: (keyof Warrant)[] = [
            'name', 'type', 'rg', 'cpf', 'number', 'crime', 'regime',
            'location', 'ifoodNumber', 'ifoodResult', 'digOffice',
            'issueDate', 'entryDate', 'expirationDate', 'dischargeDate', 'observation',
            'status', 'fulfillmentResult', 'fulfillmentReport', 'latitude', 'longitude'
        ];

        fields.forEach(key => {
            if (localData[key] !== data[key]) {
                (updates as any)[key] = localData[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            setIsConfirmSaveOpen(false);
            return;
        }

        const toastId = toast.loading("Salvando alterações...");

        // Automatic Geocoding if location changed OR original data is missing coordinates
        const locationToGeocode = (updates.location && updates.location !== data.location ? updates.location : null) ||
            (data.location && (!localData.latitude || !localData.longitude) ? data.location : null);

        if (locationToGeocode && !updates.latitude) {
            try {
                const geoResult = await geocodeAddress(locationToGeocode);
                if (geoResult) {
                    updates.latitude = geoResult.lat;
                    updates.longitude = geoResult.lng;
                    toast.success(`Geolocalização capturada: ${geoResult.displayName}`, { duration: 3000 });
                }
            } catch (error) {
                console.error("Erro ao geocodificar automaticamente:", error);
            }
        }

        const success = await onUpdate(data.id, updates);
        if (success) {
            toast.success("Alterações salvas com sucesso!", { id: toastId });
            setIsConfirmSaveOpen(false);
        } else {
            toast.error("Erro ao salvar alterações.", { id: toastId });
        }
    };

    const handleCancelEdits = () => {
        if (data) {
            setLocalData(data);
            toast.info("Edições descartadas.");
        }
    };

    // Warn on unsaved changes when closing/reloading tab
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        if (hasChanges) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasChanges]);

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

    const aiTimeSuggestion = useMemo(() => {
        if (!data) return null;
        // Logic: if ifood result exists, or tactical summary mentions "madrugada" etc.
        const notes = (data.ifoodResult || '') + (data.observation || '');
        const summary = (data.tacticalSummary || []).join(' ');

        let suggestion = "Início da Manhã (05:00 - 06:30)";
        let confidence = "Alta";
        let reason = "Padrão operacional padrão para cumprimento de prisão.";

        if (notes.toLowerCase().includes('madrugada') || summary.toLowerCase().includes('noturno')) {
            suggestion = "Madrugada (03:00 - 05:00)";
            reason = "Menções a atividade noturna detectadas no sumário.";
        } else if (notes.toLowerCase().includes('almoço') || notes.toLowerCase().includes('tarde')) {
            suggestion = "Horário de Almoço (11:30 - 13:30)";
            reason = "Padrão de entregas detectedo em análise de horários iFood.";
        } else if (data.ifoodResult && data.ifoodResult.length > 20) {
            suggestion = "Início da Manhã (05:45 - 06:15)";
            confidence = "Muito Alta";
            reason = "Cruzamento de dados iFood com atividade residencial.";
        }

        return { suggestion, confidence, reason };
    }, [data]);

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

    const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'reports' | 'attachments' | 'ifoodDocs') => {
        const file = e.target.files?.[0];
        if (!file || !data) return;

        setIsUploadingFile(true);
        const toastId = toast.loading(`Subindo arquivo (${file.name})...`);
        try {
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `${type}/${data.id}/${Date.now()}_${cleanName}`;
            console.log(`WarrantDetail: Attempting to upload to path: ${path}`);
            const uploadedPath = await uploadFile(file, path);
            console.log(`WarrantDetail: Upload result path: ${uploadedPath}`);

            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                console.log(`WarrantDetail: Public URL generated: ${url}`);

                let currentAttachments = data.attachments || [];
                const success = await onUpdate(data.id, { attachments: [...currentAttachments, url] });
                if (success) {
                    toast.success("Arquivo anexado com sucesso!", { id: toastId });
                } else {
                    console.error("WarrantDetail: Failed to update database with new attachment");
                    toast.error("Erro ao atualizar dados no banco.", { id: toastId });
                }
            } else {
                console.error("WarrantDetail: Upload returned null path");
                toast.error("Erro ao salvar arquivo no storage.", { id: toastId });
            }
        } catch (error) {
            console.error("Erro ao fazer upload:", error);
            toast.error("Erro ao subir arquivo.", { id: toastId });
        } finally {
            setIsUploadingFile(false);
            e.target.value = '';
        }
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
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20; // Updated margin to 2.0cm
            const contentWidth = pageWidth - (margin * 2);

            let y = 15; // Start Y

            // --- HEADER ---
            try {
                const badgePC = new Image();
                badgePC.src = './brasao_pcsp_nova.png';

                await new Promise((resolve) => {
                    badgePC.onload = () => resolve(true);
                    badgePC.onerror = () => {
                        badgePC.src = './brasao_pcsp_colorido.png';
                        badgePC.onload = () => resolve(true);
                        badgePC.onerror = () => resolve(false);
                    };
                });

                const imgProps = doc.getImageProperties(badgePC);
                const badgeH = 25;
                const badgeW = (imgProps.width * badgeH) / imgProps.height;

                doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                const textX = margin + badgeW + 5;
                const headerLines = [
                    "SECRETARIA DA SEGURANÇA PÚBLICA",
                    "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                    "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
                    "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                    "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
                    "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
                ];

                headerLines.forEach((line, index) => {
                    doc.text(line, textX, y + 4 + (index * 4));
                });

                // Border line below header
                doc.setLineWidth(0.5);
                doc.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
                y += badgeH + 15;

            } catch (e) {
                console.error("Badge load error", e);
                y += 30;
            }

            // Title
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("RELATÓRIO OPERACIONAL UNIFICADO", pageWidth / 2, y, { align: 'center' });
            y += 10;

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
                photoHeight = photoMaxHeight;
            }

            const textX = margin + photoWidth + 10;
            let textY = y + 5;

            // Name
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const splitName = doc.splitTextToSize(data.name.toUpperCase(), contentWidth - photoWidth - 15);
            doc.text(splitName, textX, textY);
            textY += (splitName.length * 7) + 5;

            // Status Badge mock
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
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, y, contentWidth, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(title.toUpperCase(), margin + 2, y + 4.5);
                y += 10;

                fields.forEach(([label, val]) => {
                    const value = val || "-";
                    const splitVal = doc.splitTextToSize(value, contentWidth - 45); // Adjust for label width

                    if (y + (splitVal.length * 5) > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(label, margin, y);

                    doc.setFont('helvetica', 'normal');
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

            drawSection("Informações de Inteligência", [
                ["Ofício iFood:", data.ifoodNumber || "-"],
                ["Resultado iFood:", data.ifoodResult || "-"],
                ["Ofício DIG:", data.digOffice || "-"],
                ["Observações:", data.observation || "-"]
            ]);

            // --- DILIGENCE HISTORY SECTION ---
            if (data.diligentHistory && data.diligentHistory.length > 0) {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFillColor(230, 230, 255);
                doc.rect(margin, y, contentWidth, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text("HISTÓRICO DE DILIGÊNCIAS OPERACIONAIS", margin + 2, y + 4.5);
                y += 10;

                data.diligentHistory.forEach((h: any) => {
                    const dateStr = new Date(h.date).toLocaleDateString('pt-BR');
                    const header = `${dateStr} - [${h.type.toUpperCase()}]`;
                    const notes = h.notes || "-";

                    const splitNotes = doc.splitTextToSize(notes, contentWidth - 5);

                    if (y + (splitNotes.length * 5) + 10 > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text(header, margin, y);
                    y += 5;

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.text(splitNotes, margin + 5, y);
                    y += (splitNotes.length * 5) + 5;
                });
            }

            // --- SIGNATURE SECTION ---
            if (y + 40 > pageHeight - 20) {
                doc.addPage();
                y = 40;
            } else {
                y += 20;
            }

            doc.setLineWidth(0.2);
            doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("Equipe de Capturas - DIG", pageWidth / 2, y + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text("Polícia Civil do Estado de São Paulo", pageWidth / 2, y + 9, { align: 'center' });

            // Page numbers and footer timestamp
            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                const today = new Date().toLocaleDateString('pt-BR');
                const time = new Date().toLocaleTimeString('pt-BR');
                const footerY = pageHeight - 10;
                doc.text(`Gerado em: ${today} às ${time} | Sistema DIG/PCSP`, margin, footerY);
                doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
            }

            toast.success(`Relatório Unificado de ${data.name} gerado com sucesso!`);
            doc.save(`Relatorio_Unificado_DIG_${data.name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Erro ao montar PDF. Verifique se a foto está acessível.");
        }
    };

    const handleGenerateIFoodReport = async () => {
        if (!data) return;

        const currentYear = new Date().getFullYear();
        let suggestedOfficeId = data.ifoodNumber;

        if (!suggestedOfficeId) {
            let maxNumber = 0;
            warrants.forEach(w => {
                if (w.ifoodNumber) {
                    const parts = w.ifoodNumber.split('/');
                    if (parts.length === 3 && parts[1] === 'CAPT' && parseInt(parts[2]) === currentYear) {
                        const num = parseInt(parts[0]);
                        if (!isNaN(num) && num > maxNumber) {
                            maxNumber = num;
                        }
                    }
                }
            });
            suggestedOfficeId = `${(maxNumber + 1).toString().padStart(2, '0')}/CAPT/${currentYear}`;
        }

        const officeId = window.prompt("Digite o número do ofício (Ex: 01/CAPT/2026):", suggestedOfficeId);
        if (!officeId) return;

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20; // Standard 2cm margin
            const contentWidth = pageWidth - (margin * 2);
            const textWidth = contentWidth - 5;

            let y = 15; // Starting Y slightly higher

            // --- HEADER ---
            try {
                const badgePC = new Image();
                badgePC.src = './brasao_pcsp_nova.png';

                await new Promise((resolve) => {
                    badgePC.onload = () => resolve(true);
                    badgePC.onerror = () => {
                        console.warn("New badge not found, falling back");
                        badgePC.src = './brasao_pcsp_colorido.png';
                        badgePC.onload = () => resolve(true);
                        badgePC.onerror = () => resolve(false);
                    };
                });

                // Calculate proportional size
                const imgProps = doc.getImageProperties(badgePC);
                const badgeH = 22; // Slightly smaller header badge
                const badgeW = (imgProps.width * badgeH) / imgProps.height;

                doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                const textX = margin + badgeW + 5;
                const headerLines = [
                    "SECRETARIA DA SEGURANÇA PÚBLICA",
                    "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                    "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
                    "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                    "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
                    "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
                ];

                headerLines.forEach((line, index) => {
                    doc.text(line, textX, y + 4 + (index * 4));
                });

                // Border line below header
                doc.setLineWidth(0.5);
                doc.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
                y += badgeH + 12; // Reduced spacing

            } catch (e) {
                console.error("Badge load error", e);
                y += 30;
            }

            // Header: OFICIO
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("OFÍCIO", pageWidth / 2, y + 5, { align: 'center' });

            y += 12; // Reduced spacing

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`Ofício: ${officeId}`, margin, y);
            y += 5;
            doc.text(`Referência: PROC. Nº ${data.number}`, margin, y);
            y += 5;
            doc.text(`Natureza: Solicitação de Dados.`, margin, y);

            y += 8; // Reduced spacing

            // Date
            const today = new Date();
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const formattedDate = `Jacareí, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;
            doc.setFont('helvetica', 'normal');
            doc.text(formattedDate, pageWidth - margin, y, { align: 'right' });

            y += 12; // Reduced spacing

            // Destination
            doc.setFont('helvetica', 'bold');
            doc.text("ILMO. SENHOR RESPONSÁVEL,", margin, y);

            y += 12; // Reduced spacing

            // Body
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);

            const indent = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"; // 16 NBSP for wider indent

            const bodyText1 = `${indent}Com a finalidade de instruir investigação policial em trâmite nesta unidade, solicito, respeitosamente, a gentileza de verificar se o indivíduo abaixo relacionado encontra-se cadastrado como usuário ou entregador da plataforma IFOOD.`;
            const splitBody1 = doc.splitTextToSize(bodyText1, textWidth);
            doc.text(splitBody1, margin, y, { align: 'justify', maxWidth: textWidth });
            y += (splitBody1.length * 5) + 3; // Reduced spacing

            const bodyText2 = `${indent}Em caso positivo, requer-se o envio das informações cadastrais fornecidas para habilitação na plataforma, incluindo, se disponíveis, nome completo, endereço(s), número(s) de telefone, e-mail(s) e demais dados vinculados à respectiva conta.`;
            const splitBody2 = doc.splitTextToSize(bodyText2, textWidth);
            doc.text(splitBody2, margin, y, { align: 'justify', maxWidth: textWidth });
            y += (splitBody2.length * 5) + 3; // Reduced spacing

            const bodyText3 = `${indent}As informações devem ser encaminhadas ao e-mail institucional do policial responsável pela investigação:`;
            const splitBody3 = doc.splitTextToSize(bodyText3, textWidth);
            doc.text(splitBody3, margin, y);
            y += (splitBody3.length * 5) + 2;

            doc.setFont('helvetica', 'bold');
            doc.text("     william.castro@policiacivil.sp.gov.br", margin, y);
            y += 5;
            doc.text("     William Campos de Assis Castro – Polícia Civil do Estado de São Paulo", margin, y);

            y += 10; // Reduced spacing

            // Restored Section
            doc.setFont('helvetica', 'normal');
            doc.text("Pessoa de interesse para a investigação:", margin, y);
            y += 6;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`${data.name.toUpperCase()} / CPF: ${data.cpf || data.rg || 'N/I'}`, margin, y);

            y += 12; // Reduced spacing

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');

            // Indented closing paragraph
            const closingText = `${indent}Aproveito a oportunidade para renovar meus votos de elevada estima e consideração.`;
            doc.text(closingText, margin, y);
            y += 6;

            doc.text("Atenciosamente,", margin, y);

            // Signature & Footer positioning logic
            // define bottom anchor
            const footerLineY = pageHeight - 15;
            const addresseeBlockY = footerLineY - 15; // "Ao Ilustríssimo..." starts here
            const signatureBlockY = addresseeBlockY - 25; // Signature starts here

            // If text overlaps the signature area, push to new page
            if (y > signatureBlockY - 10) {
                doc.addPage();
            }

            // Position Signature at fixed bottom location
            y = signatureBlockY;
            doc.setFont('helvetica', 'bold');
            doc.text("Luiz Antônio Cunha dos Santos", pageWidth / 2, y, { align: 'center' });
            y += 5;
            doc.text("Delegado de Polícia", pageWidth / 2, y, { align: 'center' });

            // Position Addressee at fixed bottom location
            y = addresseeBlockY;
            doc.setFont('helvetica', 'normal');
            doc.text("Ao Ilustríssimo Senhor Responsável", margin, y);
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.text("Empresa iFood.", margin, y);

            // Footer
            const footerY = pageHeight - 15; // 15mm from bottom
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setLineWidth(0.1);
            doc.line(margin, footerY, pageWidth - margin, footerY);

            const address1 = "Rua Moisés Ruston, 370, Parque Itamaraty, Jacareí-SP, CEP-12.307-260";
            const address2 = "Tel-12-3951-1000  - E-mail - dig.jacarei@policiacivil.sp.gov.br";

            doc.text(address1, margin, footerY + 5);
            doc.text(address2, margin, footerY + 9);

            const todayStr = new Date().toLocaleDateString('pt-BR');
            doc.text(`Data: ${todayStr}`, pageWidth - margin, footerY + 5, { align: 'right' });
            doc.text("Página 1 de 1", pageWidth - margin, footerY + 9, { align: 'right' });

            if (officeId !== data.ifoodNumber) {
                const saveNum = window.confirm(`Deseja salvar o número do ofício '${officeId}' neste mandado?`);
                if (saveNum) {
                    await onUpdate(data.id, { ifoodNumber: officeId });
                }
            }

            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `Oficio_iFood_${officeId.replace(/\//g, '_')}.pdf`, { type: 'application/pdf' });

            const toastId = toast.loading("Salvando ofício no banco de dados...");
            try {
                const path = `ifoodDocs/${data.id}/${Date.now()}_${pdfFile.name}`;
                const uploadedPath = await uploadFile(pdfFile, path);
                if (uploadedPath) {
                    const url = getPublicUrl(uploadedPath);
                    const currentAttachments = data.attachments || [];
                    await onUpdate(data.id, { attachments: [...currentAttachments, url] });
                    toast.success("Ofício salvo no banco!", { id: toastId });
                }
            } catch (err) {
                console.error("Erro ao salvar PDF do iFood:", err);
                toast.error("Ofício gerado mas não pôde ser salvo no banco.", { id: toastId });
            }

            doc.save(`Oficio_IFood_${data.name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF iFood:", error);
            toast.error("Erro ao gerar Ofício iFood.");
        }
    };

    const handleOpenCapturasModal = () => {
        if (!data) return;

        const generateIntelligentReportBody = () => {
            const name = data.name.toUpperCase();
            const rg = data.rg || 'Não Informado';
            const process = data.number;
            const address = data.location || 'Endereço não informado';
            const history = data.diligentHistory || [];

            // Analyze history for keywords
            const fullHistoryText = history.map(h => h.notes.toLowerCase()).join(' ');
            const isMoved = fullHistoryText.includes('mudou') || fullHistoryText.includes('não mora') || fullHistoryText.includes('desconhece');
            const isEmpty = fullHistoryText.includes('vazio') || fullHistoryText.includes('fechado') || fullHistoryText.includes('aluga') || fullHistoryText.includes('vende');
            const isAnotherCity = address.toLowerCase().includes('são sebastião') || address.toLowerCase().includes('são josé dos campos') || (address.toLowerCase().includes('sp') && !address.toLowerCase().includes('jacareí'));

            // Template 1: Outra Cidade
            if (isAnotherCity) {
                return `Em cumprimento ao Mandado de Prisão Civil, referente ao Processo nº ${process}, pela obrigação de pensão alimentícia, foram realizadas consultas nos sistemas policiais para localização de ${name} nesta Comarca de Jacareí/SP.\n\nAs pesquisas não identificaram qualquer endereço ativo do executado no município, inexistindo dados recentes que indicassem residência ou vínculo local.\n\nEm retorno de diligência, registra-se que o próprio mandado indica o endereço ${address}, razão pela qual sugere-se o encaminhamento da ordem para aquela localidade, a fim de que a autoridade policial competente prossiga nas buscas.\n\nDiante disso, as diligências restaram negativas nesta Comarca.`;
            }

            // Template 2: Mudou-se / Desconhecido no local
            if (isMoved) {
                return `Em cumprimento ao mandato expedido nos autos do processo nº ${process}, em desfavor de ${name}, esta equipe procedeu a diligências no endereço indicado — ${address}.\n\nForam realizadas verificações em dias e horários distintos. Durante as diligências, foram entrevistados moradores atuais ou vizinhos, os quais relataram que o procurado não reside mais no local, ou é desconhecido, não sabendo informar seu atual paradeiro.\n\nAdicionalmente, foram efetuadas consultas nos sistemas policiais disponíveis, não sendo identificados novos endereços, vínculos ou informações que pudessem auxiliar na sua localização.\n\nDiante do exposto, as diligências restaram infrutíferas, não sendo obtidos elementos que permitam, até o presente momento, a localização do procurado.`;
            }

            // Template 3: Imóvel Vazio
            if (isEmpty) {
                return `Em cumprimento ao Mandado de Prisão Civil expedido nos autos do processo nº ${process}, esta equipe dirigiu-se ao endereço indicado: ${address}.\n\nForam efetuadas visitas em dias e horários distintos, constatando-se que o imóvel encontra-se fechado/desocupado (ou com placas de "aluga-se/vende-se"), sem qualquer movimentação que indicasse a presença de moradores ou ocupação regular da residência.\n\nConsultas atualizadas nos sistemas policiais também não apontaram novos endereços.\n\nAté o momento, não foram obtidos elementos que indiquem o paradeiro do procurado, permanecendo negativas as diligências.`;
            }

            // Template 4: Padrão Negativo (Genérico mas detalhado)
            return `Em cumprimento ao Mandado de Prisão Civil expedido nos autos do processo nº ${process}, referente à obrigação alimentar, foram realizadas diligências no endereço indicado pela Vara competente: ${address}.\n\nAs ações ocorreram em dias e horários distintos; contudo, em nenhuma das tentativas houve contato com o procurado, tampouco foi possível obter informações junto a vizinhos que pudessem auxiliar na sua localização exata.\n\nDiante do exposto, até o presente momento não foi possível cumprir o mandado, permanecendo negativas as diligências realizadas por esta equipe.`;
        };

        setCapturasData(prev => ({
            ...prev,
            reportNumber: data.fulfillmentReport || `001/DIG/${new Date().getFullYear()}`,
            court: '1ª Vara da Família e Sucessões de Jacareí/SP',
            body: generateIntelligentReportBody()
        }));
        setIsCapturasModalOpen(true);
    };

    const handleGenerateCapturasPDF = async () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let y = 15;

            // --- HEADER ---
            try {
                const badgePC = new Image();
                badgePC.src = './brasao_pcsp_nova.png';

                await new Promise((resolve) => {
                    badgePC.onload = () => resolve(true);
                    badgePC.onerror = () => {
                        badgePC.src = './brasao_pcsp_colorido.png';
                        badgePC.onload = () => resolve(true);
                        badgePC.onerror = () => resolve(false);
                    };
                });

                const imgProps = doc.getImageProperties(badgePC);
                const badgeH = 25;
                const badgeW = (imgProps.width * badgeH) / imgProps.height;

                doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                const textX = margin + badgeW + 5;
                const headerLines = [
                    "SECRETARIA DA SEGURANÇA PÚBLICA",
                    "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                    "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
                    "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                    "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
                    "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
                ];

                headerLines.forEach((line, index) => {
                    doc.text(line, textX, y + 4 + (index * 4));
                });

                // Solid line only - removed dashed line calls
                doc.setLineWidth(0.5);
                doc.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
                y += badgeH + 6; // Compressed spacing

            } catch (e) {
                console.error("Badge load error", e);
                y += 30;
            }

            // --- BLACK TITLE BAR ---
            doc.setFillColor(0, 0, 0);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("RELATÓRIO CAPTURAS", pageWidth / 2, y + 5, { align: 'center' });
            doc.setTextColor(0, 0, 0); // Reset Color
            y += 12;

            // --- METADATA ---
            doc.setFontSize(11);

            // Relatório Link & Date
            const today = new Date();
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const dateStr = `Jacareí, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

            doc.setFont('helvetica', 'bolditalic');
            doc.text(`Relatório: nº. ${capturasData.reportNumber}`, margin, y);

            doc.setFont('helvetica', 'italic');
            doc.text(dateStr, pageWidth - margin, y, { align: 'right' });
            y += 6;

            const metaFields = [
                { label: "Natureza:", value: data?.type || "Mandado de Prisão" },
                { label: "Referência:", value: `Processo nº. ${data?.number}` },
                { label: "Juízo de Direito:", value: capturasData.court },
                { label: "Réu:", value: data?.name }
            ];

            metaFields.forEach(field => {
                doc.setFont('helvetica', 'bolditalic');
                const labelWidth = doc.getTextWidth(field.label + " ");
                doc.text(field.label, margin, y);

                doc.setFont('helvetica', 'italic');
                doc.text(field.value, margin + labelWidth, y);
                y += 6;
            });
            y += 15;

            // --- ADDRESSEE ---
            doc.setFont('helvetica', 'bold'); // Not italic in image for this line
            doc.setFontSize(11);
            doc.text("Excelentíssimo Sr. Delegado de Polícia:", margin, y);
            y += 15;

            // --- BODY ---
            doc.setFont('helvetica', 'normal');
            const indent = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"; // 16 NBSP indent
            // Split by newline to preserve user's paragraphs
            const paragraphs = capturasData.body.split('\n');

            paragraphs.forEach(para => {
                if (!para.trim()) {
                    y += 3; // Minimal empty line spacing
                    return;
                }
                const indentedPara = indent + para.trim();
                const splitPara = doc.splitTextToSize(indentedPara, contentWidth);
                doc.text(splitPara, margin, y, { align: 'justify', maxWidth: contentWidth });
                y += (splitPara.length * 4.5) + 2; // Compact line height
            });
            y += 8;

            // --- CLOSING ---
            doc.setFont('helvetica', 'bold');
            doc.text("Respeitosamente,", pageWidth / 2, y, { align: 'center' });
            y += 25;

            // --- SIGNER ---
            // Removed page break check to force single page fit

            doc.setFont('helvetica', 'normal');
            doc.text(capturasData.signer, pageWidth - margin, y, { align: 'right' });
            y += 5;
            doc.setFont('helvetica', 'bolditalic'); // Looks italic/bold in image
            doc.text("Policial Civil", pageWidth - margin, y, { align: 'right' });

            // --- FOOTER DELEGATE + BOX ---
            // Calculate Box Y position (fixed at bottom)
            const boxHeight = 16;
            const bottomMargin = 15;
            const boxY = pageHeight - bottomMargin - boxHeight;

            // Delegate block position relative to box
            const delegateBlockY = boxY - 30; // Closer to box

            // Removed overlapping check to force single page

            // Draw Delegate (Left Bottom)
            doc.setFontSize(11);
            let dY = delegateBlockY;
            doc.setFont('helvetica', 'bolditalic');
            doc.text("Excelentíssimo Doutor", margin, dY);
            dY += 5;
            doc.text(capturasData.delegate, margin, dY);
            dY += 5;
            doc.text("Delegado de Polícia Titular", margin, dY);
            dY += 5;
            doc.text("Delegacia de Investigações Gerais de Jacareí", margin, dY);

            // --- DASHED BOX FOOTER ---
            (doc as any).setLineDash([1, 1], 0);
            doc.setLineWidth(0.1);
            doc.setDrawColor(100);
            doc.rect(margin, boxY, contentWidth, boxHeight);
            (doc as any).setLineDash([], 0); // Reset

            // Footer Text
            doc.setFont('times', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);

            const addr1 = "Rua Moisés Ruston, 370, Parque Itamaraty - Jacareí-SP - CEP. 12.307-260";
            const addr2 = "Telefone: (12) 3951-1000      E-mail: dig.jacarei@policiacivil.sp.gov.br";

            const midX = pageWidth * 0.7; // Divider position matches image (more space for address)
            const addrCenterX = margin + ((midX - margin) / 2);

            doc.text(addr1, addrCenterX, boxY + 6, { align: 'center' });
            doc.text(addr2, addrCenterX, boxY + 11, { align: 'center' });

            // Vertical Divider
            doc.line(midX, boxY + 3, midX, boxY + boxHeight - 3);

            // Right Side
            const rightCenterX = midX + ((pageWidth - margin - midX) / 2);
            const dateFooter = `Data (${today.toLocaleDateString('pt-BR')})`;
            const pageFooter = "Página 1 de 1";

            doc.text(dateFooter, rightCenterX, boxY + 6, { align: 'center' });
            doc.text(pageFooter, rightCenterX, boxY + 11, { align: 'center' });

            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `Relatorio_Capturas_${data.name}.pdf`, { type: 'application/pdf' });

            const toastId = toast.loading("Salvando relatório no banco de dados...");
            try {
                const path = `reports/${data.id}/${Date.now()}_${pdfFile.name}`;
                const uploadedPath = await uploadFile(pdfFile, path);
                if (uploadedPath) {
                    const url = getPublicUrl(uploadedPath);
                    const currentAttachments = data.attachments || [];
                    await onUpdate(data.id, { attachments: [...currentAttachments, url] });
                    toast.success("Relatório salvo no banco!", { id: toastId });
                }
            } catch (err) {
                console.error("Erro ao salvar PDF de Capturas:", err);
                toast.error("Relatório gerado mas não pôde ser salvo no banco.", { id: toastId });
            }

            doc.save(`Relatorio_Capturas_${data.name}.pdf`);
            setIsCapturasModalOpen(false);
            toast.success("Relatório de Capturas baixado!");
        } catch (error) {
            console.error("Erro ao gerar PDF Capturas:", error);
            toast.error("Erro ao gerar PDF.");
        }
    };



    return (
        <div className="min-h-screen pb-safe bg-background-light dark:bg-background-dark">
            <Header
                title="Detalhes do Mandado"
                back
                showHome
            />
            <div className="p-4 pb-4 space-y-4">

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
                            <textarea
                                className="text-lg font-bold bg-transparent border-none text-text-light dark:text-text-dark leading-tight w-full focus:ring-1 focus:ring-primary/20 rounded-md px-1 -ml-1 resize-none h-auto overflow-hidden whitespace-normal break-words"
                                value={localData.name || ''}
                                onChange={e => {
                                    handleFieldChange('name', e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                rows={2}
                                placeholder="Nome do Procurado"
                            />
                            <select
                                className="text-sm text-primary font-medium mt-1 bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1 cursor-pointer outline-none"
                                value={localData.type || ''}
                                onChange={e => handleFieldChange('type', e.target.value)}
                            >
                                <option value="MANDADO DE PRISÃO">MANDADO DE PRISÃO</option>
                                <option value="BUSCA E APREENSÃO">BUSCA E APREENSÃO</option>
                                <option value="MANDADO DE PRISÃO CIVIL">MANDADO DE PRISÃO CIVIL</option>
                                <option value="OUTRO">OUTRO</option>
                            </select>
                            <div className="mt-2">
                                <select
                                    className={`text-xs font-bold px-2 py-1 rounded inline-block cursor-pointer border-none focus:ring-2 focus:ring-primary/40 outline-none appearance-none ${localData.status === 'EM ABERTO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        localData.status === 'CUMPRIDO' || localData.status === 'PRESO' || localData.status === 'FINALIZADO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        }`}
                                    value={localData.status || ''}
                                    onChange={e => handleFieldChange('status', e.target.value)}
                                >
                                    <option value="EM ABERTO">EM ABERTO</option>
                                    <option value="CUMPRIDO">CUMPRIDO</option>
                                    <option value="PRESO">PRESO</option>
                                    <option value="FINALIZADO">FINALIZADO</option>
                                    <option value="PENDENTE">PENDENTE</option>
                                </select>
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
                            <input
                                className="text-sm font-mono text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.rg || ''}
                                onChange={e => handleFieldChange('rg', e.target.value)}
                                placeholder="Não Informado"
                            />
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">CPF</p>
                            <input
                                className="text-sm font-mono text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.cpf || ''}
                                onChange={e => handleFieldChange('cpf', e.target.value)}
                                placeholder="Não Informado"
                            />
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
                            <input
                                className="text-sm font-mono text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.number || ''}
                                onChange={e => handleFieldChange('number', e.target.value)}
                            />
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Crime</p>
                            <input
                                className="text-sm font-bold text-red-600 dark:text-red-400 bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.crime || ''}
                                onChange={e => handleFieldChange('crime', e.target.value)}
                                placeholder="Não Informado"
                            />
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Regime</p>
                            <input
                                className="text-sm font-bold text-red-600 dark:text-red-400 bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.regime || ''}
                                onChange={e => handleFieldChange('regime', e.target.value)}
                                placeholder="Não Informado"
                            />
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
                            <input
                                type="text"
                                className="text-sm text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.issueDate || ''}
                                onChange={e => handleFieldChange('issueDate', e.target.value)}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Entrada (Capturas)</p>
                            <input
                                type="text"
                                className="text-sm text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.entryDate || ''}
                                onChange={e => handleFieldChange('entryDate', e.target.value)}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Vencimento</p>
                            <input
                                type="text"
                                className="text-sm text-red-500 font-bold bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.expirationDate || ''}
                                onChange={e => handleFieldChange('expirationDate', e.target.value)}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Baixa</p>
                            <input
                                type="text"
                                className="text-sm text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.dischargeDate || ''}
                                onChange={e => handleFieldChange('dischargeDate', e.target.value)}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <MapPin size={18} className="text-primary" /> Localização
                        </h3>
                        {data.latitude && data.longitude ? (
                            <span className="text-[10px] bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full font-bold">MAPEADO</span>
                        ) : (
                            <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-bold">NÃO MAPEADO</span>
                        )}
                    </div>

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
                            <textarea
                                className="text-sm text-text-light dark:text-text-dark font-medium bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1 resize-none"
                                value={localData.location || ''}
                                rows={2}
                                onChange={e => handleFieldChange('location', e.target.value)}
                                placeholder="Endereço não informado"
                            />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                title="Recalcular Geolocalização"
                                onClick={async () => {
                                    const addr = localData.location || data.location;
                                    if (!addr) return toast.error("Informe um endereço primeiro");
                                    const tid = toast.loading("Buscando coordenadas...");
                                    const res = await geocodeAddress(addr);
                                    if (res) {
                                        await onUpdate(data.id, { latitude: res.lat, longitude: res.lng });
                                        toast.success("Mapa atualizado!", { id: tid });
                                    } else {
                                        toast.error("Endereço não encontrado no mapa", { id: tid });
                                    }
                                }}
                                className="flex items-center justify-center bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm w-10 h-10 rounded-lg text-amber-600 hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
                            >
                                <RotateCcw size={18} />
                            </button>
                            <button
                                title="Abrir Mapa"
                                onClick={() => data.location && window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`, '_blank')}
                                className="flex items-center justify-center bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm w-10 h-10 rounded-lg text-primary hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
                            >
                                <Map size={18} />
                            </button>
                            <button
                                title={routeWarrants.includes(data.id) ? "Remover da Rota" : "Adicionar à Rota"}
                                onClick={() => onRouteToggle?.(data.id)}
                                className={`flex items-center justify-center border shadow-sm w-10 h-10 rounded-lg transition-all active:scale-95 ${routeWarrants.includes(data.id)
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                                    }`}
                            >
                                <RouteIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <Bike size={18} className="text-primary" /> Investigação
                        </h3>
                        <div className="flex flex-wrap gap-2 justify-end mb-3">
                            <label
                                htmlFor="ifood-upload"
                                className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
                            >
                                <Paperclip size={14} />
                                ANEXAR OFÍCIO IFOOD
                                <input
                                    id="ifood-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleAttachFile(e, 'ifoodDocs')}
                                    disabled={isUploadingFile}
                                />
                            </label>
                            <button
                                onClick={handleGenerateIFoodReport}
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                            >
                                <Zap size={14} />
                                GERAR OFÍCIO IFOOD
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Ofício iFood nº</p>
                            <input
                                className="text-sm font-mono text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.ifoodNumber || ''}
                                onChange={e => handleFieldChange('ifoodNumber', e.target.value)}
                                placeholder="Não Informado"
                            />
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Resultado iFood</p>
                            <div className="relative">
                                <textarea
                                    className="text-sm text-text-light dark:text-text-dark bg-gray-50 dark:bg-white/5 p-2 pr-10 rounded mt-1 border border-border-light dark:border-border-dark w-full focus:ring-1 focus:ring-primary/20 outline-none resize-none"
                                    rows={2}
                                    value={localData.ifoodResult || ''}
                                    onChange={e => handleFieldChange('ifoodResult', e.target.value)}
                                    placeholder="Sem resultado"
                                />
                                <div className="absolute right-2 top-2">
                                    <VoiceInput onTranscript={(text) => handleFieldChange('ifoodResult', text)} currentValue={localData.ifoodResult || ''} className="scale-75" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold">Ofício DIG</p>
                            <input
                                className="text-sm text-text-light dark:text-text-dark bg-transparent border-none w-full focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                value={localData.digOffice || ''}
                                onChange={e => handleFieldChange('digOffice', e.target.value)}
                                placeholder="Não Informado"
                            />
                        </div>

                        {data.attachments && data.attachments.some(doc => doc.includes('/ifoodDocs/')) && (
                            <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                                <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase font-bold mb-2">Ofícios iFood Anexados</p>
                                <ul className="space-y-2">
                                    {data.attachments
                                        .filter(doc => doc.includes('/ifoodDocs/'))
                                        .map((doc, idx) => {
                                            const isUrl = doc.startsWith('http');
                                            return (
                                                <li key={idx} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30 group hover:border-amber-500/50 transition-colors">
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                                                        onClick={() => isUrl ? window.open(doc, '_blank') : toast.info(`Referência: ${doc}`)}>
                                                        <Paperclip size={14} className="text-amber-600 shrink-0" />
                                                        <span className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">
                                                            {doc.split('/').pop()?.split('_').slice(1).join('_') || `Ofício iFood ${idx + 1}`}
                                                        </span>
                                                    </div>
                                                    {isUrl && (
                                                        <a href={doc} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                                                            ABRIR
                                                        </a>
                                                    )}
                                                </li>
                                            );
                                        })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                            <FileCheck size={18} className="text-primary" /> Relatórios
                        </h3>
                        <div className="flex flex-wrap gap-2 justify-end mb-3">
                            <label className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-blue-500/20 cursor-pointer">
                                <Plus size={14} />
                                ANEXAR RELATÓRIO
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleAttachFile(e, 'reports')}
                                    disabled={isUploadingFile}
                                />
                            </label>
                            <button
                                onClick={handleOpenCapturasModal}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                            >
                                <FileText size={14} />
                                GERAR RELATÓRIO CAPTURAS
                            </button>
                        </div>
                        {data.attachments && data.attachments.some(report => report.includes('/reports/')) ? (
                            <ul className="space-y-2">
                                {data.attachments
                                    .filter(report => report.includes('/reports/'))
                                    .map((report, idx) => {
                                        const isUrl = report.startsWith('http');
                                        return (
                                            <li key={idx}
                                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-border-light dark:border-border-dark group hover:border-primary/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                                                    onClick={() => isUrl ? window.open(report, '_blank') : toast.info(`Arquivo de referência: ${report}. Anexe o PDF para visualizar.`)}>
                                                    <FileText size={14} className="text-primary shrink-0" />
                                                    <div className="flex flex-col truncate">
                                                        <span className="text-xs font-bold text-text-light dark:text-text-dark whitespace-nowrap">Relatório #{idx + 1}</span>
                                                        <span className="text-[9px] text-text-secondary-light truncate">
                                                            {report.split('/').pop()?.split('_').pop() || report}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isUrl ? (
                                                    <a
                                                        href={report}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-bold text-primary hover:underline bg-primary/10 px-2 py-1 rounded shrink-0"
                                                    >
                                                        VER PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-[9px] text-gray-400 font-medium">REFERÊNCIA</span>
                                                )}
                                            </li>
                                        );
                                    })}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400">Nenhum relatório.</p>
                        )}
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                                <Paperclip size={18} className="text-primary" /> Anexos Gerais
                            </h3>
                            <label htmlFor="detail-attach-upload" className="bg-gray-600 hover:bg-gray-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-gray-500/20 cursor-pointer">
                                <Plus size={14} />
                                ANEXAR
                                <input
                                    id="detail-attach-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleAttachFile(e, 'attachments')}
                                    disabled={isUploadingFile}
                                />
                            </label>
                        </div>
                        {data.attachments && data.attachments.filter(att =>
                            !(data.reports || []).includes(att) &&
                            !att.includes('/ifoodDocs/')
                        ).length > 0 ? (
                            <ul className="space-y-2">
                                {data.attachments
                                    .filter(att =>
                                        !(data.reports || []).includes(att) &&
                                        !att.includes('/ifoodDocs/')
                                    )
                                    .map((att, idx) => {
                                        const isUrl = att.startsWith('http');
                                        return (
                                            <li key={idx}
                                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-border-light dark:border-border-dark group hover:border-primary/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                                                    onClick={() => isUrl ? window.open(att, '_blank') : toast.info(`Arquivo de referência: ${att}. Anexe o PDF para visualizar.`)}>
                                                    <Paperclip size={14} className="text-primary shrink-0" />
                                                    <div className="flex flex-col truncate">
                                                        <span className="text-xs font-medium text-text-light dark:text-text-dark truncate">
                                                            {att.split('/').pop()?.split('_').slice(1).join('_') || att}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isUrl ? (
                                                    <a
                                                        href={att}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-bold text-primary hover:underline bg-primary/10 px-2 py-1 rounded shrink-0"
                                                    >
                                                        ABRIR
                                                    </a>
                                                ) : (
                                                    <span className="text-[9px] text-gray-400 font-medium">REFERÊNCIA</span>
                                                )}
                                            </li>
                                        );
                                    })}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400">Nenhum anexo geral.</p>
                        )}
                    </div>
                </div>

                {data.tacticalSummary && data.tacticalSummary.length > 0 && (
                    <div className="bg-red-50 dark:bg-slate-900 border border-red-100 dark:border-indigo-500/30 p-4 rounded-xl shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <ShieldAlert size={60} />
                        </div>
                        <h3 className="font-bold text-red-700 dark:text-indigo-400 mb-3 flex items-center gap-2 relative z-10">
                            <Bot size={18} className="text-indigo-500" /> Inteligência Analítica (IA)
                        </h3>

                        <div className="space-y-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Sinais Táticos Coletados</p>
                                <div className="flex flex-wrap gap-2">
                                    {data.tacticalSummary.map((tag, idx) => (
                                        <span key={idx} className="bg-red-100 text-red-700 dark:bg-indigo-500/10 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-indigo-500/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {aiTimeSuggestion && (
                                <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-white/10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Sugestão de Janela Operacional</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${aiTimeSuggestion.confidence === 'Muito Alta' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'}`}>
                                            CONFIANÇA: {aiTimeSuggestion.confidence.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{aiTimeSuggestion.suggestion}</p>
                                    <p className="text-[10px] text-slate-500 mt-1"><b>RACIOCÍNIO:</b> {aiTimeSuggestion.reason}</p>
                                </div>
                            )}

                            <Link
                                to="/intel"
                                className="flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all active:scale-[0.98] group"
                            >
                                <div>
                                    <p className="font-bold text-sm">Ver no Radar de Inteligência</p>
                                    <p className="text-[10px] opacity-80 uppercase font-bold">Análise de Vínculos e Mapa de Calor</p>
                                </div>
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                )}

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
                        <div>
                            <div className="relative">
                                <textarea
                                    value={newDiligence}
                                    onChange={(e) => setNewDiligence(e.target.value)}
                                    placeholder="Relate o que foi observado, pessoas que falaram com a equipe, ou inteligência obtida..."
                                    className="w-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 pr-12 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                />
                                <div className="absolute right-3 top-3">
                                    <VoiceInput onTranscript={(text) => setNewDiligence(text)} currentValue={newDiligence} />
                                </div>
                            </div>
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
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                        <MessageSquare size={18} className="text-primary" /> Observações
                    </h3>
                    <textarea
                        className="w-full bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark rounded-lg p-3 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none resize-none min-h-[120px]"
                        value={localData.observation || ''}
                        onChange={e => handleFieldChange('observation', e.target.value)}
                        placeholder="Adicione observações importantes aqui..."
                    />
                </div>
            </div>

            {/* Sticky Save Changes Bar */}
            {
                hasChanges && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-lg border-t border-border-light dark:border-border-dark z-40 flex gap-3 animate-in slide-in-from-bottom duration-300">
                        <button
                            onClick={handleCancelEdits}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:opacity-90 transition-opacity"
                        >
                            Descartar
                        </button>
                        <button
                            onClick={() => setIsConfirmSaveOpen(true)}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={20} />
                            SALVAR ALTERAÇÕES
                        </button>
                    </div>
                )
            }

            {isAdmin && (
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark mt-4">
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                        <History size={18} className="text-primary" /> Histórico de Alterações (Admin)
                    </h3>
                    <WarrantAuditLog warrantId={data.id} />
                </div>
            )}

            {/* Modals */}
            <ConfirmModal
                isOpen={isConfirmSaveOpen}
                onCancel={() => setIsConfirmSaveOpen(false)}
                onConfirm={handleSaveChanges}
                title="Salvar Alterações"
                message="Deseja salvar todas as modificações feitas nos detalhes deste mandado?"
                confirmText="SALVAR AGORA"
                cancelText="CANCELAR"
                variant="primary"
            />

            {/* Bottom Action Bar (Non-fixed) */}
            <div className="mt-8 mb-4 p-2 sm:p-4 bg-surface-light/50 dark:bg-surface-dark/50 rounded-2xl border border-border-light dark:border-border-dark">
                <div className="max-w-md mx-auto flex items-stretch gap-2">
                    <Link
                        to="/"
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 transition-all active:scale-95 touch-manipulation hover:bg-gray-500/20"
                    >
                        <Home size={18} />
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">Início</span>
                    </Link>

                    <Link
                        to={`/new-warrant?edit=${data.id}`}
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-primary/10 text-primary transition-all active:scale-95 touch-manipulation hover:bg-primary/20"
                    >
                        <Edit size={18} />
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">Editar</span>
                    </Link>


                    <button
                        onClick={data.status === 'CUMPRIDO' ? handleReopen : handleFinalize}
                        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all active:scale-95 touch-manipulation ${data.status === 'CUMPRIDO'
                            ? 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/20'
                            : 'bg-green-600/10 text-green-600 hover:bg-green-600/20'
                            }`}
                    >
                        {data.status === 'CUMPRIDO' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">{data.status === 'CUMPRIDO' ? 'REABRIR' : 'FECHAR'}</span>
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 touch-manipulation hover:bg-indigo-700"
                    >
                        <Printer size={18} />
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">FICHA COMPLETA</span>
                    </button>

                    <button
                        onClick={handleDelete}
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-red-500/10 text-red-500 transition-all active:scale-95 touch-manipulation hover:bg-red-500/20"
                    >
                        <Trash2 size={18} />
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">APAGAR</span>
                    </button>
                </div>
            </div >

            {
                isReopenConfirmOpen && (
                    <ConfirmModal
                        isOpen={isReopenConfirmOpen}
                        title="Reabrir Mandado"
                        message="Deseja alterar o status deste mandado para EM ABERTO?"
                        onConfirm={handleConfirmReopen}
                        onCancel={() => setIsReopenConfirmOpen(false)}
                        confirmText="reabrir"
                        cancelText="cancelar"
                    />
                )
            }

            {
                tagToRemove && (
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
                )
            }
            {
                isDeleteConfirmOpen && (
                    <ConfirmModal
                        isOpen={isDeleteConfirmOpen}
                        title="Excluir Permanentemente"
                        message="TEM CERTEZA que deseja EXCLUIR este mandado permanentemente? Esta ação não pode ser desfeita."
                        onConfirm={handleConfirmDelete}
                        onCancel={() => setIsDeleteConfirmOpen(false)}
                        confirmText="Excluir"
                        variant="danger"
                    />
                )
            }

            {
                isFinalizeModalOpen && (
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
                )
            }
            {
                isPhotoModalOpen && (
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
                )
            }

            {
                isCapturasModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl w-full max-w-2xl shadow-2xl border border-border-light dark:border-border-dark animate-in fade-in zoom-in duration-200">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                                    <FileText size={24} className="text-primary" />
                                    Gerar Relatório de Capturas
                                </h3>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Número do Relatório</label>
                                            <input
                                                type="text"
                                                value={capturasData.reportNumber}
                                                onChange={e => setCapturasData({ ...capturasData, reportNumber: e.target.value })}
                                                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Juízo de Direito</label>
                                            <input
                                                type="text"
                                                value={capturasData.court}
                                                onChange={e => setCapturasData({ ...capturasData, court: e.target.value })}
                                                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Corpo do Relatório</label>
                                        <textarea
                                            value={capturasData.body}
                                            onChange={e => setCapturasData({ ...capturasData, body: e.target.value })}
                                            rows={8}
                                            className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none resize-none text-sm leading-relaxed"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Policial Responsável</label>
                                            <input
                                                type="text"
                                                value={capturasData.signer}
                                                onChange={e => setCapturasData({ ...capturasData, signer: e.target.value })}
                                                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Delegado Titular</label>
                                            <input
                                                type="text"
                                                value={capturasData.delegate}
                                                onChange={e => setCapturasData({ ...capturasData, delegate: e.target.value })}
                                                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => setIsCapturasModalOpen(false)}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:opacity-90 transition-opacity"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleGenerateCapturasPDF}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FileCheck size={20} />
                                        GERAR PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default WarrantDetail;
