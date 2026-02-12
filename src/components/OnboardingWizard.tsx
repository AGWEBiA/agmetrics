import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight, BarChart3, Settings, Webhook, Target, ShoppingCart } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  route: string;
}

interface OnboardingWizardProps {
  projectId: string;
  projectName: string;
  completedSteps: Set<string>;
}

const STEPS: OnboardingStep[] = [
  {
    id: "webhook",
    title: "Configurar Webhook",
    description: "Conecte Kiwify ou Hotmart para receber vendas automaticamente",
    icon: <Webhook className="h-5 w-5" />,
    action: "Configurar",
    route: "config",
  },
  {
    id: "ads",
    title: "Conectar Plataformas de Ads",
    description: "Integre Meta Ads e/ou Google Ads para métricas de captação",
    icon: <BarChart3 className="h-5 w-5" />,
    action: "Conectar",
    route: "config",
  },
  {
    id: "products",
    title: "Cadastrar Produtos",
    description: "Adicione seus produtos para rastrear vendas por produto",
    icon: <ShoppingCart className="h-5 w-5" />,
    action: "Adicionar",
    route: "config",
  },
  {
    id: "goals",
    title: "Definir Metas",
    description: "Estabeleça metas de receita, vendas e ROI",
    icon: <Target className="h-5 w-5" />,
    action: "Definir",
    route: "config",
  },
  {
    id: "dashboard",
    title: "Ver Dashboard",
    description: "Acompanhe todas as métricas em tempo real",
    icon: <BarChart3 className="h-5 w-5" />,
    action: "Abrir",
    route: "dashboard",
  },
];

export function OnboardingWizard({ projectId, projectName, completedSteps }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const progress = (completedSteps.size / STEPS.length) * 100;
  const allDone = completedSteps.size >= STEPS.length;

  if (dismissed || allDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">🚀 Configurar {projectName}</CardTitle>
                <CardDescription>Complete os passos abaixo para começar</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {completedSteps.size}/{STEPS.length}
                </Badge>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDismissed(true)}>
                  Fechar
                </Button>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {STEPS.map((step, i) => {
                const done = completedSteps.has(step.id);
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${done ? "bg-success/5 border-success/20" : "hover:bg-muted/50"}`}
                  >
                    <span className={done ? "text-success" : "text-muted-foreground"}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </span>
                    <span className={done ? "text-muted-foreground" : "text-primary"}>
                      {step.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{step.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    </div>
                    {!done && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0"
                        onClick={() => navigate(`/admin/projects/${projectId}/${step.route}`)}
                      >
                        {step.action}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
