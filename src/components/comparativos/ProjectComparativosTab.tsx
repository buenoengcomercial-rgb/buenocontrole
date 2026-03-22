import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComparisonGroupList } from "@/components/comparativos/ComparisonGroupList";
import { SuppliersPanel, type SupplierData } from "@/components/comparativos/SuppliersPanel";
import { ItemsTable, type ItemData, type ItemPrice } from "@/components/comparativos/ItemsTable";
import { CotacaoAnalysis } from "@/components/comparativos/CotacaoAnalysis";
import { PriceHistoryPanel } from "@/components/comparativos/PriceHistoryPanel";
import { PurchaseOrderDialog } from "@/components/comparativos/PurchaseOrderDialog";
import { OptimizedPurchasePlan } from "@/components/comparativos/OptimizedPurchasePlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart3, Table, History, FileText, Zap, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import type { ImportRow } from "@/components/comparativos/ImportItemsDialog";

interface ComparisonGroup {
  id: string;
  code: string;
  description: string;
  date: string;
  project_id: string | null;
  status: string;
  observations: string;
}
interface HistoryEntry { id: string; item_code: string; item_description: string; supplier_name: string; price: number; date: string; comparison_id: string | null; }

const CADASTRADOS = [
  "HIDRANTE", "SPDA", "ALARME", "SINALIZAÇÃO", "LUMINÁRIA", "EXTINTOR",
  "BOMBA-COMANDO", "CIVIL", "ELÉTRICA", "HIDRÁULICA", "FERRAMENTAS",
  "SERRALHERIA", "PORTAS", "REPAROS",
];

interface Props {
  projectId: string;
  projectName: string;
}

