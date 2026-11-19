import { useMemo, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployeeData } from '@/context/EmployeeContext';
import type { PartnerPayment } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subMonths } from 'date-fns';

const emptyForm = { partnerName: '', cpf: '', month: '', netAmount: '', paymentDate: '', paymentMethod: 'PIX', replacesSalaryPaymentId: '', notes: '' };

export default function PartnerPaymentsTab() {
  const { employees, sourcePayments, partnerPayments, partnerPaymentsError, addPartnerPayment, updatePartnerPayment } = useEmployeeData();
  const [month, setMonth] = useState(() => format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => partnerPayments.filter(p => p.month === month).sort((a, b) => a.partnerName.localeCompare(b.partnerName)), [partnerPayments, month]);
  const replaced = sourcePayments.find(p => p.id === form.replacesSalaryPaymentId);
  const candidates = sourcePayments.filter(p => p.month === form.month && (!partnerPayments.some(pp => pp.replacesSalaryPaymentId === p.id) || replaced?.id === p.id));

  const startNew = () => { setEditingId(null); setForm({ ...emptyForm, month }); setOpen(true); };
  const startEdit = (p: PartnerPayment) => {
    setEditingId(p.id);
    setForm({ partnerName: p.partnerName, cpf: p.cpf, month: p.month, netAmount: String(p.netAmount), paymentDate: p.paymentDate, paymentMethod: p.paymentMethod, replacesSalaryPaymentId: p.replacesSalaryPaymentId || '', notes: p.notes });
    setOpen(true);
  };
  const save = async () => {
    const cpf = form.cpf.replace(/\D/g, '');
    const amount = Number(form.netAmount);
    if (!form.partnerName.trim() || cpf.length !== 11 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.month) || !form.paymentDate || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe nome, CPF, competência, valor líquido e data.');
      return;
    }
    if (form.replacesSalaryPaymentId && (!replaced || replaced.month !== form.month)) {
      toast.error('O recibo substituído deve ser da mesma competência.');
      return;
    }
    const value = { partnerName: form.partnerName.trim(), cpf, month: form.month, netAmount: amount, paymentDate: form.paymentDate, paymentMethod: form.paymentMethod, replacesSalaryPaymentId: form.replacesSalaryPaymentId || null, notes: form.notes.trim() };
    setSaving(true);
    try {
      if (editingId) await updatePartnerPayment({ ...value, id: editingId, createdAt: partnerPayments.find(p => p.id === editingId)?.createdAt || '' });
      else await addPartnerPayment(value);
      toast.success('Pagamento registrado.');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o pagamento.');
    } finally { setSaving(false); }
  };

  return <div className="space-y-4">
    {partnerPaymentsError && <p role="alert" className="text-sm text-destructive">Pagamentos a sócios indisponíveis: {partnerPaymentsError}</p>}
    <Button onClick={startNew} disabled={!!partnerPaymentsError}><Plus className="w-4 h-4 mr-2" />Registrar pagamento</Button>
    <div><label className="label-caps block mb-1">Competência</label><Input type="month" className="max-w-[200px]" value={month} onChange={e => setMonth(e.target.value)} /></div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Nome</th><th>Data</th><th>Valor líquido</th><th>Origem</th><th className="w-12">Ações</th></tr></thead>
        <tbody>{rows.map(p => {
          const prior = sourcePayments.find(x => x.id === p.replacesSalaryPaymentId);
          return <tr key={p.id} className="border-b"><td className="py-3 font-medium">{p.partnerName}</td><td>{formatDate(p.paymentDate)}</td><td>{formatCurrency(p.netAmount)}</td><td>{prior ? `Substitui recibo de ${formatCurrency(prior.netSalary)}` : p.paymentMethod}</td><td><Button variant="ghost" size="icon" onClick={() => startEdit(p)} title="Editar pagamento"><Pencil className="w-4 h-4" /></Button></td></tr>;
        })}</tbody>
      </table>
      {!rows.length && <p className="py-8 text-center text-muted-foreground">Nenhum pagamento registrado.</p>}
    </div>
    <div className="flex justify-between border-t pt-4 font-semibold"><span>Total pago a sócios</span><span>{formatCurrency(rows.reduce((sum, p) => sum + p.netAmount, 0))}</span></div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Registrar'} pagamento a sócio</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><label className="label-caps block mb-1">Nome completo</label><Input value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} /></div>
        <div><label className="label-caps block mb-1">CPF</label><Input inputMode="numeric" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="label-caps block mb-1">Competência</label><Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value, replacesSalaryPaymentId: '' }))} /></div><div><label className="label-caps block mb-1">Data do pagamento</label><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div></div>
        <div><label className="label-caps block mb-1">Valor líquido pago</label><Input type="number" min="0.01" step="0.01" value={form.netAmount} onChange={e => setForm(f => ({ ...f, netAmount: e.target.value }))} /></div>
        <div><label className="label-caps block mb-1">Forma de pagamento</label><Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['PIX', 'Transferência', 'Dinheiro', 'Outro'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
        <div><label className="label-caps block mb-1">Substitui lançamento salarial</label><Select value={form.replacesSalaryPaymentId || 'none'} onValueChange={v => setForm(f => ({ ...f, replacesSalaryPaymentId: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{candidates.map(p => <SelectItem key={p.id} value={p.id}>{employees.find(e => e.id === p.employeeId)?.name || 'Colaborador'} - {formatCurrency(p.netSalary)}</SelectItem>)}</SelectContent></Select></div>
        {replaced && <p className="text-sm text-amber-700">O recibo original de {formatCurrency(replaced.netSalary)} será preservado para auditoria, mas deixará de compor os totais. Diferença: {formatCurrency(Number(form.netAmount || 0) - replaced.netSalary)}.</p>}
        <div><label className="label-caps block mb-1">Observação</label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={saving} onClick={save}>Salvar</Button></div>
    </DialogContent></Dialog>
  </div>;
}
