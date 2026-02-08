
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Copy, Download, Loader2, Bot, Bike, Car, Hash, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { adaptDocumentToTarget } from '../services/geminiService';
import { Warrant } from '../types';

interface IfoodReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    warrant: Warrant;
    type: 'ifood' | 'uber';
}

const UBER_TEMPLATE = `OFÍCIO
Ofício: nº.{{OFFICE_NUMBER}}/CAPT/2025
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
Ofício: nº.{{OFFICE_NUMBER}}/CAPT/2025 Referência: PROC. Nº 0000637-73.2022.8.26.0100
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

const IfoodReportModal: React.FC<IfoodReportModalProps> = ({ isOpen, onClose, warrant, type }) => {
    const [generatedText, setGeneratedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [officeNumber, setOfficeNumber] = useState('');
    const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');

    useEffect(() => {
        if (!isOpen) {
            setStep('input');
            setGeneratedText('');
            setOfficeNumber('');
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!officeNumber.trim()) {
            toast.error("Por favor, informe o número do ofício.");
            return;
        }

        const baseTemplate = (type === 'ifood' ? IFOOD_TEMPLATE : UBER_TEMPLATE)
            .replace('{{OFFICE_NUMBER}}', officeNumber);

        setStep('processing');
        setIsProcessing(true);

        try {
            const result = await adaptDocumentToTarget(warrant, baseTemplate);
            setGeneratedText(result || "Erro ao gerar documento.");
            setStep('result');
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar com IA.");
            setStep('input');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        toast.success("Texto copiado!");
    };

    const handleDownloadPDF = async () => {
        if (!generatedText) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15; // Adjusted to match Dossier standard
        const maxLineWidth = pageWidth - (margin * 2);

        // --- THEME COLORS (Matches pdfReportService) ---
        const COLORS = {
            PRIMARY: [15, 23, 42] as [number, number, number],    // Slate 900
            SECONDARY: [51, 65, 85] as [number, number, number],  // Slate 700
            BORDER: [226, 232, 240] as [number, number, number],  // Slate 200
            TEXT: [30, 41, 59] as [number, number, number],      // Slate 800
        };

        // --- LOAD BADGE IMAGE ---
        let badgeImg: HTMLImageElement | null = null;
        try {
            const badgePC = new Image();
            badgePC.src = './brasao_pcsp_nova.png';
            await new Promise((resolve) => {
                badgePC.onload = () => resolve(true);
                badgePC.onerror = () => {
                    badgePC.src = './brasao_pcsp_colorido.png';
                    badgePC.onload = () => resolve(true);
                    badgePC.onerror = () => resolve(false);
                };
            });
            badgeImg = badgePC;
        } catch (e) {
            console.error("Erro ao carregar brasão", e);
        }

        // Institutional Header (Dossier Style)
        const addHeader = (pdf: jsPDF) => {
            let y = 15;

            try {
                if (badgeImg) {
                    const imgProps = pdf.getImageProperties(badgeImg);
                    const badgeH = 22;
                    const badgeW = (imgProps.width * badgeH) / imgProps.height;
                    pdf.addImage(badgeImg, 'PNG', margin, y, badgeW, badgeH);

                    const textX = margin + badgeW + 8;
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(8);
                    pdf.setTextColor(...COLORS.SECONDARY);

                    const headerLines = [
                        "GOVERNO DO ESTADO DE SÃO PAULO",
                        "SECRETARIA DA SEGURANÇA PÚBLICA",
                        "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                        "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                        "SECCIONAL DE JACAREÍ - DIG (INVESTIGAÇÕES GERAIS)"
                    ];

                    headerLines.forEach((line, index) => {
                        pdf.text(line, textX, y + 3 + (index * 4));
                    });

                    // Line below header
                    pdf.setDrawColor(...COLORS.BORDER);
                    pdf.setLineWidth(0.1);
                    pdf.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
                }
            } catch (e) {
                console.error("Header drawing error", e);
            }
        };

        // Footer (Dossier Style)
        const addFooter = (pdf: jsPDF, pageNum: number, totalPages: number) => {
            pdf.setDrawColor(...COLORS.BORDER);
            pdf.setLineWidth(0.1);
            pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(150, 150, 150);

            const now = new Date().toLocaleString('pt-BR');
            pdf.text(`GERADO EM: ${now} | SISTEMA DE INTELIGÊNCIA DIG/PCSP | DOCUMENTO OFICIAL`, margin, pageHeight - 10);
            pdf.text(`PÁGINA ${pageNum} DE ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        };

        // Process text for multiple pages
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.TEXT);

        const splitText = doc.splitTextToSize(generatedText, maxLineWidth);

        let yPos = 45; // Start lower to accommodate new header
        let currentPage = 1;
        const lineHeight = 6;
        const linesPerPage = Math.floor((pageHeight - 60) / lineHeight);
        const totalPages = Math.ceil(splitText.length / linesPerPage);

        for (let i = 0; i < splitText.length; i += linesPerPage) {
            if (currentPage > 1) {
                doc.addPage();
                yPos = 45;
            }

            addHeader(doc);

            const linesToShow = splitText.slice(i, i + linesPerPage);
            doc.setFont('times', 'normal'); // Reset font for body
            doc.setFontSize(11);
            doc.setTextColor(...COLORS.TEXT);
            doc.text(linesToShow, margin, yPos);

            addFooter(doc, currentPage, totalPages || 1);
            currentPage++;
        }

        doc.save(`Oficio_${type.toUpperCase()}_${officeNumber}_${warrant.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF oficial gerado e baixado com sucesso.");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${type === 'uber' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            {type === 'uber' ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100 uppercase">Ofício {type.toUpperCase()}</h2>
                            <p className="text-xs text-slate-400">Geração de Documento Oficial</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col p-6 gap-4">

                    {step === 'input' && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                <Hash size={40} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white mb-2">Número do Ofício</h3>
                                <p className="text-slate-400 text-sm">Informe o número sequencial para o documento.</p>
                            </div>
                            <div className="w-full max-w-xs scale-110">
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-black text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    placeholder="Ex: 026"
                                    value={officeNumber}
                                    onChange={(e) => setOfficeNumber(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-indigo-900/40 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <FileText size={18} /> Iniciar Redação IA
                            </button>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Redigindo Ofício Judicial...</h3>
                            <p className="text-slate-400 mt-2 max-w-sm text-sm">
                                Substituindo dados de {warrant.name} no modelo {type.toUpperCase()} nº {officeNumber}.
                            </p>
                        </div>
                    )}

                    {step === 'result' && (
                        <>
                            <div className="flex-1 bg-white text-slate-900 p-8 rounded-lg shadow-inner overflow-y-auto font-serif whitespace-pre-wrap leading-relaxed border-4 border-slate-200 text-sm md:text-base selection:bg-indigo-100 animate-in fade-in zoom-in-95">
                                {generatedText}
                            </div>
                            <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur">
                                <p className="text-xs text-slate-400 font-medium italic">Confira os dados antes de assinar.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <Copy className="w-4 h-4" /> Copiar
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/40 active:scale-95 uppercase tracking-wider"
                                    >
                                        <Download className="w-4 h-4" /> Baixar PDF
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IfoodReportModal;
