import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, Brain, Target, Webhook, Code, Bell, 
  Smartphone, ChevronLeft, ChevronRight, ArrowRight,
  TrendingUp, Shield, Zap, LineChart, Users, Globe
} from "lucide-react";

const SLIDES = [
  {
    id: "intro",
    badge: "BUSINESS INTELLIGENCE",
    title: ["Transforme dados", "em decisões", "lucrativas"],
    highlight: [false, false, true],
    subtitle: "A plataforma completa de inteligência de dados para infoprodutores que querem vender mais com decisões baseadas em dados reais.",
    visual: "hero",
  },
  {
    id: "dashboard",
    badge: "DASHBOARD EM TEMPO REAL",
    title: ["Todas as métricas", "em um só lugar"],
    highlight: [false, true],
    subtitle: "Receita, vendas, ROI, taxa de conversão, ticket médio — tudo atualizado em tempo real e com visualizações inteligentes.",
    visual: "metrics",
  },
  {
    id: "integrations",
    badge: "INTEGRAÇÕES",
    title: ["Conecte suas", "plataformas favoritas"],
    highlight: [false, true],
    subtitle: "Hotmart, Kiwify, Meta Ads, Google Ads e mais. Todos os dados centralizados sem esforço.",
    visual: "integrations",
  },
  {
    id: "ai",
    badge: "INTELIGÊNCIA ARTIFICIAL",
    title: ["Insights que", "geram ação"],
    highlight: [false, true],
    subtitle: "A IA analisa seus dados e entrega recomendações práticas para aumentar receita, otimizar campanhas e reduzir custos.",
    visual: "ai",
  },
  {
    id: "projection",
    badge: "PROJEÇÃO AVANÇADA",
    title: ["Simule cenários", "antes de investir"],
    highlight: [false, true],
    subtitle: "Simulações Monte Carlo com cenários otimista, realista e pessimista. Saiba o que esperar antes de gastar.",
    visual: "projection",
  },
  {
    id: "cta",
    badge: "COMECE AGORA",
    title: ["Dados na palma", "da sua mão"],
    highlight: [false, true],
    subtitle: "Junte-se a quem já toma decisões assertivas com dados reais e rápidos.",
    visual: "cta",
  },
];

const MetricCardAnim = ({ label, value, color, delay }: { label: string; value: string; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.5, type: "spring" }}
    className="rounded-xl border border-primary/20 bg-card/80 p-4 sm:p-6 min-w-[140px]"
    style={{ boxShadow: `0 0 30px ${color}15` }}
  >
    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</div>
    <div className="text-xl sm:text-3xl font-bold" style={{ color }}>{value}</div>
  </motion.div>
);

const InsightCard = ({ text, delay }: { text: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 60 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.4, type: "spring" }}
    className="border-l-2 border-primary bg-card/60 rounded-lg p-3 sm:p-4"
  >
    <p className="text-xs sm:text-sm text-foreground/80 italic">{text}</p>
  </motion.div>
);

