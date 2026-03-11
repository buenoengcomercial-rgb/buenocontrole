import { useState } from 'react';
import { useProjectData } from '@/context/ProjectContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Plus, X, Search, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
  const { projects, addProject, deleteProject } = useProjectData();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', client: '', city: '', address: '', responsible: '',
    startDate: '', expectedEndDate: '', contractValue: 0, notes: '',
  });

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProject(form);
    setForm({ name: '', client: '', city: '', address: '', responsible: '', startDate: '', expectedEndDate: '', contractValue: 0, notes: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Obras e Projetos</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nova Obra'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label-caps block mb-1">Nome da Obra *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Cliente *</label><input required value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Cidade</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Endereço</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Responsável</label><input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Valor do Contrato</label><input type="number" step="0.01" value={form.contractValue || ''} onChange={e => setForm({ ...form, contractValue: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Data Início</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="label-caps block mb-1">Previsão Término</label><input type="date" value={form.expectedEndDate} onChange={e => setForm({ ...form, expectedEndDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div><label className="label-caps block mb-1">Observações</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">Salvar</button>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obras..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(p => (
          <Link key={p.id} to={`/obras/${p.id}`} className="bg-card rounded-xl p-6 shadow-card hover:shadow-md transition-shadow block">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                <p className="text-meta truncate">{p.client}</p>
                <div className="flex items-center gap-1 mt-1 text-meta">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs">{p.city}</span>
                </div>
                {p.contractValue > 0 && (
                  <p className="text-sm font-medium mt-2 text-primary">{formatCurrency(p.contractValue)}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  {p.startDate && <span>Início: {formatDate(p.startDate)}</span>}
                  {p.expectedEndDate && <span>Término: {formatDate(p.expectedEndDate)}</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-meta text-center py-8">Nenhuma obra encontrada.</p>}
    </div>
  );
}
