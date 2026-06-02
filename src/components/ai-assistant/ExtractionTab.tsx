
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { formatDate, maskDate } from '../../utils/helpers';
import {
    Cpu, ListTodo, Search, Database, Plus, Trash2,
    RefreshCw, Save, CheckCircle, Filter, Home, History,
    Bell, Zap, Printer, User, Calendar, MapPin, Mic,
    MicOff, Bot, Briefcase, FileUp, Gavel, AlertTriangle, FileCheck,
    Paperclip, ShieldAlert, Layers, Sparkles, Camera, Map as MapIcon, ExternalLink,
    File, Eye, Download, FileText
} from 'lucide-react';
import Header from '../Header';
import ConfirmModal from '../ConfirmModal';
import { toast } from 'sonner';
import { Warrant } from '../../types';
import { extractPdfData, extractFromText, determineDpRegion } from '../../pdfExtractor';
import { uploadFile, getPublicUrl } from '../../supabaseStorage';
import { analyzeWarrantData, isGeminiEnabled } from '../../services/geminiService';
import { geocodeAddress } from '../../services/geocodingService';
import { useWarrants } from '../../contexts/WarrantContext';
import { supabase } from '../../supabaseClient';

interface ExtractionTabProps {
    onSaveSuccess?: () => void;
}

