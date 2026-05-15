import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ComparativosWrapper } from '@/components/comparativos/ComparativosWrapper';
import { useProjectData } from '@/context/ProjectContext';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useAppData } from '@/context/AppContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { daysUntilExpiry } from '@/types/safety';
import { calculate13thDailyCost } from '@/types/employee';
import { PROJECT_DOC_TYPES, MEASUREMENT_STATUSES, EQUIPMENT_TYPES, BILLING_TYPES, PAYMENT_METHODS } from '@/types/project';
import { MATERIAL_CATEGORIES, UNITS } from '@/types';
import type { ProjectDocType, MeasurementStatus, Measurement, EquipmentRental, EquipmentType, BillingType } from '@/types/project';
import { ArrowLeft, Users, Package, Wrench, FileText, DollarSign, Plus, Trash2, AlertTriangle, BarChart3, Ruler, Pencil, Truck, Paperclip, Scale } from 'lucide-react';
import AttachedDocuments from '@/components/AttachedDocuments';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

type Tab = 'dashboard' | 'allocations' | 'materials' | 'outsourced' | 'rentals' | 'docs' | 'measurements' | 'costs' | 'comparativos';

export default function ProjectDetailPage() {
  const { id } = useParams<{id: string;}>();
  const { projects, updateProject, outsourcedServices, addOutsourcedService, deleteOutsourcedService, projectDocuments, addProjectDocument, updateProjectDocument, deleteProjectDocument, measurements, addMeasurement, updateMeasurement, deleteMeasurement, dasExpenses, projectPurchases, addProjectPurchase, updateProjectPurchase, deleteProjectPurchase, equipmentRentals, addEquipmentRental, updateEquipmentRental, deleteEquipmentRental } = useProjectData();
  const { employees, workDays, addWorkDay, deleteWorkDay } = useEmployeeData();
  const { purchases, suppliers, materials } = useAppData();
  const { charges } = useSafetyData();
  const [tab, setTab] = useState<Tab>('dashboard');

  const project = projects.find((p) => p.id === id);
  if (!project) return <div className="p-8 text-center"><p className="text-muted-foreground">Obra não encontrada.</p><Link to="/obras" className="text-primary text-sm">← Voltar</Link></div>;

  const projAllocations = workDays.filter((w) => w.projectId === id);
  const projPurchases = purchases.filter((p) => p.city === project.city);
  const projOutsourced = outsourcedServices.filter((s) => s.projectId === id);
  const projDocs = projectDocuments.filter((d) => d.projectId === id);
  const projMeasurements = measurements.filter((m) => m.projectId === id);
  const projProjectPurchases = projectPurchases.filter((pp) => pp.projectId === id);
  const projRentals = equipmentRentals.filter((r) => r.projectId === id);

  const tabs: {key: Tab;label: string;icon: React.ElementType;}[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'measurements', label: 'Medições', icon: Ruler },
  { key: 'allocations', label: 'Colaboradores', icon: Users },
  { key: 'materials', label: 'Materiais', icon: Package },
  { key: 'outsourced', label: 'Terceirizados', icon: Wrench },
  { key: 'rentals', label: 'Aluguéis', icon: Truck },
  { key: 'docs', label: 'Documentação', icon: FileText },
  { key: 'costs', label: 'Custos', icon: DollarSign },
  { key: 'comparativos', label: 'Comparativos', icon: Scale }];


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/obras" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl">{project.name}</h1>
          <p className="text-muted-foreground text-sm">{project.client} — {project.city}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((t) =>
        <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        )}
      </div>

      {tab === 'dashboard' && <DashboardTab project={project} allocations={projAllocations} employees={employees} purchases={projPurchases} outsourced={projOutsourced} charges={charges} measurements={projMeasurements} dasExpenses={dasExpenses} allProjects={projects} projectPurchases={projProjectPurchases} projectDocs={projDocs} rentals={projRentals} />}
      {tab === 'measurements' && <MeasurementsTab projectId={id!} measurements={projMeasurements} onAdd={addMeasurement} onUpdate={updateMeasurement} onDelete={deleteMeasurement} />}
      {tab === 'allocations' && <AllocationsTab projectId={id!} allocations={projAllocations} employees={employees} onAdd={addWorkDay} onDelete={deleteWorkDay} />}
      {tab === 'materials' && <MaterialsTab projectId={id!} purchases={projPurchases} suppliers={suppliers} materials={materials} projectPurchases={projProjectPurchases} onAdd={addProjectPurchase} onUpdate={updateProjectPurchase} onDelete={deleteProjectPurchase} />}
      {tab === 'outsourced' && <OutsourcedTab projectId={id!} services={projOutsourced} onAdd={addOutsourcedService} onDelete={deleteOutsourcedService} />}
      {tab === 'rentals' && <RentalsTab projectId={id!} rentals={projRentals} onAdd={addEquipmentRental} onUpdate={updateEquipmentRental} onDelete={deleteEquipmentRental} />}
      {tab === 'docs' && <DocsTab projectId={id!} docs={projDocs} onAdd={addProjectDocument} onUpdate={updateProjectDocument} onDelete={deleteProjectDocument} />}
      {tab === 'costs' && <CostsTab project={project} allocations={projAllocations} employees={employees} purchases={projPurchases} outsourced={projOutsourced} charges={charges} dasExpenses={dasExpenses} allProjects={projects} projectPurchases={projProjectPurchases} projectDocs={projDocs} rentals={projRentals} />}
      {tab === 'comparativos' && <ComparativosWrapper projectId={id!} projectName={project.name} />}
    </div>);

}

