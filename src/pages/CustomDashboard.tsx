import * as React from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Lock, Unlock, Pencil, X, LayoutGrid } from "lucide-react";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { WIDGET_CATALOG, type WidgetConfig, type DashboardTab } from "@/types/widgets";
import { useDashboardLayouts } from "@/hooks/useDashboardLayouts";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useProject } from "@/hooks/useProjects";
import { useParams } from "react-router-dom";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import type { DateFilter } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import type { DateFilter } from "@/types/database";

const ResponsiveGridLayout = WidthProvider(Responsive);

function generateId() {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function CustomDashboard() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const { tabs, isLoading, upsertTab, deleteTab } = useDashboardLayouts(projectId);
  const [dateFilter, setDateFilter] = React.useState<DateFilter>({});
  const metrics = useDashboardMetrics(projectId, dateFilter, project?.strategy);

  const [activeTab, setActiveTab] = React.useState<string>("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [localTabs, setLocalTabs] = React.useState<DashboardTab[]>([]);
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  const [renamingTab, setRenamingTab] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  // Sync server tabs to local
  React.useEffect(() => {
    if (tabs.length > 0) {
      setLocalTabs(tabs);
      if (!activeTab || !tabs.find(t => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
      }
    }
  }, [tabs]);

  const currentTab = localTabs.find(t => t.id === activeTab);

  const handleAddTab = () => {
    const newTab: DashboardTab = {
      id: generateId(),
      tab_name: `Painel ${localTabs.length + 1}`,
      tab_order: localTabs.length,
      widgets: [],
    };
    setLocalTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
    upsertTab.mutate(newTab);
  };

  const handleDeleteTab = (tabId: string) => {
    if (localTabs.length <= 1) return;
    setLocalTabs(prev => prev.filter(t => t.id !== tabId));
    deleteTab.mutate(tabId);
    if (activeTab === tabId) {
      const remaining = localTabs.filter(t => t.id !== tabId);
      setActiveTab(remaining[0]?.id || "");
    }
  };

  const handleRenameTab = (tabId: string) => {
    if (!renameValue.trim()) return;
    setLocalTabs(prev => prev.map(t => t.id === tabId ? { ...t, tab_name: renameValue } : t));
    const tab = localTabs.find(t => t.id === tabId);
    if (tab) upsertTab.mutate({ ...tab, tab_name: renameValue });
    setRenamingTab(null);
  };

  const handleAddWidget = (type: WidgetConfig["type"]) => {
    if (!currentTab) return;
    const cat = WIDGET_CATALOG.find(c => c.type === type);
    if (!cat) return;
    const widget: WidgetConfig = {
      i: generateId(),
      type,
      x: 0,
      y: Infinity, // place at bottom
      w: cat.defaultW,
      h: cat.defaultH,
      minW: cat.minW,
      minH: cat.minH,
    };
    const updated = { ...currentTab, widgets: [...currentTab.widgets, widget] };
    setLocalTabs(prev => prev.map(t => t.id === currentTab.id ? updated : t));
    upsertTab.mutate(updated);
    setCatalogOpen(false);
    toast({ title: `Widget "${cat.label}" adicionado` });
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (!currentTab) return;
    const updated = { ...currentTab, widgets: currentTab.widgets.filter(w => w.i !== widgetId) };
    setLocalTabs(prev => prev.map(t => t.id === currentTab.id ? updated : t));
    upsertTab.mutate(updated);
  };

  const handleLayoutChange = (layout: Layout[]) => {
    if (!currentTab || !isEditing) return;
    const updated = {
      ...currentTab,
      widgets: currentTab.widgets.map(w => {
        const l = layout.find(li => li.i === w.i);
        return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
      }),
    };
    setLocalTabs(prev => prev.map(t => t.id === currentTab.id ? updated : t));
    // Debounce save
    clearTimeout((window as any).__layoutSaveTimer);
    (window as any).__layoutSaveTimer = setTimeout(() => upsertTab.mutate(updated), 500);
  };

  const metricsData = React.useMemo(() => ({
    ...metrics,
    metaAds: metrics.metaAdsData || [],
    approvedSales: metrics.approvedSales || [],
  }), [metrics]);

  const gridLayouts = React.useMemo(() => {
    if (!currentTab) return { lg: [] };
    return {
      lg: currentTab.widgets.map(w => ({
        i: w.i,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: w.minW || 2,
        minH: w.minH || 2,
        static: !isEditing,
      })),
    };
  }, [currentTab, isEditing]);

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Carregando dashboards...</div>;
  }

  // First time: show empty state
  if (localTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <LayoutGrid className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Crie seu Dashboard Personalizado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Monte seu próprio painel arrastando widgets de KPIs, gráficos e tabelas — como no Power BI.
        </p>
        <Button onClick={handleAddTab} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Criar Primeiro Painel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard Personalizado</h1>
          <p className="text-sm text-muted-foreground">{project?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} strategy={project?.strategy} project={project} />
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
            {isEditing ? "Bloquear" : "Editar"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {localTabs.map(tab => (
          <div key={tab.id} className="flex items-center gap-0.5 shrink-0">
            {renamingTab === tab.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRenameTab(tab.id)}
                  className="h-8 w-32 text-sm"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRenameTab(tab.id)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => {
                  if (isEditing) {
                    setRenamingTab(tab.id);
                    setRenameValue(tab.tab_name);
                  }
                }}
                className="text-xs"
              >
                {tab.tab_name}
              </Button>
            )}
            {isEditing && localTabs.length > 1 && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteTab(tab.id)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {isEditing && (
          <Button variant="outline" size="sm" onClick={handleAddTab} className="text-xs shrink-0">
            <Plus className="h-3 w-3 mr-1" />
            Nova Aba
          </Button>
        )}
      </div>

      {/* Widget catalog */}
      {isEditing && (
        <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Biblioteca de Widgets</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(["kpi", "chart", "table"] as const).map(cat => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold mb-2 capitalize">
                    {cat === "kpi" ? "📊 KPIs" : cat === "chart" ? "📈 Gráficos" : "📋 Tabelas"}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {WIDGET_CATALOG.filter(w => w.category === cat).map(w => (
                      <Button
                        key={w.type}
                        variant="outline"
                        className="justify-start h-auto py-2 px-3 text-left"
                        onClick={() => handleAddWidget(w.type)}
                      >
                        <span className="mr-2">{w.icon}</span>
                        <span className="text-xs">{w.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Grid */}
      {currentTab && currentTab.widgets.length > 0 ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={gridLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          compactType="vertical"
          margin={[12, 12]}
        >
          {currentTab.widgets.map(widget => (
            <div key={widget.i}>
              <Card className="h-full overflow-hidden relative group">
                {isEditing && (
                  <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="widget-drag-handle cursor-grab p-1 rounded hover:bg-muted">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleRemoveWidget(widget.i)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
                <div className="h-full p-2">
                  <WidgetRenderer type={widget.type} metrics={metricsData} />
                </div>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : currentTab ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Este painel está vazio. Clique em "Adicionar Widget" para começar.</p>
        </div>
      ) : null}
    </div>
  );
}
