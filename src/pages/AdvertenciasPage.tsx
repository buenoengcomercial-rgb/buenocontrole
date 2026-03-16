import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Warning {
  id: string;
  employeeId: string;
  date: string;
  type: string;
  reason: string;
  description: string;
  notes: string;
  createdAt: string;
}

const WARNING_TYPES = [
  { value: 'advertência_verbal', label: 'Advertência Verbal' },
  { value: 'advertência_escrita', label: 'Advertência Escrita' },
  { value: 'suspensão', label: 'Suspensão' },
  { value: 'outro', label: 'Outro' },
];

function mapWarning(r: any): Warning {
  return {
    id: r.id,
    employeeId: r.employee_id,
    date: r.date,
    type: r.type,
    reason: r.reason,
    description: r.description,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export default function AdvertenciasPage() {
  const { employees } = useEmployeeData();
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: '', date: '', type: 'advertência_escrita', reason: '', description: '', notes: '',
  });

  useEffect(() => {
    supabase.from('employee_warnings').select('*').then(({ data }) => {
      setWarnings((data || []).map(mapWarning));
      setLoading(false);
    });
  }, []);

  const toggleEmployee = (id: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleOpen = (w?: Warning) => {
    if (w) {
      setEditId(w.id);
      setForm({ employeeId: w.employeeId, date: w.date, type: w.type, reason: w.reason, description: w.description, notes: w.notes });
    } else {
      setEditId(null);
      setForm({ employeeId: '', date: '', type: 'advertência_escrita', reason: '', description: '', notes: '' });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.employeeId || !form.date || !form.reason) {
      toast.error('Preencha colaborador, data e motivo.');
      return;
    }
    if (editId) {
      await supabase.from('employee_warnings').update({
        employee_id: form.employeeId, date: form.date, type: form.type,
        reason: form.reason, description: form.description, notes: form.notes,
      }).eq('id', editId);
      setWarnings(prev => prev.map(w => w.id === editId ? { ...w, ...form, employeeId: form.employeeId } : w));
      toast.success('Advertência atualizada.');
    } else {
      const { data } = await supabase.from('employee_warnings').insert({
        employee_id: form.employeeId, date: form.date, type: form.type,
        reason: form.reason, description: form.description, notes: form.notes,
      }).select().single();
      if (data) setWarnings(prev => [...prev, mapWarning(data)]);
      toast.success('Advertência registrada.');
    }
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('employee_warnings').delete().eq('id', id);
    setWarnings(prev => prev.filter(w => w.id !== id));
    toast.success('Advertência removida.');
  };

  const filtered = useMemo(() =>
    warnings.filter(w => filterEmployee === 'all' || w.employeeId === filterEmployee)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [warnings, filterEmployee]
  );

  // Group by employee
  const grouped = useMemo(() => {
    const map = new Map<string, Warning[]>();
    filtered.forEach(w => {
      const list = map.get(w.employeeId) || [];
      list.push(w);
      map.set(w.employeeId, list);
    });
    return Array.from(map.entries()).map(([empId, items]) => ({
      employee: employees.find(e => e.id === empId),
      items,
    })).sort((a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || ''));
  }, [filtered, employees]);

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Advertências</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="w-4 h-4 mr-2" />Nova Advertência
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nova'} Advertência</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="label-caps mb-1 block">Colaborador</label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-caps mb-1 block">Data</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label-caps mb-1 block">Tipo</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WARNING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="label-caps mb-1 block">Motivo *</label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: atraso recorrente, indisciplina..." />
            </div>
            <div>
              <label className="label-caps mb-1 block">Descrição</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes da ocorrência..." rows={3} />
            </div>
            <div>
              <label className="label-caps mb-1 block">Observações</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações adicionais..." rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editId ? 'Salvar' : 'Registrar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grouped list */}
      <div className="space-y-4">
        {grouped.map(({ employee, items }) => {
          if (!employee) return null;
          const isExpanded = expandedEmployees.has(employee.id);
          return (
            <div key={employee.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleEmployee(employee.id)}
                className="w-full flex items-center justify-between px-6 py-4 bg-muted/50 border-b border-border hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-sm">
                    {employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">{employee.name}</h3>
                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive rounded-lg px-3 py-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{items.length} advertência{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left px-6 py-2 font-medium">Data</th>
                        <th className="text-left px-6 py-2 font-medium">Tipo</th>
                        <th className="text-left px-6 py-2 font-medium">Motivo</th>
                        <th className="text-left px-6 py-2 font-medium">Descrição</th>
                        <th className="text-right px-6 py-2 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(w => {
                        const typeLabel = WARNING_TYPES.find(t => t.value === w.type)?.label || w.type;
                        return (
                          <tr key={w.id} className="border-b border-border last:border-0 hover:bg-row-hover transition-colors duration-150">
                            <td className="px-6 py-3 text-sm">{formatDate(w.date)}</td>
                            <td className="px-6 py-3 text-sm">
                              <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                                <AlertTriangle className="w-3 h-3" />{typeLabel}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm max-w-[200px] truncate">{w.reason}</td>
                            <td className="px-6 py-3 text-sm text-muted-foreground max-w-[250px] truncate">{w.description || '—'}</td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleOpen(w)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(w.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {grouped.length === 0 && (
          <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-muted-foreground">
            Nenhuma advertência registrada.
          </div>
        )}
      </div>
    </div>
  );
}
