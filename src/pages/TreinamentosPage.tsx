import React, { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatDate } from '@/lib/format';
import { TRAINING_TYPES, daysUntilExpiry } from '@/types/safety';
import type { Training } from '@/types/safety';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Pencil, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function TreinamentosPage() {
  const { employees } = useEmployeeData();
  const { trainings, addTraining, updateTraining, deleteTraining } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', trainingType: '', trainingDate: '', expiryDate: '', fileName: '' });
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';
  const activeEmployees = employees.filter(e => e.status === 'ativo');

  const handleOpen = (t?: Training) => {
    if (t) {
      setEditId(t.id);
      setForm({ employeeId: t.employeeId, trainingType: t.trainingType, trainingDate: t.trainingDate, expiryDate: t.expiryDate, fileName: t.fileName });
    } else {
      setEditId(null);
      setForm({ employeeId: '', trainingType: '', trainingDate: '', expiryDate: '', fileName: '' });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.trainingType || !form.trainingDate || !form.expiryDate) { toast.error('Preencha todos os campos obrigatórios.'); return; }
    if (editId) {
      const existing = trainings.find(t => t.id === editId)!;
      updateTraining({ ...existing, ...form });
      toast.success('Treinamento atualizado.');
    } else {
      addTraining(form);
      toast.success('Treinamento registrado.');
    }
    setOpen(false);
  };

  const alerts = useMemo(() =>
    trainings.filter(t => daysUntilExpiry(t.expiryDate) <= 30)
      .map(t => ({ ...t, daysLeft: daysUntilExpiry(t.expiryDate) })),
    [trainings]
  );

  const grouped = useMemo(() => {
    const map: Record<string, typeof trainings> = {};
    trainings.forEach(t => {
      if (!map[t.employeeId]) map[t.employeeId] = [];
      map[t.employeeId].push(t);
    });
    return Object.entries(map).sort((a, b) => empName(a[0]).localeCompare(empName(b[0])));
  }, [trainings, employees]);

  const toggleEmployee = (empId: string) => {
    setExpandedEmployees(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const toggleAll = () => {
    const allExpanded = grouped.every(([id]) => expandedEmployees[id]);
    const next: Record<string, boolean> = {};
    grouped.forEach(([id]) => { next[id] = !allExpanded; });
    setExpandedEmployees(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Controle de Treinamentos</h1>
        <div className="flex items-center gap-2">
          {grouped.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {grouped.every(([id]) => expandedEmployees[id]) ? 'Minimizar Todos' : 'Expandir Todos'}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo Treinamento</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Treinamento</DialogTitle></DialogHeader>
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
                    <label className="label-caps mb-1 block">Tipo de Treinamento</label>
                    <Select value={form.trainingType} onValueChange={v => setForm(f => ({ ...f, trainingType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{TRAINING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Data do Treinamento</label>
                    <Input type="date" value={form.trainingDate} onChange={e => setForm(f => ({ ...f, trainingDate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps mb-1 block">Data de Validade</label>
                    <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Certificado (nome)</label>
                    <Input value={form.fileName} onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))} placeholder="ex: nr10_cert.pdf" />
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
      </div>

      {alerts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            Treinamentos próximos do vencimento ou vencidos
          </div>
          {alerts.map(a => (
            <p key={a.id} className="text-sm text-foreground">
              <span className="font-medium">{empName(a.employeeId)}</span> — {a.trainingType} — {a.daysLeft <= 0 ? <span className="text-destructive font-medium">Vencido há {Math.abs(a.daysLeft)} dias</span> : <span className="text-warning font-medium">{a.daysLeft} dias restantes</span>}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(([empId, items]) => {
          const isOpen = !!expandedEmployees[empId];
          const expiredCount = items.filter(t => daysUntilExpiry(t.expiryDate) <= 0).length;
          return (
            <Collapsible key={empId} open={isOpen} onOpenChange={() => toggleEmployee(empId)}>
              <div className="bg-card rounded-xl shadow-card overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      <span className="font-semibold text-foreground">{empName(empId)}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length} treinamento(s)</span>
                      {expiredCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{expiredCount} vencido(s)</span>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="label-caps text-left px-6 py-3">Treinamento</th>
                          <th className="label-caps text-left px-6 py-3">Data</th>
                          <th className="label-caps text-left px-6 py-3">Validade</th>
                          <th className="label-caps text-left px-6 py-3">Status</th>
                          <th className="label-caps text-right px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(t => {
                          const days = daysUntilExpiry(t.expiryDate);
                          return (
                            <React.Fragment key={t.id}>
                              <tr className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                                <td className="px-6 py-4 text-sm">{t.trainingType}</td>
                                <td className="px-6 py-4 text-sm">{formatDate(t.trainingDate)}</td>
                                <td className="px-6 py-4 text-sm">{formatDate(t.expiryDate)}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${days <= 0 ? 'bg-destructive/10 text-destructive' : days <= 30 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                                    {days <= 0 ? 'Vencido' : days <= 30 ? `${days}d restantes` : 'Válido'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button onClick={() => handleOpen(t)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => { deleteTraining(t.id); toast.success('Treinamento removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              </tr>
                              <tr><td colSpan={5} className="px-6 py-2 bg-muted/30"><AttachedDocuments entityType="training" entityId={t.id} /></td></tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
        {grouped.length === 0 && (
          <div className="bg-card rounded-xl shadow-card p-12 text-center text-meta">Nenhum treinamento registrado.</div>
        )}
      </div>
    </div>
  );
}
