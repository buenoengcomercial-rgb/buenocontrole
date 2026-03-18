import React, { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatDate } from '@/lib/format';
import { EPI_TYPES } from '@/types/safety';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function EPIPage() {
  const { employees } = useEmployeeData();
  const { epiDeliveries, addEPIDelivery, deleteEPIDelivery } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [form, setForm] = useState({ employeeId: '', epiType: '', unit: '', deliveryDate: '', quantity: 1, notes: '', fileName: '' });
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';
  const activeEmployees = employees.filter(e => e.status === 'ativo');

  const filtered = useMemo(() =>
    filterEmployee === 'all' ? epiDeliveries : epiDeliveries.filter(e => e.employeeId === filterEmployee),
    [epiDeliveries, filterEmployee]
  );

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(d => {
      if (!map[d.employeeId]) map[d.employeeId] = [];
      map[d.employeeId].push(d);
    });
    return Object.entries(map).sort((a, b) => empName(a[0]).localeCompare(empName(b[0])));
  }, [filtered, employees]);

  const toggleEmployee = (empId: string) => {
    setExpandedEmployees(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const toggleAll = () => {
    const allExpanded = grouped.every(([id]) => expandedEmployees[id]);
    const next: Record<string, boolean> = {};
    grouped.forEach(([id]) => { next[id] = !allExpanded; });
    setExpandedEmployees(next);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.epiType || !form.deliveryDate) { toast.error('Preencha os campos obrigatórios.'); return; }
    addEPIDelivery(form);
    toast.success('Entrega de EPI registrada.');
    setOpen(false);
    setForm({ employeeId: '', epiType: '', unit: '', deliveryDate: '', quantity: 1, notes: '', fileName: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Controle de Entrega de EPI</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Entrega</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Registrar Entrega de EPI</DialogTitle></DialogHeader>
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
                  <label className="label-caps mb-1 block">Tipo de EPI</label>
                  <Select value={form.epiType} onValueChange={v => setForm(f => ({ ...f, epiType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{EPI_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps mb-1 block">Data de Entrega</label>
                  <Input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Unidade</label>
                  <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {['Unidade', 'Par', 'Peça', 'Caixa', 'Pacote', 'Kit'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps mb-1 block">Quantidade</label>
                  <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Comprovante (nome)</label>
                  <Input value={form.fileName} onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))} placeholder="ex: recibo.pdf" />
                </div>
              </div>
              <div>
                <label className="label-caps mb-1 block">Observações</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="label-caps mb-1 block">Filtrar por Colaborador</label>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {grouped.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleAll} className="mt-5">
            {grouped.every(([id]) => expandedEmployees[id]) ? 'Minimizar Todos' : 'Expandir Todos'}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {grouped.map(([empId, items]) => {
          const isOpen = !!expandedEmployees[empId];
          return (
            <Collapsible key={empId} open={isOpen} onOpenChange={() => toggleEmployee(empId)}>
              <div className="bg-card rounded-xl shadow-card overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      <span className="font-semibold text-foreground">{empName(empId)}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length} entrega(s)</span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="label-caps text-left px-6 py-3">Tipo de EPI</th>
                          <th className="label-caps text-left px-6 py-3">Data</th>
                          <th className="label-caps text-left px-6 py-3">Unidade</th>
                          <th className="label-caps text-center px-6 py-3">Qtd</th>
                          <th className="label-caps text-left px-6 py-3">Observações</th>
                          <th className="label-caps text-right px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(e => (
                          <React.Fragment key={e.id}>
                            <tr className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                              <td className="px-6 py-4 text-sm">{e.epiType}</td>
                              <td className="px-6 py-4 text-sm">{formatDate(e.deliveryDate)}</td>
                              <td className="px-6 py-4 text-sm">{e.unit || '—'}</td>
                              <td className="px-6 py-4 text-sm text-center">{e.quantity}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{e.notes || '—'}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => { deleteEPIDelivery(e.id); toast.success('Registro removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                            <tr><td colSpan={6} className="px-6 py-2 bg-muted/30"><AttachedDocuments entityType="epi" entityId={e.id} /></td></tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
        {grouped.length === 0 && (
          <div className="bg-card rounded-xl shadow-card p-12 text-center text-meta">Nenhuma entrega registrada.</div>
        )}
      </div>
    </div>
  );
}
