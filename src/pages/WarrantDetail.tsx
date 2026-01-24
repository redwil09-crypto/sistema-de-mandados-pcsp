
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
    AlertCircle, User, Gavel, Calendar, MapPin, Map as MapIcon, Home,
    Bike, FileCheck, FileText, Paperclip, Edit,
    Route as RouteIcon, RotateCcw, CheckCircle, Printer,
    Trash2, Zap, Bell, Eye, History, Send, Copy,
    ShieldAlert, MessageSquare, Plus, PlusCircle, X, ChevronRight, Bot, Cpu, Sparkles, RefreshCw, AlertTriangle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import Header from '../components/Header';
import ConfirmModal from '../components/ConfirmModal';
import VoiceInput from '../components/VoiceInput';
import WarrantAuditLog from '../components/WarrantAuditLog';
import { formatDate, getStatusColor, maskDate } from '../utils/helpers';
import { Warrant } from '../types';
import { geocodeAddress } from '../services/geocodingService';
import { generateWarrantPDF, generateIfoodOfficePDF } from '../services/pdfReportService';
import { analyzeRawDiligence, generateReportBody } from '../services/geminiService';
import { CRIME_OPTIONS, REGIME_OPTIONS } from '../data/constants';
import { useWarrants } from '../contexts/WarrantContext';

