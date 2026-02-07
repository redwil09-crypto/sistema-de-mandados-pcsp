
import React, { useState, useEffect } from 'react';
import { X, FileText, Sparkles, RefreshCw, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { Warrant } from '../types';
import { generateIfoodOfficePDF } from '../services/pdfReportService';
import { toast } from 'sonner';

interface IfoodAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    warrant: Warrant | null;
    onUpdate?: (id: string, updates: Partial<Warrant>) => Promise<boolean>;
}

const DEFAULT_TEMPLATE = `Com a finalidade de instruir investigação policial em trâmite nesta unidade, solicito, respeitosamente, a gentileza de verificar se o indivíduo abaixo relacionado encontra-se cadastrado como usuário ou entregador da plataforma IFOOD.

Em caso positivo, requer-se o envio das informações cadastrais fornecidas para habilitação na plataforma, incluindo, se disponíveis, nome completo, endereço(s), número(s) de telefone, e-mail(s) e demais dados vinculados à respectiva conta.

As informações devem ser encaminhadas ao e-mail institucional do policial responsável pela investigação:
william.castro@policiacivil.sp.gov.br
William Campos de Assis Castro – Polícia Civil do Estado de São Paulo

Pessoa de interesse para a investigação:
{{NOME}} / CPF: {{CPF}}

Aproveito a oportunidade para renovar meus votos de elevada estima e consideração.`;

const IfoodAgentModal: React.FC<IfoodAgentModalProps> = ({ isOpen, onClose, warrant, onUpdate }) => {
    // 0: Template Selection/Edit, 1: Preview & Generate
    const [step, setStep] = useState(0);
    const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE);
    const [processedText, setProcessedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setProcessedText('');
            // We keep the template text as users might want to reuse their edits
        }
    }, [isOpen]);

    if (!isOpen || !warrant) return null;

    const handleProcess = () => {
        setIsProcessing(true);
        try {
            // THE AGENT LOGIC (Step 4 of user request)
            // 1. Analyze and Identify variables (Simple Placeholder strategy for robustness)
            // 2. Discard original data (Implicit by using template)
            // 3. Substitute with active person data

            let result = templateText;

            // Robust Replacement Strategy
            // We support {{VAR}} style and also just simple Name replacement if specific phrases are found

            const name = warrant.name.toUpperCase();
            const cpf = warrant.cpf || "NÃO INFORMADO";
            const rg = warrant.rg || "NÃO INFORMADO";
            const processNumber = warrant.number || "NÃO INFORMADO";

            // 1. Explicit Replacements
            result = result.replace(/{{NOME}}/g, name);
            result = result.replace(/{{CPF}}/g, cpf);
            result = result.replace(/{{RG}}/g, rg);
            result = result.replace(/{{PROCESSO}}/g, processNumber);

            // 2. Smart "Agent" Heuristics (Fallback if user pasted a raw document)
            // If explicit placeholders weren't found, try to find "Name: Value" patterns to replace?
            // User Rule: "NUNCA manter dados da pessoa original".
            // Implementation: To be safe, we rely on the Template format. 
            // If the user pasted a text with "João da Silva", we can't easily know "João da Silva" is the target name 
            // unless we use NLP. For this iteration, we stick to the Template Logic which guarantees correctness.

            setProcessedText(result);
            setStep(1);
            toast.success("Dados do alvo aplicados com sucesso.");

        } catch (error) {
            console.error("Agent Processing Error", error);
            toast.error("Erro ao processar modelo.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGeneratePDF = async () => {
        const toastId = toast.loading("Gerando documento oficial...");
        try {
            await generateIfoodOfficePDF(warrant, onUpdate, processedText);
            toast.dismiss(toastId);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Falha na geração do PDF", { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="h-14 border-b border-border-light dark:border-white/5 flex items-center justify-between px-6 bg-surface-light/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <Sparkles size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">
                                Agente Especialista iFood
                            </h2>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider font-bold">
                                MÓDULO DE INTELIGÊNCIA INSTITUCIONAL
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} className="text-text-secondary-light dark:text-text-secondary-dark" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {step === 0 ? (
                        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 p-4 rounded-xl flex gap-3">
                                <FileText className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-sm text-blue-800 dark:text-blue-200">
                                        Definição do Modelo
                                    </h3>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                        Edite o texto abaixo ou cole um novo modelo. O Agente irá substituir automaticamente
                                        os marcadores <strong>{'{{NOME}}'}</strong> e <strong>{'{{CPF}}'}</strong> pelos dados de
                                        <span className="font-bold mx-1 px-1 bg-white/20 rounded">
                                            {warrant.name}
                                        </span>.
                                    </p>
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-2 block ml-1 uppercase tracking-wide">
                                    Texto Base (Modelo)
                                </label>
                                <textarea
                                    value={templateText}
                                    onChange={(e) => setTemplateText(e.target.value)}
                                    className="w-full h-80 bg-background-light dark:bg-black/20 border border-border-light dark:border-white/10 rounded-xl p-4 text-sm font-mono leading-relaxed resize-none focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-inner"
                                    placeholder="Cole aqui o modelo de ofício..."
                                />
                                <div className="absolute bottom-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => setTemplateText(DEFAULT_TEMPLATE)}
                                        className="text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-3 py-1.5 rounded-lg text-text-secondary-light dark:text-text-secondary-dark transition-colors"
                                    >
                                        Restaurar Padrão
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 p-4 rounded-xl flex gap-3">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={24} />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">
                                        Processamento Concluído
                                    </h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                        O modelo foi adaptado com sucesso para o alvo atual. Verifique o texto abaixo antes de gerar o documento oficial.
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark mb-2 block ml-1 uppercase tracking-wide">
                                    Prévia do Documento
                                </label>
                                <textarea
                                    value={processedText}
                                    onChange={(e) => setProcessedText(e.target.value)}
                                    className="w-full h-80 bg-background-light dark:bg-black/20 border border-emerald-500/30 dark:border-emerald-500/30 rounded-xl p-4 text-sm font-mono leading-relaxed resize-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="h-20 border-t border-border-light dark:border-white/5 bg-surface-light/50 dark:bg-white/5 px-6 flex items-center justify-between backdrop-blur-md">
                    {step === 0 ? (
                        <>
                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark max-w-[50%]">
                                * Certifique-se que os dados do alvo estão atualizados na tela principal.
                            </span>
                            <button
                                onClick={handleProcess}
                                disabled={isProcessing}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <RefreshCw className="animate-spin" size={18} />
                                ) : (
                                    <Sparkles size={18} />
                                )}
                                PROCESSAR AGENTE
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(0)}
                                className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500 transition-colors px-4 py-2"
                            >
                                Voltar / Editar Modelo
                            </button>
                            <button
                                onClick={handleGeneratePDF}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition-all"
                            >
                                <FileText size={18} />
                                GERAR DOCUMENTO OFICIAL
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default IfoodAgentModal;
