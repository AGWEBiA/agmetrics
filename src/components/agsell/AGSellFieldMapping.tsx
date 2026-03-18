import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ListFilter, Plus, Trash2, Save, RefreshCw } from "lucide-react";

interface FieldMapping {
  formField: string;
  targetField: string;
  enabled: boolean;
}

const TARGET_FIELDS = [
  { value: "buyer_name", label: "Nome do comprador" },
  { value: "buyer_email", label: "E-mail do comprador" },
  { value: "phone", label: "Telefone" },
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_medium", label: "UTM Medium" },
  { value: "utm_campaign", label: "UTM Campaign" },
  { value: "event_detail", label: "Detalhe do evento" },
  { value: "metadata_custom", label: "Metadata (campo customizado)" },
];

const COMMON_FORM_FIELDS = [
  "nome", "name", "first_name", "last_name",
  "email", "e-mail",
  "telefone", "phone", "whatsapp", "celular",
  "empresa", "company",
  "cargo", "role",
  "cidade", "city",
  "estado", "state",
  "cpf", "cnpj",
  "mensagem", "message",
  "interesse", "interest",
];

interface Props {
  projectId: string;
  initialMapping: FieldMapping[];
  onSaved: () => void;
}

export default function AGSellFieldMapping({ projectId, initialMapping, onSaved }: Props) {
  const [mappings, setMappings] = useState<FieldMapping[]>(
    initialMapping.length > 0
      ? initialMapping
      : [
          { formField: "nome", targetField: "buyer_name", enabled: true },
          { formField: "email", targetField: "buyer_email", enabled: true },
          { formField: "telefone", targetField: "phone", enabled: true },
        ]
  );
  const [saving, setSaving] = useState(false);

  const addMapping = () => {
    setMappings([...mappings, { formField: "", targetField: "metadata_custom", enabled: true }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: Partial<FieldMapping>) => {
    setMappings(mappings.map((m, i) => (i === index ? { ...m, ...field } : m)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ agsell_form_field_mapping: mappings } as any)
        .eq("id", projectId);
      if (error) throw error;
      toast({ title: "Salvo", description: "Mapeamento de campos atualizado." });
      onSaved();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListFilter className="h-4 w-4" />
          Mapeamento de Campos do Formulário
        </CardTitle>
        <CardDescription>
          Selecione quais campos dos formulários do AG Sell serão capturados e para onde serão mapeados.
          Campos não mapeados são ignorados no processamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center text-xs font-medium text-muted-foreground">
          <span>Campo do formulário</span>
          <span>Mapear para</span>
          <span className="text-center">Ativo</span>
          <span />
        </div>

        {mappings.map((mapping, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
            <div className="relative">
              <Input
                placeholder="Ex: nome, email, telefone"
                value={mapping.formField}
                onChange={(e) => updateMapping(index, { formField: e.target.value })}
                list={`form-fields-${index}`}
                className="text-sm"
              />
              <datalist id={`form-fields-${index}`}>
                {COMMON_FORM_FIELDS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>

            <Select
              value={mapping.targetField}
              onValueChange={(v) => updateMapping(index, { targetField: v })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_FIELDS.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Checkbox
              checked={mapping.enabled}
              onCheckedChange={(checked) =>
                updateMapping(index, { enabled: checked === true })
              }
            />

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeMapping(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={addMapping}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar campo
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Salvar mapeamento
          </Button>
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Como funciona:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Campo do formulário</strong>: nome exato do campo enviado pelo AG Sell (ex: <code>nome</code>, <code>email</code>, <code>telefone</code>)</li>
            <li><strong>Mapear para</strong>: onde o valor será armazenado no sistema</li>
            <li><strong>Ativo</strong>: desmarque para ignorar temporariamente sem excluir</li>
            <li>Campos marcados como <Badge variant="outline" className="text-[10px] px-1 py-0">Metadata</Badge> são salvos em um campo JSON flexível</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
