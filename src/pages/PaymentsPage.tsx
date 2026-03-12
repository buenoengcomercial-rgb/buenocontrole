import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { calculateAdvance, getSalaryPaymentDate } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, DollarSign, ArrowUpCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function PaymentsPage() {
  const { employees, advances, payments, workDays, generateAdvance, addAdvanceManual, addPayment, deleteAdvance, deletePayment } = useEmployeeData();
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

  // Advance generation
  const [advMonth, setAdvMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [advEmployee, setAdvEmployee] = useState('');
  const [advCustomValue, setAdvCustomValue] = useState<number | ''>('');
  const [advNotes, setAdvNotes] = useState('');
  const [advPayDate, setAdvPayDate] = useState('');

  const handleGenerateAdvance = () => {
    if (!advEmployee) { toast.error('Selecione um colaborador.'); return; }
    const exists = advances.find(a => a.employeeId === advEmployee && a.month === advMonth);
    if (exists) { toast.error('Adiantamento já gerado para este mês.'); return; }
    if (advCustomValue && advCustomValue > 0) {
      addAdvanceManual(advEmployee, advMonth, advCustomValue, advNotes, advPayDate || undefined);
    } else {
      const emp = activeEmployees.find(e => e.id === advEmployee);
      if (emp) addAdvanceManual(advEmployee, advMonth, calculateAdvance(emp.grossSalary), advNotes, advPayDate || undefined);
    }
    toast.success('Adiantamento gerado.');
    setAdvCustomValue('');
    setAdvNotes('');
    setAdvPayDate('');
  };

  const handleGenerateAllAdvances = () => {
    let count = 0;
    activeEmployees.forEach(emp => {
      const exists = advances.find(a => a.employeeId === emp.id && a.month === advMonth);
      if (!exists) { generateAdvance(emp.id, advMonth); count++; }
    });
    toast.success(`${count} adiantamentos gerados.`);
  };

  // Salary payment
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ employeeId: '', month: '', otherDiscounts: 0, otherAdditions: 0 });

  const payPreview = useMemo(() => {
    if (!payForm.employeeId || !payForm.month) return null;
    const emp = employees.find(e => e.id === payForm.employeeId);
    if (!emp) return null;
    const adv = advances.find(a => a.employeeId === payForm.employeeId && a.month === payForm.month);
    const advDiscount = adv?.value || 0;
    const net = emp.grossSalary - advDiscount - payForm.otherDiscounts + payForm.otherAdditions;
    const [y, m] = payForm.month.split('-').map(Number);
    const payDate = getSalaryPaymentDate(y, m + 1);
    return { grossSalary: emp.grossSalary, advDiscount, net, payDate: payDate.toISOString().slice(0, 10) };
  }, [payForm, employees, advances]);

  const handlePayment = () => {
    if (!payPreview || !payForm.employeeId) return;
    const exists = payments.find(p => p.employeeId === payForm.employeeId && p.month === payForm.month);
    if (exists) { toast.error('Pagamento já registrado para este mês.'); return; }
    addPayment({
      employeeId: payForm.employeeId,
      month: payForm.month,
      grossSalary: payPreview.grossSalary,
      advanceDiscount: payPreview.advDiscount,
      otherDiscounts: payForm.otherDiscounts,
      otherAdditions: payForm.otherAdditions,
      netSalary: payPreview.net,
      paymentDate: payPreview.payDate,
    });
    toast.success('Pagamento registrado.');
    setPayOpen(false);
  };

  // Filter
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const filteredAdvances = useMemo(() => advances.filter(a => a.month === filterMonth).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)), [advances, filterMonth]);
  const filteredPayments = useMemo(() => payments.filter(p => p.month === filterMonth).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)), [payments, filterMonth]);

  // Expand advance details
  const [expandedAdvance, setExpandedAdvance] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1>Pagamentos</h1>

      <Tabs defaultValue="salaries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="salaries" className="gap-2"><DollarSign className="w-4 h-4" />Salários</TabsTrigger>
          <TabsTrigger value="advances" className="gap-2"><ArrowUpCircle className="w-4 h-4" />Adiantamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="salaries" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Registrar Pagamento</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Registrar Pagamento de Salário</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-caps mb-1 block">Colaborador</label>
                      <Select value={payForm.employeeId} onValueChange={v => setPayForm(f => ({ ...f, employeeId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="label-caps mb-1 block">Mês Referência</label><Input type="month" value={payForm.month} onChange={e => setPayForm(f => ({ ...f, month: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-caps mb-1 block">Outros Descontos</label><Input type="number" min={0} step={0.01} value={payForm.otherDiscounts || ''} onChange={e => setPayForm(f => ({ ...f, otherDiscounts: Number(e.target.value) }))} /></div>
                    <div><label className="label-caps mb-1 block">Outros Adicionais</label><Input type="number" min={0} step={0.01} value={payForm.otherAdditions || ''} onChange={e => setPayForm(f => ({ ...f, otherAdditions: Number(e.target.value) }))} /></div>
                  </div>
                  {payPreview && (
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span>Salário Bruto</span><strong>{formatCurrency(payPreview.grossSalary)}</strong></div>
                      <div className="flex justify-between text-destructive"><span>(-) Adiantamento</span><strong>{formatCurrency(payPreview.advDiscount)}</strong></div>
                      {payForm.otherDiscounts > 0 && <div className="flex justify-between text-destructive"><span>(-) Outros descontos</span><strong>{formatCurrency(payForm.otherDiscounts)}</strong></div>}
                      {payForm.otherAdditions > 0 && <div className="flex justify-between text-success"><span>(+) Adicionais</span><strong>{formatCurrency(payForm.otherAdditions)}</strong></div>}
                      <div className="border-t border-border pt-2 flex justify-between text-base font-semibold"><span>Valor Líquido</span><span>{formatCurrency(payPreview.net)}</span></div>
                      <div className="flex justify-between text-meta"><span>Data de pagamento (5° dia útil)</span><span>{formatDate(payPreview.payDate)}</span></div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
                  <Button onClick={handlePayment} disabled={!payPreview}>Registrar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div><label className="label-caps mb-1 block">Filtrar por mês</label><Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" /></div>

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Colaborador</th>
                  <th className="label-caps text-left px-6 py-3">Mês Ref.</th>
                  <th className="label-caps text-right px-6 py-3">Bruto</th>
                  <th className="label-caps text-right px-6 py-3">Adiant.</th>
                  <th className="label-caps text-right px-6 py-3">Líquido</th>
                  <th className="label-caps text-left px-6 py-3">Data Pgto</th>
                  <th className="label-caps text-right px-6 py-3">Ações</th>
                </tr></thead>
                <tbody>
                  {filteredPayments.map(p => {
                    const emp = employees.find(e => e.id === p.employeeId);
                    return (
                      <tr key={p.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium">{emp?.name || '—'}</td>
                        <td className="px-6 py-4 text-sm">{p.month}</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(p.grossSalary)}</td>
                        <td className="px-6 py-4 text-sm text-right text-destructive">{formatCurrency(p.advanceDiscount)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(p.netSalary)}</td>
                        <td className="px-6 py-4 text-sm">{formatDate(p.paymentDate)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { deletePayment(p.id); toast.success('Removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPayments.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-meta">Nenhum pagamento encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advances" className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div><label className="label-caps mb-1 block">Mês</label><Input type="month" value={advMonth} onChange={e => setAdvMonth(e.target.value)} className="w-[180px]" /></div>
              <div className="flex-1 min-w-[200px]">
                <label className="label-caps mb-1 block">Colaborador</label>
                <Select value={advEmployee} onValueChange={setAdvEmployee}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-caps mb-1 block">Valor (vazio = 40%)</label>
                <Input type="number" min={0} step={0.01} value={advCustomValue} onChange={e => setAdvCustomValue(e.target.value ? Number(e.target.value) : '')} placeholder="Automático 40%" className="w-[180px]" />
              </div>
              <div>
                <label className="label-caps mb-1 block">Data do Pagamento</label>
                <Input type="date" value={advPayDate} onChange={e => setAdvPayDate(e.target.value)} className="w-[180px]" />
              </div>
            </div>
            <div>
              <label className="label-caps mb-1 block">Observações</label>
              <Textarea value={advNotes} onChange={e => setAdvNotes(e.target.value)} placeholder="Motivo, referência do pagamento, ajustes..." className="min-h-[60px]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerateAdvance}>Gerar Adiantamento</Button>
              <Button variant="outline" onClick={handleGenerateAllAdvances}>Gerar Todos (40%)</Button>
            </div>
          </div>

          <div><label className="label-caps mb-1 block">Filtrar por mês</label><Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" /></div>

          <div className="space-y-3">
            {filteredAdvances.map(a => {
              const emp = employees.find(e => e.id === a.employeeId);
              const isExpanded = expandedAdvance === a.id;
              return (
                <div key={a.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-row-hover transition-colors" onClick={() => setExpandedAdvance(isExpanded ? null : a.id)}>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{emp?.name || '—'}</span>
                      <span className="text-xs text-muted-foreground">{a.month}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{formatCurrency(a.value)}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(a.paymentDate)}</span>
                      {a.notes && <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />}
                      <button onClick={(e) => { e.stopPropagation(); deleteAdvance(a.id); toast.success('Removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-6 pb-4 space-y-3 border-t border-border pt-3">
                      {a.notes && (
                        <div>
                          <span className="label-caps text-xs">Observações</span>
                          <p className="text-sm text-muted-foreground mt-1">{a.notes}</p>
                        </div>
                      )}
                      <AttachedDocuments entityType="advance" entityId={a.id} />
                    </div>
                  )}
                </div>
              );
            })}
            {filteredAdvances.length === 0 && (
              <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-meta">Nenhum adiantamento encontrado.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}