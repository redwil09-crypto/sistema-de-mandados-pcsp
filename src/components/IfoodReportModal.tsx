
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, Check, Copy, Download, Loader2, FileType, Bot } from 'lucide-react';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { adaptDocumentToTarget } from '../services/geminiService';
import { Warrant } from '../types';

interface IfoodReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    warrant: Warrant;
}

const IfoodReportModal: React.FC<IfoodReportModalProps> = ({ isOpen, onClose, warrant }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
    const [templateText, setTemplateText] = useState('');
    const [generatedText, setGeneratedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const fileType = file.name.split('.').pop()?.toLowerCase();

        if (fileType === 'docx') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setTemplateText(result.value);
                } catch (error) {
                    console.error("Erro ao ler DOCX:", error);
                    toast.error("Erro ao ler arquivo Word.");
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileType === 'txt') {
            const reader = new FileReader();
            reader.onload = (event) => {
                setTemplateText(event.target?.result as string);
            };
            reader.readAsText(file);
        } else {
            toast.error("Formato não suportado. Use .docx ou .txt");
        }
    };

    const handleProcess = async () => {
        if (!templateText.trim()) {
            toast.error("Por favor, cole um texto ou suba um arquivo.");
            return;
        }

        setIsProcessing(true);
        setActiveTab('preview'); // Move to preview tab immediately to show loading state

        try {
            const result = await adaptDocumentToTarget(warrant, templateText);
            setGeneratedText(result || "Erro ao gerar documento.");
            toast.success("Documento adaptado com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar com IA.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        toast.success("Texto copiado!");
    };

    const handleDownloadPDF = () => {
        if (!generatedText) return;
        const doc = new jsPDF();

        // Simple PDF generation (text wrap)
        const splitText = doc.splitTextToSize(generatedText, 180);
        doc.setFont('times', 'normal');
        doc.setFontSize(12);

        // Add header if needed or keep it simple as it is an adapted document
        doc.text(splitText, 15, 20);

        doc.save(`iFood_Report_${warrant.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF baixado.");
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <FileType className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Agente Especialista iFood</h2>
                            <p className="text-xs text-slate-400">Gerador de Ofícios e Relatórios Institucionais</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-slate-800 text-white border-b-2 border-red-500' : 'text-slate-400 hover:text-white'}`}
                    >
                        1. Modelo / Upload
                    </button>
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-slate-800 text-white border-b-2 border-red-500' : 'text-slate-400 hover:text-white'}`}
                    >
                        2. Documento Gerado
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">

                    {/* Upload Tab */}
                    {activeTab === 'upload' && (
                        <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto">

                            <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl p-8 hover:bg-slate-800/50 transition-colors cursor-pointer text-center group"
                                onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".docx,.txt"
                                    onChange={handleFileUpload}
                                />
                                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3 group-hover:text-red-400 transition-colors" />
                                <p className="text-slate-300 font-medium">Clique para carregar modelo (.docx ou .txt)</p>
                                <p className="text-xs text-slate-500 mt-1">O sistema extrairá o texto e manterá apenas a estrutura.</p>
                                {fileName && (
                                    <div className="mt-4 inline-flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-full text-xs text-blue-300 border border-blue-500/20">
                                        <Check className="w-3 h-3" />
                                        {fileName}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 my-2">
                                <div className="h-px bg-slate-700 flex-1"></div>
                                <span className="text-xs text-slate-500 uppercase font-bold">OU COLE O TEXTO ABAIXO</span>
                                <div className="h-px bg-slate-700 flex-1"></div>
                            </div>

                            <textarea
                                className="flex-1 w-full bg-slate-950 p-4 rounded-lg border border-slate-700 text-slate-300 font-mono text-sm resize-none focus:ring-1 focus:ring-red-500 outline-none"
                                placeholder="Cole o conteúdo do modelo aqui se preferir..."
                                value={templateText}
                                onChange={(e) => setTemplateText(e.target.value)}
                            />

                            <div className="flex justify-end">
                                <button
                                    onClick={handleProcess}
                                    disabled={!templateText.trim()}
                                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold shadow-lg shadow-red-900/20 transition-all"
                                >
                                    <Bot className="w-5 h-5" />
                                    Gerar Documento Adaptado
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preview Tab */}
                    {activeTab === 'preview' && (
                        <div className="h-full flex flex-col p-6 gap-4">
                            {isProcessing ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-white">O Agente está trabalhando...</h3>
                                    <p className="text-slate-400 mt-2 max-w-md">
                                        Substituindo dados, adequando pronomes e verificando integridade do texto institucional.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 bg-white text-slate-900 p-8 rounded-lg shadow-inner overflow-y-auto font-serif whitespace-pre-wrap leading-relaxed border border-slate-300">
                                        {generatedText}
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400">Verifique o conteúdo antes de enviar.</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCopy}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                            >
                                                <Copy className="w-4 h-4" /> Copiar Texto
                                            </button>
                                            <button
                                                onClick={handleDownloadPDF}
                                                className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                            >
                                                <Download className="w-4 h-4" /> Baixar PDF
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IfoodReportModal;
