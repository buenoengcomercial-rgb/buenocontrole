import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, CheckCircle2, Circle, ClipboardList } from "lucide-react";

interface ComparisonGroup {
  id: string;
  code: string;
  description: string;
  date: string;
  project_id: string | null;
  status: string;
  observations: string;
}

interface Project {
  id: string;
  name: string;
}

interface Props {
  groups: ComparisonGroup[];
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (description: string, projectId: string | null) => void;
  onRemove: (id: string) => void;
  onToggleStatus: (id: string) => void;
  cadastrados?: string[];
  onAddFromCadastrado?: (desc: string) => void;
}

export function ComparisonGroupList({ groups, projects, selectedId, onSelect, onAdd, onRemove, onToggleStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [projectId, setProjectId] = useState<string>("none");

  const handleAdd = () => {
    if (!desc.trim()) return;
    onAdd(desc.trim(), projectId === "none" ? null : projectId);
    setDesc("");
    setProjectId("none");
    setOpen(false);
  };

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comparativos</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Comparativo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Comparativo de TINTAS E SOLVENTES" />
              </div>
              <div>
                <label className="text-sm font-medium">Obra Vinculada</label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma obra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd}>Criar</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "calc(6 * 28px + 29px)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="w-8 px-2 py-1.5"></th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Código</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Descrição</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Obra</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Data</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const project = projects.find((p) => p.id === g.project_id);
              const isSelected = selectedId === g.id;
              return (
                <tr
                  key={g.id}
                  onClick={() => onSelect(g.id)}
                  className={`cursor-pointer border-b border-border transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(g.id); }}
                      className="hover:opacity-70"
                      title={g.status === "finalizada" ? "Marcar como aberta" : "Marcar como finalizada"}
                    >
                      {g.status === "finalizada" ? (
                        <CheckCircle2 className={`h-3.5 w-3.5 ${isSelected ? "text-primary-foreground" : "text-savings"}`} />
                      ) : (
                        <Circle className={`h-3.5 w-3.5 ${isSelected ? "text-primary-foreground/60" : "text-muted-foreground/50"}`} />
                      )}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-medium">{g.code}</td>
                  <td className="px-2 py-1.5">{g.description}</td>
                  <td className={`px-2 py-1.5 ${isSelected ? "" : "text-muted-foreground"}`}>{project?.name || "—"}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    {new Date(g.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-5 w-5 p-0 ${
                        isSelected ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive"
                      }`}
                      onClick={(e) => { e.stopPropagation(); onRemove(g.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {groups.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">Nenhum comparativo criado</p>
        )}
      </div>
    </div>
  );
}
