import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { calculateMealVoucher } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function WorkDaysPage() {
  const { employees, workDays, addWorkDay, deleteWorkDay } = useEmployeeData();
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);
  
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: '', worked: true, interior: false, absenceType: '', absenceReason: '', absenceNotes: '' });

  const filtered = useMemo(() => {
    return workDays
      .filter(w => w.date.startsWith(filterMonth))
      .filter(w => filterEmployee === 'all' || w.employeeId === filterEmployee)
      .sort((a, b) => b.date.localeCompare(a.date) || a.employeeId.localeCompare(b.employeeId));
  }, [workDays, filterMonth, filterEmployee]);

  const totalVoucher = useMemo(() => filtered.reduce((s, w) => s + w.mealVoucherValue, 0), [filtered]);
  const justifiedCount = useMemo(() => filtered.filter(w => w.absenceType === 'falta_justificada').length, [filtered]);

  const handleSubmit = () => {
    if (!form.employeeId || !form.date) { toast.error('Selecione colaborador e data.'); return; }
    const exists = workDays.find(w => w.employeeId === form.employeeId && w.date === form.date);
    if (exists) { toast.error('Já existe registro para este colaborador nesta data.'); return; }
    if (form.absenceType === 'falta_justificada' && !form.absenceReason) { toast.error('Informe o motivo da falta justificada.'); return; }
    addWorkDay({
      ...form,
      worked: form.absenceType === 'falta_justificada' ? false : form.worked,
    });
    toast.success(form.absenceType === 'falta_justificada' ? 'Falta justificada registrada.' : 'Dia registrado.');
    setOpen(false);
    setForm({ employeeId: '', date: '', worked: true, interior: false, absenceType: '', absenceReason: '', absenceNotes: '' });
  };

  // Batch add for a date
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState('');
  const [batchEntries, setBatchEntries] = useState<Record<string, { worked: boolean; interior: boolean }>>({});

  const initBatch = () => {
    const entries: Record<string, { worked: boolean; interior: boolean }> = {};
    activeEmployees.forEach(e => { entries[e.id] = { worked: true, interior: false }; });
    setBatchEntries(entries);
    setBatchDate(new Date().toISOString().slice(0, 10));
    setBatchOpen(true);
  };

  const handleBatchSubmit = () => {
    if (!batchDate) { toast.error('Selecione a data.'); return; }
    let count = 0;
    Object.entries(batchEntries).forEach(([empId, entry]) => {
      const exists = workDays.find(w => w.employeeId === empId && w.date === batchDate);
      if (!exists) {
        addWorkDay({ employeeId: empId, date: batchDate, worked: entry.worked, interior: entry.interior, absenceType: '', absenceReason: '', absenceNotes: '' });
        count++;
      }
    });
    toast.success(`${count} registros adicionados.`);
    setBatchOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Dias Trabalhados</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={initBatch}>Registro em Lote</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Registro Individual</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Registrar Dia</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="label-caps mb-1 block">Colaborador</label>
                  <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="label-caps mb-1 block">Data</label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                
                <div>
                  <label className="label-caps mb-1 block">Tipo de Registro</label>
                  <Select value={form.absenceType || 'presenca'} onValueChange={v => setForm(f => ({ ...f, absenceType: v === 'presenca' ? '' : v, worked: v === 'presenca' ? f.worked : false }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presenca">Presença Normal</SelectItem>
                      <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.absenceType === 'falta_justificada' ? (
                  <>
                    <div>
                      <label className="label-caps mb-1 block">Motivo *</label>
                      <Input value={form.absenceReason} onChange={e => setForm(f => ({ ...f, absenceReason: e.target.value }))} placeholder="Ex: consulta médica, exames..." />
                    </div>
                    <div>
                      <label className="label-caps mb-1 block">Observações</label>
                      <Textarea value={form.absenceNotes} onChange={e => setForm(f => ({ ...f, absenceNotes: e.target.value }))} placeholder="Detalhes adicionais..." rows={2} />
                    </div>
                    <div className="bg-warning/10 rounded-lg p-3 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      Falta justificada — sem desconto e sem vale alimentação.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.worked} onCheckedChange={c => setForm(f => ({ ...f, worked: !!c }))} />
                        Trabalhou
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.interior} onCheckedChange={c => setForm(f => ({ ...f, interior: !!c }))} />
                        Interior (sem VA)
                      </label>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      Vale alimentação: <strong>{formatCurrency(calculateMealVoucher(form.worked, form.interior))}</strong>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit}>Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Batch Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registro em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="label-caps mb-1 block">Data</label><Input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} /></div>
            <div className="space-y-2">
              {activeEmployees.map(emp => {
                const entry = batchEntries[emp.id] || { worked: true, interior: false };
                return (
                  <div key={emp.id} className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm font-medium">{emp.name}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={entry.worked} onCheckedChange={c => setBatchEntries(prev => ({ ...prev, [emp.id]: { ...entry, worked: !!c } }))} />
                        Trabalhou
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={entry.interior} onCheckedChange={c => setBatchEntries(prev => ({ ...prev, [emp.id]: { ...entry, interior: !!c } }))} />
                        Interior
                      </label>
                      <span className="text-xs w-16 text-right font-medium">{formatCurrency(calculateMealVoucher(entry.worked, entry.interior))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancelar</Button>
            <Button onClick={handleBatchSubmit}>Salvar Todos</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" />
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-4 ml-auto">
          <div className="bg-card rounded-lg px-4 py-2 shadow-xs text-sm">
            Total VA: <strong className="ml-1">{formatCurrency(totalVoucher)}</strong>
          </div>
          {justifiedCount > 0 && (
            <div className="bg-warning/10 rounded-lg px-4 py-2 text-sm text-warning">
              Faltas justificadas: <strong className="ml-1">{justifiedCount}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Data</th>
                <th className="label-caps text-left px-6 py-3">Colaborador</th>
                <th className="label-caps text-center px-6 py-3">Status</th>
                <th className="label-caps text-center px-6 py-3">Interior</th>
                <th className="label-caps text-left px-6 py-3">Motivo</th>
                <th className="label-caps text-right px-6 py-3">Vale Alimentação</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const emp = employees.find(e => e.id === w.employeeId);
                const isJustified = w.absenceType === 'falta_justificada';
                return (
                  <tr key={w.id} className={`border-b border-border hover:bg-row-hover transition-colors duration-150 ${isJustified ? 'bg-warning/5' : ''}`}>
                    <td className="px-6 py-4 text-sm">{formatDate(w.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium">{emp?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      {isJustified ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                          <AlertCircle className="w-3 h-3" />Falta Just.
                        </span>
                      ) : w.worked ? '✓' : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">{!isJustified && w.interior ? '✓' : '—'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">{isJustified ? w.absenceReason : '—'}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(w.mealVoucherValue)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { deleteWorkDay(w.id); toast.success('Registro removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-meta">Nenhum registro encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
