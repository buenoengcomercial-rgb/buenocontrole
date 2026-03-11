import { useState } from 'react';
import { useAppData } from '@/context/AppContext';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Supplier } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const emptyForm = { name: '', cnpj: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useAppData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.cnpj.includes(search)
  );

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, cnpj: s.cnpj, phone: s.phone, email: s.email, address: s.address, notes: s.notes }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateSupplier({ ...editing, ...form });
    } else {
      addSupplier(form);
    }
    setDialogOpen(false);
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1>Fornecedores</h1>
        <Button onClick={openNew} className="shadow-xs hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all duration-150">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Fornecedor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 shadow-input focus:shadow-input-focus"
        />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Nome</th>
                <th className="label-caps text-left px-6 py-3 hidden md:table-cell">CNPJ</th>
                <th className="label-caps text-left px-6 py-3 hidden lg:table-cell">Telefone</th>
                <th className="label-caps text-left px-6 py-3 hidden lg:table-cell">Email</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium">{s.name}</td>
                  <td className="px-6 py-4 text-sm hidden md:table-cell text-muted-foreground">{s.cnpj}</td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell text-muted-foreground">{s.phone}</td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell text-muted-foreground">{s.email}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-muted transition-colors duration-150">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteSupplier(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors duration-150">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-meta">Nenhum fornecedor encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" rows={3} />
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
