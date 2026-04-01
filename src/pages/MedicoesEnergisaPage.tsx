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
import { Plus, Search, Trash2, Download, Filter, ChevronDown, ChevronUp, X, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

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
  billed: boolean;
  created_at: string;
}

interface PendingItem {
  contract_item_id: string;
  quantity: string;
  notes: string;
}

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function MedicoesEnergisaPage() {
  const [contractItems, setContractItems] = useState<ContractItem[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);
  const [billingInProgress, setBillingInProgress] = useState(false);

  // Form state
  const [formUnitName, setFormUnitName] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCategoryFilter, setFormCategoryFilter] = useState('all');
  const [formItemSearch, setFormItemSearch] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Quick-add state
  const [quickItemId, setQuickItemId] = useState('');
  const [quickQuantity, setQuickQuantity] = useState('');
  const [quickNotes, setQuickNotes] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('energisa_contract_items').select('*').order('item_code'),
      supabase.from('energisa_service_records').select('*'),
    ]).then(([items, records]) => {
      setContractItems((items.data || []).map((r: any) => ({
        id: r.id, item_code: r.item_code, category: r.category, description: r.description,
        quantity: Number(r.quantity), unit: r.unit, material_unit_value: Number(r.material_unit_value),
        labor_unit_value: Number(r.labor_unit_value), total_value: Number(r.total_value),
      })));
      setServiceRecords((records.data || []).map((r: any) => ({
        id: r.id, contract_item_id: r.contract_item_id, unit_name: r.unit_name || '',
        quantity: Number(r.quantity), date: r.date, month: r.month, notes: r.notes, billed: r.billed || false, created_at: r.created_at,
      })));
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() =>
    [...new Set(contractItems.map(i => i.category))].sort(),
    [contractItems]
  );

  const unbilledRecords = useMemo(() =>
    serviceRecords.filter(r => !r.billed),
    [serviceRecords]
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

  const accumulatedByItem = useMemo(() => {
    const map = new Map<string, { totalQty: number; records: (ServiceRecord & { unitLabel: string })[] }>();
    for (const r of unbilledRecords) {
      const existing = map.get(r.contract_item_id) || { totalQty: 0, records: [] };
      existing.totalQty += r.quantity;
      existing.records.push({ ...r, unitLabel: r.unit_name });
      map.set(r.contract_item_id, existing);
    }
    return map;
  }, [unbilledRecords]);

  const totalMonthValue = useMemo(() => {
    let total = 0;
    for (const [itemId, data] of accumulatedByItem) {
      const item = contractItems.find(i => i.id === itemId);
      if (item) total += data.totalQty * (item.material_unit_value + item.labor_unit_value);
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

  const addPendingItem = () => {
    if (!quickItemId || !quickQuantity) {
      toast({ title: 'Selecione um item e informe a quantidade', variant: 'destructive' });
      return;
    }
    if (pendingItems.some(p => p.contract_item_id === quickItemId)) {
      toast({ title: 'Este item já foi adicionado à lista', variant: 'destructive' });
      return;
    }
    setPendingItems(prev => [...prev, { contract_item_id: quickItemId, quantity: quickQuantity, notes: quickNotes }]);
    setQuickItemId('');
    setQuickQuantity('');
    setQuickNotes('');
  };

  const removePendingItem = (idx: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formUnitName.trim()) {
      toast({ title: 'Informe o nome da unidade', variant: 'destructive' });
      return;
    }
    if (pendingItems.length === 0) {
      toast({ title: 'Adicione pelo menos um item à lista', variant: 'destructive' });
      return;
    }
    if (!formDate) {
      toast({ title: 'Informe a data', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const month = formDate.slice(0, 7);
    const rows = pendingItems.map(p => ({
      contract_item_id: p.contract_item_id,
      unit_name: formUnitName.trim(),
      quantity: parseFloat(p.quantity),
      date: formDate,
      month,
      notes: p.notes,
    }));

    const { data, error } = await supabase.from('energisa_service_records').insert(rows).select();
    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      setServiceRecords(prev => [...prev, ...data.map((r: any) => ({
        id: r.id, contract_item_id: r.contract_item_id, unit_name: r.unit_name || '',
        quantity: Number(r.quantity), date: r.date, month: r.month, notes: r.notes, billed: false, created_at: r.created_at,
      }))]);
    }
    toast({ title: `${pendingItems.length} serviço(s) registrado(s) com sucesso` });
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
    setFormUnitName('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategoryFilter('all');
    setFormItemSearch('');
    setPendingItems([]);
    setQuickItemId('');
    setQuickQuantity('');
    setQuickNotes('');
  };

  const exportExcel = useCallback(async () => {
    const lines: string[] = [];
    lines.push('MEDIÇÃO ACUMULADA - ENERGISA');
    lines.push(`Mês: ${selectedMonth}`);
    lines.push('');
    lines.push('Item;Descrição;Unidade;Qtd Contrato;Qtd Executada;Valor Unit Material;Valor Unit MO;Valor Total;Unidade Energisa;Data');

    for (const item of contractItems) {
      const acc = accumulatedByItem.get(item.id);
      if (!acc) continue;
      const unitTotal = item.material_unit_value + item.labor_unit_value;
      const unidades = acc.records.map(r => r.unitLabel).join(' / ');
      const datas = acc.records.map(r => r.date.split('-').reverse().join('/')).join(' / ');
      lines.push(`${item.item_code};${item.description};${item.unit};${item.quantity};${acc.totalQty};${item.material_unit_value.toFixed(2)};${item.labor_unit_value.toFixed(2)};${(acc.totalQty * unitTotal).toFixed(2)};${unidades};${datas}`);
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

  const handleEmitBilling = useCallback(async () => {
    setBillingInProgress(true);
    // Export the report first
    await exportExcel();
    // Mark all unbilled records as billed
    const unbilledIds = unbilledRecords.map(r => r.id);
    if (unbilledIds.length > 0) {
      const { error } = await supabase.from('energisa_service_records').update({ billed: true }).in('id', unbilledIds);
      if (error) {
        toast({ title: 'Erro ao marcar como faturado', description: error.message, variant: 'destructive' });
        setBillingInProgress(false);
        return;
      }
      setServiceRecords(prev => prev.map(r => unbilledIds.includes(r.id) ? { ...r, billed: true } : r));
    }
    setBillingInProgress(false);
    setShowBillingConfirm(false);
    toast({ title: 'Relatório de cobrança emitido', description: 'Os itens acumulados foram zerados para uma nova medição.' });
  }, [exportExcel, unbilledRecords]);

  const getItemLabel = (itemId: string) => {
    const item = contractItems.find(i => i.id === itemId);
    return item ? `${item.item_code} - ${item.description.slice(0, 50)}` : itemId;
  };

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
          <Button onClick={() => setShowBillingConfirm(true)} variant="default" size="sm" disabled={accumulatedByItem.size === 0} className="bg-green-600 hover:bg-green-700">
            <FileText className="h-4 w-4 mr-1" /> Emitir Cobrança
          </Button>
          <Button onClick={exportExcel} variant="outline" size="sm" disabled={accumulatedByItem.size === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Acumulado</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalMonthValue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Material</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalMaterialValue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mão de Obra</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalLaborValue)}</p></CardContent>
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
                     <TableHead className="w-28">Data</TableHead>
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
                        <TableCell className="text-xs max-w-[250px] whitespace-normal break-words">{item.description}</TableCell>
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
                          {acc?.records.map((r) => (
                            <div key={r.id} className="flex items-center gap-1 py-0.5">
                              <span className="truncate max-w-[140px]" title={r.unitLabel}>{r.unitLabel}</span>
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

      {/* Add Service Dialog - Multi-item */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Serviços Executados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label>Unidade Energisa *</Label>
                <Input
                  placeholder="Digite o nome da unidade..."
                  value={formUnitName}
                  onChange={e => setFormUnitName(e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Data *</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            </div>

            {/* Item selector */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium text-foreground">Adicionar item</p>
              <div className="flex gap-2">
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
              {/* Item list for selection */}
              <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
                {formFilteredItems.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3">Nenhum item encontrado</p>
                )}
                {formFilteredItems.map(i => {
                  const isSelected = quickItemId === i.id;
                  const alreadyAdded = pendingItems.some(p => p.contract_item_id === i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => setQuickItemId(isSelected ? '' : i.id)}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-xs transition-colors ${
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed bg-muted/30'
                          : isSelected
                            ? 'bg-primary/10 ring-1 ring-primary/30'
                            : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-semibold shrink-0 text-foreground">{i.item_code}</span>
                        <span className="text-foreground leading-snug">{i.description}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-muted-foreground">
                        <span>Un: {i.unit}</span>
                        <span>Contrato: {i.quantity}</span>
                        <span>Mat: {formatCurrency(i.material_unit_value)}</span>
                        <span>MO: {formatCurrency(i.labor_unit_value)}</span>
                      </div>
                      {alreadyAdded && <span className="text-xs text-muted-foreground italic">Já adicionado</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 text-xs text-muted-foreground">
                  {quickItemId ? `Selecionado: ${contractItems.find(i => i.id === quickItemId)?.item_code}` : 'Selecione um item acima'}
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qtd"
                    value={quickQuantity}
                    onChange={e => setQuickQuantity(e.target.value)}
                  />
                </div>
                <Button type="button" size="sm" onClick={addPendingItem} className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div>
                <Input placeholder="Observação do item (opcional)" value={quickNotes} onChange={e => setQuickNotes(e.target.value)} />
              </div>
            </div>

            {/* Pending items list */}
            {pendingItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 flex justify-between items-center">
                  <p className="text-sm font-medium text-foreground">Itens a registrar ({pendingItems.length})</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-20 text-right">Qtd</TableHead>
                      <TableHead className="w-28 text-right">Valor</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.map((p, idx) => {
                      const item = contractItems.find(i => i.id === p.contract_item_id);
                      const val = item ? parseFloat(p.quantity || '0') * (item.material_unit_value + item.labor_unit_value) : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">
                            <span className="font-mono mr-1">{item?.item_code}</span>
                            {item?.description.slice(0, 40)}
                            {p.notes && <span className="block text-muted-foreground mt-0.5">{p.notes}</span>}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{p.quantity}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatCurrency(val)}</TableCell>
                          <TableCell>
                            <button onClick={() => removePendingItem(idx)} className="text-destructive hover:text-destructive/80">
                              <X className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="px-3 py-2 bg-muted/30 text-right text-sm font-semibold tabular-nums">
                  Total: {formatCurrency(pendingItems.reduce((sum, p) => {
                    const item = contractItems.find(i => i.id === p.contract_item_id);
                    return sum + (item ? parseFloat(p.quantity || '0') * (item.material_unit_value + item.labor_unit_value) : 0);
                  }, 0))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || pendingItems.length === 0}>
              {saving ? 'Salvando...' : `Salvar ${pendingItems.length} item(s)`}
            </Button>
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

      {/* Billing Confirmation */}
      <AlertDialog open={showBillingConfirm} onOpenChange={setShowBillingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir Relatório de Cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              O relatório será exportado com todos os itens acumulados ({unbilledRecords.length} registros, total de {formatCurrency(totalMonthValue)}).
              Após a emissão, os itens acumulados serão zerados para iniciar uma nova medição.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={billingInProgress}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmitBilling} disabled={billingInProgress}>
              {billingInProgress ? 'Emitindo...' : 'Emitir e Zerar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
