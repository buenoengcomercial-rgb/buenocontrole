import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatDate, formatCurrency } from '@/lib/format';
import { isVacationDueSoon } from '@/types/safety';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, AlertTriangle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { AttachedDocuments } from '@/components/AttachedDocuments';
import type { Vacation } from '@/types/safety';

const defaultForm = {
  employeeId: '',
  startDate: '',
  endDate: '',
  status: 'em_ferias' as Vacation['status'],
  vacationValue: 0,
  bonusValue: 0,
  totalPaid: 0,
  paymentDate: '',
  notes: '',
};

export default function FeriasPage() {
  const { employees } = useEmployeeData();
  const { vacations, addVacation, updateVacation, deleteVacation } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';

  const handleOpen = (v?: Vacation) => {
    if (v) {
      setEditId(v.id);
      setForm({
        employeeId: v.employeeId,
        startDate: v.startDate,
        endDate: v.endDate,
        status: v.status,
        vacationValue: v.vacationValue,
        bonusValue: v.bonusValue,
        totalPaid: v.totalPaid,
        paymentDate: v.paymentDate,
        notes: v.notes,
      });
    } else {
      setEditId(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleVacationValueChange = (val: number) => {
    const bonus = Math.round(val / 3 * 100) / 100;
    setForm(f => ({ ...f, vacationValue: val, bonusValue: bonus, totalPaid: Math.round((val + bonus) * 100) / 100 }));
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.startDate || !form.endDate) { toast.error('Preencha todos os campos obrigatórios.'); return; }
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

  const alerts = useMemo(() =>
    employees.filter(e => e.status === 'ativo').map(e => {
      const info = isVacationDueSoon(e.admissionDate);
      return { employee: e, ...info };
    }).filter(a => a.due),
    [employees]
  );

  // Filtered vacations for reports
  const filteredVacations = useMemo(() => {
    return vacations
      .filter(v => filterEmployee === 'all' || v.employeeId === filterEmployee)
      .filter(v => !filterMonth || v.paymentDate.startsWith(filterMonth));
  }, [vacations, filterEmployee, filterMonth]);

  const totalPaidMonth = useMemo(() => filteredVacations.reduce((s, v) => s + v.totalPaid, 0), [filteredVacations]);

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) { toast.error('Sem dados para exportar.'); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(';'), ...data.map(row => headers.map(h => String(row[h] ?? '')).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Controle de Férias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Registrar Férias</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

              {/* Financial fields */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-semibold text-foreground mb-3">Controle Financeiro</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps mb-1 block">Valor das Férias (R$)</label>
                    <Input type="number" step="0.01" min="0" value={form.vacationValue || ''} onChange={e => handleVacationValueChange(Number(e.target.value))} placeholder="0,00" />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Adicional 1/3 (R$)</label>
                    <Input type="number" step="0.01" min="0" value={form.bonusValue || ''} onChange={e => setForm(f => ({ ...f, bonusValue: Number(e.target.value), totalPaid: Math.round((f.vacationValue + Number(e.target.value)) * 100) / 100 }))} placeholder="Auto" />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Valor Total Pago (R$)</label>
                    <Input type="number" step="0.01" min="0" value={form.totalPaid || ''} onChange={e => setForm(f => ({ ...f, totalPaid: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Data Pagamento</label>
                    <Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <label className="label-caps mb-1 block">Observações</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações sobre as férias..." rows={3} />
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

      <Tabs defaultValue="registros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registros">Registros</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="registros">
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="label-caps text-left px-6 py-3">Colaborador</th>
                    <th className="label-caps text-left px-6 py-3">Início</th>
                    <th className="label-caps text-left px-6 py-3">Término</th>
                    <th className="label-caps text-right px-6 py-3">Valor Férias</th>
                    <th className="label-caps text-right px-6 py-3">1/3 Adicional</th>
                    <th className="label-caps text-right px-6 py-3">Total Pago</th>
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
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(v.vacationValue)}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(v.bonusValue)}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(v.totalPaid)}</td>
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
                  {vacations.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-meta">Nenhuma férias registrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="relatorio" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="label-caps mb-1 block">Mês Pagamento</label>
              <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-[180px]" />
            </div>
            <div className="min-w-[200px]">
              <label className="label-caps mb-1 block">Colaborador</label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-card">
              <p className="label-caps mb-1">Total Férias</p>
              <p className="text-lg font-semibold">{formatCurrency(filteredVacations.reduce((s, v) => s + v.vacationValue, 0))}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <p className="label-caps mb-1">Total 1/3 Adicional</p>
              <p className="text-lg font-semibold">{formatCurrency(filteredVacations.reduce((s, v) => s + v.bonusValue, 0))}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <p className="label-caps mb-1">Total Pago</p>
              <p className="text-lg font-semibold">{formatCurrency(totalPaidMonth)}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(filteredVacations.map(v => ({
              Colaborador: empName(v.employeeId), Início: v.startDate, Término: v.endDate,
              'Valor Férias': v.vacationValue, '1/3 Adicional': v.bonusValue, 'Total Pago': v.totalPaid,
              'Data Pgto': v.paymentDate, Status: v.status === 'em_ferias' ? 'Em Férias' : 'Concluídas', Obs: v.notes,
            })), `ferias-${filterMonth || 'todos'}`)}>
              <FileDown className="w-4 h-4 mr-2" />Exportar CSV
            </Button>
          </div>

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Colaborador</th>
                  <th className="label-caps text-left px-6 py-3">Período</th>
                  <th className="label-caps text-right px-6 py-3">Valor Férias</th>
                  <th className="label-caps text-right px-6 py-3">1/3</th>
                  <th className="label-caps text-right px-6 py-3">Total Pago</th>
                  <th className="label-caps text-left px-6 py-3">Data Pgto</th>
                  <th className="label-caps text-left px-6 py-3">Obs</th>
                </tr></thead>
                <tbody>
                  {filteredVacations.map(v => (
                    <tr key={v.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium">{empName(v.employeeId)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(v.startDate)} – {formatDate(v.endDate)}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(v.vacationValue)}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(v.bonusValue)}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(v.totalPaid)}</td>
                      <td className="px-6 py-4 text-sm">{v.paymentDate ? formatDate(v.paymentDate) : '—'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">{v.notes || '—'}</td>
                    </tr>
                  ))}
                  {filteredVacations.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-meta">Nenhum registro encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
