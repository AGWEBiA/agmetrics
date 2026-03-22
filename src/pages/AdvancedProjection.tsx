import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectionData, buildSimulationParams } from "@/hooks/useProjectionData";
import { runMonteCarloSimulation, type SimulationParams, type SimulationOutput } from "@/lib/monteCarloEngine";
import { analyzeSeasonality } from "@/lib/advancedProjectionAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, DollarSign, ShoppingCart, Target, Zap, BarChart3, Loader2,
  Sparkles, Activity, Search, FlaskConical, Wallet, PiggyBank, Calendar,
  Save, FileDown, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { exportProjectionPDF } from "@/lib/exportProjectionPDF";

// Lazy-loaded panels
import { CashFlowChart } from "@/components/projection/CashFlowChart";
import { WhatIfPanel } from "@/components/projection/WhatIfPanel";
import { GrowthMetricsPanel } from "@/components/projection/GrowthMetricsPanel";
import { ROIOptimizationPanel } from "@/components/projection/ROIOptimizationPanel";
import { GoalProbabilityPanel } from "@/components/projection/GoalProbabilityPanel";
import { SeasonalityChart } from "@/components/projection/SeasonalityChart";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default function AdvancedProjection() {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationOutput | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [projectionDays, setProjectionDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceVar, setPriceVar] = useState(15);
  const [demandVar, setDemandVar] = useState(20);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);

  const saveSimulation = async () => {
    if (!simulationResult || !historicalData || !simulationParams) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para salvar"); setIsSaving(false); return; }
      const { error } = await supabase.from("projection_simulations" as any).insert({
        user_id: user.id,
        project_ids: selectedProjectIds,
        project_names: historicalData.map(d => d.projectName),
        projection_days: projectionDays,
        price_variation: priceVar / 100,
        demand_variation: demandVar / 100,
        scenarios: simulationResult.scenarios,
        summary: simulationResult.summary,
        sensitivity_matrix: simulationResult.sensitivityMatrix,
        ai_recommendation: aiRecommendation,
      } as any);
      if (error) throw error;
      toast.success("Simulação salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    }
    setIsSaving(false);
  };

  const handleExportPDF = () => {
    if (!simulationResult || !historicalData || !simulationParams) return;
    exportProjectionPDF(simulationResult, simulationParams, historicalData, aiRecommendation);
    toast.success("PDF exportado!");
  };

  const { data: projects } = useQuery({
    queryKey: ["all-projects-for-projection"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, strategy, is_active").order("name");
      return data || [];
    },
  });

  const { data: historicalData, isLoading: loadingData } = useProjectionData(selectedProjectIds);

  // Fetch sales data for seasonality
  const { data: salesForSeasonality } = useQuery({
    queryKey: ["sales-seasonality", selectedProjectIds],
    queryFn: async () => {
      if (!selectedProjectIds.length) return [];
      const allSales: { sale_date: string; amount: number }[] = [];
      for (const pid of selectedProjectIds) {
        const { data } = await supabase
          .from("sales_events")
          .select("sale_date, amount")
          .eq("project_id", pid)
          .eq("is_ignored", false)
          .eq("status", "approved");
        if (data) allSales.push(...data.filter(s => s.sale_date).map(s => ({ sale_date: s.sale_date!, amount: s.amount || 0 })));
      }
      return allSales;
    },
    enabled: selectedProjectIds.length > 0,
  });

  const seasonalityData = useMemo(
    () => salesForSeasonality ? analyzeSeasonality(salesForSeasonality) : [],
    [salesForSeasonality]
  );

  const toggleProject = (id: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setSimulationResult(null);
    setSimulationParams(null);
    setAiRecommendation(null);
  };

  const runSimulation = useCallback(() => {
    if (!historicalData?.length) return;
    setIsSimulating(true);
    setTimeout(() => {
      const params = buildSimulationParams(historicalData, {
        projectionDays,
        priceVariation: priceVar / 100,
        demandVariation: demandVar / 100,
        iterations: 2000,
      });
      const result = runMonteCarloSimulation(params);
      setSimulationResult(result);
      setSimulationParams(params);
      setIsSimulating(false);
    }, 50);
  }, [historicalData, projectionDays, priceVar, demandVar]);

  const fetchAIRecommendation = async () => {
    if (!simulationResult || !historicalData) return;
    setLoadingAI(true);
    try {
      const { data } = await supabase.functions.invoke("ai-projection-recommendation", {
        body: {
          historicalData,
          simulationResult: {
            scenarios: simulationResult.scenarios,
            summary: simulationResult.summary,
            sensitivityMatrix: simulationResult.sensitivityMatrix,
          },
        },
      });
      setAiRecommendation(data?.recommendation || "Não foi possível gerar recomendação.");
    } catch {
      setAiRecommendation("Erro ao gerar recomendação. Tente novamente.");
    }
    setLoadingAI(false);
  };

  const scenarioColors: Record<string, string> = {
    pessimistic: "hsl(var(--destructive))",
    realistic: "hsl(var(--primary))",
    optimistic: "hsl(142 71% 45%)",
    millionaire: "hsl(45 93% 47%)",
  };

  const scenarioChartData = simulationResult
    ? Object.entries(simulationResult.scenarios).map(([key, s]) => ({
        name: s.label, receita: s.revenue, lucro: s.profit, vendas: s.sales, roi: s.roi, key,
      }))
    : [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projeção Avançada</h1>
            <p className="text-sm text-muted-foreground">
              Simulação Monte Carlo · Gêmeo Digital · Cenários Preditivos
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Selecione os Projetos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar projeto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
              <ScrollArea className="h-52">
                <div className="space-y-1 pr-3">
                  {(projects || []).filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
                      <Checkbox checked={selectedProjectIds.includes(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                      <span className="text-sm truncate flex-1">{p.name}</span>
                      {p.is_active && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Ativo</Badge>}
                    </label>
                  ))}
                  {projects && projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum projeto encontrado</p>
                  )}
                </div>
              </ScrollArea>
              {selectedProjectIds.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{selectedProjectIds.length} projeto(s) selecionado(s)</p>
              )}
            </CardContent>
          </Card>

          {historicalData && historicalData.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Dados Históricos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {historicalData.map(d => (
                    <div key={d.projectId} className="p-2 rounded-md bg-muted/30 space-y-1">
                      <p className="text-xs font-medium truncate">{d.projectName}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Receita: <strong className="text-foreground">{fmt(d.totalRevenue)}</strong></span>
                        <span>Vendas: <strong className="text-foreground">{d.totalSales}</strong></span>
                        <span>Ticket: <strong className="text-foreground">{fmt(d.avgTicket)}</strong></span>
                        <span>CPA: <strong className="text-foreground">{fmt(d.avgCPA)}</strong></span>
                        <span>Reembolso: <strong className="text-foreground">{fmtPct(d.refundRate * 100)}</strong></span>
                        <span>Conv.: <strong className="text-foreground">{fmtPct(d.conversionRate * 100)}</strong></span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Parâmetros da Simulação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-xs font-medium mb-2 block">Período de Projeção</label>
                <Select value={String(projectionDays)} onValueChange={v => { setProjectionDays(Number(v)); setSimulationResult(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">6 meses</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block">Variação de Preço: ±{priceVar}%</label>
                <Slider value={[priceVar]} onValueChange={([v]) => { setPriceVar(v); setSimulationResult(null); }} min={5} max={40} step={1} />
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block">Variação de Demanda: ±{demandVar}%</label>
                <Slider value={[demandVar]} onValueChange={([v]) => { setDemandVar(v); setSimulationResult(null); }} min={5} max={50} step={1} />
              </div>
              <Button className="w-full" disabled={!selectedProjectIds.length || loadingData || isSimulating} onClick={runSimulation}>
                {isSimulating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Simulando 2.000 cenários...</>
                ) : (
                  <><Brain className="mr-2 h-4 w-4" />Executar Simulação</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-8 space-y-4">
          <AnimatePresence mode="wait">
            {!simulationResult && !isSimulating && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 rounded-full bg-primary/5 mb-4">
                  <BarChart3 className="h-10 w-10 text-primary/40" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground">Selecione projetos e execute a simulação</h3>
                <p className="text-sm text-muted-foreground/60 mt-1 max-w-md">
                  O motor de Monte Carlo vai gerar 2.000+ cenários baseados nos dados reais dos seus projetos
                </p>
              </motion.div>
            )}

            {isSimulating && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Calculando cenários...</p>
              </motion.div>
            )}

            {simulationResult && simulationParams && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard icon={DollarSign} label="Receita Média" value={fmt(simulationResult.summary.avgRevenue)} />
                  <SummaryCard icon={TrendingUp} label="Lucro Médio" value={fmt(simulationResult.summary.avgProfit)} positive={simulationResult.summary.avgProfit > 0} />
                  <SummaryCard icon={Target} label="ROI Médio" value={fmtPct(simulationResult.summary.avgROI)} positive={simulationResult.summary.avgROI > 0} />
                  <SummaryCard icon={Zap} label="Prob. Sucesso" value={fmtPct(simulationResult.summary.successProbability)} positive={simulationResult.summary.successProbability > 50} />
                </div>

                {/* Tabs for all analyses */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <ScrollArea className="w-full">
                    <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1">
                      <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" />Cenários</TabsTrigger>
                      <TabsTrigger value="cashflow" className="text-xs gap-1.5"><Wallet className="h-3 w-3" />Fluxo de Caixa</TabsTrigger>
                      <TabsTrigger value="whatif" className="text-xs gap-1.5"><FlaskConical className="h-3 w-3" />What-If</TabsTrigger>
                      <TabsTrigger value="growth" className="text-xs gap-1.5"><TrendingUp className="h-3 w-3" />Crescimento</TabsTrigger>
                      <TabsTrigger value="goals" className="text-xs gap-1.5"><Target className="h-3 w-3" />Metas</TabsTrigger>
                      <TabsTrigger value="roi" className="text-xs gap-1.5"><PiggyBank className="h-3 w-3" />ROI</TabsTrigger>
                      <TabsTrigger value="seasonality" className="text-xs gap-1.5"><Calendar className="h-3 w-3" />Sazonalidade</TabsTrigger>
                      <TabsTrigger value="ai" className="text-xs gap-1.5"><Sparkles className="h-3 w-3" />IA</TabsTrigger>
                    </TabsList>
                  </ScrollArea>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Scenario Comparison */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Comparação de Cenários</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scenarioChartData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                              <Bar dataKey="receita" name="Receita" radius={[4, 4, 0, 0]}>
                                {scenarioChartData.map(entry => <Cell key={entry.key} fill={scenarioColors[entry.key]} />)}
                              </Bar>
                              <Bar dataKey="lucro" name="Lucro" radius={[4, 4, 0, 0]} fillOpacity={0.6}>
                                {scenarioChartData.map(entry => <Cell key={entry.key} fill={scenarioColors[entry.key]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Scenario Detail Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(simulationResult.scenarios).map(([key, s]) => (
                        <Card key={key} className="relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full" style={{ background: scenarioColors[key] }} />
                          <CardContent className="pt-4 pl-5">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold">{s.label}</h4>
                              <Badge variant="outline" className="text-[10px]">{s.probability}% prob.</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Receita</span><p className="font-semibold">{fmt(s.revenue)}</p></div>
                              <div><span className="text-muted-foreground">Lucro</span><p className={`font-semibold ${s.profit >= 0 ? "text-green-500" : "text-destructive"}`}>{fmt(s.profit)}</p></div>
                              <div><span className="text-muted-foreground">Vendas</span><p className="font-semibold">{s.sales}</p></div>
                              <div><span className="text-muted-foreground">ROI</span><p className={`font-semibold ${s.roi >= 0 ? "text-green-500" : "text-destructive"}`}>{fmtPct(s.roi)}</p></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Distribution */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Distribuição de Resultados (2.000 iterações)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={simulationResult.distribution}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                              <XAxis dataKey="sales" tick={{ fontSize: 10 }} label={{ value: "Vendas", position: "bottom", fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                              <Area type="monotone" dataKey="revenue" name="Receita" fill="hsl(var(--primary))" fillOpacity={0.15} stroke="hsl(var(--primary))" />
                              <Area type="monotone" dataKey="profit" name="Lucro" fill="hsl(142 71% 45%)" fillOpacity={0.1} stroke="hsl(142 71% 45%)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sensitivity */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Análise de Sensibilidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {simulationResult.sensitivityMatrix.map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs w-28 truncate font-medium">{s.variable}</span>
                              <div className="flex-1 h-6 bg-muted/30 rounded-full relative overflow-hidden">
                                <div className="absolute left-1/2 h-full rounded-full transition-all" style={{
                                  width: `${Math.min(Math.abs(s.impactOnRevenue), 100) / 2}%`,
                                  background: s.impactOnRevenue >= 0 ? "hsl(142 71% 45% / 0.5)" : "hsl(var(--destructive) / 0.5)",
                                  transform: s.impactOnRevenue >= 0 ? "none" : "translateX(-100%)",
                                }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[10px] font-semibold">{s.impactOnRevenue >= 0 ? "+" : ""}{s.impactOnRevenue.toFixed(1)}% receita</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="cashflow" className="mt-4">
                    <CashFlowChart params={simulationParams} />
                  </TabsContent>

                  <TabsContent value="whatif" className="mt-4">
                    <WhatIfPanel params={simulationParams} simulation={simulationResult} />
                  </TabsContent>

                  <TabsContent value="growth" className="mt-4">
                    {historicalData && (
                      <GrowthMetricsPanel historicalData={historicalData} simulation={simulationResult} projectionDays={projectionDays} />
                    )}
                  </TabsContent>

                  <TabsContent value="goals" className="mt-4">
                    <GoalProbabilityPanel simulation={simulationResult} />
                  </TabsContent>

                  <TabsContent value="roi" className="mt-4">
                    {historicalData && (
                      <ROIOptimizationPanel params={simulationParams} simulation={simulationResult} historicalData={historicalData} />
                    )}
                  </TabsContent>

                  <TabsContent value="seasonality" className="mt-4">
                    <SeasonalityChart data={seasonalityData} />
                  </TabsContent>

                  <TabsContent value="ai" className="mt-4">
                    <Card className="border-primary/30 bg-primary/[0.02]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Recomendação Estratégica IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!aiRecommendation && !loadingAI && (
                          <Button variant="outline" onClick={fetchAIRecommendation} className="w-full">
                            <Brain className="mr-2 h-4 w-4" />Gerar Recomendação com IA
                          </Button>
                        )}
                        {loadingAI && (
                          <div className="flex items-center gap-2 py-4 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Analisando cenários...</span>
                          </div>
                        )}
                        {aiRecommendation && (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                            {aiRecommendation}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, positive }: {
  icon: React.ElementType; label: string; value: string; positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <p className={`text-base font-bold ${positive === true ? "text-green-500" : positive === false ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
