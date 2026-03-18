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
    "O pixel AGMetrics e um script JavaScript leve que rastreia automaticamente o comportamento dos visitantes no seu site. " +
    "Ele captura page views, cliques em botoes e links, profundidade de scroll, movimentos do mouse (mapa de calor) e eventos customizados.",
    10
  );
  addSpacer();

  // ── Section 1: Basic ──
  addText("1. Pixel Basico", 13, { bold: true });
  addText("Rastreia apenas page views e parametros UTM. Use quando precisar de rastreamento minimo.", 10);
  addText("Cole antes da tag </body> em todas as paginas:", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.basicSnippet);
  addSpacer();

  // ── Section 2: Full ──
  addText("2. Pixel Completo (Recomendado)", 13, { bold: true });
  addText(
    "Rastreia page views, cliques em botoes e links, profundidade de scroll (25%, 50%, 75%, 100%) e movimentos do mouse para mapa de calor. " +
    "Tambem permite enviar eventos customizados via AGMetrics.track().",
    10
  );
  addText("Cole antes da tag </body> em TODAS as paginas do site (exceto pagina de obrigado):", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.fullSnippet);
  addSpacer();

  // ── Section 3: Checkout ──
  addText("3. Pixel de Checkout (Kiwify / Hotmart)", 13, { bold: true });
  addText(
    "Use este snippet no campo de scripts personalizados do checkout da sua plataforma de vendas. " +
    "Ele rastreia a visita ao checkout e permite eventos customizados como inicio de preenchimento.",
    10
  );
  addText("Kiwify: Produto > Configuracoes > Checkout > Scripts", 9, { color: [100, 100, 100] });
  addText("Hotmart: Produto > Editar > Checkout > Pixel de rastreamento", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.checkoutSnippet);
  addSpacer();

  // ── Section 4: Thank You ──
  addText("4. Pixel de Pagina de Obrigado / Conversao", 13, { bold: true });
  addText(
    "Use APENAS na pagina de obrigado ou confirmacao de compra. Ja inclui todo o rastreamento completo " +
    "e dispara automaticamente o evento 'thank_you_page' para medir conversoes.",
    10
  );
  addText("Cole antes da tag </body> APENAS na pagina de obrigado:", 9, { color: [100, 100, 100] });
  addSpacer(2);
  addCode(data.thankYouSnippet);
  addSpacer();

  // ── Instructions ──
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  addText("Instrucoes de Instalacao para o Webdesigner", 14, { bold: true, color: [59, 130, 246] });
  addSpacer(2);

  const steps = [
    "1. Identifique todas as paginas do site que precisam de rastreamento.",
    "2. Em TODAS as paginas (landing pages, paginas de vendas, blog, etc.), cole o snippet \"Pixel Completo\" (secao 2) imediatamente antes da tag </body>.",
    "3. Na pagina de obrigado/confirmacao de compra, substitua o snippet completo pelo snippet de \"Pagina de Obrigado\" (secao 3). NAO use os dois juntos.",
    "4. O pixel e carregado de forma assincrona e nao impacta a performance do site.",
    "5. Apos a instalacao, os dados comecam a aparecer no painel AGMetrics em ate 1 minuto.",
    "6. Para eventos customizados, SEMPRE use addEventListener ou onclick. Exemplo:",
    "   document.getElementById(\"meuBotao\").addEventListener(\"click\", function() { window.AGMetrics?.track(\"nome_evento\", { chave: \"valor\" }); });",
    "7. SEMPRE use window.AGMetrics?.track() (com ?.) em vez de AGMetrics.track() para evitar erros caso o pixel nao carregue (ex: AdBlocker).",
    "8. Teste a instalacao acessando o site e verificando no painel AGMetrics se os eventos estao sendo registrados.",
  ];

  steps.forEach((step) => {
    addText(step, 10);
    addSpacer(1);
  });

  addSpacer(4);

  // ── Important Notes ──
  addText("[!] Observacoes Importantes", 12, { bold: true, color: [220, 80, 0] });
  addSpacer(2);

  const notes = [
    "- NAO modifique o ID do projeto (pid) nos snippets - ele e unico para este projeto.",
    "- NAO coloque o snippet da pagina de obrigado em outras paginas alem da de confirmacao.",
    "- O pixel funciona com sites estaticos (HTML), WordPress, Elementor, Webflow e qualquer plataforma que permita inserir scripts customizados.",
    "- Em WordPress: use o plugin \"Insert Headers and Footers\" ou adicione no arquivo footer.php do tema.",
    "- Em Elementor: va em Configuracoes do Elementor > Custom Code > Adicione antes do </body>.",
    `- ID do Projeto: ${data.projectId}`,
  ];

  notes.forEach((note) => {
    addText(note, 9);
    addSpacer(1);
  });

  addSpacer(6);
  addText(`Documento gerado automaticamente pelo AGMetrics para o projeto "${data.projectName}".`, 8, { color: [150, 150, 150] });

  doc.save(`${data.projectName.replace(/\s+/g, "_")}_pixels_instalacao_${now.replace(/\//g, "-")}.pdf`);
}