const WarrantDetail = () => {
    const { warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant } = useWarrants();
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
    const [isDraftOpen, setIsDraftOpen] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isAnalyzingDiligence, setIsAnalyzingDiligence] = useState(false);
    const [aiDiligenceResult, setAiDiligenceResult] = useState<string | null>(null);
    const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);

    const [activeDetailTab, setActiveDetailTab] = useState<'documents' | 'reports' | 'investigation' | 'timeline'>('documents');
    const [isCapturasModalOpen, setIsCapturasModalOpen] = useState(false);
    const [capturasData, setCapturasData] = useState({
        reportNumber: '',
        court: '',
        body: '',
        signer: 'William Campos A. Castro',
        delegate: 'Luiz Antônio Cunha dos Santos',
        aiInstructions: ''
    });
    const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);

    const data = useMemo(() => warrants.find(w => w.id === id), [warrants, id]);

    const [localData, setLocalData] = useState<Partial<Warrant>>({});
    const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                if (user.user_metadata?.role === 'admin') {
                    setIsAdmin(true);
                }
            }
        };
        checkAdmin();
    }, []);

    useEffect(() => {
        if (data) {
            setLocalData({
                ...data,
                birthDate: formatDate(data.birthDate),
                issueDate: formatDate(data.issueDate),
                entryDate: formatDate(data.entryDate),
                expirationDate: formatDate(data.expirationDate),
                dischargeDate: formatDate(data.dischargeDate),
            });
        }
    }, [data]);

    const hasChanges = useMemo(() => {
        if (!data) return false;
        const fields: (keyof Warrant)[] = [
            'name', 'type', 'rg', 'cpf', 'number', 'crime', 'regime', 'location',
            'ifoodNumber', 'ifoodResult', 'digOffice', 'observation', 'age'
        ];

        const basicChanges = fields.some(key => localData[key] !== data[key]);
        if (basicChanges) return true;

        const dateFields: (keyof Warrant)[] = [
            'issueDate', 'entryDate', 'expirationDate', 'dischargeDate', 'birthDate'
        ];

        return dateFields.some(key => {
            const localVal = localData[key] ? formatDate(localData[key] as string) : '';
            const dataVal = data[key] ? formatDate(data[key] as string) : '';
            return localVal !== dataVal;
        });
    }, [localData, data]);

    // Pre-fill report body when modal opens
    useEffect(() => {
        if (isCapturasModalOpen && data && !capturasData.body) {
            handleResetReportData();
        }
    }, [isCapturasModalOpen, data]);

    const buildComprehensiveReportContext = (currentData: Warrant & Partial<Warrant>) => {
        // Formatter helper
        const fmtDate = (d: string) => {
            if (!d) return 'N/I';
            if (d.includes('/')) return d;
            const [y, m, day] = d.split('-');
            return `${day}/${m}/${y}`;
        }

        const historyArray = Array.isArray(currentData.diligentHistory) ? currentData.diligentHistory : [];
        const historyText = historyArray
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(h => `[${fmtDate(h.date)}] ${h.notes} (Tipo: ${h.type || 'Geral'})`)
            .join('\n');

        return `
            DADOS DO PROCESSO:
            - Alvo: ${currentData.name} (RG: ${currentData.rg || 'N/I'}, CPF: ${currentData.cpf || 'N/I'})
            - Processo: ${currentData.number}
            - Vara/Fórum: ${(currentData as any).court || capturasData.court || 'Não especificado'}
            - Crime: ${currentData.crime}
            - Pena/Regime: ${currentData.regime || 'N/I'}
            - Data Expedição: ${currentData.issueDate ? fmtDate(currentData.issueDate as string) : 'N/I'}
            - Validade: ${currentData.expirationDate ? fmtDate(currentData.expirationDate as string) : 'N/I'}

            LOCALIZAÇÃO DO ALVO:
            - Endereço Cadastrado: ${currentData.location}
            - Coordenadas: ${currentData.latitude}, ${currentData.longitude}

            HISTÓRICO OPERACIONAL (DILIGÊNCIAS):
            ${historyText || 'Nenhuma diligência registrada no sistema ainda.'}

            OBSERVAÇÕES DE INTELIGÊNCIA:
            ${currentData.observation || 'Nenhuma observação registrada.'}

            OUTROS DADOS:
            - Status Atual: ${currentData.status}
            - Resultado iFood: ${currentData.ifoodResult || 'N/A'}
        `.replace(/^\s+/gm, '').trim();
    };

    const handleResetReportData = async () => {
        if (!data) return;
        const currentData = { ...data, ...localData } as Warrant & Partial<Warrant>;
        const context = buildComprehensiveReportContext(currentData);

        const defaultBody = `RELATÓRIO DE INVESTIGAÇÃO\n\n${context}\n\nCONCLUSÃO:\n[Aguardando análise...]`;

        setCapturasData(prev => ({
            ...prev,
            body: defaultBody,
            reportNumber: currentData.fulfillmentReport || prev.reportNumber || `001/DIG/${new Date().getFullYear()}`,
            court: prev.court || 'Vara Criminal de Jacareí/SP'
        }));

        // Auto-run AI to apply templates immediately
        setIsGeneratingAiReport(true);
        const toastId = toast.loading("🤖 Aplicando modelo de Escrivão de Elite...");

        try {
            const rawContent = `${context}\n\nRASCUNHO INICIAL:\n${defaultBody}`;

            const result = await generateReportBody(currentData, rawContent, 'Aplicar estritamente o manual de modelos.');

            if (result && !result.startsWith("Erro")) {
                setCapturasData(prev => ({ ...prev, body: result }));
                toast.success("Relatório gerado com sucesso!", { id: toastId });
            } else {
                toast.error("IA falhou, mantendo rascunho.", { id: toastId });
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Erro na geração automática.", { id: toastId });
        } finally {
            setIsGeneratingAiReport(false);
        }
    };

    const handleRefreshAiReport = async () => {
        if (!data) return;
        setIsGeneratingAiReport(true);
        const toastId = toast.loading("🤖 Analisando todo o caso e redigindo...");

        try {
            const currentData = { ...data, ...localData } as Warrant & Partial<Warrant>;
            const fullContext = buildComprehensiveReportContext(currentData);

            const rawContent = `
                ${fullContext}

                RASCUNHO/TEXTO ATUAL DO AGENTE:
                ${capturasData.body}
            `;

            const result = await generateReportBody(currentData, rawContent, capturasData.aiInstructions);

            if (result && !result.startsWith("Erro ao processar")) {
                setCapturasData(prev => ({ ...prev, body: result }));
                toast.success("Relatório gerado com sucesso!", { id: toastId });
            } else {
                toast.error(result || "Falha ao gerar texto.", { id: toastId });
            }
        } catch (error: any) {
            console.error("AI Refresh Error:", error);
            toast.error(`Erro: ${error.message || 'Falha na comunicação'}`, { id: toastId });
        } finally {
            setIsGeneratingAiReport(false);
        }
    };

    const handleFieldChange = (field: keyof Warrant, value: any) => {
        let finalValue = value;
        // Apply masks for dates
        if (['issueDate', 'entryDate', 'expirationDate', 'dischargeDate', 'birthDate'].includes(field as string)) {
            finalValue = maskDate(value);
        }

        setLocalData(prev => {
            const newState = { ...prev, [field]: finalValue };

            // Auto-calculate age if birthDate changes
            if (field === 'birthDate') {
                const birthStr = finalValue;
                let birth: Date | null = null;
                if (birthStr && birthStr.length === 10) {
                    const [d, m, y] = birthStr.split('/');
                    birth = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                }

                if (birth && !isNaN(birth.getTime()) && birth.getFullYear() > 1900) {
                    const today = new Date();
                    let age = today.getFullYear() - birth.getFullYear();
                    const m = today.getMonth() - birth.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                    newState.age = `${age} anos`;
                } else {
                    newState.age = '';
                }
            }

            return newState;
        });
    };

    const handleSaveChanges = async () => {
        if (!data) return;

        // Extract only changed fields to send to updateWarrant
        const updates: Partial<Warrant> = {};
        const fields: (keyof Warrant)[] = [
            'name', 'type', 'rg', 'cpf', 'number', 'crime', 'regime',
            'location', 'ifoodNumber', 'ifoodResult', 'digOffice',
            'issueDate', 'entryDate', 'expirationDate', 'dischargeDate', 'observation',
            'status', 'fulfillmentResult', 'fulfillmentReport', 'latitude', 'longitude',
            'tacticalSummary', 'tags', 'birthDate', 'age'
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

        const success = await updateWarrant(data.id, updates);
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

        // 1. Consolidação de Informações (Observações + Histórico de Investigação + iFood)
        const historyNotes = (data.diligentHistory || []).map(h => h.notes).join(' ');
        const rawObservation = localData.observation || data.observation || '';
        const combinedIntel = `${rawObservation} ${historyNotes} ${data.ifoodResult || ''}`.toLowerCase();

        // 2. Variáveis de Saída (Heurística Policial)
        let suggestion = "Início da Manhã (05:45 - 06:30)";
        let reason = "Padrão operacional padrão para maximizar surpresa e segurança jurídica (art. 5º XI CF).";
        let strategy = "Cerco perimetral; abordagem silenciosa; conferência de via de fuga nos fundos.";
        let confidence = "Média";

        // 3. EXTRAÇÃO DE HORÁRIOS (REGEX AVANÇADO)
        // Detecta: "chega por volta das 19", "sai às 6", "visto 22:30", "15hs na frente", etc.
        const timeRegex = /(?:[àa]s|ás|pelas?|cerca\s+de|chega\s+|sai\s+|visto\s+|movimentação\s+|as\s*|na\s*)\s*(\d{1,2})(?:[h:]|[:\s]?(?:hs|horas?|hrs|min))(\d{2})?\b/gi;
        const matches = [...combinedIntel.matchAll(timeRegex)];

        if (matches.length > 0) {
            // Pega o último horário citado (geralmente o informe mais recente)
            const lastMatch = matches[matches.length - 1];
            const hour = parseInt(lastMatch[1]);
            const minutes = lastMatch[2] || '00';
            const caughtTime = `${hour.toString().padStart(2, '0')}:${minutes}`;

            if (hour >= 19 || hour <= 4) {
                suggestion = `Janela Noturna / Retorno (${caughtTime})`;
                reason = `Informes de campo indicam presença ou chegada do alvo no período noturno (${caughtTime}).`;
                strategy = "Vigilância velada por 30min antes do horário; interceptação preferencialmente no desembarque do veículo.";
                confidence = "Alta";
            } else if (hour >= 5 && hour <= 8) {
                suggestion = `Saída Antecipada (${caughtTime})`;
                reason = `Alvo demonstra hábito de saída ou movimentação matinal flagrada em diligência por volta das ${caughtTime}.`;
                strategy = "Posicionamento tático às 05:00; bloquear saída de garagem para evitar perseguição.";
                confidence = "Alta";
            } else {
                suggestion = `Horário Crítico Citado: ${caughtTime}`;
                reason = `Diligências apontam este horário específico como ponto recorrente de presença do alvo no imóvel.`;
                strategy = "Abordagem cirúrgica no horário de presença confirmada; equipe em dois níveis (entrada e contenção).";
                confidence = "Alta";
            }
        }

        // 4. ANÁLISE DE PERFIL E RISCO (PENSAMENTO TÁTICO)
        // O sistema deve ler "entre as linhas" de termos policiais

        // A. Perfil Fugitivo / Esperto
        if (combinedIntel.includes('olheiro') || combinedIntel.includes('fuga') || combinedIntel.includes('câmera') || combinedIntel.includes('monitora')) {
            strategy = "EQUIPE DE ELITE: Uso de veículos descaracterizados; infiltração a pé; neutralização de câmeras/olheiros antes da incursão principal.";
            reason += " Alvo monitora a rua ou possui sistema de alerta prévio.";
        }

        // B. Perfil Violento / Resistência
        if (combinedIntel.includes('arma') || combinedIntel.includes('ameaça') || combinedIntel.includes('violento') || combinedIntel.includes('perigoso') || combinedIntel.includes('facção')) {
            strategy = "FORÇA MÁXIMA: Escudo balístico; arrombamento tático imediato (breaching); contenção de curta distância.";
            reason += " Alta periculosidade detectada; risco de resistência armada.";
            confidence = "Muito Alta";
        }

        // C. Perfil Trabalho / Rotina
        if (combinedIntel.includes('trabalha') || combinedIntel.includes('serviço') || combinedIntel.includes('ubereats') || combinedIntel.includes('entregador')) {
            if (!suggestion.includes('Horário')) {
                suggestion = "Pós-Horário Comercial (18:45 - 20:15)";
                reason = "Alvo possui rotina de trabalho externo; baixa probabilidade de presença durante o dia.";
                strategy = "Campana para confirmar entrada no imóvel; abordagem na chave.";
            }
        }

        // D. Perfil Familiar (Zelo Operacional)
        if (combinedIntel.includes('criança') || combinedIntel.includes('filho') || combinedIntel.includes('escola') || combinedIntel.includes('bebê')) {
            strategy += " [CUIDADO: Presença de menores no local. Priorizar abordagem externa ou negociação calma se possível para evitar trauma].";
        }

        // E. Dados do iFood (Padrão de Consumo)
        if (data.ifoodResult && data.ifoodResult.length > 30) {
            if (confidence !== "Alta") {
                suggestion = combinedIntel.includes('almoço') ? "Intervalo de Almoço (12:00 - 13:00)" : "Jantar / Pedidos (19:30 - 21:00)";
                reason = "Frequência de pedidos delivery sugere presença fixa para recebimento no imóvel nestas janelas.";
                strategy = "Simular entrega de aplicativo para facilitar abertura do portão ou porta principal.";
                confidence = "Alta";
            }
        }

        // 5. Ajuste de Prioridade caso seja B.A (Busca e Apreensão)
        if (data.type?.includes('BUSCA')) {
            strategy = "Busca minuciosa: Focar em celulares, anotações de tráfico e fundos falsos; manter alvo algemado em local seguro durante revista.";
        }

        return { suggestion, confidence, reason, strategy };
    }, [data, localData.observation, data?.diligentHistory?.length]);

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
        const success = await updateWarrant(data.id, {
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
        const success = await updateWarrant(data.id, {
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
        const success = await updateWarrant(data.id, { tags: updatedTags });
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
            type: 'intelligence' // Tipo padrão já que os botões foram removidos
        };

        const updatedHistory = [...(data.diligentHistory || []), entry];
        const success = await updateWarrant(data.id, { diligentHistory: updatedHistory });

        if (success) {
            setNewDiligence('');
            setAiDiligenceResult(null);
            toast.success("Informação registrada na linha do tempo.");
        }
    };

    const handleAnalyzeDiligence = async () => {
        if (!newDiligence.trim() || !data) {
            toast.error("Insira informações para análise.");
            return;
        }

        setIsAnalyzingDiligence(true);
        const tid = toast.loading("Antigravity processando análise estratégica...");
        try {
            const result = await analyzeRawDiligence(data, newDiligence);
            if (result) {
                setAiDiligenceResult(result);
                toast.success("Análise estratégica concluída!", { id: tid });
            } else {
                toast.error("IA indisponível no momento.", { id: tid });
            }
        } catch (error) {
            console.error("Gemini Error:", error);
            toast.error("Erro na comunicação com a IA.", { id: tid });
        } finally {
            setIsAnalyzingDiligence(false);
        }
    };

    const handleDeleteDiligence = async (diligenceId: string) => {
        const updatedHistory = (data.diligentHistory || []).filter(h => h.id !== diligenceId);
        const success = await updateWarrant(data.id, { diligentHistory: updatedHistory });
        if (success) {
            toast.success("Diligência removida.");
        }
    };



    const getReportText = () => {
        if (aiDiligenceResult) return aiDiligenceResult; // Use AI result if available

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

    const handleDownloadReportPDF = async () => {
        const doc = new jsPDF();
        const text = getReportText();
        const splitText = doc.splitTextToSize(text, 180);
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.text(splitText, 15, 20);

        // Save locally
        doc.save(`Relatorio_DIG_${data.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF do relatório baixado!");

        // Auto-save to attachments
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Relatorio_Diligencia_${Date.now()}.pdf`, { type: 'application/pdf' });

        const toastId = toast.loading("Salvando relatório no prontuário...");
        try {
            const path = `reports/${data.id}/${Date.now()}_Relatorio_Diligencia.pdf`;
            const uploadedPath = await uploadFile(pdfFile, path);
            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                const currentAttachments = data.attachments || [];
                await updateWarrant(data.id, { attachments: [...currentAttachments, url] });
                toast.success("Relatório anexado ao histórico!", { id: toastId });
            }
        } catch (err) {
            console.error("Erro ao auto-salvar relatório:", err);
            toast.error("Erro ao salvar relatório no banco.", { id: toastId });
        }
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
                const success = await updateWarrant(data.id, { attachments: [...currentAttachments, url] });
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

    const handleDeleteAttachment = async (urlToDelete: string) => {
        if (!data) return;

        const confirmResult = window.confirm("Tem certeza que deseja excluir este documento?");
        if (!confirmResult) return;

        const updatedAttachments = (data.attachments || []).filter(url => url !== urlToDelete);
        const updatedReports = (data.reports || []).filter(url => url !== urlToDelete);

        const success = await updateWarrant(data.id, {
            attachments: updatedAttachments,
            reports: updatedReports
        });

        if (success) {
            toast.success("Documento excluído com sucesso!");
        } else {
            toast.error("Erro ao excluir documento.");
        }
    };

    const handleGenerateIfoodOffice = async () => {
        if (!data) return;
        const toastId = toast.loading("Gerando Ofício iFood...");
        try {
            await generateIfoodOfficePDF(data, updateWarrant);
            toast.dismiss(toastId);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao gerar ofício", { id: toastId });
        }
    };


    const handleDelete = () => {
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        const success = await deleteWarrant(data.id);
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
        await generateWarrantPDF(data, updateWarrant, aiTimeSuggestion);
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
                    await updateWarrant(data.id, { ifoodNumber: officeId });
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
                    await updateWarrant(data.id, { attachments: [...currentAttachments, url] });
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

        // Use localData (current unsaved edits) over saved data to ensure WYSIWYG
        const currentData = { ...data, ...localData };

        const generateIntelligentReportBody = () => {
            const name = `**${currentData.name.toUpperCase()}**`;
            const process = `**${currentData.number}**`;
            const address = `**${currentData.location || ''}**`;
            const history = currentData.diligentHistory || [];
            const observations = currentData.observation || '';
            const crime = (currentData.crime || '').toLowerCase();

            // Intelligence safety check
            if (history.length === 0 && !observations.trim()) {
                return "[AVISO: NÃO HÁ INFORMAÇÕES RELEVANTES NA LINHA DO TEMPO OU OBSERVAÇÕES PARA GERAR O RELATÓRIO DO ZERO. POR FAVOR, REGISTRE AS DILIGÊNCIAS PRIMEIRO OU USE O BOTÃO DE IA PARA CRIAR COM BASE NO QUE TIVER.]";
            }

            const fullText = (history.map(h => (h.notes || '')).join(' ') + ' ' + observations).toLowerCase();
            const addrLower = address.toLowerCase();

            // 1. OUTRA CIDADE / CIRCUNSCRIÇÃO
            // Detecta se é outra cidade E se NÃO é Jacareí
            const isAnotherCity = address && (
                !addrLower.includes('jacareí') && (
                    addrLower.includes('são sebastião') ||
                    addrLower.includes('sjc') ||
                    addrLower.includes('são josé dos campos') ||
                    addrLower.includes('são paulo') ||
                    addrLower.includes('caçapava') ||
                    addrLower.includes('taubaté') ||
                    addrLower.includes('santa branca') ||
                    addrLower.includes('igaratá') ||
                    addrLower.includes('paraibuna') ||
                    addrLower.includes('mg') ||
                    addrLower.includes('rj') ||
                    addrLower.includes('pr') ||
                    addrLower.includes('sc') ||
                    addrLower.includes('rs')
                )
            );

            if (isAnotherCity) {
                return `Em cumprimento ao solicitado, informo que, a despeito do mandado expedido, constatou-se que o endereço do réu ${name} (${address}) não pertence à circunscrição desta Seccional de Jacareí/SP.\n\nConsiderando a competência territorial, sugere-se o encaminhamento da ordem judicial (via Carta Precatória ou Ofício) à autoridade policial daquela localidade para as devidas providências, uma vez que esta equipe atua exclusivamente nos limites deste município.\n\nNada mais havendo, encaminha-se o presente.`;
            }

            // 2. CONTATO COM GENITORA / FAMILIARES / MUDOU-SE (Exemplo 3)
            if (fullText.includes('mãe') || fullText.includes('genitora') || fullText.includes('pai') || fullText.includes('familia') || fullText.includes('não reside') || fullText.includes('mudou')) {
                return `Em cumprimento ao Mandado de Prisão referente ao Processo nº ${process}, foram realizadas diligências no endereço indicado como possível residência do réu ${name}, situado na ${address}.\n\nAo chegar ao local, a equipe de Jacareí/SP foi atendida por moradores/familiares do procurado, os quais relataram que o mesmo não reside mais no endereço há longo lapso temporal, não mantendo contato e não possuindo informações que possam contribuir para sua localização. Após apresentação do mandado judicial, foi franqueado o acesso ao imóvel, sendo realizada busca em todos os cômodos da residência, sem êxito.\n\nPor fim, consultas atualizadas nos sistemas policiais não apontaram novos endereços ou vínculos deste réu nesta cidade. Diante disso, as diligências foram encerradas sem êxito.`;
            }

            // 3. IMÓVEL COM PLACAS (Exemplo 13)
            if (fullText.includes('aluga') || fullText.includes('vende') || fullText.includes('placa') || fullText.includes('desabitado') || fullText.includes('vazio')) {
                return `Em cumprimento ao mandado de prisão expedido nos autos do processo nº ${process}, em desfavor de ${name}, esta equipe de Jacareí/SP realizou diligências no endereço indicado — ${address}.\n\nForam efetuadas visitas em dias e horários distintos, constatando-se que o imóvel encontra-se com placas de “aluga-se” ou “vende-se” (ou encontra-se visivelmente desabitado), sem qualquer movimentação que indicasse a presença de moradores ou ocupação regular da residência no momento das verificações.\n\nAté o momento, não foram obtidos elementos que indiquem o paradeiro do procurado, permanecendo negativas as diligências nesta Comarca.`;
            }

            // 4. PENSÃO ALIMENTÍCIA / SISTEMAS (Exemplo 2)
            if (crime.includes('pensão') || crime.includes('alimentar')) {
                return `Em cumprimento ao Mandado de Prisão Civil, referente ao Processo nº ${process}, pela obrigação de pensão alimentícia, foram realizadas consultas nos sistemas policiais para localização de ${name} nesta Comarca de Jacareí/SP.\n\nAs pesquisas não identificaram qualquer endereço ativo do executado no município, inexistindo dados recentes que indicassem residência ou vínculo local. Ressalte-se que não sobrevieram novas informações, até a presente data, capazes de orientar diligências adicionais ou modificar o cenário fático apresentado.\n\nDiante do exposto, as diligências restaram infrutíferas nesta Comarca de Jacareí/SP.`;
            }

            // 5. NEGATIVA GERAL / VIZINHOS (Exemplo 9, 10, 11)
            if (fullText.includes('vizinho') || fullText.includes('entrevista') || fullText.includes('morador') || fullText.includes('desconhece')) {
                return `Em cumprimento ao mandado expedido nos autos do processo nº ${process}, em desfavor de ${name}, esta equipe procedeu a diligências no endereço indicado — ${address}.\n\nForam realizadas verificações in loco em dias e horários diversos, ocasião em que se constatou ausência de sinais de habitação ou indício de presença recente do procurado no imóvel. Procedeu-se à entrevista com moradores lindeiros, os quais informaram que há considerável lapso temporal não visualizam o requerido naquela localidade, bem como desconhecem seu atual paradeiro.\n\nAdicionalmente, foram efetuadas consultas nos sistemas policiais disponíveis, não sendo identificados novos endereços ou informações úteis à sua localização. Diante do exposto, as diligências restaram infrutíferas nesta cidade de Jacareí/SP.`;
            }

            // 6. FALLBACK: PADRÃO FORMAL (Exemplo 4)
            // Se caiu aqui, é porque nenhuma condição específica foi atendida.
            // Vamos montar um texto genérico mas INCLUINDO as informações reais.

            const diligentHistoryText = history.length > 0
                ? `Constam as seguintes diligências realizadas: ${history.map(h => `${new Date(h.date).toLocaleDateString()} - ${h.notes}`).join('; ')}.`
                : '';

            const obsText = observations
                ? `Observa-se ainda que: ${observations}.`
                : '';

            return `Registra-se o presente para dar cumprimento ao Mandado de Prisão expedido em desfavor de ${name}, nos autos do processo nº ${process}, oriundo da Comarca de Jacareí/SP.\n\nA equipe desta especializada procedeu às diligências nos endereços vinculados ao réu, notadamente na ${address}. \n\n${diligentHistoryText}\n\n${obsText}\n\nAté o presente momento, não foi possível localizar o investigado, restando negativas as diligências realizadas por esta equipe para cumprimento da ordem judicial em Jacareí/SP.`;
        };

        setCapturasData(prev => ({
            ...prev,
            reportNumber: currentData.fulfillmentReport || `02/CAPT/${new Date().getFullYear()}`,
            court: '1ª Vara da Família e Sucessões de Jacareí/SP',
            body: generateIntelligentReportBody(),
            aiInstructions: ''
        }));
        setIsCapturasModalOpen(true);
    };



    const handleGenerateCapturasPDF = async () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20; // A4 standard-ish
            const contentWidth = pageWidth - (margin * 2);
            let y = 20;

            // --- HEADER (Oficial Padrão) ---
            try {
                const badgePC = new Image();
                badgePC.src = './brasao_pcsp.png'; // Tenta usar o brasão padrão primeiro

                // Fallback logic
                await new Promise((resolve) => {
                    badgePC.onload = () => resolve(true);
                    badgePC.onerror = () => {
                        badgePC.src = './brasao_pcsp_nova.png';
                        badgePC.onload = () => resolve(true);
                        badgePC.onerror = () => {
                            badgePC.src = './brasao_pcsp_colorido.png'; // Last resort
                            badgePC.onload = () => resolve(true);
                            badgePC.onerror = () => resolve(false);
                        }
                    };
                });

                // Left Header Image
                const imgProps = doc.getImageProperties(badgePC);
                const badgeH = 25;
                const badgeW = (imgProps.width * badgeH) / imgProps.height;

                doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

            } catch (e) {
                console.error("Badge load error", e);
                y += 20;
            }

            // Header Text (Right)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);

            const textX = margin + 30; // Approx badge width + padding
            const headerLines = [
                "SECRETARIA DA SEGURANÇA PÚBLICA",
                "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
                "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
            ];

            headerLines.forEach((line, index) => {
                doc.text(line, textX, y + 4 + (index * 4));
            });
            y += 32;

            // Spacing reduced
            y += 2;

            // --- BLACK TITLE BAR ---
            doc.setFillColor(0, 0, 0);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("RELATÓRIO CAPTURAS", pageWidth / 2, y + 5, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            y += 12;

            // --- METADATA (Left Aligned, Formal) ---
            doc.setFontSize(11); // Standard size matching the image

            // Relatório + Data (Same Line)
            const today = new Date();
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const dateStr = `Jacareí, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

            doc.setFont('helvetica', 'bolditalic');
            doc.text(`Relatório: ${capturasData.reportNumber || 'N/A'}`, margin, y);

            doc.setFont('helvetica', 'italic');
            doc.text(dateStr, pageWidth - margin, y, { align: 'right' });
            y += 6;

            const isMinor = data?.type?.toLowerCase().includes('menores') || data?.type?.toLowerCase().includes('adolescente') || data?.type?.toLowerCase().includes('criança');

            const metaFields = [
                { label: "Natureza:", value: data?.type || "Cumprimento de Mandado" },
                { label: "Referência:", value: `Processo nº. ${data?.number}` },
                { label: "Juízo de Direito:", value: capturasData.court },
                { label: isMinor ? "Adolescente:" : "Réu:", value: data?.name }
            ];

            metaFields.forEach(field => {
                doc.setFont('helvetica', 'bolditalic');
                const labelText = field.label + " ";
                doc.text(labelText, margin, y);

                const labelWidth = doc.getTextWidth(labelText);
                doc.setFont('helvetica', 'bolditalic');
                doc.text(field.value, margin + labelWidth, y);
                y += 6;
            });

            // Addressee
            // Addressee - Separated with more space
            y += 10;
            const addressee = "Excelentíssimo Sr. Delegado de Polícia:";
            doc.setFont('helvetica', 'bold'); // Make it bold as per standard
            doc.text(addressee, margin, y);
            y += 12;

            // --- BODY TEXT ---
            doc.setFont('times', 'normal');
            doc.setFontSize(11); // Reduced to fit A4

            const drawRichText = (text: string, x: number, initialY: number, maxWidth: number, lineHeight: number) => {
                let cursorX = x;
                let cursorY = initialY;
                let currentLine: any[] = [];
                let currentLineWidth = 0;
                let isFirstLine = true;

                // Split by bold markers
                // Example: "Texto **negrito** fim" -> ["Texto ", "**negrito**", " fim"]
                const segments = text.split(/(\*\*.*?\*\*)/g);

                segments.forEach(segment => {
                    const isBold = segment.startsWith('**') && segment.endsWith('**');
                    const cleanText = isBold ? segment.slice(2, -2) : segment;
                    if (!cleanText) return;

                    // Tokenize by whitespace to handle wrapping
                    const tokens = cleanText.split(/(\s+)/);

                    tokens.forEach(token => {
                        if (token === '') return;

                        doc.setFont('times', isBold ? 'bold' : 'normal');
                        const tokenWidth = doc.getTextWidth(token);
                        const isSpace = /^\s+$/.test(token);

                        // If it's a space at the start of a wrapped line (not first line), skip it
                        if (isSpace && currentLine.length === 0 && !isFirstLine) {
                            return;
                        }

                        // Check limits
                        if (currentLineWidth + tokenWidth > maxWidth && currentLine.length > 0) {
                            // Print current line
                            let printX = x;
                            currentLine.forEach(item => {
                                doc.setFont('times', item.isBold ? 'bold' : 'normal');
                                doc.text(item.text, printX, cursorY);
                                printX += item.width;
                            });

                            // New line
                            cursorY += lineHeight;

                            // Page Break Check
                            if (cursorY > pageHeight - 50) {
                                doc.addPage();
                                cursorY = 30; // Increased top margin for continuation pages
                            }

                            currentLine = [];
                            currentLineWidth = 0;
                            isFirstLine = false;

                            // If the token that caused the break was a space, skip it for the new line
                            if (isSpace) return;
                        }

                        currentLine.push({ text: token, width: tokenWidth, isBold });
                        currentLineWidth += tokenWidth;
                    });
                });

                // Flush remaining buffer
                if (currentLine.length > 0) {
                    let printX = x;
                    currentLine.forEach(item => {
                        doc.setFont('times', item.isBold ? 'bold' : 'normal');
                        doc.text(item.text, printX, cursorY);
                        printX += item.width;
                    });
                    cursorY += lineHeight;
                }

                return cursorY;
            };

            const paragraphs = capturasData.body.split('\n');

            paragraphs.forEach(para => {
                const trimmedPara = para.trim();

                // Empty lines
                if (!trimmedPara) {
                    y += 4;
                    return;
                }

                // Indent manually (18 spaces - 3 times more than previous 6)
                const indent = "                  ";
                const fullParaText = indent + trimmedPara;

                y = drawRichText(fullParaText, margin, y, contentWidth, 6);
                y += 2; // Reduced paragraph spacing (was 6)

                // Safety check if the function itself added a page and returned a high Y? 
                if (y > pageHeight - 50) {
                    doc.addPage();
                    y = 30;
                }
            });

            // --- SIGNATURE BLOCK (Right Aligned) ---
            if (y > pageHeight - 60) {
                doc.addPage();
                y = 40;
            }

            const signerName = capturasData.signer || "Investigador de Polícia";

            // Position signature on the right 
            const sigX = pageWidth - margin - 40;

            doc.line(sigX - 40, y, sigX + 40, y); // Line
            y += 5;
            doc.setFont('times', 'bold');
            doc.text(signerName.toUpperCase(), sigX, y, { align: 'center' });
            y += 5;
            doc.setFont('times', 'normal');
            doc.text("Policia Civil do Estado de São Paulo", sigX, y, { align: 'center' });


            // --- FOOTER DELEGATE + BOX ---
            const boxHeight = 16;
            const bottomMargin = 15;
            const boxY = pageHeight - bottomMargin - boxHeight;

            // Delegate Block - Flushed closer to the bottom box
            const delegateBlockY = boxY - 22;
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            let dY = delegateBlockY;
            doc.setFont('helvetica', 'bolditalic');
            doc.text("Excelentíssimo Doutor", margin, dY);
            dY += 5;
            doc.text(capturasData.delegate || "Delegado Titular", margin, dY);
            dY += 5;
            doc.text("Delegado de Polícia Titular", margin, dY);
            dY += 5;
            doc.text("Delegacia de Investigações Gerais de Jacareí", margin, dY);

            // Dashed Box
            (doc as any).setLineDash([1, 1], 0);
            doc.setLineWidth(0.1);
            doc.setDrawColor(100);
            doc.rect(margin, boxY, contentWidth, boxHeight);
            (doc as any).setLineDash([], 0);

            // Footer Text
            doc.setFont('times', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);

            const addr1 = "Rua Moisés Ruston, 370, Parque Itamaraty - Jacareí-SP - CEP. 12.307-260";
            const addr2 = "Telefone: (12) 3951-1000      E-mail: dig.jacarei@policiacivil.sp.gov.br";

            const midX = pageWidth * 0.7;
            const addrCenterX = margin + ((midX - margin) / 2);

            doc.text(addr1, addrCenterX, boxY + 6, { align: 'center' });
            doc.text(addr2, addrCenterX, boxY + 11, { align: 'center' });

            doc.line(midX, boxY + 3, midX, boxY + boxHeight - 3);

            const rightCenterX = midX + ((pageWidth - margin - midX) / 2);
            doc.text(`Data (${new Date().toLocaleDateString('pt-BR')})`, rightCenterX, boxY + 6, { align: 'center' });
            doc.text("Página 1 de 1", rightCenterX, boxY + 11, { align: 'center' });


            // --- SAVE ---
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `Relatorio_Oficial_${data.name}.pdf`, { type: 'application/pdf' });

            const toastId = toast.loading("Registrando documento oficial...");

            const path = `reports/${data.id}/${Date.now()}_Relatorio_Oficial.pdf`;
            const uploadedPath = await uploadFile(pdfFile, path);

            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                const currentReports = data.reports || [];
                await updateWarrant(data.id, { reports: [...currentReports, url] });
                toast.success("Documento oficial gerado e anexado.", { id: toastId });
            }

            doc.save(`Relatorio_Oficial_${data.name}.pdf`);
            setIsCapturasModalOpen(false); // Close modal on success

        } catch (error) {
            console.error("Erro PDF", error);
            toast.error("Falha ao gerar documento.");
        }
    };



    return (
        <div className="min-h-screen bg-background-dark text-text-dark font-display relative overflow-x-hidden pb-40">
            {/* Tactical Grid Background Layer */}
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#4f46e544,transparent_70%)]"></div>
            </div>

            <Header title="Dossiê Tático" back showHome />

            {/* Main Content Layout */}
            <div className="relative z-10 p-4 space-y-4 max-w-5xl mx-auto">

                {/* 1. Tactical Profile Header */}
                <div className="bg-surface-dark/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-tactic overflow-hidden relative group">
                    {/* Animated Glow Decorator */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>

                    <div className="flex flex-col sm:flex-row gap-6 relative">
                        <div className="relative shrink-0 mx-auto sm:mx-0">
                            <img
                                src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`}
                                alt={data.name}
                                onClick={() => setIsPhotoModalOpen(true)}
                                className="h-44 w-44 rounded-2xl object-cover border-2 border-white/10 shadow-glass cursor-zoom-in hover:scale-[1.02] transition-transform"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl shadow-lg border border-white/20">
                                <ShieldAlert size={18} className="text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 text-center sm:text-left">
                            <div>
                                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                        Identificação Biométrica
                                    </span>
                                    {localData.status === 'EM ABERTO' && (
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-risk-high bg-risk-high/10 px-2 py-0.5 rounded border border-risk-high/20 animate-pulse">
                                            Status: Foragido
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl font-black text-white leading-tight uppercase group-hover:text-primary transition-colors">
                                    {localData.name}
                                </h1>
                                <p className="text-sm text-text-secondary-dark font-medium font-mono mt-1 opacity-70">
                                    PROC. Nº {localData.number}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                                    <p className="text-[9px] uppercase font-bold text-text-muted mb-0.5 tracking-tighter">Tipo Crime</p>
                                    <p className="text-xs font-black text-white truncate px-1">{localData.crime || 'N/I'}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                                    <p className="text-[9px] uppercase font-bold text-text-muted mb-0.5 tracking-tighter">Regime Prisional</p>
                                    <p className="text-xs font-black text-white">{localData.regime || 'N/I'}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                                    <p className="text-[9px] uppercase font-bold text-text-muted mb-0.5 tracking-tighter">Idade Captura</p>
                                    <p className="text-xs font-black text-white">{localData.age || 'N/I'}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                                    <p className="text-[9px] uppercase font-bold text-text-muted mb-0.5 tracking-tighter">Expedição</p>
                                    <p className="text-xs font-black text-white font-mono">{localData.issueDate || 'N/I'}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                                {data.tags?.map(tag => (
                                    <span key={tag} className="text-[10px] font-black uppercase bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                        <Zap size={10} className="fill-current" /> {tag}
                                    </span>
                                ))}
                                {localData.ifoodResult && (
                                    <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                        <Bike size={10} /> iFood Inteligência
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Tactical Navigation Tabs */}
                <div className="flex bg-surface-dark/80 backdrop-blur border border-white/10 rounded-2xl p-1.5 gap-1.5 shadow-glass sticky top-2 z-[30]">
                    {[
                        { id: 'documents', label: 'Dossiê', icon: FileText },
                        { id: 'investigation', label: 'Radar IA', icon: Bot },
                        { id: 'timeline', label: 'Operações', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveDetailTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeDetailTab === tab.id
                                ? 'bg-primary text-white shadow-tactic scale-[1.02]'
                                : 'text-text-secondary-dark hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* 3. Tab Content Area */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">

                    {activeDetailTab === 'documents' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Personal Details */}
                            <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass space-y-4">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                    <User className="text-primary" size={16} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Qualificação</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">RG</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-white outline-none focus:ring-1 focus:ring-primary" value={localData.rg || ''} onChange={e => handleFieldChange('rg', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">CPF</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-white outline-none focus:ring-1 focus:ring-primary" value={localData.cpf || ''} onChange={e => handleFieldChange('cpf', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Nascimento</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-white outline-none focus:ring-1 focus:ring-primary" value={localData.birthDate || ''} onChange={e => handleFieldChange('birthDate', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Expiração Mandado</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-risk-high outline-none focus:ring-1 focus:ring-risk-high" value={localData.expirationDate || ''} onChange={e => handleFieldChange('expirationDate', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Location View */}
                            <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass space-y-4">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                    <MapPin className="text-primary" size={16} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Localização Operacional</span>
                                </div>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none h-[95px]"
                                    value={localData.location || ''}
                                    onChange={e => handleFieldChange('location', e.target.value)}
                                    placeholder="Endereço de diligência..."
                                />
                                <div className="flex gap-2">
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${localData.latitude},${localData.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <MapIcon size={14} /> Abrir no Mapa
                                    </a>
                                    <button
                                        onClick={() => toggleRouteWarrant(data.id)}
                                        className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${routeWarrants.includes(data.id) ? 'bg-primary text-white shadow-tactic' : 'bg-primary/10 text-primary border border-primary/20'
                                            }`}
                                    >
                                        <RouteIcon size={14} /> {routeWarrants.includes(data.id) ? 'Em Rota' : 'Marcar Rota'}
                                    </button>
                                </div>
                            </div>

                            {/* Attachments Section (Dossiê) */}
                            <div className="md:col-span-2 bg-surface-dark/60 backdrop-blur border border-white/10 rounded-2xl p-5 shadow-glass">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="text-primary" size={16} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Repositório de Documentos</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="file" id="file-upload-dossier" className="hidden" multiple onChange={(e) => e.target.files && handleAttachFile(e, 'attachments')} />
                                        <label htmlFor="file-upload-dossier" className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer flex items-center gap-2 transition-all">
                                            <Plus size={14} /> ADICIONAR
                                        </label>
                                    </div>
                                </div>

                                {data.attachments && data.attachments.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {data.attachments.map((file: string, idx: number) => (
                                            <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                                                        {file.split('/').pop()?.replace(/^\d+_/, '')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <a href={getPublicUrl(file)} target="_blank" rel="noopener noreferrer" className="p-2 text-text-muted hover:text-white"><ExternalLink size={14} /></a>
                                                    <button onClick={() => handleDeleteAttachment(file)} className="p-2 text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 opacity-30">
                                        <Paperclip size={32} className="mx-auto mb-2 text-text-muted" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Vazio</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 7. Relatórios de Inteligência */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden transition-all hover:shadow-md">
                        <div className="p-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                                <Bot size={18} className="text-primary" /> Relatórios de Inteligência
                            </h3>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="report-upload"
                                        className="hidden"
                                        multiple
                                        onChange={(e) => e.target.files && handleAttachFile(e, 'reports')}
                                        disabled={isUploadingFile}
                                    />
                                    <label
                                        htmlFor="report-upload"
                                        className={`px-3 py-2 bg-gray-500/10 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase rounded-lg cursor-pointer hover:bg-gray-500/20 transition-all flex items-center gap-1 ${isUploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Paperclip size={14} /> ANEXAR
                                    </label>
                                </div>
                                <button
                                    onClick={() => setIsCapturasModalOpen(!isCapturasModalOpen)}
                                    className={`px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 shadow-lg active:scale-95 ${isCapturasModalOpen ? 'bg-indigo-100 text-indigo-700' : 'bg-primary text-white shadow-primary/20'}`}
                                >
                                    <Sparkles size={14} /> {isCapturasModalOpen ? 'OCULTAR GERADOR' : 'NOVO RELATÓRIO'}
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            {data.reports && data.reports.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {data.reports.map((file: string, idx: number) => (
                                        <div key={idx} className="flex flex-col justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-border-light dark:border-border-dark hover:border-primary/50 transition-all shadow-sm group relative overflow-hidden">

                                            {/* Decorator */}
                                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <FileText size={48} />
                                            </div>

                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
                                                        Relatório #{idx + 1}
                                                    </p>
                                                    <p className="text-xs font-bold text-text-light dark:text-text-dark truncate leading-tight" title={file.split('/').pop()}>
                                                        {file.split('/').pop()?.replace(/^\d+_/, '') || 'Documento sem nome'}
                                                    </p>
                                                    <p className="text-[10px] text-text-secondary-light mt-0.5">
                                                        PDF • Gerado pela IA
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-auto">
                                                <a
                                                    href={getPublicUrl(file)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <ExternalLink size={14} /> ABRIR
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteAttachment(file)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                !isDraftOpen && (
                                    <div className="text-center py-6 opacity-30">
                                        <Bot size={24} className="mx-auto mb-2" />
                                        <p className="text-[10px] uppercase font-black tracking-widest">Nenhum relatório de inteligência</p>
                                    </div>
                                )
                            )}

                            {/* Inline Report Generator */}
                            {isCapturasModalOpen && (
                                <div className="mt-6 border-t border-border-light dark:border-border-dark pt-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-4">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                                                <h4 className="text-base font-bold text-text-light dark:text-text-dark">Gerador de Relatório Profissional</h4>
                                            </div>
                                            <button
                                                onClick={handleResetReportData}
                                                className="text-[9px] font-black uppercase px-2 py-1 bg-white dark:bg-white/10 rounded border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                            >
                                                <RotateCcw size={10} /> RECARREGAR DADOS BRUTOS
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Número do Relatório</label>
                                                <input
                                                    type="text"
                                                    value={capturasData.reportNumber}
                                                    onChange={e => setCapturasData({ ...capturasData, reportNumber: e.target.value })}
                                                    className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none text-xs"
                                                    placeholder="Ex: 001/2026"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Juízo de Direito</label>
                                                <input
                                                    type="text"
                                                    value={capturasData.court}
                                                    onChange={e => setCapturasData({ ...capturasData, court: e.target.value })}
                                                    className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none text-xs"
                                                    placeholder="Vara Criminal..."
                                                />
                                            </div>
                                        </div>

                                        {/* AI PRO SECTION */}
                                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 space-y-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles size={16} className="text-indigo-600" />
                                                <label className="block text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                                    IA PRO - ASSISTENTE DE REDAÇÃO
                                                </label>
                                            </div>

                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Ex: 'Faça o texto mais formal', 'Mencione que o alvo fugiu', 'Resuma em 2 parágrafos'..."
                                                    value={capturasData.aiInstructions}
                                                    onChange={e => setCapturasData({ ...capturasData, aiInstructions: e.target.value })}
                                                    className="w-full bg-white dark:bg-black/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-3 text-xs text-text-light dark:text-text-dark outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                                                />

                                                <button
                                                    onClick={handleRefreshAiReport}
                                                    disabled={isGeneratingAiReport}
                                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-wide shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                                >
                                                    {isGeneratingAiReport ? (
                                                        <>
                                                            <RefreshCw size={14} className="animate-spin" />
                                                            PROCESSANDO INTELIGÊNCIA...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={14} />
                                                            GERAR / REESCREVER TEXTO COM IA
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Corpo do Relatório</label>
                                            <textarea
                                                value={capturasData.body}
                                                onChange={e => setCapturasData({ ...capturasData, body: e.target.value })}
                                                rows={12}
                                                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none resize-none leading-relaxed font-serif"
                                                placeholder="O texto do relatório aparecerá aqui..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Policial Responsável</label>
                                                <input
                                                    type="text"
                                                    value={capturasData.signer}
                                                    onChange={e => setCapturasData({ ...capturasData, signer: e.target.value })}
                                                    className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Delegado Titular</label>
                                                <input
                                                    type="text"
                                                    value={capturasData.delegate}
                                                    onChange={e => setCapturasData({ ...capturasData, delegate: e.target.value })}
                                                    className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={handleGenerateCapturasPDF}
                                                disabled={isGeneratingAiReport}
                                                className="w-full py-3 px-4 rounded-xl font-bold bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <FileCheck size={20} />
                                                GERAR PDF OFICIAL E ANEXAR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 8. Investigação e Linha do Tempo */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden transition-all hover:shadow-md">
                        <div className="p-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                                <Cpu size={18} className="text-primary" /> Investigação e Linha do Tempo
                            </h3>
                        </div>
                        <div className="p-5 space-y-6">
                            <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-xl border border-border-light dark:border-border-dark shadow-inner">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-text-secondary-light dark:text-text-dark/70 uppercase">Informações Brutas de Campo</span>
                                    <button
                                        onClick={handleAnalyzeDiligence}
                                        disabled={!newDiligence.trim() || isAnalyzingDiligence}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        <Sparkles size={12} className={isAnalyzingDiligence ? 'animate-spin' : ''} />
                                        ANALISAR COM GEMINI IA
                                    </button>
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={newDiligence}
                                        onChange={(e) => setNewDiligence(e.target.value)}
                                        placeholder="Relate informações brutas colhidas, observações, dados de vizinhos, veículos avistados ou qualquer informe para análise da IA..."
                                        className="w-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 pr-12 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                                    />
                                    <div className="absolute right-3 top-3">
                                        <VoiceInput onTranscript={(text) => setNewDiligence(text)} currentValue={newDiligence} />
                                    </div>
                                </div>

                                {aiDiligenceResult && (
                                    <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl animate-in fade-in zoom-in duration-300">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Bot size={16} className="text-indigo-600" />
                                            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Parecer de Análise Estratégica (Antigravity IA)</span>
                                        </div>
                                        <div className="text-xs text-text-light dark:text-text-dark leading-relaxed font-blue-500/10 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                            {aiDiligenceResult}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleAddDiligence}
                                    disabled={!newDiligence.trim()}
                                    className="w-full mt-3 py-3 bg-primary text-white rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all font-bold text-xs flex items-center justify-center gap-2"
                                >
                                    <PlusCircle size={18} /> REGISTRAR E SALVAR NA LINHA DO TEMPO
                                </button>
                            </div>

                            <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-0 before:w-1 before:bg-primary/10">
                                {Array.isArray(data.diligentHistory) && data.diligentHistory.length > 0 ? (
                                    [...data.diligentHistory].reverse().map((h) => (
                                        <div key={h.id} className="relative pl-12 animate-in slide-in-from-left-4">
                                            <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-surface-light dark:border-surface-dark shadow-sm flex items-center justify-center ${h.type === 'observation' ? 'bg-blue-500' : h.type === 'attempt' ? 'bg-amber-500' : 'bg-purple-600'
                                                }`}>
                                                {h.type === 'observation' ? <Eye size={16} className="text-white" /> : h.type === 'attempt' ? <RotateCcw size={16} className="text-white" /> : <ShieldAlert size={16} className="text-white" />}
                                            </div>
                                            <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm group hover:border-primary/30 transition-all">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-bold text-primary font-mono">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                                        <span className="text-[10px] text-text-secondary-light font-mono opacity-60">{new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteDiligence(h.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-text-light dark:text-text-dark leading-relaxed font-medium">{h.notes}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-gray-50/50 dark:bg-black/10 rounded-xl border-2 border-dashed border-border-light dark:border-border-dark">
                                        <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                                        <p className="text-xs text-text-secondary-light font-bold">Nenhum registro tático disponível para este alvo.</p>
                                        <p className="text-[10px] text-text-secondary-light/60 mt-1">Use o campo acima para registrar diligências.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tactical Footer: Observações Gerais */}
                    <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                            <MessageSquare className="text-primary" size={16} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Observações Analíticas</span>
                        </div>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none min-h-[140px]"
                            value={localData.observation || ''}
                            onChange={e => handleFieldChange('observation', e.target.value)}
                            placeholder="Adicione considerações estratégicas para futuras equipes..."
                        />
                    </div>

                    {/* Sticky Tactical Confirmation Bar */}
                    {hasChanges && (
                        <div className="fixed bottom-[110px] left-4 right-4 p-4 bg-primary/90 backdrop-blur-xl border border-white/20 rounded-2xl z-[60] flex gap-3 animate-in slide-in-from-bottom duration-500 shadow-tactic">
                            <button
                                onClick={handleCancelEdits}
                                className="flex-1 py-4 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                                Abortar Alterações
                            </button>
                            <button
                                onClick={() => setIsConfirmSaveOpen(true)}
                                className="flex-1 py-4 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-primary shadow-lg hover:shadow-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <CheckCircle size={18} />
                                SINCRONIZAR DADOS
                            </button>
                        </div>
                    )}
                </div>

                {/* Tactical Action Dock (Main Navigation & Quick Actions) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 md:pb-8 bg-surface-dark/90 backdrop-blur-2xl border-t border-white/10 z-50 shadow-glass">
                    <div className="max-w-xl mx-auto flex items-stretch gap-2">
                        <Link
                            to="/"
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-white/5 text-text-muted hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                        >
                            <Home size={18} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Pátio</span>
                        </Link>

                        <Link
                            to={`/new-warrant?edit=${data.id}`}
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all active:scale-95 shadow-inner"
                        >
                            <Edit size={18} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Ajustar</span>
                        </Link>

                        <button
                            onClick={data.status === 'CUMPRIDO' ? handleReopen : handleFinalize}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all active:scale-95 shadow-glass ${data.status === 'CUMPRIDO'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                }`}
                        >
                            {data.status === 'CUMPRIDO' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                            <span className="text-[8px] font-black uppercase tracking-widest">{data.status === 'CUMPRIDO' ? 'REABRIR' : 'FECHAR'}</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-white text-primary shadow-tactic hover:shadow-white/20 transition-all active:scale-95"
                        >
                            <Printer size={18} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary">Dossiê PDF</span>
                        </button>

                        {isAdmin && (
                            <button
                                onClick={handleDelete}
                                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-risk-high/10 text-risk-high border border-risk-high/20 hover:bg-risk-high/20 transition-all active:scale-95"
                            >
                                <Trash2 size={18} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Deletar</span>
                            </button>
                        )}
                    </div>
                </div>

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



                <button
                    onClick={handleDelete}
                    className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl bg-red-500/10 text-red-500 transition-all active:scale-95 touch-manipulation hover:bg-red-500/20"
                >
                    <Trash2 size={16} />
                    <span className="text-[8px] md:text-[9px] font-bold uppercase truncate w-full text-center">EXCLUIR</span>
                </button>
            </div>
        </div>

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

    {/* Modals & Overlays */ }
    <ConfirmModal
        isOpen={isConfirmSaveOpen}
        onCancel={() => setIsConfirmSaveOpen(false)}
        onConfirm={handleSaveChanges}
        title="Sincronizar Protocolo"
        message="Deseja registrar as alterações no prontuário oficial deste alvo?"
        confirmText="Sincronizar"
        cancelText="Abortar"
        variant="primary"
    />

    {
        isCapturasModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-surface-dark border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-tactic">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-primary animate-pulse" size={20} />
                            <h3 className="text-lg font-black uppercase tracking-tighter text-white">Centro de Redação Inteligente</h3>
                        </div>
                        <button onClick={() => setIsCapturasModalOpen(false)} className="p-2 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest">Identificador Relatório</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" value={capturasData.reportNumber} onChange={e => setCapturasData({ ...capturasData, reportNumber: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest">Comarca Judiciária</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" value={capturasData.court} onChange={e => setCapturasData({ ...capturasData, court: e.target.value })} />
                            </div>
                        </div>

                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <Cpu size={16} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Prompt de Refinamento IA</span>
                            </div>
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-indigo-300/30"
                                placeholder="Ex: 'Seja mais formal', 'Mencione a equipe de campo'..."
                                value={capturasData.aiInstructions}
                                onChange={e => setCapturasData({ ...capturasData, aiInstructions: e.target.value })}
                            />
                            <button
                                onClick={handleRefreshAiReport}
                                disabled={isGeneratingAiReport}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all"
                            >
                                {isGeneratingAiReport ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                                {isGeneratingAiReport ? 'ANTIGRAVITY PROCESSANDO...' : 'EXECUTAR ANÁLISE E REDAÇÃO IA'}
                            </button>
                        </div>

                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm leading-relaxed text-white min-h-[300px] font-serif"
                            value={capturasData.body}
                            onChange={e => setCapturasData({ ...capturasData, body: e.target.value })}
                        />
                    </div>

                    <div className="p-5 border-t border-white/10 bg-white/5">
                        <button
                            onClick={handleGenerateCapturasPDF}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-tactic active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Printer size={18} /> IMPRIMIR E ANEXAR PDF OFICIAL
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    {
        isFinalizeModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-surface-dark border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-tactic space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <CheckCircle className="text-green-500" size={24} />
                        <h3 className="text-xl font-black uppercase text-white tracking-tighter">Encerrar Protocolo</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Data Cumprimento</label>
                            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={finalizeFormData.date} onChange={e => setFinalizeFormData({ ...finalizeFormData, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ofício DIG Vinculado</label>
                            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={finalizeFormData.digOffice} onChange={e => setFinalizeFormData({ ...finalizeFormData, digOffice: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Resultado Final</label>
                            <select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white appearance-none" value={finalizeFormData.result} onChange={e => setFinalizeFormData({ ...finalizeFormData, result: e.target.value })}>
                                {['PRESO', 'NEGATIVO', 'ENCAMINHADO', 'ÓBITO', 'CONTRA', 'LOCALIZADO'].map(opt => <option key={opt} value={opt} className="bg-surface-dark">{opt}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsFinalizeModalOpen(false)} className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-all">Cancelar</button>
                        <button onClick={handleConfirmFinalize} className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all">Finalizar Alvo</button>
                    </div>
                </div>
            </div>
        )
    }

    {
        isPhotoModalOpen && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setIsPhotoModalOpen(false)}>
                <img src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`} className="max-h-[85vh] max-w-full rounded-2xl shadow-tactic border border-white/20 object-contain animate-in zoom-in-95" alt={data.name} />
            </div>
        )
    }
        </div >
    );
};

export default WarrantDetail;
```
