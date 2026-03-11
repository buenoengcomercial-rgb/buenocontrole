import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { PayrollCharge } from '@/types/safety';

export default function EncargosPage() {
  const { employees } = useEmployeeData();
  const { charges, addCharge, updateCharge, deleteCharge } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ employeeId: '', month: filterMonth, inssValue: 0, fgtsValue: 0 });

  const filtered = useMemo(() =>
    charges.filter(c => c.month === filterMonth),
    [charges, filterMonth]
  );

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';

  const handleOpen = (c?: PayrollCharge) => {
    if (c) {
      setEditId(c.id);
      setForm({ employeeId: c.employeeId, month: c.month, inssValue: c.inssValue, fgtsValue: c.fgtsValue });
    } else {
      setEditId(null);
      setForm({ employeeId: '', month: filterMonth, inssValue: 0, fgtsValue: 0 });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.month) { toast.error('Preencha todos os campos.'); return; }
    if (editId) {
      const existing = charges.find(c => c.id === editId)!;
      updateCharge({ ...existing, ...form });
      toast.success('Encargo atualizado.');
    } else {
      addCharge(form);
      toast.success('Encargo registrado.');
    }
    setOpen(false);
  };

  const totalINSS = filtered.reduce((s, c) => s + c.inssValue, 0);
  const totalFGTS = filtered.reduce((s, c) => s + c.fgtsValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Encargos Trabalhistas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo Encargo</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Encargo</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="label-caps mb-1 block">Colaborador</label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'ativo').map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-caps mb-1 block">Mês de Referência</label>
                <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Valor INSS</label>
                  <Input type="number" min={0} step={0.01} value={form.inssValue || ''} onChange={e => setForm(f => ({ ...f, inssValue: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Valor FGTS</label>
                  <Input type="number" min={0} step={0.01} value={form.fgtsValue || ''} onChange={e => setForm(f => ({ ...f, fgtsValue: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editId ? 'Salvar' : 'Registrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div>
          <label className="label-caps mb-1 block">Filtrar por Mês</label>
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-48" />
        </div>
        <div className="flex gap-4 mt-4 sm:mt-5">
          <div className="bg-card rounded-lg px-4 py-2 shadow-card">
            <p className="text-xs text-muted-foreground">Total INSS</p>
            <p className="text-lg font-semibold">{formatCurrency(totalINSS)}</p>
          </div>
          <div className="bg-card rounded-lg px-4 py-2 shadow-card">
            <p className="text-xs text-muted-foreground">Total FGTS</p>
            <p className="text-lg font-semibold">{formatCurrency(totalFGTS)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Colaborador</th>
                <th className="label-caps text-left px-6 py-3">Mês</th>
                <th className="label-caps text-right px-6 py-3">INSS</th>
                <th className="label-caps text-right px-6 py-3">FGTS</th>
                <th className="label-caps text-right px-6 py-3">Total</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium">{empName(c.employeeId)}</td>
                  <td className="px-6 py-4 text-sm">{c.month}</td>
                  <td className="px-6 py-4 text-sm text-right">{formatCurrency(c.inssValue)}</td>
                  <td className="px-6 py-4 text-sm text-right">{formatCurrency(c.fgtsValue)}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(c.inssValue + c.fgtsValue)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpen(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { deleteCharge(c.id); toast.success('Encargo removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-meta">Nenhum encargo registrado neste mês.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
