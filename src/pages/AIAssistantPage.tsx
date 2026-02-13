
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { formatDate, maskDate } from '../utils/helpers';
import {
    Cpu, ListTodo, Search, Database, Plus, Trash2,
    RefreshCw, Save, CheckCircle, Filter, Home, History,
    Bell, Zap, Printer, User, Calendar, MapPin, Mic,
    MicOff, Bot, Briefcase, FileUp, Gavel, AlertTriangle, FileCheck,
    Paperclip, ShieldAlert, Layers, Sparkles, Camera, Map as MapIcon, ExternalLink
} from 'lucide-react';
import Header from '../components/Header';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';
import { Warrant } from '../types';
import { CRIME_OPTIONS } from '../data/constants';
import { extractPdfData, extractFromText } from '../pdfExtractor';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import { analyzeWarrantData, isGeminiEnabled } from '../services/geminiService';
import { geocodeAddress } from '../services/geocodingService';
import { useWarrants } from '../contexts/WarrantContext';
import BottomNav from '../components/BottomNav';


const AIAssistantPage = () => {
    const { addWarrant: onAdd, warrants } = useWarrants();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'extraction' | 'database'>((searchParams.get('tab') as any) || 'extraction');

    // Extraction State
    const [step, setStep] = useState<'input' | 'processing' | 'review' | 'saved'>('input');
    const [inputText, setInputText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    // Database Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterCrime, setFilterCrime] = useState('');
    const [filterRegime, setFilterRegime] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [observationKeyword, setObservationKeyword] = useState('');
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [hasAi, setHasAi] = useState(false);

    useEffect(() => {
        isGeminiEnabled().then(setHasAi);
    }, []);

    // Atualiza a URL quando a aba muda
    useEffect(() => {
        setSearchParams({ tab: activeTab }, { replace: true });
    }, [activeTab, setSearchParams]);

    // --- PERSISTENCIA DE SESSÃO ---
    useEffect(() => {
        const saved = localStorage.getItem('ai_assist_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.batchResults?.length > 0 || parsed.inputText) {
                    setBatchResults(parsed.batchResults || []);
                    setCurrentIndex(parsed.currentIndex || 0);
                    setInputText(parsed.inputText || '');

                    // Se tiver dados, vai para revisão. Se estava processando, volta pro input para evitar travamento.
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
            const session = {
                step,
                batchResults,
                currentIndex,
                inputText
            };
            localStorage.setItem('ai_assist_session', JSON.stringify(session));
        }
    }, [step, batchResults, currentIndex, inputText]);



    // Filter Logic
    const filteredWarrants = useMemo(() => {
        return warrants.filter(w => {
            // Text Search
            const term = searchTerm.toLowerCase();
            const matchesText = (
                w.name.toLowerCase().includes(term) ||
                w.number.toLowerCase().includes(term) ||
                (w.location && w.location.toLowerCase().includes(term)) ||
                (w.rg && w.rg.toLowerCase().includes(term)) ||
                (w.cpf && w.cpf.toLowerCase().includes(term)) ||
                w.type.toLowerCase().includes(term) ||
                (w.description && w.description.toLowerCase().includes(term))
            );

            // Advanced Filters
            const matchesCrime = filterCrime ? w.crime === filterCrime : true;
            const matchesRegime = filterRegime ? w.regime === filterRegime : true;
            const matchesStatus = filterStatus ? w.status === filterStatus : true;

            // Date comparison logic
            let matchesDate = true;
            if (dateStart || dateEnd) {
                const wDateStr = w.date || '';
                const wDate = wDateStr.includes('-') ? wDateStr.split('T')[0] : (wDateStr.includes('/') ? wDateStr.split('/').reverse().join('-') : '');

                if (dateStart && dateStart.length === 10) {
                    const startISO = dateStart.split('/').reverse().join('-');
                    if (!wDate || wDate < startISO) matchesDate = false;
                }
                if (dateEnd && dateEnd.length === 10) {
                    const endISO = dateEnd.split('/').reverse().join('-');
                    if (!wDate || wDate > endISO) matchesDate = false;
                }
            }

            const matchesObservation = observationKeyword ? (w.observation || '').toLowerCase().includes(observationKeyword.toLowerCase()) : true;

            return matchesText && matchesCrime && matchesRegime && matchesStatus && matchesDate && matchesObservation;
        });
    }, [warrants, searchTerm, filterCrime, filterRegime, filterStatus, dateStart, dateEnd, observationKeyword]);

    const hasActiveFilters = filterCrime || filterRegime || filterStatus || dateStart || dateEnd || observationKeyword || searchTerm;


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

    const clearFilters = () => {
        setFilterCrime('');
        setFilterRegime('');
        setFilterStatus('');
        setDateStart('');
        setDateEnd('');
        setObservationKeyword('');
        setSearchTerm('');
    };

    const handleExtractedDataChange = (field: string, value: any) => {
        let finalValue = value;
        if (['birthDate', 'issueDate', 'expirationDate'].includes(field)) {
            finalValue = maskDate(value);
        }

        setBatchResults(prev => {
            const newResults = [...prev];
            const current = { ...newResults[currentIndex], [field]: finalValue };

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

    const handleVoiceAssistant = () => {
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
                const isDuplicate = warrants.some(w => w.number === data.processNumber);
                setBatchResults([{ ...data, isDuplicate, tags: data.autoPriority || [] }]);
                setCurrentIndex(0);
                setStep('review');
                toast.success("Mandado gerado via Comando de Voz!");
            } catch (err) {
                toast.error("Não entendi o comando. Tente falar mais pausadamente.");
                setStep('input');
            }
        };
        recognition.start();
    };

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
                    // Anti-duplicity check
                    const isDuplicate = warrants.some(w => w.number === data.processNumber);
                    const formattedData = {
                        ...data,
                        isDuplicate,
                        tags: data.autoPriority || [],
                        birthDate: formatDate(data.birthDate),
                        issueDate: formatDate(data.issueDate),
                        expirationDate: formatDate(data.expirationDate)
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
            const isDuplicate = warrants.some(w => w.number === data.processNumber);
            const formattedData = {
                ...data,
                isDuplicate,
                tags: data.autoPriority || [],
                birthDate: formatDate(data.birthDate),
                issueDate: formatDate(data.issueDate),
                expirationDate: formatDate(data.expirationDate)
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
            let photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(extractedData.name)}&background=random&color=fff`;

            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `photos/${warrantId}_${Date.now()}.${ext}`;
                const uploadedPath = await uploadFile(photoFile, path);
                if (uploadedPath) {
                    photoUrl = getPublicUrl(uploadedPath);
                }
            }

            // Upload extracted PDF if it was from a file
            let attachments = []; // Clear local filenames, only store URLs
            let ifoodDocs: string[] = [];
            let reports: string[] = [];

            if (files && files[currentIndex]) {
                const pdfFile = files[currentIndex];
                const isIfood = extractedData.type.toLowerCase().includes('ifood') || pdfFile.name.toLowerCase().includes('ifood');
                const isReport = extractedData.type.toLowerCase().includes('relatorio') || pdfFile.name.toLowerCase().includes('relatorio');

                const typePath = isIfood ? 'ifoodDocs' : (isReport ? 'reports' : 'attachments');
                const cleanName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const pdfPath = `${typePath}/${warrantId}/${Date.now()}_${cleanName}`;

                const uploadedPdfPath = await uploadFile(pdfFile, pdfPath);
                if (uploadedPdfPath) {
                    const pdfUrl = getPublicUrl(uploadedPdfPath);
                    attachments.push(pdfUrl);
                }
            }

            const newWarrant: Warrant = {
                id: warrantId, // This string ID will be ignored by warrantToDb, DB generates UUID
                name: extractedData.name,
                type: extractedData.type,
                status: 'EM ABERTO',

                number: extractedData.processNumber,
                rg: extractedData.rg || '',
                cpf: extractedData.cpf || '',
                crime: extractedData.crime || 'Não informado',
                regime: extractedData.regime || 'Não informado',
                observation: extractedData.observations || '',
                issueDate: extractedData.issueDate,
                entryDate: new Date().toLocaleDateString('pt-BR'),
                expirationDate: extractedData.expirationDate,
                img: photoUrl,
                attachments: attachments,
                tags: extractedData.tags || [],
                tacticalSummary: extractedData.tacticalSummary || [],
                location: extractedData.addresses && extractedData.addresses.length > 0 ? extractedData.addresses.join(' | ') : '',
                birthDate: extractedData.birthDate,
                age: extractedData.age,
                issuingCourt: extractedData.issuingCourt,
                latitude: extractedData.latitude,
                longitude: extractedData.longitude
            };

            const result = await onAdd(newWarrant);
            if (result) {
                toast.success(`${extractedData.name} salvo com sucesso!`);

                if (currentIndex < batchResults.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                } else {
                    setStep('saved');
                    localStorage.removeItem('ai_assist_session'); // Limpa sessão ao concluir
                }
            } else {
                toast.error("Erro ao salvar no banco de dados. Verifique a conexão.");
            }
        } catch (error) {
            console.error("Erro ao salvar via Assistente IA:", error);
            toast.error("Erro inesperado ao salvar mandado.");
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };

    const handleGeneratePDF = (record: any) => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.text("FICHA DE INTELIGÊNCIA - DIG", 105, 20, { align: 'center' });

            doc.setFontSize(14);
            doc.text(`Nome: ${record.name}`, 20, 40);
            doc.text(`Tipo do Mandado: ${record.type}`, 20, 50);
            doc.text(`RG: ${record.rg || '-'}`, 20, 60);
            doc.text(`CPF: ${record.cpf || '-'}`, 20, 70);
            doc.text(`Nº Processo: ${record.processNumber || record.number}`, 20, 80);
            doc.text(`Data de Expedição: ${record.issueDate}`, 20, 90);
            doc.text(`Data de Vencimento: ${record.expirationDate}`, 20, 100);

            doc.setFontSize(11);
            doc.text("Endereço:", 20, 120);

            const addresses = record.addresses || (record.location ? [record.location] : []);
            if (addresses.length > 0) {
                addresses.forEach((addr: string, idx: number) => {
                    doc.text(`- ${addr}`, 25, 130 + (idx * 7));
                });
            } else {
                doc.text("- Endereço não informado", 25, 130);
            }

            doc.setFontSize(10);
            doc.text("Gerado por Assistente IA DIG", 105, 280, { align: 'center' });

            toast.success(`PDF de ${record.name} gerado com sucesso!`);
            doc.save(`Ficha_${record.name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Erro ao gerar PDF.");
        }
    };


    const handlePrintList = async () => {
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

            for (let i = 0; i < filteredWarrants.length; i++) {
                const w = filteredWarrants[i];
                if (y > 250) { doc.addPage(); y = 20; }

                // Card Border
                doc.setDrawColor(200);
                doc.roundedRect(15, y - 5, 180, 25, 2, 2);

                // Add Photo if exists
                if (w.img) {
                    try {
                        const img = await loadImage(w.img);
                        doc.addImage(img, 'JPEG', 20, y - 2, 18, 18);
                    } catch (e) {
                        // If image fails, draw a placeholder
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

                doc.setTextColor(220, 38, 38); // Red for status
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
    };


    const handlePrintDatabaseSplit = () => {
        try {
            const doc = new jsPDF();
            // Prisão
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

            // Busca
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
    };


    const reset = () => {
        localStorage.removeItem('ai_assist_session'); // Garante limpeza
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
        <div className="min-h-screen pb-32 bg-background-light dark:bg-background-dark">
            <Header title="Assistente IA - DIG" back />

            {/* Tabs */}
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
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'database' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Banco de Dados
                    </button>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'extraction' && (
                    <div className="space-y-6">
                        {/* STEP 1: INPUT */}
                        {step === 'input' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={handleVoiceAssistant}
                                        className="col-span-2 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg border border-white/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-bold"
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

                        {/* STEP 2: PROCESSING */}
                        {step === 'processing' && (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Processando...</h3>
                                <p className="text-sm text-text-secondary-light">Identificando tipo de mandado e calculando prazos.</p>
                            </div>
                        )}

                        {/* STEP 3: REVIEW */}
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
                                            }}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${extractedData.category === 'search'
                                                ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/20'
                                                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                                }`}
                                        >
                                            <Briefcase size={18} />
                                            BUSCA E APREENSÃO
                                        </button>
                                    </div>

                                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${extractedData.category === 'prison'
                                        ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30 text-red-800 dark:text-red-300'
                                        : 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30 text-orange-800 dark:text-orange-300'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            {extractedData.category === 'prison' ? <Gavel size={20} /> : <Briefcase size={20} />}
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
                                                            value={extractedData.name}
                                                            onChange={(e) => handleExtractedDataChange('name', e.target.value)}
                                                            className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm font-bold outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">RG</label>
                                                        <input
                                                            type="text"
                                                            value={extractedData.rg}
                                                            onChange={(e) => handleExtractedDataChange('rg', e.target.value)}
                                                            className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">CPF</label>
                                                        <input
                                                            type="text"
                                                            value={extractedData.cpf}
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
                                                            value={extractedData.processNumber}
                                                            onChange={(e) => handleExtractedDataChange('processNumber', e.target.value)}
                                                            className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm font-mono font-bold outline-none"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Natureza Criminal</label>
                                                        <input
                                                            type="text"
                                                            value={extractedData.crime}
                                                            onChange={(e) => handleExtractedDataChange('crime', e.target.value)}
                                                            className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] uppercase font-black text-orange-600 dark:text-orange-400/90">Regime Prisional</label>
                                                        <input
                                                            type="text"
                                                            value={extractedData.regime}
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
                                                    <div className="col-span-2 p-3 bg-red-500/5 rounded-lg border border-red-500/10 mt-2">
                                                        <p className="text-[9px] text-red-600 dark:text-red-400 leading-tight">
                                                            <AlertTriangle size={10} className="inline mr-1 mb-0.5" />
                                                            <b>Nota:</b> O sistema calcula automaticamente o vencimento para Busca e Apreensão (+180 dias) se não for identificado no arquivo.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Localização Operacional (NewWarrant Style) */}
                                            <div className="animate-in fade-in duration-200">
                                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden transition-all hover:shadow-md mb-6">
                                                    <div className="p-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                                                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                                                            <MapIcon size={18} className="text-primary" /> Localização Operacional
                                                        </h3>
                                                        {extractedData.latitude && extractedData.longitude ? (
                                                            <span className="text-[10px] font-black bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                                                                <FileCheck size={12} /> MAPEADO
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                                                <AlertTriangle size={12} /> NÃO MAPEADO
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="p-5 space-y-6">
                                                        <div className="space-y-2 relative">
                                                            <label className="text-[10px] font-black text-text-secondary-light dark:text-text-secondary-dark/50 uppercase tracking-widest px-1">Endereço de Diligência</label>
                                                            <div className="flex gap-3 items-center">
                                                                <div className="relative flex-1 group">
                                                                    <input
                                                                        value={extractedData.addresses?.[0] || ''}
                                                                        onChange={(e) => {
                                                                            const newAddresses = [...(extractedData.addresses || [])];
                                                                            newAddresses[0] = e.target.value;
                                                                            handleExtractedDataChange('addresses', newAddresses);
                                                                            handleExtractedDataChange('location', e.target.value);
                                                                        }}
                                                                        type="text"
                                                                        className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 p-3.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all shadow-sm"
                                                                        placeholder="Rua, Número, Bairro, Cidade ou CEP"
                                                                    />
                                                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-20 group-focus-within:opacity-50 transition-opacity">
                                                                        <Search size={16} />
                                                                    </div>
                                                                </div>
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
                                                                            results[currentIndex] = {
                                                                                ...results[currentIndex],
                                                                                latitude: res.lat,
                                                                                longitude: res.lng
                                                                            };
                                                                            setBatchResults(results);
                                                                            toast.success("Mapeado com sucesso!", { id: tid });
                                                                        } else {
                                                                            toast.error("Endereço não localizado", { id: tid });
                                                                        }
                                                                    }}
                                                                    className="bg-primary hover:bg-primary-dark text-white p-3.5 rounded-xl transition-all active:scale-95 shrink-0 shadow-lg shadow-primary/30 flex items-center justify-center"
                                                                    title="Mapear Endereço"
                                                                >
                                                                    <RefreshCw size={20} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-dashed border-border-light dark:border-border-dark">
                                                            <label className="text-[10px] font-black text-text-secondary-light dark:text-text-dark/50 uppercase tracking-widest px-1 mb-2 block">Coordenadas de Precisão (Lat, Long)</label>
                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                <div className="flex-1 bg-white dark:bg-black/20 border border-border-light dark:border-border-dark rounded-xl p-3.5 shadow-sm flex items-center gap-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                                                                    <div className="p-1.5 bg-gray-100 dark:bg-white/5 rounded-lg">
                                                                        <MapIcon size={14} className="text-text-secondary-light/40" />
                                                                    </div>
                                                                    <input
                                                                        value={extractedData.latitude && extractedData.longitude ? `${extractedData.latitude}, ${extractedData.longitude}` : ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const results = [...batchResults];

                                                                            if (!val) {
                                                                                results[currentIndex] = { ...results[currentIndex], latitude: undefined, longitude: undefined };
                                                                                setBatchResults(results);
                                                                                return;
                                                                            }

                                                                            const matches = val.match(/-?\d+\.\d+/g);
                                                                            if (matches && matches.length >= 2) {
                                                                                results[currentIndex] = {
                                                                                    ...results[currentIndex],
                                                                                    latitude: parseFloat(matches[0]),
                                                                                    longitude: parseFloat(matches[1])
                                                                                };
                                                                                setBatchResults(results);
                                                                            }
                                                                        }}
                                                                        type="text"
                                                                        className="flex-1 bg-transparent border-none text-sm font-mono text-text-light dark:text-text-dark outline-none placeholder:text-text-secondary-light/30"
                                                                        placeholder="Ex: -23.31, -45.96"
                                                                    />
                                                                </div>

                                                                {extractedData.latitude && extractedData.longitude && (
                                                                    <div className="flex gap-2">
                                                                        <Link
                                                                            to={`/map?lat=${extractedData.latitude}&lng=${extractedData.longitude}`}
                                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 tracking-wider uppercase active:scale-95"
                                                                        >
                                                                            <MapPin size={14} className="fill-white/20" /> MAPA OPS
                                                                        </Link>
                                                                        <a
                                                                            href={`https://www.google.com/maps?q=${extractedData.latitude},${extractedData.longitude}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-zinc-100 dark:bg-black/40 text-slate-700 dark:text-white px-5 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all shadow-sm tracking-wider uppercase border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95"
                                                                        >
                                                                            <ExternalLink size={14} className="text-green-500" /> GOOGLE MAPS
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-3 px-1">
                                                                <Sparkles size={12} className="text-primary/40" />
                                                                <p className="text-[9px] text-text-secondary-light/60 dark:text-text-dark/40 font-medium italic">
                                                                    O georeferenciamento integra bases de dados geográficas para precisão tática em campo.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Inteligência */}
                                            <div className="animate-in fade-in duration-200">
                                                <div className="flex items-center gap-2 mb-3 border-b border-border-light dark:border-border-dark pb-1">
                                                    <Bot size={16} className="text-primary" />
                                                    <h4 className="text-[10px] font-bold uppercase text-text-light dark:text-text-dark">Inteligência e Observações</h4>
                                                </div>
                                                <div className="space-y-4">
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
                                                                className={`flex-1 py-2 px-2 rounded-lg border font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${extractedData.tags?.includes('Urgente')
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
                                                                className={`flex-1 py-2 px-2 rounded-lg border font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${extractedData.tags?.includes('Ofício de Cobrança')
                                                                    ? 'bg-orange-500 border-orange-500 text-white'
                                                                    : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                                                    }`}
                                                            >
                                                                <Bell size={12} className={extractedData.tags?.includes('Ofício de Cobrança') ? 'fill-white' : ''} />
                                                                COBRANÇA
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* AI Insights */}
                                                    <div className="space-y-3">
                                                        {extractedData.tacticalSummary?.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <History size={12} className="text-blue-600" />
                                                                    <span className="text-[9px] uppercase font-bold text-blue-600">Sumário IA</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {extractedData.tacticalSummary.map((tag: string) => (
                                                                        <span key={tag} className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-200 rounded-full font-bold">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {extractedData.searchChecklist?.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <ListTodo size={12} className="text-orange-600" />
                                                                    <span className="text-[9px] uppercase font-bold text-orange-600">Checklist Operacional</span>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {extractedData.searchChecklist.map((item: string) => (
                                                                        <div key={item} className="flex items-center gap-2 text-[9px] text-orange-700 dark:text-orange-400">
                                                                            <div className="w-1 h-1 bg-orange-400 rounded-full" />
                                                                            {item}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Raw observations */}
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

                                    {/* Action buttons consolidated in bottom bar */}

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

                        {/* STEP 4: SAVED SUCCESS */}
                        {step === 'saved' && (
                            <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300 text-center">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">Salvo com Sucesso!</h3>
                                <p className="text-sm text-text-secondary-light mb-6 max-w-xs text-justify">
                                    Registro adicionado à lista {extractedData.category === 'prison' ? 'de Prisão' : 'de Busca'} e anexo vinculado ao CPF.
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
                    </div>
                )
                }

                {
                    activeTab === 'database' && (
                        <div className="space-y-4 animate-in fade-in pb-4">
                            {/* Filters Section */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light" size={20} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar por nome, CPF, RG, processo..."
                                        className="w-full rounded-xl border-none bg-surface-light py-3 pl-10 pr-4 text-sm shadow-sm dark:bg-surface-dark dark:text-white placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-3 rounded-xl transition-colors shadow-sm ${showFilters || hasActiveFilters
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-light dark:bg-surface-dark text-text-secondary-light dark:text-text-secondary-dark'
                                        }`}
                                >
                                    <Filter size={20} />
                                </button>
                            </div>

                            {showFilters && (
                                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm">Filtros Avançados</h3>
                                        {hasActiveFilters && (
                                            <button onClick={clearFilters} className="text-xs text-primary font-bold hover:underline">
                                                Limpar
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary-light mb-1">Crime</label>
                                            <select value={filterCrime} onChange={e => setFilterCrime(e.target.value)} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs p-2 outline-none focus:ring-1 focus:ring-primary appearance-none">
                                                <option value="" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">Todos os Crimes</option>
                                                {CRIME_OPTIONS.map(c => <option key={c} value={c} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary-light mb-1">Status</label>
                                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs p-2 outline-none focus:ring-1 focus:ring-primary appearance-none">
                                                <option value="" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">Todos</option>
                                                <option value="EM ABERTO" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">Em Aberto</option>
                                                <option value="CUMPRIDO" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">Cumprido</option>
                                                <option value="PRESO" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">Preso</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary-light mb-1">Data Início</label>
                                            <input
                                                type="text"
                                                value={dateStart}
                                                onChange={(e) => setDateStart(maskDate(e.target.value))}
                                                placeholder="DD/MM/YYYY"
                                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs p-2 outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary-light mb-1">Data Fim</label>
                                            <input
                                                type="text"
                                                value={dateEnd}
                                                onChange={(e) => setDateEnd(maskDate(e.target.value))}
                                                placeholder="DD/MM/YYYY"
                                                className="w-full rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs p-2 outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* List - Unified & Advanced View */}
                            <div className="space-y-3">
                                {filteredWarrants.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-text-secondary-light">Nenhum mandado encontrado.</p>
                                    </div>
                                ) : (
                                    filteredWarrants.map((w) => (
                                        <div key={w.id} onClick={() => navigate(`/warrant-detail/${w.id}`)} className="bg-surface-light dark:bg-surface-dark p-3 rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:border-primary transition-colors cursor-pointer group relative active:scale-[0.99] flex gap-4 items-start">
                                            {/* Small Photo */}
                                            <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-border-light dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                {w.img ? (
                                                    <img src={w.img} alt={w.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={24} className="text-zinc-400" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <h3 className="font-bold text-sm text-text-light dark:text-white truncate uppercase tracking-tight">{w.name}</h3>
                                                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-mono font-medium">{w.number}</p>
                                                    </div>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 border ${w.status === 'EM ABERTO' ? 'bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-500/20 dark:text-red-400' :
                                                        w.status === 'CUMPRIDO' || w.status === 'PRESO' ? 'bg-green-500/10 text-green-600 border-green-500/30 dark:bg-green-500/20 dark:text-green-400' : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                                        }`}>
                                                        {w.status}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-text-secondary-light dark:text-zinc-400">
                                                    <p className="truncate"><span className="font-black text-primary/80 uppercase mr-1">RG:</span> {w.rg || '-'}</p>
                                                    <p className="truncate"><span className="font-black text-primary/80 uppercase mr-1">CPF:</span> {w.cpf || '-'}</p>
                                                    <p className="truncate"><span className="font-black text-orange-500 uppercase mr-1">Crime:</span> {w.crime || '-'}</p>
                                                    <p className="truncate"><span className="font-black text-blue-500 uppercase mr-1">Regime:</span> {w.regime || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                }

            </div>

            {/* Bottom Action Bar (Non-fixed) */}
            <div className="mt-8 mb-4 p-2 sm:p-4 bg-surface-light/50 dark:bg-surface-dark/50 rounded-2xl border border-border-light dark:border-border-dark">
                <div className="max-w-md mx-auto flex items-stretch gap-2">
                    <Link
                        to="/"
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 transition-all active:scale-95 touch-manipulation hover:bg-gray-500/20"
                    >
                        <Home size={20} />
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center">Início</span>
                    </Link>




                    {/* Restored Action Buttons from Commit f925a98 + Consolidated Discard */}
                    {activeTab === 'extraction' && step === 'review' && (
                        <>
                            <button
                                onClick={() => {
                                    if (window.confirm("Descartar este resultado da extração?")) {
                                        const newResults = batchResults.filter((_, i) => i !== currentIndex);
                                        setBatchResults(newResults);
                                        if (newResults.length === 0) {
                                            reset();
                                        } else if (currentIndex >= newResults.length) {
                                            setCurrentIndex(newResults.length - 1);
                                        }
                                    }
                                }}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-red-500/10 text-red-600 transition-all active:scale-95 touch-manipulation hover:bg-red-500/20"
                            >
                                <Trash2 size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Descartar</span>
                            </button>
                            <button
                                onClick={backToInput}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-orange-500/10 text-orange-600 transition-all active:scale-95 touch-manipulation hover:bg-orange-500/20"
                            >
                                <RefreshCw size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Voltar</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-primary text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 touch-manipulation hover:bg-primary/90"
                            >
                                {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">{currentIndex < batchResults.length - 1 ? 'Salvar' : 'Finalizar'}</span>
                            </button>
                        </>
                    )}

                    {activeTab === 'extraction' && step === 'saved' && (
                        <>
                            <button
                                onClick={reset}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-primary/10 text-primary transition-all active:scale-95 touch-manipulation hover:bg-primary/20"
                            >
                                <Cpu size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Novo</span>
                            </button>
                            <button
                                onClick={() => navigate('/warrant-list')}
                                className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 touch-manipulation hover:bg-blue-700"
                            >
                                <Database size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Ver Banco</span>
                            </button>
                        </>
                    )}

                    {activeTab === 'database' && (
                        <>
                            <button
                                onClick={handlePrintList}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 transition-all active:scale-95 touch-manipulation hover:bg-gray-500/20"
                            >
                                <ListTodo size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Imprimir Lista</span>
                            </button>
                            <button
                                onClick={handlePrintDatabaseSplit}
                                className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 touch-manipulation hover:bg-blue-700"
                            >
                                <Printer size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Imprimir Tudo</span>
                            </button>
                        </>
                    )}

                    {/* Spacer for alignment when single button */}
                    {activeTab === 'extraction' && (step === 'input' || step === 'processing') && (
                        <>
                            <div className="flex-1"></div>
                            <div className="flex-[2]"></div>
                        </>
                    )}
                </div>
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

                <BottomNav />
            </div>
        </div>
    );
};

export default AIAssistantPage;
