import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/context/ProjectContext';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useAppData } from '@/context/AppContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { daysUntilExpiry } from '@/types/safety';
import { calculate13thDailyCost } from '@/types/employee';
import { PROJECT_DOC_TYPES, MEASUREMENT_STATUSES } from '@/types/project';
import type { ProjectDocType, MeasurementStatus, Measurement } from '@/types/project';
import { ArrowLeft, Users, Package, Wrench, FileText, DollarSign, Plus, Trash2, AlertTriangle, BarChart3, Ruler, Pencil } from 'lucide-react';
import AttachedDocuments from '@/components/AttachedDocuments';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

type Tab = 'dashboard' | 'allocations' | 'materials' | 'outsourced' | 'docs' | 'measurements' | 'costs';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, allocations, addAllocation, deleteAllocation, outsourcedServices, addOutsourcedService, deleteOutsourcedService, projectDocuments, addProjectDocument, deleteProjectDocument, measurements, addMeasurement, updateMeasurement, deleteMeasurement, dasExpenses } = useProjectData();
  const { employees } = useEmployeeData();
  const { purchases, suppliers, materials } = useAppData();
  const { charges } = useSafetyData();
  const [tab, setTab] = useState<Tab>('dashboard');

  const project = projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-center"><p className="text-muted-foreground">Obra não encontrada.</p><Link to="/obras" className="text-primary text-sm">← Voltar</Link></div>;

  const projAllocations = allocations.filter(a => a.projectId === id);
  const projPurchases = purchases.filter(p => p.city === project.city);
  const projOutsourced = outsourcedServices.filter(s => s.projectId === id);
  const projDocs = projectDocuments.filter(d => d.projectId === id);
  const projMeasurements = measurements.filter(m => m.projectId === id);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'measurements', label: 'Medições', icon: Ruler },
    { key: 'allocations', label: 'Colaboradores', icon: Users },
    { key: 'materials', label: 'Materiais', icon: Package },
    { key: 'outsourced', label: 'Terceirizados', icon: Wrench },
    { key: 'docs', label: 'Documentação', icon: FileText },
    { key: 'costs', label: 'Custos', icon: DollarSign },
  ];

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
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab project={project} allocations={projAllocations} employees={employees} purchases={projPurchases} outsourced={projOutsourced} charges={charges} measurements={projMeasurements} dasExpenses={dasExpenses} allProjects={projects} />}
      {tab === 'measurements' && <MeasurementsTab projectId={id!} measurements={projMeasurements} onAdd={addMeasurement} onUpdate={updateMeasurement} onDelete={deleteMeasurement} />}
      {tab === 'allocations' && <AllocationsTab projectId={id!} allocations={projAllocations} employees={employees} onAdd={addAllocation} onDelete={deleteAllocation} />}
      {tab === 'materials' && <MaterialsTab purchases={projPurchases} suppliers={suppliers} materials={materials} />}
      {tab === 'outsourced' && <OutsourcedTab projectId={id!} services={projOutsourced} onAdd={addOutsourcedService} onDelete={deleteOutsourcedService} />}
      {tab === 'docs' && <DocsTab projectId={id!} docs={projDocs} onAdd={addProjectDocument} onDelete={deleteProjectDocument} />}
      {tab === 'costs' && <CostsTab project={project} allocations={projAllocations} employees={employees} purchases={projPurchases} outsourced={projOutsourced} charges={charges} dasExpenses={dasExpenses} allProjects={projects} />}
    </div>
  );
}

