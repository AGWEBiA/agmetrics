import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  Package,
  DollarSign,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  MonitorSmartphone,
  Globe,
  RefreshCw,
  Shield,
  Search,
  Brain,
  Layers,
  Activity,
  Zap,
  PieChart,
  Network,
} from "lucide-react";

interface GuideSection {
  id: string;
  icon: any;
  title: string;
  badge: string;
  badgeColor?: string;
  intro?: string;
  content: string[];
  subsections?: {
    title: string;
    steps: string[];
    tip?: string;
  }[];
  tip?: string;
  warning?: string;
}

const sections: GuideSection[] = [
  {
    id: "visao-geral",
    icon: MonitorSmartphone,
    title: "Navegação do Sistema",
    badge: "Início",
    intro: "Entenda como navegar pelo AGMetrics e onde encontrar cada funcionalidade.",
    content: [
      "O **menu lateral** (barra esquerda) é seu ponto de partida. Ele mostra todas as seções disponíveis.",
      "**Projetos** → Lista todos os seus projetos. Clique em um para abrir o dashboard.",
      "**Comparar** → Compare métricas entre dois ou mais projetos lado a lado.",
      "**Guia** → Esta página que você está lendo agora.",
      "**Integrações** → Verifique o status de conexão de todas as plataformas.",
      "**Usuários** → Gerencie contas de usuários (apenas para administradores).",
      "Dentro de cada projeto, use as **abas** no topo do dashboard para alternar entre visões: Resumo, Aquisição, Vendas, Timeline, Vendas×Tracking, etc.",
    ],
    tip: "Use o **filtro de datas** no topo do dashboard para analisar períodos específicos. Em projetos de lançamento, o período é definido automaticamente pelas datas configuradas.",
  },
  {
    id: "projeto",
    icon: FolderKanban,
    title: "1. Criando um Projeto",
    badge: "Passo a Passo",
    intro: "Todo acompanhamento começa com a criação de um projeto. Siga os passos abaixo.",
    content: [
      "**Passo 1:** Clique em **Projetos** no menu lateral.",
      "**Passo 2:** Clique no botão **+ Novo Projeto** (canto superior direito).",
      "**Passo 3:** Preencha o **nome** do projeto (ex: \"Lançamento Curso XYZ - Março 2026\").",
      "**Passo 4:** Escolha a **estratégia** que melhor descreve seu modelo de vendas:",
    ],
    subsections: [
      {
        title: "Tipos de Estratégia",
        steps: [
          "**Perpétuo** → Vendas contínuas, sem data de abertura/fechamento de carrinho. Ideal para produtos que vendem o ano todo.",
          "**Lançamento** → Modelo clássico com fase de captação de leads, aquecimento e abertura de carrinho em data específica.",
          "**Lançamento Pago** → Similar ao lançamento, mas com tráfego pago direto para a página de vendas (sem fase gratuita).",
          "**Funis** → Estratégia de funil de vendas com páginas de captura, webinários ou VSLs.",
          "**Evento Presencial** → Para vendas originadas de eventos ao vivo ou presenciais.",
        ],
        tip: "A estratégia escolhida define como o sistema calcula a métrica base de conversão: **Perpétuo** usa Page Views; as demais usam **Leads**.",
      },
      {
        title: "Configurando Datas (Lançamentos)",
        steps: [
          "**Data de Início** → Quando começou a investir em anúncios/captação.",
          "**Data de Fim** → Quando o carrinho fecha.",
          "**Abertura de Carrinho** → Data exata da abertura de vendas (usado para separar fases no dashboard).",
        ],
        tip: "Para estratégias **Perpétuo**, as datas são opcionais. O sistema usa uma janela automática de 30 dias.",
      },
    ],
    tip: "Após criar o projeto, você será redirecionado para a página de **Configurações** onde poderá conectar todas as integrações.",
  },
  {
    id: "produtos",
    icon: Package,
    title: "2. Cadastrando Produtos",
    badge: "Obrigatório",
    badgeColor: "destructive",
    intro: "⚠️ Este passo é OBRIGATÓRIO antes de importar vendas. Sem produtos cadastrados, todas as vendas serão ignoradas.",
    content: [
      "**Passo 1:** Dentro do projeto, clique em **Configurações** (ícone de engrenagem).",
      "**Passo 2:** Vá até a aba **Produtos**.",
      "**Passo 3:** Clique em **Adicionar Produto**.",
      "**Passo 4:** Preencha:",
    ],
    subsections: [
      {
        title: "Campos do Produto",
        steps: [
          "**Nome** → Use **exatamente** o mesmo nome cadastrado na Kiwify ou Hotmart. Ex: \"Curso de Marketing Digital\".",
          "**Tipo** → Escolha **Principal** (produto que você quer vender) ou **Order Bump** (produto adicional oferecido no checkout).",
          "**Plataforma** → Selecione se o produto está na **Kiwify**, **Hotmart** ou **Ambas**.",
          "**Preço** → Valor em reais do produto (usado para referência).",
        ],
        tip: "O nome do produto precisa corresponder ao que aparece na plataforma de vendas. O sistema faz correspondência parcial (se o nome cadastrado estiver contido no nome da venda, funciona), mas o ideal é usar o nome exato.",
      },
    ],
    warning: "Se você tem um **Order Bump**, cadastre-o como um produto separado com tipo \"Order Bump\". Isso permite separar receita do produto principal e do bumps nos relatórios.",
  },
  {
    id: "meta-ads",
    icon: Globe,
    title: "3. Integração Meta Ads (Facebook/Instagram)",
    badge: "Anúncios",
    intro: "Conecte suas contas de anúncios do Meta para importar dados de investimento, impressões, cliques e leads.",
    content: [
      "**Passo 1:** Vá em **Configurações** → aba **Meta Ads**.",
      "**Passo 2:** Clique em **+ Adicionar Conta**.",
      "**Passo 3:** Preencha os 3 campos:",
    ],
    subsections: [
      {
        title: "Obtendo as Credenciais",
        steps: [
          "**Label** → Um nome para identificar a conta (ex: \"Conta Principal\" ou \"Conta do Cliente\").",
          "**Ad Account ID** → O ID da conta de anúncios. Encontre em business.facebook.com → Contas de Anúncio. Formato: `act_123456789`.",
          "**Access Token** → Token de acesso longo do Facebook. Gere em developers.facebook.com → Graph API Explorer. Selecione as permissões `ads_read` e `ads_management`.",
        ],
        tip: "Você pode adicionar **múltiplas contas** de anúncio no mesmo projeto. Útil quando diferentes contas de anúncio alimentam o mesmo lançamento.",
      },
      {
        title: "Selecionando Campanhas",
        steps: [
          "Após salvar as credenciais, clique em **Buscar Campanhas**.",
          "O sistema listará todas as campanhas ativas e pausadas da conta.",
          "**Marque apenas** as campanhas relacionadas ao seu projeto.",
          "Clique em **Salvar Seleção** para confirmar.",
        ],
        tip: "Se você não selecionar campanhas, o sistema importará dados de **todas** as campanhas, o que pode misturar dados de outros projetos.",
      },
      {
        title: "Sincronizando Dados",
        steps: [
          "Clique em **Sincronizar Meta** para puxar os dados manualmente.",
          "O sistema também faz **sincronização automática a cada 15 minutos**.",
          "Dados importados: investimento, impressões, cliques, CTR, CPC, CPM, leads, compras e métricas de funil.",
        ],
      },
      {
        title: "Editando uma Conta",
        steps: [
          "Para editar uma conta já cadastrada, clique no **ícone de lápis** ✏️ ao lado da conta.",
          "Você pode atualizar o Label, Ad Account ID e Access Token.",
          "Clique em **Salvar** para aplicar as alterações.",
        ],
      },
    ],
  },
  {
    id: "google-ads",
    icon: TrendingUp,
    title: "4. Integração Google Ads",
    badge: "Anúncios",
    intro: "Importe dados de campanhas do Google Ads para consolidar seu investimento total.",
    content: [
      "**Passo 1:** Vá em **Configurações** → aba **Google Ads**.",
      "**Passo 2:** Preencha as 4 credenciais necessárias:",
    ],
    subsections: [
      {
        title: "Credenciais Necessárias",
        steps: [
          "**Client ID** → Obtido no Google Cloud Console → APIs → Credenciais. Crie um OAuth 2.0 Client ID.",
          "**Client Secret** → Gerado junto com o Client ID no Google Cloud Console.",
          "**Refresh Token** → Token de atualização OAuth. Use o OAuth 2.0 Playground do Google para gerar.",
          "**Customer ID** → O ID da sua conta Google Ads. Formato: `123-456-7890` (encontre no canto superior direito do Google Ads).",
        ],
        tip: "Se você não tem acesso direto ao Google Cloud Console, peça ao seu desenvolvedor ou gestor de tráfego para gerar essas credenciais.",
      },
      {
        title: "Sincronização",
        steps: [
          "Após salvar, clique em **Sincronizar Google** para importar os dados.",
          "Dados importados: investimento, impressões, cliques, CPC, CTR, conversões e custo por conversão.",
          "A sincronização automática ocorre **a cada 15 minutos** junto com o Meta Ads.",
        ],
      },
    ],
  },
  {
    id: "kiwify",
    icon: ShoppingCart,
    title: "5. Integração Kiwify (Vendas)",
    badge: "Vendas",
    intro: "Capture vendas da Kiwify em tempo real via webhook ou importe manualmente via CSV.",
    content: [
      "Existem **duas formas** de integrar vendas da Kiwify. O webhook é recomendado para captura automática.",
    ],
    subsections: [
      {
        title: "Opção A — Webhook (Recomendado) ⭐",
        steps: [
          "**Passo 1:** Vá em **Configurações** → aba **Kiwify**.",
          "**Passo 2:** O sistema gera automaticamente uma **URL do webhook** e um **Token** de segurança.",
          "**Passo 3:** Copie a **URL** clicando no botão de copiar.",
          "**Passo 4:** Acesse o painel da **Kiwify** (dashboard.kiwify.com.br).",
          "**Passo 5:** Vá em **Configurações** → **Webhooks** → **Adicionar webhook**.",
          "**Passo 6:** Cole a URL copiada e selecione os eventos de venda.",
          "**Passo 7:** Cole o **Token** no campo de autenticação (se disponível).",
          "**Passo 8:** Salve. A partir de agora, toda venda será registrada **automaticamente** no AGMetrics.",
        ],
        tip: "O webhook captura vendas em tempo real com dados completos: valor bruto, líquido, taxas, comissões, método de pagamento e dados do comprador.",
      },
      {
        title: "Opção B — Importação CSV",
        steps: [
          "**Passo 1:** No painel da Kiwify, vá em **Vendas** → **Exportar**.",
          "**Passo 2:** Baixe o CSV com os dados de vendas.",
          "**Passo 3:** No AGMetrics, vá em **Vendas** (menu lateral) → clique em **Importar CSV**.",
          "**Passo 4:** Selecione a plataforma **Kiwify** e faça upload do arquivo.",
          "**Passo 5:** O sistema detecta automaticamente as colunas e importa.",
        ],
        tip: "O CSV da Kiwify usa vírgula como separador. O sistema aceita colunas em português (ex: \"Data de Criação\", \"Valor Líquido\").",
      },
    ],
  },
  {
    id: "hotmart",
    icon: ShoppingCart,
    title: "6. Integração Hotmart (Vendas)",
    badge: "Vendas",
    intro: "Capture vendas da Hotmart via webhook automático ou importação de CSV.",
    content: [
      "A integração com a Hotmart funciona de forma similar à Kiwify, com webhook e CSV.",
    ],
    subsections: [
      {
        title: "Opção A — Webhook (Recomendado) ⭐",
        steps: [
          "**Passo 1:** Vá em **Configurações** → aba **Hotmart**.",
          "**Passo 2:** Copie a **URL do webhook** e o **Token (Hottok)** gerados.",
          "**Passo 3:** Acesse o painel da **Hotmart** (app.hotmart.com).",
          "**Passo 4:** Vá em **Ferramentas** → **Webhooks (Notificações)** → **Adicionar**.",
          "**Passo 5:** Cole a URL do webhook no campo \"URL de Callback\".",
          "**Passo 6:** Cole o Token no campo **\"Hottok\"**.",
          "**Passo 7:** Selecione os eventos: **Compra aprovada**, **Compra cancelada**, **Compra reembolsada**.",
          "**Passo 8:** Salve. Vendas serão capturadas automaticamente.",
        ],
        tip: "O webhook da Hotmart também captura dados de tracking (UTM, SRC, SCK) quando disponíveis.",
      },
      {
        title: "Opção B — Importação CSV",
        steps: [
          "**Passo 1:** No painel da Hotmart, vá em **Vendas** → **Histórico de vendas** → **Exportar**.",
          "**Passo 2:** Baixe o CSV (formato padrão da Hotmart com separador ponto e vírgula).",
          "**Passo 3:** No AGMetrics, vá em **Vendas** → **Importar CSV**.",
          "**Passo 4:** Selecione a plataforma **Hotmart** e faça upload.",
          "**Passo 5:** O sistema detecta automaticamente o separador (;) e as colunas em português.",
        ],
        tip: "O CSV da Hotmart usa **ponto e vírgula (;)** como separador e valores no formato brasileiro (47,00). O sistema converte automaticamente.",
      },
    ],
    warning: "⚠️ **IMPORTANTE:** Antes de importar vendas (CSV ou webhook), certifique-se de que os **produtos estão cadastrados** na aba Produtos com o mesmo nome da plataforma. Vendas de produtos não cadastrados serão ignoradas.",
  },
  {
    id: "whatsapp",
    icon: MessageSquare,
    title: "7. Integração WhatsApp (Grupos)",
    badge: "Engajamento",
    intro: "Monitore o crescimento e engajamento dos seus grupos de WhatsApp.",
    content: [
      "**Passo 1:** Vá em **Configurações** → aba **WhatsApp**.",
      "**Passo 2:** Configure a **Evolution API** (necessário ter uma instância rodando).",
      "**Passo 3:** Preencha:",
    ],
    subsections: [
      {
        title: "Credenciais da Evolution API",
        steps: [
          "**URL da API** → Endereço da sua instância Evolution API (ex: `https://api.seuservidor.com`).",
          "**API Key** → Chave de autenticação da Evolution API.",
          "**Nome da Instância** → Nome da instância conectada ao WhatsApp.",
        ],
      },
      {
        title: "Gerenciando Grupos",
        steps: [
          "Após configurar, clique em **Sincronizar Grupos** para listar todos os grupos automaticamente.",
          "Você também pode **adicionar grupos manualmente** informando o nome.",
          "O sistema rastreia: **membros atuais**, **pico histórico**, **saídas** e **taxa de engajamento**.",
          "O histórico de membros é registrado a cada sincronização para gerar gráficos de evolução.",
        ],
      },
    ],
  },
  {
    id: "metas",
    icon: Target,
    title: "8. Configurando Metas",
    badge: "Estratégia",
    intro: "Defina metas para acompanhar seu progresso e receber alertas visuais no dashboard.",
    content: [
      "**Passo 1:** Vá em **Configurações** → aba **Metas**.",
      "**Passo 2:** Clique em **Adicionar Meta**.",
      "**Passo 3:** Preencha:",
    ],
    subsections: [
      {
        title: "Tipos de Meta",
        steps: [
          "**Receita** → Meta de faturamento bruto (ex: R$ 100.000,00).",
          "**Vendas** → Meta de quantidade de vendas (ex: 500 vendas).",
          "**ROI** → Meta de retorno sobre investimento em % (ex: 300%).",
          "**Leads** → Meta de captação de leads (ex: 5.000 leads).",
          "**Margem** → Meta de margem de lucro em % (ex: 50%).",
        ],
      },
      {
        title: "Períodos",
        steps: [
          "**Total** → Meta para todo o período do projeto.",
          "**Mensal** → Meta que se renova a cada mês.",
          "**Semanal** → Meta que se renova a cada semana.",
          "**Diário** → Meta que se renova a cada dia.",
        ],
        tip: "Use metas **diárias** para acompanhar lançamentos em tempo real e metas **totais** para o resultado final.",
      },
      {
        title: "Editando e Removendo Metas",
        steps: [
          "Para **editar** uma meta existente, clique no **ícone de lápis** ✏️ na tabela de metas.",
          "Para **remover**, clique no **ícone de lixeira** 🗑️.",
          "As metas são exibidas no dashboard com **barras de progresso** visuais.",
        ],
      },
    ],
    tip: "Os valores de meta usam formatação brasileira: use ponto para milhares e vírgula para decimais (ex: 100.000,00).",
  },
  {
    id: "investimentos",
    icon: DollarSign,
    title: "9. Investimentos Manuais",
    badge: "Financeiro",
    intro: "Registre investimentos que não vêm das plataformas de anúncios (influenciadores, equipe, ferramentas, etc.).",
    content: [
      "**Passo 1:** Vá em **Configurações** → aba **Investimentos**.",
      "**Passo 2:** Clique em **Adicionar Investimento**.",
      "**Passo 3:** Preencha a **data**, **valor** e uma **descrição** (opcional).",
      "**Passo 4:** O valor será somado ao investimento total do projeto, impactando o cálculo de ROI e margem.",
    ],
    tip: "Use para registrar: pagamentos de influenciadores, custos de equipe, ferramentas SaaS, design, copywriting, etc.",
  },
  {
    id: "dashboard",
    icon: BarChart3,
    title: "10. Entendendo o Dashboard",
    badge: "Análise",
    intro: "O dashboard é o coração do sistema. Aqui você acompanha tudo em tempo real.",
    content: [
      "O dashboard possui várias **abas** que organizam as métricas por categoria:",
    ],
    subsections: [
      {
        title: "Aba Resumo",
        steps: [
          "Visão consolidada com os **KPIs principais**: receita, investimento, ROI, vendas, leads e taxa de conversão.",
          "Cards de métricas com valores e indicadores visuais.",
          "**Metas** com barras de progresso (se configuradas).",
          "**Orçamento** com burn rate e projeção de gastos.",
        ],
      },
      {
        title: "Aba Aquisição",
        steps: [
          "Métricas de **tráfego e anúncios**: impressões, cliques, CTR, CPC, CPM.",
          "Dados de **funil de conversão**: views → leads → checkouts → compras.",
          "Tabela dos **Top Anúncios** com performance individual de cada criativo.",
          "Gráfico de **Funil Visual** mostrando a conversão entre etapas.",
        ],
      },
      {
        title: "Aba Vendas",
        steps: [
          "Receita **bruta** e **líquida** separadas por plataforma (Kiwify e Hotmart).",
          "Detalhamento de **taxas da plataforma**, **comissões de coprodutores** e **lucro líquido**.",
          "Comparação de performance entre Kiwify e Hotmart.",
          "Cálculo de **margem** e ticket médio por plataforma.",
        ],
      },
      {
        title: "Aba Timeline",
        steps: [
          "**Gráficos de evolução** ao longo do tempo.",
          "Acompanhe a curva de investimento, receita, vendas e ROI dia a dia.",
          "Útil para identificar **tendências** e **picos** de performance.",
        ],
      },
      {
        title: "Aba Vendas × Tracking",
        steps: [
          "Análise cruzada entre vendas e **parâmetros de rastreamento** (UTMs, SRC, SCK).",
          "Descubra quais **fontes de tráfego**, **campanhas** e **criativos** geraram mais vendas.",
          "Taxa de rastreamento: % das vendas que possuem dados de origem.",
        ],
      },
      {
        title: "Aba Demográfico",
        steps: [
          "Perfil dos compradores por **idade**, **gênero** e **localização**.",
          "Mapa do Brasil com concentração de vendas por estado.",
          "Métodos de pagamento mais utilizados (Pix, Cartão, Boleto).",
        ],
      },
    ],
    tip: "As seções do dashboard podem ser **reordenadas** arrastando e soltando. Sua preferência é salva automaticamente.",
  },
  {
    id: "vendas",
    icon: FileSpreadsheet,
    title: "11. Tabela de Vendas",
    badge: "Detalhes",
    intro: "Visualize, filtre e exporte todas as transações registradas.",
    content: [
      "**Passo 1:** Clique em **Vendas** no menu lateral.",
      "**Passo 2:** Use os filtros disponíveis:",
    ],
    subsections: [
      {
        title: "Filtros Disponíveis",
        steps: [
          "**Status** → Aprovada, Pendente, Cancelada ou Reembolsada.",
          "**Plataforma** → Kiwify ou Hotmart.",
          "**Período** → Selecione datas de início e fim.",
          "**Busca** → Pesquise por nome ou e-mail do comprador.",
        ],
      },
      {
        title: "Exportação de Dados",
        steps: [
          "**Exportar CSV** → Baixe todos os dados filtrados em formato planilha.",
          "**Exportar PDF** → Gere um relatório formatado para apresentação.",
        ],
      },
      {
        title: "Importação de CSV",
        steps: [
          "Clique em **Importar CSV** para carregar vendas manualmente.",
          "Selecione a **plataforma** (Kiwify ou Hotmart).",
          "Faça upload do arquivo CSV exportado da plataforma.",
          "O sistema detecta automaticamente o formato (vírgula ou ponto e vírgula) e colunas em português.",
          "Vendas duplicadas são ignoradas automaticamente (baseado no ID da transação).",
        ],
      },
    ],
  },
  {
    id: "publico",
    icon: ExternalLink,
    title: "12. Dashboard Público",
    badge: "Compartilhamento",
    intro: "Compartilhe métricas com sua equipe ou clientes sem necessidade de login.",
    content: [
      "Cada projeto gera automaticamente um **link público único**.",
      "**Como acessar:** Na lista de projetos, clique no **ícone de link externo** 🔗 no card do projeto.",
      "**O que mostra:** Todas as métricas de performance (receita, ROI, vendas, anúncios).",
      "**O que NÃO mostra:** Dados sensíveis como e-mails, nomes de compradores e credenciais de integração.",
      "**Segurança:** O link não é indexado por buscadores (noindex, nofollow). Apenas quem tem o link pode acessar.",
    ],
    tip: "Compartilhe o link público com coprodutores, afiliados ou clientes para dar transparência sobre os resultados sem expor dados confidenciais.",
  },
  {
    id: "comparar",
    icon: GitCompare,
    title: "13. Comparar Projetos",
    badge: "Avançado",
    intro: "Compare a performance de diferentes projetos ou lançamentos lado a lado.",
    content: [
      "**Passo 1:** Clique em **Comparar** no menu lateral.",
      "**Passo 2:** Selecione **dois ou mais projetos** para comparar.",
      "**Passo 3:** Analise as métricas lado a lado: receita, ROI, investimento, vendas, leads, CPL e CPA.",
    ],
    tip: "Útil para avaliar qual lançamento performou melhor e identificar padrões de sucesso.",
  },
  {
    id: "integracoes-status",
    icon: RefreshCw,
    title: "14. Monitoramento de Integrações",
    badge: "Status",
    intro: "Verifique se todas as conexões estão funcionando corretamente.",
    content: [
      "**Passo 1:** Clique em **Integrações** no menu lateral.",
      "**Passo 2:** O painel mostra o status de cada integração com indicadores visuais:",
      "🟢 **Conectado** → Integração ativa e funcionando.",
      "🟡 **Configuração parcial** → Faltam credenciais ou configuração.",
      "🔴 **Desconectado** → Integração não configurada.",
      "**Passo 3:** Clique em **Verificar Saúde** para testar webhooks (Kiwify e Hotmart).",
      "**Passo 4:** Veja o **timestamp da última sincronização** de cada plataforma.",
    ],
    tip: "A sincronização automática roda **a cada 15 minutos** para Meta Ads, Google Ads e WhatsApp. Vendas via webhook são capturadas **instantaneamente**.",
  },
  {
    id: "api-customizada",
    icon: Plug,
    title: "15. API Customizada",
    badge: "Integração",
    intro: "Conecte qualquer plataforma de BI, automação ou e-mail marketing via API REST personalizada.",
    content: [
      "**Passo 1:** Vá em **Configurações** → aba **API Customizada**.",
      "**Passo 2:** Preencha os campos de conexão:",
    ],
    subsections: [
      {
        title: "Configuração da API",
        steps: [
          "**Nome da API** → Um nome descritivo (ex: \"ActiveCampaign\", \"RD Station\").",
          "**Base URL** → O endereço base da API (ex: `https://api.seuservico.com/v1`).",
          "**API Key** → Chave de autenticação que será enviada no header `X-API-Key`.",
        ],
      },
      {
        title: "Endpoints Personalizados",
        steps: [
          "Você pode definir **endpoints customizados** além dos padrões.",
          "Clique em **Adicionar Endpoint** para criar um novo.",
          "Preencha o **Label** (nome de exibição) e o **Path** (caminho da API, ex: `/metrics/overview?period=30d`).",
          "Use o botão de **lixeira** para remover endpoints que não precisa.",
          "Se nenhum endpoint personalizado for definido, o sistema usa 4 padrões: overview, campaigns, contacts e automations.",
        ],
        tip: "Cada endpoint será sincronizado individualmente e os dados ficam armazenados separados por tipo no banco de dados.",
      },
      {
        title: "Sincronização",
        steps: [
          "Clique em **Sincronizar Agora** para importar os dados manualmente.",
          "A sincronização automática ocorre **a cada 15 minutos** junto com as demais integrações.",
          "O status da última sincronização de cada endpoint é exibido na interface.",
        ],
      },
    ],
    tip: "A API deve responder em formato **JSON** via método **GET**. O sistema envia a autenticação via header `X-API-Key`.",
  },
  {
    id: "pixel",
    icon: MonitorSmartphone,
    title: "16. Pixel de Tracking",
    badge: "Rastreamento",
    intro: "Instale um pixel de rastreamento nas suas páginas para capturar visitas, UTMs e eventos de comportamento.",
    content: [
      "**Passo 1:** Vá em **Pixel Analytics** no menu lateral.",
      "**Passo 2:** Copie o **código do pixel** gerado automaticamente para o seu projeto.",
      "**Passo 3:** Cole o código no **<head>** de todas as páginas que deseja rastrear (landing pages, páginas de vendas, etc.).",
    ],
    subsections: [
      {
        title: "O que o Pixel captura",
        steps: [
          "**Page Views** → Cada visita à página é registrada com URL, referrer e user agent.",
          "**UTMs** → Parâmetros utm_source, utm_medium, utm_campaign, utm_content e utm_term.",
          "**Visitor ID** → Identificador único do visitante para rastrear jornadas.",
          "**IP e Localização** → Dados de origem do visitante.",
        ],
      },
      {
        title: "Domínios Autorizados",
        steps: [
          "Configure os **domínios autorizados** onde o pixel pode operar.",
          "Apenas domínios cadastrados poderão enviar eventos de tracking.",
          "Isso evita uso indevido do seu pixel em sites não autorizados.",
        ],
      },
    ],
    tip: "O pixel funciona em qualquer página HTML. Não precisa de framework específico — basta colar o script no <head>.",
  },
  {
    id: "comportamental",
    icon: Eye,
    title: "17. Análise Comportamental",
    badge: "Avançado",
    intro: "Visualize o comportamento dos visitantes nas suas páginas com mapas de calor e métricas de engajamento.",
    content: [
      "**Passo 1:** Acesse **Análise Comportamental** no menu lateral.",
      "**Passo 2:** Selecione o projeto e a página que deseja analisar.",
      "**Passo 3:** Visualize os dados de interação dos visitantes:",
    ],
    subsections: [
      {
        title: "Métricas Disponíveis",
        steps: [
          "**Mapa de Calor** → Visualize as áreas mais clicadas/interagidas da página.",
          "**Tempo Médio na Página** → Quanto tempo os visitantes permanecem.",
          "**Taxa de Scroll** → Até onde os visitantes rolam a página.",
          "**Sessões** → Quantidade de visitas únicas.",
        ],
        tip: "Para ter dados comportamentais, é necessário ter o **Pixel de Tracking** instalado nas páginas.",
      },
    ],
  },
  {
    id: "jornada-lead",
    icon: Users,
    title: "18. Jornada do Lead",
    badge: "Funil",
    intro: "Acompanhe o caminho completo do lead: do primeiro clique no anúncio até a compra.",
    content: [
      "**Passo 1:** Acesse **Jornada do Lead** no menu lateral.",
      "**Passo 2:** O sistema cruza dados de anúncios, tracking e vendas para reconstruir a jornada.",
      "**Passo 3:** Analise cada etapa do funil:",
    ],
    subsections: [
      {
        title: "Etapas da Jornada",
        steps: [
          "**Impressão** → O lead viu o anúncio.",
          "**Clique** → Clicou no anúncio e foi para a página.",
          "**Page View** → Visitou a landing page.",
          "**Lead** → Se cadastrou (captura de e-mail, WhatsApp, etc.).",
          "**Checkout** → Iniciou o processo de compra.",
          "**Compra** → Finalizou a compra com sucesso.",
        ],
      },
      {
        title: "Análise por Fonte",
        steps: [
          "Veja quais **fontes de tráfego** (UTM Source) geram mais conversões.",
          "Compare a **taxa de conversão** entre diferentes campanhas.",
          "Identifique gargalos no funil onde leads estão sendo perdidos.",
        ],
      },
    ],
    tip: "Para dados completos de jornada, é necessário ter o **Pixel** instalado e os **webhooks** de vendas configurados.",
  },
  {
    id: "relatorios-whatsapp",
    icon: MessageSquare,
    title: "19. Relatórios via WhatsApp",
    badge: "Automação",
    intro: "Receba relatórios automáticos de performance diretamente no seu WhatsApp.",
    content: [
      "**Passo 1:** Acesse **Relatórios WhatsApp** no menu lateral.",
      "**Passo 2:** Clique em **Novo Relatório**.",
      "**Passo 3:** Configure:",
    ],
    subsections: [
      {
        title: "Configuração do Relatório",
        steps: [
          "**Nome** → Identificação do relatório (ex: \"Resumo Diário\").",
          "**Número** → Seu WhatsApp com DDI (ex: +5511999999999).",
          "**Frequência** → Diário, Semanal ou Mensal.",
          "**Horário** → A hora do dia em que o relatório será enviado.",
          "**Métricas** → Selecione quais métricas incluir (receita, vendas, ROI, investimento, etc.).",
        ],
      },
      {
        title: "Gerenciamento",
        steps: [
          "Use o **toggle** para ativar/desativar relatórios sem excluí-los.",
          "Clique em **Enviar Agora** para testar o recebimento.",
          "Edite ou exclua relatórios a qualquer momento.",
        ],
        tip: "Os relatórios são enviados via Evolution API. Certifique-se de que a integração WhatsApp está configurada no projeto.",
      },
    ],
  },
  {
    id: "orcamento",
    icon: DollarSign,
    title: "20. Orçamento e Provisionamento",
    badge: "Financeiro",
    intro: "Configure um orçamento total para o projeto e acompanhe o burn rate em tempo real.",
    content: [
      "**Passo 1:** Ao editar o projeto, defina o campo **Orçamento** com o valor total planejado.",
      "**Passo 2:** No dashboard, a seção **Orçamento** mostra:",
    ],
    subsections: [
      {
        title: "Métricas de Orçamento",
        steps: [
          "**Orçamento Total** → Valor planejado para o projeto.",
          "**Gasto Atual** → Soma de Meta Ads + Google Ads + investimentos manuais.",
          "**Saldo Restante** → Quanto ainda pode gastar.",
          "**Burn Rate** → Taxa diária média de gasto.",
          "**Projeção** → Estimativa de quando o orçamento será consumido.",
        ],
        tip: "Configure um orçamento para receber alertas visuais quando atingir 80% e 100% do valor planejado.",
      },
    ],
  },
  {
    id: "usuarios",
    icon: Shield,
    title: "21. Gestão de Usuários (Admin)",
    badge: "Admin",
    intro: "Gerencie contas de usuários e permissões. Disponível apenas para administradores.",
    content: [
      "**Passo 1:** Clique em **Usuários** no menu lateral (visível apenas para admins).",
      "**Passo 2:** Veja a lista completa de usuários cadastrados.",
      "**Funcionalidades:**",
      "• **Alterar papel** → Promova um usuário a **Admin** ou rebaixe para **Usuário**.",
      "• **Remover usuário** → Exclua permanentemente um usuário do sistema.",
      "• Admins podem ver e gerenciar **todos os projetos** de todos os usuários.",
      "• Usuários comuns só veem seus **próprios projetos**.",
    ],
    warning: "Por segurança, você **não pode remover seu próprio acesso** de administrador.",
  },
  {
    id: "roi-canal",
    icon: PieChart,
    title: "22. ROI por Canal",
    badge: "Avançado",
    intro: "Descubra o retorno real de cada canal de aquisição usando atribuição de primeiro toque e LTV completo.",
    content: [
      "**Passo 1:** No menu lateral, clique em **ROI por Canal** dentro de um projeto.",
      "**Passo 2:** O sistema identifica automaticamente a **origem de cada comprador** (primeiro lead ou primeira venda).",
      "**Passo 3:** Analise o retorno por canal com métricas detalhadas.",
    ],
    subsections: [
      {
        title: "Modelo de Atribuição",
        steps: [
          "O sistema usa **First-Touch Attribution**: 100% da receita vitalícia (LTV) é atribuída ao canal que trouxe o cliente pela primeira vez.",
          "A origem é determinada pelo **lead_event mais antigo** do comprador. Na ausência de leads, utiliza a **primeira venda**.",
          "Dados de UTM Source, UTM Campaign, SRC e SCK são combinados para identificar o canal.",
        ],
      },
      {
        title: "Métricas por Canal",
        steps: [
          "**LTV Total** → Receita vitalícia de todos os compradores originados pelo canal.",
          "**Compradores Únicos** → Quantidade de clientes atribuídos ao canal.",
          "**Compras por Cliente** → Média de recompras por comprador.",
          "**LTV Médio** → Receita média por comprador do canal.",
          "**Taxa de Retenção** → % de compradores que fizeram mais de uma compra.",
        ],
      },
      {
        title: "Tabela de Compradores",
        steps: [
          "Clique em um canal para ver o **histórico individual** de cada comprador.",
          "Visualize: primeira compra, receita total, quantidade de compras e origem exata.",
        ],
      },
    ],
    tip: "Para dados mais completos, configure o **Pixel de Tracking** e os **webhooks** de vendas. Quanto mais dados de UTM, melhor a atribuição.",
  },
  {
    id: "atribuicao-avancada",
    icon: Network,
    title: "23. Atribuição Avançada",
    badge: "Avançado",
    intro: "Compare diferentes modelos de atribuição lado a lado para entender como cada canal contribui para suas vendas.",
    content: [
      "**Passo 1:** No menu lateral, acesse **Atribuição Avançada** dentro de um projeto.",
      "**Passo 2:** O sistema calcula automaticamente 4 modelos de atribuição para os mesmos dados.",
      "**Passo 3:** Compare os resultados e tome decisões mais informadas sobre onde investir.",
    ],
    subsections: [
      {
        title: "Modelos Disponíveis",
        steps: [
          "**First-Touch** → 100% do crédito vai para o primeiro ponto de contato do comprador.",
          "**Last-Click** → 100% do crédito vai para o último ponto de contato antes da compra.",
          "**Linear** → O crédito é dividido igualmente entre todos os pontos de contato.",
          "**Time-Decay** → Mais crédito para interações mais recentes (próximas da conversão).",
        ],
        tip: "Nenhum modelo é \"certo\" sozinho. Use a comparação para ter uma visão completa. Se First-Touch e Last-Click concordam, há alta confiança no canal.",
      },
      {
        title: "Visualizações",
        steps: [
          "**Gráfico de Barras** → Compare a receita atribuída a cada canal em cada modelo.",
          "**Gráfico Radar** → Visualize a distribuição relativa dos modelos.",
          "**Cards de Resumo** → KPIs rápidos por modelo com cores distintas.",
        ],
      },
    ],
  },
  {
    id: "projecao-avancada",
    icon: TrendingUp,
    title: "24. Projeção Avançada",
    badge: "Avançado",
    intro: "Simule cenários futuros usando Monte Carlo e análise What-If para prever receita e ROI.",
    content: [
      "**Passo 1:** Acesse **Projeção Avançada** no menu lateral.",
      "**Passo 2:** Selecione os projetos e configure o horizonte de projeção (7 a 90 dias).",
      "**Passo 3:** Ajuste variações de preço e demanda para simular cenários.",
    ],
    subsections: [
      {
        title: "Motor de Simulação",
        steps: [
          "O sistema roda **simulações Monte Carlo** com milhares de iterações para gerar intervalos de confiança.",
          "São gerados 3 cenários automáticos: **Otimista**, **Realista** e **Pessimista**.",
          "A **Matriz de Sensibilidade** mostra como variações de preço e demanda afetam o resultado.",
        ],
      },
      {
        title: "Painel What-If",
        steps: [
          "Ajuste **sliders de preço e demanda** para ver o impacto em tempo real.",
          "Visualize a probabilidade de atingir diferentes metas de receita.",
          "O sistema sugere **recomendações de IA** com base nos dados históricos e simulações.",
        ],
      },
    ],
    tip: "As projeções são salvas automaticamente para consulta futura. Compare projeções anteriores com resultados reais.",
  },
  {
    id: "insights-ia",
    icon: Brain,
    title: "25. Insights de IA",
    badge: "IA",
    badgeColor: "destructive",
    intro: "Receba análises inteligentes geradas por IA com recomendações acionáveis para melhorar sua performance.",
    content: [
      "**Passo 1:** Acesse **Insights de IA** no menu lateral dentro de um projeto.",
      "**Passo 2:** Clique em **Gerar Insights** para que a IA analise seus dados.",
      "**Passo 3:** Leia o resumo executivo e os insights detalhados por categoria.",
    ],
    subsections: [
      {
        title: "O que a IA analisa",
        steps: [
          "**Saúde do Projeto** → Score de 0 a 100 baseado em métricas-chave.",
          "**Tendências** → Identifica padrões de crescimento ou queda nas vendas.",
          "**Anomalias** → Detecta dias atípicos com vendas muito acima ou abaixo da média.",
          "**Recomendações** → Sugestões concretas de ações para melhorar ROI, reduzir CPA, etc.",
        ],
      },
      {
        title: "Histórico de Insights",
        steps: [
          "Todos os insights gerados são **salvos automaticamente** com data e hora.",
          "Compare a evolução do health score ao longo do tempo.",
          "Use insights anteriores para validar se as recomendações funcionaram.",
        ],
      },
    ],
  },
  {
    id: "cohort-ltv",
    icon: Layers,
    title: "26. Cohort & LTV",
    badge: "Avançado",
    intro: "Analise a retenção e o valor vitalício dos clientes agrupados por período de aquisição.",
    content: [
      "**Passo 1:** Acesse **Cohort & LTV** no menu lateral.",
      "**Passo 2:** Visualize a tabela de cohorts com retenção e receita por período.",
      "**Passo 3:** Identifique quais cohorts (períodos de aquisição) geram mais valor ao longo do tempo.",
    ],
    subsections: [
      {
        title: "Métricas Disponíveis",
        steps: [
          "**Tabela de Cohorts** → Compradores agrupados pelo mês/semana da primeira compra.",
          "**Taxa de Retenção** → % de compradores que retornam em cada período subsequente.",
          "**LTV por Cohort** → Receita acumulada de cada grupo ao longo do tempo.",
          "**Curva de Retenção** → Gráfico visual da retenção por cohort.",
        ],
      },
    ],
    tip: "Use a análise de cohorts para entender se suas estratégias de retenção estão funcionando e para prever receita futura.",
  },
  {
    id: "alertas-anomalia",
    icon: Activity,
    title: "27. Alertas de Anomalia",
    badge: "Monitoramento",
    intro: "Receba alertas automáticos quando o sistema detecta padrões fora do normal nos seus dados.",
    content: [
      "**Passo 1:** Acesse **Alertas de Anomalia** no menu lateral.",
      "**Passo 2:** Visualize as anomalias detectadas automaticamente.",
      "**Passo 3:** Tome ações corretivas baseadas nos alertas.",
    ],
    subsections: [
      {
        title: "Tipos de Anomalias",
        steps: [
          "**Quedas bruscas** → Redução significativa de vendas, leads ou receita comparado com a média.",
          "**Picos atípicos** → Aumentos incomuns que podem indicar viralização ou erros de dados.",
          "**Desvio de ROI** → Quando o ROI cai abaixo de um limiar crítico.",
          "**Taxa de reembolso** → Quando reembolsos ultrapassam o padrão histórico.",
        ],
      },
      {
        title: "Como funciona",
        steps: [
          "O sistema calcula **desvios padrão** sobre a média móvel dos últimos dias.",
          "Anomalias com severidade **Alta** e **Crítica** geram notificações automáticas.",
          "Clique em uma anomalia para ver detalhes e dados contextuais.",
        ],
      },
    ],
  },
  {
    id: "hub-conectores",
    icon: Zap,
    title: "28. Hub de Conectores",
    badge: "Integração",
    intro: "Central para gerenciar todas as integrações e conectores disponíveis no sistema.",
    content: [
      "**Passo 1:** Acesse o **Hub de Conectores** no menu lateral.",
      "**Passo 2:** Visualize todos os conectores disponíveis e seu status de configuração.",
      "**Passo 3:** Clique em um conector para configurá-lo ou ver detalhes.",
    ],
    subsections: [
      {
        title: "Conectores Disponíveis",
        steps: [
          "**Meta Ads** → Importação de métricas de anúncios do Facebook e Instagram.",
          "**Google Ads** → Importação de métricas do Google Ads.",
          "**Kiwify** → Captura de vendas via webhook ou CSV.",
          "**Hotmart** → Captura de vendas via webhook ou CSV.",
          "**WhatsApp** → Monitoramento de grupos via Evolution API.",
          "**AGSell** → Integração com formulários e CRM AGSell.",
          "**API Customizada** → Conexão com qualquer API REST.",
        ],
      },
    ],
    tip: "O Hub de Conectores é o local central para verificar rapidamente quais integrações estão ativas e configurar novas.",
  },
  {
    id: "dashboard-custom",
    icon: BarChart3,
    title: "29. Dashboard Customizado (BI)",
    badge: "Power BI",
    intro: "Crie painéis personalizados no estilo Power BI com widgets arrastáveis e redimensionáveis.",
    content: [
      "**Passo 1:** Acesse **Dashboard Customizado** no menu lateral.",
      "**Passo 2:** Clique em **Adicionar Widget** para inserir KPIs, gráficos ou tabelas.",
      "**Passo 3:** **Arraste e redimensione** os widgets livremente no grid.",
    ],
    subsections: [
      {
        title: "Funcionalidades",
        steps: [
          "**19 tipos de widgets** disponíveis: KPIs financeiros, gráficos de linha/barra/pizza, tabelas e funis.",
          "**Múltiplas abas** → Crie painéis separados para diferentes análises.",
          "**Persistência** → Layout e posições são salvos automaticamente por projeto e usuário.",
          "**Responsivo** → Os widgets se adaptam ao tamanho da tela.",
        ],
      },
    ],
    tip: "Use o Dashboard Customizado para criar visões específicas para apresentações ou acompanhamento diário com apenas as métricas que importam.",
  },
];

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
}

