import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatDate } from '@/lib/format';
import { isVacationDueSoon } from '@/types/safety';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Vacation } from '@/types/safety';

export default function FeriasPage() {
  const { employees } = useEmployeeData();
  const { vacations, addVacation, updateVacation, deleteVacation } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', startDate: '', endDate: '', status: 'em_ferias' as Vacation['status'] });

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';

  const handleOpen = (v?: Vacation) => {
    if (v) {
      setEditId(v.id);
      setForm({ employeeId: v.employeeId, startDate: v.startDate, endDate: v.endDate, status: v.status });
    } else {
      setEditId(null);
      setForm({ employeeId: '', startDate: '', endDate: '', status: 'em_ferias' });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.startDate || !form.endDate) { toast.error('Preencha todos os campos.'); return; }
    if (editId) {
      const existing = vacations.find(v => v.id === editId)!;
      updateVacation({ ...existing, ...form });
      toast.success('Férias atualizadas.');
    } else {
      addVacation(form);
      toast.success('Férias registradas.');
    }
    setOpen(false);
  };

  // Alerts: employees with vacations due soon
  const alerts = useMemo(() =>
    employees.filter(e => e.status === 'ativo').map(e => {
      const info = isVacationDueSoon(e.admissionDate);
      return { employee: e, ...info };
    }).filter(a => a.due),
    [employees]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Controle de Férias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Registrar Férias</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Registrar'} Férias</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="label-caps mb-1 block">Colaborador</label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'ativo').map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Data Início</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Data Término</label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label-caps mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Vacation['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_ferias">Em Férias</SelectItem>
                    <SelectItem value="concluidas">Concluídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editId ? 'Salvar' : 'Registrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-warning font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            Férias próximas de vencer
          </div>
          {alerts.map(a => (
            <p key={a.employee.id} className="text-sm text-foreground">
              <span className="font-medium">{a.employee.name}</span> — {a.daysLeft} dias para o vencimento das férias
            </p>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Colaborador</th>
                <th className="label-caps text-left px-6 py-3">Início</th>
                <th className="label-caps text-left px-6 py-3">Término</th>
                <th className="label-caps text-left px-6 py-3">Status</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vacations.map(v => (
                <tr key={v.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium">{empName(v.employeeId)}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(v.startDate)}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(v.endDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v.status === 'em_ferias' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                      {v.status === 'em_ferias' ? 'Em Férias' : 'Concluídas'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpen(v)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { deleteVacation(v.id); toast.success('Férias removidas.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {vacations.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-meta">Nenhuma férias registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
