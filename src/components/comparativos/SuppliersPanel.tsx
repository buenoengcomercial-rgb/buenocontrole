import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Star } from "lucide-react";

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

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), days ? Number(days) : 0, rating || 0);
    setName("");
    setDays("");
    setRating(0);
    setOpen(false);
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fornecedores</span>
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