/* ── Dashboard Tab ── */
function DashboardTab({ project, allocations, employees, purchases, outsourced, charges, measurements, dasExpenses, allProjects }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  const totalOutsourced = outsourced.reduce((s: number, sv: any) => s + sv.value, 0);

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
    const totalCharges = charges.reduce((s: number, c: any) => s + c.inssValue + c.fgtsValue, 0);
    return totalCharges / (allProjects.length || 1);
  }, [charges, allProjects]);

  // DAS proportional
  const activeProjectCount = allProjects.length || 1;
  const dasCost = useMemo(() => {
    return dasExpenses.reduce((s: number, d: any) => s + d.value, 0) / activeProjectCount;
  }, [dasExpenses, activeProjectCount]);

  const totalCost = totalMaterials + totalOutsourced + laborCost + dasCost;

  // Revenue from approved/paid measurements
  const totalReceived = useMemo(() => {
    return measurements
      .filter((m: any) => m.status === 'aprovada' || m.status === 'paga')
      .reduce((s: number, m: any) => s + m.value, 0);
  }, [measurements]);

  const totalPaid = useMemo(() => {
    return measurements.filter((m: any) => m.status === 'paga').reduce((s: number, m: any) => s + m.value, 0);
  }, [measurements]);

  const profit = totalReceived - totalCost;
  const margin = totalReceived > 0 ? (profit / totalReceived) * 100 : 0;
  const executionPercent = project.contractValue > 0 ? (totalCost / project.contractValue) * 100 : 0;

  // Pie chart data
  const pieData = [
    { name: 'Materiais', value: totalMaterials },
    { name: 'Mão de Obra', value: laborCost },
    { name: 'Terceirizados', value: totalOutsourced },
    { name: 'DAS Proporcional', value: dasCost },
  ].filter(d => d.value > 0);
  const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(280, 60%, 50%)'];

  // Cost evolution by month
  const costEvolution = useMemo(() => {
    const months: Record<string, { materiais: number; maoDeObra: number; terceirizados: number }> = {};
    purchases.forEach((p: any) => {
      const m = p.date.slice(0, 7);
      if (!months[m]) months[m] = { materiais: 0, maoDeObra: 0, terceirizados: 0 };
      months[m].materiais += p.finalPrice;
    });
    allocations.forEach((a: any) => {
      if (!a.worked) return;
      const emp = employees.find((e: any) => e.id === a.employeeId);
      if (!emp) return;
      const m = a.date.slice(0, 7);
      if (!months[m]) months[m] = { materiais: 0, maoDeObra: 0, terceirizados: 0 };
      const empC = charges.filter((c: any) => c.employeeId === a.employeeId && c.month === m);
      const mc = empC.reduce((s: number, c: any) => s + c.inssValue + c.fgtsValue, 0);
      months[m].maoDeObra += (emp.grossSalary + mc) / 22 + calculate13thDailyCost(emp.grossSalary);
    });
    outsourced.forEach((s: any) => {
      const m = s.date.slice(0, 7);
      if (!months[m]) months[m] = { materiais: 0, maoDeObra: 0, terceirizados: 0 };
      months[m].terceirizados += s.value;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      ...data,
      total: data.materiais + data.maoDeObra + data.terceirizados,
    }));
  }, [purchases, allocations, outsourced, employees, charges]);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Mão de Obra</span><p className="text-lg font-semibold mt-1">{formatCurrency(laborCost)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Materiais</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalMaterials)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">Terceirizados</span><p className="text-lg font-semibold mt-1">{formatCurrency(totalOutsourced)}</p></div>
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps text-xs">DAS Proporcional</span><p className="text-lg font-semibold mt-1">{formatCurrency(dasCost)}</p></div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        {pieData.length > 0 && (
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
        )}

        {/* Cost evolution */}
        {costEvolution.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Evolução de Custos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(240 4% 46%)" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="materiais" name="Materiais" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="maoDeObra" name="Mão de Obra" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="terceirizados" name="Terceirizados" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(0, 0%, 30%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent measurements */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="text-sm font-semibold mb-4">Últimas Medições</h3>
        {measurements.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma medição registrada.</p> : (
          <div className="space-y-2">
            {measurements.slice(-5).reverse().map((m: any) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, subtitle, accent, className }: { label: string; value: string; subtitle?: string; accent?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl p-5 shadow-card ${accent ? 'bg-primary text-primary-foreground' : 'bg-card'} ${className || ''}`}>
      <span className={`label-caps text-xs ${accent ? 'text-primary-foreground/70' : ''}`}>{label}</span>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {subtitle && <p className={`text-xs mt-0.5 ${accent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{subtitle}</p>}
    </div>
  );
}

function MeasurementBadge({ status }: { status: MeasurementStatus }) {
  const styles: Record<MeasurementStatus, string> = {
    pendente: 'bg-muted text-muted-foreground',
    enviada: 'bg-primary/10 text-primary',
    aprovada: 'bg-success/10 text-success',
    paga: 'bg-success/20 text-success',
  };
  const label = MEASUREMENT_STATUSES.find(s => s.value === status)?.label || status;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>{label}</span>;
}

/* ── Measurements Tab ── */
function MeasurementsTab({ projectId, measurements, onAdd, onUpdate, onDelete }: { projectId: string; measurements: Measurement[]; onAdd: any; onUpdate: any; onDelete: any }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const nextNumber = measurements.length > 0 ? Math.max(...measurements.map(m => m.number)) + 1 : 1;
  const [form, setForm] = useState({ number: nextNumber, date: '', description: '', value: 0, percentExecuted: 0, status: 'pendente' as MeasurementStatus });

  const totalApproved = measurements.filter(m => m.status === 'aprovada' || m.status === 'paga').reduce((s, m) => s + m.value, 0);
  const totalAll = measurements.reduce((s, m) => s + m.value, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const existing = measurements.find(m => m.id === editId)!;
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
        <button onClick={() => { setEditId(null); setForm({ number: nextNumber, date: '', description: '', value: 0, percentExecuted: 0, status: 'pendente' }); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Medição
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="label-caps block mb-1">Nº Medição</label><input type="number" required value={form.number} onChange={e => setForm({ ...form, number: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data *</label><input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Valor *</label><input type="number" step="0.01" required value={form.value || ''} onChange={e => setForm({ ...form, value: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="md:col-span-2"><label className="label-caps block mb-1">Descrição</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">% Executado</label><input type="number" step="0.1" min="0" max="100" value={form.percentExecuted || ''} onChange={e => setForm({ ...form, percentExecuted: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div>
            <label className="label-caps block mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as MeasurementStatus })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {MEASUREMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editId ? 'Salvar' : 'Adicionar'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setShowForm(false); }} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>}
          </div>
        </form>
      )}

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
            {measurements.sort((a, b) => a.number - b.number).map((m) => (
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
            ))}
          </tbody>
        </table>
        {measurements.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma medição registrada.</p>}
      </div>
    </div>
  );
}

/* ── Allocations Tab ── */
function AllocationsTab({ projectId, allocations, employees, onAdd, onDelete }: any) {
  const [form, setForm] = useState({ employeeId: '', date: '', worked: true, interior: false });
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...form, projectId });
    setForm({ employeeId: '', date: '', worked: true, interior: false });
    setShowForm(false);
  };

  const grouped = useMemo(() => {
    const g: Record<string, typeof allocations> = {};
    allocations.forEach((a: any) => { if (!g[a.date]) g[a.date] = []; g[a.date].push(a); });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [allocations]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Registrar Presença</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card flex flex-wrap gap-3 items-end">
          <div><label className="label-caps block mb-1">Colaborador</label>
            <select required value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">Selecione</option>
              {employees.filter((e: any) => e.status === 'ativo').map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="label-caps block mb-1">Data</label><input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.interior} onChange={e => setForm({ ...form, interior: e.target.checked })} /> Interior</label>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar</button>
        </form>
      )}
      {grouped.map(([date, allocs]: [string, any[]]) => (
        <div key={date} className="bg-card rounded-xl p-4 shadow-card">
          <p className="font-medium text-sm mb-2">{formatDate(date)}</p>
          <div className="space-y-1">
            {allocs.map((a: any) => {
              const emp = employees.find((e: any) => e.id === a.employeeId);
              return (
                <div key={a.id} className="flex items-center justify-between py-1 text-sm">
                  <span>{emp?.name || '—'} {a.interior && <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">Interior</span>}</span>
                  <button onClick={() => onDelete(a.id)} className="text-destructive hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {allocations.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma alocação registrada.</p>}
    </div>
  );
}

/* ── Materials Tab ── */
function MaterialsTab({ purchases, suppliers, materials }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps">Total em Materiais</span><p className="text-2xl font-semibold mt-1">{formatCurrency(totalMaterials)}</p></div>
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted"><th className="label-caps text-left px-4 py-3">Data</th><th className="label-caps text-left px-4 py-3">Material</th><th className="label-caps text-left px-4 py-3">Fornecedor</th><th className="label-caps text-right px-4 py-3">Valor</th></tr></thead>
          <tbody>
            {purchases.map((p: any) => (
              <tr key={p.id} className="border-b border-border">
                <td className="px-4 py-3">{formatDate(p.date)}</td>
                <td className="px-4 py-3">{materials.find((m: any) => m.id === p.materialId)?.name || '—'}</td>
                <td className="px-4 py-3">{suppliers.find((s: any) => s.id === p.supplierId)?.name || '—'}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.finalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum material vinculado.</p>}
      </div>
    </div>
  );
}

/* ── Outsourced Tab ── */
function OutsourcedTab({ projectId, services, onAdd, onDelete }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', company: '', cnpj: '', description: '', value: 0, invoiceNumber: '', fileName: '' });
  const total = services.reduce((s: number, sv: any) => s + sv.value, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...form, projectId });
    setForm({ date: '', company: '', cnpj: '', description: '', value: 0, invoiceNumber: '', fileName: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="bg-card rounded-xl p-4 shadow-card"><span className="label-caps">Total Terceirizados</span><p className="text-2xl font-semibold mt-1">{formatCurrency(total)}</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Adicionar</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label-caps block mb-1">Empresa *</label><input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">CNPJ</label><input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data *</label><input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Valor *</label><input type="number" step="0.01" required value={form.value || ''} onChange={e => setForm({ ...form, value: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="md:col-span-2"><label className="label-caps block mb-1">Descrição</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Nº Nota Fiscal</label><input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="flex items-end"><button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar</button></div>
        </form>
      )}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted"><th className="label-caps text-left px-4 py-3">Data</th><th className="label-caps text-left px-4 py-3">Empresa</th><th className="label-caps text-left px-4 py-3">Descrição</th><th className="label-caps text-right px-4 py-3">Valor</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>
            {services.map((s: any) => (
              <React.Fragment key={s.id}>
              <tr className="border-b border-border">
                <td className="px-4 py-3">{formatDate(s.date)}</td>
                <td className="px-4 py-3">{s.company}</td>
                <td className="px-4 py-3">{s.description}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.value)}</td>
                <td className="px-4 py-3"><button onClick={() => onDelete(s.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
              <tr><td colSpan={5} className="px-4 py-2 bg-muted/30"><AttachedDocuments entityType="outsourced" entityId={s.id} /></td></tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {services.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum serviço terceirizado.</p>}
      </div>
    </div>
  );
}

/* ── Docs Tab ── */
function DocsTab({ projectId, docs, onAdd, onDelete }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'ART' as ProjectDocType, description: '', documentDate: '', expiryDate: '', fileName: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...form, projectId });
    setForm({ type: 'ART', description: '', documentDate: '', expiryDate: '', fileName: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Adicionar Documento</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label-caps block mb-1">Tipo *</label>
            <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ProjectDocType })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {PROJECT_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="label-caps block mb-1">Descrição</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data do Documento</label><input type="date" value={form.documentDate} onChange={e => setForm({ ...form, documentDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Data de Vencimento</label><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="flex items-end"><button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Salvar</button></div>
        </form>
      )}
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
                  </div>
                  <p className="text-sm mt-1">{d.description || '—'}</p>
                  <p className="text-muted-foreground text-xs">{d.documentDate && formatDate(d.documentDate)} {d.expiryDate && `→ ${formatDate(d.expiryDate)}`}</p>
                </div>
                <button onClick={() => onDelete(d.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              <AttachedDocuments entityType="project_doc" entityId={d.id} />
            </div>
          );
        })}
        {docs.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum documento cadastrado.</p>}
      </div>
    </div>
  );
}

/* ── Costs Tab ── */
function CostsTab({ project, allocations, employees, purchases, outsourced, charges, dasExpenses, allProjects }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  const totalOutsourced = outsourced.reduce((s: number, sv: any) => s + sv.value, 0);

  const laborCost = useMemo(() => {
    let total = 0;
    allocations.forEach((a: any) => {
      if (!a.worked) return;
      const emp = employees.find((e: any) => e.id === a.employeeId);
      if (!emp) return;
      const month = a.date.slice(0, 7);
      const empCharges = charges.filter((c: any) => c.employeeId === a.employeeId && c.month === month);
      const monthlyCharges = empCharges.reduce((s: number, c: any) => s + c.inssValue + c.fgtsValue, 0);
      const dailyCost = (emp.grossSalary + monthlyCharges) / 22;
      const thirteenthDaily = calculate13thDailyCost(emp.grossSalary);
      total += dailyCost + thirteenthDaily;
    });
    return total;
  }, [allocations, employees, charges]);

  const activeProjectCount = allProjects.length || 1;
  const dasCost = useMemo(() => dasExpenses.reduce((s: number, d: any) => s + d.value, 0) / activeProjectCount, [dasExpenses, activeProjectCount]);

  const totalCost = totalMaterials + totalOutsourced + laborCost + dasCost;
  const profit = project.contractValue - totalCost;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Materiais</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalMaterials)}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Mão de Obra</span><p className="text-xl font-semibold mt-1">{formatCurrency(laborCost)}</p><p className="text-xs text-muted-foreground">Inclui 13º proporcional</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">Terceirizados</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalOutsourced)}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-card"><span className="label-caps text-xs">DAS Proporcional</span><p className="text-xl font-semibold mt-1">{formatCurrency(dasCost)}</p></div>
        <div className="bg-primary text-primary-foreground rounded-xl p-5 shadow-card"><span className="label-caps text-xs text-primary-foreground/70">Custo Total</span><p className="text-xl font-semibold mt-1">{formatCurrency(totalCost)}</p></div>
      </div>
      {project.contractValue > 0 && (
        <div className={`rounded-xl p-5 shadow-card ${profit >= 0 ? 'bg-success/5 border border-success/20' : 'bg-destructive/5 border border-destructive/20'}`}>
          <span className="label-caps">Lucro da Obra</span>
          <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(profit)}</p>
          <p className="text-muted-foreground text-xs mt-1">Contrato: {formatCurrency(project.contractValue)} — Custo: {formatCurrency(totalCost)}</p>
        </div>
      )}
    </div>
  );
}
