import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { calculateAdvance, getAdvancePaymentDate, getSalaryPaymentDate } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, DollarSign, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const { employees, advances, payments, workDays, generateAdvance, addPayment, deleteAdvance, deletePayment } = useEmployeeData();
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

  // Advance generation
  const [advMonth, setAdvMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [advEmployee, setAdvEmployee] = useState('');

  const handleGenerateAdvance = () => {
    if (!advEmployee) { toast.error('Selecione um colaborador.'); return; }
    const exists = advances.find(a => a.employeeId === advEmployee && a.month === advMonth);
    if (exists) { toast.error('Adiantamento já gerado para este mês.'); return; }
    generateAdvance(advEmployee, advMonth);
    toast.success('Adiantamento gerado.');
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
    const payDate = getSalaryPaymentDate(y, m + 1); // salary paid on 5th business day of NEXT month
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

  return (
    <div className="space-y-6">
      <h1>Pagamentos</h1>

      <Tabs defaultValue="advances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="advances" className="gap-2"><ArrowUpCircle className="w-4 h-4" />Adiantamentos</TabsTrigger>
          <TabsTrigger value="salaries" className="gap-2"><DollarSign className="w-4 h-4" />Salários</TabsTrigger>
        </TabsList>

        <TabsContent value="advances" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div><label className="label-caps mb-1 block">Mês</label><Input type="month" value={advMonth} onChange={e => setAdvMonth(e.target.value)} className="w-[180px]" /></div>
            <div className="flex-1 min-w-[200px]">
              <label className="label-caps mb-1 block">Colaborador</label>
              <Select value={advEmployee} onValueChange={setAdvEmployee}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateAdvance}>Gerar Adiantamento</Button>
            <Button variant="outline" onClick={handleGenerateAllAdvances}>Gerar Todos</Button>
          </div>

          <div><label className="label-caps mb-1 block">Filtrar por mês</label><Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" /></div>

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Colaborador</th>
                  <th className="label-caps text-left px-6 py-3">Mês Ref.</th>
                  <th className="label-caps text-right px-6 py-3">Valor (40%)</th>
                  <th className="label-caps text-left px-6 py-3">Data Pgto</th>
                  <th className="label-caps text-right px-6 py-3">Ações</th>
                </tr></thead>
                <tbody>
                  {filteredAdvances.map(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    return (
                      <tr key={a.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium">{emp?.name || '—'}</td>
                        <td className="px-6 py-4 text-sm">{a.month}</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(a.value)}</td>
                        <td className="px-6 py-4 text-sm">{formatDate(a.paymentDate)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { deleteAdvance(a.id); toast.success('Removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAdvances.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-meta">Nenhum adiantamento encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

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
      </Tabs>
    </div>
  );
}