function SlideVisual({ type }: { type: string }) {
  if (type === "hero") {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring", damping: 12 }}
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
          style={{ boxShadow: "0 0 80px hsl(var(--primary) / 0.4)" }}
        >
          <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-primary-foreground" />
        </motion.div>
        {[TrendingUp, Shield, Zap, LineChart, Users, Globe].map((Icon, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            className="absolute w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card/80 border border-primary/20 flex items-center justify-center"
            style={{
              left: `${50 + Math.cos((i / 6) * Math.PI * 2) * 38}%`,
              top: `${50 + Math.sin((i / 6) * Math.PI * 2) * 38}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "metrics") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-md mx-auto">
        <MetricCardAnim label="Receita" value="R$ 127K" color="hsl(var(--success))" delay={0.2} />
        <MetricCardAnim label="Vendas" value="42" color="hsl(var(--primary))" delay={0.3} />
        <MetricCardAnim label="ROI" value="3.8x" color="hsl(var(--warning))" delay={0.4} />
        <MetricCardAnim label="Conversão" value="4.2%" color="hsl(var(--accent))" delay={0.5} />
      </div>
    );
  }

  if (type === "integrations") {
    const items = ["Hotmart", "Kiwify", "Meta Ads", "Google Ads", "WhatsApp", "AGSell"];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md mx-auto">
        {items.map((name, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08, type: "spring" }}
            className="rounded-xl border border-primary/20 bg-card/60 p-3 sm:p-4 text-center"
          >
            <Webhook className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-2" />
            <div className="text-xs sm:text-sm font-medium text-foreground">{name}</div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "ai") {
    return (
      <div className="space-y-3 w-full max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10 }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4"
        >
          <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </motion.div>
        <InsightCard text='"ROI de 3.8x está acima da média do segmento"' delay={0.3} />
        <InsightCard text='"Vendas caem 23% às segundas – considere promos"' delay={0.45} />
        <InsightCard text='"Melhor hora de conversão: 19h–21h"' delay={0.6} />
      </div>
    );
  }

  if (type === "projection") {
    return (
      <div className="space-y-3 w-full max-w-md mx-auto">
        {[
          { label: "Otimista", value: "R$ 245K", pct: 85, color: "hsl(var(--success))" },
          { label: "Realista", value: "R$ 180K", pct: 65, color: "hsl(var(--primary))" },
          { label: "Pessimista", value: "R$ 95K", pct: 35, color: "hsl(var(--warning))" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15, type: "spring" }}
            className="rounded-xl border border-primary/20 bg-card/60 p-4"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm font-medium text-foreground">{s.label}</span>
              <span className="text-sm sm:text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.8 }}
                className="h-full rounded-full"
                style={{ backgroundColor: s.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // CTA
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
      >
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base sm:text-lg shadow-lg hover:bg-primary/90 transition-colors"
          style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.3)" }}
        >
          Começar Agora <ArrowRight className="w-5 h-5" />
        </a>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-8 sm:gap-12 text-center"
      >
        {[
          { n: "Tempo Real", l: "Dados atualizados" },
          { n: "6+ Integrações", l: "Conectadas" },
          { n: "IA Avançada", l: "Recomendações" },
        ].map((s, i) => (
          <div key={i}>
            <div className="text-sm sm:text-lg font-bold text-accent">{s.n}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [autoplay]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setCurrent((c) => Math.min(c + 1, SLIDES.length - 1)); setAutoplay(false); }
      if (e.key === "ArrowLeft") { setCurrent((c) => Math.max(c - 1, 0)); setAutoplay(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />
      <div className="fixed inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(var(--primary) / 0.08), transparent)",
      }} />

      {/* Slide content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AGMetrics</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setAutoplay(!autoplay)}
            >
              {autoplay ? "⏸ Pausar" : "▶ Reproduzir"}
            </Button>
            <a href="/">
              <Button variant="outline" size="sm" className="text-xs">
                Voltar ao site
              </Button>
            </a>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-12 lg:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
            >
              {/* Text side */}
              <div className="order-2 lg:order-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block text-[10px] sm:text-xs text-accent font-medium tracking-[0.2em] uppercase mb-4 px-3 py-1 rounded-full border border-accent/20 bg-accent/5"
                >
                  {slide.badge}
                </motion.div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  {slide.title.map((line, i) => (
                    <span key={i}>
                      {slide.highlight[i] ? (
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{line}</span>
                      ) : line}
                      {i < slide.title.length - 1 && <br />}
                    </span>
                  ))}
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm sm:text-lg text-muted-foreground max-w-lg leading-relaxed"
                >
                  {slide.subtitle}
                </motion.p>
              </div>
              {/* Visual side */}
              <div className="order-1 lg:order-2 min-h-[250px] sm:min-h-[350px] flex items-center justify-center">
                <SlideVisual type={slide.visual} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="icon"
              onClick={() => { setCurrent(Math.max(0, current - 1)); setAutoplay(false); }}
              disabled={current === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => { setCurrent(Math.min(SLIDES.length - 1, current + 1)); setAutoplay(false); }}
              disabled={current === SLIDES.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          {/* Dots */}
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setAutoplay(false); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {String(current + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}
