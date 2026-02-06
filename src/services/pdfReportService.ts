
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { Warrant } from '../types';
import { uploadFile, getPublicUrl } from '../supabaseStorage';
import { formatDate } from '../utils/helpers';

export const generateWarrantPDF = async (
    data: Warrant,
    onUpdate?: (id: string, updates: Partial<Warrant>) => Promise<boolean>,
    aiTimeSuggestion?: { suggestion: string; confidence: string; reason: string } | null
) => {
    if (!data) return;
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        let y = 15;

        // --- HEADER ---
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

            const imgProps = doc.getImageProperties(badgePC);
            const badgeH = 25;
            const badgeW = (imgProps.width * badgeH) / imgProps.height;

            doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            const textX = margin + badgeW + 5;
            const headerLines = [
                "SECRETARIA DA SEGURANÇA PÚBLICA",
                "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
                "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
                "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
            ];

            headerLines.forEach((line, index) => {
                doc.text(line, textX, y + 4 + (index * 4));
            });

            doc.setLineWidth(0.5);
            doc.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
            y += badgeH + 15;

        } catch (e) {
            console.error("Badge load error", e);
            y += 30;
        }

        // Title removed as requested
        // doc.text("RELATÓRIO OPERACIONAL UNIFICADO", pageWidth / 2, y, { align: 'center' });
        y += 5;

        // --- PHOTO & MAIN INFO ---
        const photoWidth = 40;
        const photoMaxHeight = 50;
        let photoHeight = 0;

        try {
            const photoUrl = data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`;
            const img = new Image();
            img.src = photoUrl;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });

            const ratio = img.naturalWidth / img.naturalHeight;
            photoHeight = photoWidth / ratio;
            if (photoHeight > photoMaxHeight) {
                photoHeight = photoMaxHeight;
                const widthByHeight = photoMaxHeight * ratio;
                if (widthByHeight <= photoWidth) {
                    doc.addImage(img, 'JPEG', margin, y, widthByHeight, photoMaxHeight);
                } else {
                    doc.addImage(img, 'JPEG', margin, y, photoWidth, photoHeight);
                }
            } else {
                doc.addImage(img, 'JPEG', margin, y, photoWidth, photoHeight);
            }
        } catch (e) {
            console.warn("Photo error", e);
            doc.rect(margin, y, photoWidth, photoMaxHeight);
            doc.setFontSize(8);
            doc.text("Sem Foto", margin + 10, y + 20);
            photoHeight = photoMaxHeight;
        }

        const infoX = margin + photoWidth + 10;
        let infoY = y + 5;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const splitName = doc.splitTextToSize(data.name.toUpperCase(), contentWidth - photoWidth - 15);
        doc.text(splitName, infoX, infoY);
        infoY += (splitName.length * 7) + 5;

        // Status
        const statusColor = data.status === 'CUMPRIDO' ? [34, 197, 94] : [239, 68, 68];
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.roundedRect(infoX, infoY - 4, 30, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text((data.status || 'EM ABERTO'), infoX + 15, infoY, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        infoY += 10;

        const rows = [
            ["RG:", data.rg || "-"],
            ["CPF:", data.cpf || "-"],
            ["Tipo:", data.type],
            ["Prioridade:", (data.tags || []).join(", ") || "Normal"]
        ];

        rows.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, infoX, infoY);
            doc.setFont('helvetica', 'bold');
            doc.text(String(value).toUpperCase(), infoX + 25, infoY);
            infoY += 5;
        });

        y = Math.max(y + photoHeight, infoY) + 10;

        const drawSection = (title: string, fields: [string, string][]) => {
            if (y > pageHeight - 30) {
                doc.addPage();
                y = 20;
            }
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, contentWidth, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(title.toUpperCase(), margin + 2, y + 4.5);
            y += 10;

            fields.forEach(([label, val]) => {
                const value = val || "-";
                const splitVal = doc.splitTextToSize(value, contentWidth - 45);

                if (y + (splitVal.length * 5) > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(label, margin, y);

                doc.setFont('helvetica', 'bold');
                doc.text(splitVal, margin + 40, y);
                y += (splitVal.length * 5) + 3;
            });
            y += 5;
        };

        drawSection("Dados Processuais", [
            ["Nº Processo:", data.number],
            ["Crime:", data.crime || "-"],
            ["Regime:", data.regime || "-"],
            ["Expedição:", formatDate(data.issueDate)],
            ["Vencimento:", formatDate(data.expirationDate)],
            ["Localização:", data.location || "-"],
        ]);

        const intelFields: [string, string][] = [
            ["Ofício iFood:", data.ifoodNumber || "-"],
            ["Resultado iFood:", data.ifoodResult || "-"],
            ["Ofício DIG:", data.digOffice || "-"],
            ["Observações:", data.observation || data.description || "-"]
        ];



        if (aiTimeSuggestion) {
            intelFields.push(["Janela Operacional:", `${aiTimeSuggestion.suggestion}`]);
            intelFields.push(["Fundamentação:", `${aiTimeSuggestion.reason}`]);
            if ((aiTimeSuggestion as any).strategy) {
                intelFields.push(["Estratégia Sugerida:", `${(aiTimeSuggestion as any).strategy}`]);
            }
        }

        // --- NEW: TACTICAL CENTER DATA ---
        try {
            if (data.tacticalSummary && data.tacticalSummary.length > 5) {
                const intel = JSON.parse(data.tacticalSummary);

                if (intel.risk) {
                    intelFields.push(["Nível de Risco:", intel.risk]);
                }

                if (intel.entities && Array.isArray(intel.entities) && intel.entities.length > 0) {
                    const entitiesText = intel.entities.map((e: any) => `${e.name} (${e.role})`).join('; ');
                    intelFields.push(["Vínculos Identificados:", entitiesText]);
                }

                if (intel.locations && Array.isArray(intel.locations) && intel.locations.length > 0) {
                    const locsText = intel.locations.map((l: any) => `${l.address} - ${l.context}`).join('\n');
                    intelFields.push(["Mapeamento Geo:", locsText]);
                }

                if (intel.checklist && Array.isArray(intel.checklist) && intel.checklist.length > 0) {
                    const checkText = intel.checklist.map((c: any) => `[${c.priority || 'NORMAL'}] ${c.task}`).join('\n');
                    intelFields.push(["Plano de Ação:", checkText]);
                }
            }
        } catch (e) {
            console.error("Error parsing tactical summary for PDF", e);
        }

        drawSection("Análise e Inteligência Tática", intelFields);

        if (data.attachments && data.attachments.length > 0) {
            const docFields: [string, string][] = data.attachments.map((at, idx) => {
                const type = at.includes('/ifoodDocs/') ? 'IFOOD' : at.includes('/reports/') ? 'RELATÓRIO' : 'ANEXO';
                const name = at.split('/').pop()?.split('_').slice(1).join('_') || `Documento ${idx + 1}`;
                return [type, name];
            });
            drawSection("Dossiê Técnico de Documentos", docFields);
        }

        if (data.diligentHistory && data.diligentHistory.length > 0) {
            if (y > pageHeight - 30) { doc.addPage(); y = 20; }
            doc.setFillColor(230, 230, 255);
            doc.rect(margin, y, contentWidth, 6, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text("HISTÓRICO DE DILIGÊNCIAS OPERACIONAIS", margin + 2, y + 4.5);
            y += 10;

            data.diligentHistory.forEach((h: any) => {
                const dateObj = new Date(h.date);
                const dateStr = dateObj.toLocaleDateString('pt-BR');
                const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const header = `${dateStr} às ${timeStr} - [${h.type.toUpperCase()}]`;
                const notes = h.notes || "-";
                const splitNotes = doc.splitTextToSize(notes, contentWidth - 5);

                if (y + (splitNotes.length * 5) + 10 > pageHeight - 20) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text(header, margin, y); y += 5;
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text(splitNotes, margin + 5, y); y += (splitNotes.length * 5) + 5;
            });
        }

        y += 20;
        if (y > pageHeight - 30) { doc.addPage(); y = 40; }
        doc.setLineWidth(0.2);
        doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text("Equipe de Capturas - DIG", pageWidth / 2, y + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text("Polícia Civil do Estado de São Paulo", pageWidth / 2, y + 9, { align: 'center' });

        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setTextColor(150, 150, 150);
            const today = new Date().toLocaleDateString('pt-BR');
            const footerY = pageHeight - 10;
            doc.text(`Gerado em: ${today} | Sistema DIG/PCSP`, margin, footerY);
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
        }

        toast.success(`Relatório Unificado de ${data.name} gerado com sucesso!`);
        doc.save(`Relatorio_Unificado_DIG_${data.name.replace(/\s+/g, '_')}.pdf`);

        if (onUpdate) {
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `Ficha_Completa_${Date.now()}.pdf`, { type: 'application/pdf' });
            const path = `reports/${data.id}/${Date.now()}_Ficha_Completa.pdf`;
            const uploadedPath = await uploadFile(pdfFile, path);
            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                const currentAttachments = data.attachments || [];
                await onUpdate(data.id, { attachments: [...currentAttachments, url] });
            }
        }
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast.error("Erro ao montar PDF.");
    }
};

export const generateIfoodOfficePDF = async (
    data: Warrant,
    onUpdate?: (id: string, updates: Partial<Warrant>) => Promise<boolean>
) => {
    if (!data) return;
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        // --- HEADER ---
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

            const imgProps = doc.getImageProperties(badgePC);
            const badgeH = 25;
            const badgeW = (imgProps.width * badgeH) / imgProps.height;

            doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            const textX = margin + badgeW + 5;
            const headerLines = [
                "SECRETARIA DA SEGURANÇA PÚBLICA",
                "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
                "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
                "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
            ];

            headerLines.forEach((line, index) => {
                doc.text(line, textX, y + 4 + (index * 4));
            });

            doc.setLineWidth(0.5);
            doc.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
            y += badgeH + 20;

        } catch (e) {
            console.error("Badge load error", e);
            y += 30;
        }

        // --- TITLE ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("OFÍCIO DE REQUISIÇÃO DE DADOS", pageWidth / 2, y, { align: 'center' });
        y += 10;

        // --- DESTINATÁRIO ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Ao: IFOOD.COM AGÊNCIA DE RESTAURANTES ONLINE S.A.", margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text("Departamento Jurídico / Compliance", margin, y);
        y += 15;

        // --- BODY ---
        doc.setFontSize(10);
        doc.text("Assunto: Requisição de Dados Cadastrais e Registros de Acesso", margin, y);
        y += 10;

        const bodyText = `Pelo presente, com fundamento na Lei 12.830/2013 e no interesse do Inquérito Policial em epígrafe, REQUISITO a Vossa Senhoria o fornecimento, no prazo improrrogável de 05 (cinco) dias, dos dados cadastrais completos (nome, CPF, telefones, e-mails, endereços de entrega cadastrados e histórico de pedidos com geolocalização se houver) vinculados ao investigado abaixo qualificado:`;
        const splitBody = doc.splitTextToSize(bodyText, pageWidth - (margin * 2));
        doc.text(splitBody, margin, y);
        y += (splitBody.length * 5) + 10;

        // --- SUBJECT DETAILS ---
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, pageWidth - (margin * 2), 35, 'F');
        doc.setFont('helvetica', 'bold');

        let detailY = y + 7;
        doc.text(`NOME: ${data.name.toUpperCase()}`, margin + 5, detailY);
        detailY += 7;
        doc.text(`RG: ${data.rg || "NÃO INFORMADO"}`, margin + 5, detailY);
        detailY += 7;
        doc.text(`CPF: ${data.cpf || "NÃO INFORMADO"}`, margin + 5, detailY);

        y += 45;

        // --- CLOSING ---
        const closingText = `As informações deverão ser encaminhadas para o e-mail oficial desta unidade (dig.jacarei@policiacivil.sp.gov.br) em formato PDF ou planilha eletrônica. 
        
Ressalto que o descumprimento injustificado desta requisição poderá acarretar a responsabilidade penal por Crime de Desobediência (art. 330 do CP), sem prejuízo de outras sanções cabíveis.`;
        const splitClosing = doc.splitTextToSize(closingText, pageWidth - (margin * 2));
        doc.setFont('helvetica', 'normal');
        doc.text(splitClosing, margin, y);
        y += 40;

        // --- DATE AND SIGNATURE ---
        const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Jacareí, ${today}.`, margin, y);
        y += 20;

        doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
        doc.setFont('helvetica', 'bold');
        doc.text("Autoridade Policial", pageWidth / 2, y + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text("Delegacia de Investigações Gerais de Jacareí", pageWidth / 2, y + 10, { align: 'center' });

        // Save
        const fileName = `Oficio_iFood_${data.name.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        toast.success("Ofício iFood gerado com sucesso!");

        if (onUpdate) {
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            const path = `ifoodDocs/${data.id}/${Date.now()}_${fileName}`;
            const uploadedPath = await uploadFile(pdfFile, path);
            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                const currentAttachments = data.attachments || [];
                await onUpdate(data.id, { attachments: [...currentAttachments, url] });
            }
        }

    } catch (error) {
        console.error("Erro ao gerar Ofício iFood:", error);
        toast.error("Erro ao gerar ofício.");
    }
};
// ...existing code...

export const generateCapturasReportPDF = async (
    data: Warrant,
    capturasData: {
        reportNumber: string;
        court: string;
        body: string;
        signer: string;
        delegate: string;
    },
    onUpdate?: (id: string, updates: Partial<Warrant>) => Promise<boolean>
) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20; // A4 standard-ish
        const contentWidth = pageWidth - (margin * 2);
        let y = 20;

        // --- HEADER (Oficial Padrão) ---
        try {
            const badgePC = new Image();
            badgePC.src = './brasao_pcsp.png'; // Tenta usar o brasão padrão primeiro

            // Fallback logic
            await new Promise((resolve) => {
                badgePC.onload = () => resolve(true);
                badgePC.onerror = () => {
                    badgePC.src = './brasao_pcsp_nova.png';
                    badgePC.onload = () => resolve(true);
                    badgePC.onerror = () => {
                        badgePC.src = './brasao_pcsp_colorido.png'; // Last resort
                        badgePC.onload = () => resolve(true);
                        badgePC.onerror = () => resolve(false);
                    }
                };
            });

            // Left Header Image
            const imgProps = doc.getImageProperties(badgePC);
            const badgeH = 25;
            const badgeW = (imgProps.width * badgeH) / imgProps.height;

            doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

        } catch (e) {
            console.error("Badge load error", e);
            y += 20;
        }

        // Header Text (Right)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        const textX = margin + 30; // Approx badge width + padding
        const headerLines = [
            "SECRETARIA DA SEGURANÇA PÚBLICA",
            "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
            "DEPARTAMENTO DE POLÍCIA JUDICIÁRIA DE SÃO PAULO INTERIOR",
            "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
            "DELEGACIA SECCIONAL DE POLÍCIA DE JACAREÍ",
            "DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ"
        ];

        headerLines.forEach((line, index) => {
            doc.text(line, textX, y + 4 + (index * 4));
        });
        y += 32;

        // Spacing reduced
        y += 2;

        // --- BLACK TITLE BAR ---
        doc.setFillColor(0, 0, 0);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text("RELATÓRIO CAPTURAS", pageWidth / 2, y + 5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 12;

        // --- METADATA (Left Aligned, Formal) ---
        doc.setFontSize(11); // Standard size matching the image

        // Relatório + Data (Same Line)
        const today = new Date();
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const dateStr = `Jacareí, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

        doc.setFont('helvetica', 'bolditalic');
        doc.text(`Relatório: ${capturasData.reportNumber || 'N/A'}`, margin, y);

        doc.setFont('helvetica', 'italic');
        doc.text(dateStr, pageWidth - margin, y, { align: 'right' });
        y += 6;

        const isMinor = data?.type?.toLowerCase().includes('menores') || data?.type?.toLowerCase().includes('adolescente') || data?.type?.toLowerCase().includes('criança');

        const metaFields = [
            { label: "Natureza:", value: data?.type || "Cumprimento de Mandado" },
            { label: "Referência:", value: `Processo nº. ${data?.number}` },
            { label: "Juízo de Direito:", value: capturasData.court },
            { label: isMinor ? "Adolescente:" : "Réu:", value: data?.name }
        ];

        metaFields.forEach(field => {
            doc.setFont('helvetica', 'bolditalic');
            const labelText = field.label + " ";
            doc.text(labelText, margin, y);

            const labelWidth = doc.getTextWidth(labelText);
            doc.setFont('helvetica', 'bolditalic');
            doc.text(field.value, margin + labelWidth, y);
            y += 6;
        });

        // Addressee
        // Addressee - Separated with more space
        y += 10;
        const addressee = "Excelentíssimo Sr. Delegado de Polícia:";
        doc.setFont('helvetica', 'bold'); // Make it bold as per standard
        doc.text(addressee, margin, y);
        y += 12;

        // --- BODY TEXT ---
        doc.setFont('times', 'normal');
        doc.setFontSize(11); // Reduced to fit A4

        const drawRichText = (text: string, x: number, initialY: number, maxWidth: number, lineHeight: number) => {
            let cursorX = x;
            let cursorY = initialY;
            let currentLine: any[] = [];
            let currentLineWidth = 0;
            let isFirstLine = true;

            // Split by bold markers
            // Example: "Texto **negrito** fim" -> ["Texto ", "**negrito**", " fim"]
            const segments = text.split(/(\*\*.*?\*\*)/g);

            segments.forEach(segment => {
                const isBold = segment.startsWith('**') && segment.endsWith('**');
                const cleanText = isBold ? segment.slice(2, -2) : segment;
                if (!cleanText) return;

                // Tokenize by whitespace to handle wrapping
                const tokens = cleanText.split(/(\s+)/);

                tokens.forEach(token => {
                    if (token === '') return;

                    doc.setFont('times', isBold ? 'bold' : 'normal');
                    const tokenWidth = doc.getTextWidth(token);
                    const isSpace = /^\s+$/.test(token);

                    // If it's a space at the start of a wrapped line (not first line), skip it
                    if (isSpace && currentLine.length === 0 && !isFirstLine) {
                        return;
                    }

                    // Check limits
                    if (currentLineWidth + tokenWidth > maxWidth && currentLine.length > 0) {
                        // Print current line
                        let printX = x;
                        currentLine.forEach(item => {
                            doc.setFont('times', item.isBold ? 'bold' : 'normal');
                            doc.text(item.text, printX, cursorY);
                            printX += item.width;
                        });

                        // New line
                        cursorY += lineHeight;

                        // Page Break Check
                        if (cursorY > pageHeight - 50) {
                            doc.addPage();
                            cursorY = 30; // Increased top margin for continuation pages
                        }

                        currentLine = [];
                        currentLineWidth = 0;
                        isFirstLine = false;

                        // If the token that caused the break was a space, skip it for the new line
                        if (isSpace) return;
                    }

                    currentLine.push({ text: token, width: tokenWidth, isBold });
                    currentLineWidth += tokenWidth;
                });
            });

            // Flush remaining buffer
            if (currentLine.length > 0) {
                let printX = x;
                currentLine.forEach(item => {
                    doc.setFont('times', item.isBold ? 'bold' : 'normal');
                    doc.text(item.text, printX, cursorY);
                    printX += item.width;
                });
                cursorY += lineHeight;
            }

            return cursorY;
        };

        const paragraphs = capturasData.body.split('\n');

        paragraphs.forEach(para => {
            const trimmedPara = para.trim();

            // Empty lines
            if (!trimmedPara) {
                y += 4;
                return;
            }

            // Indent manually (18 spaces - 3 times more than previous 6)
            const indent = "                  ";
            const fullParaText = indent + trimmedPara;

            y = drawRichText(fullParaText, margin, y, contentWidth, 6);
            y += 2; // Reduced paragraph spacing (was 6)

            // Safety check if the function itself added a page and returned a high Y? 
            if (y > pageHeight - 50) {
                doc.addPage();
                y = 30;
            }
        });

        // --- SIGNATURE BLOCK (Right Aligned) ---
        if (y > pageHeight - 60) {
            doc.addPage();
            y = 40;
        }

        const signerName = capturasData.signer || "Investigador de Polícia";

        // Position signature on the right 
        const sigX = pageWidth - margin - 40;

        doc.line(sigX - 40, y, sigX + 40, y); // Line
        y += 5;
        doc.setFont('times', 'bold');
        doc.text(signerName.toUpperCase(), sigX, y, { align: 'center' });
        y += 5;
        doc.setFont('times', 'normal');
        doc.text("Policia Civil do Estado de São Paulo", sigX, y, { align: 'center' });


        // --- FOOTER DELEGATE + BOX ---
        const boxHeight = 16;
        const bottomMargin = 15;
        const boxY = pageHeight - bottomMargin - boxHeight;

        // Delegate Block - Flushed closer to the bottom box
        const delegateBlockY = boxY - 22;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        let dY = delegateBlockY;
        doc.setFont('helvetica', 'bolditalic');
        doc.text("Excelentíssimo Doutor", margin, dY);
        dY += 5;
        doc.text(capturasData.delegate || "Delegado Titular", margin, dY);
        dY += 5;
        doc.text("Delegado de Polícia Titular", margin, dY);
        dY += 5;
        doc.text("Delegacia de Investigações Gerais de Jacareí", margin, dY);

        // Dashed Box
        (doc as any).setLineDash([1, 1], 0);
        doc.setLineWidth(0.1);
        doc.setDrawColor(100);
        doc.rect(margin, boxY, contentWidth, boxHeight);
        (doc as any).setLineDash([], 0);

        // Footer Text
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);

        const addr1 = "Rua Moisés Ruston, 370, Parque Itamaraty - Jacareí-SP - CEP. 12.307-260";
        const addr2 = "Telefone: (12) 3951-1000      E-mail: dig.jacarei@policiacivil.sp.gov.br";

        const midX = pageWidth * 0.7;
        const addrCenterX = margin + ((midX - margin) / 2);

        doc.text(addr1, addrCenterX, boxY + 6, { align: 'center' });
        doc.text(addr2, addrCenterX, boxY + 11, { align: 'center' });

        doc.line(midX, boxY + 3, midX, boxY + boxHeight - 3);

        const rightCenterX = midX + ((pageWidth - margin - midX) / 2);
        doc.text(`Data (${new Date().toLocaleDateString('pt-BR')})`, rightCenterX, boxY + 6, { align: 'center' });
        doc.text("Página 1 de 1", rightCenterX, boxY + 11, { align: 'center' });


        // --- SAVE ---
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Relatorio_Oficial_${data.name}.pdf`, { type: 'application/pdf' });

        const toastId = toast.loading("Registrando documento oficial...");

        const path = `reports/${data.id}/${Date.now()}_Relatorio_Oficial.pdf`;
        const uploadedPath = await uploadFile(pdfFile, path);

        if (uploadedPath) {
            const url = getPublicUrl(uploadedPath);
            // We can't access data.reports directly if it's outdated, so we trust onUpdate logic or current list needed?
            // Actually usually onUpdate will handle reading current state or merging.
            // But here we need to append.
            // Let's passed in current reports if possible OR assumes onUpdate handles it (usually it replaces).
            // Better: Let the caller context handle the array merge if needed, OR we fetch current?
            // Simple approach: The component passes the update function which calls context updateWarrant(id, changes).
            // Context updateWarrant usually performs a merge at DB level or Client state?
            // Looking at supabaseService updateWarrant, it just sends updates.
            // So we need to send the FULL NEW ARRAY.
            // BUT here we only have 'data' (which might be stale?).
            // Let's assume 'data.reports' passed in is relatively fresh.
            const currentReports = data.reports || [];
            if (onUpdate) {
                await onUpdate(data.id, { reports: [...currentReports, url] });
                toast.success("Documento oficial gerado e anexado.", { id: toastId });
                return true;
            }
        }

        doc.save(`Relatorio_Oficial_${data.name}.pdf`);
        return true;

    } catch (error) {
        console.error("Erro ao gerar PDF Capturas:", error);
        toast.error("Erro ao gerar Relatório.");
        return false;
    }
};
