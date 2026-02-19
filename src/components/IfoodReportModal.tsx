
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Download, Loader2, Bike, Car, Hash, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { Warrant } from '../types';
import { uploadFile, getPublicUrl } from '../supabaseStorage';

interface IfoodReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    warrant: Warrant;
    type: 'ifood' | 'uber' | '99';
    updateWarrant: (id: string, data: Partial<Warrant>) => Promise<boolean>;
}

const IfoodReportModal: React.FC<IfoodReportModalProps> = ({ isOpen, onClose, warrant, type, updateWarrant }) => {
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

    const handleGenerate = () => {
        if (!officeNumber.trim()) {
            toast.error("Por favor, informe o número do ofício.");
            return;
        }

        setStep('processing');
        setIsProcessing(true);

        // Simulate short delay for UX
        setTimeout(() => {
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const today = new Date();
            const dateLine = `Jacareí, ${today.getDate().toString().padStart(2, '0')} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

            let platformName = 'IFOOD';
            if (type === 'uber') platformName = 'UBER';
            if (type === '99') platformName = '99';

            // Indentação (simulada com espaços, pois é plain text na textarea)
            const indent = "          ";

            const text = `Ofício: nº.${officeNumber}/CAPT/2025
Referência: PROC. Nº ${warrant.number}
Natureza: Solicitação de Dados.

${dateLine}

ILMO. SENHOR RESPONSÁVEL,

${indent}Com a finalidade de instruir investigação policial em trâmite nesta unidade, solicito, respeitosamente, a gentileza de verificar se o indivíduo abaixo relacionado encontra-se cadastrado como usuário ou entregador da plataforma ${platformName}.

${indent}Em caso positivo, requer-se o envio das informações cadastrais fornecidas para habilitação na plataforma, incluindo, se disponíveis, nome completo, endereço(s), número(s) de telefone, e-mail(s) e demais dados vinculados à respectiva conta.

${indent}As informações devem ser encaminhadas ao e-mail institucional do policial responsável pela investigação:

${indent}william.castro@policiacivil.sp.gov.br
${indent}William Campos de Assis Castro – Polícia Civil do Estado de São Paulo

${indent}Pessoa de interesse para a investigação:

${indent}${warrant.name.toUpperCase()} – CPF ${warrant.cpf || warrant.rg || 'NÃO INFORMADO'}

${indent}Aproveito a oportunidade para renovar meus votos de elevada estima e consideração.

${indent}Atenciosamente,`;

            setGeneratedText(text);
            setStep('result');
            setIsProcessing(false);
        }, 600);
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
                "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
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
            const addr2 = "Tel-12-3951-1000 - E-mail - dig.jacarei@policiacivil.sp.gov.br";

            const today = new Date();
            const dateStr = `Data (${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })})`;
            const pageStr = `Página ${pageNum} de ${totalPages}`;

            const dividerX = pageWidth - margin - 35;
            pdf.setDrawColor(0);
            pdf.line(dividerX, footerY - 2, dividerX, footerY + 8);

            // Left of divider (Address)
            pdf.text(addr1, dividerX - 5, footerY, { align: 'right' });

            // Left of divider (Contact)
            const emailPart = "dig.jacarei@policiacivil.sp.gov.br";
            const phonePart = "Tel-12-3951-1000 - E-mail - ";

            // Render the phone part (black)
            const fullContactWidth = pdf.getTextWidth(phonePart + emailPart);
            const contactEndX = dividerX - 5;
            const contactStartX = contactEndX - fullContactWidth;

            pdf.text(phonePart, contactStartX, footerY + 4);

            // Render the email part (blue) next to it
            pdf.setTextColor(0, 0, 255);
            pdf.text(emailPart, contactStartX + pdf.getTextWidth(phonePart), footerY + 4);
            pdf.setTextColor(0, 0, 0); // Reset

            // Right of divider
            pdf.text(dateStr, dividerX + 5, footerY);
            pdf.text(pageStr, dividerX + 5, footerY + 4);
        };

        // --- CONTENT GENERATION ---

        // Setup Doc
        doc.setFont('times', 'normal');
        let y = 10;

        // Add Header Page 1
        y = addHeader(doc);
        y += 8; // Spacing after header

        // BODY TEXT (From Textarea)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        // Split text by newlines first to respect user paragraphs
        const lines = generatedText.split('\n');

        lines.forEach((line) => {
            // Check for page break
            if (y > pageHeight - 65) { // Leave space for footer/signature
                doc.addPage();
                y = addHeader(doc) + 8;
            }

            if (line.trim() === '') {
                y += 5; // Empty line spacing
            } else {
                const splitLine = doc.splitTextToSize(line, maxLineWidth);
                doc.text(splitLine, margin, y);
                y += (splitLine.length * 5) + 2; // Line height
            }
        });


        // AREA DE ASSINATURA E DESTINATÁRIO (Position Fixed at Bottom)
        // --------------------------------------------------------------------------------

        const footerStart = pageHeight - 15;
        const addresseeY = footerStart - 15; // "Ao Ilustríssimo..." line
        const signatureNameY = addresseeY - 25; // "Luiz Antônio..." line
        const signatureTitleY = signatureNameY + 5; // "Delegado..." line

        // Se o texto invadir a área da assinatura, cria nova página
        if (y > signatureNameY - 10) {
            doc.addPage();
            addHeader(doc);
            // Na nova página, usamos as mesmas posições fixas no rodapé
        }

        // Render Signature Block (Fixed Position)
        doc.setFont('helvetica', 'bold');
        doc.text("Luiz Antônio Cunha dos Santos", pageWidth / 2, signatureNameY, { align: 'center' });
        doc.text("Delegado de Polícia", pageWidth / 2, signatureTitleY, { align: 'center' });

        // Render Addressee Block (Fixed Position)
        doc.setFont('helvetica', 'normal');
        doc.text("Ao Ilustríssimo Senhor Responsável", margin, addresseeY);
        doc.setFont('helvetica', 'bold');

        // Dynamic Company Name Footer
        let companyName = 'iFood';
        if (type === 'uber') companyName = 'UBER';
        if (type === '99') companyName = '99';
        doc.text(`Empresa ${companyName}.`, margin, addresseeY + 5);

        // Add Footers
        // Fix getNumberOfPages error by casting or using supported property
        const totalPages = (doc as any).internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(doc, i, totalPages);
        }

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Oficio_${type.toUpperCase()}_${officeNumber}.pdf`, { type: 'application/pdf' });

        // Save locally first
        let filenameType = 'IFood';
        if (type === 'uber') filenameType = 'Uber';
        if (type === '99') filenameType = '99';
        doc.save(`Oficio_${filenameType}_${officeNumber}_${warrant.name.replace(/\s+/g, '_')}.pdf`);

        // Upload & Save to DB
        const toastId = toast.loading("Salvando cópia no prontuário...");
        try {
            const path = `attachments/ifood/${warrant.id}/${Date.now()}_Oficio_${officeNumber}.pdf`;
            const uploadedPath = await uploadFile(pdfFile, path);

            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                const currentDocs = warrant.ifoodDocs || [];
                await updateWarrant(warrant.id, { ifoodDocs: [...currentDocs, url] });
                toast.success("Cópia salva no histórico!", { id: toastId });
                onClose();
            } else {
                toast.dismiss(toastId);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar cópia no banco.", { id: toastId });
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${type === 'uber' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' :
                                type === '99' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                                    'bg-red-500/10 border-red-500/20 text-red-500'
                            }`}>
                            {type === 'uber' ? <Car className="w-6 h-6" /> : type === '99' ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
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
                                <FileText size={18} /> Iniciar Redação
                            </button>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Gerando Minuta...</h3>
                            <p className="text-slate-400 mt-2 max-w-sm text-sm">
                                Substituindo dados de {warrant.name} no modelo {type.toUpperCase()} nº {officeNumber}.
                            </p>
                        </div>
                    )}

                    {step === 'result' && (
                        <>
                            <textarea
                                className="flex-1 w-full bg-white text-slate-900 p-8 rounded-lg shadow-inner overflow-y-auto font-serif whitespace-pre-wrap leading-relaxed border-4 border-slate-200 text-sm md:text-base selection:bg-indigo-100 animate-in fade-in zoom-in-95 resize-none focus:outline-none focus:border-indigo-400 transition-colors"
                                value={generatedText}
                                onChange={(e) => setGeneratedText(e.target.value)}
                            />
                            <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur">
                                <p className="text-xs text-slate-400 font-medium italic">Edite o texto acima conforme necessário.</p>
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
