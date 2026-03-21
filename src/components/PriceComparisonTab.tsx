import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Plus, Trash2, Search, Upload, FileSpreadsheet, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BidItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  bid_unit_price: number;
  bid_total: number;
  project_id: string;
}

interface PriceQuote {
  id: string;
  project_id: string;
  bid_item_id: string;
  supplier_name: string;
  quoted_price: number;
  notes: string;
}

export default function PriceComparisonTab({ projectId }: { projectId: string }) {
  const [bidItems, setBidItems] = useState<BidItem[]>([]);
  const [quotes, setQuotes] = useState<PriceQuote[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newSupplier, setNewSupplier] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  const [editingCell, setEditingCell] = useState<{ itemId: string; supplier: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchData = useCallback(async () => {
    const [itemsRes, quotesRes] = await Promise.all([
      supabase.from('bid_items').select('*').eq('project_id', projectId).order('bid_total', { ascending: false }),
      supabase.from('price_quotes').select('*').eq('project_id', projectId),
    ]);
    setBidItems((itemsRes.data || []) as BidItem[]);
    setQuotes((quotesRes.data || []) as PriceQuote[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length < 2) { toast.error('Planilha vazia'); setUploading(false); return; }

      const headerRow = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
      const findCol = (kw: string[]) => headerRow.findIndex(h => kw.some(k => h.includes(k)));

      const codeCol = findCol(['código', 'codigo', 'cod', 'code', 'item']);
      const descCol = findCol(['descrição', 'descricao', 'resumo', 'description', 'desc']);
      const unitCol = findCol(['unidade', 'und', 'ud', 'unit', 'un']);
      const qtyCol = findCol(['quantidade', 'qtd', 'qty', 'quant']);
      const priceCol = findCol(['preço', 'preco', 'price', 'valor unit', 'p.unit', 'unitário', 'unitario']);
      const totalCol = findCol(['total', 'importância', 'importancia', 'valor total', 'subtotal']);

      if (descCol === -1) { toast.error('Coluna de descrição não encontrada'); setUploading(false); return; }

      const items: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[descCol]) continue;
        const description = String(row[descCol] || '').trim();
        if (!description) continue;
        const code = codeCol >= 0 ? String(row[codeCol] || '').trim() : String(i);
        const unit = unitCol >= 0 ? String(row[unitCol] || '').trim() : '';
        const quantity = qtyCol >= 0 ? Number(row[qtyCol]) || 0 : 0;
        const price = priceCol >= 0 ? Number(row[priceCol]) || 0 : 0;
        const total = totalCol >= 0 ? Number(row[totalCol]) || 0 : price * quantity;
        items.push({ code, description, unit, quantity, bid_unit_price: price, bid_total: total });
      }

      if (items.length === 0) { toast.error('Nenhum item encontrado'); setUploading(false); return; }

      await supabase.from('price_quotes').delete().eq('project_id', projectId);
      await supabase.from('bid_items').delete().eq('project_id', projectId);

      for (let i = 0; i < items.length; i += 50) {
        const batch = items.slice(i, i + 50).map(item => ({ ...item, project_id: projectId }));
        await supabase.from('bid_items').insert(batch);
      }

      toast.success(`${items.length} itens importados`);
      await fetchData();
    } catch { toast.error('Erro ao processar arquivo'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }, [projectId, fetchData]);

  const addSupplier = useCallback(() => {
    const name = newSupplier.trim();
    if (!name) return;
    setNewSupplier('');
    setShowAddSupplier(false);
    setExpandedSuppliers(prev => new Set([...prev, name]));
    if (bidItems.length > 0) {
      setQuotes(prev => [...prev, {
        id: `temp-${Date.now()}`, project_id: projectId, bid_item_id: bidItems[0].id,
        supplier_name: name, quoted_price: 0, notes: '',
      }]);
    }
    toast.success(`Fornecedor "${name}" adicionado`);
  }, [newSupplier, bidItems, projectId]);

  const saveQuote = useCallback(async (itemId: string, supplierName: string, price: number) => {
    const existing = quotes.find(q => q.bid_item_id === itemId && q.supplier_name === supplierName && !q.id.startsWith('temp-'));
    if (existing) {
      await supabase.from('price_quotes').update({ quoted_price: price }).eq('id', existing.id);
      setQuotes(prev => prev.map(q => q.id === existing.id ? { ...q, quoted_price: price } : q));
    } else {
      const { data } = await supabase.from('price_quotes').insert({
        project_id: projectId, bid_item_id: itemId, supplier_name: supplierName, quoted_price: price, notes: '',
      }).select().single();
      if (data) {
        setQuotes(prev => [
          ...prev.filter(q => !(q.bid_item_id === itemId && q.supplier_name === supplierName && q.id.startsWith('temp-'))),
          data as PriceQuote,
        ]);
      }
    }
    setEditingCell(null);
  }, [quotes, projectId]);

  const deleteSupplier = useCallback(async (supplierName: string) => {
    await supabase.from('price_quotes').delete().eq('project_id', projectId).eq('supplier_name', supplierName);
    setQuotes(prev => prev.filter(q => q.supplier_name !== supplierName));
    toast.success('Fornecedor removido');
  }, [projectId]);

  const toggleSupplier = (name: string) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const supplierNames = [...new Set(quotes.map(q => q.supplier_name))];

  const filtered = bidItems.filter(item =>
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  const bidTotal = bidItems.reduce((s, i) => s + i.bid_total, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">Comparativo de Preços</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? 'Importando...' : 'Importar Planilha'}
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setShowAddSupplier(true)}>
            <Plus className="w-4 h-4 mr-1" /> Novo Fornecedor
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Add supplier inline */}
      {showAddSupplier && (
        <div className="bg-card rounded-lg p-4 border border-border flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="text-sm font-medium text-muted-foreground">Nome do Fornecedor</label>
            <Input className="mt-1" value={newSupplier} onChange={e => setNewSupplier(e.target.value)}
              placeholder="Ex: MOCELIN" onKeyDown={e => e.key === 'Enter' && addSupplier()} />
          </div>
          <Button size="sm" onClick={addSupplier}>Adicionar</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddSupplier(false)}>Cancelar</Button>
        </div>
      )}

      {/* Empty state */}
      {bidItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-lg bg-card">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
          <p className="font-medium">Nenhum item importado</p>
          <p className="text-sm mt-1">Importe uma planilha Excel com os itens da licitação</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Importar Planilha
          </Button>
        </div>
      )}

      {/* Search */}
      {bidItems.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* Licitação card */}
      {bidItems.length > 0 && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">PLANILHA DA LICITAÇÃO</p>
                <p className="text-xs text-muted-foreground">{bidItems.length} itens • Total: {formatCurrency(bidTotal)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-[80px]">Código</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descrição</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground w-[50px]">Und</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[90px]">Quantidade</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[100px]">Preço</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[120px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2 text-xs font-mono">{item.code}</td>
                    <td className="px-4 py-2 text-xs leading-tight" title={item.description}>
                      {item.description.length > 140 ? item.description.substring(0, 140) + '...' : item.description}
                    </td>
                    <td className="px-4 py-2 text-center text-xs">{item.unit}</td>
                    <td className="px-4 py-2 text-right text-xs">{item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-xs">{formatCurrency(item.bid_unit_price)}</td>
                    <td className="px-4 py-2 text-right text-xs font-medium">{formatCurrency(item.bid_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier cards */}
      {supplierNames.map(name => {
        const sq = quotes.filter(q => q.supplier_name === name && q.quoted_price > 0 && !q.id.startsWith('temp-'));
        const supplierTotal = sq.reduce((s, q) => {
          const item = bidItems.find(i => i.id === q.bid_item_id);
          return s + (item ? q.quoted_price * item.quantity : 0);
        }, 0);
        const diff = bidTotal > 0 && supplierTotal > 0 ? ((supplierTotal - bidTotal) / bidTotal) * 100 : null;
        const isExpanded = expandedSuppliers.has(name);

        return (
          <div key={name} className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Supplier header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30"
              onClick={() => toggleSupplier(name)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm uppercase">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sq.length} itens cotados
                    {supplierTotal > 0 && ` • Total: ${formatCurrency(supplierTotal)}`}
                    {diff !== null && (
                      <span className={`ml-2 font-semibold ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs licitação)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); deleteSupplier(name); }}
                  className="text-destructive hover:text-destructive/80 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Expanded items */}
            {isExpanded && bidItems.length > 0 && (
              <div className="border-t border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-[80px]">Código</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descrição</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-[50px]">Und</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[90px]">Qtd</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[100px]">P. Licitação</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[120px]">P. Orçado</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground w-[120px]">Total Orçado</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-[70px]">Dif %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => {
                      const quote = quotes.find(q => q.bid_item_id === item.id && q.supplier_name === name);
                      const qp = quote?.quoted_price || 0;
                      const isEditing = editingCell?.itemId === item.id && editingCell?.supplier === name;
                      const priceDiff = item.bid_unit_price > 0 && qp > 0
                        ? ((qp - item.bid_unit_price) / item.bid_unit_price) * 100 : null;

                      return (
                        <tr key={item.id} className="border-b border-border hover:bg-muted/20">
                          <td className="px-4 py-2 text-xs font-mono">{item.code}</td>
                          <td className="px-4 py-2 text-xs leading-tight" title={item.description}>
                            {item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}
                          </td>
                          <td className="px-4 py-2 text-center text-xs">{item.unit}</td>
                          <td className="px-4 py-2 text-right text-xs">{item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-right text-xs text-muted-foreground">{formatCurrency(item.bid_unit_price)}</td>
                          <td className="px-4 py-1 text-right">
                            {isEditing ? (
                              <Input
                                type="number" step="0.01" className="h-7 w-28 text-xs text-right ml-auto"
                                autoFocus value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => { if (editValue) saveQuote(item.id, name, Number(editValue)); else setEditingCell(null); }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && editValue) saveQuote(item.id, name, Number(editValue));
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            ) : (
                              <button
                                className="text-xs hover:bg-muted rounded px-2 py-1 min-w-[80px] text-right block ml-auto"
                                onClick={() => { setEditingCell({ itemId: item.id, supplier: name }); setEditValue(qp > 0 ? String(qp) : ''); }}
                              >
                                {qp > 0 ? formatCurrency(qp) : '—'}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-medium">
                            {qp > 0 ? formatCurrency(qp * item.quantity) : '—'}
                          </td>
                          <td className={`px-4 py-2 text-center text-xs font-semibold ${
                            priceDiff !== null ? (priceDiff < 0 ? 'text-green-600' : priceDiff > 0 ? 'text-red-600' : '') : ''
                          }`}>
                            {priceDiff !== null ? `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
