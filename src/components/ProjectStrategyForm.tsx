import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectStrategy } from "@/types/database";
import type { Client } from "@/hooks/useClients";

const strategyOptions: { value: ProjectStrategy; label: string; description: string }[] = [
  { value: "perpetuo", label: "Perpétuo", description: "Ideal para produtos evergreen com vendas contínuas. Taxa de conversão = vendas / visitas." },
  { value: "lancamento", label: "Lançamento", description: "Para lançamentos com período definido e captação de leads. Taxa de conversão = vendas / leads." },
  { value: "lancamento_pago", label: "Lançamento Pago", description: "Lançamento com investimento intensivo em tráfego pago. Taxa de conversão = vendas / leads." },
  { value: "funis", label: "Funis (Webinar/WhatsApp/Chatbot)", description: "Para vendas via funis automatizados ou semi-automatizados. Taxa de conversão = vendas / leads." },
  { value: "evento_presencial", label: "Evento Presencial", description: "Para vendas em eventos presenciais com funis de captação e conversão. Taxa de conversão = vendas / leads." },
];

export const strategyLabel = (s: ProjectStrategy) =>
  s === "lancamento_pago" ? "Lanç. Pago" : s === "lancamento" ? "Lançamento" : s === "funis" ? "Funis" : s === "evento_presencial" ? "Evento Presencial" : "Perpétuo";

interface ProjectFormData {
  name: string;
  description: string;
  strategy: ProjectStrategy;
  startDate: string;
  endDate: string;
  cartOpenDate: string;
  manualInvestment: string;
  isActive: boolean;
  budget: string;
  metaLeads: boolean;
  googleLeads: boolean;
  clientId: string;
}

interface ProjectStrategyFormProps {
  data: ProjectFormData;
  onChange: (data: ProjectFormData) => void;
  showExtendedFields?: boolean;
  clients?: Client[];
}

export function ProjectStrategyForm({ data, onChange, showExtendedFields = false, clients }: ProjectStrategyFormProps) {
  const update = (partial: Partial<ProjectFormData>) => onChange({ ...data, ...partial });
  const showDates = data.strategy === "lancamento" || data.strategy === "lancamento_pago";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Nome do Projeto *</Label>
        <Input placeholder="Ex: Pack de IA - Contabilidade Médica" value={data.name} onChange={(e) => update({ name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea placeholder="Descrição opcional do projeto" value={data.description} onChange={(e) => update({ description: e.target.value })} />
      </div>

      {clients && clients.length > 0 && (
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={data.clientId || "none"} onValueChange={(v) => update({ clientId: v === "none" ? "" : v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem cliente</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label>Estratégia</Label>
          <span className="text-xs text-muted-foreground" title="Define como as métricas de conversão são calculadas">ⓘ</span>
        </div>
        <RadioGroup value={data.strategy} onValueChange={(v) => update({ strategy: v as ProjectStrategy })} className="space-y-3">
          {strategyOptions.map((opt) => (
            <div key={opt.value} className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
              <RadioGroupItem value={opt.value} id={`strat-${opt.value}`} className="mt-0.5" />
              <div>
                <Label htmlFor={`strat-${opt.value}`} className="cursor-pointer font-semibold">{opt.label}</Label>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {showDates && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Início</Label>
            <Input type="date" value={data.startDate} onChange={(e) => update({ startDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Término</Label>
            <Input type="date" value={data.endDate} onChange={(e) => update({ endDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Abertura Carrinho</Label>
            <Input type="date" value={data.cartOpenDate} onChange={(e) => update({ cartOpenDate: e.target.value })} />
          </div>
        </div>
      )}

      {showExtendedFields && (
        <>
          <div className="space-y-2">
            <Label>Investimento Manual Adicional (R$)</Label>
            <Input placeholder="0,00" value={data.manualInvestment} onChange={(e) => update({ manualInvestment: e.target.value })} />
            <p className="text-xs text-muted-foreground">Valor adicional de investimento que não vem das APIs (Meta/Google)</p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <Switch checked={data.isActive} onCheckedChange={(v) => update({ isActive: v })} />
              <span className="text-sm">{data.isActive ? "Ativo" : "Inativo"}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Orçamento e Configurações
            </h4>
            <div className="space-y-2">
              <Label>Orçamento Total Provisionado (R$)</Label>
              <Input placeholder="10000,00" value={data.budget} onChange={(e) => update({ budget: e.target.value })} />
              <p className="text-xs text-muted-foreground">Orçamento total previsto para este projeto (Meta + Google + Manual)</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Captação de Leads (Meta Ads)</Label>
                <p className="text-xs text-muted-foreground">Desative se este projeto não utiliza Meta Ads para captar leads</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={data.metaLeads} onCheckedChange={(v) => update({ metaLeads: v })} />
                <span className="text-sm">{data.metaLeads ? "Sim" : "Não"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Contabilizar Leads do Google Ads</Label>
                <p className="text-xs text-muted-foreground">Desative se não deseja incluir leads do Google Ads nas métricas</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={data.googleLeads} onCheckedChange={(v) => update({ googleLeads: v })} />
                <span className="text-sm">{data.googleLeads ? "Sim" : "Não"}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type { ProjectFormData };
