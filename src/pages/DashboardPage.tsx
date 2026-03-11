import { useMemo } from 'react';
import { useAppData } from '@/context/AppContext';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { useProjectData } from '@/context/ProjectContext';
import { formatCurrency } from '@/lib/format';
import { daysUntilExpiry } from '@/types/safety';
import { TrendingUp, Users, Shield, Palmtree, AlertTriangle, Package, Building2, DollarSign, Stethoscope, GraduationCap, FileText, HardHat } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { purchases } = useAppData();
  const { employees, workDays, advances } = useEmployeeData();
  const { charges, vacations, asos, trainings } = useSafetyData();
  const { projects, allocations, outsourcedServices, projectDocuments } = useProjectData();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeEmployees = employees.filter(e => e.status === 'ativo');

  // Payroll
  const totalPayroll = useMemo(() => activeEmployees.reduce((s, e) => s + e.grossSalary, 0), [activeEmployees]);
  const totalCharges = useMemo(() => charges.filter(c => c.month === currentMonth).reduce((s, c) => s + c.inssValue + c.fgtsValue, 0), [charges, currentMonth]);
  const totalMealVoucher = useMemo(() => workDays.filter(w => w.date.startsWith(currentMonth)).reduce((s, w) => s + w.mealVoucherValue, 0), [workDays, currentMonth]);

  // Vacations
  const onVacation = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return vacations.filter(v => v.status === 'em_ferias' && v.startDate <= today && v.endDate >= today);
  }, [vacations]);

  // Safety alerts
  const expiringASOs = useMemo(() => asos.filter(a => daysUntilExpiry(a.expiryDate) <= 30), [asos]);
  const expiringTrainings = useMemo(() => trainings.filter(t => daysUntilExpiry(t.expiryDate) <= 30), [trainings]);
  const expiringProjectDocs = useMemo(() => projectDocuments.filter(d => d.expiryDate && daysUntilExpiry(d.expiryDate) <= 30), [projectDocuments]);

  // Materials this month
  const totalMaterialsMonth = useMemo(() => purchases.filter(p => p.date.startsWith(currentMonth)).reduce((s, p) => s + p.finalPrice, 0), [purchases, currentMonth]);

  // Project costs chart
  const projectCostData = useMemo(() => {
    return projects.map(p => {
      const projAllocs = allocations.filter(a => a.projectId === p.id && a.worked);
      const projPurchases = purchases.filter(pu => pu.city === p.city);
      const projOutsourced = outsourcedServices.filter(s => s.projectId === p.id);

      const materialCost = projPurchases.reduce((s, pu) => s + pu.finalPrice, 0);
      const outsourcedCost = projOutsourced.reduce((s, sv) => s + sv.value, 0);

      let laborCost = 0;
      projAllocs.forEach(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        if (!emp) return;
        const month = a.date.slice(0, 7);
        const empCharges = charges.filter(c => c.employeeId === a.employeeId && c.month === month);
        const mc = empCharges.reduce((s, c) => s + c.inssValue + c.fgtsValue, 0);
        laborCost += (emp.grossSalary + mc) / 22;
      });

      return {
        name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
        materiais: materialCost,
        maoDeObra: laborCost,
        terceirizados: outsourcedCost,
        total: materialCost + laborCost + outsourcedCost,
      };
    });
  }, [projects, allocations, purchases, outsourcedServices, employees, charges]);

  const kpis = [
    { label: 'Folha de Pagamento', value: formatCurrency(totalPayroll), icon: DollarSign, accent: true },
    { label: 'Encargos Trabalhistas', value: formatCurrency(totalCharges), icon: Shield },
    { label: 'Vale Alimentação', value: formatCurrency(totalMealVoucher), icon: HardHat },
    { label: 'Materiais no Mês', value: formatCurrency(totalMaterialsMonth), icon: Package },
  ];

  return (
    <div className="space-y-8">
      <h1>Dashboard Geral</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl p-6 shadow-card ${kpi.accent ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`label-caps ${kpi.accent ? 'text-primary-foreground/70' : ''}`}>{kpi.label}</span>
              <kpi.icon className={`w-5 h-5 ${kpi.accent ? 'text-primary-foreground/50' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AlertCard icon={Palmtree} label="Em Férias" count={onVacation.length} color="blue" link="/colaboradores/ferias" />
        <AlertCard icon={Stethoscope} label="ASO Vencendo" count={expiringASOs.length} color="red" link="/seguranca/aso" />
        <AlertCard icon={GraduationCap} label="Treinamentos Vencendo" count={expiringTrainings.length} color="orange" link="/seguranca/treinamentos" />
        <AlertCard icon={FileText} label="Docs Obra Vencendo" count={expiringProjectDocs.length} color="amber" link="/obras" />
      </div>

      {/* Project Costs Chart */}
      {projectCostData.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h2 className="mb-4">Custo por Obra</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectCostData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" width={130} />
                <Tooltip formatter={(value: number) => [formatCurrency(value)]} contentStyle={{ borderRadius: 8, border: '1px solid hsl(240 6% 90%)' }} />
                <Bar dataKey="materiais" name="Materiais" fill="hsl(221 83% 53%)" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="maoDeObra" name="Mão de Obra" fill="hsl(142 76% 36%)" stackId="a" />
                <Bar dataKey="terceirizados" name="Terceirizados" fill="hsl(38 92% 50%)" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Active Employees */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2>Colaboradores Ativos</h2>
          <span className="text-sm font-medium text-primary">{activeEmployees.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeEmployees.slice(0, 6).map(e => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">{e.name.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ icon: Icon, label, count, color, link }: { icon: React.ElementType; label: string; count: number; color: string; link: string }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-destructive/10 text-destructive',
    orange: 'bg-warning/20 text-warning',
    blue: 'bg-primary/10 text-primary',
    amber: 'bg-orange-100 text-orange-600',
  };
  return (
    <Link to={link} className="bg-card rounded-xl p-4 shadow-card hover:shadow-md transition-shadow flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {count > 0 && <AlertTriangle className="w-4 h-4 ml-auto text-warning" />}
    </Link>
  );
}
