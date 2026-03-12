import { useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { formatCurrency } from '@/lib/format';
import { calculate13thSalary } from '@/types/employee';
import { Users, DollarSign, ArrowUpCircle, UtensilsCrossed, Gift } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function EmployeeDashboardPage() {
  const { employees, advances, payments, workDays } = useEmployeeData();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);
  const totalSalaries = useMemo(() => activeEmployees.reduce((s, e) => s + e.grossSalary, 0), [activeEmployees]);

  const totalAdvancesMonth = useMemo(() =>
    advances.filter(a => a.month === currentMonth).reduce((s, a) => s + a.value, 0),
    [advances, currentMonth]
  );

  const totalMealVoucher = useMemo(() =>
    workDays.filter(w => w.date.startsWith(currentMonth)).reduce((s, w) => s + w.mealVoucherValue, 0),
    [workDays, currentMonth]
  );

  // 13th salary
  const thirteenthData = useMemo(() =>
    activeEmployees.map(e => ({
      id: e.id,
      name: e.name,
      value: calculate13thSalary(e.grossSalary, e.admissionDate, currentYear),
    })),
    [activeEmployees, currentYear]
  );
  const total13th = useMemo(() => thirteenthData.reduce((s, d) => s + d.value, 0), [thirteenthData]);

  const kpis = [
    { label: 'Folha Salarial', value: formatCurrency(totalSalaries), icon: DollarSign, accent: true },
    { label: 'Adiantamentos no Mês', value: formatCurrency(totalAdvancesMonth), icon: ArrowUpCircle },
    { label: 'Vale Alimentação no Mês', value: formatCurrency(totalMealVoucher), icon: UtensilsCrossed },
    { label: '13º Acumulado', value: formatCurrency(total13th), icon: Gift },
    { label: 'Colaboradores Ativos', value: activeEmployees.length.toString(), icon: Users },
  ];

  const monthlyData = useMemo(() => {
    const months: Record<string, { salaries: number; vouchers: number }> = {};
    payments.forEach(p => {
      if (!months[p.month]) months[p.month] = { salaries: 0, vouchers: 0 };
      months[p.month].salaries += p.netSalary;
    });
    workDays.forEach(w => {
      const m = w.date.slice(0, 7);
      if (!months[m]) months[m] = { salaries: 0, vouchers: 0 };
      months[m].vouchers += w.mealVoucherValue;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      salarios: data.salaries,
      va: data.vouchers,
    }));
  }, [payments, workDays]);

  return (
    <div className="space-y-8">
      <h1>Painel de Colaboradores</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl p-6 shadow-card ${kpi.accent ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`label-caps text-xs ${kpi.accent ? 'text-primary-foreground/70' : ''}`}>{kpi.label}</span>
              <kpi.icon className={`w-5 h-5 ${kpi.accent ? 'text-primary-foreground/50' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card">
          <h2 className="mb-4">Custos Mensais</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value)]} contentStyle={{ borderRadius: 8, border: '1px solid hsl(240 6% 90%)' }} />
                <Bar dataKey="salarios" name="Salários" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="va" name="Vale Alimentação" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 13th salary breakdown */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h2 className="mb-4">13º Salário Proporcional ({currentYear})</h2>
          <div className="space-y-3">
            {thirteenthData.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-sm font-medium">{d.name}</p>
                <span className="text-sm font-medium">{formatCurrency(d.value)}</span>
              </div>
            ))}
            {thirteenthData.length === 0 && <p className="text-muted-foreground text-sm">Nenhum colaborador ativo.</p>}
            <div className="flex items-center justify-between pt-2 border-t-2 border-border">
              <p className="text-sm font-bold">Total</p>
              <span className="text-sm font-bold text-primary">{formatCurrency(total13th)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
