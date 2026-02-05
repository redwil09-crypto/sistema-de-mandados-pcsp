
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, Check, Copy, Download, Loader2, FileType, Bot, Bike, Car } from 'lucide-react';
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

const UBER_TEMPLATE = `OFÍCIO
Ofício: nº.26/CAPT/2025
Referência: PROC. Nº 0006701-81.2017.8.26.0292
Natureza: Solicitação de Dados.
Jacareí, 4 de JUNHO de 2025.
ILMO. SENHOR RESPONSÁVEL:
Com a finalidade de instruir investigação policial referente ao crime tipificado no artigo 121 do Código Penal, solicito a gentileza de verificar se o indivíduo abaixo relacionado encontram-se cadastrado como usuário ou prestador de serviços da plataforma UBER. Em caso positivo, requer-se o envio das informações cadastrais fornecidas para habilitação na plataforma, incluindo, se disponíveis, nome de usuário, endereço(s), número(s) de telefone, e demais dados vinculados à respectiva conta. E também ENDEREÇO(S) DAS CORRIDAS COM DATAS E HORÁRIOS DE 01/01/2025 HÁ 04/06/2025. As informações devem ser encaminhadas ao e-mail institucional do policial responsável pela investigação: william.castro@policiacivil.sp.gov.br William Campos de Assis Castro – Polícia Civil do Estado de São Paulo Réu de interesse para a investigação: ADRIANA PARANHOS ARICE – CPF 362.590.148-05 Aproveito a oportunidade para renovar meus votos de elevada estima e consideração.
Atenciosamente
Luiz Antonio Cunha dos Santos
Delegado de Polícia
Ao Ilustríssimo Senhor Responsável
Empresa UBER.`;

const IFOOD_TEMPLATE = `OFÍCIO
Ofício: nº.138/CAPT/2025 Referência: PROC. Nº 0000637-73.2022.8.26.0100
Natureza: Solicitação de Dados.
Jacareí, 28 de novembro de 2025.
ILMO. SENHOR RESPONSÁVEL,
Com a finalidade de instruir investigação policial em trâmite nesta unidade, solicito, respeitosamente, a gentileza de verificar se o indivíduo abaixo relacionado encontra-se cadastrado como usuário ou entregador da plataforma IFOOD.
Em caso positivo, requer-se o envio das informações cadastrais fornecidas para habilitação na plataforma, incluindo, se disponíveis, nome completo, endereço(s), número(s) de telefone, e-mail(s) e demais dados vinculados à respectiva conta.
As informações devem ser encaminhadas ao e-mail institucional do policial responsável pela investigação:
william.castro@policiacivil.sp.gov.br
William Campos de Assis Castro – Polícia Civil do Estado de São Paulo
Pessoa de interesse para a investigação: LUCILENE CORREIA DE AGUIAR / CPF: 803.750.733-53
Aproveito a oportunidade para renovar meus votos de elevada estima e consideração.
Atenciosamente,
Luiz Antônio Cunha dos Santos
Delegado de Polícia
Ao Ilustríssimo Senhor Responsável
Empresa iFood.`;

