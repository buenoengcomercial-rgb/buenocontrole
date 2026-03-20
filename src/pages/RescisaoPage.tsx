import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeData } from '@/context/EmployeeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AttachedDocuments from '@/components/AttachedDocuments';
import { Plus, Trash2, Edit2, Search, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Termination {
  id: string;
  employee_id: string;
  termination_date: string;
  payment_date: string | null;
  value: number;
  notes: string;
  created_at: string;
}

export default function RescisaoPage() {
  const { employees } = useEmployeeData();
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Termination | null>(null);
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    employee_id: '',
    termination_date: '',
    payment_date: '',
    value: '',
    notes: '',
  });

  const fetchTerminations = async () => {
    const { data } = await supabase.from('terminations').select('*').order('created_at', { ascending: false });
    if (data) setTerminations(data as Termination[]);
    setLoading(false);
  };

  useEffect(() => { fetchTerminations(); }, []);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo' || terminations.some(t => t.employee_id === e.id)), [employees, terminations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return terminations;
    const q = search.toLowerCase();
    return terminations.filter(t => {
      const emp = employees.find(e => e.id === t.employee_id);
      return emp?.name.toLowerCase().includes(q);
    });
  }, [terminations, search, employees]);

  const resetForm = () => setForm({ employee_id: '', termination_date: '', payment_date: '', value: '', notes: '' });

  const openNew = () => { resetForm(); setEditing(null); setDialogOpen(true); };
  const openEdit = (t: Termination) => {
    setEditing(t);
    setForm({
      employee_id: t.employee_id,
      termination_date: t.termination_date,
      payment_date: t.payment_date || '',
      value: String(t.value),
      notes: t.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.termination_date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const payload = {
      employee_id: form.employee_id,
      termination_date: form.termination_date,
      payment_date: form.payment_date || null,
      value: Number(form.value) || 0,
      notes: form.notes,
    };

    if (editing) {
      const { error } = await supabase.from('terminations').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); return; }
      toast({ title: 'Rescisão atualizada' });
    } else {
      const { error } = await supabase.from('terminations').insert(payload);
      if (error) { toast({ title: 'Erro ao cadastrar', variant: 'destructive' }); return; }
      toast({ title: 'Rescisão cadastrada' });
    }
    setDialogOpen(false);
    fetchTerminations();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('terminations').delete().eq('id', id);
    toast({ title: 'Rescisão excluída' });
    fetchTerminations();
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rescisões</h1>
          <p className="text-sm text-muted-foreground">Gerencie rescisões e documentos de desligamento</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Rescisão
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma rescisão encontrada</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data Rescisão</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => {
                const emp = employees.find(e => e.id === t.employee_id);
                const isExpanded = expandedRows.has(t.id);
                return (
                  <>
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => toggleRow(t.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{emp?.name || '—'}</TableCell>
                      <TableCell>{format(new Date(t.termination_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{t.payment_date ? format(new Date(t.payment_date + 'T00:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell>{formatCurrency(t.value)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {t.notes ? (
                          <span className="text-xs bg-muted px-2 py-1 rounded inline-block">{t.notes}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita. A rescisão será excluída permanentemente.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(t.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${t.id}-docs`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <FileText className="h-4 w-4" /> Documentos da Rescisão
                            </h4>
                            <AttachedDocuments entityType="termination" entityId={t.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Rescisão' : 'Nova Rescisão'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Colaborador *</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da Rescisão *</Label>
              <Input type="date" value={form.termination_date} onChange={e => setForm(f => ({ ...f, termination_date: e.target.value }))} />
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Salvar Alterações' : 'Cadastrar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
