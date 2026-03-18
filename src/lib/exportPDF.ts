import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatPercent, formatDecimal } from "@/lib/formatters";

interface ExportData {
  projectName: string;
  totalRevenue: number;
  grossRevenue: number;
  producerRevenue?: number;
  salesCount: number;
  avgTicket: number;
  roi: number;
  roas: number;
  margin: number;
  netProfit: number;
  netProfitProject?: number;
  netProfitProducer?: number;
  totalInvestment: number;
  totalLeads: number;
  conversionRate: number;
  productData: Array<{ name: string; count: number; revenue: number; pct: number }>;
}

export function exportDashboardPDF(data: ExportData) {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("pt-BR");

  // Title
  doc.setFontSize(20);
  doc.text(`${data.projectName} - Relatorio`, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em ${now}`, 14, 30);

  // KPIs
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text("Indicadores Principais", 14, 44);

  autoTable(doc, {
    startY: 48,
    head: [["Métrica", "Valor"]],
    body: [
      ["Receita Liquida (Produtor)", formatBRL(data.producerRevenue || data.totalRevenue)],
      ["Receita Bruta", formatBRL(data.grossRevenue)],
      ["No de Vendas", String(data.salesCount)],
      ["Ticket Medio", formatBRL(data.avgTicket)],
      ["ROI", formatPercent(data.roi)],
      ["ROAS", `${formatDecimal(data.roas)}x`],
      ["Margem Liquida", formatPercent(data.margin)],
      ["Lucro Liquido Projeto", formatBRL(data.netProfitProject || data.netProfit)],
      ["Lucro Liquido Produtor", formatBRL(data.netProfitProducer || 0)],
      ["Investimento Total", formatBRL(data.totalInvestment)],
      ["Total de Leads", String(data.totalLeads)],
      ["Conversao", formatPercent(data.conversionRate)],
    ],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Products
  if (data.productData.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    doc.setFontSize(14);
    doc.text("Vendas por Produto", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Produto", "Qty", "Receita", "%"]],
      body: data.productData.map((p) => [
        p.name,
        String(p.count),
        formatBRL(p.revenue),
        formatPercent(p.pct),
      ]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  doc.save(`${data.projectName.replace(/\s+/g, "_")}_relatorio_${now.replace(/\//g, "-")}.pdf`);
}
