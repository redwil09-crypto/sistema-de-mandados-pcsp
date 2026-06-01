
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
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex items-center justify-center gap-3">
                            <p className="text-sm font-bold">Arquivo {currentIndex + 1} de {batchResults.length}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Salvar Mandado
                            </button>
                            <button
                                onClick={backToInput}
                                className="px-6 py-3 bg-orange-500/10 text-orange-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Voltar
                            </button>
                        </div>
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
