import { useState } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatDate } from '@/lib/format';
import { DOC_TYPES } from '@/types/safety';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { EmployeeDocument } from '@/types/safety';

export default function DocumentacaoPage() {
  const { employees } = useEmployeeData();
  const { documents, addDocument, deleteDocument } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [form, setForm] = useState({ employeeId: '', type: '' as EmployeeDocument['type'], completed: false, date: '', fileName: '' });

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';

  const filtered = filterEmployee === 'all' ? documents : documents.filter(d => d.employeeId === filterEmployee);

  const handleSubmit = () => {
    if (!form.employeeId || !form.type) { toast.error('Preencha colaborador e tipo.'); return; }
    addDocument(form);
    toast.success('Documento registrado.');
    setOpen(false);
    setForm({ employeeId: '', type: '' as EmployeeDocument['type'], completed: false, date: '', fileName: '' });
  };

  const docTypeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label ?? type;

  // Summary per employee
  const activeEmployees = employees.filter(e => e.status === 'ativo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Documentação do Colaborador</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Documento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Registrar Documento</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="label-caps mb-1 block">Colaborador</label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-caps mb-1 block">Tipo de Documento</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as EmployeeDocument['type'] }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Data</label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Arquivo (nome)</label>
                  <Input value={form.fileName} onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))} placeholder="ex: contrato.pdf" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.completed} onCheckedChange={v => setForm(f => ({ ...f, completed: !!v }))} id="completed" />
                <label htmlFor="completed" className="text-sm">Documento concluído / assinado</label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-meta">Registre a integração de segurança, documentos de contratação e ficha de EPI de cada colaborador. O upload de PDF estará disponível com Lovable Cloud.</p>

      <div>
        <label className="label-caps mb-1 block">Filtrar por Colaborador</label>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Colaborador</th>
                <th className="label-caps text-left px-6 py-3">Tipo</th>
                <th className="label-caps text-left px-6 py-3">Data</th>
                <th className="label-caps text-left px-6 py-3">Arquivo</th>
                <th className="label-caps text-left px-6 py-3">Status</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium">{empName(d.employeeId)}</td>
                  <td className="px-6 py-4 text-sm">{docTypeLabel(d.type)}</td>
                  <td className="px-6 py-4 text-sm">{d.date ? formatDate(d.date) : '—'}</td>
                  <td className="px-6 py-4 text-sm">{d.fileName ? <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{d.fileName}</span> : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${d.completed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {d.completed ? 'Concluído' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { deleteDocument(d.id); toast.success('Documento removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-meta">Nenhum documento registrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