/* ── Dashboard Tab ── */
function DashboardTab({ project, allocations, employees, purchases, outsourced, charges, measurements, dasExpenses, allProjects, projectPurchases, projectDocs, rentals }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  const totalProjectPurchases = (projectPurchases || []).reduce((s: number, p: any) => s + p.totalValue + (p.freightValue || 0) + (p.icmsValue || 0), 0);
  const totalOutsourced = outsourced.reduce((s: number, sv: any) => s + sv.value, 0);
  const totalDocsCost = (projectDocs || []).reduce((s: number, d: any) => s + (d.value || 0), 0);
  const totalRentals = (rentals || []).reduce((s: number, r: any) => s + r.totalValue, 0);

  const laborCost = useMemo(() => {
    let total = 0;
    allocations.forEach((a: any) => {
      if (!a.worked) return;
      const emp = employees.find((e: any) => e.id === a.employeeId);
      if (!emp) return;
      const dailyCost = emp.grossSalary / 22;
      const thirteenthDaily = calculate13thDailyCost(emp.grossSalary);
      total += dailyCost + thirteenthDaily;
    });
    return total;
  }, [allocations, employees]);

  const chargesCost = useMemo(() => {
    const totalCharges = charges.reduce((s: number, c: any) => s + c.value, 0);
    return totalCharges / (allProjects.length || 1);
  }, [charges, allProjects]);

  // DAS direct per project
  const dasCost = useMemo(() => {
    return dasExpenses.filter((d: any) => d.projectId === project.id).reduce((s: number, d: any) => s + d.value, 0);
  }, [dasExpenses, project.id]);

  const totalCost = totalMaterials + totalProjectPurchases + totalOutsourced + laborCost + dasCost + chargesCost + totalDocsCost + totalRentals;

  // Revenue from approved/paid measurements
  const totalReceived = useMemo(() => {
    return measurements.
    filter((m: any) => m.status === 'aprovada' || m.status === 'paga').
    reduce((s: number, m: any) => s + m.value, 0);
  }, [measurements]);

  const totalPaid = useMemo(() => {
    return measurements.filter((m: any) => m.status === 'paga').reduce((s: number, m: any) => s + m.value, 0);
  }, [measurements]);

  const profit = project.contractValue - totalCost;
  const margin = project.contractValue > 0 ? profit / project.contractValue * 100 : 0;
  const executionPercent = project.contractValue > 0 ? totalCost / project.contractValue * 100 : 0;

  // Pie chart data
  const pieData = [
  { name: 'Materiais', value: totalMaterials + totalProjectPurchases },
  { name: 'Mão de Obra', value: laborCost },
  { name: 'Terceirizados', value: totalOutsourced },
  { name: 'Aluguéis', value: totalRentals },
  { name: 'Documentação', value: totalDocsCost },
  { name: 'DAS', value: dasCost }].
  filter((d) => d.value > 0);
  const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(25, 95%, 53%)', 'hsl(340, 70%, 50%)', 'hsl(280, 60%, 50%)'];

  // Cost evolution by month (all categories)
  const costEvolution = useMemo(() => {
    const emptyMonth = () => ({ materiais: 0, maoDeObra: 0, terceirizados: 0, alugueis: 0, documentacao: 0, das: 0 });
    const months: Record<string, ReturnType<typeof emptyMonth>> = {};
    const ensure = (m: string) => { if (!months[m]) months[m] = emptyMonth(); };

    // Old purchases (by city)
    purchases.forEach((p: any) => { const m = p.date.slice(0, 7); ensure(m); months[m].materiais += p.finalPrice; });
    // Project purchases (split into installments when parceled)
    (projectPurchases || []).forEach((p: any) => {
      const total = p.totalValue + (p.freightValue || 0) + (p.icmsValue || 0);
      const isParceled = (p.paymentMethod === 'boleto' || p.paymentMethod === 'credito') && (p.installments || 1) > 1;
      if (isParceled) {
        const n = p.installments;
        const per = total / n;
        const startStr = (p.paymentMethod === 'boleto' && p.firstInstallmentDate) ? p.firstInstallmentDate : p.date;
        const start = new Date(startStr + 'T00:00:00');
        for (let i = 0; i < n; i++) {
          const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          ensure(m); months[m].materiais += per;
        }
      } else {
        const m = p.date.slice(0, 7); ensure(m); months[m].materiais += total;
      }
    });
    // Labor
    allocations.forEach((a: any) => {
      if (!a.worked) return;
      const emp = employees.find((e: any) => e.id === a.employeeId);
      if (!emp) return;
      const m = a.date.slice(0, 7); ensure(m);
      months[m].maoDeObra += emp.grossSalary / 22 + calculate13thDailyCost(emp.grossSalary);
    });
    // Outsourced
    outsourced.forEach((s: any) => { const m = s.date.slice(0, 7); ensure(m); months[m].terceirizados += s.value; });
    // Rentals
    (rentals || []).forEach((r: any) => { const m = r.startDate.slice(0, 7); ensure(m); months[m].alugueis += r.totalValue; });
    // Documentation
    (projectDocs || []).forEach((d: any) => { if (d.value > 0) { const m = d.documentDate.slice(0, 7); ensure(m); months[m].documentacao += d.value; } });
    // DAS direct per project
    dasExpenses.filter((d: any) => d.projectId === project.id).forEach((d: any) => { ensure(d.month); months[d.month].das += d.value; });

    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      monthKey: month,
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      ...data,
      total: data.materiais + data.maoDeObra + data.terceirizados + data.alugueis + data.documentacao + data.das
    }));
  }, [purchases, projectPurchases, allocations, outsourced, employees, rentals, projectDocs, dasExpenses, allProjects]);

  // Accumulated cost evolution
  const costAccumulated = useMemo(() => {
    let acc = 0;
    return costEvolution.map(d => { acc += d.total; return { ...d, acumulado: acc }; });
  }, [costEvolution]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Valor Contratado" value={formatCurrency(project.contractValue)} accent />
        <KpiCard label="Total Recebido" value={formatCurrency(totalReceived)} subtitle={`Pago: ${formatCurrency(totalPaid)}`} />
        <KpiCard label="Total Gasto" value={formatCurrency(totalCost)} />
        <KpiCard label="Lucro Bruto" value={formatCurrency(profit)} className={profit >= 0 ? 'border-l-4 border-l-success' : 'border-l-4 border-l-destructive'} />
        <KpiCard label="Margem de Lucro" value={`${margin.toFixed(1)}%`} subtitle={`Exec. Financeira: ${executionPercent.toFixed(1)}%`} />
      </div>

      {/* Cost breakdown cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Mão de Obra</span><p className="text-lg font-semibold mt-1">{formatCurrency(laborCost)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Materiais</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalMaterials)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Terceirizados</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalOutsourced)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Aluguéis</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalRentals)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">DAS Proporcional</span><p className="text-lg font-semibold mt-1">{formatCurrency(dasCost)}</p></div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        {pieData.length > 0 &&
        <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Composição de Custos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        }

        {/* Cost evolution */}
        {costEvolution.length > 0 &&
        <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Evolução de Custos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costAccumulated}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="materiais" name="Materiais" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="maoDeObra" name="Mão de Obra" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="terceirizados" name="Terceirizados" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="alugueis" name="Aluguéis" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(0, 0%, 30%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        }
      </div>

      {/* Monthly cost bar chart */}
      {costEvolution.length > 0 &&
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="text-sm font-semibold mb-4">Gastos Mensais por Categoria</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="materiais" name="Materiais" fill="hsl(221, 83%, 53%)" stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="maoDeObra" name="Mão de Obra" fill="hsl(142, 76%, 36%)" stackId="a" />
              <Bar dataKey="terceirizados" name="Terceirizados" fill="hsl(38, 92%, 50%)" stackId="a" />
              <Bar dataKey="alugueis" name="Aluguéis" fill="hsl(25, 95%, 53%)" stackId="a" />
              <Bar dataKey="documentacao" name="Documentação" fill="hsl(340, 70%, 50%)" stackId="a" />
              <Bar dataKey="das" name="DAS" fill="hsl(280, 60%, 50%)" stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      }

      {/* Monthly breakdown table */}
      {costEvolution.length > 0 &&
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <h3 className="text-sm font-semibold p-6 pb-3">Detalhamento Mensal</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-4 py-3">Mês</th>
                <th className="label-caps text-right px-4 py-3">Materiais</th>
                <th className="label-caps text-right px-4 py-3">Mão de Obra</th>
                <th className="label-caps text-right px-4 py-3">Terceiriz.</th>
                <th className="label-caps text-right px-4 py-3">Aluguéis</th>
                <th className="label-caps text-right px-4 py-3">Docs</th>
                <th className="label-caps text-right px-4 py-3">DAS</th>
                <th className="label-caps text-right px-4 py-3 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {costEvolution.map((d) => (
                <tr key={d.monthKey} className="border-b border-border hover:bg-row-hover transition-colors">
                  <td className="px-4 py-3 font-medium">{d.month}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(d.materiais)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(d.maoDeObra)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(d.terceirizados)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(d.alugueis)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(d.documentacao)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(d.das)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(d.total)}</td>
                </tr>
              ))}
              <tr className="bg-muted font-bold">
                <td className="px-4 py-3">Total Geral</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.materiais, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.maoDeObra, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.terceirizados, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.alugueis, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.documentacao, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.das, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(costEvolution.reduce((s, d) => s + d.total, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      }

      {/* Recent measurements */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="text-sm font-semibold mb-4">Últimas Medições</h3>
        {measurements.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma medição registrada.</p> :
        <div className="space-y-2">
            {measurements.slice(-5).reverse().map((m: any) =>
          <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <span className="font-medium">Medição #{m.number}</span>
                  <span className="text-muted-foreground ml-2">{m.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MeasurementBadge status={m.status} />
                  <span className="font-medium">{formatCurrency(m.value)}</span>
                </div>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}

function KpiCard({ label, value, subtitle, accent, className }: {label: string;value: string;subtitle?: string;accent?: boolean;className?: string;}) {
  return (
    <div className={`rounded-xl p-5 shadow-card ${accent ? 'bg-primary text-primary-foreground' : 'bg-card'} ${className || ''}`}>
      <span className={`label-caps text-xs ${accent ? 'text-primary-foreground/70' : ''}`}>{label}</span>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {subtitle && <p className={`text-xs mt-0.5 ${accent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{subtitle}</p>}
    </div>);

}

function MeasurementBadge({ status }: {status: MeasurementStatus;}) {
  const styles: Record<MeasurementStatus, string> = {
    pendente: 'bg-muted text-muted-foreground',
    enviada: 'bg-primary/10 text-primary',
    aprovada: 'bg-success/10 text-success',
    paga: 'bg-success/20 text-success'
  };
  const label = MEASUREMENT_STATUSES.find((s) => s.value === status)?.label || status;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>{label}</span>;
}

/* ── Measurements Tab ── */
function MeasurementsTab({ projectId, measurements, onAdd, onUpdate, onDelete }: {projectId: string;measurements: Measurement[];onAdd: any;onUpdate: any;onDelete: any;}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const nextNumber = measurements.length > 0 ? Math.max(...measurements.map((m) => m.number)) + 1 : 1;
  const [form, setForm] = useState({ number: nextNumber, date: '', description: '', value: 0, percentExecuted: 0, status: 'pendente' as MeasurementStatus });

  const totalApproved = measurements.filter((m) => m.status === 'aprovada' || m.status === 'paga').reduce((s, m) => s + m.value, 0);
  const totalAll = measurements.reduce((s, m) => s + m.value, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const existing = measurements.find((m) => m.id === editId)!;
      onUpdate({ ...existing, ...form });
      setEditId(null);
    } else {
      onAdd({ ...form, projectId });
    }
    setForm({ number: nextNumber + 1, date: '', description: '', value: 0, percentExecuted: 0, status: 'pendente' });
    setShowForm(false);
  };

  const handleEdit = (m: Measurement) => {
    setEditId(m.id);
    setForm({ number: m.number, date: m.date, description: m.description, value: m.value, percentExecuted: m.percentExecuted, status: m.status });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Total Medições</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalAll)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Aprovadas/Pagas</span><p className="text-xl font-semibold mt-1 text-success">{formatCurrency(totalApproved)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Qtd. Medições</span><p className="text-xl font-semibold mt-1">{measurements.length}</p></div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => {setEditId(null);setForm({ number: nextNumber, date: '', description: '', value: 0, percentExecuted: 0, status: 'pendente' });setShowForm(!showForm);}} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Medição
        </button>
      </div>

      {showForm &&
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="label-caps block mb-1">Nº Medição</label><input type="number" required value={form.number} onChange={(e) => setForm({ ...form, number: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data *</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Valor *</label><input type="number" step="0.01" required value={form.value || ''} onChange={(e) => setForm({ ...form, value: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="md:col-span-2"><label className="label-caps block mb-1">Descrição</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">% Executado</label><input type="number" step="0.1" min="0" max="100" value={form.percentExecuted || ''} onChange={(e) => setForm({ ...form, percentExecuted: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div>
            <label className="label-caps block mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MeasurementStatus })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {MEASUREMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editId ? 'Salvar' : 'Adicionar'}</button>
            {editId && <button type="button" onClick={() => {setEditId(null);setShowForm(false);}} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>}
          </div>
        </form>
      }

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted">
            <th className="label-caps text-left px-4 py-3">Nº</th>
            <th className="label-caps text-left px-4 py-3">Data</th>
            <th className="label-caps text-left px-4 py-3">Descrição</th>
            <th className="label-caps text-right px-4 py-3">Valor</th>
            <th className="label-caps text-right px-4 py-3">% Exec.</th>
            <th className="label-caps text-center px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {measurements.sort((a, b) => a.number - b.number).map((m) =>
            <React.Fragment key={m.id}>
              <tr className="border-b border-border">
                <td className="px-4 py-3 font-medium">#{m.number}</td>
                <td className="px-4 py-3">{formatDate(m.date)}</td>
                <td className="px-4 py-3">{m.description}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(m.value)}</td>
                <td className="px-4 py-3 text-right">{m.percentExecuted.toFixed(1)}%</td>
                <td className="px-4 py-3 text-center"><MeasurementBadge status={m.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleEdit(m)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(m.id)} className="p-1 text-destructive hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
              <tr><td colSpan={7} className="px-4 py-2 bg-muted/30"><AttachedDocuments entityType="measurement" entityId={m.id} /></td></tr>
              </React.Fragment>
            )}
          </tbody>
        </table>
        {measurements.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma medição registrada.</p>}
      </div>
    </div>);

}

/* ── Allocations Tab ── */
function AllocationsTab({ projectId, allocations, employees, onAdd, onDelete }: any) {
  const [form, setForm] = useState({ employeeId: '', date: '', interior: false });
  const [showForm, setShowForm] = useState(false);

  const activeEmployees = useMemo(() => employees.filter((e: any) => e.status === 'ativo'), [employees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exists = allocations.find((a: any) => a.employeeId === form.employeeId && a.date === form.date);
    if (exists) { return; }
    onAdd({ employeeId: form.employeeId, projectId, date: form.date, worked: true, interior: form.interior, absenceType: '', absenceReason: '', absenceNotes: '' });
    setForm({ employeeId: '', date: '', interior: false });
    setShowForm(false);
  };

  // Batch add
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState('');
  const [batchEntries, setBatchEntries] = useState<Record<string, { selected: boolean; interior: boolean }>>({});

  const initBatch = () => {
    const entries: Record<string, { selected: boolean; interior: boolean }> = {};
    activeEmployees.forEach((e: any) => { entries[e.id] = { selected: true, interior: false }; });
    setBatchEntries(entries);
    setBatchDate(new Date().toISOString().slice(0, 10));
    setBatchOpen(true);
  };

  const handleBatchSubmit = () => {
    if (!batchDate) return;
    Object.entries(batchEntries).forEach(([empId, entry]) => {
      if (!entry.selected) return;
      const exists = allocations.find((a: any) => a.employeeId === empId && a.date === batchDate);
      if (!exists) {
        onAdd({ employeeId: empId, projectId, date: batchDate, worked: true, interior: entry.interior, absenceType: '', absenceReason: '', absenceNotes: '' });
      }
    });
    setBatchOpen(false);
  };

  const grouped = useMemo(() => {
    const g: Record<string, typeof allocations> = {};
    allocations.filter((a: any) => a.worked).forEach((a: any) => {if (!g[a.date]) g[a.date] = [];g[a.date].push(a);});
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [allocations]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={initBatch} className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-sm font-medium hover:bg-muted">Registro em Lote</button>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Registrar Presença</button>
      </div>

      {batchOpen && (
        <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
          <h3 className="font-semibold text-sm">Registro em Lote</h3>
          <div><label className="label-caps block mb-1">Data</label><input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="space-y-2">
            {activeEmployees.map((emp: any) => {
              const entry = batchEntries[emp.id] || { selected: true, interior: false };
              const exists = batchDate ? allocations.find((a: any) => a.employeeId === emp.id && a.date === batchDate) : false;
              return (
                <div key={emp.id} className={`flex items-center justify-between py-2 border-b border-border ${exists ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={entry.selected && !exists} disabled={!!exists} onChange={e => setBatchEntries(prev => ({ ...prev, [emp.id]: { ...entry, selected: e.target.checked } }))} />
                    <span className="text-sm font-medium">{emp.name}</span>
                    {exists && <span className="text-xs text-muted-foreground">(já registrado)</span>}
                  </div>
                  {!exists && entry.selected && (
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={entry.interior} onChange={e => setBatchEntries(prev => ({ ...prev, [emp.id]: { ...entry, interior: e.target.checked } }))} />
                      Interior
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setBatchOpen(false)} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>
            <button onClick={handleBatchSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar Todos</button>
          </div>
        </div>
      )}

      {showForm &&
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card flex flex-wrap gap-3 items-end">
          <div><label className="label-caps block mb-1">Colaborador</label>
            <select required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">Selecione</option>
              {activeEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="label-caps block mb-1">Data</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.interior} onChange={(e) => setForm({ ...form, interior: e.target.checked })} /> Interior</label>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar</button>
        </form>
      }
      {grouped.map(([date, allocs]: [string, any[]]) =>
      <div key={date} className="bg-card rounded-xl p-4 shadow-card">
          <p className="font-medium text-sm mb-2">{formatDate(date)}</p>
          <div className="space-y-1">
            {allocs.map((a: any) => {
            const emp = employees.find((e: any) => e.id === a.employeeId);
            return (
              <div key={a.id} className="flex items-center justify-between py-1 text-sm">
                  <span>{emp?.name || '—'} {a.interior && <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">Interior</span>}</span>
                  <button onClick={() => onDelete(a.id)} className="text-destructive hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>);

          })}
          </div>
        </div>
      )}
      {allocations.filter((a: any) => a.worked).length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma presença registrada.</p>}
    </div>);

}

/* ── Materials Tab ── */
function MaterialsTab({ projectId, purchases, suppliers, materials, projectPurchases, onAdd, onUpdate, onDelete }: any) {
  const { addSupplier, addMaterial } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyForm = { date: '', supplierId: '', materialId: '', category: '', invoiceNumber: '', quantity: 1, unitPrice: 0, totalValue: 0, freightValue: 0, icmsValue: 0, description: '', notes: '', paymentMethod: '', installments: 1, firstInstallmentDate: '', freightPaymentDate: '', icmsPaymentDate: '' };
  const [form, setForm] = useState(emptyForm);

  // Quick-add supplier
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState({ name: '', cnpj: '', phone: '', notes: '' });
  const handleQuickSupplier = async () => {
    if (!quickSupplier.name) return;
    await addSupplier({ name: quickSupplier.name, cnpj: quickSupplier.cnpj, phone: quickSupplier.phone, email: '', address: '', notes: quickSupplier.notes });
    setQuickSupplier({ name: '', cnpj: '', phone: '', notes: '' });
    setShowQuickSupplier(false);
  };

  // Quick-add material
  const [showQuickMaterial, setShowQuickMaterial] = useState(false);
  const [quickMaterial, setQuickMaterial] = useState({ name: '', category: '', unit: '', notes: '' });
  const handleQuickMaterial = async () => {
    if (!quickMaterial.name) return;
    await addMaterial({ name: quickMaterial.name, description: '', unit: quickMaterial.unit, category: quickMaterial.category, notes: quickMaterial.notes });
    setQuickMaterial({ name: '', category: '', unit: '', notes: '' });
    setShowQuickMaterial(false);
  };

  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  const totalProjectPurchases = (projectPurchases || []).reduce((s: number, p: any) => s + p.totalValue + (p.freightValue || 0) + (p.icmsValue || 0), 0);
  const totalFreight = (projectPurchases || []).reduce((s: number, p: any) => s + (p.freightValue || 0), 0);
  const totalIcms = (projectPurchases || []).reduce((s: number, p: any) => s + (p.icmsValue || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const existing = (projectPurchases || []).find((p: any) => p.id === editId);
      if (existing) onUpdate({ ...existing, ...form, supplierId: form.supplierId || null, materialId: form.materialId || null });
      setEditId(null);
    } else {
      onAdd({ ...form, projectId, supplierId: form.supplierId || null, materialId: form.materialId || null });
    }
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleEdit = (p: any) => {
    setEditId(p.id);
    const mat = p.materialId ? materials.find((m: any) => m.id === p.materialId) : null;
    setForm({ date: p.date, supplierId: p.supplierId || '', materialId: p.materialId || '', category: mat?.category || '', invoiceNumber: p.invoiceNumber, quantity: p.quantity || 1, unitPrice: p.unitPrice || 0, totalValue: p.totalValue, freightValue: p.freightValue || 0, icmsValue: p.icmsValue || 0, description: p.description, notes: p.notes, paymentMethod: p.paymentMethod || '', installments: p.installments || 1, firstInstallmentDate: p.firstInstallmentDate || '' });
  };

  const handlePopoverSave = () => {
    if (editId) {
      const existing = (projectPurchases || []).find((p: any) => p.id === editId);
      if (existing) onUpdate({ ...existing, ...form, supplierId: form.supplierId || null, materialId: form.materialId || null });
    }
    setEditId(null);
    setForm(emptyForm);
  };

  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const sorted = [...(projectPurchases || [])].sort((a: any, b: any) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Compras (NF)</span><p className="text-lg font-semibold mt-1">{formatCurrency((projectPurchases || []).reduce((s: number, p: any) => s + p.totalValue, 0))}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Frete</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalFreight)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">ICMS</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalIcms)}</p></div>
        <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-card"><span className="label-caps text-xs text-primary-foreground/70">Custo Total</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalProjectPurchases + totalMaterials)}</p></div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => {setEditId(null);setForm(emptyForm);setShowForm(!showForm);}} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Nova Compra</button>
      </div>

      {/* Quick-add supplier dialog */}
      {showQuickSupplier &&
      <div className="bg-accent/30 rounded-xl p-4 space-y-3 border border-border">
          <h4 className="text-sm font-semibold">Cadastro Rápido de Fornecedor</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label-caps block mb-1">Nome *</label><input value={quickSupplier.name} onChange={(e) => setQuickSupplier({ ...quickSupplier, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">CNPJ/CPF</label><input value={quickSupplier.cnpj} onChange={(e) => setQuickSupplier({ ...quickSupplier, cnpj: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Telefone</label><input value={quickSupplier.phone} onChange={(e) => setQuickSupplier({ ...quickSupplier, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Observação</label><input value={quickSupplier.notes} onChange={(e) => setQuickSupplier({ ...quickSupplier, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleQuickSupplier} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar Fornecedor</button>
            <button onClick={() => setShowQuickSupplier(false)} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      }

      {/* Quick-add material dialog */}
      {showQuickMaterial &&
      <div className="bg-accent/30 rounded-xl p-4 space-y-3 border border-border">
          <h4 className="text-sm font-semibold">Cadastro Rápido de Material</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label-caps block mb-1">Nome *</label><input value={quickMaterial.name} onChange={(e) => setQuickMaterial({ ...quickMaterial, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Categoria</label>
              <select value={quickMaterial.category} onChange={(e) => setQuickMaterial({ ...quickMaterial, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Selecione</option>
                {MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label-caps block mb-1">Unidade</label>
              <select value={quickMaterial.unit} onChange={(e) => setQuickMaterial({ ...quickMaterial, unit: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Selecione</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label className="label-caps block mb-1">Observação</label><input value={quickMaterial.notes} onChange={(e) => setQuickMaterial({ ...quickMaterial, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleQuickMaterial} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar Material</button>
            <button onClick={() => setShowQuickMaterial(false)} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      }

      {showForm &&
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="label-caps block mb-1">Data *</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div>
              <label className="label-caps block mb-1">Fornecedor (opcional)</label>
              <div className="flex gap-1">
                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="flex-1 min-w-0 max-w-[220px] px-3 py-2 rounded-lg border border-input bg-background text-sm truncate">
                  <option value="">— Nenhum —</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowQuickSupplier(true)} className="px-2 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors" title="Cadastro rápido"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <label className="label-caps block mb-1">Material (opcional)</label>
              <div className="flex gap-1">
                <select value={form.materialId} onChange={(e) => {
                    const selectedMat = materials.find((m: any) => m.id === e.target.value);
                    setForm({ ...form, materialId: e.target.value, category: selectedMat?.category || form.category });
                  }} className="flex-1 min-w-0 max-w-[220px] px-3 py-2 rounded-lg border border-input bg-background text-sm truncate">
                  <option value="">— Nenhum —</option>
                  {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}{m.category ? ` (${m.category})` : ''}</option>)}
                </select>
                <button type="button" onClick={() => setShowQuickMaterial(true)} className="px-2 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors" title="Cadastro rápido"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div><label className="label-caps block mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Selecione</option>
                {MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div><label className="label-caps block mb-1">Nº Nota Fiscal</label><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Quantidade *</label><input type="number" required min="0" step="any" value={form.quantity || ''} onChange={(e) => { const q = parseFloat(e.target.value) || 0; setForm({ ...form, quantity: q, totalValue: q * (form.unitPrice || 0) }); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Valor Unitário (R$) *</label><input type="number" required min="0" step="0.01" value={form.unitPrice || ''} onChange={(e) => { const u = parseFloat(e.target.value) || 0; setForm({ ...form, unitPrice: u, totalValue: (form.quantity || 0) * u }); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Valor Total NF (R$)</label><input type="number" min="0" step="0.01" value={form.totalValue || ''} onChange={(e) => setForm({ ...form, totalValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Valor Frete (R$)</label><input type="number" min="0" step="0.01" value={form.freightValue || ''} onChange={(e) => setForm({ ...form, freightValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="label-caps block mb-1">Valor ICMS (R$)</label><input type="number" min="0" step="0.01" value={form.icmsValue || ''} onChange={(e) => setForm({ ...form, icmsValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Forma de Pagamento</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, installments: (e.target.value === 'credito' || e.target.value === 'boleto') ? form.installments : 1 })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Selecione</option>
                {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
              </select>
            </div>
            {(form.paymentMethod === 'credito' || form.paymentMethod === 'boleto') && (
              <div><label className="label-caps block mb-1">Nº de Parcelas</label><input type="number" min="1" max="48" value={form.installments} onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                {form.installments > 0 && (form.totalValue + (form.freightValue || 0) + (form.icmsValue || 0)) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Valor por parcela: <span className="font-medium text-foreground">{formatCurrency((form.totalValue + (form.freightValue || 0) + (form.icmsValue || 0)) / form.installments)}</span></p>
                )}
              </div>
            )}
            {form.paymentMethod === 'boleto' && (
              <div><label className="label-caps block mb-1">1ª Parcela em *</label><input type="date" required value={form.firstInstallmentDate} onChange={(e) => setForm({ ...form, firstInstallmentDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            )}
            <div><label className="label-caps block mb-1">Observações</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editId ? 'Atualizar' : 'Salvar'}</button>
            {editId && <button type="button" onClick={() => {setEditId(null);setForm(emptyForm);setShowForm(false);}} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>}
          </div>
        </form>
      }

      {/* Project purchases list */}
      {sorted.length > 0 &&
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <h3 className="text-sm font-semibold px-4 pt-4 pb-2">Compras e Despesas da Obra</h3>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted">
              <th className="label-caps text-left px-4 py-3">Data</th>
              <th className="label-caps text-left px-4 py-3">Material</th>
              <th className="label-caps text-left px-4 py-3 hidden md:table-cell">Categoria</th>
              <th className="label-caps text-left px-4 py-3 hidden md:table-cell">Fornecedor</th>
              <th className="label-caps text-left px-4 py-3 hidden lg:table-cell">Nº NF</th>
              <th className="label-caps text-right px-4 py-3 hidden md:table-cell">Qtd</th>
              <th className="label-caps text-right px-4 py-3 hidden lg:table-cell">Val. Unit.</th>
              <th className="label-caps text-right px-4 py-3">Valor NF</th>
              <th className="label-caps text-right px-4 py-3 hidden lg:table-cell">Frete</th>
              <th className="label-caps text-right px-4 py-3 hidden lg:table-cell">ICMS</th>
              <th className="label-caps text-right px-4 py-3">Total</th>
              <th className="label-caps text-left px-4 py-3 hidden md:table-cell">Pagamento</th>
              <th className="label-caps text-center px-4 py-3 whitespace-nowrap">Ações</th>
            </tr></thead>
            <tbody>
              {sorted.map((p: any) => {
              const itemTotal = p.totalValue + (p.freightValue || 0) + (p.icmsValue || 0);
              const mat = p.materialId ? materials.find((m: any) => m.id === p.materialId) : null;
              return (
                <React.Fragment key={p.id}>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-4 py-3">{mat?.name || p.description || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{mat?.category ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">{mat.category}</span> : '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{p.supplierId ? suppliers.find((s: any) => s.id === p.supplierId)?.name || '—' : '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{p.quantity || 1}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">{p.unitPrice ? formatCurrency(p.unitPrice) : '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(p.totalValue)}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">{p.freightValue ? formatCurrency(p.freightValue) : '—'}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">{p.icmsValue ? formatCurrency(p.icmsValue) : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatCurrency(itemTotal)}</td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">{(() => {
                      const pm = PAYMENT_METHODS.find(x => x.value === p.paymentMethod);
                      const label = pm?.label || '—';
                      if ((p.paymentMethod === 'credito' || p.paymentMethod === 'boleto') && p.installments > 1) {
                        const itemTotalPm = p.totalValue + (p.freightValue || 0) + (p.icmsValue || 0);
                        const perParcel = itemTotalPm / p.installments;
                        return (
                          <div className="leading-tight">
                            <div>{label} {p.installments}x de {formatCurrency(perParcel)}</div>
                            {p.paymentMethod === 'boleto' && p.firstInstallmentDate && (
                              <div className="text-xs text-muted-foreground">1ª: {formatDate(p.firstInstallmentDate)}</div>
                            )}
                          </div>
                        );
                      }
                      return label;
                    })()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setExpandedPurchaseId(expandedPurchaseId === p.id ? null : p.id)} className="p-1.5 rounded hover:bg-accent" title="Anexar documentos"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
                        <Popover open={editId === p.id} onOpenChange={(open) => { if (!open) { setEditId(null); setForm(emptyForm); } }}>
                          <PopoverTrigger asChild>
                            <button onClick={() => handleEdit(p)} className="p-1.5 rounded hover:bg-primary/10" title="Editar"><Pencil className="w-4 h-4 text-primary" /></button>
                          </PopoverTrigger>
                          <PopoverContent side="left" align="start" className="w-[420px] max-h-[80vh] overflow-y-auto p-4">
                            <h4 className="text-sm font-semibold mb-3">Editar Compra</h4>
                            <div className="grid gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="label-caps block mb-1 text-xs">Data</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                                <div><label className="label-caps block mb-1 text-xs">Nº Nota Fiscal</label><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                              </div>
                              <div><label className="label-caps block mb-1 text-xs">Fornecedor</label>
                                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm">
                                  <option value="">— Nenhum —</option>
                                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                              </div>
                              <div><label className="label-caps block mb-1 text-xs">Material</label>
                                <select value={form.materialId} onChange={(e) => {
                                    const selectedMat = materials.find((m: any) => m.id === e.target.value);
                                    setForm({ ...form, materialId: e.target.value, category: selectedMat?.category || form.category });
                                  }} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm">
                                  <option value="">— Nenhum —</option>
                                  {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}{m.category ? ` (${m.category})` : ''}</option>)}
                                </select>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div><label className="label-caps block mb-1 text-xs">Qtd</label><input type="number" min="0" step="any" value={form.quantity || ''} onChange={(e) => { const q = parseFloat(e.target.value) || 0; setForm({ ...form, quantity: q, totalValue: q * (form.unitPrice || 0) }); }} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                                <div><label className="label-caps block mb-1 text-xs">Val. Unit.</label><input type="number" min="0" step="0.01" value={form.unitPrice || ''} onChange={(e) => { const u = parseFloat(e.target.value) || 0; setForm({ ...form, unitPrice: u, totalValue: (form.quantity || 0) * u }); }} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                                <div><label className="label-caps block mb-1 text-xs">Val. NF</label><input type="number" min="0" step="0.01" value={form.totalValue || ''} onChange={(e) => setForm({ ...form, totalValue: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="label-caps block mb-1 text-xs">Frete (R$)</label><input type="number" min="0" step="0.01" value={form.freightValue || ''} onChange={(e) => setForm({ ...form, freightValue: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                                <div><label className="label-caps block mb-1 text-xs">ICMS (R$)</label><input type="number" min="0" step="0.01" value={form.icmsValue || ''} onChange={(e) => setForm({ ...form, icmsValue: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="label-caps block mb-1 text-xs">Pagamento</label>
                                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, installments: (e.target.value === 'credito' || e.target.value === 'boleto') ? form.installments : 1 })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm">
                                    <option value="">Selecione</option>
                                    {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                                  </select>
                                </div>
                                {(form.paymentMethod === 'credito' || form.paymentMethod === 'boleto') && (
                                  <div><label className="label-caps block mb-1 text-xs">Parcelas</label><input type="number" min="1" max="48" value={form.installments} onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) || 1 })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                                )}
                              </div>
                              {(form.paymentMethod === 'credito' || form.paymentMethod === 'boleto') && form.installments > 0 && (form.totalValue + (form.freightValue || 0) + (form.icmsValue || 0)) > 0 && (
                                <p className="text-xs text-muted-foreground -mt-1">Valor por parcela: <span className="font-medium text-foreground">{formatCurrency((form.totalValue + (form.freightValue || 0) + (form.icmsValue || 0)) / form.installments)}</span></p>
                              )}
                              {form.paymentMethod === 'boleto' && (
                                <div><label className="label-caps block mb-1 text-xs">1ª Parcela em</label><input type="date" value={form.firstInstallmentDate} onChange={(e) => setForm({ ...form, firstInstallmentDate: e.target.value })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                              )}
                              <div><label className="label-caps block mb-1 text-xs">Observações</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={handlePopoverSave} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar</button>
                                <button onClick={() => { setEditId(null); setForm(emptyForm); }} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <button onClick={() => onDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10" title="Excluir"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedPurchaseId === p.id && <tr><td colSpan={13} className="px-4 pb-2"><AttachedDocuments entityType="project_purchase" entityId={p.id} /></td></tr>}
                </React.Fragment>);

            })}
            </tbody>
          </table>
          </div>
        </div>
      }

      {/* Legacy purchases by city */}
      {purchases.length > 0 &&
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <h3 className="text-sm font-semibold px-4 pt-4 pb-2">Materiais vinculados por cidade</h3>
          <table className="w-full text-sm">
            <thead><tr className="bg-muted"><th className="label-caps text-left px-4 py-3">Data</th><th className="label-caps text-left px-4 py-3">Material</th><th className="label-caps text-left px-4 py-3">Fornecedor</th><th className="label-caps text-right px-4 py-3">Valor</th></tr></thead>
            <tbody>
              {purchases.map((p: any) =>
            <tr key={p.id} className="border-b border-border">
                  <td className="px-4 py-3">{formatDate(p.date)}</td>
                  <td className="px-4 py-3">{materials.find((m: any) => m.id === p.materialId)?.name || '—'} {(() => { const mat = materials.find((m: any) => m.id === p.materialId); return mat?.category ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium ml-1">{mat.category}</span> : null; })()}</td>
                  <td className="px-4 py-3">{suppliers.find((s: any) => s.id === p.supplierId)?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.finalPrice)}</td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      }

      {sorted.length === 0 && purchases.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma compra registrada.</p>}
    </div>);

}

/* ── Outsourced Tab ── */
function OutsourcedTab({ projectId, services, onAdd, onDelete }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', company: '', cnpj: '', description: '', value: 0, invoiceNumber: '', fileName: '' });
  const [payments, setPayments] = useState<Record<string, { id: string; date: string; value: number; notes: string }[]>>({});
  const [paymentForms, setPaymentForms] = useState<Record<string, { date: string; value: number; notes: string }>>({});
  const [showPaymentForm, setShowPaymentForm] = useState<Record<string, boolean>>({});
  const [expandedService, setExpandedService] = useState<string | null>(null);

  React.useEffect(() => {
    const loadPayments = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const serviceIds = services.map((s: any) => s.id);
      if (serviceIds.length === 0) return;
      const { data } = await supabase.from('outsourced_payments').select('*').in('outsourced_service_id', serviceIds).order('date', { ascending: false });
      if (data) {
        const grouped: Record<string, any[]> = {};
        data.forEach((p: any) => {
          const sid = p.outsourced_service_id;
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push({ id: p.id, date: p.date, value: Number(p.value), notes: p.notes });
        });
        setPayments(grouped);
      }
    };
    loadPayments();
  }, [services]);

  const totalContract = services.reduce((s: number, sv: any) => s + sv.value, 0);
  const totalPaid = Object.values(payments).flat().reduce((s, p) => s + p.value, 0);
  const totalRemaining = totalContract - totalPaid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...form, projectId });
    setForm({ date: '', company: '', cnpj: '', description: '', value: 0, invoiceNumber: '', fileName: '' });
    setShowForm(false);
  };

  const addPayment = async (serviceId: string) => {
    const pForm = paymentForms[serviceId];
    if (!pForm || !pForm.date || !pForm.value) return;
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await (supabase.from('outsourced_payments') as any).insert({
      outsourced_service_id: serviceId,
      date: pForm.date,
      value: pForm.value,
      notes: pForm.notes || '',
    }).select().single();
    if (data) {
      setPayments(prev => ({
        ...prev,
        [serviceId]: [{ id: data.id, date: data.date, value: Number(data.value), notes: data.notes }, ...(prev[serviceId] || [])],
      }));
    }
    setPaymentForms(prev => ({ ...prev, [serviceId]: { date: '', value: 0, notes: '' } }));
    setShowPaymentForm(prev => ({ ...prev, [serviceId]: false }));
  };

  const deletePayment = async (serviceId: string, paymentId: string) => {
    const { supabase } = await import('@/integrations/supabase/client');
    await (supabase.from('outsourced_payments') as any).delete().eq('id', paymentId);
    setPayments(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || []).filter(p => p.id !== paymentId),
    }));
  };

  const getServicePaid = (serviceId: string) => (payments[serviceId] || []).reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps">Valor Total Contratado</span><p className="text-2xl font-semibold mt-1">{formatCurrency(totalContract)}</p></div>
          <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-green-600">Total Pago</span><p className="text-2xl font-semibold mt-1 text-green-600">{formatCurrency(totalPaid)}</p></div>
          <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-orange-600">Saldo Restante</span><p className="text-2xl font-semibold mt-1 text-orange-600">{formatCurrency(totalRemaining)}</p></div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Adicionar</button>
      </div>
      {showForm &&
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label-caps block mb-1">Empresa *</label><input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">CNPJ</label><input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data *</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Valor Total do Serviço *</label><input type="number" step="0.01" required value={form.value || ''} onChange={(e) => setForm({ ...form, value: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="md:col-span-2"><label className="label-caps block mb-1">Descrição</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Nº Nota Fiscal</label><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="flex items-end"><button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar</button></div>
        </form>
      }
      <div className="space-y-3">
        {services.map((s: any) => {
          const paid = getServicePaid(s.id);
          const remaining = s.value - paid;
          const isExpanded = expandedService === s.id;
          const servicePayments = payments[s.id] || [];
          const pForm = paymentForms[s.id] || { date: '', value: 0, notes: '' };
          const showPForm = showPaymentForm[s.id] || false;
          const pctPaid = s.value > 0 ? Math.min((paid / s.value) * 100, 100) : 0;

          return (
            <div key={s.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/50" onClick={() => setExpandedService(isExpanded ? null : s.id)}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="min-w-[90px]"><span className="text-xs text-muted-foreground">Data</span><p className="text-sm font-medium">{formatDate(s.date)}</p></div>
                  <div className="min-w-[140px]"><span className="text-xs text-muted-foreground">Empresa</span><p className="text-sm font-medium">{s.company}</p></div>
                  <div className="flex-1"><span className="text-xs text-muted-foreground">Descrição</span><p className="text-sm">{s.description || '—'}</p></div>
                  <div className="text-right min-w-[120px]"><span className="text-xs text-muted-foreground">Valor Total</span><p className="text-sm font-semibold">{formatCurrency(s.value)}</p></div>
                  <div className="text-right min-w-[100px]"><span className="text-xs text-green-600">Pago</span><p className="text-sm font-medium text-green-600">{formatCurrency(paid)}</p></div>
                  <div className="text-right min-w-[100px]"><span className={`text-xs ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>Restante</span><p className={`text-sm font-medium ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(remaining)}</p></div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="px-4 pb-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctPaid}%` }} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Attached docs */}
                  <AttachedDocuments entityType="outsourced" entityId={s.id} />

                  {/* Payments section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="label-caps text-sm">Pagamentos</h4>
                      <button onClick={() => setShowPaymentForm(prev => ({ ...prev, [s.id]: !showPForm }))} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"><Plus className="w-3 h-3" /> Registrar Pagamento</button>
                    </div>
                    {showPForm && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-muted/50 rounded-lg p-3">
                        <div><label className="text-xs text-muted-foreground block mb-1">Data *</label><input type="date" value={pForm.date} onChange={(e) => setPaymentForms(prev => ({ ...prev, [s.id]: { ...pForm, date: e.target.value } }))} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                        <div><label className="text-xs text-muted-foreground block mb-1">Valor *</label><input type="number" step="0.01" value={pForm.value || ''} onChange={(e) => setPaymentForms(prev => ({ ...prev, [s.id]: { ...pForm, value: +e.target.value } }))} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                        <div><label className="text-xs text-muted-foreground block mb-1">Observações</label><input value={pForm.notes} onChange={(e) => setPaymentForms(prev => ({ ...prev, [s.id]: { ...pForm, notes: e.target.value } }))} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm" /></div>
                        <div className="flex items-end"><button onClick={() => addPayment(s.id)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium">Salvar</button></div>
                      </div>
                    )}
                    {servicePayments.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 text-xs text-muted-foreground">Data</th><th className="text-right px-3 py-2 text-xs text-muted-foreground">Valor</th><th className="text-left px-3 py-2 text-xs text-muted-foreground">Observações</th><th className="px-3 py-2"></th></tr></thead>
                        <tbody>
                          {servicePayments.map(p => (
                            <tr key={p.id} className="border-b border-border/50">
                              <td className="px-3 py-2">{formatDate(p.date)}</td>
                              <td className="px-3 py-2 text-right font-medium text-green-600">{formatCurrency(p.value)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{p.notes || '—'}</td>
                              <td className="px-3 py-2"><button onClick={() => deletePayment(s.id, p.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhum pagamento registrado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {services.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum serviço terceirizado.</p>}
      </div>
    </div>);

}

/* ── Docs Tab ── */
function DocsTab({ projectId, docs, onAdd, onUpdate, onDelete }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'ART' as ProjectDocType, description: '', documentDate: '', expiryDate: '', fileName: '', value: 0, paymentDate: '', paymentStatus: 'pendente' as 'pago' | 'pendente', docNotes: '' });

  const totalDocsCost = docs.reduce((s: number, d: any) => s + (d.value || 0), 0);
  const totalPaid = docs.filter((d: any) => d.paymentStatus === 'pago').reduce((s: number, d: any) => s + (d.value || 0), 0);

  const resetForm = () => setForm({ type: 'ART', description: '', documentDate: '', expiryDate: '', fileName: '', value: 0, paymentDate: '', paymentStatus: 'pendente', docNotes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const existing = docs.find((d: any) => d.id === editId)!;
      onUpdate({ ...existing, ...form });
      setEditId(null);
    } else {
      onAdd({ ...form, projectId });
    }
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (d: any) => {
    setEditId(d.id);
    setForm({ type: d.type, description: d.description, documentDate: d.documentDate, expiryDate: d.expiryDate, fileName: d.fileName, value: d.value || 0, paymentDate: d.paymentDate || '', paymentStatus: d.paymentStatus || 'pendente', docNotes: d.docNotes || '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Total Documentação</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalDocsCost)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Pago</span><p className="text-xl font-semibold mt-1 text-success">{formatCurrency(totalPaid)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Pendente</span><p className="text-xl font-semibold mt-1 text-warning">{formatCurrency(totalDocsCost - totalPaid)}</p></div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => {setEditId(null);resetForm();setShowForm(!showForm);}} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Adicionar Documento</button>
      </div>
      {showForm &&
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label-caps block mb-1">Tipo *</label>
            <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ProjectDocType })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {PROJECT_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="label-caps block mb-1">Descrição</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data do Documento</label><input type="date" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data de Vencimento</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Valor (R$)</label><input type="number" step="0.01" value={form.value || ''} onChange={(e) => setForm({ ...form, value: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="0,00" /></div>
          <div><label className="label-caps block mb-1">Data do Pagamento</label><input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Status Pagamento</label>
            <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as 'pago' | 'pendente' })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div><label className="label-caps block mb-1">Observações</label><input value={form.docNotes} onChange={(e) => setForm({ ...form, docNotes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="md:col-span-2 flex items-end gap-2">
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editId ? 'Atualizar' : 'Salvar'}</button>
            {editId && <button type="button" onClick={() => {setEditId(null);resetForm();setShowForm(false);}} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>}
          </div>
        </form>
      }
      <div className="space-y-2">
        {docs.map((d: any) => {
          const days = d.expiryDate ? daysUntilExpiry(d.expiryDate) : null;
          const expiring = days !== null && days <= 30;
          const expired = days !== null && days < 0;
          return (
            <div key={d.id} className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium">{d.type}</span>
                    {expired && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vencido</span>}
                    {expiring && !expired && <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{days}d</span>}
                    {d.value > 0 && <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.paymentStatus === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{d.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}</span>}
                  </div>
                  <p className="text-sm mt-1">{d.description || '—'}</p>
                  <p className="text-muted-foreground text-xs">{d.documentDate && formatDate(d.documentDate)} {d.expiryDate && `→ ${formatDate(d.expiryDate)}`}</p>
                  {d.value > 0 && <p className="text-sm font-medium mt-1">{formatCurrency(d.value)} {d.paymentDate && <span className="text-muted-foreground text-xs ml-1">pago em {formatDate(d.paymentDate)}</span>}</p>}
                  {d.docNotes && <p className="text-xs text-muted-foreground mt-1">{d.docNotes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(d)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(d.id)} className="text-destructive p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <AttachedDocuments entityType="project_doc" entityId={d.id} />
            </div>);

        })}
        {docs.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum documento cadastrado.</p>}
      </div>
    </div>);

}

/* ── Costs Tab ── */
function CostsTab({ project, allocations, employees, purchases, outsourced, charges, dasExpenses, allProjects, projectPurchases, projectDocs, rentals }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  const totalProjectPurchases = (projectPurchases || []).reduce((s: number, p: any) => s + p.totalValue + (p.freightValue || 0) + (p.icmsValue || 0), 0);
  const totalOutsourced = outsourced.reduce((s: number, sv: any) => s + sv.value, 0);
  const totalDocsCost = (projectDocs || []).reduce((s: number, d: any) => s + (d.value || 0), 0);
  const totalRentals = (rentals || []).reduce((s: number, r: any) => s + r.totalValue, 0);

  const laborCost = useMemo(() => {
    let total = 0;
    allocations.forEach((a: any) => {
      if (!a.worked) return;
      const emp = employees.find((e: any) => e.id === a.employeeId);
      if (!emp) return;
      const dailyCost = emp.grossSalary / 22;
      const thirteenthDaily = calculate13thDailyCost(emp.grossSalary);
      total += dailyCost + thirteenthDaily;
    });
    return total;
  }, [allocations, employees]);

  const chargesCost = useMemo(() => {
    const totalCharges = charges.reduce((s: number, c: any) => s + c.value, 0);
    return totalCharges / (allProjects.length || 1);
  }, [charges, allProjects]);

  const dasCost = useMemo(() => dasExpenses.filter((d: any) => d.projectId === project.id).reduce((s: number, d: any) => s + d.value, 0), [dasExpenses, project.id]);

  const totalCost = totalMaterials + totalProjectPurchases + totalOutsourced + laborCost + dasCost + chargesCost + totalDocsCost + totalRentals;
  const profit = project.contractValue - totalCost;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Materiais / Compras</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalMaterials + totalProjectPurchases)}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Mão de Obra</span><p className="text-xl font-semibold mt-1">{formatCurrency(laborCost)}</p><p className="text-xs text-muted-foreground">Inclui 13º proporcional</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Terceirizados</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalOutsourced)}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Aluguéis</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalRentals)}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Documentação</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalDocsCost)}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">DAS</span><p className="text-xl font-semibold mt-1">{formatCurrency(dasCost)}</p></div>
        <div className="bg-primary text-primary-foreground rounded-xl p-5 shadow-card"><span className="label-caps text-xs text-primary-foreground/70">Custo Total</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalCost)}</p></div>
      </div>
      {project.contractValue > 0 &&
      <div className={`rounded-xl p-5 shadow-card ${profit >= 0 ? 'bg-success/5 border border-success/20' : 'bg-destructive/5 border border-destructive/20'}`}>
          <span className="label-caps">Lucro da Obra</span>
          <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(profit)}</p>
          <p className="text-muted-foreground text-xs mt-1">Contrato: {formatCurrency(project.contractValue)} — Custo: {formatCurrency(totalCost)}</p>
        </div>
      }
    </div>);

}

/* ── Rentals Tab ── */
function RentalsTab({ projectId, rentals, onAdd, onUpdate, onDelete }: {projectId: string;rentals: EquipmentRental[];onAdd: any;onUpdate: any;onDelete: any;}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyForm = { equipmentName: '', equipmentType: 'máquina' as EquipmentType, supplier: '', billingType: 'diária' as BillingType, unitValue: 0, quantity: 0, totalValue: 0, startDate: '', endDate: '', invoiceNumber: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const totalRentals = rentals.reduce((s, r) => s + r.totalValue, 0);

  const billingLabel = (bt: BillingType) => BILLING_TYPES.find((b) => b.value === bt)?.label || bt;
  const equipLabel = (et: EquipmentType) => EQUIPMENT_TYPES.find((e) => e.value === et)?.label || et;

  const handleCalcTotal = (unitValue: number, quantity: number, billingType: BillingType) => {
    if (billingType === 'valor_fechado') return unitValue;
    return unitValue * quantity;
  };

  const updateFormField = (field: string, value: any) => {
    const updated = { ...form, [field]: value };
    if (['unitValue', 'quantity', 'billingType'].includes(field)) {
      updated.totalValue = handleCalcTotal(
        field === 'unitValue' ? value : updated.unitValue,
        field === 'quantity' ? value : updated.quantity,
        field === 'billingType' ? value : updated.billingType
      );
    }
    setForm(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const existing = rentals.find((r) => r.id === editId)!;
      onUpdate({ ...existing, ...form });
      setEditId(null);
    } else {
      onAdd({ ...form, projectId });
    }
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleEdit = (r: EquipmentRental) => {
    setEditId(r.id);
    setForm({ equipmentName: r.equipmentName, equipmentType: r.equipmentType, supplier: r.supplier, billingType: r.billingType, unitValue: r.unitValue, quantity: r.quantity, totalValue: r.totalValue, startDate: r.startDate, endDate: r.endDate, invoiceNumber: r.invoiceNumber, notes: r.notes });
    setShowForm(true);
  };

  const sorted = [...rentals].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Total Aluguéis</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalRentals)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Qtd. Equipamentos</span><p className="text-xl font-semibold mt-1">{rentals.length}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Fornecedores</span><p className="text-xl font-semibold mt-1">{new Set(rentals.map((r) => r.supplier).filter(Boolean)).size}</p></div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => {setEditId(null);setForm(emptyForm);setShowForm(!showForm);}} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo Aluguel
        </button>
      </div>

      {showForm &&
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="label-caps block mb-1">Nome do Equipamento *</label><input required value={form.equipmentName} onChange={(e) => updateFormField('equipmentName', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Tipo *</label>
            <select value={form.equipmentType} onChange={(e) => updateFormField('equipmentType', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {EQUIPMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="label-caps block mb-1">Fornecedor *</label><input required value={form.supplier} onChange={(e) => updateFormField('supplier', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Forma de Cobrança *</label>
            <select value={form.billingType} onChange={(e) => updateFormField('billingType', e.target.value as BillingType)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {BILLING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="label-caps block mb-1">{form.billingType === 'valor_fechado' ? 'Valor Total (R$)' : `Valor por ${billingLabel(form.billingType).replace('Por ', '')} (R$)`} *</label><input type="number" step="0.01" required value={form.unitValue || ''} onChange={(e) => updateFormField('unitValue', +e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          {form.billingType !== 'valor_fechado' &&
        <div><label className="label-caps block mb-1">Quantidade *</label><input type="number" step="0.01" required value={form.quantity || ''} onChange={(e) => updateFormField('quantity', +e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
        }
          <div><label className="label-caps block mb-1">Valor Total (R$)</label><input type="number" step="0.01" value={form.totalValue || ''} onChange={(e) => updateFormField('totalValue', +e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm bg-muted" /></div>
          <div><label className="label-caps block mb-1">Data Início *</label><input type="date" required value={form.startDate} onChange={(e) => updateFormField('startDate', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data Término</label><input type="date" value={form.endDate} onChange={(e) => updateFormField('endDate', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Nº Nota Fiscal</label><input value={form.invoiceNumber} onChange={(e) => updateFormField('invoiceNumber', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="md:col-span-2"><label className="label-caps block mb-1">Observações</label><textarea value={form.notes} onChange={(e) => updateFormField('notes', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm min-h-[60px]" /></div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editId ? 'Atualizar' : 'Salvar'}</button>
            {editId && <button type="button" onClick={() => {setEditId(null);setForm(emptyForm);setShowForm(false);}} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>}
          </div>
        </form>
      }

      {sorted.length > 0 &&
      <div className="space-y-2">
          {sorted.map((r) =>
        <div key={r.id} className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.equipmentName}</span>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium">{equipLabel(r.equipmentType)}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{billingLabel(r.billingType)}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {r.supplier && <span>Fornecedor: {r.supplier} · </span>}
                    {formatDate(r.startDate)}{r.endDate && ` → ${formatDate(r.endDate)}`}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    {r.billingType !== 'valor_fechado' && <span className="text-muted-foreground">{formatCurrency(r.unitValue)} × {r.quantity}</span>}
                    <span className="font-semibold">{formatCurrency(r.totalValue)}</span>
                  </div>
                  {r.invoiceNumber && <p className="text-xs text-muted-foreground">NF: {r.invoiceNumber}</p>}
                  {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(r)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(r.id)} className="text-destructive p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <AttachedDocuments entityType="equipment_rental" entityId={r.id} />
            </div>
        )}
        </div>
      }

      {rentals.length === 0 && !showForm && <p className="text-muted-foreground text-center py-8">Nenhum aluguel de equipamento registrado.</p>}
    </div>);

}