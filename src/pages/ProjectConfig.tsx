import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProjectConfig() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">{project?.name || "Carregando..."}</p>
      </div>

      <Tabs defaultValue="meta">
        <TabsList className="flex-wrap">
          <TabsTrigger value="meta">Meta Ads</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
          <TabsTrigger value="kiwify">Kiwify</TabsTrigger>
          <TabsTrigger value="hotmart">Hotmart</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meta Ads</CardTitle>
                  <CardDescription>Configure a integração com Facebook/Instagram Ads</CardDescription>
                </div>
                <Badge variant="outline">Desconectado</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input type="password" placeholder="Cole seu access token aqui" />
              </div>
              <div className="space-y-2">
                <Label>Ad Account ID</Label>
                <Input placeholder="act_XXXXXXXXXX" />
              </div>
              <div className="flex gap-2">
                <Button>Salvar Credenciais</Button>
                <Button variant="outline">Testar Conexão</Button>
                <Button variant="outline">Sincronizar Métricas</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads</CardTitle>
              <CardDescription>Configure a integração com Google Ads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input placeholder="Client ID" />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input type="password" placeholder="Client Secret" />
                </div>
                <div className="space-y-2">
                  <Label>Refresh Token</Label>
                  <Input type="password" placeholder="Refresh Token" />
                </div>
                <div className="space-y-2">
                  <Label>Customer ID</Label>
                  <Input placeholder="XXX-XXX-XXXX" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button>Salvar Credenciais</Button>
                <Button variant="outline">Testar Conexão</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {["kiwify", "hotmart", "whatsapp", "products", "goals", "investments"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{tab}</CardTitle>
                <CardDescription>Configurações serão implementadas na Fase 3</CardDescription>
              </CardHeader>
              <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
                Em breve
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
