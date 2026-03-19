import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, Zap, Shield, Bell, Eye,
  ArrowRight, Check, Star, Users, LineChart, Target,
  Rocket, Globe, Layers, RefreshCw, ChevronRight,
  MousePointerClick, Gauge, PieChart, Webhook,
  Database, BrainCircuit, Activity, Cpu
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ── Floating data particles ── */
function DataParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

/* ── Grid lines background ── */
function GridBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

/* ── Animated pulse ring ── */
function PulseRing({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full border border-primary/20 ${className}`}
      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
      transition={{ duration: 4, repeat: Infinity }}
    />
  );
}

function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden pt-20 pb-28 md:pt-32 md:pb-40">
      <GridBackground />
      <DataParticles />

      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <PulseRing className="w-[300px] h-[300px] top-20 -left-20" />
      <PulseRing className="w-[200px] h-[200px] bottom-10 right-10" />

      <div className="container mx-auto px-4 text-center max-w-5xl">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium gap-2 border border-border">
              <BrainCircuit className="h-3.5 w-3.5 text-primary" />
              Business Intelligence para Infoprodutores & Gestores de Tráfego
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp} custom={1}
            className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Dados <span className="text-primary">reais</span> na palma da sua mão.
            <br />
            Decisões que <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">multiplicam resultados</span>.
          </motion.h1>

          <motion.p
            variants={fadeUp} custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Unifique vendas, anúncios e rastreamento em uma central inteligente.
            Tome decisões baseadas em dados — não em achismos — e escale com previsibilidade.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 h-13 gap-2 shadow-lg shadow-primary/25" onClick={() => navigate("/login")}>
              Acessar a Plataforma
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-13 gap-2" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              Ver Funcionalidades
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} custom={4} className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Setup em 5 minutos</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Dados em tempo real</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Suporte dedicado</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

const metrics = [
  { label: "Infoprodutores ativos", value: "2.500+", icon: Users },
  { label: "Em vendas rastreadas", value: "R$ 47M+", icon: TrendingUp },
  { label: "Anúncios monitorados", value: "180K+", icon: Eye },
  { label: "Uptime garantido", value: "99.9%", icon: Shield },
];

function SocialProofBar() {
  return (
    <section className="border-y border-border bg-card/50 backdrop-blur-sm py-10 relative">
      <GridBackground />
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {metrics.map((m, i) => (
            <motion.div key={m.label} variants={fadeUp} custom={i} className="text-center">
              <m.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl md:text-3xl font-bold font-mono">{m.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Data Culture Section (NEW) ── */
const dataCulturePillars = [
  {
    icon: Database,
    title: "Centralização de Dados",
    desc: "Todos os seus dados de vendas, anúncios e tráfego em um único lugar — eliminando planilhas manuais e silos de informação.",
  },
  {
    icon: BrainCircuit,
    title: "Inteligência Preditiva",
    desc: "Algoritmos de IA analisam padrões nos seus dados históricos para prever tendências de vendas e antecipar problemas.",
  },
  {
    icon: Activity,
    title: "Monitoramento Contínuo",
    desc: "Acompanhe KPIs críticos em tempo real. Alertas automáticos garantem que você nunca perca uma oportunidade ou ignore um risco.",
  },
  {
    icon: Cpu,
    title: "Automação Inteligente",
    desc: "Relatórios automáticos, sync de dados e detecção de anomalias — tudo rodando 24/7 enquanto você foca na estratégia.",
  },
];

function DataCultureSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <DataParticles />
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-4 gap-2 border-primary/30 text-primary">
              <Database className="h-3.5 w-3.5" />
              Cultura de Dados
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold mb-4">
            Decisões baseadas em <span className="text-primary">dados</span>, não em intuição
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg max-w-xl mx-auto">
            Construa uma operação data-driven. Cada real investido rastreado, cada decisão fundamentada em métricas reais.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 gap-6">
          {dataCulturePillars.map((p, i) => (
            <motion.div key={p.title} variants={fadeUp} custom={i}>
              <Card className="h-full border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors relative">
                    <p.icon className="h-6 w-6 text-primary" />
                    <motion.div
                      className="absolute inset-0 rounded-xl border border-primary/20"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    />
                  </div>
                  <h3 className="font-semibold text-lg">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const painPoints = [
  {
    problem: "Você gasta horas montando relatórios no Google Sheets",
    solution: "Dashboard automático que cruza vendas, anúncios e UTMs em tempo real",
    icon: BarChart3,
  },
  {
    problem: "Não sabe qual anúncio gerou qual venda",
    solution: "Rastreamento ponta-a-ponta com atribuição por UTM, SRC e SCK",
    icon: MousePointerClick,
  },
  {
    problem: "Descobre os reembolsos sempre tarde demais",
    solution: "Alertas instantâneos de anomalia com IA — reembolso, queda de ROI, etc.",
    icon: Bell,
  },
  {
    problem: "Precisa de vários sistemas pra ter uma visão completa",
    solution: "Integração nativa com Hotmart, Kiwify, Meta Ads, Google Ads e AG Sell",
    icon: Layers,
  },
];

function PainPointsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4">
            Você se identifica com algum desses <span className="text-destructive">problemas</span>?
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-lg max-w-xl mx-auto">
            Cada dia sem visibilidade dos seus dados é dinheiro deixado na mesa. O AG Metrics resolve cada um deles.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-6">
          {painPoints.map((p, i) => (
            <motion.div key={i} variants={fadeUp} custom={i}>
              <Card className="overflow-hidden border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <p.icon className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium line-through text-muted-foreground">{p.problem}</p>
                    <p className="text-foreground font-semibold flex items-center gap-2">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      {p.solution}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: BarChart3, title: "Dashboard Inteligente",
    desc: "Visão 360° de faturamento, vendas, ROI, CAC, LTV e dezenas de KPIs — tudo atualizado automaticamente.",
  },
  {
    icon: Target, title: "Atribuição Multi-Touch",
    desc: "Descubra exatamente quais anúncios, UTMs e fontes geram receita real com modelos first-click, last-click e linear.",
  },
  {
    icon: LineChart, title: "Previsão com IA",
    desc: "Forecast de vendas e faturamento para os próximos 30 dias baseado em machine learning dos seus dados históricos.",
  },
  {
    icon: Bell, title: "Alertas de Anomalia",
    desc: "Detecção automática de quedas de ROI, picos de reembolso e variações incomuns — notificação push ou WhatsApp.",
  },
  {
    icon: Globe, title: "Integrações Nativas",
    desc: "Hotmart, Kiwify, Meta Ads, Google Ads, AG Sell e APIs customizadas. Conecte tudo em minutos.",
  },
  {
    icon: Webhook, title: "Webhooks em Tempo Real",
    desc: "Receba dados de vendas instantaneamente via webhook. Sem delay, sem polling, sem surpresa.",
  },
  {
    icon: PieChart, title: "Análise Demográfica",
    desc: "Mapa de calor por estado, faixa etária, gênero e dispositivo — entenda quem compra de verdade.",
  },
  {
    icon: Gauge, title: "Cohort & LTV",
    desc: "Análise de retenção por cohort e lifetime value por produto. Saiba quem volta a comprar e quando.",
  },
  {
    icon: RefreshCw, title: "Sync Automático",
    desc: "Dados sincronizados a cada hora com retry inteligente e tratamento de rate-limit. Zero manutenção.",
  },
];

function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-28 bg-secondary/30 relative">
      <GridBackground />
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4">
            Tudo o que você precisa para <span className="text-primary">escalar com dados</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-lg max-w-xl mx-auto">
            Funcionalidades de Business Intelligence que grandes operações usam — agora acessíveis para qualquer infoprodutor.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} variants={fadeUp} custom={i}>
              <Card className="h-full border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                <CardContent className="p-6 space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Benefits Section (NEW) ── */
const benefits = [
  {
    title: "Decisões mais assertivas",
    desc: "Pare de operar no escuro. Cada decisão de investimento, pausa de campanha ou ajuste de preço é respaldada por dados concretos.",
    icon: BrainCircuit,
  },
  {
    title: "Velocidade operacional",
    desc: "Dados que antes levavam horas para compilar estão disponíveis em segundos. Reaja rápido a mudanças no mercado.",
    icon: Zap,
  },
  {
    title: "Visibilidade total do funil",
    desc: "Do clique à venda, do reembolso ao LTV — enxergue cada etapa do seu funil com clareza absoluta.",
    icon: Eye,
  },
  {
    title: "ROI maximizado",
    desc: "Identifique exatamente quais campanhas geram lucro e quais drenam orçamento. Otimize com precisão cirúrgica.",
    icon: TrendingUp,
  },
];

function BenefitsSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] -z-10" />
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-4 gap-2 border-accent/30 text-accent">
              <Rocket className="h-3.5 w-3.5" />
              Por que AG Metrics
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold mb-4">
            Os benefícios de quem opera com <span className="text-primary">inteligência</span>
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 gap-8">
          {benefits.map((b, i) => (
            <motion.div key={b.title} variants={fadeUp} custom={i} className="flex gap-4">
              <div className="shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <b.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    name: "Lucas Mendes",
    role: "Infoprodutor — Faturamento 7 dígitos",
    quote: "Antes eu gastava 4h por semana montando relatórios. Agora abro o AG Metrics e tenho tudo em 5 segundos. Meu ROI subiu 23% só por eu conseguir pausar campanhas ruins mais rápido.",
    stars: 5,
  },
  {
    name: "Camila Rodrigues",
    role: "Gestora de Tráfego — 12 clientes",
    quote: "A atribuição multi-touch mudou o jogo. Descobri que 40% dos meus leads vinham de um anúncio que eu ia pausar. Evitei perder R$ 50K em vendas.",
    stars: 5,
  },
  {
    name: "Rafael Costa",
    role: "Co-produtor — Lançamentos",
    quote: "O alerta de anomalia me salvou. Detectou um pico de reembolso às 3h da manhã num lançamento. Corrigi a page antes do dia seguinte. Sem o AG Metrics, teria perdido R$ 30K.",
    stars: 5,
  },
];

function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4">
            Quem usa, <span className="text-primary">não volta atrás</span>
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} variants={fadeUp} custom={i}>
              <Card className="h-full border-border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
                  <div className="pt-2 border-t border-border">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const plans = [
  {
    name: "Starter",
    price: "R$ 47",
    period: "/mês",
    desc: "Para quem está começando a operar com dados",
    features: ["1 projeto", "Dashboard básico", "Integração Hotmart ou Kiwify", "7 dias de histórico"],
    cta: "Começar Agora",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 97",
    period: "/mês",
    desc: "Para infoprodutores que querem escalar",
    features: ["Projetos ilimitados", "Todas as integrações", "Atribuição multi-touch", "Alertas de anomalia", "Forecast com IA", "Relatórios WhatsApp", "Suporte prioritário"],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    name: "Agency",
    price: "R$ 247",
    period: "/mês",
    desc: "Para gestores e agências",
    features: ["Tudo do Pro", "Multi-usuários", "White-label (em breve)", "Dashboard público", "API de dados", "Gerente de conta"],
    cta: "Falar com Vendas",
    highlight: false,
  },
];

function PricingSection() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="py-20 md:py-28 bg-secondary/30 relative">
      <GridBackground />
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4">
            Invista em <span className="text-primary">dados</span>, não em achismos
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-lg max-w-xl mx-auto">
            Quanto custa NÃO saber de onde vêm suas vendas? Provavelmente muito mais que qualquer plano.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <motion.div key={p.name} variants={fadeUp} custom={i}>
              <Card className={`h-full relative border-2 transition-all ${p.highlight ? "border-primary shadow-xl shadow-primary/10 scale-[1.03]" : "border-border"}`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 shadow-lg">Mais Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="mb-6">
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-bold font-mono">{p.price}</span>
                      {p.period && <span className="text-muted-foreground text-sm mb-1">{p.period}</span>}
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={p.highlight ? "default" : "outline"}
                    onClick={() => navigate("/login")}
                  >
                    {p.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Preciso de conhecimento técnico para usar?", a: "Não. O setup leva 5 minutos: conecte sua plataforma de vendas, seus anúncios e pronto. Tudo é visual e intuitivo." },
  { q: "Funciona com qualquer plataforma de vendas?", a: "Atualmente suportamos Hotmart, Kiwify e AG Sell nativamente. Você também pode conectar qualquer API customizada via nosso Connector Hub." },
  { q: "Meus dados estão seguros?", a: "Sim. Usamos criptografia end-to-end, RLS (Row Level Security) em todas as tabelas e autenticação robusta. Seus dados nunca são compartilhados." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa e sem burocracia. Cancele direto no painel. Seus dados ficam disponíveis por 30 dias após o cancelamento." },
  { q: "Qual a diferença para o Google Analytics?", a: "O GA mede tráfego. O AG Metrics cruza tráfego com vendas reais, reembolsos e ROI por anúncio. É a diferença entre ver cliques e ver dinheiro." },
];

function FAQSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4">
            Perguntas <span className="text-primary">frequentes</span>
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
          {faqs.map((f, i) => (
            <motion.div key={i} variants={fadeUp} custom={i}>
              <Card className="border-border">
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <DataParticles />
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 text-center max-w-3xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <Rocket className="h-10 w-10 mx-auto mb-6 text-primary" />
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Cada dia sem dados é um dia <span className="text-destructive">perdendo dinheiro</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Comece agora e em 5 minutos você terá mais clareza sobre seu negócio do que nos últimos 6 meses.
          </motion.p>
          <motion.div variants={fadeUp} custom={3}>
            <Button size="lg" className="text-base px-10 h-14 gap-2 shadow-xl shadow-primary/25 text-lg" onClick={() => navigate("/login")}>
              Acessar a Plataforma
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">AG Metrics</p>
        <p>© {new Date().getFullYear()} AG Metrics. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">AG Metrics</span>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Preços</a>
            <Button size="sm" variant="ghost" onClick={() => window.location.href = "/login"}>Entrar</Button>
            <Button size="sm" onClick={() => window.location.href = "/login"}>Criar Conta</Button>
          </div>
        </div>
      </nav>

      <HeroSection />
      <SocialProofBar />
      <DataCultureSection />
      <PainPointsSection />
      <FeaturesGrid />
      <BenefitsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
