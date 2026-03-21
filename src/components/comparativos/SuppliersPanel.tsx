import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Star, Users, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface SupplierData {
  id: string;
  name: string;
  delivery_days: number;
  rating: number;
}

interface Props {
  suppliers: SupplierData[];
  onAdd: (name: string, deliveryDays: number, rating: number) => void;
  onRemove: (id: string) => void;
}

function RatingStars({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= value ? "fill-highlight text-highlight" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function SuppliersPanel({ suppliers, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [registeredOpen, setRegisteredOpen] = useState(false);
  const [allSupplierNames, setAllSupplierNames] = useState<string[]>([]);
  const [regSearch, setRegSearch] = useState("");

  // Load all unique supplier names from all comparisons
  useEffect(() => {
    if (!registeredOpen) return;
    supabase
      .from("registered_suppliers" as any)
      .select("name")
      .order("name")
      .then(({ data }) => {
        if (data) {
          const names = (data as any[]).map((d) => d.name).filter(Boolean);
          setAllSupplierNames(names);
        }
      });
  }, [registeredOpen]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    // Auto-register supplier name globally
    await supabase.from("registered_suppliers" as any).upsert({ name: name.trim() } as any, { onConflict: "name" } as any);
    onAdd(name.trim(), days ? Number(days) : 0, rating || 0);
    setName("");
    setDays("");
    setRating(0);
    setOpen(false);
  };

  const handlePickRegistered = (supplierName: string) => {
    const alreadyAdded = suppliers.some((s) => s.name.toLowerCase() === supplierName.toLowerCase());
    if (alreadyAdded) return;
    onAdd(supplierName, 0, 0);
  };

  const currentNames = new Set(suppliers.map((s) => s.name.toLowerCase()));
  const filteredRegistered = allSupplierNames.filter((n) =>
    n.toLowerCase().includes(regSearch.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fornecedores</span>
        <div className="flex items-center gap-1">
          <Popover open={registeredOpen} onOpenChange={setRegisteredOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1">
                <Users className="h-3.5 w-3.5" />
                Cadastrados
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="border-b border-border p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fornecedor..."
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredRegistered.length === 0 && (
                  <p className="p-3 text-center text-xs text-muted-foreground">Nenhum fornecedor encontrado</p>
                )}
                {filteredRegistered.map((n) => {
                  const added = currentNames.has(n.toLowerCase());
                  return (
                    <button
                      key={n}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-muted transition-colors ${added ? "opacity-50" : ""}`}
                      onClick={() => handlePickRegistered(n)}
                      disabled={added}
                    >
                      <span className="truncate">{n}</span>
                      {added && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Fornecedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <label className="text-sm font-medium">Nome do Fornecedor</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: MOCELIN" />
                </div>
                <div>
                  <label className="text-sm font-medium">Prazo de Entrega (dias)</label>
                  <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Ex: 15" />
                </div>
                <div>
                  <label className="text-sm font-medium">Avaliação do Fornecedor</label>
                  <div className="flex gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button" onClick={() => setRating(i === rating ? 0 : i)}>
                        <Star className={`h-5 w-5 ${i <= rating ? "fill-highlight text-highlight" : "text-muted-foreground/40 hover:text-highlight/60"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={handleAdd}>Adicionar</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="w-12 px-2 py-1.5 text-center font-semibold text-muted-foreground">Nº</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Fornecedor</th>
              <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">Prazo</th>
              <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">Avaliação</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s, idx) => (
              <tr key={s.id} className="border-b border-border">
                <td className="px-2 py-1.5 text-center font-medium text-primary">{idx + 1}</td>
                <td className="px-2 py-1.5 font-medium">{s.name}</td>
                <td className="px-2 py-1.5 text-center text-muted-foreground">
                  {s.delivery_days ? `${s.delivery_days}d` : "—"}
                </td>
                <td className="px-2 py-1.5 flex justify-center">
                  <RatingStars value={s.rating} />
                </td>
                <td className="px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(s.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">Sem fornecedores</p>
        )}
      </div>
    </div>
  );
}
