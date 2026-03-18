import jsPDF from "jspdf";

interface PixelExportData {
  projectName: string;
  projectId: string;
  pixelUrl: string;
  basicSnippet: string;
  fullSnippet: string;
  checkoutSnippet: string;
  thankYouSnippet: string;
}

export function exportPixelPDF(data: PixelExportData) {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("pt-BR");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addText = (text: string, size: number, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(0);
    const lines = doc.splitTextToSize(text, maxWidth);
    if (y + lines.length * (size * 0.5) > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 2;
  };

  const addCode = (code: string) => {
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(code, maxWidth - 8);
    const blockHeight = lines.length * 3.5 + 8;
    if (y + blockHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y - 4, maxWidth, blockHeight, 2, 2, "F");
    doc.text(lines, margin + 4, y + 2);
    y += blockHeight + 4;
  };

  const addSpacer = (h = 6) => { y += h; };

  // ── Header ──
  addText(`${data.projectName}`, 22, { bold: true });
  addText("Guia de Instalacao dos Pixels de Rastreamento", 14, { bold: true, color: [59, 130, 246] });
  addText(`Documento gerado em ${now}`, 9, { color: [120, 120, 120] });
  addSpacer(4);

  // ── Divider ──
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Intro ──
  addText("Sobre o Pixel AGMetrics", 14, { bold: true });
  addText(
    "O pixel AGMetrics é um script JavaScript leve que rastreia automaticamente o comportamento dos visitantes no seu site. " +
    "Ele captura page views, cliques em botões e links, profundidade de scroll, movimentos do mouse (mapa de calor) e eventos customizados.",
    10
  );
  addSpacer();

  // ── Section 1: Basic ──
  addText("1. Pixel Básico", 13, { bold: true });
  addText("Rastreia apenas page views e parâmetros UTM. Use quando precisar de rastreamento mínimo.", 10);
  addText("Cole antes da tag </body> em todas as páginas:", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.basicSnippet);
  addSpacer();

  // ── Section 2: Full ──
  addText("2. Pixel Completo (Recomendado)", 13, { bold: true });
  addText(
    "Rastreia page views, cliques em botões e links, profundidade de scroll (25%, 50%, 75%, 100%) e movimentos do mouse para mapa de calor. " +
    "Também permite enviar eventos customizados via AGMetrics.track().",
    10
  );
  addText("Cole antes da tag </body> em TODAS as páginas do site (exceto página de obrigado):", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.fullSnippet);
  addSpacer();

  // ── Section 3: Checkout ──
  addText("3. Pixel de Checkout (Kiwify / Hotmart)", 13, { bold: true });
  addText(
    "Use este snippet no campo de scripts personalizados do checkout da sua plataforma de vendas. " +
    "Ele rastreia a visita ao checkout e permite eventos customizados como início de preenchimento.",
    10
  );
  addText("Kiwify: Produto → Configurações → Checkout → Scripts", 9, { color: [100, 100, 100] });
  addText("Hotmart: Produto → Editar → Checkout → Pixel de rastreamento", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.checkoutSnippet);
  addSpacer();

  // ── Section 4: Thank You ──
  addText("4. Pixel de Página de Obrigado / Conversão", 13, { bold: true });
  addText(
    "Use APENAS na página de obrigado ou confirmação de compra. Já inclui todo o rastreamento completo " +
    "e dispara automaticamente o evento 'thank_you_page' para medir conversões.",
    10
  );
  addText("Cole antes da tag </body> APENAS na página de obrigado:", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.thankYouSnippet);
  addSpacer();

  // ── Instructions ──
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  addText("Instruções de Instalação para o Webdesigner", 14, { bold: true, color: [59, 130, 246] });
  addSpacer(2);

  const steps = [
    "1. Identifique todas as páginas do site que precisam de rastreamento.",
    "2. Em TODAS as páginas (landing pages, páginas de vendas, blog, etc.), cole o snippet \"Pixel Completo\" (seção 2) imediatamente antes da tag </body>.",
    "3. Na página de obrigado/confirmação de compra, substitua o snippet completo pelo snippet de \"Página de Obrigado\" (seção 3). NÃO use os dois juntos.",
    "4. O pixel é carregado de forma assíncrona e não impacta a performance do site.",
    "5. Após a instalação, os dados começam a aparecer no painel AGMetrics em até 1 minuto.",
    "6. Para eventos customizados, SEMPRE use addEventListener ou onclick. Exemplo:",
    "   document.getElementById(\"meuBotao\").addEventListener(\"click\", function() { window.AGMetrics?.track(\"nome_evento\", { chave: \"valor\" }); });",
    "7. SEMPRE use window.AGMetrics?.track() (com ?.) em vez de AGMetrics.track() para evitar erros caso o pixel não carregue (ex: AdBlocker).",
    "8. Teste a instalação acessando o site e verificando no painel AGMetrics se os eventos estão sendo registrados.",
  ];

  steps.forEach((step) => {
    addText(step, 10);
    addSpacer(1);
  });

  addSpacer(4);

  // ── Important Notes ──
  addText("⚠️ Observações Importantes", 12, { bold: true, color: [220, 80, 0] });
  addSpacer(2);

  const notes = [
    "• NÃO modifique o ID do projeto (pid) nos snippets — ele é único para este projeto.",
    "• NÃO coloque o snippet da página de obrigado em outras páginas além da de confirmação.",
    "• O pixel funciona com sites estáticos (HTML), WordPress, Elementor, Webflow e qualquer plataforma que permita inserir scripts customizados.",
    "• Em WordPress: use o plugin \"Insert Headers and Footers\" ou adicione no arquivo footer.php do tema.",
    "• Em Elementor: vá em Configurações do Elementor > Custom Code > Adicione antes do </body>.",
    `• ID do Projeto: ${data.projectId}`,
  ];

  notes.forEach((note) => {
    addText(note, 9);
    addSpacer(1);
  });

  addSpacer(6);
  addText(`Documento gerado automaticamente pelo AGMetrics para o projeto "${data.projectName}".`, 8, { color: [150, 150, 150] });

  doc.save(`${data.projectName.replace(/\s+/g, "_")}_pixels_instalacao_${now.replace(/\//g, "-")}.pdf`);
}
