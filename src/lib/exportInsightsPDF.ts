import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InsightForPDF {
  category: string;
  title: string;
  analysis: string;
  actions: string[];
  impact: string;
  priority: string;
  metric_reference?: string;
}

interface InsightsPDFData {
  projectName: string;
  summary: string;
  health_score: number;
  insights: InsightForPDF[];
  generatedAt: string;
}

const categoryLabels: Record<string, string> = {
  vendas: "Vendas",
  anuncios: "Anúncios",
  funil: "Funil",
  leads: "Leads",
  financeiro: "Financeiro",
  tracking: "Tracking",
};

const impactLabels: Record<string, string> = {
  alto: "[!] Alto",
  medio: "[~] Medio",
  baixo: "[ok] Baixo",
};

const priorityLabels: Record<string, string> = {
  urgente: "[!!] Urgente",
  importante: "[!] Importante",
  oportunidade: "[*] Oportunidade",
};

export function exportInsightsPDF(data: InsightsPDFData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // ─── Header ───
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Inteligência", margin, y + 2);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.projectName, margin, y + 12);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.text(`Gerado em: ${data.generatedAt}`, margin, y + 20);

  // Health score badge
  const scoreColor = data.health_score >= 70 ? [34, 197, 94] : data.health_score >= 40 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(pageWidth - 50, 10, 36, 25, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.health_score}`, pageWidth - 32, 22, { align: "center" });
  doc.setFontSize(7);
  doc.text("SAÚDE", pageWidth - 32, 29, { align: "center" });

  y = 55;

  // ─── Summary ───
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Geral", margin, y);
  y += 6;

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(data.summary, pageWidth - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.5 + 8;

  // ─── Insights Table Summary ───
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Visão Geral dos Insights", margin, y);
  y += 3;

  const tableData = data.insights.map((ins, i) => [
    `${i + 1}`,
    categoryLabels[ins.category] || ins.category,
    ins.title,
    impactLabels[ins.impact] || ins.impact,
    priorityLabels[ins.priority] || ins.priority,
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [["#", "Categoria", "Insight", "Impacto", "Prioridade"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 25 },
      4: { cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ─── Detailed Insights ───
  data.insights.forEach((ins, idx) => {
    // Check page break
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // Category + title header
    const catLabel = categoryLabels[ins.category] || ins.category;

    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 12, 2, 2, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 102, 241);
    doc.text(`${idx + 1}. [${catLabel}]`, margin + 3, y + 3);

    doc.setTextColor(30, 30, 30);
    const titleX = margin + 3 + doc.getTextWidth(`${idx + 1}. [${catLabel}] `);
    const titleMaxW = pageWidth - titleX - margin;
    const titleTrunc = doc.splitTextToSize(ins.title, titleMaxW)[0];
    doc.text(titleTrunc, titleX, y + 3);
    y += 14;

    // Impact + Priority badges
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Impacto: ${impactLabels[ins.impact] || ins.impact}  |  Prioridade: ${priorityLabels[ins.priority] || ins.priority}`, margin + 3, y);
    if (ins.metric_reference) {
      doc.text(`Métrica: ${ins.metric_reference}`, margin + 3, y + 4);
      y += 4;
    }
    y += 6;

    // Analysis
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const analysisLines = doc.splitTextToSize(ins.analysis, pageWidth - margin * 2 - 6);
    if (y + analysisLines.length * 4 > 275) { doc.addPage(); y = 20; }
    doc.text(analysisLines, margin + 3, y);
    y += analysisLines.length * 4 + 4;

    // Actions
    if (ins.actions.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text("Ações Recomendadas:", margin + 3, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      ins.actions.forEach((action) => {
        if (y > 275) { doc.addPage(); y = 20; }
        const actionLines = doc.splitTextToSize(`• ${action}`, pageWidth - margin * 2 - 10);
        doc.text(actionLines, margin + 6, y);
        y += actionLines.length * 4 + 1;
      });
    }

    y += 6;

    // Separator
    if (idx < data.insights.length - 1) {
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, y - 3, pageWidth - margin, y - 3);
    }
  });

  // ─── Footer on each page ───
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`AGMetrics - Inteligencia de Conversao`, margin, 290);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, 290, { align: "right" });
  }

  doc.save(`insights-${data.projectName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
