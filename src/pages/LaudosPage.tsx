import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Phone, Mail, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';

interface Laudo {
  id: string;
  cliente: string;
  responsavel: string;
  municipio: string;
  cnpj: string;
  sat: string;
  email: string;
  numero_projetos: string;
  area: string;
  distrito: string;
  endereco: string;
  utilizacao: string;
  setor_atendimento: string;
  data_vencimento: string | null;
  observacoes: string;
  status_cbm: string;
  status_bueno: string;
  created_at: string;
}

const emptyForm = {
  cliente: '',
  responsavel: '',
  municipio: '',
  cnpj: '',
  sat: '',
  email: '',
  numero_projetos: '',
  area: '',
  distrito: '',
  endereco: '',
  utilizacao: '',
  setor_atendimento: '',
  data_vencimento: '',
  observacoes: '',
  status_cbm: '',
  status_bueno: '',
};

function daysUntilExpiry(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + 'T00:00:00');
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(dateStr: string | null): { label: string; color: string; bgClass: string; sortOrder: number } {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return { label: 'Sem data', color: 'text-muted-foreground', bgClass: '', sortOrder: 5 };
  if (days < 0) return { label: `Vencido (${Math.abs(days)}d)`, color: 'text-red-700', bgClass: 'bg-red-50 dark:bg-red-950/30', sortOrder: 1 };
  if (days <= 30) return { label: `${days}d restantes`, color: 'text-orange-700', bgClass: 'bg-orange-50 dark:bg-orange-950/30', sortOrder: 2 };
  if (days <= 90) return { label: `${days}d restantes`, color: 'text-yellow-700', bgClass: 'bg-yellow-50 dark:bg-yellow-950/30', sortOrder: 3 };
  return { label: `${days}d restantes`, color: 'text-green-700', bgClass: 'bg-green-50 dark:bg-green-950/30', sortOrder: 4 };
}

function getExpiryBadge(dateStr: string | null) {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return <Badge variant="outline" className="text-muted-foreground">Sem data</Badge>;
  if (days < 0) return <Badge className="bg-red-600 hover:bg-red-700 text-white">Vencido ({Math.abs(days)}d)</Badge>;
  if (days <= 30) return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{days}d restantes</Badge>;
  if (days <= 90) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{days}d restantes</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">{days}d restantes</Badge>;
}

type SortField = 'cliente' | 'municipio' | 'data_vencimento' | 'setor_atendimento';
type SortDir = 'asc' | 'desc';

