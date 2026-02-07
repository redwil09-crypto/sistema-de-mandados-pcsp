
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import FloatingDock from '../components/FloatingDock'; // REINTEGRADO
import {
    AlertCircle, User, Gavel, Calendar, MapPin, Map as MapIcon, Home,
    Bike, FileCheck, FileText, Paperclip, Edit,
    Route as RouteIcon, RotateCcw, CheckCircle, Printer,
    Trash2, Zap, Bell, Eye, History, Send, Copy,
    ShieldAlert, MessageSquare, Plus, PlusCircle, X, ChevronRight, Bot, Cpu, Sparkles, RefreshCw, AlertTriangle, ExternalLink,
    CheckSquare, Users, AlertOctagon, Search, Siren, Scale, Target, Lightbulb, TrendingUp, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
// Header removed (replaced by FloatingDock)
import ConfirmModal from '../components/ConfirmModal';
import VoiceInput from '../components/VoiceInput';
import WarrantAuditLog from '../components/WarrantAuditLog';
import { formatDate, getStatusColor, maskDate } from '../utils/helpers';
import { Warrant } from '../types';
import { geocodeAddress } from '../services/geocodingService';
import { generateWarrantPDF, generateIfoodOfficePDF } from '../services/pdfReportService';
import { analyzeRawDiligence, generateReportBody, analyzeDocumentStrategy, askAssistantStrategy, mergeIntelligence } from '../services/geminiService';
import { extractPdfData } from '../services/pdfExtractionService'; // RESTORED
import { CRIME_OPTIONS, REGIME_OPTIONS } from '../data/constants';
import { useWarrants } from '../contexts/WarrantContext';
import IfoodAgentModal from '../components/IfoodAgentModal';

const WarrantDetail = () => {
    const { warrants, updateWarrant, deleteWarrant, routeWarrants, toggleRouteWarrant, refreshWarrants } = useWarrants();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // URL Persistence
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeDetailTab, setActiveDetailTab] = useState<'documents' | 'reports' | 'investigation' | 'timeline' | 'ifood'>((searchParams.get('tab') as any) || 'documents');

    // Persistence Effect
    useEffect(() => {
        setSearchParams({ tab: activeDetailTab });
    }, [activeDetailTab, setSearchParams]);

    // New Document Form Local State
    const [newDocSource, setNewDocSource] = useState('');
    const [newDocNumber, setNewDocNumber] = useState('');
    const [newDocType, setNewDocType] = useState('Mandado'); // Mandado, IFFO, Outros

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

    const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
    const [analyzedDocumentText, setAnalyzedDocumentText] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [isChatThinking, setIsChatThinking] = useState(false);


    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isAnalyzingDiligence, setIsAnalyzingDiligence] = useState(false);

    const [aiDiligenceResult, setAiDiligenceResult] = useState<any>(null);
    const [aiAnalysisSaved, setAiAnalysisSaved] = useState(false);
    const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);

    // Load Draft from LocalStorage
    useEffect(() => {
        if (id) {
            const savedDraft = localStorage.getItem(`warrant_draft_${id}`);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    if (parsed.diligence) setNewDiligence(parsed.diligence);
                    if (parsed.aiDiligenceResult) setAiDiligenceResult(parsed.aiDiligenceResult);
                    if (parsed.analyzedDocumentText) setAnalyzedDocumentText(parsed.analyzedDocumentText);
                    if (parsed.chatHistory) setChatHistory(parsed.chatHistory);
                } catch (e) {
                    console.error("Failed to load draft");
                }
            }
        }
    }, [id]);

    // Save Draft to LocalStorage
    useEffect(() => {
        if (id) {
            const draft = {
                diligence: newDiligence,
                aiDiligenceResult,
                analyzedDocumentText,
                chatHistory
            };
            localStorage.setItem(`warrant_draft_${id}`, JSON.stringify(draft));
        }
    }, [id, newDiligence, aiDiligenceResult, analyzedDocumentText, chatHistory]);

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
    const [isIfoodModalOpen, setIsIfoodModalOpen] = useState(false);

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

    const [isSavingDiligence, setIsSavingDiligence] = useState(false);

    const handleAddDiligence = async () => {
        // Validation: Must have either text OR AI result
        if (!newDiligence.trim() && !aiDiligenceResult) {
            toast.error("Nada para registrar.");
            return;
        }

        setIsSavingDiligence(true);
        const toastId = toast.loading("Processando Inteligência e Fusão de Dados...");

        // 1. Prepare raw note for history (Audit purpose)
        let finalNotes = newDiligence;
        if (aiDiligenceResult && typeof aiDiligenceResult !== 'string') {
            const hasText = newDiligence.trim().length > 0;
            finalNotes = hasText
                ? `${newDiligence}\n\n[ANÁLISE IA REALIZADA E ENVIADA AO CENTRO DE INTELIGÊNCIA]`
                : `[ANÁLISE DE INTELIGÊNCIA AUTOMÁTICA COMPUTADA E MERGEADA]`;
        }

        // 2. INTELLIGENT MERGE LOGIC (THE CORE)
        let updatedTacticalSummary = data?.tacticalSummary || '{}';

        if (aiDiligenceResult && typeof aiDiligenceResult !== 'string') {
            try {
                // Parse current state
                let currentIntel = {};
                try {
                    currentIntel = JSON.parse(updatedTacticalSummary);
                } catch (e) { currentIntel = {}; }

                // CALL THE AI MERGE SERVICE
                const mergedIntel = await mergeIntelligence(data, currentIntel, aiDiligenceResult);

                updatedTacticalSummary = JSON.stringify(mergedIntel);
            } catch (mergeError) {
                console.error("Error calling AI Merge:", mergeError);
                toast.error("Falha na fusão inteligente. Salvando dados brutos.", { id: toastId });
            }
        }

        const entry: any = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            investigator: "Policial",
            notes: finalNotes,
            type: 'intelligence'
        };

        const updatedHistory = [...(data.diligentHistory || []), entry];

        // 3. Save updates
        const updates: any = {
            diligentHistory: updatedHistory,
            tacticalSummary: updatedTacticalSummary,
            observation: localData.observation, // Sync forms just in case
            location: localData.location
        };

        const success = await updateWarrant(data.id, updates);

        if (success) {
            setNewDiligence('');
            setAiAnalysisSaved(true);
            setAnalyzedDocumentText('');

            // Critical: Update parent state immediately
            await refreshWarrants();

            toast.success("Informações Transferidas para o Centro de Inteligência!", { id: toastId });

            // CLEAR THE "RELATÓRIO ESTRATÉGICO" (TIMELINE INPUTS)
            // This ensures the source is disposable/temporary as requested
            setTimeout(() => {
                setAiAnalysisSaved(false);
                setAiDiligenceResult(null);
            }, 1000);
        } else {
            toast.error("Erro ao salvar no prontuário.", { id: toastId });
        }
        setIsSavingDiligence(false);
    };

    const handleAnalyzeDiligence = async () => {
        if (!newDiligence.trim() || !data) {
            toast.error("Insira informações para análise.");
            return;
        }

        setIsAnalyzingDiligence(true);
        const tid = toast.loading("Assistente IA processando análise estratégica...");
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

                const currentFiles = data[type] || [];
                const success = await updateWarrant(data.id, { [type]: [...currentFiles, url] });

                if (success) {
                    toast.success("Arquivo anexado com sucesso!", { id: toastId });

                    // AUTOMATIC EXTRACTION TRIGGER (RESTORED)
                    if (file.type === 'application/pdf') {
                        toast.loading("Extraindo conteúdo para Inteligência...", { id: "extract-load" });
                        try {
                            const text = await extractPdfData(file);
                            if (text && text.length > 50) {
                                setAnalyzedDocumentText(text);
                                // Auto-trigger deep analysis
                                const analysis = await analyzeDocumentStrategy(data, text);
                                if (analysis) {
                                    // Save analysis as valid intelligence
                                    setAiDiligenceResult(analysis);
                                    toast.success("Documento analisado pela IA! Veja 'Diligência Inteligente'.", { id: "extract-load" });
                                }
                            }
                        } catch (extractErr) {
                            console.error("Auto-extraction failed", extractErr);
                            toast.error("Falha na leitura automática do PDF.", { id: "extract-load" });
                        }
                    }

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
            if (e.target && 'value' in e.target) {
                e.target.value = '';
            }
        }
    };
    const handleAnalyzeDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !data) return;

        setIsAnalyzingDoc(true);
        const toastId = toast.loading('Desencriptando e analisando documento...');

        try {
            let text = '';
            if (file.type === 'application/pdf') {
                text = await extractPdfData(file);
            } else {
                text = await file.text();
            }

            if (!text || text.length < 50) {
                toast.error('Documento com pouco texto ou não legível.', { id: toastId });
                return;
            }

            const analysis = await analyzeDocumentStrategy(data, text);
            if (analysis) {
                setAiDiligenceResult(analysis);
                setAnalyzedDocumentText(text); // Save context
                setChatHistory([]); // Reset chat on new document
                toast.success('Análise de Inteligência concluída!', { id: toastId });
            } else {
                toast.error('Não foi possível gerar a análise.', { id: toastId });
            }

        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar arquivo.', { id: toastId });
        } finally {
            setIsAnalyzingDoc(false);
            if (e.target && 'value' in e.target) {
                e.target.value = '';
            }
        }
    };

    const handleClearAnalysis = () => {
        if (window.confirm("Deseja apagar a análise e o histórico atual?")) {
            setAiDiligenceResult(null);
            setAnalyzedDocumentText('');
            setChatHistory([]);
            setChatInput('');
        }
    };

    const handleToggleChecklist = (idx: number) => {
        if (aiDiligenceResult && typeof aiDiligenceResult !== 'string' && aiDiligenceResult.checklist) {
            const newResult = { ...aiDiligenceResult };
            newResult.checklist[idx].checked = !newResult.checklist[idx].checked;
            setAiDiligenceResult(newResult);
        }
    };

    const handleAssistantChat = async () => {
        if (!chatInput.trim() || !data) return;

        const question = chatInput;
        setChatInput('');
        setIsChatThinking(true);

        const newHistory = [...chatHistory, { role: 'user', content: question }];
        setChatHistory(newHistory);

        const response = await askAssistantStrategy(data, analyzedDocumentText, question, newHistory);

        setChatHistory([...newHistory, { role: 'assistant', content: response }]);
        setIsChatThinking(false);
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
        // Refresh data to ensure history is included
        await refreshWarrants();
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

            const obsText = localData.observation
                ? `Observa-se ainda que: ${localData.observation}.`
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
        if (!data) return;
        const { generateCapturasReportPDF } = await import('../services/pdfReportService');
        const success = await generateCapturasReportPDF(data, capturasData, updateWarrant);
        if (success) setIsCapturasModalOpen(false);
    };

    // @ts-ignore
    const _deprecated_generatePDF = async () => {
        if (!data) return;
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

    const handleBack = () => {
        // Force navigate to Home Screen as requested
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background-dark text-text-dark font-display relative overflow-x-hidden pb-40">
            {/* Tactical Grid Background Layer */}
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute inset-0 tactical-grid"></div>
                <div className="absolute inset-0 tactical-glow"></div>
            </div>



            {/* Main Content Layout */}
            <div className="relative z-10 p-4 space-y-4 max-w-[1600px] mx-auto">

                {/* Floating Action Dock */}
                <FloatingDock
                    onBack={() => navigate(-1)}
                    onSave={() => setIsConfirmSaveOpen(true)}
                    onPrint={() => setIsCapturasModalOpen(true)} // Agora abre o modal de relatórios
                    onIfood={() => setIsIfoodModalOpen(true)}
                    onFinalize={handleFinalize}
                    // onDelete={isAdmin ? () => setIsDeleteConfirmOpen(true) : undefined}
                    className="animate-in slide-in-from-bottom-10 duration-700 delay-300"
                />

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
                        { id: 'documents', label: 'Dossiê', icon: FileText, color: 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-500/25 border-blue-400/20' },
                        { id: 'investigation', label: 'Investigações', icon: Bot, color: 'bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-violet-500/25 border-violet-400/20' },
                        { id: 'timeline', label: 'Operações', icon: History, color: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 border-emerald-400/20' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveDetailTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeDetailTab === tab.id
                                ? `${tab.color} text-white shadow-lg scale-[1.02] border`
                                : 'text-text-secondary-dark hover:bg-white/5 hover:text-white border border-transparent'
                                }`}
                        >
                            <tab.icon size={16} className={activeDetailTab === tab.id ? 'animate-pulse' : ''} />
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
                                    <User className="text-indigo-400" size={16} />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Qualificação</span>
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
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} className="text-indigo-400" /> Data do Cumprimento</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-white outline-none focus:ring-1 focus:ring-indigo-500" placeholder="DD/MM/AAAA" value={localData.dischargeDate || ''} onChange={e => handleFieldChange('dischargeDate', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Location View */}
                            <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass space-y-4">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="text-indigo-400" size={16} />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Localização Operacional</span>
                                    </div>
                                    {localData.latitude && localData.longitude ? (
                                        <span className="text-[10px] font-black bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                                            <FileCheck size={12} /> MAPEADO
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                            <AlertTriangle size={12} /> NÃO MAPEADO
                                        </span>
                                    )}
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
                                        className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${routeWarrants.includes(data.id) ? 'bg-indigo-600 text-white shadow-tactic' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                            }`}
                                    >
                                        <RouteIcon size={14} /> {routeWarrants.includes(data.id) ? 'Em Rota' : 'Marcar Rota'}
                                    </button>
                                </div>
                            </div>

                            {/* Attachments Section (Dossiê) */}
                            <div className="md:col-span-2 bg-surface-dark/60 backdrop-blur border border-white/10 rounded-2xl p-5 shadow-glass">
                                <div className="flex flex-col mb-4 pb-4 border-b border-white/5 gap-3">
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="text-indigo-400" size={16} />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Repositório de Documentos</span>
                                    </div>

                                    {/* New Document Inputs */}
                                    <div className="bg-white/5 rounded-xl p-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Tipo</label>
                                            <select
                                                className="w-full bg-surface-dark border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none"
                                                value={newDocType}
                                                onChange={e => setNewDocType(e.target.value)}
                                            >
                                                <option value="Mandado">Mandado de Prisão</option>
                                                <option value="IFFO">IFFO (iFood)</option>
                                                <option value="Oficio">Ofício</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Origem/Vara</label>
                                            <input
                                                className="w-full bg-surface-dark border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none placeholder:text-white/20"
                                                placeholder="Ex: 1ª Vara Criminal"
                                                value={newDocSource}
                                                onChange={e => setNewDocSource(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Numeração/Edição</label>
                                            <input
                                                className="w-full bg-surface-dark border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none placeholder:text-white/20"
                                                placeholder="Ex: 001/2026"
                                                value={newDocNumber}
                                                onChange={e => setNewDocNumber(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                id="file-upload-dossier"
                                                className="hidden"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (files && files.length > 0) {
                                                        const file = files[0];
                                                        const extension = file.name.split('.').pop();
                                                        const cleanSource = newDocSource.replace(/[^a-zA-Z0-9]/g, '');
                                                        const cleanNum = newDocNumber.replace(/[^a-zA-Z0-9]/g, '');
                                                        const finalName = `${newDocType}_${cleanSource}_${cleanNum}_${Date.now()}.${extension}`;
                                                        const renamedFile = new File([file], finalName, { type: file.type });
                                                        const mockEvent = { target: { files: [renamedFile] } } as any;
                                                        handleAttachFile(mockEvent, 'attachments');
                                                    }
                                                }}
                                            />
                                            <label htmlFor="file-upload-dossier" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase cursor-pointer flex items-center justify-center gap-2 transition-all">
                                                <Plus size={14} /> Upload
                                            </label>
                                        </div>
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
                                                        {(() => {
                                                            const parts = file.split('/').pop()?.split('_') || [];
                                                            if (parts.length >= 4 && (parts[0] === 'Mandado' || parts[0] === 'IFFO' || parts[0] === 'Oficio')) {
                                                                return `${parts[0]} ${parts[2] || ''}`;
                                                            }
                                                            return file.split('/').pop()?.replace(/^\d+_/, '')
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <a href={getPublicUrl(file)} target="_blank" rel="noopener noreferrer" className="p-2 text-text-muted hover:text-white" title="Visualizar"><Eye size={14} /></a>
                                                    <a href={getPublicUrl(file)} target="_blank" rel="noopener noreferrer" className="p-2 text-text-muted hover:text-white hidden" title="Abrir Link"><ExternalLink size={14} /></a>
                                                    <button onClick={() => handleDeleteAttachment(file)} className="p-2 text-red-500 hover:text-red-400" title="Excluir"><Trash2 size={14} /></button>
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

                    {activeDetailTab === 'investigation' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500 pb-10">
                            {/* --- INTELLIGENCE CENTER (CENTRAL DE COMANDO) --- */}

                            {/* HEADER DO CENTRO DE INTELIGÊNCIA */}
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 ring-1 ring-inset ring-white/10">
                                        <Bot size={28} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-tighter">Sugestão Tática Inteligente</h4>
                                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <Activity size={10} className="animate-pulse" /> Memória Ativa da Investigação
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* PROGRESS LEVEL */}
                                    {(() => {
                                        try {
                                            const intel = JSON.parse(data.tacticalSummary || '{}');
                                            const progress = intel.progressLevel || 0;
                                            return (
                                                <div className="hidden md:flex flex-col items-end mr-4">
                                                    <span className="text-[9px] uppercase font-black text-indigo-300 tracking-widest mb-1">Avanço Global</span>
                                                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white mt-1">{progress}% Concluído</span>
                                                </div>
                                            )
                                        } catch (e) { return null }
                                    })()}

                                    {/* GENERATE PDF BUTTON */}
                                    <button
                                        onClick={handleDownloadPDF} // Including standard PDF generation
                                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/5"
                                    >
                                        <Printer size={14} /> Dossiê Completo
                                    </button>
                                </div>
                            </div>

                            {/* MAIN INTELLIGENCE DASHBOARD GRID */}
                            {(() => {
                                let intel: any = {
                                    summary: 'Aguardando primeira análise...',
                                    risks: [],
                                    locations: [],
                                    entities: [],
                                    hypotheses: [],
                                    timeline: [],
                                    checklist: []
                                };
                                try {
                                    intel = JSON.parse(data.tacticalSummary || '{}');
                                } catch (e) {
                                    // Fallback if empty
                                }

                                const hasData = intel.summary && intel.summary !== 'Aguardando primeira análise...';

                                if (!hasData) {
                                    return (
                                        <div className="text-center py-20 opacity-50 border-2 border-dashed border-white/10 rounded-3xl">
                                            <Bot size={48} className="mx-auto mb-4 text-white/30" />
                                            <p className="text-white font-bold text-lg">Centro de Inteligência Vazio</p>
                                            <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                                                Para ativar, vá na aba <strong>RELATÓRIO ESTRATÉGICO</strong>, realize uma análise e clique em
                                                <span className="text-indigo-400 font-bold mx-1">REGISTRAR NO PRONTUÁRIO</span>.
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                        {/* LEFT COLUMN (STRATEGY & SUMMARY) - SPAN 8 */}
                                        <div className="md:col-span-8 space-y-6">

                                            {/* 1. STRATEGIC SUMMARY CARD */}
                                            <div className="bg-surface-dark/90 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-glass relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                                    <Lightbulb size={120} />
                                                </div>
                                                <h5 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Target size={14} /> Resumo Estratégico Consolidado
                                                </h5>
                                                <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                    {intel.summary || "Sem resumo disponível."}
                                                </p>
                                            </div>

                                            {/* 2. HYPOTHESES & RISKS ROW */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* HYPOTHESES */}
                                                <div className="bg-surface-dark/80 border border-white/10 rounded-2xl p-5 shadow-sm hover:border-indigo-500/30 transition-colors">
                                                    <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Lightbulb size={12} /> Hipóteses Ativas
                                                    </h5>
                                                    <div className="space-y-3">
                                                        {intel.hypotheses && intel.hypotheses.length > 0 ? (
                                                            intel.hypotheses.map((h: any, i: number) => (
                                                                <div key={i} className={`p-3 rounded-xl border border-white/5 ${h.status === 'Confirmada' ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5'}`}>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${h.confidence === 'Alta' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
                                                                            }`}>{h.confidence}</span>
                                                                        {h.status === 'Confirmada' && <CheckCircle size={12} className="text-green-400" />}
                                                                    </div>
                                                                    <p className="text-xs text-white leading-snug">{h.description}</p>
                                                                </div>
                                                            ))
                                                        ) : <p className="text-xs text-gray-500 italic">Nenhuma hipótese formalizada.</p>}
                                                    </div>
                                                </div>

                                                {/* RISKS */}
                                                <div className="bg-surface-dark/80 border border-white/10 rounded-2xl p-5 shadow-sm hover:border-red-500/30 transition-colors">
                                                    <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <ShieldAlert size={12} /> Riscos Operacionais
                                                    </h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {intel.risks && intel.risks.length > 0 ? (
                                                            intel.risks.map((r: string, i: number) => (
                                                                <span key={i} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
                                                                    <AlertTriangle size={10} /> {r}
                                                                </span>
                                                            ))
                                                        ) : <p className="text-xs text-gray-500 italic">Nenhum risco crítico identificado.</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. LOCATIONS & ENTITIES */}
                                            <div className="bg-surface-dark/80 border border-white/10 rounded-2xl p-5">
                                                <div className="flex gap-4 mb-4 border-b border-white/10 pb-2">
                                                    <div className="flex-1">
                                                        <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                                            <MapIcon size={12} /> Endereços mapeados
                                                        </h5>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Users size={12} /> Vínculos / Rede
                                                        </h5>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Locations List */}
                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                                        {intel.locations && intel.locations.map((l: any, i: number) => (
                                                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                                                <MapPin size={14} className={`mt-0.5 ${l.priority === 'Alta' ? 'text-red-400' : 'text-gray-400'}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate">{l.address}</p>
                                                                    <p className="text-[10px] text-gray-400 truncate">{l.context}</p>
                                                                </div>
                                                                <span className={`text-[9px] px-1.5 rounded ${l.status === 'Verificado' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-500'
                                                                    }`}>{l.status || 'Pendente'}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Entities List */}
                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                                        {intel.entities && intel.entities.map((e: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                                <User size={14} className="text-indigo-400" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate">{e.name}</p>
                                                                    <p className="text-[10px] text-gray-400">{e.role}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* RIGHT COLUMN (TIMELINE & NEXT STEPS) - SPAN 4 */}
                                        <div className="md:col-span-4 space-y-6">

                                            {/* NEXT STEPS (ACTIONABLE) */}
                                            <div className="bg-gradient-to-br from-indigo-900/40 to-surface-dark border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
                                                <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <CheckSquare size={14} className="text-green-400" /> Próximos Passos
                                                </h5>
                                                <div className="space-y-3">
                                                    {intel.checklist && intel.checklist.length > 0 ? (
                                                        intel.checklist.map((s: any, i: number) => (
                                                            <label key={i} className="flex items-start gap-3 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-colors cursor-pointer group">
                                                                <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center ${s.status === 'Concluído' || s.checked ? 'bg-green-500 border-green-500' : 'border-gray-500 group-hover:border-white'
                                                                    }`}>
                                                                    {(s.status === 'Concluído' || s.checked) && <CheckSquare size={10} className="text-white" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className={`text-xs font-medium leading-relaxed ${(s.status === 'Concluído' || s.checked) ? 'text-gray-500 line-through' : 'text-white'}`}>
                                                                        {s.task}
                                                                    </p>
                                                                    {s.priority === 'Alta' && <span className="text-[9px] text-red-400 font-bold uppercase mt-1 inline-block">Prioridade Alta</span>}
                                                                </div>
                                                            </label>
                                                        ))
                                                    ) : <p className="text-xs text-gray-500 text-center">Nenhuma ação pendente.</p>}
                                                </div>
                                            </div>

                                            {/* STRATEGIC TIMELINE (NOT THE RAW LOG) */}
                                            <div className="bg-surface-dark border border-white/5 rounded-2xl p-5">
                                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <History size={14} /> Evolução da Investigação
                                                </h5>
                                                <div className="space-y-4 relative pl-2">
                                                    {/* Timeline Line */}
                                                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10"></div>

                                                    {intel.timeline && intel.timeline.slice(0, 5).map((t: any, i: number) => (
                                                        <div key={i} className="relative pl-6">
                                                            <div className="absolute left-[7px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-surface-dark"></div>
                                                            <p className="text-[10px] text-indigo-300 font-bold mb-0.5">{t.date}</p>
                                                            <p className="text-xs text-white leading-tight">{t.event}</p>
                                                            <p className="text-[9px] text-gray-500 mt-0.5">{t.source}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )
                            })()}



                            {/* Investigation: iFood Intelligence (Merged) */}
                            <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass">
                                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-2">
                                        <Bike className="text-primary" size={20} />
                                        <div>
                                            <h3 className="text-sm font-black uppercase text-white tracking-widest">Inteligência iFood</h3>
                                            <p className="text-[10px] text-text-muted font-bold uppercase">Rastreamento de Pedidos e Endereços</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGenerateIfoodOffice}
                                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-tactic flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <FileText size={14} /> Gerar Ofício
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Número do Ofício</label>
                                            <input
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-white outline-none focus:ring-1 focus:ring-primary"
                                                placeholder="Ex: 001/CAPT/2026"
                                                value={localData.ifoodNumber || ''}
                                                onChange={e => handleFieldChange('ifoodNumber', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Resultado da Pesquisa</label>
                                            <textarea
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary min-h-[120px] resize-none"
                                                placeholder="Cole aqui os endereços e dados obtidos..."
                                                value={localData.ifoodResult || ''}
                                                onChange={e => handleFieldChange('ifoodResult', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-wider">Documentos Resposta</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="file"
                                                    id="ifood-upload"
                                                    className="hidden"
                                                    onChange={(e) => handleAttachFile(e, 'ifoodDocs')}
                                                />
                                                <label
                                                    htmlFor="ifood-upload"
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all text-white flex items-center gap-2"
                                                >
                                                    <Paperclip size={12} /> Anexar
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            {data.ifoodDocs && data.ifoodDocs.length > 0 ? (
                                                data.ifoodDocs.map((doc: string, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl group hover:bg-white/10 transition-all">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                                                                <FileText size={14} />
                                                            </div>
                                                            <span className="text-xs text-white truncate max-w-[150px]">
                                                                {doc.split('/').pop()?.replace(/^\d+_/, '')}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <a href={getPublicUrl(doc)} target="_blank" rel="noopener noreferrer" className="p-1.5 text-text-muted hover:text-white" title="Visualizar">
                                                                <Eye size={14} />
                                                            </a>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm("Excluir este documento do iFood?")) {
                                                                        const updatedDocs = data.ifoodDocs?.filter((d: string) => d !== doc);
                                                                        await updateWarrant(data.id, { ifoodDocs: updatedDocs });
                                                                    }
                                                                }}
                                                                className="p-1.5 text-red-500 hover:text-red-400"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                                                    <p className="text-[10px] text-text-muted font-bold uppercase">Nenhum retorno anexado</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Investigation: Analytic Observations (Merged) */}
                            <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass space-y-4">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                    <MessageSquare className="text-primary" size={16} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Observações Analíticas</span>
                                </div>
                                <textarea value={localData.observation || ''} onChange={e => handleFieldChange('observation', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none min-h-[140px]" placeholder="Adicione considerações estratégicas para futuras equipes..." />
                            </div>

                            {/* Intelligent Report Generator HUD */}
                            <div className="bg-surface-dark/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glass space-y-5">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                                            <FileCheck size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase text-white tracking-widest">Escrivão de Elite</h3>
                                            <p className="text-[10px] text-text-muted font-bold uppercase">Gerador de Relatórios Oficiais</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsCapturasModalOpen(true)} className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-tactic transition-all active:scale-95 flex items-center gap-2">
                                        <Sparkles size={16} /> NOVO RELATÓRIO
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {data.reports && data.reports.length > 0 ? (
                                        data.reports.map((file: string, idx: number) => (
                                            <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all group">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">RELATÓRIO OPERACIONAL</p>
                                                        <p className="text-xs font-bold text-white truncate">{file.split('/').pop()?.replace(/^\d+_/, '')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a href={getPublicUrl(file)} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 text-white">
                                                        <ExternalLink size={12} /> Visualizar
                                                    </a>
                                                    <button onClick={() => handleDeleteAttachment(file)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-50/20 rounded-lg transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center py-6 opacity-30 bg-white/5 rounded-2xl border-2 border-dashed border-white/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum documento tático emitido</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'timeline' && (
                        <div className="space-y-6">
                            {/* Investigation Feed Header */}
                            <div className="bg-surface-dark/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-tactic">
                                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                                        <History size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-white tracking-widest">Log Operacional</h3>
                                        <p className="text-[10px] text-text-muted font-bold uppercase">Histórico Cronológico de Diligências</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 focus-within:ring-2 focus-within:ring-primary/40 transition-all shadow-inner relative group">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-black uppercase tracking-widest text-primary/80">Entrada de Informe de Campo</span>
                                        <button onClick={handleAnalyzeDiligence} disabled={!newDiligence.trim() || isAnalyzingDiligence} className="text-[10px] font-black uppercase bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50">
                                            <Sparkles size={14} className={isAnalyzingDiligence ? 'animate-spin' : ''} /> ANALISAR INTELIGÊNCIA
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea value={newDiligence} onChange={e => setNewDiligence(e.target.value)} className="w-full bg-transparent border-none text-white text-lg leading-relaxed outline-none resize-none min-h-[160px] pr-12 scrollbar-none placeholder:text-white/20" placeholder="Descreva informes brutos, vizinhos, veículos, placas..." />
                                        <div className="absolute right-0 bottom-0 p-2">
                                            <VoiceInput onTranscript={t => setNewDiligence(t)} currentValue={newDiligence} />
                                        </div>
                                    </div>

                                    {aiDiligenceResult && (
                                        <div className="mt-4 animate-in fade-in zoom-in-95">
                                            {aiAnalysisSaved ? (
                                                <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center shadow-lg shadow-green-500/10 transition-all duration-500 transform scale-100 opacity-100">
                                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 animate-bounce">
                                                        <CheckCircle size={32} />
                                                    </div>
                                                    <h3 className="text-lg font-black uppercase text-white mb-1 tracking-wider">Inteligência Registrada</h3>
                                                    <p className="text-xs text-green-400 font-bold uppercase tracking-widest mb-4">Dossiê e Prontuário Atualizados</p>

                                                    {aiTimeSuggestion && (
                                                        <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center gap-3 animate-pulse">
                                                            <Sparkles size={16} className="text-indigo-400" />
                                                            <span className="text-xs font-black uppercase text-indigo-300 tracking-wider">Sugestão Tática Otimizada</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Bot size={14} className="text-indigo-400" />
                                                            <span className="text-xs font-black uppercase text-indigo-300 tracking-widest">Relatório Estratégico (IA)</span>
                                                        </div>
                                                        <button onClick={handleClearAnalysis} className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-colors" title="Apagar análise e histórico">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    {typeof aiDiligenceResult === 'string' ? (
                                                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{aiDiligenceResult}</p>
                                                    ) : (
                                                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                                                            {/* Risk Meter */}
                                                            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Siren size={14} className={
                                                                            (aiDiligenceResult.riskLevel?.toUpperCase().includes('CRÍTICO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('CRITICAL')) ? 'text-red-500 animate-pulse' :
                                                                                (aiDiligenceResult.riskLevel?.toUpperCase().includes('ALTO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('HIGH')) ? 'text-orange-500' :
                                                                                    (aiDiligenceResult.riskLevel?.toUpperCase().includes('MÉDIO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('MEDIUM')) ? 'text-yellow-500' : 'text-green-500'
                                                                        } />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Nível de Risco</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(aiDiligenceResult.riskLevel?.toUpperCase().includes('CRÍTICO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('CRITICAL')) ? 'bg-red-500/20 text-red-500' :
                                                                        (aiDiligenceResult.riskLevel?.toUpperCase().includes('ALTO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('HIGH')) ? 'bg-orange-500/20 text-orange-500' :
                                                                            (aiDiligenceResult.riskLevel?.toUpperCase().includes('MÉDIO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('MEDIUM')) ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'
                                                                        }`}>
                                                                        {(aiDiligenceResult.riskLevel?.toUpperCase().includes('CRITICAL') ? 'CRÍTICO' :
                                                                            aiDiligenceResult.riskLevel?.toUpperCase().includes('HIGH') ? 'ALTO' :
                                                                                aiDiligenceResult.riskLevel?.toUpperCase().includes('MEDIUM') ? 'MÉDIO' :
                                                                                    aiDiligenceResult.riskLevel?.toUpperCase().includes('LOW') ? 'BAIXO' :
                                                                                        aiDiligenceResult.riskLevel) || 'EM ANÁLISE'}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                    <div className={`h-full transition-all duration-1000 ${(aiDiligenceResult.riskLevel?.toUpperCase().includes('CRÍTICO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('CRITICAL')) ? 'w-full bg-red-500' :
                                                                        (aiDiligenceResult.riskLevel?.toUpperCase().includes('ALTO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('HIGH')) ? 'w-3/4 bg-orange-500' :
                                                                            (aiDiligenceResult.riskLevel?.toUpperCase().includes('MÉDIO') || aiDiligenceResult.riskLevel?.toUpperCase().includes('MEDIUM')) ? 'w-1/2 bg-yellow-500' : 'w-1/4 bg-green-500'
                                                                        }`}></div>
                                                                </div>
                                                                <p className="mt-2 text-sm text-text-secondary-dark">{aiDiligenceResult.riskReason}</p>
                                                            </div>

                                                            {/* Entities Graph - Restored */}
                                                            {aiDiligenceResult.entities && aiDiligenceResult.entities.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-black uppercase text-indigo-300 mb-2 flex items-center gap-1"><Users size={14} /> Vínculos Identificados</p>
                                                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                                                        {aiDiligenceResult.entities.map((ent: any, i: number) => (
                                                                            <div key={i} className="min-w-[150px] bg-white/5 border border-white/5 p-3 rounded-lg flex flex-col gap-1 shrink-0">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <User size={14} className="text-primary" />
                                                                                    <span className="text-xs font-bold text-white truncate">{ent.name}</span>
                                                                                </div>
                                                                                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded w-fit">{ent.role}</span>
                                                                                <a
                                                                                    href={`https://www.google.com/search?q=${encodeURIComponent(ent.name)}`}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="mt-1 text-[10px] text-text-muted hover:text-white flex items-center gap-1 transition-colors"
                                                                                >
                                                                                    <Search size={12} /> Pesquisar
                                                                                </a>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Tactical Checklist */}
                                                            {aiDiligenceResult.checklist && aiDiligenceResult.checklist.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-black uppercase text-indigo-300 mb-2 flex items-center gap-1"><CheckSquare size={14} /> Plano de Ação</p>
                                                                    <div className="space-y-1.5">
                                                                        {aiDiligenceResult.checklist.map((item: any, i: number) => (
                                                                            <div
                                                                                key={i}
                                                                                onClick={() => handleToggleChecklist(i)}
                                                                                className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${item.checked
                                                                                    ? 'bg-green-500/5 border-green-500/20 opacity-60'
                                                                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                                                    }`}
                                                                            >
                                                                                <div className={`mt-0.5 w-3 h-3 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-green-500 border-green-500' : 'border-white/30'
                                                                                    }`}>
                                                                                    {item.checked && <CheckSquare size={8} className="text-black" />}
                                                                                </div>
                                                                                <div>
                                                                                    <p className={`text-sm font-medium ${item.checked ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                                                                                        {item.task}
                                                                                    </p>
                                                                                    {item.priority === 'Alta' && !item.checked && (
                                                                                        <span className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 px-1.5 rounded mt-1 inline-block">Prioridade Alta</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Geo Intelligence */}
                                                            {aiDiligenceResult.locations && aiDiligenceResult.locations.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-black uppercase text-indigo-300 mb-2 flex items-center gap-1"><MapPin size={14} /> Rastro Geográfico</p>
                                                                    <div className="space-y-1.5">
                                                                        {aiDiligenceResult.locations.map((loc: any, i: number) => (
                                                                            <div key={i} className="bg-white/5 border border-white/5 p-2 rounded-lg flex items-start gap-2 group hover:bg-white/10 transition-all">
                                                                                <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                                                    <MapIcon size={12} />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-sm font-bold text-gray-100 truncate">{loc.address}</p>
                                                                                    <p className="text-xs text-gray-400">{loc.context}</p>
                                                                                </div>
                                                                                <a
                                                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="p-1.5 text-text-muted hover:text-white bg-black/20 hover:bg-indigo-600 rounded-lg transition-all"
                                                                                >
                                                                                    <ExternalLink size={10} />
                                                                                </a>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Summary */}
                                                            <div className="pt-2 text-sm text-gray-300 border-t border-white/5 italic">
                                                                "{aiDiligenceResult.summary}"
                                                            </div>

                                                            {/* Chat Interface */}
                                                            <div className="mt-4 pt-4 border-t border-indigo-500/20">
                                                                <div className="space-y-3 mb-3 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/30 pr-2">
                                                                    {Array.isArray(chatHistory) && chatHistory.map((msg, idx) => (
                                                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                                            <div className={`max-w-[85%] p-2 rounded-xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-text-dark rounded-tl-sm'}`}>
                                                                                {msg.content}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {isChatThinking && (
                                                                        <div className="flex justify-start">
                                                                            <div className="bg-white/10 text-text-muted p-2 rounded-xl rounded-tl-sm flex items-center gap-1">
                                                                                <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                                                                                <span className="w-1 h-1 bg-current rounded-full animate-bounce delay-100"></span>
                                                                                <span className="w-1 h-1 bg-current rounded-full animate-bounce delay-200"></span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="relative">
                                                                    <input
                                                                        value={chatInput}
                                                                        onChange={e => setChatInput(e.target.value)}
                                                                        onKeyDown={e => e.key === 'Enter' && handleAssistantChat()}
                                                                        placeholder="Pergunte ao Agente sobre os dados..."
                                                                        className="w-full bg-black/20 border border-indigo-500/20 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-indigo-300/30"
                                                                    />
                                                                    <button
                                                                        onClick={handleAssistantChat}
                                                                        disabled={!chatInput.trim() || isChatThinking}
                                                                        className="absolute right-1 top-1 p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-colors disabled:opacity-50"
                                                                    >
                                                                        <Send size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            handleAddDiligence();
                                            toast.success("INTELIGÊNCIA COMPUTADA E FUNDIDA COM SUCESSO!", {
                                                icon: '🧠',
                                                style: {
                                                    background: '#1e1b4b',
                                                    color: '#fff',
                                                    border: '1px solid #6366f1'
                                                }
                                            });
                                        }}
                                        disabled={(!newDiligence.trim() && !aiDiligenceResult) || isSavingDiligence}
                                        className="w-full mt-4 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-tactic transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSavingDiligence ? <RefreshCw className="animate-spin" size={18} /> : <PlusCircle size={18} />}
                                        {isSavingDiligence ? 'PROCESSANDO FUSÃO...' : 'REGISTRAR NO PRONTUÁRIO'}
                                    </button>
                                </div>

                                {/* Document Analysis Button */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 text-center group hover:bg-white/10 transition-all cursor-dashed border-2 border-indigo-500/20">
                                    <Bot size={24} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">Centro de Fusão de Dados</h4>
                                        <p className="text-[10px] text-text-muted mt-1 uppercase">Carregar arquivos externos (PDF/TXT) para cruzamento de dados</p>
                                    </div>
                                    <input
                                        type="file"
                                        id="doc-analysis-upload"
                                        className="hidden"
                                        accept=".pdf,.txt"
                                        onChange={handleAnalyzeDocument}
                                        disabled={isAnalyzingDoc}
                                    />
                                    <label
                                        htmlFor="doc-analysis-upload"
                                        className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 ${isAnalyzingDoc ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        {isAnalyzingDoc ? <RefreshCw className="animate-spin" size={14} /> : <FileText size={14} />}
                                        {isAnalyzingDoc ? 'PROCESSANDO INTELIGÊNCIA...' : 'ANALISAR DOCUMENTO AGORA'}
                                    </label>
                                </div>

                                <div className="space-y-4 relative before:absolute before:left-[17px] before:top-4 before:bottom-0 before:w-0.5 before:bg-white/10">
                                    {Array.isArray(data.diligentHistory) && data.diligentHistory.length > 0 ? (
                                        [...data.diligentHistory].reverse().map((h: any, idx: number) => (
                                            <div key={h.id} className="relative pl-12 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                                <div className="absolute left-0 top-1 w-9 h-9 rounded-xl bg-surface-dark border border-white/10 flex items-center justify-center z-10 shadow-glass">
                                                    <History size={16} className="text-primary" />
                                                </div>
                                                <div className="bg-surface-dark/90 backdrop-blur border border-white/5 rounded-2xl p-4 group hover:border-primary/30 transition-all shadow-glass">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                                            <span className="text-[10px] text-text-muted font-mono opacity-60">{new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteDiligence(h.id)} className="p-2 text-text-muted hover:text-red-500 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <p className="text-base text-text-dark/90 leading-relaxed font-medium">{h.notes}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/5 mx-4">
                                            <History size={40} className="mx-auto text-white/10 mb-4" />
                                            <p className="text-xs text-text-muted font-black uppercase tracking-[0.2em]">Sem Histórico Operacional</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sticky Tactical Confirmation Bar */}
                    {hasChanges && (
                        <div className="fixed bottom-[110px] left-4 right-4 p-4 bg-primary/90 backdrop-blur-xl border border-white/20 rounded-2xl z-[60] flex gap-3 animate-in slide-in-from-bottom duration-500 shadow-tactic">
                            <button onClick={handleCancelEdits} className="flex-1 py-4 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-colors">Abortar Alterações</button>
                            <button onClick={() => setIsConfirmSaveOpen(true)} className="flex-1 py-4 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-primary shadow-lg hover:shadow-white/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                <CheckCircle size={18} /> SINCRONIZAR DADOS
                            </button>
                        </div>
                    )}
                </div>


                {/* Modals & Overlays */}
                <ConfirmModal isOpen={isConfirmSaveOpen} onCancel={() => setIsConfirmSaveOpen(false)} onConfirm={handleSaveChanges} title="Sincronizar Protocolo" message="Deseja registrar as alterações no prontuário oficial deste alvo?" confirmText="Sincronizar" cancelText="Abortar" variant="primary" />
                <ConfirmModal isOpen={isReopenConfirmOpen} onCancel={() => setIsReopenConfirmOpen(false)} onConfirm={handleConfirmReopen} title="Reabrir Prontuário" message="Confirmar reabertura do status para 'EM ABERTO'?" confirmText="Reabrir" cancelText="Cancelar" variant="primary" />
                <ConfirmModal isOpen={isDeleteConfirmOpen} onCancel={() => setIsDeleteConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir Alvo" message="Deseja remover PERMANENTEMENTE este registro? Esta ação é irreversível." confirmText="Excluir" cancelText="Cancelar" variant="danger" />

                <IfoodAgentModal
                    isOpen={isIfoodModalOpen}
                    onClose={() => setIsIfoodModalOpen(false)}
                    warrant={data}
                    onUpdate={updateWarrant}
                />

                {
                    isCapturasModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-surface-dark border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-tactic">
                                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                                    <div className="flex items-center gap-3"><Sparkles className="text-primary animate-pulse" size={20} /><h3 className="text-lg font-black uppercase tracking-tighter text-white">Centro de Redação Inteligente</h3></div>
                                    <button onClick={() => setIsCapturasModalOpen(false)} className="p-2 text-text-muted hover:text-white"><X size={24} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black text-primary uppercase tracking-widest">Identificador Relatório</label><input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" value={capturasData.reportNumber} onChange={e => setCapturasData({ ...capturasData, reportNumber: e.target.value })} /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black text-primary uppercase tracking-widest">Comarca Judiciária</label><input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" value={capturasData.court} onChange={e => setCapturasData({ ...capturasData, court: e.target.value })} /></div>
                                    </div>
                                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2"><Cpu size={16} className="text-indigo-400" /><span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Prompt de Refinamento IA</span></div>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-indigo-300/30" placeholder="Ex: 'Seja mais formal', 'Mencione a equipe de campo'..." value={capturasData.aiInstructions} onChange={e => setCapturasData({ ...capturasData, aiInstructions: e.target.value })} />
                                        <button onClick={handleRefreshAiReport} disabled={isGeneratingAiReport} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">{isGeneratingAiReport ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />} {isGeneratingAiReport ? 'ANTIGRAVITY PROCESSANDO...' : 'EXECUTAR ANÁLISE E REDAÇÃO IA'}</button>
                                    </div>
                                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm leading-relaxed text-white min-h-[300px] font-serif" value={capturasData.body} onChange={e => setCapturasData({ ...capturasData, body: e.target.value })} />
                                </div>
                                <div className="p-5 border-t border-white/10 bg-white/5">
                                    <button onClick={handleGenerateCapturasPDF} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-tactic flex items-center justify-center gap-2"><Printer size={18} /> IMPRIMIR E ANEXAR PDF OFICIAL</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    isFinalizeModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <div className="bg-surface-dark border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-tactic space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/5 pb-4"><CheckCircle className="text-green-500" size={24} /><h3 className="text-xl font-black uppercase text-white tracking-tighter">Encerrar Protocolo</h3></div>
                                <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Data Cumprimento</label><input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={finalizeFormData.date} onChange={e => setFinalizeFormData({ ...finalizeFormData, date: e.target.value })} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ofício DIG Vinculado</label><input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={finalizeFormData.digOffice} onChange={e => setFinalizeFormData({ ...finalizeFormData, digOffice: e.target.value })} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Resultado Final</label><select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white appearance-none" value={finalizeFormData.result} onChange={e => setFinalizeFormData({ ...finalizeFormData, result: e.target.value })}>{['PRESO', 'NEGATIVO', 'ENCAMINHADO', 'ÓBITO', 'CONTRA', 'LOCALIZADO'].map(opt => <option key={opt} value={opt} className="bg-surface-dark">{opt}</option>)}</select></div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsFinalizeModalOpen(false)} className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-all">Cancelar</button>
                                    <button onClick={handleConfirmFinalize} className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-green-500 text-white shadow-lg shadow-green-500/20">Finalizar Alvo</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    isPhotoModalOpen && (
                        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-start justify-center p-4 pt-20 overflow-y-auto" onClick={() => setIsPhotoModalOpen(false)}>
                            <img src={data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`} className="max-h-[85vh] max-w-full rounded-2xl shadow-tactic border border-white/20 object-contain animate-in zoom-in-95" alt={data.name} />
                        </div>
                    )
                }
            </div>
        </div >
    );
};

export default WarrantDetail;
