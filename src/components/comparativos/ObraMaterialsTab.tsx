import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Upload, Search, ArrowUp, ArrowDown, ArrowUpDown, Link2, Unlink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface ObraMaterial {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  price: number;
  purchase_group: string;
  linked_group_id: string | null;
}

interface ComparisonGroup {
  id: string;
  code: string;
  description: string;
}

interface Props {
  materials: ObraMaterial[];
  groups: ComparisonGroup[];
  onImport: (items: Omit<ObraMaterial, "id" | "linked_group_id">[]) => void;
  onUpdateGroup: (id: string, group: string) => void;
  onToggleLink: (id: string, linked: boolean, groupId: string | null) => void;
  onRemove: (id: string) => void;
}

const BASE_PURCHASE_GROUPS = [
  "HIDRÁULICA", "ELÉTRICA", "CONSTRUÇÃO", "GALVANIZADOS", "PINTURA",
  "FERRAGENS", "MADEIRAS", "IMPERMEABILIZAÇÃO", "LOUÇAS E METAIS", "DIVERSOS",
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type SortKey = "code" | "description" | "unit" | "quantity" | "price" | "purchase_group";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
    : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
}

type BatchAction = "link-all" | "unlink-all";

export function ObraMaterialsTab({ materials, groups, onImport, onUpdateGroup, onToggleLink, onRemove }: Props) {
  const [filter, setFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [confirmAction, setConfirmAction] = useState<BatchAction | null>(null);

  const PURCHASE_GROUPS = useMemo(() => {
    const extraGroups = groups
      .map((g) => g.description.toUpperCase())
      .filter((d) => d && !BASE_PURCHASE_GROUPS.includes(d));
    return [...BASE_PURCHASE_GROUPS, ...extraGroups];
  }, [groups]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) return;

      const header = rows[0].map((h: any) => String(h || "").toLowerCase().trim());
      const codeIdx = header.findIndex((h) => /^(c[oó]d|item|código)/.test(h));
      const descIdx = header.findIndex((h) => /^(desc|material|servi[cç]o|resumo)/.test(h));
      const unitIdx = header.findIndex((h) => /^(un|ud|unid)/.test(h));
      const qtyIdx = header.findIndex((h) => /^(qt|quant)/.test(h));
      const priceIdx = header.findIndex((h) => /^(pre[cç]o|valor|p\.?\s?unit|unit[aá]rio|vlr)/.test(h));

      if (descIdx < 0) return;

      const items: Omit<ObraMaterial, "id" | "linked_group_id">[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const desc = String(r[descIdx] ?? "").trim();
        if (!desc) continue;
        items.push({
          code: codeIdx >= 0 ? String(r[codeIdx] ?? "") : String(i),
          description: desc,
          unit: unitIdx >= 0 ? String(r[unitIdx] ?? "UN") : "UN",
          quantity: qtyIdx >= 0 ? Number(r[qtyIdx]) || 0 : 0,
          price: priceIdx >= 0 ? Number(r[priceIdx]) || 0 : 0,
          purchase_group: "",
        });
      }
      onImport(items);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const filtered = useMemo(() => {
    let result = materials.filter((m) => {
      const text = filter.toLowerCase();
      const matchText = !text || m.code.toLowerCase().includes(text) || m.description.toLowerCase().includes(text);
      const matchGroup = groupFilter === "all" || m.purchase_group === groupFilter;
      return matchText && matchGroup;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        let cmp = 0;
        if (typeof valA === "number" && typeof valB === "number") {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [materials, filter, groupFilter, sortKey, sortDir]);

  const executeBatchAction = useCallback(async (action: BatchAction) => {
    const isLink = action === "link-all";
    let count = 0;

    // Process sequentially so group creation is shared across materials with same purchase_group
    for (const m of filtered) {
      if (!m.purchase_group) continue;
      const alreadyLinked = !!m.linked_group_id;
      if (isLink && alreadyLinked) continue;
      if (!isLink && !alreadyLinked) continue;

      const matchingGroup = groups.find((g) =>
        g.description.toUpperCase() === m.purchase_group.toUpperCase()
      );
      await onToggleLink(m.id, isLink, matchingGroup?.id ?? null);
      count++;
    }

    if (count > 0) {
      toast.success(`${count} ${count === 1 ? "item" : "itens"} ${isLink ? "vinculados" : "desvinculados"} com sucesso`);
    } else {
      toast.info("Nenhum item alterado");
    }

    setConfirmAction(null);
  }, [filtered, groups, onToggleLink]);

  const confirmLabel = confirmAction === "link-all"
    ? `Vincular todos os ${filtered.length} itens filtrados?`
    : confirmAction === "unlink-all"
    ? `Desvincular todos os ${filtered.length} itens filtrados?`
    : "";

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📋 Fornecimentos da Obra</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar..."
              className="h-7 w-48 pl-7 text-xs"
            />
          </div>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue placeholder="Todos os grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {PURCHASE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs pointer-events-none">
              <Upload className="h-3 w-3" /> Importar Excel
            </Button>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="w-16 px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("code")}>
                Código <SortIcon active={sortKey === "code"} dir={sortDir} />
              </th>
              <th className="w-12 px-2 py-1.5 text-center font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("unit")}>
                Ud <SortIcon active={sortKey === "unit"} dir={sortDir} />
              </th>
              <th className="min-w-[200px] px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("description")}>
                Resumo <SortIcon active={sortKey === "description"} dir={sortDir} />
              </th>
              <th className="w-16 px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("quantity")}>
                Qtd <SortIcon active={sortKey === "quantity"} dir={sortDir} />
              </th>
              <th className="w-20 px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("price")}>
                Preço <SortIcon active={sortKey === "price"} dir={sortDir} />
              </th>
              <th className="w-40 px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("purchase_group")}>
                Grupo de Compras <SortIcon active={sortKey === "purchase_group"} dir={sortDir} />
              </th>
              <th className="w-20 px-2 py-1.5 text-center font-semibold text-muted-foreground">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      Vinculado <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={() => setConfirmAction("link-all")} className="gap-2 text-xs">
                      <Link2 className="h-3.5 w-3.5" /> Vincular todos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirmAction("unlink-all")} className="gap-2 text-xs">
                      <Unlink className="h-3.5 w-3.5" /> Desvincular todos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const matchingGroup = groups.find((g) =>
                g.description.toUpperCase().includes(m.purchase_group.toUpperCase()) && m.purchase_group
              );
              return (
                <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-2 py-1 font-medium">{m.code}</td>
                  <td className="px-2 py-1 text-center">{m.unit}</td>
                  <td className="px-2 py-1" title={m.description}>
                    <span className="line-clamp-1">{m.description}</span>
                  </td>
                  <td className="px-2 py-1 text-right">{fmt(m.quantity)}</td>
                  <td className="px-2 py-1 text-right">{fmt(m.price)}</td>
                  <td className="px-2 py-1">
                    <Select
                      value={m.purchase_group || "none"}
                      onValueChange={(v) => onUpdateGroup(m.id, v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhum —</SelectItem>
                        {PURCHASE_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <Checkbox
                      checked={!!m.linked_group_id}
                      onCheckedChange={(checked) =>
                        onToggleLink(m.id, !!checked, matchingGroup?.id ?? null)
                      }
                      disabled={!m.purchase_group}
                    />
                  </td>
                  <td className="px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {materials.length === 0 ? "Importe uma planilha de materiais da obra" : "Nenhum item encontrado"}
          </p>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação em lote</AlertDialogTitle>
            <AlertDialogDescription>{confirmLabel}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && executeBatchAction(confirmAction)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