const ExtractionTab: React.FC<ExtractionTabProps> = ({ onSaveSuccess }) => {
    const { addWarrant: onAdd, warrants } = useWarrants();
    const navigate = useNavigate();
    const [step, setStep] = useState<'input' | 'processing' | 'review' | 'saved'>('input');
    const [inputText, setInputText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [hasAi, setHasAi] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

    // Verifica se o Gemini AI está habilitado
    useEffect(() => {
        let cancelled = false;
        isGeminiEnabled().then(enabled => {
            if (!cancelled) setHasAi(enabled);
        });
        return () => { cancelled = true; };
    }, []);

    // Busca o usuário atual
    useEffect(() => {
        let cancelled = false;
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && !cancelled) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setCurrentUser({ name: profile.full_name, email: profile.email });
                } else {
                    setCurrentUser({
                        name: user.user_metadata?.full_name || 'Policial',
                        email: user.email || ''
                    });
                }
            }
        };
        fetchUser();
        return () => { cancelled = true; };
    }, []);

    // Persistência de sessão com debounce
    useEffect(() => {
        const saved = localStorage.getItem('ai_assist_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.batchResults?.length > 0 || parsed.inputText) {
                    setBatchResults(parsed.batchResults || []);
                    setCurrentIndex(parsed.currentIndex || 0);
                    setInputText(parsed.inputText || '');

                    let nextStep = parsed.step || 'input';
                    if (parsed.batchResults?.length > 0 && nextStep !== 'saved') {
                        nextStep = 'review';
                    }

                    setStep(nextStep);

                    if (parsed.batchResults?.length > 0) {
                        toast.info("Dados da extração anterior restaurados.");
                    }
                }
            } catch (e) {
                localStorage.removeItem('ai_assist_session');
            }
        }
    }, []);

    useEffect(() => {
        if (batchResults.length > 0 || inputText.length > 5) {
            const handler = setTimeout(() => {
                const session = {
                    step,
                    batchResults,
                    currentIndex,
                    inputText
                };
                localStorage.setItem('ai_assist_session', JSON.stringify(session));
            }, 2000);

            return () => clearTimeout(handler);
        }
    }, [step, batchResults, currentIndex, inputText]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleExtractedDataChange = (field: string, value: any) => {
        let finalValue = value;
        if (['birthDate', 'issueDate', 'expirationDate'].includes(field)) {
            finalValue = maskDate(value);
        }

        setBatchResults(prev => {
            const newResults = [...prev];
            const current = { ...newResults[currentIndex], [field]: finalValue };

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
                    current.age = `${age} anos`;
                } else {
                    current.age = '';
                }
            }

            newResults[currentIndex] = current;
            return newResults;
        });
    };

    const handleAddressChange = (index: number, value: string) => {
        setBatchResults(prev => {
            const newResults = [...prev];
            const current = newResults[currentIndex];
            const newAddresses = [...current.addresses];
            newAddresses[index] = value;
            newResults[currentIndex] = { ...current, addresses: newAddresses };
            return newResults;
        });
    };

    const extractedData = batchResults[currentIndex] || null;

    const handleVoiceAssistant = useCallback(() => {
        if (!('webkitSpeechRecognition' in window)) {
            toast.error("Reconhecimento de voz não suportado.");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.onstart = () => {
            setIsRecording(true);
            toast.info("Descreva o mandado (ex: Prisão de João da Silva por roubo...)");
        };
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = async (event: any) => {
            const text = event.results[0][0].transcript;
            setStep('processing');
            try {
                const data = await extractFromText(text, "Comando de Voz");
                const isDuplicate = warrants.some((w: Warrant) => w.number === data.processNumber);
                const isContramandado = data.type?.toUpperCase().includes('CONTRAMANDADO') || data.type?.toUpperCase().includes('CONTRA MANDADO');

                let locationStr = '';
                let newObservations = data.observations || '';
                if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
                    locationStr = data.addresses[0];
                    if (data.addresses.length > 1) {
                        const extraAddresses = data.addresses.slice(1).map((addr: string, idx: number) => `Endereço 0${idx + 2}: ${addr}`).join(' | ');
                        newObservations = newObservations ? `${newObservations} | ${extraAddresses}` : extraAddresses;
                    }
                }

                setBatchResults([{
                    ...data,
                    status: isContramandado ? 'CUMPRIDO' : 'EM ABERTO',
                    regime: isContramandado ? 'Contramandado' : data.regime,
                    isDuplicate,
                    tags: data.autoPriority || [],
                    addresses: locationStr ? [locationStr] : [],
                    observations: newObservations
                }]);
                setCurrentIndex(0);
                setStep('review');
                toast.success("Mandado gerado via Comando de Voz!");
            } catch (err) {
                toast.error("Não entendi o comando. Tente falar mais pausadamente.");
                setStep('input');
            }
        };
        recognition.start();
    }, [warrants]);

    const startRecording = () => {
        if (!('webkitSpeechRecognition' in window)) {
            toast.error("Reconhecimento de voz não suportado neste navegador.");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = () => setIsRecording(false);

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            handleExtractedDataChange('observations', (extractedData.observations ? extractedData.observations + " | " : "") + text);
            toast.success("Voz convertida em texto!");
        };

        recognition.start();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const uploadedFiles: File[] = Array.from(e.target.files);
            setFiles(uploadedFiles);
            setStep('processing');

            const results = [];
            for (const f of uploadedFiles) {
                try {
                    const data = await extractPdfData(f);
                    const isDuplicate = warrants.some((w: Warrant) => w.number === data.processNumber);
                    const isContramandado = data.type?.toUpperCase().includes('CONTRAMANDADO') || data.type?.toUpperCase().includes('CONTRA MANDADO');

                    let locationStr = '';
                    let newObservations = data.observations || '';
                    if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
                        locationStr = data.addresses[0];
                        if (data.addresses.length > 1) {
                            const extraAddresses = data.addresses.slice(1).map((addr: string, idx: number) => `Endereço 0${idx + 2}: ${addr}`).join(' | ');
                            newObservations = newObservations ? `${newObservations} | ${extraAddresses}` : extraAddresses;
                        }
                    }

                    const formattedData = {
                        ...data,
                        status: isContramandado ? 'CUMPRIDO' : 'EM ABERTO',
                        regime: isContramandado ? 'Contramandado' : data.regime,
                        isDuplicate,
                        tags: data.autoPriority || [],
                        birthDate: formatDate(data.birthDate),
                        issueDate: formatDate(data.issueDate),
                        expirationDate: formatDate(data.expirationDate),
                        addresses: locationStr ? [locationStr] : [],
                        observations: newObservations
                    };
                    results.push(formattedData);
                } catch (error: any) {
                    toast.error(`Erro no arquivo ${f.name}`);
                }
            }

            if (results.length > 0) {
                setBatchResults(results);
                setCurrentIndex(0);
                toast.success(`${results.length} arquivo(s) processado(s)!`);
                setStep('review');
            } else {
                setStep('input');
            }
            e.target.value = '';
        }
    };

    const handleTextExtraction = async () => {
        if (!inputText.trim()) return;
        setStep('processing');
        try {
            const data = await extractFromText(inputText, "Texto via Transferência");
            const isDuplicate = warrants.some((w: Warrant) => w.number === data.processNumber);
            const isContramandado = data.type?.toUpperCase().includes('CONTRAMANDADO') || data.type?.toUpperCase().includes('CONTRA MANDADO');

            let locationStr = '';
            let newObservations = data.observations || '';
            if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
                locationStr = data.addresses[0];
                if (data.addresses.length > 1) {
                    const extraAddresses = data.addresses.slice(1).map((addr: string, idx: number) => `Endereço 0${idx + 2}: ${addr}`).join(' | ');
                    newObservations = newObservations ? `${newObservations} | ${extraAddresses}` : extraAddresses;
                }
            }

            const formattedData = {
                ...data,
                status: isContramandado ? 'CUMPRIDO' : 'EM ABERTO',
                regime: isContramandado ? 'Contramandado' : data.regime,
                isDuplicate,
                tags: data.autoPriority || [],
                birthDate: formatDate(data.birthDate),
                issueDate: formatDate(data.issueDate),
                expirationDate: formatDate(data.expirationDate),
                addresses: locationStr ? [locationStr] : [],
                observations: newObservations
            };
            setBatchResults([formattedData]);
            setCurrentIndex(0);
            toast.success("Texto processado!");
            setStep('review');
        } catch (error: any) {
            toast.error("Erro ao processar texto");
            setStep('input');
        }
    };

    const handleSave = () => {
        setIsSaveConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        if (!extractedData.name || !extractedData.processNumber) {
            toast.error("Nome e Número do Processo são campos obrigatórios.");
            setIsSaveConfirmOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            const warrantId = Date.now().toString();
            let photoUrl = extractedData.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(extractedData.name)}&background=random&color=fff`;

            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `photos/${warrantId}_${Date.now()}.${ext}`;
                const uploadedPath = await uploadFile(photoFile, path);
                if (uploadedPath) {
                    photoUrl = getPublicUrl(uploadedPath);
                }
            }

            let attachments: string[] = [];
            let ifoodDocs: string[] = [];
            let reports: string[] = [];

            if (files && files[currentIndex]) {
                const pdfFile = files[currentIndex];
                const isIfood = (extractedData.type || '').toLowerCase().includes('ifood') || pdfFile.name.toLowerCase().includes('ifood');
                const isReport = (extractedData.type || '').toLowerCase().includes('relatorio') || pdfFile.name.toLowerCase().includes('relatorio');

                const typePath = isIfood ? 'ifoodDocs' : (isReport ? 'reports' : 'attachments');
                const pdfPath = `${typePath}/${warrantId}/${Date.now()}_${pdfFile.name}`;

                try {
                    const uploadedPdfPath = await uploadFile(pdfFile, pdfPath);
                    if (uploadedPdfPath) {
                        const pdfUrl = getPublicUrl(uploadedPdfPath);
                        if (isIfood) ifoodDocs.push(pdfUrl);
                        else if (isReport) reports.push(pdfUrl);
                        else attachments.push(pdfUrl);
                    }
                } catch (uploadError) {
                    console.error("Error uploading PDF:", uploadError);
                }
            }

            const isContramandado = extractedData.type?.toUpperCase().includes('CONTRAMANDADO') ||
                extractedData.type?.toUpperCase().includes('CONTRA MANDADO') ||
                extractedData.regime?.toLowerCase() === 'contramandado';

            const newWarrant: Warrant = {
                id: warrantId,
                name: extractedData.name,
                type: isContramandado ? 'CONTRAMANDADO DE PRISÃO' : extractedData.type,
                status: isContramandado ? 'CUMPRIDO' : (extractedData.status || 'EM ABERTO'),
                number: extractedData.processNumber,
                rg: extractedData.rg || '',
                cpf: extractedData.cpf || '',
                crime: extractedData.crime || 'Não informado',
                regime: isContramandado ? 'Contramandado' : (extractedData.regime || 'Não informado'),
                observation: extractedData.observations || '',
                issueDate: extractedData.issueDate,
                entryDate: new Date().toISOString().split('T')[0],
                expirationDate: extractedData.expirationDate,
                img: photoUrl,
                attachments: attachments,
                reports: reports,
                ifoodDocs: ifoodDocs,
                tags: [],
                tacticalSummary: extractedData.tacticalSummary || [],
                location: (extractedData.addresses && extractedData.addresses.length > 0) ? extractedData.addresses[0] : '',
                birthDate: extractedData.birthDate,
                age: extractedData.age,
                issuingCourt: extractedData.issuingCourt,
                latitude: extractedData.latitude,
                longitude: extractedData.longitude,
                dpRegion: extractedData.dpRegion || ''
            };

            const { success, error, id } = await onAdd(newWarrant);
            if (success) {
                toast.success(`${extractedData.name} salvo com sucesso!`);
                onSaveSuccess?.();

                if (currentIndex < batchResults.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                } else {
                    setStep('saved');
                    localStorage.removeItem('ai_assist_session');
                    if (batchResults.length === 1 && id) {
                        navigate(`/warrant-detail/${id}`);
                    }
                }
            } else {
                toast.error(`Erro ao salvar no banco de dados: ${error || "Verifique a conexão."}`);
            }
        } catch (error: any) {
            console.error("Erro ao salvar via Assistente IA:", error);
            toast.error(`Erro inesperado ao salvar mandado: ${error.message || error}`);
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };

    const reset = () => {
        localStorage.removeItem('ai_assist_session');
        setStep('input');
        setFiles([]);
        setBatchResults([]);
        setCurrentIndex(0);
        setInputText('');
    };

    const backToInput = () => {
        setStep('input');
    };

    return (
        <div className="space-y-6">
            {step === 'input' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={handleVoiceAssistant}
                            className="col-span-1 sm:col-span-2 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg border border-white/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-bold"
                        >
                            {isRecording ? <Mic className="animate-pulse" size={24} /> : <Mic size={24} />}
                            {isRecording ? "OUVINDO..." : "CRIAR MANDADO POR VOZ"}
                        </button>

                        <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-light dark:bg-surface-dark hover:border-primary transition-colors cursor-pointer relative group">
                            <FileUp size={32} className="text-text-secondary-light dark:text-text-secondary-dark mb-2 group-hover:text-primary transition-colors" />
                            <p className="font-bold text-text-light dark:text-text-dark text-[11px]">Enviar PDF/DOCX</p>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx,.jpg,.png,.jpeg" multiple onChange={handleFileUpload} />
                        </div>

                        <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-light dark:bg-surface-dark hover:border-primary transition-colors cursor-pointer relative group">
                            <Camera size={32} className="text-text-secondary-light dark:text-text-secondary-dark mb-2 group-hover:text-primary transition-colors" />
                            <p className="font-bold text-text-light dark:text-text-dark text-[11px]">Tirar Foto</p>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" capture="environment" onChange={handleFileUpload} />
                        </div>

                        <a
                            href="https://portalbnmp.cnj.jus.br/#/pesquisa-peca"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="col-span-1 sm:col-span-2 mt-1 py-4 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white border border-emerald-400/30 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 font-black text-xs sm:text-sm uppercase tracking-widest group"
                        >
                            <Database size={20} className="text-emerald-100 group-hover:scale-110 transition-transform" />
                            <span>Consultar Base BNMP</span>
                            <ExternalLink size={14} className="opacity-70 ml-1 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>

                    <div className="relative flex justify-center text-xs uppercase text-text-secondary-light">
                        <span>Ou cole o texto</span>
                    </div>

                    <div>
                        <textarea
                            className="w-full h-32 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Cole o conteúdo do mandado ou número do processo aqui..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        ></textarea>
                        <button
                            onClick={handleTextExtraction}
                            disabled={!inputText.trim()}
                            className="w-full mt-3 bg-primary disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                            <Cpu size={18} /> Processar Dados
                        </button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Processando...</h3>
                    <p className="text-sm text-text-secondary-light">Identificando tipo de mandado e calculando prazos.</p>
                </div>
            )}

            {step === 'review' && (
                !extractedData ? (
                    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
                        <AlertTriangle size={48} className="text-amber-500 mb-4" />
                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">Dados não encontrados</h3>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6 text-center max-w-xs">
                            Nenhum dado selecionado para revisão.
                        </p>
                        <button
                            onClick={reset}
                            className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg hover:bg-primary/90 transition-all"
                        >
                            Voltar ao Início
                        </button>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-8 duration-300 space-y-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    handleExtractedDataChange('category', 'prison');
                                    handleExtractedDataChange('type', 'Mandado de Prisão');
                                    handleExtractedDataChange('status', 'EM ABERTO');
                                }}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${extractedData.category === 'prison'
                                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20'
                                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                    }`}
                            >
                                <Gavel size={18} />
                                PRISÃO
                            </button>
                            <button
                                onClick={() => {
                                    handleExtractedDataChange('category', 'search');
                                    handleExtractedDataChange('type', 'BUSCA E APREENSÃO');
                                    handleExtractedDataChange('status', 'EM ABERTO');
                                }}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${extractedData.category === 'search'
                                    ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                    }`}
                            >
                                <Briefcase size={18} />
                                BUSCA E APREENSÃO
                            </button>
                            <button
                                onClick={() => {
                                    handleExtractedDataChange('category', 'counter');
                                    handleExtractedDataChange('type', 'CONTRAMANDADO DE PRISÃO');
                                    handleExtractedDataChange('regime', 'Contramandado');
                                    handleExtractedDataChange('status', 'CUMPRIDO');
                                }}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${extractedData.category === 'counter' || (extractedData.type && extractedData.type.includes('CONTRAMANDADO'))
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                    }`}
                            >
                                <FileCheck size={18} />
                                CONTRAMANDADO
                            </button>
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${extractedData.category === 'prison' && !extractedData.type.includes('CONTRAMANDADO')
                            ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30 text-red-800 dark:text-red-300'
                            : (extractedData.category === 'search'
                                ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30 text-orange-800 dark:text-orange-300'
                                : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300')
                            }`}>
                            <div className="flex items-center gap-3">
                                {extractedData.category === 'prison' && !extractedData.type.includes('CONTRAMANDADO') ? <Gavel size={20} /> : (extractedData.category === 'search' ? <Briefcase size={20} /> : <FileCheck size={20} />)}
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-sm tracking-tight">{extractedData.type.toUpperCase()}</h3>
                                    <span className="text-[10px] opacity-70">Arquivo {currentIndex + 1} de {batchResults.length}</span>
                                </div>
                            </div>
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-500 hover:border-primary dark:hover:border-primary overflow-hidden group cursor-pointer bg-slate-100 dark:bg-slate-800 transition-all shadow-md">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Alvo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                        <Camera size={28} className="text-slate-400 dark:text-slate-400 group-hover:text-primary transition-colors" />
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 group-hover:text-primary uppercase">Foto</span>
                                    </div>
                                )}
                                <input type="file" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                            </div>
                        </div>

                        {extractedData.isDuplicate && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                                <ShieldAlert className="text-red-500" size={20} />
                                <div>
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">AVISO DE DUPLICIDADE</p>
                                    <p className="text-[10px] text-red-500/80">Este número de processo já existe no banco de dados.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                            <div className="p-3 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-xs uppercase">Conferência de Dados</h3>
                                {hasAi && (
                                    <button
                                        onClick={async () => {
                                            toast.info("Aprimorando extração com Gemini Pro...");
                                            const fullText = `Mandado: ${extractedData.processNumber}. Nome: ${extractedData.name}. Crime: ${extractedData.crime}. Texto: ${extractedData.observations}`;
                                            const analysis = await analyzeWarrantData(fullText);
                                            if (analysis) {
                                                const results = [...batchResults];
                                                results[currentIndex] = {
                                                    ...results[currentIndex],
                                                    tacticalSummary: [analysis.summary],
                                                    observations: `[ANÁLISE IA]: ${analysis.summary}\n\n${results[currentIndex].observations || ''}`,
                                                    tags: [...new Set([...(results[currentIndex].tags || []), ...analysis.warnings])]
                                                };
                                                setBatchResults(results);
                                                toast.success("Dados aprimorados com sucesso!");
                                            }
                                        }}
                                        className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-lg border border-blue-200"
                                    >
                                        <Sparkles size={12} /> IA Pro
                                    </button>
                                )}
                            </div>

                            <div className="p-4 space-y-8">
                                {/* Pessoais */}
                                <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-border-light dark:border-border-dark pb-1">
                                        <User size={16} className="text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-text-light dark:text-text-dark">Dados Pessoais</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Nome Completo</label>
                                            <input
                                                type="text"
                                                value={extractedData.name || ''}
                                                onChange={(e) => handleExtractedDataChange('name', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm font-bold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">RG</label>
                                            <input
                                                type="text"
                                                value={extractedData.rg || ''}
                                                onChange={(e) => handleExtractedDataChange('rg', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">CPF</label>
                                            <input
                                                type="text"
                                                value={extractedData.cpf || ''}
                                                onChange={(e) => handleExtractedDataChange('cpf', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Nascimento</label>
                                            <input
                                                type="text"
                                                value={extractedData.birthDate || ''}
                                                onChange={(e) => handleExtractedDataChange('birthDate', e.target.value)}
                                                placeholder="DD/MM/YYYY"
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Idade Atual</label>
                                            <input
                                                type="text"
                                                value={extractedData.age || ''}
                                                onChange={(e) => handleExtractedDataChange('age', e.target.value)}
                                                placeholder="Ex: 25 anos"
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Processual */}
                                <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-border-light dark:border-border-dark pb-1">
                                        <Gavel size={16} className="text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-text-light dark:text-text-dark">Dados Processuais</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Nº do Processo</label>
                                            <input
                                                type="text"
                                                value={extractedData.processNumber || ''}
                                                onChange={(e) => handleExtractedDataChange('processNumber', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm font-mono font-bold outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Natureza Criminal</label>
                                            <input
                                                type="text"
                                                value={extractedData.crime || ''}
                                                onChange={(e) => handleExtractedDataChange('crime', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Regime Prisional</label>
                                            <input
                                                type="text"
                                                value={extractedData.regime || ''}
                                                onChange={(e) => handleExtractedDataChange('regime', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Vara / Fórum</label>
                                            <input
                                                type="text"
                                                value={extractedData.issuingCourt || ''}
                                                onChange={(e) => handleExtractedDataChange('issuingCourt', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Datas */}
                                <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-border-light dark:border-border-dark pb-1">
                                        <Calendar size={16} className="text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-text-light dark:text-text-dark">Prazos e Datas</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Expedição</label>
                                            <input
                                                type="text"
                                                value={extractedData.issueDate || ''}
                                                onChange={(e) => handleExtractedDataChange('issueDate', e.target.value)}
                                                placeholder="DD/MM/YYYY"
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Vencimento</label>
                                            <input
                                                type="text"
                                                value={extractedData.expirationDate || ''}
                                                onChange={(e) => handleExtractedDataChange('expirationDate', e.target.value)}
                                                placeholder="DD/MM/YYYY"
                                                className="w-full bg-transparent border-b border-red-200 dark:border-red-900 py-1 text-sm font-bold text-red-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Localização */}
                                <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-border-light dark:border-border-dark pb-1">
                                        <MapPin size={16} className="text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-text-light dark:text-text-dark">Localização</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                value={extractedData.addresses?.[0] || ''}
                                                onChange={(e) => {
                                                    const newAddresses = [...(extractedData.addresses || [])];
                                                    newAddresses[0] = e.target.value;
                                                    handleExtractedDataChange('addresses', newAddresses);
                                                    handleExtractedDataChange('location', e.target.value);
                                                }}
                                                type="text"
                                                placeholder="Endereço"
                                                className="flex-1 bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                            <select
                                                value={extractedData.dpRegion || ''}
                                                onChange={(e) => handleExtractedDataChange('dpRegion', e.target.value)}
                                                className="bg-white dark:bg-black/20 border border-border-light dark:border-border-dark rounded-lg p-2 text-sm"
                                            >
                                                <option value="">Sem DP</option>
                                                <option value="1º DP">1º DP</option>
                                                <option value="2º DP">2º DP</option>
                                                <option value="3º DP">3º DP</option>
                                                <option value="4º DP">4º DP</option>
                                                <option value="Outras Cidades">Outras Cidades</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const address = extractedData.addresses?.[0];
                                                    if (!address) {
                                                        toast.error("Informe um endereço primeiro");
                                                        return;
                                                    }
                                                    const tid = toast.loading("Buscando coordenadas...");
                                                    const res = await geocodeAddress(address);
                                                    if (res) {
                                                        const results = [...batchResults];
                                                        const dpFound = determineDpRegion(address);
                                                        results[currentIndex] = {
                                                            ...results[currentIndex],
                                                            latitude: res.lat,
                                                            longitude: res.lng,
                                                            dpRegion: dpFound || results[currentIndex].dpRegion
                                                        };
                                                        setBatchResults(results);
                                                        toast.success("Mapeado com sucesso!", { id: tid });
                                                    } else {
                                                        toast.error("Endereço não localizado", { id: tid });
                                                    }
                                                }}
                                                className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg transition-all"
                                                title="Mapear Endereço"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                        </div>
                                        {extractedData.latitude && extractedData.longitude && (
                                            <div className="flex gap-2">
                                                <Link
                                                    to={`/map?lat=${extractedData.latitude}&lng=${extractedData.longitude}`}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-2"
                                                >
                                                    <MapPin size={14} /> MAPA OPS
                                                </Link>
                                                <a
                                                    href={`https://www.google.com/maps?q=${extractedData.latitude},${extractedData.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-zinc-100 dark:bg-black/40 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-2 border border-border-light dark:border-border-dark"
                                                >
                                                    <ExternalLink size={14} /> GOOGLE MAPS
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Observações */}
                                <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-border-light dark:border-border-dark pb-1">
                                        <Bot size={16} className="text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-text-light dark:text-text-dark">Inteligência e Observações</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {/* Priority Selection */}
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-orange-500 block mb-2">Classificação de Prioridade</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tags = extractedData.tags || [];
                                                        const newTags = tags.includes('Urgente') ? tags.filter((t: string) => t !== 'Urgente') : [...tags, 'Urgente'];
                                                        handleExtractedDataChange('tags', newTags);
                                                    }}
                                                    className={`flex-1 py-2 px-2 rounded-lg border font-bold text-[10px] flex items-center justify-center gap-1.5 ${extractedData.tags?.includes('Urgente')
                                                        ? 'bg-red-500 border-red-500 text-white'
                                                        : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                                        }`}
                                                >
                                                    <Zap size={12} className={extractedData.tags?.includes('Urgente') ? 'fill-white' : ''} />
                                                    URGENTE
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tags = extractedData.tags || [];
                                                        const newTags = tags.includes('Ofício de Cobrança') ? tags.filter((t: string) => t !== 'Ofício de Cobrança') : [...tags, 'Ofício de Cobrança'];
                                                        handleExtractedDataChange('tags', newTags);
                                                    }}
                                                    className={`flex-1 py-2 px-2 rounded-lg border font-bold text-[10px] flex items-center justify-center gap-1.5 ${extractedData.tags?.includes('Ofício de Cobrança')
                                                        ? 'bg-orange-500 border-orange-500 text-white'
                                                        : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                                        }`}
                                                >
                                                    <Bell size={12} className={extractedData.tags?.includes('Ofício de Cobrança') ? 'fill-white' : ''} />
                                                    COBRANÇA
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] uppercase font-bold text-orange-500">Observações / Texto bruto</label>
                                                <button onClick={startRecording} className={`p-1.5 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-primary'}`}>
                                                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                                                </button>
                                            </div>
                                            <textarea
                                                value={extractedData.observations || ''}
                                                onChange={(e) => handleExtractedDataChange('observations', e.target.value)}
                                                className="w-full bg-background-light dark:bg-black/20 border border-border-light dark:border-border-dark rounded-lg p-2 text-[10px] outline-none h-20 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex items-center gap-3">
                            <Paperclip size={18} className="text-text-secondary-light" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">Anexo: {extractedData.sourceFile || "Texto Colado"}</p>
                            </div>
                        </div>

                        {batchResults.length > 1 && (
                            <div className="flex items-center justify-center gap-2 py-2">
                                {batchResults.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                )
            )}

            {step === 'saved' && (
                <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">Salvo com Sucesso!</h3>
                    <p className="text-sm text-text-secondary-light mb-6 max-w-xs text-justify">
                        Registro adicionado ao banco de dados.
                    </p>
                    <div className="w-full space-y-3">
                        <button onClick={() => navigate('/warrant-list')} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                            <Database size={18} /> Ver Banco de Dados
                        </button>
                        <button onClick={reset} className="w-full py-3 border border-border-light dark:border-border-dark text-text-secondary-light font-bold rounded-xl">
                            Processar Mais Arquivos
                        </button>
                    </div>
                </div>
            )}

            {isSaveConfirmOpen && extractedData && (
                <ConfirmModal
                    isOpen={isSaveConfirmOpen}
                    title="Salvar Mandado"
                    message={`Deseja adicionar este mandado à lista de ${extractedData?.category === 'prison' ? 'PRISÃO' : 'BUSCA'} e salvar o registro?`}
                    onConfirm={handleConfirmSave}
                    onCancel={() => setIsSaveConfirmOpen(false)}
                    confirmText="Salvar"
                />
            )}
        </div>
    );
};

export default React.memo(ExtractionTab);
