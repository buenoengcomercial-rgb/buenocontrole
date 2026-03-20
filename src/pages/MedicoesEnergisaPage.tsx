import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Trash2, Download, FileSpreadsheet, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';

interface ContractItem {
  id: string;
  item_code: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  material_unit_value: number;
  labor_unit_value: number;
  total_value: number;
}

interface ServiceRecord {
  id: string;
  contract_item_id: string;
  unit_name: string;
  quantity: number;
  date: string;
  month: string;
  notes: string;
  created_at: string;
}

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function MedicoesEnergisaPage() {
  const [contractItems, setContractItems] = useState<ContractItem[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Form state
  const [formLaudoId, setFormLaudoId] = useState('');
  const [formItemId, setFormItemId] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState('');
  const [formCategoryFilter, setFormCategoryFilter] = useState('all');
  const [formItemSearch, setFormItemSearch] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('energisa_contract_items').select('*').order('item_code'),
      supabase.from('energisa_service_records').select('*'),
      supabase.from('laudos').select('id, cliente, endereco, municipio'),
    ]).then(([items, records, laudosRes]) => {
      setContractItems((items.data || []).map((r: any) => ({
        id: r.id, item_code: r.item_code, category: r.category, description: r.description,
        quantity: Number(r.quantity), unit: r.unit, material_unit_value: Number(r.material_unit_value),
        labor_unit_value: Number(r.labor_unit_value), total_value: Number(r.total_value),
      })));
      setServiceRecords((records.data || []).map((r: any) => ({
        id: r.id, contract_item_id: r.contract_item_id, laudo_id: r.laudo_id,
        quantity: Number(r.quantity), date: r.date, month: r.month, notes: r.notes, created_at: r.created_at,
      })));
      setLaudos((laudosRes.data || []).map((r: any) => ({
        id: r.id, cliente: r.cliente, endereco: r.endereco, municipio: r.municipio,
      })));
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() =>
    [...new Set(contractItems.map(i => i.category))].sort(),
    [contractItems]
  );

  const monthRecords = useMemo(() =>
    serviceRecords.filter(r => r.month === selectedMonth),
    [serviceRecords, selectedMonth]
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Accumulated data grouped by item
  const accumulatedByItem = useMemo(() => {
    const map = new Map<string, { totalQty: number; records: (ServiceRecord & { laudoName: string })[] }>();
    for (const r of monthRecords) {
      const existing = map.get(r.contract_item_id) || { totalQty: 0, records: [] };
      const laudo = laudos.find(l => l.id === r.laudo_id);
      existing.totalQty += r.quantity;
      existing.records.push({ ...r, laudoName: laudo ? `${laudo.cliente} - ${laudo.endereco}` : '' });
      map.set(r.contract_item_id, existing);
    }
    return map;
  }, [monthRecords, laudos]);

  const totalMonthValue = useMemo(() => {
    let total = 0;
    for (const [itemId, data] of accumulatedByItem) {
      const item = contractItems.find(i => i.id === itemId);
      if (item) {
        total += data.totalQty * (item.material_unit_value + item.labor_unit_value);
      }
    }
    return total;
  }, [accumulatedByItem, contractItems]);

  const totalMaterialValue = useMemo(() => {
    let total = 0;
    for (const [itemId, data] of accumulatedByItem) {
      const item = contractItems.find(i => i.id === itemId);
      if (item) total += data.totalQty * item.material_unit_value;
    }
    return total;
  }, [accumulatedByItem, contractItems]);

  const totalLaborValue = useMemo(() => {
    let total = 0;
    for (const [itemId, data] of accumulatedByItem) {
      const item = contractItems.find(i => i.id === itemId);
      if (item) total += data.totalQty * item.labor_unit_value;
    }
    return total;
  }, [accumulatedByItem, contractItems]);

  const filteredItems = useMemo(() => {
    return contractItems.filter(i => {
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return i.item_code.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
      }
      return true;
    });
  }, [contractItems, categoryFilter, search]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filteredItems]);

  const formFilteredItems = useMemo(() => {
    return contractItems.filter(i => {
      if (formCategoryFilter !== 'all' && i.category !== formCategoryFilter) return false;
      if (formItemSearch) {
        const s = formItemSearch.toLowerCase();
        return i.item_code.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
      }
      return true;
    });
  }, [contractItems, formCategoryFilter, formItemSearch]);

  const handleSave = async () => {
    if (!formLaudoId || !formItemId || !formQuantity || !formDate) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const month = formDate.slice(0, 7);
    const { data, error } = await supabase.from('energisa_service_records').insert({
      contract_item_id: formItemId,
      laudo_id: formLaudoId,
      quantity: parseFloat(formQuantity),
      date: formDate,
      month,
      notes: formNotes,
    }).select().single();
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      setServiceRecords(prev => [...prev, {
        id: data.id, contract_item_id: data.contract_item_id, laudo_id: data.laudo_id,
        quantity: Number(data.quantity), date: data.date, month: data.month, notes: data.notes, created_at: data.created_at,
      }]);
    }
    toast({ title: 'Serviço registrado com sucesso' });
    setShowAddDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('energisa_service_records').delete().eq('id', deleteId);
    setServiceRecords(prev => prev.filter(r => r.id !== deleteId));
    setDeleteId(null);
    toast({ title: 'Registro excluído' });
  };

  const resetForm = () => {
    setFormLaudoId('');
    setFormItemId('');
    setFormQuantity('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNotes('');
    setFormCategoryFilter('all');
    setFormItemSearch('');
  };

  const exportExcel = useCallback(async () => {
    // Build CSV for export
    const lines: string[] = [];
    lines.push('MEDIÇÃO ACUMULADA - ENERGISA');
    lines.push(`Mês: ${selectedMonth}`);
    lines.push('');
    lines.push('Item;Descrição;Unidade;Qtd Contrato;Qtd Executada;Valor Unit Material;Valor Unit MO;Valor Total;Unidade Energisa');

    for (const item of contractItems) {
      const acc = accumulatedByItem.get(item.id);
      if (!acc) continue;
      const unitTotal = item.material_unit_value + item.labor_unit_value;
      const unidades = acc.records.map(r => r.laudoName).join(' / ');
      lines.push(`${item.item_code};${item.description};${item.unit};${item.quantity};${acc.totalQty};${item.material_unit_value.toFixed(2)};${item.labor_unit_value.toFixed(2)};${(acc.totalQty * unitTotal).toFixed(2)};${unidades}`);
    }

    lines.push('');
    lines.push(`;;;;;;TOTAL MATERIAL;${totalMaterialValue.toFixed(2)};`);
    lines.push(`;;;;;;TOTAL MÃO DE OBRA;${totalLaborValue.toFixed(2)};`);
    lines.push(`;;;;;;TOTAL GERAL;${totalMonthValue.toFixed(2)};`);

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicao_energisa_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Relatório exportado com sucesso' });
  }, [contractItems, accumulatedByItem, selectedMonth, totalMonthValue, totalMaterialValue, totalLaborValue]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medições Energisa</h1>
          <p className="text-sm text-muted-foreground">Acumulativo de serviços para cobrança</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Registrar Serviço
          </Button>
          <Button onClick={exportExcel} variant="outline" size="sm" disabled={accumulatedByItem.size === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalMonthValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Material</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalMaterialValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mão de Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalLaborValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-40">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Contract Items with Accumulated Data */}
      {[...groupedItems.entries()].map(([category, items]) => (
        <div key={category} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
          >
            <span className="font-semibold text-sm text-foreground">{category}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {items.filter(i => accumulatedByItem.has(i.id)).length}/{items.length} itens
              </Badge>
              {expandedCategories.has(category) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
          {expandedCategories.has(category) && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Item</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-12">Un</TableHead>
                    <TableHead className="w-20 text-right">Contrato</TableHead>
                    <TableHead className="w-20 text-right">Executado</TableHead>
                    <TableHead className="w-20 text-right">Saldo</TableHead>
                    <TableHead className="w-28 text-right">Valor Exec.</TableHead>
                    <TableHead className="w-48">Unidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const acc = accumulatedByItem.get(item.id);
                    const executedQty = acc?.totalQty || 0;
                    const saldo = item.quantity - executedQty;
                    const unitTotal = item.material_unit_value + item.labor_unit_value;
                    const executedValue = executedQty * unitTotal;
                    return (
                      <TableRow key={item.id} className={executedQty > 0 ? 'bg-primary/5' : ''}>
                        <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={item.description}>{item.description}</TableCell>
                        <TableCell className="text-xs">{item.unit}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-semibold">
                          {executedQty > 0 ? executedQty : '-'}
                        </TableCell>
                        <TableCell className={`text-right text-xs tabular-nums ${saldo < 0 ? 'text-destructive font-bold' : ''}`}>
                          {saldo}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {executedQty > 0 ? formatCurrency(executedValue) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {acc?.records.map((r, i) => (
                            <div key={r.id} className="flex items-center gap-1 py-0.5">
                              <span className="truncate max-w-[140px]" title={r.laudoName}>{r.laudoName.split(' - ')[0]}</span>
                              <span className="text-muted-foreground">({r.quantity})</span>
                              <button onClick={() => setDeleteId(r.id)} className="text-destructive hover:text-destructive/80 ml-1">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}

      {groupedItems.size === 0 && (
        <div className="text-center py-12 text-muted-foreground">Nenhum item encontrado</div>
      )}

      {/* Add Service Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Serviço Executado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Unidade Energisa *</Label>
              <Select value={formLaudoId} onValueChange={setFormLaudoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {laudos.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.cliente} — {l.endereco}, {l.municipio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Item do Contrato *</Label>
              <div className="flex gap-2 mb-2">
                <Select value={formCategoryFilter} onValueChange={setFormCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Buscar..." value={formItemSearch} onChange={e => setFormItemSearch(e.target.value)} className="flex-1" />
              </div>
              <Select value={formItemId} onValueChange={setFormItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o item..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {formFilteredItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="font-mono mr-2">{i.item_code}</span> {i.description.slice(0, 60)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formItemId && (() => {
                const item = contractItems.find(i => i.id === formItemId);
                if (!item) return null;
                const totalUsed = serviceRecords.filter(r => r.contract_item_id === formItemId).reduce((s, r) => s + r.quantity, 0);
                return (
                  <div className="mt-2 p-2 rounded bg-muted text-xs space-y-1">
                    <p><strong>Contrato:</strong> {item.quantity} {item.unit} | <strong>Usado:</strong> {totalUsed} | <strong>Saldo:</strong> {item.quantity - totalUsed}</p>
                    <p><strong>Material:</strong> {formatCurrency(item.material_unit_value)} | <strong>MO:</strong> {formatCurrency(item.labor_unit_value)}</p>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade *</Label>
                <Input type="number" min="0" step="0.01" value={formQuantity} onChange={e => setFormQuantity(e.target.value)} />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro de serviço?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
