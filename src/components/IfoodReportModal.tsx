
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Download, Loader2, Bike, Car, Hash, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { Warrant } from '../types';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import { UserProfile } from '../services/pdfReportService';

interface IfoodReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    warrant: Warrant;
    type: 'ifood' | 'uber' | '99';
    updateWarrant: (id: string, data: Partial<Warrant>) => Promise<boolean>;
    userProfile?: UserProfile | null;
}

const AUTHORITIES = [
    { name: "Luiz Antônio Cunha dos Santos", title: "Delegado de Polícia", email: "dig.jacarei@policiacivil.sp.gov.br" },
    { name: "William Campos de Assis Castro", title: "Delegado de Polícia", email: "william.castro@policiacivil.sp.gov.br" }
];

const IfoodReportModal: React.FC<IfoodReportModalProps> = ({ isOpen, onClose, warrant, type: initialType, updateWarrant, userProfile }) => {
    const [generatedText, setGeneratedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [officeNumber, setOfficeNumber] = useState('');
    const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
    const [badgeImg, setBadgeImg] = useState<HTMLImageElement | null>(null);
    const [selectedType, setSelectedType] = useState(initialType);
    const [authorityIndex, setAuthorityIndex] = useState(0);

    // Update selectedType if props change (reset)
    useEffect(() => {
        if (isOpen) {
            setSelectedType(initialType);
            setAuthorityIndex(userProfile?.full_name?.includes('William') ? 1 : 0);
        }
    }, [initialType, isOpen, userProfile]);


    // Preload badge image
    useEffect(() => {
        const loadBadge = async () => {
            try {
                const img = new Image();
                img.src = './brasao_pcsp_nova.png';
                await new Promise((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => {
                        img.src = './brasao_pcsp_colorido.png';
                        img.onload = () => resolve(true);
                        img.onerror = () => resolve(false);
                    };
                });
                setBadgeImg(img);
            } catch (e) {
                console.error("Erro ao pré-carregar brasão", e);
            }
        };
        loadBadge();
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setStep('input');
            setGeneratedText('');
            setOfficeNumber('');
        }
    }, [isOpen]);

    const generateTextForType = useCallback((type: 'ifood' | 'uber' | '99', office: string, authIndex: number) => {
        const auth = AUTHORITIES[authIndex];
        const indent = "                "; // Same as old indent
        const label = type === 'ifood' ? 'IFOOD' : type === 'uber' ? 'UBER' : '99';

        return `Ofício: ${office}
Referência: PROC. Nº ${warrant.number}
Natureza: Solicitação de Dados.

Jacareí, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.

ILMO. SENHOR RESPONSÁVEL,

${indent}Com a finalidade de instruir investigação policial em trâmite nesta unidade, solicito, respeitosamente, a gentileza de verificar se o indivíduo abaixo relacionado encontra-se cadastrado como usuário ou entregador da plataforma ${label}.

${indent}Em caso positivo, requer-se o envio das informações cadastrais fornecidas para habilitação na plataforma, incluindo, se disponíveis, nome completo, endereço(s), número(s) de telefone, e-mail(s) e demais dados vinculados à respectiva conta.

${indent}As informações devem ser encaminhadas ao e-mail institucional do policial responsável pela investigação:

${indent}${auth.email}
${indent}${auth.name} – Polícia Civil do Estado de São Paulo

Pessoa de interesse para a investigação:
${warrant.name.toUpperCase()} / CPF/RG: ${warrant.cpf || warrant.rg || 'N/I'}

${indent}Aproveito a oportunidade para renovar meus votos de elevada estima e consideração.

Atenciosamente,

${auth.name}
${auth.title}`;
    }, [warrant]);

    const handleGenerate = () => {
        if (!officeNumber.trim()) {
            toast.error("Número do ofício obrigatório.");
            return;
        }

        setStep('processing');
        setIsProcessing(true);

        setTimeout(() => {
            const text = generateTextForType(selectedType, officeNumber, authorityIndex);
            setGeneratedText(text);
            setStep('result');
            setIsProcessing(false);
        }, 300);
    };

    // When switching types or authority in result mode, regenerate text immediately
    const handleTypeSwitch = (newType: 'ifood' | 'uber' | '99') => {
        setSelectedType(newType);
        if (step === 'result') {
            const text = generateTextForType(newType, officeNumber, authorityIndex);
            setGeneratedText(text);
            toast.success(`Modelo alterado para ${newType.toUpperCase()}`);
        }
    };

    const handleAuthoritySwitch = (index: number) => {
        setAuthorityIndex(index);
        if (step === 'result') {
            const text = generateTextForType(selectedType, officeNumber, index);
            setGeneratedText(text);
            toast.success(`Autoridade alterada para ${AUTHORITIES[index].name.split(' ')[0]}`);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        toast.success("Texto copiado!");
    };

    const handleDownloadPDF = async () => {
        if (!generatedText) return;

        const auth = AUTHORITIES[authorityIndex];
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);

        // --- HEADER FUNCTION ---
        const addHeader = (pdf: jsPDF) => {
            let y = 10;
            if (badgeImg) {
                const imgProps = pdf.getImageProperties(badgeImg);
                const badgeH = 26;
                const badgeW = (imgProps.width * badgeH) / imgProps.height;
                pdf.addImage(badgeImg, 'PNG', margin, y, badgeW, badgeH);
            }
            const textX = margin + 32;
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
            const barY = lineY + 2;
            pdf.setFillColor(200, 200, 200);
            pdf.rect(margin, barY, maxLineWidth, 6, 'F');
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.1);
            pdf.rect(margin, barY, maxLineWidth, 6, 'S');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text("OFÍCIO", pageWidth / 2, barY + 4.2, { align: 'center' });
            return barY + 10;
        };

        // --- FOOTER FUNCTION ---
        const addFooter = (pdf: jsPDF, pageNum: number, totalPages: number) => {
            const footerY = pageHeight - 15;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);
            const addr1 = "Rua Moisés Ruston, 370, Parque Itamaraty, Jacareí-SP, CEP-12.307-260";
            const today = new Date();
            const dateStr = `Data (${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })})`;
            const pageStr = `Página ${pageNum} de ${totalPages}`;
            const dividerX = pageWidth - margin - 35;
            pdf.setDrawColor(0);
            pdf.line(dividerX, footerY - 2, dividerX, footerY + 8);
            pdf.text(addr1, dividerX - 5, footerY, { align: 'right' });
            const phonePart = "Tel-12-3951-1000 - E-mail - ";
            const emailPart = "dig.jacarei@policiacivil.sp.gov.br";
            const fullContactWidth = pdf.getTextWidth(phonePart + emailPart);
            const contactEndX = dividerX - 5;
            const contactStartX = contactEndX - fullContactWidth;
            pdf.text(phonePart, contactStartX, footerY + 4);
            pdf.setTextColor(0, 0, 255);
            pdf.text(emailPart, contactStartX + pdf.getTextWidth(phonePart), footerY + 4);
            pdf.setTextColor(0, 0, 0);
            pdf.text(dateStr, dividerX + 5, footerY);
            pdf.text(pageStr, dividerX + 5, footerY + 4);
        };

        // --- CONTENT GENERATION ---
        doc.setFont('times', 'normal');
        let y = 10;
        y = addHeader(doc);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        const lines = generatedText.split('\n');
        lines.forEach((line) => {
            if (y > pageHeight - 65) {
                doc.addPage();
                y = addHeader(doc) + 8;
            }
            if (line.trim() === '') {
                y += 5;
            } else {
                const upperLine = line.toUpperCase().trim();
                const isImportant =
                    upperLine.startsWith("OFÍCIO:") ||
                    upperLine.startsWith("REFERÊNCIA:") ||
                    upperLine.startsWith("NATUREZA:") ||
                    upperLine.startsWith("PESSOA DE INTERESSE") ||
                    (warrant.name && upperLine.includes(warrant.name.toUpperCase()) && upperLine.includes('CPF')) ||
                    upperLine.startsWith("EM CASO POSITIVO");

                doc.setFont('helvetica', isImportant ? 'bold' : 'normal');

                const splitLine = doc.splitTextToSize(line, maxLineWidth);
                doc.text(splitLine, margin, y);
                y += (splitLine.length * 5) + 2;
            }
        });

        // Footer Logic
        const footerStart = pageHeight - 15;
        const addresseeY = footerStart - 15;
        const signatureNameY = addresseeY - 25;
        const signatureTitleY = signatureNameY + 5;

        if (y > signatureNameY - 10) {
            doc.addPage();
            addHeader(doc);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(auth.name, pageWidth / 2, signatureNameY, { align: 'center' });
        doc.text(auth.title, pageWidth / 2, signatureTitleY, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text("Ao Ilustríssimo Senhor Responsável", margin, addresseeY);
        doc.setFont('helvetica', 'bold');

        let companyName = 'iFood';
        if (selectedType === 'uber') companyName = 'UBER';
        if (selectedType === '99') companyName = '99';
        doc.text(`Empresa ${companyName}.`, margin, addresseeY + 5);

        const totalPages = (doc as any).internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(doc, i, totalPages);
        }

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Oficio_${selectedType.toUpperCase()}_${officeNumber}.pdf`, { type: 'application/pdf' });

        let filenameType = 'IFood';
        if (selectedType === 'uber') filenameType = 'Uber';
        if (selectedType === '99') filenameType = '99';
        doc.save(`Oficio_${filenameType}_${officeNumber}_${warrant.name.replace(/\s+/g, '_')}.pdf`);

        const toastId = toast.loading("Salvando cópia no prontuário...");
        try {
            const cleanOffice = officeNumber.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `attachments/ifood/${warrant.id}/${Date.now()}_Oficio_${cleanOffice}.pdf`;
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
            <div className="bg-surface-light dark:bg-slate-900 border border-border-light dark:border-slate-700 w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative flex items-center justify-between p-4 border-b border-border-light dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">

                    {/* Left: Title */}
                    <div className="flex items-center gap-3 z-10 w-1/3">
                        <div className={`p-2 rounded-lg border ${selectedType === 'uber' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' :
                            selectedType === '99' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                                'bg-red-500/10 border-red-500/20 text-red-500'
                            }`}>
                            {selectedType === 'uber' ? <Car className="w-6 h-6" /> : selectedType === '99' ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-light dark:text-slate-100 uppercase">Ofício {selectedType.toUpperCase()}</h2>
                            <p className="text-xs text-text-secondary-light dark:text-slate-400">Geração de Documento Oficial</p>
                        </div>
                    </div>

                    {/* Center: Platform Switcher Buttons (Text Based) */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex gap-2 z-0">
                        <button
                            onClick={() => handleTypeSwitch('ifood')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedType === 'ifood' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 scale-105' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            iFood
                        </button>
                        <button
                            onClick={() => handleTypeSwitch('uber')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedType === 'uber' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20 scale-105' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Uber
                        </button>
                        <button
                            onClick={() => handleTypeSwitch('99')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedType === '99' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20 scale-105' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            99
                        </button>
                    </div>

                    {/* Right: Close */}
                    <div className="z-10 w-1/3 flex justify-end">
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col p-6 gap-4">

                    {step === 'input' && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                <Hash size={40} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-text-light dark:text-white mb-2">Número do Ofício</h3>
                                <p className="text-text-secondary-light dark:text-slate-400 text-sm">Informe o número sequencial para o documento.</p>
                            </div>
                            <div className="w-full max-w-xs scale-110">
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                    placeholder="Ex: 026"
                                    value={officeNumber}
                                    onChange={(e) => setOfficeNumber(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                />
                            </div>

                            {/* Authority Selector */}
                            <div className="w-full max-w-md space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center block">Autoridade Signatária:</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AUTHORITIES.map((auth, idx) => (
                                        <button
                                            key={auth.name}
                                            onClick={() => setAuthorityIndex(idx)}
                                            className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${authorityIndex === idx ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30'}`}
                                        >
                                            {auth.name.split(' ')[0]} {auth.name.split(' ').slice(-1)}
                                        </button>
                                    ))}
                                </div>
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
                            <h3 className="text-xl font-bold text-text-light dark:text-white uppercase tracking-tighter">Gerando Minuta...</h3>
                            <p className="text-text-secondary-light dark:text-slate-400 mt-2 max-w-sm text-sm">
                                Substituindo dados de {warrant.name} no modelo {selectedType.toUpperCase()} nº {officeNumber}.
                            </p>
                        </div>
                    )}

                    {step === 'result' && (
                        <>
                            <div className="flex-1 relative flex flex-col overflow-hidden">
                                <textarea
                                    className="flex-1 w-full bg-white text-slate-900 p-8 rounded-lg shadow-inner overflow-y-auto font-serif whitespace-pre-wrap leading-relaxed border-4 border-slate-200 text-sm md:text-base selection:bg-indigo-100 animate-in fade-in zoom-in-95 resize-none focus:outline-none focus:border-indigo-400 transition-colors"
                                    value={generatedText}
                                    onChange={(e) => setGeneratedText(e.target.value)}
                                />

                                {/* Quick Switch Authority in Result Mode */}
                                <div className="absolute top-4 right-4 flex gap-1">
                                    {AUTHORITIES.map((auth, idx) => (
                                        <button
                                            key={auth.name}
                                            onClick={() => handleAuthoritySwitch(idx)}
                                            className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-tighter transition-all ${authorityIndex === idx ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Dr. {auth.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 backdrop-blur">
                                <p className="text-xs text-text-secondary-light dark:text-slate-400 font-medium italic">Edite o texto acima conforme necessário.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="px-6 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
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
