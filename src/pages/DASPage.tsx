import { useState, useMemo } from 'react';
import { useProjectData } from '@/context/ProjectContext';
import { formatCurrency, formatDate } from '@/lib/format';
import type { DASExpense } from '@/types/project';
import { Plus, Trash2, Pencil, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function DASPage() {
  const { dasExpenses, addDASExpense, updateDASExpense, deleteDASExpense } = useProjectData();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ month: '', value: 0, paid: false });

  const totalDAS = useMemo(() => dasExpenses.reduce((s, d) => s + d.value, 0), [dasExpenses]);
  const totalPaid = useMemo(() => dasExpenses.filter(d => d.paid).reduce((s, d) => s + d.value, 0), [dasExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [y, m] = form.month.split('-').map(Number);
    const dueDate = `${form.month}-20`;

    if (editId) {
      const existing = dasExpenses.find(d => d.id === editId)!;
      updateDASExpense({ ...existing, month: form.month, dueDate, value: form.value, paid: form.paid });
      toast.success('DAS atualizado.');
      setEditId(null);
    } else {
      addDASExpense({ month: form.month, dueDate, value: form.value, paid: form.paid });
      toast.success('DAS registrado.');
    }
    setForm({ month: '', value: 0, paid: false });
    setShowForm(false);
  };

  const handleEdit = (d: DASExpense) => {
    setEditId(d.id);
    setForm({ month: d.month, value: d.value, paid: d.paid });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>DAS — Simples Nacional</h1>
        <button onClick={() => { setEditId(null); setForm({ month: '', value: 0, paid: false }); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Registrar DAS
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-primary text-primary-foreground rounded-xl p-5 shadow-card">
          <span className="label-caps text-primary-foreground/70 text-xs">Total DAS</span>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalDAS)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <span className="label-caps text-xs">Total Pago</span>
          <p className="text-2xl font-semibold mt-1 text-success">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <span className="label-caps text-xs">Pendente</span>
          <p className="text-2xl font-semibold mt-1 text-warning">{formatCurrency(totalDAS - totalPaid)}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div><label className="label-caps block mb-1">Mês de Referência *</label><input type="month" required value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="label-caps block mb-1">Valor *</label><input type="number" step="0.01" required value={form.value || ''} onChange={e => setForm({ ...form, value: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={form.paid} onChange={e => setForm({ ...form, paid: e.target.checked })} /> Pago</label>
          <div className="flex gap-2">
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editId ? 'Salvar' : 'Registrar'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setShowForm(false); }} className="px-4 py-2 border border-input rounded-lg text-sm">Cancelar</button>}
          </div>
        </form>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted">
            <th className="label-caps text-left px-4 py-3">Mês</th>
            <th className="label-caps text-left px-4 py-3">Vencimento</th>
            <th className="label-caps text-right px-4 py-3">Valor</th>
            <th className="label-caps text-center px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {dasExpenses.sort((a, b) => b.month.localeCompare(a.month)).map(d => (
              <tr key={d.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium">{d.month}</td>
                <td className="px-4 py-3">{formatDate(d.dueDate)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(d.value)}</td>
                <td className="px-4 py-3 text-center">
                  {d.paid
                    ? <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium"><CheckCircle2 className="w-3 h-3" />Pago</span>
                    : <span className="inline-flex items-center gap-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium"><Clock className="w-3 h-3" />Pendente</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleEdit(d)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { deleteDASExpense(d.id); toast.success('DAS removido.'); }} className="p-1 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dasExpenses.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum DAS registrado.</p>}
      </div>
    </div>
  );
}
