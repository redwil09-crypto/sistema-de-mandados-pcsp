
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    User, Gavel, Calendar, MapPin, Bike, FileCheck,
    Paperclip, X, Plus, Bot, ChevronRight, Camera,
    AlertTriangle, Zap, Bell, RefreshCw, Eye, Sparkles, Map as MapIcon, ExternalLink, Search
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import { Warrant } from '../types';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import VoiceInput from '../components/VoiceInput';

import { geocodeAddress, fetchAddressSuggestions, GeocodingResult } from '../services/geocodingService';
import { fetchAddressByCep } from '../services/cepService';
import { isGeminiEnabled } from '../services/geminiService';
import { formatDate, maskDate } from '../utils/helpers';
import { useWarrants } from '../contexts/WarrantContext';

const NewWarrant = () => {
    const { addWarrant, updateWarrant, warrants, availableCrimes, availableRegimes } = useWarrants();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const [type, setType] = useState<'prison' | 'search' | 'counter'>('prison');
    const [isUploading, setIsUploading] = useState(false);
    const [isSearchingCep, setIsSearchingCep] = useState(false);
    const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // File States
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [reportsFiles, setReportsFiles] = useState<File[]>([]);
    const [attachmentsFiles, setAttachmentsFiles] = useState<File[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        rg: '',
        cpf: '',
        number: '',
        crime: '',
        regime: '',
        issueDate: '',
        entryDate: new Date().toLocaleDateString('pt-BR'),
        expirationDate: '',
        dischargeDate: '',
        location: '',
        ifoodNumber: '',
        ifoodResult: '',
        digOffice: '',
        observation: '',
        dpRegion: '',
        img: '',
        reports: [] as string[],
        attachments: [] as string[],
        tags: [] as string[],
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined,
        tacticalSummary: '',
        birthDate: '',
        age: '',
        issuingCourt: ''
    });

    const [hasAi, setHasAi] = useState(false);

    useEffect(() => {
        isGeminiEnabled().then(setHasAi);
    }, []);

    // Effect for Address Autocomplete
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.location.length > 3 && showSuggestions) {
                const results = await fetchAddressSuggestions(formData.location);
                setSuggestions(results);
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.location, showSuggestions]);

    useEffect(() => {
        if (editId && warrants) {
            const existing = warrants.find(w => w.id === editId);
            if (existing) {
                const isSearch = existing.type.toLowerCase().includes('busca');
                setType(isSearch ? 'search' : 'prison');

                setFormData({
                    name: existing.name || '',
                    rg: existing.rg || '',
                    cpf: existing.cpf || '',
                    number: existing.number || '',
                    crime: existing.crime || '',
                    regime: existing.regime || '',
                    issueDate: formatDate(existing.issueDate),
                    entryDate: formatDate(existing.entryDate),
                    expirationDate: formatDate(existing.expirationDate),
                    dischargeDate: formatDate(existing.dischargeDate),
                    location: existing.location || '',
                    ifoodNumber: existing.ifoodNumber || '',
                    ifoodResult: existing.ifoodResult || '',
                    digOffice: existing.digOffice || '',
                    observation: existing.observation || '',
                    dpRegion: existing.dpRegion || '',
                    img: existing.img || '',
                    reports: existing.reports || [],
                    attachments: existing.attachments || [],
                    tags: existing.tags || [],
                    latitude: existing.latitude,
                    longitude: existing.longitude,
                    tacticalSummary: existing.tacticalSummary || '',
                    birthDate: formatDate(existing.birthDate),
                    age: existing.age || '',
                    issuingCourt: existing.issuingCourt || ''
                });

                if (existing.img) {
                    setPhotoPreview(existing.img);
                }
            }
        }
    }, [editId, warrants]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>, type: 'reports' | 'attachments') => {
        const files = Array.from(e.target.files || []);
        if (type === 'reports') {
            setReportsFiles(prev => [...prev, ...files]);
        } else {
            setAttachmentsFiles(prev => [...prev, ...files]);
        }
        e.target.value = '';
    };

    const removeNewFile = (index: number, type: 'reports' | 'attachments') => {
        if (type === 'reports') {
            setReportsFiles(prev => prev.filter((_, i) => i !== index));
        } else {
            setAttachmentsFiles(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleRemoveOldFile = (index: number, type: 'reports' | 'attachments') => {
        const confirmResult = window.confirm("Tem certeza que deseja excluir este documento?");
        if (!confirmResult) return;

        setFormData(prev => {
            const list = type === 'reports' ? [...(prev.reports || [])] : [...(prev.attachments || [])];
            list.splice(index, 1);
            return {
                ...prev,
                [type]: list
            };
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (['issueDate', 'entryDate', 'expirationDate', 'dischargeDate', 'birthDate'].includes(name)) {
            finalValue = maskDate(value);
        }

        setFormData(prev => {
            const newState = { ...prev, [name]: finalValue };

            if (name === 'location') {
                const cepMatch = finalValue.match(/\d{5}-?\d{3}/);
                if (cepMatch) {
                    const cep = cepMatch[0];
                    if (cep.replace('-', '').length === 8) {
                        handleCepLookup(cep);
                    }
                }
                setShowSuggestions(true);
            }

            if (name === 'birthDate') {
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

    const handleCepLookup = async (cep: string) => {
        setIsSearchingCep(true);
        try {
            const addressData = await fetchAddressByCep(cep);
            if (addressData) {
                setFormData(prev => ({
                    ...prev,
                    location: addressData.fullAddress
                }));
                toast.success("Endereço preenchido via CEP");
                setShowSuggestions(false);

                const geo = await geocodeAddress(addressData.fullAddress);
                if (geo) {
                    setFormData(prev => ({
                        ...prev,
                        latitude: geo.lat,
                        longitude: geo.lng
                    }));
                }
            }
        } catch (err) {
            console.error("Erro CEP:", err);
        } finally {
            setIsSearchingCep(false);
        }
    };

    const handleSelectSuggestion = (suggestion: GeocodingResult) => {
        setFormData(prev => ({
            ...prev,
            location: suggestion.displayName,
            latitude: suggestion.lat,
            longitude: suggestion.lng
        }));
        setSuggestions([]);
        setShowSuggestions(false);
        toast.success("Localização selecionada e mapeada!");
    };

    const handleTagToggle = (tag: string) => {
        setFormData(prev => {
            const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
            const newTags = currentTags.includes(tag)
                ? currentTags.filter(t => t !== tag)
                : [...currentTags, tag];
            return { ...prev, tags: newTags };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.number) {
            toast.error("Nome e Número do Processo são obrigatórios.");
            return;
        }

        if (isUploading) return;

        setIsUploading(true);
        try {
            const warrantId = editId || Date.now().toString();
            let photoUrl = formData.img;

            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `photos/${warrantId}_${Date.now()}.${ext}`;
                const uploadedPath = await uploadFile(photoFile, path);
                if (uploadedPath) {
                    photoUrl = getPublicUrl(uploadedPath);
                }
            }

            const newReportsUrls: string[] = [];
            if (reportsFiles.length > 0) {
                toast.info(`Enviando ${reportsFiles.length} relatórios...`);
                for (const file of reportsFiles) {
                    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const path = `reports/${warrantId}/${Date.now()}_${cleanName}`;
                    const uploadedPath = await uploadFile(file, path);
                    if (uploadedPath) {
                        newReportsUrls.push(getPublicUrl(uploadedPath));
                    }
                }
            }

            const newAttachmentsUrls: string[] = [];
            if (attachmentsFiles.length > 0) {
                toast.info(`Enviando ${attachmentsFiles.length} anexos...`);
                for (const file of attachmentsFiles) {
                    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const path = `attachments/${warrantId}/${Date.now()}_${cleanName}`;
                    const uploadedPath = await uploadFile(file, path);
                    if (uploadedPath) {
                        newAttachmentsUrls.push(getPublicUrl(uploadedPath));
                    }
                }
            }

            const warrantData: Partial<Warrant> = {
                name: formData.name,
                type: type === 'prison' ? 'MANDADO DE PRISÃO' : (type === 'search' ? 'BUSCA E APREENSÃO' : 'CONTRAMANDADO DE PRISÃO'),
                location: formData.location,
                number: formData.number,
                rg: formData.rg,
                cpf: formData.cpf,
                crime: formData.crime,
                regime: formData.regime,
                issueDate: formData.issueDate,
                entryDate: formData.entryDate,
                expirationDate: formData.expirationDate,
                dischargeDate: formData.dischargeDate,
                ifoodNumber: formData.ifoodNumber,
                ifoodResult: formData.ifoodResult,
                digOffice: formData.digOffice,
                observation: formData.observation,
                dpRegion: formData.dpRegion,
                tags: formData.tags,
                img: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
                reports: [...(formData.reports || []), ...newReportsUrls],
                attachments: [...(formData.attachments || []), ...newAttachmentsUrls],
                latitude: formData.latitude,
                longitude: formData.longitude,
                tacticalSummary: formData.tacticalSummary || '',
                birthDate: formData.birthDate,
                age: formData.age,
                issuingCourt: formData.issuingCourt
            };

            if (editId) {
                const result = await updateWarrant(editId, warrantData);
                if (result) {
                    toast.success("Mandado atualizado com sucesso!");
                    navigate(`/warrant-detail/${editId}`);
                } else {
                    toast.error("Falha ao atualizar no servidor.");
                }
            } else {
                const newWarrant: Warrant = {
                    ...(warrantData as any),
                    id: warrantId,
                    status: 'EM ABERTO'
                };
                const { success, error, id } = await addWarrant(newWarrant);
                if (success) {
                    toast.success("Mandado salvo com sucesso!");
                    // Ensure the route accepts the newly generated DB true ID to avoid mismatched URL 
                    navigate(id ? `/warrant-detail/${id}` : '/warrant-list');
                } else {
                    toast.error(`Falha ao salvar no servidor: ${error}`);
                }
            }
        } catch (error) {
            console.error("Erro no handleSubmit:", error);
            toast.error("Ocorreu um erro inesperado ao salvar.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen pb-24 bg-background-light dark:bg-background-dark">
            <Header title={editId ? "Editar Mandado" : "Novo Mandado"} back />

            <div className="p-4 pb-0">
                <div className="flex bg-surface-light dark:bg-surface-dark p-1 rounded-xl border border-border-light dark:border-border-dark">
                    <button
                        type="button"
                        onClick={() => setType('prison')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'prison' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Mandado
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('search')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'search' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Busca
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setType('counter');
                            setFormData(prev => ({ ...prev, regime: 'Contramandado' }));
                        }} // @ts-ignore
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${type === 'counter' ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20' : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-emerald-500/10 hover:text-emerald-500'}`}
                    >
                        <FileCheck size={14} /> Contramandado
                    </button>
                </div>
            </div>

            <div className="px-4 mt-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                    <Bot size={24} className="text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                        <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300">Usar Assistente IA</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400">Extraia dados de PDFs automaticamente.</p>
                    </div>
                    <Link to="/ai-assistant" className="bg-blue-600 text-white p-2 rounded-lg">
                        <ChevronRight size={16} />
                    </Link>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Photo Upload */}
                <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex flex-col items-center justify-center text-text-secondary-light dark:text-text-secondary-dark cursor-pointer hover:border-primary transition-colors relative overflow-hidden group">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Prévia" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <Camera size={24} className="mb-1" />
                                <span className="text-[10px] font-bold text-center px-2">Adicionar Foto do Alvo</span>
                            </>
                        )}
                        {photoPreview && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
                                <span className="text-white text-[10px] font-bold">Trocar Foto</span>
                            </div>
                        )}
                        <input type="file" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer z-50" accept="image/*" />
                    </div>
                </div>

                {/* Personal Data */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <User size={16} className="text-primary" /> Dados do Alvo
                    </h3>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Nome Completo</label>
                        <input name="name" required value={formData.name} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Nome do indivíduo" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">RG</label>
                            <input name="rg" value={formData.rg} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="00.000.000-0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">CPF</label>
                            <input name="cpf" value={formData.cpf} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="000.000.000-00" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Data Nascimento</label>
                            <input name="birthDate" value={formData.birthDate} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="DD/MM/YYYY" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Idade Atual</label>
                            <input name="age" value={formData.age} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: 25 anos" />
                        </div>
                    </div>
                </div>

                {/* Process Data */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <Gavel size={16} className="text-primary" /> Processual
                    </h3>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Nº do Processo</label>
                        <input name="number" required value={formData.number} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="0000000-00.0000.0.00.0000" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Vara / Fórum</label>
                        <input name="issuingCourt" value={formData.issuingCourt} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Vara Criminal de Jacareí" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Crime / Infração</label>
                        <input
                            name="crime"
                            list="crimes-list"
                            value={formData.crime}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Selecione ou digite um novo crime..."
                        />
                        <datalist id="crimes-list">
                            {availableCrimes.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Regime / Situação</label>
                        <input
                            name="regime"
                            list="regime-list"
                            value={formData.regime}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Selecione ou digite a situação..."
                        />
                        <datalist id="regime-list">
                            {availableRegimes
                                .filter(r => type === 'search' || r !== "Audiência de Justificativa")
                                .map(r => <option key={r} value={r} />)
                            }
                        </datalist>
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <Calendar size={16} className="text-primary" /> Datas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Data Expedição</label>
                            <input name="issueDate" value={formData.issueDate} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="DD/MM/YYYY" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Entrada Capturas</label>
                            <input name="entryDate" value={formData.entryDate} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="DD/MM/YYYY" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Vencimento</label>
                            <input name="expirationDate" value={formData.expirationDate} onChange={handleChange} type="text" className="w-full rounded-lg border border-red-200 dark:border-red-900 bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-red-500 outline-none" placeholder="DD/MM/YYYY" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Data Baixa</label>
                            <input name="dischargeDate" value={formData.dischargeDate} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="DD/MM/YYYY" />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden transition-all hover:shadow-md">
                    <div className="p-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <MapPin size={18} className="text-primary" /> Localização Operacional
                        </h3>
                        {formData.latitude && formData.longitude ? (
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-text-secondary-light dark:text-text-secondary-dark/50 uppercase tracking-widest px-1">Endereço de Diligência</label>
                                <div className="flex gap-3 items-center">
                                    <div className="relative flex-1 group">
                                        <input
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            onFocus={() => formData.location.length > 3 && setShowSuggestions(true)}
                                            type="text"
                                            className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 p-3.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all shadow-sm"
                                            placeholder="Rua, Número, Bairro, Cidade ou CEP"
                                        />
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-20 group-focus-within:opacity-50 transition-opacity">
                                            {isSearchingCep ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!formData.location) return toast.error("Informe um endereço primeiro");
                                            const tid = toast.loading("Buscando coordenadas...");
                                            const res = await geocodeAddress(formData.location);
                                            if (res) {
                                                setFormData(prev => ({ ...prev, latitude: res.lat, longitude: res.lng }));
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

                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 left-0 right-14 mt-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(s)}
                                                className="w-full text-left p-3 hover:bg-primary/5 dark:hover:bg-primary/10 border-b border-border-light/50 dark:border-border-dark/50 last:border-0 flex flex-col gap-0.5"
                                            >
                                                <span className="text-sm font-bold text-text-light dark:text-text-dark truncate">
                                                    {s.displayName.split(',')[0]}
                                                </span>
                                                <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                    {s.displayName}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary-light dark:text-text-secondary-dark/50 uppercase tracking-widest px-1">Região da Delegacia (DP)</label>
                                <select
                                    name="dpRegion"
                                    value={formData.dpRegion}
                                    onChange={handleChange as any}
                                    className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 p-3.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all shadow-sm"
                                >
                                    <option value="">Selecione a Região DP...</option>
                                    <option value="1º DP">01º D.P. JACAREÍ</option>
                                    <option value="2º DP">02º D.P. JACAREÍ</option>
                                    <option value="3º DP">03º D.P. JACAREÍ</option>
                                    <option value="4º DP">04º D.P. JACAREÍ</option>
                                </select>
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
                                        name="coords_manual"
                                        value={formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                                setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
                                                return;
                                            }
                                            const matches = val.match(/-?\d+\.\d+/g);
                                            if (matches && matches.length >= 2) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    latitude: parseFloat(matches[0]),
                                                    longitude: parseFloat(matches[1])
                                                }));
                                            }
                                        }}
                                        type="text"
                                        className="flex-1 bg-transparent border-none text-sm font-mono text-text-light dark:text-text-dark outline-none placeholder:text-text-secondary-light/30"
                                        placeholder="Ex: -23.31, -45.96"
                                    />
                                </div>
                                {formData.latitude && formData.longitude && (
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/map?lat=${formData.latitude}&lng=${formData.longitude}`}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 tracking-wider uppercase active:scale-95"
                                        >
                                            <MapPin size={14} className="fill-white/20" /> MAPA OPS
                                        </Link>
                                        <a
                                            href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white dark:bg-white/5 text-slate-700 dark:text-white px-5 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all shadow-sm tracking-wider uppercase border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95"
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

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <Bike size={16} className="text-primary" /> Investigação
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-dark/70 mb-1">Ofício iFood nº</label>
                            <input name="ifoodNumber" value={formData.ifoodNumber} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: OF-123/2024" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-dark/70 mb-1">Resultado iFood</label>
                            <textarea name="ifoodResult" value={formData.ifoodResult} onChange={handleChange} rows={2} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Resultado da quebra de sigilo..." />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-4">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <Paperclip size={16} className="text-primary" /> Mandado / Ofício / OS
                        </h3>
                        <div className="flex flex-col gap-2">
                            {formData.attachments?.map((url, idx) => (
                                <div key={`old-att-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-xs border border-border-light dark:border-border-dark group">
                                    <span className="truncate flex-1 font-bold">Documento {idx + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <a href={getPublicUrl(url)} target="_blank" rel="noopener noreferrer" className="text-primary font-black hover:underline p-2 text-xs">Ver</a>
                                        <button type="button" onClick={() => handleRemoveOldFile(idx, 'attachments')} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1.5 rounded-lg transition-all" title="Excluir"><X size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {attachmentsFiles.map((f, idx) => (
                                <div key={`new-att-${idx}`} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-xs border border-blue-200 dark:border-blue-800">
                                    <span className="truncate flex-1 text-blue-700 dark:text-blue-400 font-bold">{f.name}</span>
                                    <button type="button" onClick={() => removeNewFile(idx, 'attachments')} className="text-red-500 p-1.5"><X size={16} /></button>
                                </div>
                            ))}
                            <label htmlFor="attachment-upload" className="flex items-center justify-center gap-2 w-full py-3 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-border-light dark:border-border-dark rounded-xl text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark hover:border-primary hover:text-primary transition-colors cursor-pointer mt-2">
                                <Plus size={16} /> ADICIONAR DOCUMENTO
                                <input id="attachment-upload" type="file" onChange={(e) => handleFileAdd(e, 'attachments')} className="hidden" multiple />
                            </label>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-4">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <FileCheck size={16} className="text-primary" /> Relatórios
                        </h3>
                        <div className="flex flex-col gap-2">
                            {formData.reports?.map((url, idx) => (
                                <div key={`old-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-xs border border-border-light dark:border-border-dark group">
                                    <span className="truncate flex-1 font-bold">Relatório {idx + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <a href={getPublicUrl(url)} target="_blank" rel="noopener noreferrer" className="text-primary font-black hover:underline p-2 text-xs">Ver</a>
                                        <button type="button" onClick={() => handleRemoveOldFile(idx, 'reports')} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1.5 rounded-lg transition-all" title="Excluir"><X size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {reportsFiles.map((f, idx) => (
                                <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl text-xs border border-green-200 dark:border-green-800">
                                    <span className="truncate flex-1 text-green-700 dark:text-green-400 font-bold">{f.name}</span>
                                    <button type="button" onClick={() => removeNewFile(idx, 'reports')} className="text-red-500 p-1.5"><X size={16} /></button>
                                </div>
                            ))}
                            <label htmlFor="report-upload" className="flex items-center justify-center gap-2 w-full py-3 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-border-light dark:border-border-dark rounded-xl text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark hover:border-primary hover:text-primary transition-colors cursor-pointer mt-2">
                                <Plus size={16} /> ADICIONAR RELATÓRIO
                                <input id="report-upload" type="file" onChange={(e) => handleFileAdd(e, 'reports')} className="hidden" multiple />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <Eye size={16} className="text-primary" /> Observações
                    </h3>
                    <div className="relative">
                        <textarea name="observation" value={formData.observation} onChange={handleChange} rows={4} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Informações adicionais, tatuagens, rotina..." />
                        <div className="absolute right-2 bottom-2">
                            <VoiceInput onTranscript={(text) => setFormData(prev => ({ ...prev, observation: text }))} currentValue={formData.observation} />
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <AlertTriangle size={16} className="text-primary" /> Prioridade
                    </h3>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => handleTagToggle('Urgente')} className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${formData.tags?.includes('Urgente') ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20' : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark'}`}>
                            <Zap size={14} className={formData.tags?.includes('Urgente') ? 'fill-white' : ''} />
                            URGENTE
                        </button>
                        <button type="button" onClick={() => handleTagToggle('Ofício de Cobrança')} className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${formData.tags?.includes('Ofício de Cobrança') ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark'}`}>
                            <Bell size={14} className={formData.tags?.includes('Ofício de Cobrança') ? 'fill-white' : ''} />
                            COBRANÇA
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button type="submit" disabled={isUploading} className={`w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-dark active:scale-[0.98]'}`}>
                        {isUploading ? (
                            <>
                                <RefreshCw size={20} className="animate-spin" />
                                Enviando arquivos...
                            </>
                        ) : (
                            editId ? "Confirmar Atualização" : "Salvar Mandado"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewWarrant;
