import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { ImportItemsDialog, type ImportRow } from "./ImportItemsDialog";
import type { SupplierData } from "./SuppliersPanel";

export interface ItemData {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  base_price: number;
}

export interface ItemPrice {
  item_id: string;
  supplier_id: string;
  price: number;
}

interface Props {
  items: ItemData[];
  suppliers: SupplierData[];
  prices: ItemPrice[];
  onAddItem: (code: string, description: string, unit: string, quantity: number, basePrice: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: keyof ItemData, value: string | number) => void;
  onUpdatePrice: (itemId: string, supplierId: string, price: number) => void;
  onImportItems: (rows: ImportRow[]) => void;
}

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type SortKey = "code" | "description" | "quantity" | "unit" | "base_price" | "importance";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
    : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
}

export function ItemsTable({ items, suppliers, prices, onAddItem, onRemoveItem, onUpdateItem, onUpdatePrice, onImportItems }: Props) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [editDescValue, setEditDescValue] = useState("");
  const [editingQty, setEditingQty] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleAdd = () => {
    if (!desc || !unit || !qty) return;
    onAddItem(code || String(items.length + 1), desc, unit, Number(qty), Number(price) || 0);
    setCode(""); setDesc(""); setUnit(""); setQty(""); setPrice("");
    setOpen(false);
  };

  const startEdit = (key: string, val: number) => {
    setEditingCell(key);
    setEditValue(val ? String(val) : "");
  };

  const finishEdit = (itemId: string, supplierId: string) => {
    const val = editValue.trim() === "" ? 0 : Number(editValue);
    onUpdatePrice(itemId, supplierId, val);
    setEditingCell(null);
  };

  const getPrice = (itemId: string, supplierId: string): number => {
    return prices.find((p) => p.item_id === itemId && p.supplier_id === supplierId)?.price ?? 0;
  };

  const totalContracted = items.reduce((s, i) => s + i.base_price * i.quantity, 0);

  const supplierTotals = suppliers.map((sup) => {
    let total = 0;
    let complete = true;
    for (const item of items) {
      const p = getPrice(item.id, sup.id);
      if (p > 0) {
        total += p * item.quantity;
      } else {
        complete = false;
      }
    }
    return { supplierId: sup.id, total, complete };
  });

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "importance") {
        cmp = (a.base_price * a.quantity) - (b.base_price * b.quantity);
      } else if (sortKey === "quantity" || sortKey === "base_price") {
        cmp = a[sortKey] - b[sortKey];
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "pt-BR", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  return (
    <div className="flex flex-col border-t border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📦 Fornecimento</span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setImportOpen(true)}>
            <Upload className="h-3 w-3" />
            Importar (Excel)
          </Button>
          <Button variant="default" size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3" />
            Adicionar Item
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Item</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Código</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6011" className="h-8 text-sm" />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Descrição *</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="REGISTRO GAVETA BRUTO..." className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Unidade *</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="UN" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Quantidade *</Label>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Preço Base</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className="h-8 text-sm" />
              </div>
            </div>
          </div>
          <Button onClick={handleAdd} size="sm" disabled={!desc || !unit || !qty}>Adicionar</Button>
        </DialogContent>
      </Dialog>

      <ImportItemsDialog open={importOpen} onOpenChange={setImportOpen} onImport={onImportItems} />

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="w-16 px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("code")}>
                Código <SortIcon active={sortKey === "code"} dir={sortDir} />
              </th>
              <th className="min-w-[280px] px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("description")}>
                Resumo <SortIcon active={sortKey === "description"} dir={sortDir} />
              </th>
              <th className="w-20 px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("quantity")}>
                Quantidade <SortIcon active={sortKey === "quantity"} dir={sortDir} />
              </th>
              <th className="w-12 px-2 py-1.5 text-center font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("unit")}>
                Ud <SortIcon active={sortKey === "unit"} dir={sortDir} />
              </th>
              <th className="w-24 px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("base_price")}>
                Preço <SortIcon active={sortKey === "base_price"} dir={sortDir} />
              </th>
              <th className="w-28 px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("importance")}>
                Importância <SortIcon active={sortKey === "importance"} dir={sortDir} />
              </th>
              {suppliers.map((s, idx) => (
                <th key={s.id} colSpan={2} className="border-l border-border px-2 py-1.5 text-center font-semibold text-muted-foreground">
                  <span className="text-primary">{idx + 1}</span>
                  <span className="ml-1.5">Preço {idx + 1}</span>
                  <span className="ml-3">Importância {idx + 1}</span>
                </th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const importance = item.base_price * item.quantity;
              const supplierPricesForItem = suppliers
                .map((s) => getPrice(item.id, s.id))
                .filter((p) => p > 0);
              const minPrice = supplierPricesForItem.length > 0 ? Math.min(...supplierPricesForItem) : 0;
              const maxPrice = supplierPricesForItem.length > 0 ? Math.max(...supplierPricesForItem) : 0;
              const hasMultiple = supplierPricesForItem.length >= 2;

              return (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-2 py-1 font-medium">{item.code}</td>
                  <td className="px-2 py-1" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {editingDesc === item.id ? (
                      <textarea
                        className="w-full min-h-[28px] rounded border border-input bg-background px-1 py-0.5 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                        value={editDescValue}
                        rows={Math.max(2, Math.ceil(editDescValue.length / 60))}
                        onChange={(e) => setEditDescValue(e.target.value)}
                        onBlur={() => {
                          if (editDescValue.trim() && editDescValue.trim() !== item.description) {
                            onUpdateItem(item.id, 'description', editDescValue.trim());
                          }
                          setEditingDesc(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingDesc(null);
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (editDescValue.trim() && editDescValue.trim() !== item.description) {
                              onUpdateItem(item.id, 'description', editDescValue.trim());
                            }
                            setEditingDesc(null);
                          }
                        }}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 block text-xs leading-snug"
                        style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        onDoubleClick={() => { setEditingDesc(item.id); setEditDescValue(item.description); }}
                        title="Duplo clique para editar"
                      >
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">{fmt(item.quantity)}</td>
                  <td className="px-2 py-1 text-center">{item.unit}</td>
                  <td className="px-2 py-1 text-right font-medium">{fmt(item.base_price)}</td>
                  <td className="px-2 py-1 text-right font-medium">{fmt(importance)}</td>
                  {suppliers.map((s) => {
                    const unitPrice = getPrice(item.id, s.id);
                    const supImportance = unitPrice > 0 ? unitPrice * item.quantity : 0;
                    const cellKey = `${item.id}-${s.id}`;
                    const isCheapest = hasMultiple && unitPrice > 0 && unitPrice === minPrice;
                    const isMostExpensive = hasMultiple && unitPrice > 0 && unitPrice === maxPrice && minPrice !== maxPrice;

                    return (
                      <td key={s.id} colSpan={2} className="border-l border-border px-1 py-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 text-right">
                            {editingCell === cellKey ? (
                              <Input
                                type="number" step="0.01" value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => finishEdit(item.id, s.id)}
                                onKeyDown={(e) => e.key === "Enter" && finishEdit(item.id, s.id)}
                                className="h-5 w-20 text-right text-xs" autoFocus
                              />
                            ) : (
                              <button
                                className={`w-full rounded px-1 py-0.5 text-right text-xs hover:bg-muted ${
                                  isCheapest ? "text-savings font-semibold" : isMostExpensive ? "text-destructive font-semibold" : ""
                                }`}
                                onClick={() => startEdit(cellKey, unitPrice)}
                              >
                                {unitPrice > 0 ? fmt(unitPrice) : "—"}
                              </button>
                            )}
                          </div>
                          <div className={`flex-1 text-right text-xs ${
                            isCheapest ? "text-savings font-semibold" : isMostExpensive ? "text-destructive font-semibold" : "text-muted-foreground"
                          }`}>
                            {supImportance > 0 ? fmt(supImportance) : ""}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40 font-bold">
                <td colSpan={5} className="px-2 py-1.5 text-xs">TOTAL</td>
                <td className="px-2 py-1.5 text-right text-xs text-savings">{fmt(totalContracted)}</td>
                {suppliers.map((s) => {
                  const st = supplierTotals.find((t) => t.supplierId === s.id);
                  return (
                    <td key={s.id} colSpan={2} className="border-l border-border px-2 py-1.5 text-right text-xs">
                      <div className="flex">
                        <div className="flex-1"></div>
                        <div className={`flex-1 text-right ${st && st.complete ? "text-savings" : "text-muted-foreground"}`}>
                          {st && st.complete ? fmt(st.total) : "—"}
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        {items.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Adicione itens manualmente ou importe de uma planilha</p>
        )}
      </div>
    </div>
  );
}
