import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useProjectData } from '@/context/ProjectContext';
import { useSafetyData } from '@/context/SafetyContext';
import { calculateMealVoucher } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, AlertCircle, Building2, Umbrella, UserX, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const ABSENCE_TYPES = [
  { value: 'falta', label: 'Falta' },
  { value: 'atestado', label: 'Atestado' },
  { value: 'folga', label: 'Folga' },
  { value: 'falta_justificada', label: 'Falta Justificada' },
  { value: 'outro', label: 'Outro' },
];

export default function WorkDaysPage() {
  const { employees, workDays, addWorkDay, deleteWorkDay } = useEmployeeData();
  const { projects } = useProjectData();
  const { vacations } = useSafetyData();
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: '', date: '', worked: true, interior: false, projectId: '',
    absenceType: '', absenceReason: '', absenceNotes: '',
  });

  // Check if an employee is on vacation on a given date
  const isOnVacation = (employeeId: string, date: string) => {
    return vacations.find(v =>
      v.employeeId === employeeId &&
      v.status === 'em_ferias' &&
      date >= v.startDate &&
      date <= v.endDate
    );
  };

  // Filter: only show worked days (or justified absences), hide non-worked unmarked
  const filtered = useMemo(() => {
    return workDays
      .filter(w => w.date.startsWith(filterMonth))
      .filter(w => filterEmployee === 'all' || w.employeeId === filterEmployee)
      .filter(w => filterProject === 'all' || w.projectId === filterProject)
      .filter(w => w.worked || w.absenceType) // Hide records with no work and no absence type
      .sort((a, b) => b.date.localeCompare(a.date) || a.employeeId.localeCompare(b.employeeId));
  }, [workDays, filterMonth, filterEmployee, filterProject]);

  const totalVoucher = useMemo(() => filtered.reduce((s, w) => s + w.mealVoucherValue, 0), [filtered]);
  const absenceCount = useMemo(() => filtered.filter(w => !!w.absenceType).length, [filtered]);

  const handleSubmit = () => {
    if (!form.employeeId || !form.date) { toast.error('Selecione colaborador e data.'); return; }
    const exists = workDays.find(w => w.employeeId === form.employeeId && w.date === form.date);
    if (exists) { toast.error('Já existe registro para este colaborador nesta data.'); return; }

    const vacation = isOnVacation(form.employeeId, form.date);
    if (vacation) { toast.error('Colaborador está em férias nesta data.'); return; }

    if (form.absenceType && form.absenceType !== '' && !form.absenceReason) {
      toast.error('Informe o motivo da ausência.'); return;
    }

    addWorkDay({
      employeeId: form.employeeId,
      projectId: form.projectId || null,
      date: form.date,
      worked: !form.absenceType,
      interior: form.interior,
      absenceType: form.absenceType,
      absenceReason: form.absenceReason,
      absenceNotes: form.absenceNotes,
    });
    toast.success(form.absenceType ? 'Ausência registrada.' : 'Dia registrado.');
    setOpen(false);
    setForm({ employeeId: '', date: '', worked: true, interior: false, projectId: '', absenceType: '', absenceReason: '', absenceNotes: '' });
  };

  // Batch add
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState('');
  const [batchProjectId, setBatchProjectId] = useState('');
  const [batchEntries, setBatchEntries] = useState<Record<string, { worked: boolean; interior: boolean }>>({});

  const initBatch = () => {
    const entries: Record<string, { worked: boolean; interior: boolean }> = {};
    activeEmployees.forEach(e => { entries[e.id] = { worked: true, interior: false }; });
    setBatchEntries(entries);
    setBatchDate(new Date().toISOString().slice(0, 10));
    setBatchProjectId('');
    setBatchOpen(true);
  };

  const handleBatchSubmit = () => {
    if (!batchDate) { toast.error('Selecione a data.'); return; }
    let count = 0;
    Object.entries(batchEntries).forEach(([empId, entry]) => {
      const exists = workDays.find(w => w.employeeId === empId && w.date === batchDate);
      const vacation = isOnVacation(empId, batchDate);
      if (!exists && !vacation && entry.worked) {
        addWorkDay({
          employeeId: empId, projectId: batchProjectId || null, date: batchDate,
          worked: entry.worked, interior: entry.interior,
          absenceType: '', absenceReason: '', absenceNotes: '',
        });
        count++;
      }
    });
    toast.success(`${count} registros adicionados.`);
    setBatchOpen(false);
  };

  // Build vacation entries for the filtered month
  const vacationEntries = useMemo(() => {
    const entries: { employeeId: string; date: string; vacationId: string }[] = [];
    const [y, m] = filterMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    activeEmployees.forEach(emp => {
      if (filterEmployee !== 'all' && emp.id !== filterEmployee) return;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${filterMonth}-${String(d).padStart(2, '0')}`;
        const vac = isOnVacation(emp.id, dateStr);
        if (vac) {
          // Don't add if there's already a work_day record for this date
          const existing = workDays.find(w => w.employeeId === emp.id && w.date === dateStr);
          if (!existing) {
            entries.push({ employeeId: emp.id, date: dateStr, vacationId: vac.id });
          }
        }
      }
    });
    return entries;
  }, [filterMonth, activeEmployees, filterEmployee, vacations, workDays]);

  // Group by employee for card layout
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, { days: typeof filtered; vacDays: string[] }>();
    
    filtered.forEach(w => {
      const entry = map.get(w.employeeId) || { days: [], vacDays: [] };
      entry.days.push(w);
      map.set(w.employeeId, entry);
    });
    
    vacationEntries.forEach(v => {
      const entry = map.get(v.employeeId) || { days: [], vacDays: [] };
      entry.vacDays.push(v.date);
      map.set(v.employeeId, entry);
    });

    return Array.from(map.entries()).map(([empId, { days, vacDays }]) => ({
      employee: employees.find(e => e.id === empId),
      days,
      vacDays: vacDays.sort(),
      totalVoucher: days.reduce((s, d) => s + d.mealVoucherValue, 0),
      workedCount: days.filter(d => d.worked).length,
      absenceCount: days.filter(d => !!d.absenceType).length,
    })).sort((a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || ''));
  }, [filtered, employees, vacationEntries]);

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

                {form.employeeId && form.date && isOnVacation(form.employeeId, form.date) && (
                  <div className="bg-primary/10 rounded-lg p-3 text-sm flex items-center gap-2 text-primary">
                    <Umbrella className="w-4 h-4" />
                    Colaborador está em férias nesta data.
                  </div>
                )}

                <div>
                  <label className="label-caps mb-1 block">Obra</label>
                  <Select value={form.projectId || 'none'} onValueChange={v => setForm(f => ({ ...f, projectId: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem obra vinculada</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="label-caps mb-1 block">Tipo de Registro</label>
                  <Select value={form.absenceType || 'presenca'} onValueChange={v => setForm(f => ({
                    ...f,
                    absenceType: v === 'presenca' ? '' : v,
                    worked: v === 'presenca',
                  }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presenca">Presença Normal</SelectItem>
                      {ABSENCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {form.absenceType ? (
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
                      Ausência registrada — sem vale alimentação.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.interior} onCheckedChange={c => setForm(f => ({ ...f, interior: !!c }))} />
                        Interior (sem VA)
                      </label>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      Vale alimentação: <strong>{formatCurrency(calculateMealVoucher(true, form.interior))}</strong>
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
            <div>
              <label className="label-caps mb-1 block">Obra</label>
              <Select value={batchProjectId || 'none'} onValueChange={v => setBatchProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem obra vinculada</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {activeEmployees.map(emp => {
                const entry = batchEntries[emp.id] || { worked: true, interior: false };
                const vacation = batchDate ? isOnVacation(emp.id, batchDate) : null;
                return (
                  <div key={emp.id} className={`flex items-center justify-between py-2 border-b border-border ${vacation ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{emp.name}</span>
                      {vacation && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Umbrella className="w-3 h-3" />Em férias
                        </span>
                      )}
                    </div>
                    {!vacation && (
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
                    )}
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
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" />
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-4 ml-auto">
          <div className="bg-card rounded-lg px-4 py-2 shadow-xs text-sm">
            Total VA: <strong className="ml-1">{formatCurrency(totalVoucher)}</strong>
          </div>
          {absenceCount > 0 && (
            <div className="bg-warning/10 rounded-lg px-4 py-2 text-sm text-warning">
              Ausências: <strong className="ml-1">{absenceCount}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Employee cards */}
      <div className="space-y-4">
        {groupedByEmployee.map(({ employee, days, vacDays, totalVoucher: empVoucher, workedCount, absenceCount: empAbsences }) => {
          if (!employee) return null;
          return (
            <div key={employee.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              {/* Employee header */}
              <div className="flex items-center justify-between px-6 py-4 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{employee.name}</h3>
                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 bg-background rounded-lg px-3 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{workedCount} dias</span>
                  </div>
                  {empAbsences > 0 && (
                    <div className="flex items-center gap-1.5 bg-warning/10 text-warning rounded-lg px-3 py-1.5">
                      <UserX className="w-3.5 h-3.5" />
                      <span>{empAbsences} ausências</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-background rounded-lg px-3 py-1.5 font-medium">
                    VA: {formatCurrency(empVoucher)}
                  </div>
                </div>
              </div>
              {/* Days table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left px-6 py-2 font-medium">Data</th>
                      <th className="text-left px-6 py-2 font-medium">Obra</th>
                      <th className="text-center px-6 py-2 font-medium">Status</th>
                      <th className="text-center px-6 py-2 font-medium">Interior</th>
                      <th className="text-left px-6 py-2 font-medium">Observação</th>
                      <th className="text-right px-6 py-2 font-medium">VA</th>
                      <th className="text-right px-6 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(w => {
                      const proj = w.projectId ? projects.find(p => p.id === w.projectId) : null;
                      const isAbsence = !!w.absenceType;
                      const absenceLabel = ABSENCE_TYPES.find(t => t.value === w.absenceType)?.label || w.absenceType;
                      return (
                        <tr key={w.id} className={`border-b border-border last:border-0 hover:bg-row-hover transition-colors duration-150 ${isAbsence ? 'bg-warning/5' : ''}`}>
                          <td className="px-6 py-3 text-sm">{formatDate(w.date)}</td>
                          <td className="px-6 py-3 text-sm">
                            {proj ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                <Building2 className="w-3 h-3" />{proj.name}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-6 py-3 text-sm text-center">
                            {isAbsence ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                                <AlertCircle className="w-3 h-3" />{absenceLabel}
                              </span>
                            ) : (
                              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Presente</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-center">{!isAbsence && w.interior ? '✓' : '—'}</td>
                          <td className="px-6 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                            {isAbsence ? (w.absenceReason || w.absenceNotes || '—') : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-right font-medium">{formatCurrency(w.mealVoucherValue)}</td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => { deleteWorkDay(w.id); toast.success('Registro removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {groupedByEmployee.length === 0 && (
          <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-muted-foreground">
            Nenhum registro encontrado para o período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}
