
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
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);

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
            console.error("Erro brasão", e);
        }

        // --- HEADER FUNCTION ---
        const addHeader = (pdf: jsPDF) => {
            let y = 10;

            // 1. Badge (Left)
            if (badgeImg) {
                const imgProps = pdf.getImageProperties(badgeImg);
                const badgeH = 26; // Approx
                const badgeW = (imgProps.width * badgeH) / imgProps.height;
                pdf.addImage(badgeImg, 'PNG', margin, y, badgeW, badgeH);
            }

            // 2. Text (Right of badge)
            const textX = margin + 32; // Skip badge width
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);

            const headerLines = [
                "SECRETARIA DA SEGURANÇA PÚBLICA",
                "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
                "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ –",
                "“DELEGADO TALIS PRADO PINTO”",
                "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ – CARTÓRIO",
                "CENTRAL"
            ];

            let lineY = y + 3;
            headerLines.forEach(line => {
                pdf.text(line, textX, lineY);
                lineY += 3.5;
            });

            // 3. Gray Bar "OFÍCIO"
            const barY = lineY + 2;
            pdf.setFillColor(200, 200, 200); // Light Gray
            pdf.rect(margin, barY, maxLineWidth, 6, 'F');
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.1);
            pdf.rect(margin, barY, maxLineWidth, 6, 'S'); // Border

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text("OFÍCIO", pageWidth / 2, barY + 4.2, { align: 'center' });

            return barY + 10; // Return Y where content starts
        };

        // --- FOOTER FUNCTION ---
        const addFooter = (pdf: jsPDF, pageNum: number, totalPages: number) => {
            const footerY = pageHeight - 15;

            // Address Block (Left)
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);

            const addr1 = "Rua Moisés Ruston, 370, Parque Itamaraty, Jacareí-SP, CEP-12.307-260";

            // Right Block (Date | Page)
            const today = new Date();
            const dateStr = `Data (${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })})`;
            const pageStr = `Página ${pageNum} de ${totalPages}`;

            // Split footer layout
            const dividerX = pageWidth - margin - 35;
            pdf.setDrawColor(0);
            pdf.line(dividerX, footerY - 2, dividerX, footerY + 8);

            // Left of divider
            pdf.text(addr1, dividerX - 5, footerY, { align: 'right' });

            const fullEmailLine = "Tel-12-3951-1000 - E-mail - dig.jacarei@policiacivil.sp.gov.br";
            pdf.text(fullEmailLine, dividerX - 5, footerY + 4, { align: 'right' });

            // Right of divider
            pdf.text(dateStr, dividerX + 5, footerY);
            pdf.text(pageStr, dividerX + 5, footerY + 4);
        };

        // --- CONTENT GENERATION ---

        // Setup Doc
        doc.setFont('times', 'normal');

        // Add Header Page 1
        let y = addHeader(doc);
        y += 10; // Spacing after Gray Bar

        // Render Editable Content
        // We split the edited text to fit the width
        const splitText = doc.splitTextToSize(generatedText, maxLineWidth);

        doc.setFont('times', 'normal');
        doc.setFontSize(11); // Body font size

        // Pagination Loop for Content
        const lineHeight = 5;
        const pageContentHeight = pageHeight - 30; // approx margins

        for (let i = 0; i < splitText.length; i++) {
            if (y > pageContentHeight) {
                doc.addPage();
                y = addHeader(doc) + 10;
                doc.setFont('times', 'normal');
                doc.setFontSize(11);
            }
            doc.text(splitText[i], margin, y);
            y += lineHeight;
        }

        // Add Footers
        // Fix getNumberOfPages error by casting or using supported property
        const totalPages = (doc as any).internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(doc, i, totalPages);
        }

        const safeOfficeNum = officeNumber ? officeNumber.replace(/\//g, '-') : 'SEM_NUMERO';
        doc.save(`Oficio_IFood_${safeOfficeNum}_${warrant.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF oficial gerado.");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-blue-900/50 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-blue-900/30 bg-blue-950/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-100">
                                {type === 'ifood' ? 'OFÍCIO IFOOD' : 'OFÍCIO UBER'}
                            </h3>
                            <p className="text-xs text-blue-400/80">Geração de Documento Oficial</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Steps */}
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
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                            <p className="text-gray-400 animate-pulse">Gerando minuta do ofício com IA...</p>
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="space-y-4">

                            <div className="bg-white text-black p-8 rounded shadow-lg min-h-[500px] border border-gray-200">
                                <textarea
                                    value={generatedText}
                                    onChange={(e) => setGeneratedText(e.target.value)}
                                    className="w-full h-full min-h-[500px] bg-transparent resize-none focus:outline-none font-[Times_New_Roman] text-[11pt] leading-relaxed"
                                    spellCheck={false}
                                />
                            </div>

                            <p className="text-xs text-center text-gray-500">
                                * Edite o texto acima conforme necessário antes de baixar o PDF.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-blue-900/30 bg-blue-950/20 flex justify-between items-center">
                    <div className="text-xs text-gray-400 italic">
                        {step === 'result' && "Confira os dados antes de assinar."}
                    </div>

                    <div className="flex items-center gap-3">
                        {step === 'result' && (
                            <>
                                <button
                                    onClick={handleCopy}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copiar
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    BAIXAR PDF
                                </button>
                            </>
                        )}
                        {step === 'input' && (
                            <button
                                onClick={handleGenerate}
                                disabled={isProcessing}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                            >
                                {isProcessing ? 'Gerando...' : 'GERAR MINUTA'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IfoodReportModal;
