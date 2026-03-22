import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SimulationOutput, SimulationParams } from "./monteCarloEngine";
import type { ProjectHistoricalData } from "@/hooks/useProjectionData";

function sanitize(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAD6}]/gu, "")
    .replace(/[^\x00-\x7F\u00C0-\u00FF\u0100-\u017F]/g, "")
    .replace(/—/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export function exportProjectionPDF(
  simulation: SimulationOutput,
  params: SimulationParams,
  historicalData: ProjectHistoricalData[],
  aiRecommendation: string | null
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const periodLabel = `${params.projectionDays} dias`;
  const projectNames = historicalData.map(d => d.projectName).join(", ");

  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Projecao Avancada - Simulacao Monte Carlo", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Gerado em: ${dateStr} as ${timeStr} | Periodo: ${periodLabel}`, 14, y);
  y += 5;
  doc.text(`Projetos: ${sanitize(projectNames)}`, 14, y);
  y += 5;
  doc.text(`Iteracoes: 2.000 | Var. Preco: +/-${(params.priceVariation * 100).toFixed(0)}% | Var. Demanda: +/-${(params.demandVariation * 100).toFixed(0)}%`, 14, y);
  y += 8;
  doc.setTextColor(0);

  // Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo da Simulacao", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Metrica", "Valor"]],
    body: [
      ["Receita Media", fmt(simulation.summary.avgRevenue)],
      ["Lucro Medio", fmt(simulation.summary.avgProfit)],
      ["ROI Medio", `${simulation.summary.avgROI.toFixed(1)}%`],
      ["Prob. Sucesso", `${simulation.summary.successProbability.toFixed(1)}%`],
      ["Break-even Medio", `${simulation.summary.avgBreakEvenDays.toFixed(0)} dias`],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Scenarios
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cenarios", 14, y);
  y += 6;

  const scenarioRows = Object.values(simulation.scenarios).map(s => [
    sanitize(s.label),
    fmt(s.revenue),
    fmt(s.profit),
    `${s.sales}`,
    `${s.roi.toFixed(1)}%`,
    `${s.probability}%`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Cenario", "Receita", "Lucro", "Vendas", "ROI", "Prob."]],
    body: scenarioRows,
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Sensitivity
  if (simulation.sensitivityMatrix.length > 0) {
    if (y > 230) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Analise de Sensibilidade", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Variavel", "Impacto Receita", "Impacto Lucro"]],
      body: simulation.sensitivityMatrix.map(s => [
        sanitize(s.variable),
        `${s.impactOnRevenue >= 0 ? "+" : ""}${s.impactOnRevenue.toFixed(1)}%`,
        `${s.impactOnProfit >= 0 ? "+" : ""}${s.impactOnProfit.toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Historical Data
  if (historicalData.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dados Historicos", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Projeto", "Receita", "Vendas", "Ticket", "CPA", "Reembolso", "Conv."]],
      body: historicalData.map(d => [
        sanitize(d.projectName),
        fmt(d.totalRevenue),
        `${d.totalSales}`,
        fmt(d.avgTicket),
        fmt(d.avgCPA),
        `${(d.refundRate * 100).toFixed(1)}%`,
        `${(d.conversionRate * 100).toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // AI Recommendation
  if (aiRecommendation) {
    if (y > 200) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Recomendacao Estrategica IA", 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(sanitize(aiRecommendation), pageWidth - 28);
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 15; }
      doc.text(line, 14, y);
      y += 4.5;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`AGMetrics - Projecao Avancada | Pagina ${i}/${totalPages}`, 14, 290);
    doc.text(dateStr, pageWidth - 30, 290);
  }

  const fileName = `projecao_${params.projectionDays}d_${now.toISOString().slice(0, 10)}_${now.toISOString().slice(11, 16).replace(":", "h")}.pdf`;
  doc.save(fileName);
}
