import React, { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import type { Employee } from '@/types/employee';
import { EMPLOYEE_STATUSES } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

const emptyForm: { name: string; cpf: string; role: string; grossSalary: number; admissionDate: string; phone: string; pixKeyType: string; pixKey: string; status: 'ativo' | 'desligado' } = { name: '', cpf: '', role: '', grossSalary: 0, admissionDate: '', phone: '', pixKeyType: '', pixKey: '', status: 'ativo' };

export default function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployeeData();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() =>
    employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.cpf.includes(search)),
    [employees, search]
  );

  const handleOpen = (e?: Employee) => {
    if (e) {
      setEditId(e.id);
      setForm({ name: e.name, cpf: e.cpf, role: e.role, grossSalary: e.grossSalary, admissionDate: e.admissionDate, phone: e.phone || '', pixKeyType: e.pixKeyType || '', pixKey: e.pixKey || '', status: e.status });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.cpf) { toast.error('Preencha nome e CPF.'); return; }
    if (editId) {
      const existing = employees.find(e => e.id === editId)!;
      updateEmployee({ ...existing, ...form });
      toast.success('Colaborador atualizado.');
    } else {
      addEmployee(form);
      toast.success('Colaborador cadastrado.');
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1>Colaboradores</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo Colaborador</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Colaborador</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label-caps mb-1 block">Nome</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label-caps mb-1 block">CPF</label><Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label-caps mb-1 block">Cargo</label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
                <div><label className="label-caps mb-1 block">Salário Bruto</label><Input type="number" min={0} step={0.01} value={form.grossSalary || ''} onChange={e => setForm(f => ({ ...f, grossSalary: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="label-caps mb-1 block">Telefone</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
                <div><label className="label-caps mb-1 block">Data de Admissão</label><Input type="date" value={form.admissionDate} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} /></div>
                <div>
                  <label className="label-caps mb-1 block">Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Employee['status'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Tipo Chave PIX</label>
                  <Select value={form.pixKeyType} onValueChange={v => setForm(f => ({ ...f, pixKeyType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="Telefone">Telefone</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                      <SelectItem value="Chave Aleatória">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="label-caps mb-1 block">Chave PIX</label><Input value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} placeholder="Informe a chave PIX" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editId ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Nome</th>
                <th className="label-caps text-left px-6 py-3">CPF</th>
                <th className="label-caps text-left px-6 py-3">Cargo</th>
                <th className="label-caps text-right px-6 py-3">Salário Bruto</th>
                <th className="label-caps text-left px-6 py-3">Status</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <React.Fragment key={e.id}>
                <tr className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium">{e.name}</td>
                  <td className="px-6 py-4 text-sm">{e.cpf}</td>
                  <td className="px-6 py-4 text-sm">{e.role}</td>
                  <td className="px-6 py-4 text-sm text-right">{formatCurrency(e.grossSalary)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${e.status === 'ativo' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setExpandedId(expandedId === e.id ? null : e.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">{expandedId === e.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                      <button onClick={() => handleOpen(e)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { deleteEmployee(e.id); toast.success('Colaborador removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === e.id && (
                  <tr><td colSpan={6} className="px-6 py-4 bg-muted/30"><AttachedDocuments entityType="employee" entityId={e.id} /></td></tr>
                )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-meta">Nenhum colaborador encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
