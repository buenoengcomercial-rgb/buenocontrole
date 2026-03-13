import React, { useState, useMemo } from 'react';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, CheckCircle2, Clock, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';
import type { CompanyCharge, ChargeType } from '@/types/safety';

export default function EncargosPage() {
  const { charges, addCharge, updateCharge, deleteCharge } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState<'all' | ChargeType>('all');
  const [attachOpenId, setAttachOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    chargeType: 'INSS' as ChargeType,
    month: new Date().toISOString().slice(0, 7),
    value: 0,
    dueDate: '',
    paid: false,
    paymentDate: '',
    notes: '',
  });

  const filtered = useMemo(() =>
    charges
      .filter(c => c.month.startsWith(filterYear))
      .filter(c => filterType === 'all' || c.chargeType === filterType)
      .sort((a, b) => b.month.localeCompare(a.month) || a.chargeType.localeCompare(b.chargeType)),
    [charges, filterYear, filterType]
  );

  const handleOpen = (c?: CompanyCharge) => {
    if (c) {
      setEditId(c.id);
      setForm({ chargeType: c.chargeType, month: c.month, value: c.value, dueDate: c.dueDate, paid: c.paid, paymentDate: c.paymentDate, notes: c.notes });
    } else {
      setEditId(null);
      setForm({ chargeType: 'INSS', month: new Date().toISOString().slice(0, 7), value: 0, dueDate: '', paid: false, paymentDate: '', notes: '' });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.month || !form.dueDate) { toast.error('Preencha mês e data de vencimento.'); return; }
    if (form.value <= 0) { toast.error('Informe o valor do encargo.'); return; }
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

  const totalINSS = filtered.filter(c => c.chargeType === 'INSS').reduce((s, c) => s + c.value, 0);
  const totalFGTS = filtered.filter(c => c.chargeType === 'FGTS').reduce((s, c) => s + c.value, 0);
  const pendingCount = filtered.filter(c => !c.paid).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Encargos Trabalhistas</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro individual de INSS e FGTS da empresa</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo Encargo</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Encargo</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="label-caps mb-1 block">Tipo de Encargo</label>
                <Select value={form.chargeType} onValueChange={(v) => setForm(f => ({ ...f, chargeType: v as ChargeType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSS">INSS</SelectItem>
                    <SelectItem value="FGTS">FGTS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Mês de Referência</label>
                  <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Data de Vencimento</label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label-caps mb-1 block">Valor (R$)</label>
                <Input type="number" min={0} step={0.01} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label-caps mb-1 block">Observações</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações do contador, detalhes do pagamento..." />
              </div>
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-semibold text-foreground mb-3">Controle de Pagamento</p>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} /> Pago
                  </label>
                  <div>
                    <label className="label-caps mb-1 block">Data Pagamento</label>
                    <Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
                  </div>
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
        <div className="flex gap-4">
          <div>
            <label className="label-caps mb-1 block">Filtrar por Ano</label>
            <Input type="number" min={2020} max={2030} value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-32" />
          </div>
          <div>
            <label className="label-caps mb-1 block">Tipo</label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | ChargeType)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="INSS">INSS</SelectItem>
                <SelectItem value="FGTS">FGTS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 mt-4 sm:mt-5">
          <div className="bg-card rounded-lg px-4 py-2 shadow-card">
            <p className="text-xs text-muted-foreground">Total INSS ({filterYear})</p>
            <p className="text-lg font-semibold">{formatCurrency(totalINSS)}</p>
          </div>
          <div className="bg-card rounded-lg px-4 py-2 shadow-card">
            <p className="text-xs text-muted-foreground">Total FGTS ({filterYear})</p>
            <p className="text-lg font-semibold">{formatCurrency(totalFGTS)}</p>
          </div>
          <div className="bg-card rounded-lg px-4 py-2 shadow-card">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-lg font-semibold text-warning">{pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.chargeType === 'INSS' ? 'bg-primary/10 text-primary' : 'bg-accent/50 text-accent-foreground'}`}>
                  {c.chargeType}
                </span>
                <span className="text-sm font-medium">{c.month}</span>
                <span className="text-sm text-muted-foreground">Venc: {c.dueDate ? formatDate(c.dueDate) : '—'}</span>
                <span className="text-sm font-semibold">{formatCurrency(c.value)}</span>
                {c.paid
                  ? <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium"><CheckCircle2 className="w-3 h-3" />Pago</span>
                  : <span className="inline-flex items-center gap-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium"><Clock className="w-3 h-3" />Pendente</span>
                }
                {c.paymentDate && <span className="text-sm text-muted-foreground">Pgto: {formatDate(c.paymentDate)}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setAttachOpenId(attachOpenId === c.id ? null : c.id)} className={`p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground ${attachOpenId === c.id ? 'bg-muted text-foreground' : ''}`} title="Anexar documento"><Paperclip className="w-4 h-4" /></button>
                <button onClick={() => handleOpen(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { deleteCharge(c.id); toast.success('Encargo removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {attachOpenId === c.id && (
              <div className="px-6 py-3 border-t border-border">
                <AttachedDocuments entityType="encargo" entityId={c.id} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-meta">
            Nenhum encargo registrado neste ano.
          </div>
        )}
      </div>
    </div>
  );
}
