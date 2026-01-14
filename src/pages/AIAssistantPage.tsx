
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
    Home, Search, Filter, Gavel, Briefcase, FileUp,
    Bot, Cpu, Camera, Save, RefreshCw, CheckCircle,
    Printer, Database, AlertTriangle, Zap, Bell, Paperclip,
    Mic, MicOff, ListTodo, ShieldAlert, History, Layers, Trash2
} from 'lucide-react';
import Header from '../components/Header';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';
import { Warrant } from '../types';
import { CRIME_OPTIONS } from '../data/constants';
import { extractPdfData, extractFromText } from '../pdfExtractor';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import { analyzeWarrantData, isGeminiEnabled } from '../services/geminiService';
import { Sparkles } from 'lucide-react';

interface AIAssistantPageProps {
    onAdd: (w: Warrant) => Promise<boolean>;
    warrants: Warrant[];
}

const AIAssistantPage = ({ onAdd, warrants }: AIAssistantPageProps) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'extraction' | 'database'>('extraction');

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
            const matchesDate = (!dateStart || (w.date || '') >= dateStart) && (!dateEnd || (w.date || '') <= dateEnd);
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
        setBatchResults(prev => {
            const newResults = [...prev];
            newResults[currentIndex] = { ...newResults[currentIndex], [field]: value };
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
                const data = extractFromText(text, "Comando de Voz");
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
                    results.push({ ...data, isDuplicate, tags: data.autoPriority || [] });
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

    const handleTextExtraction = () => {
        if (!inputText.trim()) return;
        setStep('processing');
        try {
            const data = extractFromText(inputText, "Texto via Transferência");
            const isDuplicate = warrants.some(w => w.number === data.processNumber);
            setBatchResults([{ ...data, isDuplicate, tags: data.autoPriority || [] }]);
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
                location: extractedData.addresses && extractedData.addresses.length > 0 ? extractedData.addresses.join(' | ') : ''
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


    const handlePrintList = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Lista de Mandados (Filtrada)", 105, 20, { align: 'center' });
            doc.setFontSize(10);
            let y = 40;

            filteredWarrants.forEach((w, index) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}. ${w.name}`, 20, y);
                doc.setFont('helvetica', 'normal');
                doc.text(`RG: ${w.rg || '-'} | Proc: ${w.number}`, 20, y + 5);
                doc.text(`Crime: ${w.crime || '-'} | Status: ${w.status}`, 20, y + 10);
                y += 20;
            });
            toast.success("Lista filtrada gerada com sucesso!");
            doc.save("Lista_Filtrada.pdf");
        } catch (e) { toast.error("Erro ao imprimir lista."); }
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
        <div className="min-h-screen pb-4 bg-background-light dark:bg-background-dark">
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
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleVoiceAssistant}
                                        className="col-span-2 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg border border-white/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-bold"
                                    >
                                        {isRecording ? <Mic className="animate-pulse" size={24} /> : <Mic size={24} />}
                                        {isRecording ? "OUVINDO..." : "CRIAR MANDADO POR VOZ"}
                                    </button>

                                    <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-light dark:bg-surface-dark hover:border-primary transition-colors cursor-pointer relative group">
                                        <FileUp size={32} className="text-text-secondary-light dark:text-text-secondary-dark mb-2 group-hover:text-primary transition-colors" />
                                        <p className="font-bold text-text-light dark:text-text-dark text-[11px]">Upload PDF</p>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.jpg,.png,.jpeg" multiple onChange={handleFileUpload} />
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
                        {step === 'review' && extractedData && (
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
                                    <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-primary/30 overflow-hidden group cursor-pointer bg-surface-light dark:bg-black/20">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Target" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Camera size={16} className="text-primary/50" />
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
                                        <h3 className="font-bold text-xs uppercase">Dados Extraídos</h3>
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
                                                <Sparkles size={12} /> Aprimorar com IA Pro
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Nome</label>
                                            <input
                                                type="text"
                                                value={extractedData.name}
                                                onChange={(e) => handleExtractedDataChange('name', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm font-bold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">RG</label>
                                            <input
                                                type="text"
                                                value={extractedData.rg}
                                                onChange={(e) => handleExtractedDataChange('rg', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">CPF</label>
                                            <input
                                                type="text"
                                                value={extractedData.cpf}
                                                onChange={(e) => handleExtractedDataChange('cpf', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Processo (Chave Primária)</label>
                                            <input
                                                type="text"
                                                value={extractedData.processNumber}
                                                onChange={(e) => handleExtractedDataChange('processNumber', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm font-mono font-bold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Expedição</label>
                                            <input
                                                type="date"
                                                value={extractedData.issueDate}
                                                onChange={(e) => handleExtractedDataChange('issueDate', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Vencimento</label>
                                            <input
                                                type="date"
                                                value={extractedData.expirationDate}
                                                onChange={(e) => handleExtractedDataChange('expirationDate', e.target.value)}
                                                className="w-full bg-transparent border-b border-red-200 dark:border-red-900 py-1 text-sm font-bold text-red-500 outline-none"
                                            />
                                            {extractedData.category === 'search' && <span className="text-[9px] text-orange-500 block mt-0.5">*Auto: +180 dias</span>}
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Crime</label>
                                            <input
                                                type="text"
                                                value={extractedData.crime}
                                                onChange={(e) => handleExtractedDataChange('crime', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Regime</label>
                                            <input
                                                type="text"
                                                value={extractedData.regime}
                                                onChange={(e) => handleExtractedDataChange('regime', e.target.value)}
                                                className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-text-secondary-light">Endereços</label>
                                            {extractedData.addresses.map((addr: string, i: number) => (
                                                <input
                                                    key={i}
                                                    type="text"
                                                    value={addr}
                                                    onChange={(e) => handleAddressChange(i, e.target.value)}
                                                    className="w-full bg-transparent border-b border-border-light dark:border-border-dark py-1 text-sm outline-none mb-1"
                                                />
                                            ))}
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] uppercase font-bold text-text-secondary-light">Observações / Dados Extraídos</label>
                                                <button
                                                    onClick={startRecording}
                                                    className={`p-1.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-white/10 text-primary'}`}
                                                    title="Adicionar por voz"
                                                >
                                                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                                                </button>
                                            </div>
                                            <textarea
                                                value={extractedData.observations || ''}
                                                onChange={(e) => handleExtractedDataChange('observations', e.target.value)}
                                                className="w-full bg-transparent border border-border-light dark:border-border-dark rounded-lg p-2 text-xs outline-none h-20 resize-none focus:ring-1 focus:ring-primary"
                                                placeholder="Adicione observações ou use o microfone..."
                                            />
                                        </div>
                                    </div>

                                    {/* AI Tactical Summary */}
                                    {(extractedData.tacticalSummary?.length > 0 || extractedData.searchChecklist?.length > 0) && (
                                        <div className="p-4 border-t border-border-light dark:border-border-dark bg-blue-50/30 dark:bg-blue-900/10 space-y-3">
                                            {extractedData.tacticalSummary?.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <History size={14} className="text-blue-600" />
                                                        <span className="text-[10px] uppercase font-bold text-blue-600">Sumário Tático (IA)</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {extractedData.tacticalSummary.map((tag: string) => (
                                                            <span key={tag} className="text-[9px] px-2 py-0.5 bg-blue-500 text-white rounded-full font-bold">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {extractedData.searchChecklist?.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <ListTodo size={14} className="text-orange-600" />
                                                        <span className="text-[10px] uppercase font-bold text-orange-600">Checklist de Busca (IA)</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {extractedData.searchChecklist.map((item: string) => (
                                                            <div key={item} className="flex items-center gap-2 text-[10px] text-orange-700 dark:text-orange-400">
                                                                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Priority Selection for AI Review */}
                                    <div className="p-4 border-t border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-white/5 space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle size={14} className="text-primary" />
                                            <span className="text-[10px] uppercase font-bold text-text-secondary-light">Prioridade</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const tags = extractedData.tags || [];
                                                    const newTags = tags.includes('Urgente') ? tags.filter((t: string) => t !== 'Urgente') : [...tags, 'Urgente'];
                                                    handleExtractedDataChange('tags', newTags);
                                                }}
                                                className={`flex-1 py-3 px-2 rounded-xl border font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${extractedData.tags?.includes('Urgente')
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
                                                className={`flex-1 py-3 px-2 rounded-xl border font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${extractedData.tags?.includes('Ofício de Cobrança')
                                                    ? 'bg-amber-500 border-amber-500 text-white'
                                                    : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light'
                                                    }`}
                                            >
                                                <Bell size={12} className={extractedData.tags?.includes('Ofício de Cobrança') ? 'fill-white' : ''} />
                                                COBRANÇA
                                            </button>
                                        </div>
                                    </div>
                                </div>


                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex items-center gap-3">
                                    <Paperclip size={18} className="text-text-secondary-light" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">Anexo: {extractedData.sourceFile || "Texto Colado"}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
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
                                        className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Descartar
                                    </button>
                                    <button onClick={backToInput} className="flex-1 py-3 border border-border-light dark:border-border-dark rounded-xl text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center gap-2">
                                        <RefreshCw size={16} /> Voltar
                                    </button>
                                    <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                        {currentIndex < batchResults.length - 1 ? 'Próximo Arquivo' : 'Finalizar Lote'}
                                    </button>
                                </div>

                                {batchResults.length > 1 && (
                                    <div className="flex items-center justify-center gap-2 py-2">
                                        {batchResults.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />
                                        ))}
                                    </div>
                                )}
                            </div>
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
                )}

                {activeTab === 'database' && (
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
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary-light mb-1">Crime</label>
                                        <select value={filterCrime} onChange={e => setFilterCrime(e.target.value)} className="w-full rounded-lg border-gray-200 text-xs p-2">
                                            <option value="">Todos</option>
                                            {CRIME_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary-light mb-1">Status</label>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-lg border-gray-200 text-xs p-2">
                                            <option value="">Todos</option>
                                            <option value="EM ABERTO">Em Aberto</option>
                                            <option value="CUMPRIDO">Cumprido</option>
                                            <option value="PRESO">Preso</option>
                                        </select>
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
                                    <div key={w.id} onClick={() => navigate(`/warrant-detail/${w.id}`)} className="bg-surface-light dark:bg-surface-dark p-2 rounded-lg border border-border-light dark:border-border-dark shadow-sm hover:border-primary transition-colors cursor-pointer group relative active:scale-[0.99]">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h3 className="font-bold text-xs text-text-light dark:text-text-dark truncate">{w.name}</h3>
                                                <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-mono">{w.number}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${w.status === 'EM ABERTO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                w.status === 'CUMPRIDO' || w.status === 'PRESO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {w.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 text-[10px] text-text-secondary-light dark:text-text-secondary-dark mb-1.5">
                                            <p className="truncate"><span className="font-bold">RG:</span> {w.rg || '-'}</p>
                                            <p className="truncate"><span className="font-bold">CPF:</span> {w.cpf || '-'}</p>
                                            <p className="truncate"><span className="font-bold">Crime:</span> {w.crime || '-'}</p>
                                            <p className="truncate"><span className="font-bold">Regime:</span> {w.regime || '-'}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

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

                    {activeTab === 'extraction' && step === 'review' && (
                        <>
                            <button
                                onClick={backToInput}
                                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-amber-500/10 text-amber-600 transition-all active:scale-95 touch-manipulation hover:bg-amber-500/20"
                            >
                                <RefreshCw size={20} />
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Pular</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-primary text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 touch-manipulation hover:bg-primary/90"
                            >
                                {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">{currentIndex < batchResults.length - 1 ? 'Salvar e Próximo' : 'Finalizar Lote'}</span>
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
                                className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 touch-manipulation hover:bg-indigo-700"
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
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">Lista</span>
                            </button>
                            <button
                                onClick={handlePrintDatabaseSplit}
                                className="flex-[2] min-w-0 flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 touch-manipulation hover:bg-indigo-700"
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
            </div>
            {isSaveConfirmOpen && (
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


export default AIAssistantPage;
