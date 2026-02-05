
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
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // --- THEME COLORS ---
        const COLORS = {
            PRIMARY: [15, 23, 42] as [number, number, number],    // Slate 900
            SECONDARY: [51, 65, 85] as [number, number, number],  // Slate 700
            ACCENT: [37, 99, 235] as [number, number, number],   // Blue 600
            BORDER: [226, 232, 240] as [number, number, number],  // Slate 200
            BG_LIGHT: [248, 250, 252] as [number, number, number], // Slate 50
            WHITE: [255, 255, 255] as [number, number, number],
            TEXT: [30, 41, 59] as [number, number, number],      // Slate 800
            RISK: {
                HIGH: [225, 29, 72] as [number, number, number],    // Rose 600
                MEDIUM: [245, 158, 11] as [number, number, number],  // Amber 500
                LOW: [16, 185, 129] as [number, number, number],     // Emerald 500
                NORMAL: [71, 85, 105] as [number, number, number],   // Slate 600
            }
        };

        let y = 15;

        // --- HELPER: DRAW SECTION HEADER ---
        const drawSectionHeader = (title: string) => {
            if (y > pageHeight - 30) {
                doc.addPage();
                y = 15;
            }
            doc.setFillColor(...COLORS.PRIMARY);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...COLORS.WHITE);
            doc.text(title.toUpperCase(), margin + 3, y + 5.5);
            y += 12;
            doc.setTextColor(...COLORS.TEXT);
        };

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
            const badgeH = 22;
            const badgeW = (imgProps.width * badgeH) / imgProps.height;

            doc.addImage(badgePC, 'PNG', margin, y, badgeW, badgeH);

            const textX = margin + badgeW + 8;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.SECONDARY);

            const headerLines = [
                "GOVERNO DO ESTADO DE SÃO PAULO",
                "SECRETARIA DA SEGURANÇA PÚBLICA",
                "POLÍCIA CIVIL DO ESTADO DE SÃO PAULO",
                "DEINTER 1 - SÃO JOSÉ DOS CAMPOS",
                "SECCIONAL DE JACAREÍ - DIG"
            ];

            headerLines.forEach((line, index) => {
                doc.text(line, textX, y + 3 + (index * 4));
            });

            // --- TITLE ON THE RIGHT (AS REQUESTED TO REVERT) ---
            doc.setFontSize(16);
            doc.setTextColor(...COLORS.PRIMARY);
            doc.text("DOSSIÊ OPERACIONAL TÁTICO", pageWidth - margin, y + 10, { align: 'right' });

            doc.setFontSize(9);
            doc.setTextColor(...COLORS.SECONDARY);
            doc.text(`REF: ${data.number}`, pageWidth - margin, y + 15, { align: 'right' });

            doc.setDrawColor(...COLORS.BORDER);
            doc.setLineWidth(0.1);
            doc.line(margin, y + badgeH + 5, pageWidth - margin, y + badgeH + 5);
            y += badgeH + 12;

        } catch (e) {
            console.error("Header error", e);
            y += 30;
        }

        // --- HERO SECTION (PHOTO & RISK) ---
        const photoW = 45;
        const photoH = 55;

        // Photo Box
        doc.setDrawColor(...COLORS.PRIMARY);
        doc.setLineWidth(0.5);
        doc.rect(margin, y, photoW, photoH);

        try {
            const photoUrl = data.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0f172a&color=fff&bold=true`;
            const img = new Image();
            img.src = photoUrl;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            doc.addImage(img, 'JPEG', margin + 0.5, y + 0.5, photoW - 1, photoH - 1);
        } catch (e) {
            doc.setFontSize(8);
            doc.text("IMAGEM INDISPONÍVEL", margin + photoW / 2, y + photoH / 2, { align: 'center' });
        }

        const infoX = margin + photoW + 10;
        let infoY = y + 5;

        // Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...COLORS.PRIMARY);
        const nameLines = doc.splitTextToSize(data.name.toUpperCase(), contentWidth - photoW - 15);
        doc.text(nameLines, infoX, infoY);
        infoY += (nameLines.length * 8);

        // Status & Risk Badges
        let badgeX = infoX;

        // Status Badge
        const statusColor = data.status === 'CUMPRIDO' ? COLORS.RISK.LOW : COLORS.RISK.HIGH;
        doc.setFillColor(...statusColor);

        // Dynamic width for regime text
        const regimeText = (data.regime || 'N/A').toUpperCase();
        const regimeWidth = Math.max(35, doc.getTextWidth(regimeText) + 10);

        doc.roundedRect(badgeX, infoY, regimeWidth, 6, 1, 1, 'F');
        doc.setTextColor(...COLORS.WHITE);
        doc.setFontSize(8);
        doc.text(regimeText, badgeX + (regimeWidth / 2), infoY + 4.2, { align: 'center' });
        badgeX += regimeWidth + 5;

        // Tactical Intelligence Parsing for Risk
        let riskLevel = 'NORMAL';
        let riskColor = COLORS.RISK.NORMAL;
        try {
            if (data.tacticalSummary) {
                const intel = JSON.parse(data.tacticalSummary || '{}');
                riskLevel = (intel.risk || 'NORMAL').toUpperCase();
                if (riskLevel.includes('ALTO')) riskColor = COLORS.RISK.HIGH;
                else if (riskLevel.includes('MÉDIO') || riskLevel.includes('MEDIO')) riskColor = COLORS.RISK.MEDIUM;
                else if (riskLevel.includes('BAIXO')) riskColor = COLORS.RISK.LOW;
            }
        } catch (e) { }

        doc.setFillColor(...riskColor);
        doc.roundedRect(badgeX, infoY, 45, 6, 1, 1, 'F');
        doc.setTextColor(...COLORS.WHITE);
        doc.text(`RISCO: ${riskLevel}`, badgeX + 22.5, infoY + 4.2, { align: 'center' });

        infoY += 12;
        doc.setTextColor(...COLORS.TEXT);

        // Main Identifiers
        const mainSpecs = [
            ["RG", data.rg || "NÃO INFORMADO"],
            ["CPF", data.cpf || "NÃO INFORMADO"],
            ["TIPO", data.type || "N/A"],
            ["LOCALIZAÇÃO", data.location || "NÃO INFORMADO"]
        ];

        doc.setFontSize(9);
        mainSpecs.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.SECONDARY);
            doc.text(`${label}:`, infoX, infoY);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.PRIMARY);
            doc.text(String(value).toUpperCase(), infoX + 30, infoY);
            infoY += 6;
        });

        y += photoH + 5;

        // --- DATA SECTIONS ---
        const drawFields = (fields: [string, string][]) => {
            fields.forEach(([label, value], idx) => {
                const val = value || "-";
                const splitVal = doc.splitTextToSize(val, contentWidth - 55);

                if (y + (splitVal.length * 5) > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                // Zebra stripping
                if (idx % 2 === 0) {
                    doc.setFillColor(...COLORS.BG_LIGHT);
                    doc.rect(margin, y - 4, contentWidth, (splitVal.length * 5) + 2, 'F');
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...COLORS.SECONDARY);
                doc.text(label.toUpperCase(), margin + 2, y);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(...COLORS.TEXT);
                doc.text(splitVal, margin + 50, y);
                y += (splitVal.length * 5) + 2;
            });
        };

        drawSectionHeader("Dados Processuais e Criminais");
        drawFields([
            ["Mandado Nº", data.number],
            ["Infração Penal", data.crime || "NÃO ESPECIFICADO"],
            ["Regime Prisional", data.regime || "N/A"],
            ["Data de Expedição", formatDate(data.issueDate)],
            ["Data de Validade", formatDate(data.expirationDate)],
            ["Órgão Expedidor", data.issuingCourt || "-"]
        ]);
        y += 5;

        drawSectionHeader("Análise de Inteligência Tática");
        const intelRows: [string, string][] = [
            ["Controle iFood", data.ifoodNumber || "-"],
            ["Vínculos Identificados", data.ifoodResult || "-"],
            ["Observações DIG", data.observation || data.description || "-"]
        ];

        if (aiTimeSuggestion) {
            intelRows.push(["Janela Operacional", aiTimeSuggestion.suggestion]);
            intelRows.push(["Fundamentação IA", aiTimeSuggestion.reason]);
        }

        // Tactical Summary Expansion
        try {
            if (data.tacticalSummary) {
                const intel = JSON.parse(data.tacticalSummary || '{}');
                if (intel.entities?.length) {
                    intelRows.push(["Alvos Relacionados", intel.entities.map((e: any) => `${e.name} (${e.role})`).join('; ')]);
                }
                if (intel.locations?.length) {
                    intelRows.push(["Pontos de Interesse", intel.locations.map((l: any) => `${l.address}`).join(' | ')]);
                }
            }
        } catch (e) { }

        drawFields(intelRows);
        y += 5;

        // --- ACTION PLAN (Distinct Styling) ---
        try {
            if (data.tacticalSummary) {
                const intel = JSON.parse(data.tacticalSummary || '{}');
                if (intel.checklist?.length) {
                    drawSectionHeader("Plano de Ação e Diretrizes Operacionais");
                    intel.checklist.forEach((item: any) => {
                        const taskText = `[${(item.priority || 'NORMAL').toUpperCase()}] ${item.task}`;
                        const splitTask = doc.splitTextToSize(taskText, contentWidth - 10);

                        if (y + (splitTask.length * 5) > pageHeight - 20) {
                            doc.addPage();
                            y = 20;
                        }

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.text(">", margin + 2, y);
                        doc.setFont('helvetica', 'normal');
                        doc.text(splitTask, margin + 8, y);
                        y += (splitTask.length * 5) + 2;
                    });
                    y += 5;
                }
            }
        } catch (e) { }

        // --- HISTORY ---
        if (data.diligentHistory && data.diligentHistory.length > 0) {
            drawSectionHeader("Histórico de Diligências");
            data.diligentHistory.forEach((h: any, idx: number) => {
                const d = new Date(h.date);
                const header = `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${h.type.toUpperCase()}`;
                const notes = h.notes || "-";
                const splitNotes = doc.splitTextToSize(notes, contentWidth - 10);

                if (y + (splitNotes.length * 5) + 10 > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...COLORS.ACCENT);
                doc.text(header, margin + 2, y);
                y += 5;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(...COLORS.TEXT);
                doc.text(splitNotes, margin + 5, y);
                y += (splitNotes.length * 5) + 5;
            });
        }

        // --- FOOTER & PAGINATION ---
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);

            // Footer Line
            doc.setDrawColor(...COLORS.BORDER);
            doc.setLineWidth(0.1);
            doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            const now = new Date().toLocaleString('pt-BR');
            doc.text(`GERADO EM: ${now} | SISTEMA DE INTELIGÊNCIA DIG/PCSP | DOCUMENTO RESTRITO`, margin, pageHeight - 10);
            doc.text(`PÁGINA ${i} DE ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        toast.success(`Dossiê Tático de ${data.name} gerado com sucesso!`);
        doc.save(`DOSSIÊ_TÁTICO_DIG_${data.name.replace(/\s+/g, '_').toUpperCase()}.pdf`);

        if (onUpdate) {
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `Dossie_Tatico_${Date.now()}.pdf`, { type: 'application/pdf' });
            const path = `reports/${data.id}/${Date.now()}_Dossie_Tatico.pdf`;
            const uploadedPath = await uploadFile(pdfFile, path);
            if (uploadedPath) {
                const url = getPublicUrl(uploadedPath);
                const currentAttachments = data.attachments || [];
                await onUpdate(data.id, { attachments: [...currentAttachments, url] });
            }
        }
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast.error("Falha na geração do dossiê tático.");
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