export default function LaudosPage() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sortField, setSortField] = useState<SortField>('data_vencimento');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => { fetchLaudos(); }, []);

  async function fetchLaudos() {
    setLoading(true);
    const { data, error } = await supabase.from('laudos').select('*').order('data_vencimento', { ascending: true, nullsFirst: false });
    if (error) { toast({ title: 'Erro ao carregar laudos', description: error.message, variant: 'destructive' }); }
    else setLaudos((data as any[]) || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let items = laudos.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.cliente.toLowerCase().includes(q) || l.responsavel.toLowerCase().includes(q) || l.municipio.toLowerCase().includes(q) || l.cnpj.includes(q);
      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      const days = daysUntilExpiry(l.data_vencimento);
      if (days === null) return statusFilter === 'sem_data';
      if (statusFilter === 'vencido') return days < 0;
      if (statusFilter === 'laranja') return days >= 0 && days <= 30;
      if (statusFilter === 'amarelo') return days > 30 && days <= 90;
      if (statusFilter === 'regular') return days > 90;
      return true;
    });

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'data_vencimento') {
        const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity;
        const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity;
        cmp = da - db;
      } else {
        cmp = (a[sortField] || '').localeCompare(b[sortField] || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [laudos, search, statusFilter, sortField, sortDir]);

  const stats = useMemo(() => {
    let vencido = 0, laranja = 0, amarelo = 0, regular = 0;
    laudos.forEach(l => {
      const days = daysUntilExpiry(l.data_vencimento);
      if (days === null) return;
      if (days < 0) vencido++;
      else if (days <= 30) laranja++;
      else if (days <= 90) amarelo++;
      else regular++;
    });
    return { vencido, laranja, amarelo, regular, total: laudos.length };
  }, [laudos]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />;
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(l: Laudo) {
    setEditingId(l.id);
    setForm({
      cliente: l.cliente,
      responsavel: l.responsavel,
      municipio: l.municipio,
      cnpj: l.cnpj,
      sat: l.sat,
      email: l.email,
      numero_projetos: l.numero_projetos,
      area: l.area,
      distrito: l.distrito,
      endereco: l.endereco,
      utilizacao: l.utilizacao,
      setor_atendimento: l.setor_atendimento,
      data_vencimento: l.data_vencimento || '',
      observacoes: l.observacoes,
      status_cbm: l.status_cbm,
      status_bueno: l.status_bueno,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.cliente.trim()) { toast({ title: 'Informe o cliente', variant: 'destructive' }); return; }
    const payload = {
      ...form,
      data_vencimento: form.data_vencimento || null,
    };

    if (editingId) {
      const { error } = await supabase.from('laudos').update(payload as any).eq('id', editingId);
      if (error) { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Laudo atualizado' });
    } else {
      const { error } = await supabase.from('laudos').insert(payload as any);
      if (error) { toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Laudo criado' });
    }
    setDialogOpen(false);
    fetchLaudos();
  }

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('laudos').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Laudo excluído' });
    setDeleteId(null);
    fetchLaudos();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laudos & AVCIPs</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de laudos com controle de vencimento</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Laudo</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('vencido')}>
          <p className="text-2xl font-bold text-red-700">{stats.vencido}</p>
          <p className="text-xs text-red-600">Vencidos</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-3 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('laranja')}>
          <p className="text-2xl font-bold text-orange-700">{stats.laranja}</p>
          <p className="text-xs text-orange-600">≤ 30 dias</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('amarelo')}>
          <p className="text-2xl font-bold text-yellow-700">{stats.amarelo}</p>
          <p className="text-xs text-yellow-600">≤ 90 dias</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-3 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('regular')}>
          <p className="text-2xl font-bold text-green-700">{stats.regular}</p>
          <p className="text-xs text-green-600">Regular</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Regular (&gt;90d)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Atenção (≤90d)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" /> Urgente (≤30d)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Vencido</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, responsável, município ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="vencido">🔴 Vencidos</SelectItem>
            <SelectItem value="laranja">🟠 ≤ 30 dias</SelectItem>
            <SelectItem value="amarelo">🟡 ≤ 90 dias</SelectItem>
            <SelectItem value="regular">🟢 Regular</SelectItem>
            <SelectItem value="sem_data">Sem data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum laudo encontrado.</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('cliente')}>Cliente <SortIcon field="cliente" /></TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('municipio')}>Município <SortIcon field="municipio" /></TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Utilização</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('setor_atendimento')}>Setor <SortIcon field="setor_atendimento" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('data_vencimento')}>Vencimento <SortIcon field="data_vencimento" /></TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => {
                const status = getExpiryStatus(l.data_vencimento);
                return (
                  <TableRow key={l.id} className={status.bgClass}>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate" title={l.cliente}>{l.cliente}</div>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <div className="truncate text-sm" title={l.responsavel}>
                        {l.responsavel && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{l.responsavel}</span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{l.municipio}</TableCell>
                    <TableCell className="text-xs font-mono">{l.cnpj}</TableCell>
                    <TableCell className="text-sm">{l.utilizacao}</TableCell>
                    <TableCell className="text-sm">{l.setor_atendimento}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {l.data_vencimento ? formatDate(l.data_vencimento) : '—'}
                    </TableCell>
                    <TableCell>{getExpiryBadge(l.data_vencimento)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Laudo' : 'Novo Laudo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Cliente *</Label>
              <Input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
            </div>
            <div>
              <Label>Responsável (Nome + Telefone)</Label>
              <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Ex: 69 9999-9999 Nome" />
            </div>
            <div>
              <Label>Município</Label>
              <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
            </div>
            <div>
              <Label>SAT</Label>
              <Input value={form.sat} onChange={e => setForm(f => ({ ...f, sat: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Nº dos Projetos</Label>
              <Input value={form.numero_projetos} onChange={e => setForm(f => ({ ...f, numero_projetos: e.target.value }))} />
            </div>
            <div>
              <Label>Área (m²)</Label>
              <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
            </div>
            <div>
              <Label>Distrito</Label>
              <Input value={form.distrito} onChange={e => setForm(f => ({ ...f, distrito: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
            <div>
              <Label>Utilização</Label>
              <Input value={form.utilizacao} onChange={e => setForm(f => ({ ...f, utilizacao: e.target.value }))} placeholder="Ex: Subestação, Comercial, Hospital..." />
            </div>
            <div>
              <Label>Setor de Atendimento</Label>
              <Input value={form.setor_atendimento} onChange={e => setForm(f => ({ ...f, setor_atendimento: e.target.value }))} placeholder="Ex: SETOR 1" />
            </div>
            <div>
              <Label>Data de Vencimento (AVCIP)</Label>
              <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
            </div>
            <div>
              <Label>Status CBM</Label>
              <Input value={form.status_cbm} onChange={e => setForm(f => ({ ...f, status_cbm: e.target.value }))} placeholder="Ex: LAUDO, REQUERIMENTO" />
            </div>
            <div>
              <Label>Status Bueno</Label>
              <Input value={form.status_bueno} onChange={e => setForm(f => ({ ...f, status_bueno: e.target.value }))} placeholder="Ex: Processo Técnico com exigência(s)" />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
