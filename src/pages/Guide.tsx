import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FolderKanban,
  Plug,
  BarChart3,
  ShoppingCart,
  Settings,
  ExternalLink,
  MessageSquare,
  Target,
  Upload,
  Webhook,
  TrendingUp,
  Users,
  GitCompare,
} from "lucide-react";

const sections = [
  {
    id: "projeto",
    icon: FolderKanban,
    title: "1. Criando um Projeto",
    badge: "Início",
    content: [
      "Acesse **Projetos** no menu lateral e clique em **Novo Projeto**.",
      "Preencha o nome, descrição e selecione a **estratégia** do seu lançamento (Perpétuo, Lançamento, Lançamento Pago, Funis ou Evento Presencial).",
      "Defina as **datas** de início, fim e abertura de carrinho conforme sua estratégia.",
      "Após criar, você será redirecionado para a página de configurações do projeto.",
    ],
  },
  {
    id: "config",
    icon: Settings,
    title: "2. Configurações do Projeto",
    badge: "Essencial",
    content: [
      "Na aba **Config**, você pode editar os dados gerais do projeto a qualquer momento.",
      "Defina o **orçamento** total planejado e o **investimento manual** (valores que não vêm de plataformas de anúncios).",
      "Ative ou desative o rastreamento de **leads do Meta** e **leads do Google** conforme suas integrações.",
      "Cadastre seus **produtos** (principal e order bump) com preço e plataforma (Kiwify, Hotmart ou ambos).",
    ],
  },
  {
    id: "integracoes",
    icon: Plug,
    title: "3. Integrações",
    badge: "Dados",
    content: [
      "Acesse **Integrações** no menu do projeto para ver o status de cada conexão.",
    ],
    subsections: [
      {
        title: "Meta Ads (Facebook/Instagram)",
        steps: [
          "Vá em **Config** e adicione uma credencial Meta com o **Access Token** e **Ad Account ID**.",
          "Você pode adicionar **múltiplas contas** de anúncio por projeto.",
          "Após salvar, use o botão **Listar Campanhas** para selecionar quais campanhas rastrear.",
          "Clique em **Sincronizar Meta** para puxar os dados de investimento e métricas.",
        ],
      },
      {
        title: "Google Ads",
        steps: [
          "Em **Config**, preencha as credenciais do Google Ads: **Client ID**, **Client Secret**, **Refresh Token** e **Customer ID**.",
          "Clique em **Sincronizar Google** para importar os dados de campanhas.",
        ],
      },
      {
        title: "Kiwify (Vendas)",
        steps: [
          "Existem **duas formas** de integrar vendas da Kiwify:",
          "**Webhook (recomendado):** Copie a URL do webhook e o token gerados na Config e cole no painel da Kiwify em Configurações → Webhooks. Isso captura vendas em tempo real com dados financeiros completos.",
          "**Importação CSV:** Na aba Vendas, use o botão de importar CSV para carregar o relatório exportado da Kiwify. Aceita formato PT-BR.",
          "O sistema **evita duplicidade** automaticamente usando o ID da venda como chave única.",
        ],
      },
      {
        title: "Hotmart (Vendas)",
        steps: [
          "Configure o **webhook** da Hotmart na Config, copiando a URL e o token.",
          "No painel da Hotmart, vá em Ferramentas → Webhooks e adicione a URL.",
          "As vendas serão registradas automaticamente com status, valores e taxas.",
        ],
      },
      {
        title: "WhatsApp (Grupos)",
        steps: [
          "Para monitorar grupos de WhatsApp, configure a **Evolution API** na Config.",
          "Preencha a **URL da API**, **API Key** e **Nome da Instância**.",
          "Adicione os grupos manualmente ou sincronize via API.",
          "O sistema rastreia membros, pico histórico, saídas e taxa de engajamento.",
        ],
      },
    ],
  },
  {
    id: "metas",
    icon: Target,
    title: "4. Metas e Alertas",
    badge: "Estratégia",
    content: [
      "Na Config do projeto, defina **metas** para acompanhar seu progresso.",
      "Tipos disponíveis: **Receita**, **Vendas**, **ROI**, **Leads** e **Margem**.",
      "Cada meta pode ter período: **Diário**, **Semanal**, **Mensal** ou **Total**.",
      "O dashboard exibe o progresso em relação às metas com barras visuais e alertas.",
    ],
  },
  {
    id: "dashboard",
    icon: BarChart3,
    title: "5. Dashboard",
    badge: "Análise",
    content: [
      "O **Dashboard** é o painel principal com visão consolidada de todas as métricas.",
      "Use o **filtro de datas** no topo para analisar períodos específicos.",
      "Cards mostram: receita, investimento, ROI, vendas, leads, CPL, CPA e mais.",
      "Gráficos de evolução mostram tendências ao longo do tempo.",
      "As seções do dashboard podem ser **reordenadas** arrastando e soltando.",
      "Dados são atualizados a cada sincronização manual ou webhook recebido.",
    ],
  },
  {
    id: "vendas",
    icon: ShoppingCart,
    title: "6. Tabela de Vendas",
    badge: "Detalhes",
    content: [
      "A aba **Vendas** mostra todas as transações registradas no projeto.",
      "Filtre por **status** (aprovada, pendente, cancelada, reembolsada), **plataforma** e **período**.",
      "Veja detalhes como valor bruto, taxas da plataforma, comissões e valor líquido.",
      "Use o botão **Exportar CSV** para baixar os dados ou **Exportar PDF** para relatórios.",
      "A importação de CSV aceita formatos em português e inglês da Kiwify.",
    ],
  },
  {
    id: "comparar",
    icon: GitCompare,
    title: "7. Comparar Projetos",
    badge: "Avançado",
    content: [
      "Acesse **Comparar** no menu lateral para análise lado a lado.",
      "Selecione dois ou mais projetos para comparar métricas como receita, ROI, vendas e investimento.",
      "Útil para avaliar performance entre lançamentos diferentes.",
    ],
  },
  {
    id: "publico",
    icon: ExternalLink,
    title: "8. Dashboard Público",
    badge: "Compartilhamento",
    content: [
      "Cada projeto tem um **link público** único gerado automaticamente.",
      "Compartilhe com sua equipe ou clientes — não requer login.",
      "O dashboard público mostra métricas de performance **sem dados sensíveis** (e-mails e nomes de compradores são ocultados).",
      "Acesse o link pelo ícone de link externo no card do projeto ou no menu lateral.",
    ],
  },
  {
    id: "usuarios",
    icon: Users,
    title: "9. Gestão de Usuários",
    badge: "Admin",
    content: [
      "Apenas **administradores** têm acesso à página de Gestão de Usuários.",
      "Altere o papel de qualquer usuário entre **Admin** e **Usuário**.",
      "Admins podem remover usuários permanentemente do sistema.",
      "Não é possível remover seu próprio acesso admin por segurança.",
    ],
  },
];

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
}

export default function Guide() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7" />
          Guia de Utilização
        </h1>
        <p className="text-muted-foreground">
          Aprenda a configurar e utilizar todas as funcionalidades do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visão Geral</CardTitle>
          <CardDescription>
            O LaunchMetrics é uma plataforma de acompanhamento de lançamentos digitais.
            Ele consolida dados de anúncios (Meta e Google), vendas (Kiwify e Hotmart) e
            grupos de WhatsApp em um único dashboard com métricas em tempo real.
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-2">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-left font-semibold">{section.title}</span>
                <Badge variant="outline" className="ml-2 text-xs shrink-0">
                  {section.badge}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4 pl-8">
                <ul className="space-y-2">
                  {section.content.map((line, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }}
                    />
                  ))}
                </ul>

                {section.subsections?.map((sub, si) => (
                  <div key={si} className="space-y-2 pt-2">
                    <h4 className="text-sm font-semibold text-foreground">{sub.title}</h4>
                    <ul className="space-y-1.5 pl-4">
                      {sub.steps.map((step, j) => (
                        <li
                          key={j}
                          className="text-sm text-muted-foreground leading-relaxed list-disc"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(step) }}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
