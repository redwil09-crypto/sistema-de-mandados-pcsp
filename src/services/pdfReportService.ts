
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
            doc.setFont('helvetica', 'normal');
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

                doc.setFont('helvetica', 'normal');
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

        drawSection("Análise e Observações", intelFields);

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
                const dateStr = new Date(h.date).toLocaleDateString('pt-BR');
                const header = `${dateStr} - [${h.type.toUpperCase()}]`;
                const notes = h.notes || "-";
                const splitNotes = doc.splitTextToSize(notes, contentWidth - 5);

                if (y + (splitNotes.length * 5) + 10 > pageHeight - 20) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text(header, margin, y); y += 5;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
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
