import React, { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatDate } from '@/lib/format';
import { ASO_TYPES, daysUntilExpiry } from '@/types/safety';
import type { ASO } from '@/types/safety';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function ASOPage() {
  const { employees } = useEmployeeData();
  const { asos, addASO, updateASO, deleteASO } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', type: '' as ASO['type'], examDate: '', expiryDate: '', fileName: '' });

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';
  const activeEmployees = employees.filter(e => e.status === 'ativo');

  const handleOpen = (a?: ASO) => {
    if (a) {
      setEditId(a.id);
      setForm({ employeeId: a.employeeId, type: a.type, examDate: a.examDate, expiryDate: a.expiryDate, fileName: a.fileName });
    } else {
      setEditId(null);
      setForm({ employeeId: '', type: '' as ASO['type'], examDate: '', expiryDate: '', fileName: '' });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.type || !form.examDate || !form.expiryDate) { toast.error('Preencha todos os campos obrigatórios.'); return; }
    if (editId) {
      const existing = asos.find(a => a.id === editId)!;
      updateASO({ ...existing, ...form });
      toast.success('ASO atualizado.');
    } else {
      addASO(form);
      toast.success('ASO registrado.');
    }
    setOpen(false);
  };

  // Alerts: ASOs expiring within 30 days
  const alerts = useMemo(() =>
    asos.filter(a => {
      const days = daysUntilExpiry(a.expiryDate);
      return days <= 30;
    }).map(a => ({ ...a, daysLeft: daysUntilExpiry(a.expiryDate) })),
    [asos]
  );

  const asoTypeLabel = (type: string) => ASO_TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Controle de ASO</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo ASO</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} ASO</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="label-caps mb-1 block">Colaborador</label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-caps mb-1 block">Tipo de ASO</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ASO['type'] }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{ASO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Data do Exame</label>
                  <Input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Data de Vencimento</label>
                  <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label-caps mb-1 block">Documento (nome do arquivo)</label>
                <Input value={form.fileName} onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))} placeholder="ex: aso_admissional.pdf" />
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
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            ASOs próximos do vencimento ou vencidos
          </div>
          {alerts.map(a => (
            <p key={a.id} className="text-sm text-foreground">
              <span className="font-medium">{empName(a.employeeId)}</span> — {asoTypeLabel(a.type)} — {a.daysLeft <= 0 ? <span className="text-destructive font-medium">Vencido há {Math.abs(a.daysLeft)} dias</span> : <span className="text-warning font-medium">{a.daysLeft} dias restantes</span>}
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
                <th className="label-caps text-left px-6 py-3">Tipo</th>
                <th className="label-caps text-left px-6 py-3">Data do Exame</th>
                <th className="label-caps text-left px-6 py-3">Vencimento</th>
                <th className="label-caps text-left px-6 py-3">Status</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {asos.map(a => {
                const days = daysUntilExpiry(a.expiryDate);
                return (
                  <React.Fragment key={a.id}>
                  <tr className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-medium">{empName(a.employeeId)}</td>
                    <td className="px-6 py-4 text-sm">{asoTypeLabel(a.type)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(a.examDate)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(a.expiryDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${days <= 0 ? 'bg-destructive/10 text-destructive' : days <= 30 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                        {days <= 0 ? 'Vencido' : days <= 30 ? `${days}d restantes` : 'Válido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpen(a)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { deleteASO(a.id); toast.success('ASO removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                  <tr><td colSpan={6} className="px-6 py-2 bg-muted/30"><AttachedDocuments entityType="aso" entityId={a.id} /></td></tr>
                  </React.Fragment>
                );
              })}
              {asos.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-meta">Nenhum ASO registrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
