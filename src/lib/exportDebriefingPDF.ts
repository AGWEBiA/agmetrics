import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatPercent, formatDecimal } from "@/lib/formatters";

interface Strength {
  area: string;
  title: string;
  description: string;
  metric_highlight?: string;
}

interface Weakness {
  area: string;
  title: string;
  description: string;
  severity: string;
  how_to_fix: string;
  expected_impact: string;
}

interface ActionItem {
  priority: number;
  action: string;
  area: string;
  timeline: string;
  effort: string;
  expected_result: string;
}

interface MetricsSnapshot {
  revenue: number;
  totalInvestment: number;
  roi: number;
  roas: number;
  cpa: number;
  ticketMedio: number;
  salesCount: number;
  refundCount: number;
  refundRate: number;
  totalLeads: number;
  uniqueBuyers: number;
  repeatBuyerRate: number;
}

export interface DebriefingPDFData {
  projectName: string;
  overallScore: number;
  summary: string;
  strengths: Strength[];
  weaknesses: Weakness[];
  actionPlan: ActionItem[];
  metricsSnapshot: MetricsSnapshot;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

const areaLabels: Record<string, string> = {
  trafego: "Trafego",
  conversao: "Conversao",
  produto: "Produto",
  financeiro: "Financeiro",
  criativos: "Criativos",
  comunidade: "Comunidade",
  funil: "Funil",
  recompra: "Recompra",
};

const severityLabels: Record<string, string> = {
  critico: "[!!] Critico",
  importante: "[!] Importante",
  atencao: "[~] Atencao",
};

const timelineLabels: Record<string, string> = {
  imediato: "Imediato",
  "1_semana": "1 Semana",
  "2_semanas": "2 Semanas",
  proximo_ciclo: "Prox. Ciclo",
};

function sanitize(text: string): string {
  return (text || "")
    .replace(/[\u{1F600}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[áàâã]/g, "a").replace(/[éèê]/g, "e").replace(/[íìî]/g, "i")
    .replace(/[óòôõ]/g, "o").replace(/[úùû]/g, "u").replace(/ç/g, "c")
    .replace(/[ÁÀÂÃ]/g, "A").replace(/[ÉÈÊ]/g, "E").replace(/[ÍÌÎ]/g, "I")
    .replace(/[ÓÒÔÕ]/g, "O").replace(/[ÚÙÛ]/g, "U").replace(/Ç/g, "C");
}

export function exportDebriefingPDF(data: DebriefingPDFData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const m = 14;
  let y = 0;

  // ─── Header ───
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pw, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Debriefing Estrategico", m, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(sanitize(data.projectName), m, 33);

  doc.setFontSize(8);
  doc.setTextColor(180, 180, 200);
  doc.text(`Periodo: ${data.periodStart} a ${data.periodEnd}`, m, 41);
  doc.text(`Gerado em: ${data.generatedAt}`, m, 47);

  // Score badge
  const sc = data.overallScore;
  const scoreColor = sc >= 70 ? [34, 197, 94] : sc >= 40 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(pw - 52, 10, 38, 30, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${sc}`, pw - 33, 24, { align: "center" });
  doc.setFontSize(7);
  doc.text("SCORE", pw - 33, 33, { align: "center" });

  y = 58;

  // ─── Metrics Summary Table ───
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Metricas do Periodo", m, y);
  y += 2;

  const ms = data.metricsSnapshot;
  autoTable(doc, {
    startY: y + 3,
    head: [["Metrica", "Valor", "Metrica", "Valor"]],
    body: [
      ["Receita", formatBRL(ms.revenue), "Investimento", formatBRL(ms.totalInvestment)],
      ["ROI", formatPercent(ms.roi), "ROAS", `${formatDecimal(ms.roas)}x`],
      ["CPA", formatBRL(ms.cpa), "Ticket Medio", formatBRL(ms.ticketMedio)],
      ["Vendas", String(ms.salesCount), "Leads", String(ms.totalLeads)],
      ["Reembolsos", String(ms.refundCount), "Taxa Reembolso", formatPercent(ms.refundRate)],
      ["Compradores Unicos", String(ms.uniqueBuyers), "Recompra", formatPercent(ms.repeatBuyerRate)],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: m, right: m },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ─── Summary ───
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Resumo", m, y);
  y += 5;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(m, y, m + 30, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const sumLines = doc.splitTextToSize(sanitize(data.summary), pw - m * 2);
  doc.text(sumLines, m, y);
  y += sumLines.length * 4.2 + 8;

  // ─── Strengths ───
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94);
  doc.text("Pontos Fortes", m, y);
  y += 3;

  const strengthRows = data.strengths.map((s, i) => [
    `${i + 1}`,
    areaLabels[s.area] || s.area,
    sanitize(s.title),
    sanitize(s.description),
    sanitize(s.metric_highlight || "-"),
  ]);

  autoTable(doc, {
    startY: y + 2,
    head: [["#", "Area", "Ponto Forte", "Descricao", "Destaque"]],
    body: strengthRows,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 35 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: m, right: m },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ─── Weaknesses ───
  if (y > 200) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(239, 68, 68);
  doc.text("Pontos a Melhorar", m, y);
  y += 3;

  const weakRows = data.weaknesses.map((w, i) => [
    `${i + 1}`,
    severityLabels[w.severity] || w.severity,
    sanitize(w.title),
    sanitize(w.description),
    sanitize(w.how_to_fix),
  ]);

  autoTable(doc, {
    startY: y + 2,
    head: [["#", "Severidade", "Problema", "Descricao", "Como Corrigir"]],
    body: weakRows,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 45 },
    },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    margin: { left: m, right: m },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ─── Action Plan ───
  if (y > 200) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(99, 102, 241);
  doc.text("Plano de Acao", m, y);
  y += 3;

  const actionRows = data.actionPlan
    .sort((a, b) => a.priority - b.priority)
    .map((a) => [
      `P${a.priority}`,
      areaLabels[a.area] || a.area,
      sanitize(a.action),
      timelineLabels[a.timeline] || a.timeline,
      sanitize(a.effort),
      sanitize(a.expected_result),
    ]);

  autoTable(doc, {
    startY: y + 2,
    head: [["Prio", "Area", "Acao", "Prazo", "Esforco", "Resultado Esperado"]],
    body: actionRows,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 40 },
    },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    margin: { left: m, right: m },
  });

  // ─── Footer ───
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("AGMetrics - Debriefing Estrategico", m, 290);
    doc.text(`Pagina ${p} de ${totalPages}`, pw - m, 290, { align: "right" });
  }

  const fileName = `debriefing-${sanitize(data.projectName).replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
