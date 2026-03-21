import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComparisonGroupList } from "@/components/comparativos/ComparisonGroupList";
import { SuppliersPanel, type SupplierData } from "@/components/comparativos/SuppliersPanel";
import { ItemsTable, type ItemData, type ItemPrice } from "@/components/comparativos/ItemsTable";
import { CotacaoAnalysis } from "@/components/comparativos/CotacaoAnalysis";
import { PriceHistoryPanel } from "@/components/comparativos/PriceHistoryPanel";
import { PurchaseOrderDialog } from "@/components/comparativos/PurchaseOrderDialog";
import { OptimizedPurchasePlan } from "@/components/comparativos/OptimizedPurchasePlan";
import { ObraMaterialsTab, type ObraMaterial } from "@/components/comparativos/ObraMaterialsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Table, History, FileText, LayoutDashboard, Package, Zap } from "lucide-react";
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
interface Project { id: string; name: string; }
interface HistoryEntry { id: string; item_code: string; item_description: string; supplier_name: string; price: number; date: string; comparison_id: string | null; }

export default function ComparativosPage() {
  const [groups, setGroups] = useState<ComparisonGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [prices, setPrices] = useState<ItemPrice[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [obraMaterials, setObraMaterials] = useState<ObraMaterial[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);

  const selected = groups.find((g) => g.id === selectedId) ?? null;
  const obraName = selected?.project_id ? projects.find((p) => p.id === selected.project_id)?.name || "" : "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [gRes, pRes, mRes] = await Promise.all([
        supabase.from("purchase_comparisons").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name").order("name"),
        supabase.from("obra_materials").select("*").order("created_at"),
      ]);
      if (gRes.data) setGroups(gRes.data.map((g: any) => ({ id: g.id, code: g.code, description: g.description, date: g.date, project_id: g.project_id, status: g.status || "aberta", observations: g.observations || "" })));
      if (pRes.data) setProjects(pRes.data);
      if (mRes.data) setObraMaterials(mRes.data.map((m: any) => ({ id: m.id, code: m.code, description: m.description, unit: m.unit, quantity: Number(m.quantity), price: Number(m.price), purchase_group: m.purchase_group, linked_group_id: m.linked_group_id })));
      setLoading(false);
    };
    load();
  }, []);

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

  const addGroup = async (description: string, projectId: string | null) => {
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

  // Obra materials handlers
  const importObraMaterials = async (newItems: Omit<ObraMaterial, "id" | "linked_group_id">[]) => {
    const inserts = newItems.map((m) => ({ code: m.code, description: m.description, unit: m.unit, quantity: m.quantity, price: m.price, purchase_group: m.purchase_group }));
    const { data, error } = await supabase.from("obra_materials").insert(inserts).select();
    if (error) { toast.error("Erro ao importar materiais"); return; }
    if (data) {
      setObraMaterials((prev) => [...prev, ...data.map((m: any) => ({ id: m.id, code: m.code, description: m.description, unit: m.unit, quantity: Number(m.quantity), price: Number(m.price), purchase_group: m.purchase_group, linked_group_id: m.linked_group_id }))]);
      toast.success(`${data.length} materiais importados`);
    }
  };

  // Helper: remove a material's item from its linked comparison group, and delete group if empty
  const unlinkMaterialFromGroup = async (material: ObraMaterial) => {
    if (!material.linked_group_id) return;
    const groupId = material.linked_group_id;

    // Remove matching comparison_item by code+description in that group
    await supabase.from("comparison_items")
      .delete()
      .eq("comparison_id", groupId)
      .eq("code", material.code)
      .eq("description", material.description);

    // If currently viewing this group, update items list
    if (selectedId === groupId) {
      setItems((prev) => prev.filter((i) => !(i.code === material.code && i.description === material.description)));
    }

    // Unlink the obra_material
    await supabase.from("obra_materials").update({ linked_group_id: null } as any).eq("id", material.id);
    setObraMaterials((prev) => prev.map((m) => m.id === material.id ? { ...m, linked_group_id: null } : m));

    // Check if the group still has any items
    const { count } = await supabase.from("comparison_items").select("id", { count: "exact", head: true }).eq("comparison_id", groupId);
    // Also check if any other obra_materials are still linked to this group
    const linkedCount = obraMaterials.filter((m) => m.id !== material.id && m.linked_group_id === groupId).length;

    if ((count === 0 || count === null) && linkedCount === 0) {
      // Delete comparison group (and its suppliers/prices)
      await supabase.from("comparison_suppliers").delete().eq("comparison_id", groupId);
      await supabase.from("purchase_comparisons").delete().eq("id", groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedId === groupId) {
        setSelectedId(null);
        setItems([]);
        setSuppliers([]);
        setPrices([]);
      }
    }
  };

  const updateObraMaterialGroup = async (id: string, group: string) => {
    const material = obraMaterials.find((m) => m.id === id);
    if (!material) return;

    // If was linked, unlink from old group first
    if (material.linked_group_id) {
      await unlinkMaterialFromGroup(material);
    }

    await supabase.from("obra_materials").update({ purchase_group: group } as any).eq("id", id);
    setObraMaterials((prev) => prev.map((m) => m.id === id ? { ...m, purchase_group: group, linked_group_id: null } : m));
  };

  const toggleObraMaterialLink = async (id: string, linked: boolean, _groupId: string | null) => {
    const material = obraMaterials.find((m) => m.id === id);
    if (!material) return;

    if (!linked) {
      // Unlink: remove item from fornecimento and possibly delete empty group
      await unlinkMaterialFromGroup(material);
      return;
    }

    if (!material.purchase_group) return;

    // Find or create a comparison group matching the purchase_group name
    let targetGroup = groups.find((g) => g.description.toUpperCase() === material.purchase_group.toUpperCase());

    if (!targetGroup) {
      const code = `CMP${String(groups.length + 1).padStart(4, "0")}`;
      const { data, error } = await supabase.from("purchase_comparisons").insert({ code, description: material.purchase_group, project_id: null }).select().single();
      if (error || !data) { toast.error("Erro ao criar comparativo"); return; }
      targetGroup = { id: data.id, code: data.code, description: data.description, date: data.date, project_id: data.project_id, status: (data as any).status || "aberta", observations: (data as any).observations || "" };
      setGroups((prev) => [targetGroup!, ...prev]);
    }

    // Link the material to the group
    await supabase.from("obra_materials").update({ linked_group_id: targetGroup.id } as any).eq("id", id);
    setObraMaterials((prev) => prev.map((m) => m.id === id ? { ...m, linked_group_id: targetGroup!.id } : m));

    // Add material as item in the comparison group's "Fornecimentos"
    const { data: itemData, error: itemError } = await supabase.from("comparison_items").insert({
      comparison_id: targetGroup.id,
      code: material.code,
      description: material.description,
      unit: material.unit,
      quantity: material.quantity,
      base_price: material.price,
    }).select().single();

    if (itemError) { toast.error("Erro ao adicionar item ao fornecimento"); return; }

    if (selectedId === targetGroup.id && itemData) {
      setItems((prev) => [...prev, { id: itemData.id, code: itemData.code, description: itemData.description, unit: itemData.unit, quantity: itemData.quantity, base_price: itemData.base_price }]);
    }

    toast.success(`Material vinculado ao comparativo "${targetGroup.description}"`);
  };

  const removeObraMaterial = async (id: string) => {
    await supabase.from("obra_materials").delete().eq("id", id);
    setObraMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Carregando...</div>;

  // Dashboard view
  if (showDashboard) {
    const openCount = groups.filter((g) => g.status === "aberta").length;
    const closedCount = groups.filter((g) => g.status === "finalizada").length;
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col bg-background text-foreground">
        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
          <div className="rounded bg-primary px-2 py-0.5"><span className="text-xs font-bold text-primary-foreground">CMP</span></div>
          <h2 className="text-sm font-bold">Dashboard</h2>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setShowDashboard(false)}>
            ← Voltar
          </Button>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Cotações Abertas</p>
              <p className="text-2xl font-bold text-primary">{openCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Finalizadas</p>
              <p className="text-2xl font-bold text-savings">{closedCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Comparativos</p>
              <p className="text-2xl font-bold">{groups.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Materiais da Obra</p>
              <p className="text-2xl font-bold">{obraMaterials.length}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-bold mb-3">Últimos Comparativos</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Código</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Descrição</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {groups.slice(0, 10).map((g) => (
                  <tr key={g.id} className="border-b border-border">
                    <td className="px-2 py-1.5 font-medium">{g.code}</td>
                    <td className="px-2 py-1.5">{g.description}</td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${g.status === "finalizada" ? "bg-savings/10 text-savings" : "bg-primary/10 text-primary"}`}>
                        {g.status === "finalizada" ? "Finalizada" : "Aberta"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{new Date(g.date).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
        <div className="rounded bg-primary px-2 py-0.5"><span className="text-xs font-bold text-primary-foreground">CMP</span></div>
        <h2 className="text-sm font-bold">Comparativos de Compras</h2>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setShowDashboard(true)}>
          <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
        </Button>
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
            projects={projects}
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

      <div className="min-h-0 flex-[5] overflow-hidden">
        <Tabs defaultValue="obraMaterials" className="flex h-full flex-col">
          <div className="flex items-center border-t border-border bg-card px-3">
            <TabsList className="h-8 bg-transparent p-0">
              <TabsTrigger value="obraMaterials" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Package className="h-3 w-3" /> Fornecimentos da Obra
              </TabsTrigger>
              {selected && (
                <>
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
                </>
              )}
            </TabsList>
          </div>
          <TabsContent value="obraMaterials" className="mt-0 flex-1 overflow-hidden">
            <ObraMaterialsTab
              materials={obraMaterials}
              groups={groups.map((g) => ({ id: g.id, code: g.code, description: g.description }))}
              onImport={importObraMaterials}
              onUpdateGroup={updateObraMaterialGroup}
              onToggleLink={toggleObraMaterialLink}
              onRemove={removeObraMaterial}
            />
          </TabsContent>
          {selected ? (
            <>
              <TabsContent value="fornecimentos" className="mt-0 flex-1 overflow-hidden">
                <ItemsTable items={items} suppliers={suppliers} prices={prices} onAddItem={addItem} onRemoveItem={removeItem} onUpdatePrice={updatePrice} onImportItems={importItems} />
              </TabsContent>
              <TabsContent value="analise" className="mt-0 flex-1 overflow-hidden">
                <CotacaoAnalysis items={items} suppliers={suppliers} prices={prices} />
              </TabsContent>
              <TabsContent value="historico" className="mt-0 flex-1 overflow-hidden">
                <PriceHistoryPanel history={history} />
              </TabsContent>
            </>
          ) : null}

        </Tabs>
      </div>

      {selected && (
        <PurchaseOrderDialog
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
          items={items}
          suppliers={suppliers}
          prices={prices}
          groupCode={selected.code}
          obraName={obraName}
        />
      )}
    </div>
  );
}
