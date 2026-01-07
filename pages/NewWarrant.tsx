
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    User, Gavel, Calendar, MapPin, Bike, FileCheck,
    Paperclip, X, Plus, Bot, ChevronRight, Camera,
    AlertTriangle, Zap, Bell, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import { Warrant } from '../types';
import { CRIME_OPTIONS, REGIME_OPTIONS } from '../data/constants';
import { uploadFile, getPublicUrl } from '../supabaseStorage';

interface NewWarrantProps {
    onAdd: (w: Warrant) => Promise<boolean>;
    onUpdate?: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
    warrants?: Warrant[];
}

const NewWarrant = ({ onAdd, onUpdate, warrants }: NewWarrantProps) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const [type, setType] = useState<'prison' | 'search'>('prison');
    const [isUploading, setIsUploading] = useState(false);

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
        entryDate: '',
        expirationDate: '',
        dischargeDate: '',
        location: '',
        ifoodNumber: '',
        ifoodResult: '',
        digOffice: '',
        observation: '',
        img: '',
        reports: [] as string[],
        attachments: [] as string[],
        tags: [] as string[]
    });

    useEffect(() => {
        if (editId && warrants) {
            const existing = warrants.find(w => w.id === editId);
            if (existing) {
                // Determine type
                const isSearch = existing.type.toLowerCase().includes('busca');
                setType(isSearch ? 'search' : 'prison');

                // Helper to format DD/MM/YYYY to YYYY-MM-DD for input[type="date"]
                const parseDate = (d: string | undefined) => {
                    if (!d || d === '-') return '';
                    if (d.includes('/')) {
                        const [day, month, year] = d.split('/');
                        return `${year}-${month}-${day}`;
                    }
                    return d;
                };

                setFormData({
                    name: existing.name || '',
                    rg: existing.rg || '',
                    cpf: existing.cpf || '',
                    number: existing.number || '',
                    crime: existing.crime || '',
                    regime: existing.regime || '',
                    issueDate: parseDate(existing.issueDate),
                    entryDate: parseDate(existing.entryDate),
                    expirationDate: parseDate(existing.expirationDate),
                    dischargeDate: parseDate(existing.dischargeDate),
                    location: existing.location || '',
                    ifoodNumber: existing.ifoodNumber || '',
                    ifoodResult: existing.ifoodResult || '',
                    digOffice: existing.digOffice || '',
                    observation: existing.observation || '',
                    img: existing.img || '',
                    reports: existing.reports || [],
                    attachments: existing.attachments || [],
                    tags: existing.tags || []
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
    };

    const removeNewFile = (index: number, type: 'reports' | 'attachments') => {
        if (type === 'reports') {
            setReportsFiles(prev => prev.filter((_, i) => i !== index));
        } else {
            setAttachmentsFiles(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

            // 1. Upload Photo if exists
            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `photos/${warrantId}_${Date.now()}.${ext}`;
                const uploadedPath = await uploadFile(photoFile, path);
                if (uploadedPath) {
                    photoUrl = getPublicUrl(uploadedPath);
                }
            }

            // 2. Upload Reports
            const newReportsUrls: string[] = [];
            for (const file of reportsFiles) {
                const path = `reports/${warrantId}/${Date.now()}_${file.name}`;
                const uploadedPath = await uploadFile(file, path);
                if (uploadedPath) {
                    newReportsUrls.push(getPublicUrl(uploadedPath));
                }
            }

            // 3. Upload Attachments
            const newAttachmentsUrls: string[] = [];
            for (const file of attachmentsFiles) {
                const path = `attachments/${warrantId}/${Date.now()}_${file.name}`;
                const uploadedPath = await uploadFile(file, path);
                if (uploadedPath) {
                    newAttachmentsUrls.push(getPublicUrl(uploadedPath));
                }
            }

            const warrantData: Partial<Warrant> = {
                name: formData.name,
                type: type === 'prison' ? 'Mandado de Prisão' : 'Mandado de Busca e Apreensão',
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
                tags: formData.tags,
                img: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
                reports: [...(formData.reports || []), ...newReportsUrls],
                attachments: [...(formData.attachments || []), ...newAttachmentsUrls]
            };

            if (editId && onUpdate) {
                const result = await onUpdate(editId, warrantData);
                if (result !== false) {
                    toast.success("Mandado atualizado com sucesso!");
                    navigate('/');
                }
            } else {
                const newWarrant: Warrant = {
                    ...(warrantData as any),
                    id: warrantId,
                    status: 'EM ABERTO'
                };
                const result = await onAdd(newWarrant);
                if (result !== false) {
                    toast.success("Mandado salvo com sucesso!");
                    navigate('/');
                }
            }
        } catch (error) {
            console.error("Erro crítico no handleSubmit:", error);
            toast.error("Ocorreu um erro inesperado ao salvar. Verifique o console.");
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
                        onClick={() => setType('prison')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'prison' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Mandado
                    </button>
                    <button
                        onClick={() => setType('search')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'search' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
                    >
                        Busca e Apreensão
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
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <Camera size={24} className="mb-1" />
                                <span className="text-[10px] font-bold text-center px-2">Adicionar Foto do Alvo</span>
                            </>
                        )}
                        {photoPreview && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
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
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Crime / Infração</label>
                        <select name="crime" value={formData.crime} onChange={handleChange} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none">
                            <option value="">Selecione...</option>
                            {CRIME_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Regime / Situação</label>
                        <select name="regime" value={formData.regime} onChange={handleChange} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none">
                            <option value="">Selecione...</option>
                            {REGIME_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
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
                            <input name="issueDate" value={formData.issueDate} onChange={handleChange} type="date" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Entrada Capturas</label>
                            <input name="entryDate" value={formData.entryDate} onChange={handleChange} type="date" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Vencimento</label>
                            <input name="expirationDate" value={formData.expirationDate} onChange={handleChange} type="date" className="w-full rounded-lg border border-red-200 dark:border-red-900 bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-red-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Data Baixa</label>
                            <input name="dischargeDate" value={formData.dischargeDate} onChange={handleChange} type="date" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <MapPin size={16} className="text-primary" /> Endereço
                    </h3>
                    <div>
                        <input name="location" value={formData.location} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Rua, Número, Bairro, Cidade" />
                    </div>
                </div>

                {/* Investigation (iFood / DIG) */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <Bike size={16} className="text-primary" /> Investigação
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Ofício iFood nº</label>
                            <input name="ifoodNumber" value={formData.ifoodNumber} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: OF-123/2024" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Resultado iFood</label>
                            <textarea name="ifoodResult" value={formData.ifoodResult} onChange={handleChange} rows={2} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Resultado da quebra de sigilo..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-1">Ofício DIG</label>
                            <input name="digOffice" value={formData.digOffice} onChange={handleChange} type="text" className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: DIG-001/24" />
                        </div>
                    </div>
                </div>

                {/* Files Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <FileCheck size={16} className="text-primary" /> Relatórios
                        </h3>
                        <div className="flex flex-col gap-2">
                            {formData.reports?.map((url, idx) => (
                                <div key={`old-${idx}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg text-xs">
                                    <span className="truncate flex-1">Relatório {idx + 1}</span>
                                    <Link to={url} target="_blank" className="text-primary font-bold">Ver</Link>
                                </div>
                            ))}
                            {reportsFiles.map((f, idx) => (
                                <div key={`new-${idx}`} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/10 rounded-lg text-xs">
                                    <span className="truncate flex-1 text-green-700 dark:text-green-400">{f.name}</span>
                                    <button type="button" onClick={() => removeNewFile(idx, 'reports')} className="text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                            <label className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark hover:border-primary hover:text-primary transition-colors cursor-pointer">
                                <Plus size={16} /> Adicionar Relatório
                                <input type="file" onChange={(e) => handleFileAdd(e, 'reports')} className="hidden" multiple />
                            </label>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                            <Paperclip size={16} className="text-primary" /> Anexos
                        </h3>
                        <div className="flex flex-col gap-2">
                            {formData.attachments?.map((url, idx) => (
                                <div key={`old-att-${idx}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg text-xs">
                                    <span className="truncate flex-1">Anexo {idx + 1}</span>
                                    <Link to={url} target="_blank" className="text-primary font-bold">Ver</Link>
                                </div>
                            ))}
                            {attachmentsFiles.map((f, idx) => (
                                <div key={`new-att-${idx}`} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/10 rounded-lg text-xs">
                                    <span className="truncate flex-1 text-green-700 dark:text-green-400">{f.name}</span>
                                    <button type="button" onClick={() => removeNewFile(idx, 'attachments')} className="text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                            <label className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark hover:border-primary hover:text-primary transition-colors cursor-pointer">
                                <Plus size={16} /> Adicionar Anexo
                                <input type="file" onChange={(e) => handleFileAdd(e, 'attachments')} className="hidden" multiple />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Observations */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <Eye size={16} className="text-primary" /> Observações
                    </h3>
                    <textarea name="observation" value={formData.observation} onChange={handleChange} rows={4} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-2.5 text-sm text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary outline-none" placeholder="Informações adicionais, tatuagens, rotina..." />
                </div>

                {/* Priority Selection */}
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark space-y-3">
                    <h3 className="font-bold text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                        <AlertTriangle size={16} className="text-primary" /> Prioridade
                    </h3>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handleTagToggle('Urgente')}
                            className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${formData.tags?.includes('Urgente')
                                ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20'
                                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark'
                                }`}
                        >
                            <Zap size={14} className={formData.tags?.includes('Urgente') ? 'fill-white' : ''} />
                            URGENTE
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTagToggle('Ofício de Cobrança')}
                            className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${formData.tags?.includes('Ofício de Cobrança')
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20'
                                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark'
                                }`}
                        >
                            <Bell size={14} className={formData.tags?.includes('Ofício de Cobrança') ? 'fill-white' : ''} />
                            COBRANÇA
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isUploading}
                        className={`w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-dark active:scale-[0.98]'}`}
                    >
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
