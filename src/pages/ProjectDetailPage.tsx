import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/context/ProjectContext';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useAppData } from '@/context/AppContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { daysUntilExpiry } from '@/types/safety';
import { PROJECT_DOC_TYPES } from '@/types/project';
import type { ProjectDocType } from '@/types/project';
import { ArrowLeft, Users, Package, Wrench, FileText, DollarSign, Plus, Trash2, AlertTriangle } from 'lucide-react';

type Tab = 'info' | 'allocations' | 'materials' | 'outsourced' | 'docs' | 'costs';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, allocations, addAllocation, deleteAllocation, outsourcedServices, addOutsourcedService, deleteOutsourcedService, projectDocuments, addProjectDocument, deleteProjectDocument } = useProjectData();
  const { employees } = useEmployeeData();
  const { purchases, suppliers, materials } = useAppData();
  const { charges } = useSafetyData();
  const [tab, setTab] = useState<Tab>('info');

  const project = projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-center"><p className="text-meta">Obra não encontrada.</p><Link to="/obras" className="text-primary text-sm">← Voltar</Link></div>;

  const projAllocations = allocations.filter(a => a.projectId === id);
  const projPurchases = purchases.filter(p => p.city === project.city); // simplified linkage
  const projOutsourced = outsourcedServices.filter(s => s.projectId === id);
  const projDocs = projectDocuments.filter(d => d.projectId === id);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Informações', icon: FileText },
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
          <p className="text-meta">{project.client} — {project.city}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && <InfoTab project={project} onUpdate={updateProject} />}
      {tab === 'allocations' && <AllocationsTab projectId={id!} allocations={projAllocations} employees={employees} onAdd={addAllocation} onDelete={deleteAllocation} />}
      {tab === 'materials' && <MaterialsTab purchases={projPurchases} suppliers={suppliers} materials={materials} />}
      {tab === 'outsourced' && <OutsourcedTab projectId={id!} services={projOutsourced} onAdd={addOutsourcedService} onDelete={deleteOutsourcedService} />}
      {tab === 'docs' && <DocsTab projectId={id!} docs={projDocs} onAdd={addProjectDocument} onDelete={deleteProjectDocument} />}
      {tab === 'costs' && <CostsTab project={project} allocations={projAllocations} employees={employees} purchases={projPurchases} outsourced={projOutsourced} charges={charges} />}
    </div>
  );
}

function InfoTab({ project, onUpdate }: { project: any; onUpdate: (p: any) => void }) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div><span className="label-caps">Cliente</span><p className="mt-1">{project.client}</p></div>
        <div><span className="label-caps">Cidade</span><p className="mt-1">{project.city}</p></div>
        <div><span className="label-caps">Endereço</span><p className="mt-1">{project.address || '—'}</p></div>
        <div><span className="label-caps">Responsável</span><p className="mt-1">{project.responsible || '—'}</p></div>
        <div><span className="label-caps">Data Início</span><p className="mt-1">{project.startDate ? formatDate(project.startDate) : '—'}</p></div>
        <div><span className="label-caps">Previsão Término</span><p className="mt-1">{project.expectedEndDate ? formatDate(project.expectedEndDate) : '—'}</p></div>
        <div><span className="label-caps">Valor do Contrato</span><p className="mt-1 text-lg font-semibold text-primary">{formatCurrency(project.contractValue)}</p></div>
        <div><span className="label-caps">Observações</span><p className="mt-1">{project.notes || '—'}</p></div>
      </div>
    </div>
  );
}

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
    allocations.forEach((a: any) => {
      if (!g[a.date]) g[a.date] = [];
      g[a.date].push(a);
    });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [allocations]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Registrar Presença
        </button>
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
      {allocations.length === 0 && <p className="text-meta text-center py-8">Nenhuma alocação registrada.</p>}
    </div>
  );
}

function MaterialsTab({ purchases, suppliers, materials }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 shadow-card">
        <span className="label-caps">Total em Materiais</span>
        <p className="text-2xl font-semibold mt-1">{formatCurrency(totalMaterials)}</p>
      </div>
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
        {purchases.length === 0 && <p className="text-meta text-center py-8">Nenhum material vinculado.</p>}
      </div>
    </div>
  );
}

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
        <div className="bg-card rounded-xl p-4 shadow-card">
          <span className="label-caps">Total Terceirizados</span>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(total)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
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
              <tr key={s.id} className="border-b border-border">
                <td className="px-4 py-3">{formatDate(s.date)}</td>
                <td className="px-4 py-3">{s.company}</td>
                <td className="px-4 py-3">{s.description}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.value)}</td>
                <td className="px-4 py-3"><button onClick={() => onDelete(s.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && <p className="text-meta text-center py-8">Nenhum serviço terceirizado.</p>}
      </div>
    </div>
  );
}

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
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Adicionar Documento
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label-caps block mb-1">Tipo *</label>
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
            <div key={d.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium">{d.type}</span>
                  {expired && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vencido</span>}
                  {expiring && !expired && <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{days}d</span>}
                </div>
                <p className="text-sm mt-1">{d.description || '—'}</p>
                <p className="text-meta text-xs">{d.documentDate && formatDate(d.documentDate)} {d.expiryDate && `→ ${formatDate(d.expiryDate)}`}</p>
              </div>
              <button onClick={() => onDelete(d.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
        {docs.length === 0 && <p className="text-meta text-center py-8">Nenhum documento cadastrado.</p>}
      </div>
    </div>
  );
}

function CostsTab({ project, allocations, employees, purchases, outsourced, charges }: any) {
  const totalMaterials = purchases.reduce((s: number, p: any) => s + p.finalPrice, 0);
  const totalOutsourced = outsourced.reduce((s: number, sv: any) => s + sv.value, 0);

  // Labor cost: (salary + charges) / 22 days per day worked
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
      total += dailyCost;
    });
    return total;
  }, [allocations, employees, charges]);

  const totalCost = totalMaterials + totalOutsourced + laborCost;
  const profit = project.contractValue - totalCost;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card">
          <span className="label-caps">Materiais</span>
          <p className="text-xl font-semibold mt-1">{formatCurrency(totalMaterials)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <span className="label-caps">Mão de Obra Própria</span>
          <p className="text-xl font-semibold mt-1">{formatCurrency(laborCost)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <span className="label-caps">Terceirizados</span>
          <p className="text-xl font-semibold mt-1">{formatCurrency(totalOutsourced)}</p>
        </div>
        <div className="bg-primary text-primary-foreground rounded-xl p-5 shadow-card">
          <span className="label-caps text-primary-foreground/70">Custo Total</span>
          <p className="text-xl font-semibold mt-1">{formatCurrency(totalCost)}</p>
        </div>
      </div>
      {project.contractValue > 0 && (
        <div className={`rounded-xl p-5 shadow-card ${profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <span className="label-caps">Lucro da Obra</span>
          <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(profit)}</p>
          <p className="text-meta text-xs mt-1">Contrato: {formatCurrency(project.contractValue)} — Custo: {formatCurrency(totalCost)}</p>
        </div>
      )}
    </div>
  );
}