function sectionMatchesSearch(section: GuideSection, query: string): boolean {
  const q = query.toLowerCase();
  if (section.title.toLowerCase().includes(q)) return true;
  if (section.intro?.toLowerCase().includes(q)) return true;
  if (section.content.some(c => c.toLowerCase().includes(q))) return true;
  if (section.subsections?.some(sub =>
    sub.title.toLowerCase().includes(q) ||
    sub.steps.some(s => s.toLowerCase().includes(q))
  )) return true;
  if (section.tip?.toLowerCase().includes(q)) return true;
  if (section.warning?.toLowerCase().includes(q)) return true;
  return false;
}

export default function Guide() {
  const [search, setSearch] = React.useState("");
  const filteredSections = search.trim()
    ? sections.filter(s => sectionMatchesSearch(s, search.trim()))
    : sections;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          Guia Completo do AGMetrics
        </h1>
        <p className="text-muted-foreground mt-1">
          Aprenda passo a passo como configurar e utilizar todas as funcionalidades do sistema
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar no guia... ex: webhook, pixel, metas"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick overview card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            O que é o AGMetrics?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            O AGMetrics é uma plataforma de <strong className="text-foreground">acompanhamento centralizado</strong> de lançamentos e projetos digitais.
            Ele consolida dados de anúncios (Meta Ads e Google Ads), vendas (Kiwify e Hotmart), grupos de WhatsApp, pixel de tracking e APIs customizadas em um único dashboard com métricas em tempo real.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="text-xs">📊 Dashboard em Tempo Real</Badge>
            <Badge variant="outline" className="text-xs">💰 Receita & ROI</Badge>
            <Badge variant="outline" className="text-xs">📈 Meta Ads & Google Ads</Badge>
            <Badge variant="outline" className="text-xs">🛒 Kiwify & Hotmart</Badge>
            <Badge variant="outline" className="text-xs">📱 WhatsApp</Badge>
            <Badge variant="outline" className="text-xs">🔗 Dashboard Público</Badge>
            <Badge variant="outline" className="text-xs">🔌 API Customizada</Badge>
            <Badge variant="outline" className="text-xs">👁️ Pixel & Tracking</Badge>
            <Badge variant="outline" className="text-xs">🗺️ Jornada do Lead</Badge>
            <Badge variant="outline" className="text-xs">🧠 Insights de IA</Badge>
            <Badge variant="outline" className="text-xs">📊 ROI por Canal</Badge>
            <Badge variant="outline" className="text-xs">🔀 Atribuição Avançada</Badge>
            <Badge variant="outline" className="text-xs">🔮 Projeção Avançada</Badge>
            <Badge variant="outline" className="text-xs">👥 Cohort & LTV</Badge>
            <Badge variant="outline" className="text-xs">⚡ Alertas de Anomalia</Badge>
            <Badge variant="outline" className="text-xs">🧩 Hub de Conectores</Badge>
            <Badge variant="outline" className="text-xs">📋 Dashboard BI</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick start checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Checklist de Configuração Rápida
          </CardTitle>
          <CardDescription>Siga estes passos na ordem para configurar seu primeiro projeto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { step: "1", text: "Criar o projeto com nome e estratégia", section: "projeto" },
              { step: "2", text: "Cadastrar os produtos (OBRIGATÓRIO para vendas)", section: "produtos" },
              { step: "3", text: "Conectar Meta Ads e/ou Google Ads", section: "meta-ads" },
              { step: "4", text: "Configurar webhook da Kiwify e/ou Hotmart", section: "kiwify" },
              { step: "5", text: "Definir metas de receita, vendas e ROI", section: "metas" },
              { step: "6", text: "Acompanhar o dashboard! 🚀", section: "dashboard" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {item.step}
                </span>
                <span className="text-muted-foreground">{item.text}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* All sections */}
      {filteredSections.length === 0 && search.trim() && (
        <p className="text-center text-muted-foreground py-8">Nenhuma seção encontrada para "{search}"</p>
      )}
      <Accordion type="multiple" defaultValue={search.trim() ? filteredSections.map(s => s.id) : []} key={search} className="space-y-2">
        {filteredSections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-2 sm:px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <section.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-left font-semibold text-sm sm:text-base truncate">{section.title}</span>
                <Badge
                  variant={section.badgeColor === "destructive" ? "destructive" : "outline"}
                  className="ml-1 text-[10px] sm:text-xs shrink-0"
                >
                  {section.badge}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4 pl-2 sm:pl-8">
                {/* Intro */}
                {section.intro && (
                  <p
                    className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(section.intro) }}
                  />
                )}

                {/* Main content */}
                <ul className="space-y-2">
                  {section.content.map((line, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }}
                    />
                  ))}
                </ul>

                {/* Subsections */}
                {section.subsections?.map((sub, si) => (
                  <div key={si} className="space-y-2 pt-2 border-l-2 border-muted pl-4">
                    <h4 className="text-sm font-semibold text-foreground">{sub.title}</h4>
                    <ul className="space-y-1.5">
                      {sub.steps.map((step, j) => (
                        <li
                          key={j}
                          className="text-sm text-muted-foreground leading-relaxed list-disc ml-4"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(step) }}
                        />
                      ))}
                    </ul>
                    {sub.tip && (
                      <div className="flex gap-2 mt-2 p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p
                          className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(sub.tip) }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Tip */}
                {section.tip && (
                  <div className="flex gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p
                      className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.tip) }}
                    />
                  </div>
                )}

                {/* Warning */}
                {section.warning && (
                  <div className="flex gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p
                      className="text-xs text-destructive leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.warning) }}
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Footer help */}
      <Card className="border-muted">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Ainda tem dúvidas? Entre em contato com o suporte ou consulte este guia sempre que precisar. 💬
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
