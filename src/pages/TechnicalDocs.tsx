import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileCode2, 
  Database, 
  Server, 
  ShieldCheck, 
  Network, 
  Zap, 
  Cpu, 
  Lock,
  Globe,
  Layers,
  Code2
} from "lucide-react";

export default function TechnicalDocs() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileCode2 className="h-8 w-8 text-primary" />
          Documentação Técnica do Sistema
        </h1>
        <p className="text-muted-foreground text-lg">
          Visão geral da arquitetura, fluxo de dados e infraestrutura do AGMetrics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Architecture Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Arquitetura de Alto Nível
            </CardTitle>
            <CardDescription>O sistema utiliza uma arquitetura moderna baseada em Serverless e Managed Services.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Frontend
              </div>
              <p className="text-sm text-muted-foreground">
                SPA desenvolvida com <strong>React 18</strong>, <strong>Vite</strong> e <strong>TypeScript</strong>. 
                Interface construída com <strong>Tailwind CSS</strong> e componentes <strong>shadcn/ui</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-500" />
                Banco de Dados
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>PostgreSQL</strong> hospedado no Supabase. Utiliza Row Level Security (RLS) para isolamento de dados entre workspaces e projetos.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-orange-500" />
                Backend (Edge Functions)
              </div>
              <p className="text-sm text-muted-foreground">
                Lógica de negócio e integrações executadas em <strong>Deno Edge Functions</strong> para baixa latência e escalabilidade automática.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Integrações e Fluxo de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline">Webhooks</Badge>
              <p className="text-sm text-muted-foreground">
                Recebimento em tempo real de vendas (Kiwify/Hotmart) e submissões de formulários (AG Sell/Pixel).
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">Scheduled Syncs</Badge>
              <p className="text-sm text-muted-foreground">
                Cron jobs (pg_cron) disparam Edge Functions a cada 15 minutos para sincronizar métricas do Meta Ads e Google Ads.
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">Direct API</Badge>
              <p className="text-sm text-muted-foreground">
                Consultas diretas a APIs de terceiros (Evolution API para WhatsApp) com tratamento de rate limiting.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security & Isolation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Segurança e Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Autenticação</div>
              <p className="text-sm text-muted-foreground">
                Supabase Auth (JWT) com suporte a sessões persistentes e MFA opcional.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Autorização (RBAC)</div>
              <p className="text-sm text-muted-foreground">
                Sistema granular de permissões por role (admin, manager, viewer) aplicado tanto no frontend quanto via RLS no DB.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Criptografia</div>
              <p className="text-sm text-muted-foreground">
                Dados em repouso (AES-256) e em trânsito (TLS 1.3). Tokens de integração sensíveis são armazenados em colunas criptografadas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Database Schema */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Estrutura de Dados Principal
            </CardTitle>
            <CardDescription>Principais entidades e seus relacionamentos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="text-sm font-bold mb-1">projects</div>
                <p className="text-xs text-muted-foreground font-mono">
                  id, name, strategy, strategy_config, workspace_id, status
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="text-sm font-bold mb-1">sales</div>
                <p className="text-xs text-muted-foreground font-mono">
                  id, project_id, product_name, amount, net_amount, payment_method, customer_email, type (own/coproduction)
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="text-sm font-bold mb-1">leads</div>
                <p className="text-xs text-muted-foreground font-mono">
                  id, project_id, email, source, utm_source, utm_medium, funnel_step, created_at
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="text-sm font-bold mb-1">marketing_metrics</div>
                <p className="text-xs text-muted-foreground font-mono">
                  id, project_id, platform, date, spend, impressions, clicks, leads_count
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Stack */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              Stack Tecnológica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500" /> React 18
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500" /> Supabase
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-cyan-400" /> Tailwind CSS
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-indigo-500" /> TypeScript
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-orange-400" /> Deno Edge
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-pink-500" /> TanStack Query
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-slate-500" /> shadcn/ui
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-yellow-500" /> Lucide Icons
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="text-center text-sm text-muted-foreground">
        <p>© 2026 AGMetrics Intelligence. Documentação atualizada em 18/05/2026.</p>
      </div>
    </div>
  );
}
