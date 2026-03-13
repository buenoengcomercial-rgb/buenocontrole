import { useState } from 'react';
import { useAppData } from '@/context/AppContext';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material } from '@/types';
import { UNITS, MATERIAL_CATEGORIES } from '@/types';

const emptyForm = { name: '', description: '', unit: '', category: '', notes: '' };

export default function MaterialsPage() {
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useAppData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (m: Material) => { setEditing(m); setForm({ name: m.name, description: m.description, unit: m.unit, category: m.category, notes: m.notes }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateMaterial({ ...editing, ...form });
    } else {
      addMaterial(form);
    }
    setDialogOpen(false);
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1>Materiais</h1>
        <Button onClick={openNew} className="shadow-xs hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all duration-150">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Material
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 shadow-input focus:shadow-input-focus" />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Nome</th>
                <th className="label-caps text-left px-6 py-3 hidden md:table-cell">Categoria</th>
                <th className="label-caps text-left px-6 py-3 hidden lg:table-cell">Unidade</th>
                <th className="label-caps text-left px-6 py-3 hidden lg:table-cell">Descrição</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium">{m.name}</td>
                  <td className="px-6 py-4 text-sm hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-muted text-xs font-medium">{m.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell text-muted-foreground">{m.unit}</td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell text-muted-foreground truncate max-w-[200px]">{m.description}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-muted transition-colors duration-150">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteMaterial(m.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors duration-150">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-meta">Nenhum material encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Material' : 'Novo Material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome do Material *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
            </div>
            <div>
              <Label>Descrição Detalhada</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={v => set('unit', v)}>
                  <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="shadow-xs hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all duration-150">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
