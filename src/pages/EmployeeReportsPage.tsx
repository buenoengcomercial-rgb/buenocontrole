import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeReportsPage() {
  const { employees, advances, payments, workDays } = useEmployeeData();
  const { vacations } = useSafetyData();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterEmployee, setFilterEmployee] = useState('all');

  // Monthly payment report
  const paymentReport = useMemo(() => {
    return payments
      .filter(p => p.month === month)
      .filter(p => filterEmployee === 'all' || p.employeeId === filterEmployee)
      .map(p => ({
        ...p,
        employeeName: employees.find(e => e.id === p.employeeId)?.name || '—',
      }));
  }, [payments, month, filterEmployee, employees]);

  // Advance report
  const advanceReport = useMemo(() => {
    return advances
      .filter(a => a.month === month)
      .filter(a => filterEmployee === 'all' || a.employeeId === filterEmployee)
      .map(a => ({
        ...a,
        employeeName: employees.find(e => e.id === a.employeeId)?.name || '—',
      }));
  }, [advances, month, filterEmployee, employees]);

  // Meal voucher report
  const voucherReport = useMemo(() => {
    const filtered = workDays
      .filter(w => w.date.startsWith(month))
      .filter(w => filterEmployee === 'all' || w.employeeId === filterEmployee);

    const byEmployee: Record<string, { name: string; daysWorked: number; daysInterior: number; totalVoucher: number }> = {};
    filtered.forEach(w => {
      const emp = employees.find(e => e.id === w.employeeId);
      if (!byEmployee[w.employeeId]) {
        byEmployee[w.employeeId] = { name: emp?.name || '—', daysWorked: 0, daysInterior: 0, totalVoucher: 0 };
      }
      if (w.worked) byEmployee[w.employeeId].daysWorked++;
      if (w.interior) byEmployee[w.employeeId].daysInterior++;
      byEmployee[w.employeeId].totalVoucher += w.mealVoucherValue;
    });
    return Object.values(byEmployee);
  }, [workDays, month, filterEmployee, employees]);

  // Payroll summary
  const payrollSummary = useMemo(() => {
    const totalGross = paymentReport.reduce((s, p) => s + p.grossSalary, 0);
    const totalAdvances = advanceReport.reduce((s, a) => s + a.value, 0);
    const totalNet = paymentReport.reduce((s, p) => s + p.netSalary, 0);
    const totalVoucher = voucherReport.reduce((s, v) => s + v.totalVoucher, 0);
    return { totalGross, totalAdvances, totalNet, totalVoucher, totalCost: totalNet + totalVoucher };
  }, [paymentReport, advanceReport, voucherReport]);

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) { toast.error('Sem dados para exportar.'); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(';'), ...data.map(row => headers.map(h => String(row[h] ?? '')).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado.');
  };

  return (
    <div className="space-y-6">
      <h1>Relatórios de Colaboradores</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div><label className="label-caps mb-1 block">Mês</label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[180px]" /></div>
        <div className="min-w-[200px]">
          <label className="label-caps mb-1 block">Colaborador</label>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Salários Brutos', value: payrollSummary.totalGross },
          { label: 'Adiantamentos', value: payrollSummary.totalAdvances },
          { label: 'Salários Líquidos', value: payrollSummary.totalNet },
          { label: 'Vale Alimentação', value: payrollSummary.totalVoucher },
          { label: 'Custo Total', value: payrollSummary.totalCost },
        ].map(item => (
          <div key={item.label} className="bg-card rounded-xl p-4 shadow-card">
            <p className="label-caps mb-1">{item.label}</p>
            <p className="text-lg font-semibold">{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="advances">Adiantamentos</TabsTrigger>
          <TabsTrigger value="vouchers">Vale Alimentação</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(paymentReport.map(p => ({ Colaborador: p.employeeName, Mês: p.month, Bruto: p.grossSalary, Adiantamento: p.advanceDiscount, Descontos: p.otherDiscounts, Adicionais: p.otherAdditions, Líquido: p.netSalary, 'Data Pgto': p.paymentDate })), `pagamentos-${month}`)}>
              <FileDown className="w-4 h-4 mr-2" />Exportar CSV
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Colaborador</th>
                  <th className="label-caps text-right px-6 py-3">Bruto</th>
                  <th className="label-caps text-right px-6 py-3">Adiant.</th>
                  <th className="label-caps text-right px-6 py-3">Descontos</th>
                  <th className="label-caps text-right px-6 py-3">Adicionais</th>
                  <th className="label-caps text-right px-6 py-3">Líquido</th>
                  <th className="label-caps text-left px-6 py-3">Data Pgto</th>
                </tr></thead>
                <tbody>
                  {paymentReport.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium">{p.employeeName}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(p.grossSalary)}</td>
                      <td className="px-6 py-4 text-sm text-right text-destructive">{formatCurrency(p.advanceDiscount)}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(p.otherDiscounts)}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(p.otherAdditions)}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(p.netSalary)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                  {paymentReport.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-meta">Nenhum pagamento encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advances" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(advanceReport.map(a => ({ Colaborador: a.employeeName, Mês: a.month, Valor: a.value, 'Data Pgto': a.paymentDate })), `adiantamentos-${month}`)}>
              <FileDown className="w-4 h-4 mr-2" />Exportar CSV
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Colaborador</th>
                  <th className="label-caps text-left px-6 py-3">Mês Ref.</th>
                  <th className="label-caps text-right px-6 py-3">Valor</th>
                  <th className="label-caps text-left px-6 py-3">Data Pgto</th>
                </tr></thead>
                <tbody>
                  {advanceReport.map(a => (
                    <tr key={a.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium">{a.employeeName}</td>
                      <td className="px-6 py-4 text-sm">{a.month}</td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(a.value)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(a.paymentDate)}</td>
                    </tr>
                  ))}
                  {advanceReport.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-meta">Nenhum adiantamento encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vouchers" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(voucherReport.map(v => ({ Colaborador: v.name, 'Dias Trabalhados': v.daysWorked, 'Dias Interior': v.daysInterior, 'Total VA': v.totalVoucher })), `vale-alimentacao-${month}`)}>
              <FileDown className="w-4 h-4 mr-2" />Exportar CSV
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Colaborador</th>
                  <th className="label-caps text-right px-6 py-3">Dias Trabalhados</th>
                  <th className="label-caps text-right px-6 py-3">Dias Interior</th>
                  <th className="label-caps text-right px-6 py-3">Total VA</th>
                </tr></thead>
                <tbody>
                  {voucherReport.map((v, i) => (
                    <tr key={i} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium">{v.name}</td>
                      <td className="px-6 py-4 text-sm text-right">{v.daysWorked}</td>
                      <td className="px-6 py-4 text-sm text-right">{v.daysInterior}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(v.totalVoucher)}</td>
                    </tr>
                  ))}
                  {voucherReport.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-meta">Nenhum registro encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