export function ProjectComparativosTab({ projectId, projectName }: Props) {
  const [groups, setGroups] = useState<ComparisonGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [prices, setPrices] = useState<ItemPrice[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("purchase_comparisons").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (data) setGroups(data.map((g: any) => ({ id: g.id, code: g.code, description: g.description, date: g.date, project_id: g.project_id, status: g.status || "aberta", observations: g.observations || "" })));
      setLoading(false);
    };
    load();
  }, [projectId]);

  const loadGroupData = useCallback(async (groupId: string) => {
    const [sRes, iRes, hRes] = await Promise.all([
      supabase.from("comparison_suppliers").select("*").eq("comparison_id", groupId).order("created_at"),
      supabase.from("comparison_items").select("*").eq("comparison_id", groupId).order("created_at"),
      supabase.from("price_history").select("*").eq("comparison_id", groupId).order("date", { ascending: false }),
    ]);
    const sups = sRes.data || [];
    const itms = iRes.data || [];
    setSuppliers(sups.map((s) => ({ id: s.id, name: s.name, delivery_days: s.delivery_days, rating: s.rating })));
    setItems(itms.map((i) => ({ id: i.id, code: i.code, description: i.description, unit: i.unit, quantity: i.quantity, base_price: i.base_price })));
    setHistory((hRes.data || []).map((h) => ({ id: h.id, item_code: h.item_code, item_description: h.item_description, supplier_name: h.supplier_name, price: h.price, date: h.date, comparison_id: h.comparison_id })));
    if (itms.length > 0) {
      const itemIds = itms.map((i) => i.id);
      const { data: pricesData } = await supabase.from("comparison_item_prices").select("*").in("item_id", itemIds);
      setPrices((pricesData || []).map((p) => ({ item_id: p.item_id, supplier_id: p.supplier_id, price: p.price })));
    } else { setPrices([]); }
  }, []);

  useEffect(() => {
    if (selectedId) { loadGroupData(selectedId); }
    else { setSuppliers([]); setItems([]); setPrices([]); setHistory([]); }
  }, [selectedId, loadGroupData]);

  const addGroup = async (description: string, _projectId: string | null) => {
    const code = `CMP${String(groups.length + 1).padStart(4, "0")}`;
    const { data, error } = await supabase.from("purchase_comparisons").insert({ code, description, project_id: projectId }).select().single();
    if (error) { toast.error("Erro ao criar comparativo"); return; }
    if (data) { setGroups((prev) => [{ id: data.id, code: data.code, description: data.description, date: data.date, project_id: data.project_id, status: (data as any).status || "aberta", observations: (data as any).observations || "" }, ...prev]); setSelectedId(data.id); }
  };

  const removeGroup = async (id: string) => {
    await supabase.from("purchase_comparisons").delete().eq("id", id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleStatus = async (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (!group) return;
    const newStatus = group.status === "finalizada" ? "aberta" : "finalizada";
    await supabase.from("purchase_comparisons").update({ status: newStatus } as any).eq("id", id);
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, status: newStatus } : g));
  };

  const addGroupFromCadastrado = async (description: string) => {
    const exists = groups.find((g) => g.description.toUpperCase() === description.toUpperCase());
    if (exists) { toast.info(`Comparativo "${description}" já existe`); setSelectedId(exists.id); return; }
    await addGroup(description, projectId);
  };

  const addSupplier = async (name: string, deliveryDays: number, rating: number) => {
    if (!selectedId) return;
    const { data, error } = await supabase.from("comparison_suppliers").insert({ comparison_id: selectedId, name, delivery_days: deliveryDays, rating }).select().single();
    if (error) { toast.error("Erro ao adicionar fornecedor"); return; }
    if (data) setSuppliers((prev) => [...prev, { id: data.id, name: data.name, delivery_days: data.delivery_days, rating: data.rating }]);
  };

  const removeSupplier = async (id: string) => {
    await supabase.from("comparison_suppliers").delete().eq("id", id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setPrices((prev) => prev.filter((p) => p.supplier_id !== id));
  };

  const addItem = async (code: string, description: string, unit: string, quantity: number, basePrice: number) => {
    if (!selectedId) return;
    const { data, error } = await supabase.from("comparison_items").insert({ comparison_id: selectedId, code, description, unit, quantity, base_price: basePrice }).select().single();
    if (error) { toast.error("Erro ao adicionar item"); return; }
    if (data) setItems((prev) => [...prev, { id: data.id, code: data.code, description: data.description, unit: data.unit, quantity: data.quantity, base_price: data.base_price }]);
  };

  const removeItem = async (id: string) => {
    await supabase.from("comparison_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setPrices((prev) => prev.filter((p) => p.item_id !== id));
  };

  const updatePrice = async (itemId: string, supplierId: string, price: number) => {
    const existing = prices.find((p) => p.item_id === itemId && p.supplier_id === supplierId);
    if (existing) { await supabase.from("comparison_item_prices").update({ price }).eq("item_id", itemId).eq("supplier_id", supplierId); }
    else { await supabase.from("comparison_item_prices").insert({ item_id: itemId, supplier_id: supplierId, price }); }
    setPrices((prev) => {
      const idx = prev.findIndex((p) => p.item_id === itemId && p.supplier_id === supplierId);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], price }; return next; }
      return [...prev, { item_id: itemId, supplier_id: supplierId, price }];
    });
    if (price > 0 && selectedId) {
      const item = items.find((i) => i.id === itemId);
      const supplier = suppliers.find((s) => s.id === supplierId);
      if (item && supplier) {
        await supabase.from("price_history").insert({ comparison_id: selectedId, item_code: item.code, item_description: item.description, supplier_name: supplier.name, price });
        setHistory((prev) => [{ id: crypto.randomUUID(), item_code: item.code, item_description: item.description, supplier_name: supplier.name, price, date: new Date().toISOString(), comparison_id: selectedId }, ...prev]);
      }
    }
  };

  const importItems = async (rows: ImportRow[]) => {
    if (!selectedId) return;
    const inserts = rows.map((r) => ({ comparison_id: selectedId, code: r.code || String(items.length + 1), description: r.description.trim(), unit: r.unit.trim() || "UN", quantity: Number(r.quantity.replace(",", ".")) || 1, base_price: Number(r.price.replace(",", ".")) || 0 }));
    const { data, error } = await supabase.from("comparison_items").insert(inserts).select();
    if (error) { toast.error("Erro ao importar itens"); return; }
    if (data) { setItems((prev) => [...prev, ...data.map((i) => ({ id: i.id, code: i.code, description: i.description, unit: i.unit, quantity: i.quantity, base_price: i.base_price }))]); toast.success(`${data.length} itens importados`); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Carregando...</div>;

  const projectsForList = [{ id: projectId, name: projectName }];

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ minHeight: "70vh" }}>
      <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
        <div className="rounded bg-primary px-2 py-0.5"><span className="text-xs font-bold text-primary-foreground">CMP</span></div>
        <h2 className="text-sm font-bold">Comparativos — {projectName}</h2>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" /> Cadastrados
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            {CADASTRADOS.map((cat) => (
              <DropdownMenuItem key={cat} onClick={() => addGroupFromCadastrado(cat)}>
                {cat}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {selected && (
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setOrderDialogOpen(true)}>
            <FileText className="h-3.5 w-3.5" /> Gerar Pedido de Compra
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-[3] overflow-hidden">
        <div className="w-[520px] flex-shrink-0 overflow-hidden">
          <ComparisonGroupList
            groups={groups}
            projects={projectsForList}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={addGroup}
            onRemove={removeGroup}
            onToggleStatus={toggleStatus}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <SuppliersPanel suppliers={suppliers} onAdd={addSupplier} onRemove={removeSupplier} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Selecione um comparativo
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="min-h-0 flex-[5] overflow-hidden">
          <Tabs defaultValue="fornecimentos" className="flex h-full flex-col">
            <div className="flex items-center border-t border-border bg-card px-3">
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger value="fornecimentos" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Table className="h-3 w-3" /> Fornecimentos
                </TabsTrigger>
                <TabsTrigger value="analise" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <BarChart3 className="h-3 w-3" /> Análise de Cotação
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <History className="h-3 w-3" /> Histórico de Preços
                </TabsTrigger>
                <TabsTrigger value="otimizado" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Zap className="h-3 w-3" /> Plano de Compras Otimizado
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="fornecimentos" className="mt-0 flex-1 overflow-auto">
              <ItemsTable items={items} suppliers={suppliers} prices={prices} onAddItem={addItem} onRemoveItem={removeItem} onUpdatePrice={updatePrice} onImportItems={importItems} />
            </TabsContent>
            <TabsContent value="analise" className="mt-0 flex-1 overflow-hidden">
              <CotacaoAnalysis items={items} suppliers={suppliers} prices={prices} />
            </TabsContent>
            <TabsContent value="historico" className="mt-0 flex-1 overflow-hidden">
              <PriceHistoryPanel history={history} />
            </TabsContent>
            <TabsContent value="otimizado" className="mt-0 flex-1 overflow-hidden">
              <OptimizedPurchasePlan items={items} suppliers={suppliers} prices={prices} groupCode={selected.code} obraName={projectName} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {selected && (
        <PurchaseOrderDialog
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
          items={items}
          suppliers={suppliers}
          prices={prices}
          groupCode={selected.code}
          obraName={projectName}
        />
      )}
    </div>
  );
}