const IfoodReportModal: React.FC<IfoodReportModalProps> = ({ isOpen, onClose, warrant }) => {
    const [activeTab, setActiveTab] = useState<'select' | 'preview'>('select');
    const [generatedText, setGeneratedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [reportType, setReportType] = useState<'ifood' | 'uber' | 'manual'>('ifood');
    const [templateText, setTemplateText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGenerate = async (type: 'ifood' | 'uber' | 'manual', customText?: string) => {
        let baseTemplate = "";
        if (type === 'ifood') baseTemplate = IFOOD_TEMPLATE;
        else if (type === 'uber') baseTemplate = UBER_TEMPLATE;
        else baseTemplate = customText || templateText;

        if (!baseTemplate.trim()) {
            toast.error("Por favor, forneça um modelo.");
            return;
        }

        setIsProcessing(true);
        setActiveTab('preview');
        setReportType(type);

        try {
            const result = await adaptDocumentToTarget(warrant, baseTemplate);
            setGeneratedText(result || "Erro ao gerar documento.");
            toast.success(`Ofício ${type.toUpperCase()} gerado com sucesso!`);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar com IA.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileType = file.name.split('.').pop()?.toLowerCase();

        if (fileType === 'docx') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    handleGenerate('manual', result.value);
                } catch (error) {
                    console.error("Erro ao ler DOCX:", error);
                    toast.error("Erro ao ler arquivo Word.");
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileType === 'txt') {
            const reader = new FileReader();
            reader.onload = (event) => {
                handleGenerate('manual', event.target?.result as string);
            };
            reader.readAsText(file);
        } else {
            toast.error("Formato não suportado. Use .docx ou .txt");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        toast.success("Texto copiado!");
    };

    const handleDownloadPDF = () => {
        if (!generatedText) return;
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(generatedText, 180);
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.text(splitText, 15, 20);
        doc.save(`Oficio_${reportType.toUpperCase()}_${warrant.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF baixado.");
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <Bot className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Agente de Inteligência iFood & Uber</h2>
                            <p className="text-xs text-slate-400">Geração Instantânea de Ofícios Judiciais</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col">

                    {activeTab === 'select' && (
                        <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto items-center justify-center">
                            <h3 className="text-xl font-bold text-white mb-4">Selecione o tipo de ofício para gerar:</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                                {/* iFood Card */}
                                <button
                                    onClick={() => handleGenerate('ifood')}
                                    className="group relative bg-slate-800 border border-slate-700 p-8 rounded-2xl hover:border-red-500 transition-all hover:scale-[1.02] flex flex-col items-center gap-4 text-center shadow-lg"
                                >
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                        <Bike size={40} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-wider">iFood</h4>
                                        <p className="text-xs text-slate-400 mt-2">Gerar ofício de solicitação de dados cadastrais e entregas para a plataforma iFood.</p>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500 scale-x-0 group-hover:scale-x-100 transition-transform rounded-b-2xl"></div>
                                </button>

                                {/* Uber Card */}
                                <button
                                    onClick={() => handleGenerate('uber')}
                                    className="group relative bg-slate-800 border border-slate-700 p-8 rounded-2xl hover:border-cyan-400 transition-all hover:scale-[1.02] flex flex-col items-center gap-4 text-center shadow-lg"
                                >
                                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                        <Car size={40} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-wider">Uber</h4>
                                        <p className="text-xs text-slate-400 mt-2">Gerar ofício de solicitação de dados cadastrais e histórico de corridas para a Uber.</p>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform rounded-b-2xl"></div>
                                </button>
                            </div>

                            <div className="flex items-center gap-4 w-full max-w-md my-4">
                                <div className="h-px bg-slate-700 flex-1"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest text-center">Opções Avançadas</span>
                                <div className="h-px bg-slate-700 flex-1"></div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Upload size={14} /> Upload de Modelo Próprio
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".docx,.txt" onChange={handleFileUpload} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="h-full flex flex-col p-6 gap-4">
                            {isProcessing ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
                                    <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tighter">O Agente está redigindo o Ofício...</h3>
                                    <p className="text-slate-400 mt-2 max-w-sm text-sm">
                                        Substituindo Processo, Nome, CPF e adequando termos jurídicos para a plataforma {reportType.toUpperCase()}.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded ${reportType === 'uber' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-500'}`}>
                                                {reportType === 'uber' ? <Car size={16} /> : <Bike size={16} />}
                                            </div>
                                            <span className="text-xs font-black text-white uppercase tracking-widest">Ofício {reportType.toUpperCase()} Gerado</span>
                                        </div>
                                        <button onClick={() => setActiveTab('select')} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors">Voltar / Alterar Tipo</button>
                                    </div>
                                    <div className="flex-1 bg-white text-slate-900 p-8 rounded-lg shadow-inner overflow-y-auto font-serif whitespace-pre-wrap leading-relaxed border-4 border-slate-200 text-sm md:text-base">
                                        {generatedText}
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur">
                                        <p className="text-xs text-slate-400 font-medium italic">Confira os dados antes de proceder com o envio oficial.</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleCopy}
                                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
                                            >
                                                <Copy className="w-4 h-4" /> Copiar
                                            </button>
                                            <button
                                                onClick={handleDownloadPDF}
                                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-red-900/40 active:scale-95 uppercase tracking-wider"
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
