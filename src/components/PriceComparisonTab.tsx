import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Plus, Trash2, Search, Upload, FileSpreadsheet, X } from 'lucide-react';
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

  // Supplier management
  const [newSupplier, setNewSupplier] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  // Inline quote editing
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

  // Parse uploaded Excel file
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        toast.error('Planilha vazia ou sem dados');
        setUploading(false);
        return;
      }

      // Find header row - look for columns matching código, descrição, unidade, quantidade, preço, total
      const headerRow = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
      
      const findCol = (keywords: string[]) => {
        return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const codeCol = findCol(['código', 'codigo', 'cod', 'code', 'item']);
      const descCol = findCol(['descrição', 'descricao', 'resumo', 'description', 'desc']);
      const unitCol = findCol(['unidade', 'und', 'ud', 'unit', 'un']);
      const qtyCol = findCol(['quantidade', 'qtd', 'qty', 'quant']);
      const priceCol = findCol(['preço', 'preco', 'price', 'valor unit', 'p.unit', 'unitário', 'unitario']);
      const totalCol = findCol(['total', 'importância', 'importancia', 'valor total', 'subtotal']);

      if (descCol === -1) {
        toast.error('Não foi possível identificar a coluna de descrição na planilha');
        setUploading(false);
        return;
      }

      const items: { code: string; description: string; unit: string; quantity: number; bid_unit_price: number; bid_total: number }[] = [];

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

      if (items.length === 0) {
        toast.error('Nenhum item encontrado na planilha');
        setUploading(false);
        return;
      }

      // Delete existing items for this project first
      await supabase.from('price_quotes').delete().eq('project_id', projectId);
      await supabase.from('bid_items').delete().eq('project_id', projectId);

      // Insert new items in batches
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize).map(item => ({ ...item, project_id: projectId }));
        const { error } = await supabase.from('bid_items').insert(batch);
        if (error) {
          toast.error('Erro ao importar itens');
          console.error(error);
          break;
        }
      }

      toast.success(`${items.length} itens importados com sucesso`);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [projectId, fetchData]);

  // Add supplier
  const addSupplier = useCallback(() => {
    if (!newSupplier.trim()) return;
    // Just adding name, quotes will be added per-cell
    setNewSupplier('');
    setShowAddSupplier(false);
    toast.success(`Fornecedor "${newSupplier.trim()}" adicionado`);
    // We add supplier by creating an empty quote for the first item if exists, or just track locally
    // Actually we track suppliers from existing quotes + new names
    setQuotes(prev => {
      // Add a placeholder quote so supplier shows as column
      if (bidItems.length > 0) {
        const placeholder: PriceQuote = {
          id: `temp-${Date.now()}`,
          project_id: projectId,
          bid_item_id: bidItems[0].id,
          supplier_name: newSupplier.trim(),
          quoted_price: 0,
          notes: '',
        };
        return [...prev, placeholder];
      }
      return prev;
    });
  }, [newSupplier, bidItems, projectId]);

  // Save/update a quote for a cell
  const saveQuote = useCallback(async (itemId: string, supplierName: string, price: number) => {
    const existing = quotes.find(q => q.bid_item_id === itemId && q.supplier_name === supplierName && !q.id.startsWith('temp-'));
    
    if (existing) {
      const { error } = await supabase.from('price_quotes').update({ quoted_price: price }).eq('id', existing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      setQuotes(prev => prev.map(q => q.id === existing.id ? { ...q, quoted_price: price } : q));
    } else {
      // Remove temp placeholder if exists
      const { data, error } = await supabase.from('price_quotes').insert({
        project_id: projectId,
        bid_item_id: itemId,
        supplier_name: supplierName,
        quoted_price: price,
        notes: '',
      }).select().single();
      if (error) { toast.error('Erro ao salvar cotação'); return; }
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

  const supplierNames = [...new Set(quotes.map(q => q.supplier_name))];

  const filtered = bidItems.filter(item =>
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Comparativo de Preços</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? 'Importando...' : 'Importar Planilha'}
          </Button>
          <Button size="sm" onClick={() => setShowAddSupplier(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Fornecedor
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Add supplier form */}
      {showAddSupplier && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground">Nome do Fornecedor</label>
            <Input
              className="mt-1"
              value={newSupplier}
              onChange={e => setNewSupplier(e.target.value)}
              placeholder="Ex: MOCELIN"
              onKeyDown={e => e.key === 'Enter' && addSupplier()}
            />
          </div>
          <Button size="sm" onClick={addSupplier}>Adicionar</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddSupplier(false)}>Cancelar</Button>
        </div>
      )}

      {/* Supplier chips */}
      {supplierNames.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {supplierNames.map(name => (
            <span key={name} className="inline-flex items-center gap-1 bg-accent/30 text-accent-foreground px-3 py-1 rounded-full text-sm">
              {name}
              <button onClick={() => deleteSupplier(name)} className="text-destructive hover:text-destructive/80 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {bidItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
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

      {/* Table */}
      {bidItems.length > 0 && (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-max min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 w-[80px]">Código</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[300px] max-w-[300px]">Descrição</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground w-[50px]">Und</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[80px]">Qtd</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[100px] bg-primary/10">Preço</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[110px] bg-primary/10">Total</th>
                {supplierNames.map(name => (
                  <React.Fragment key={name}>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[110px] bg-accent/30">{name}</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground w-[60px] bg-accent/30">Dif %</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const itemQuotes = quotes.filter(q => q.bid_item_id === item.id);
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs font-mono sticky left-0 bg-background z-10">{item.code}</td>
                    <td className="px-3 py-2 text-xs leading-tight max-w-[300px]" title={item.description}>
                      {item.description.length > 120 ? item.description.substring(0, 120) + '...' : item.description}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">{item.unit}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right bg-primary/5 font-medium text-xs">{formatCurrency(item.bid_unit_price)}</td>
                    <td className="px-3 py-2 text-right bg-primary/5 font-medium text-xs">{formatCurrency(item.bid_total)}</td>
                    {supplierNames.map(name => {
                      const quote = itemQuotes.find(q => q.supplier_name === name);
                      const isEditing = editingCell?.itemId === item.id && editingCell?.supplier === name;
                      const quotedPrice = quote?.quoted_price || 0;
                      const diff = item.bid_unit_price > 0 && quotedPrice > 0
                        ? ((quotedPrice - item.bid_unit_price) / item.bid_unit_price) * 100
                        : null;

                      return (
                        <React.Fragment key={name}>
                          <td className="px-3 py-1 text-right bg-accent/10">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                className="h-7 w-24 text-xs text-right"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => {
                                  if (editValue) saveQuote(item.id, name, Number(editValue));
                                  else setEditingCell(null);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && editValue) saveQuote(item.id, name, Number(editValue));
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            ) : (
                              <button
                                className="w-full text-right text-xs hover:bg-accent/20 rounded px-1 py-0.5 min-h-[24px]"
                                onClick={() => {
                                  setEditingCell({ itemId: item.id, supplier: name });
                                  setEditValue(quotedPrice > 0 ? String(quotedPrice) : '');
                                }}
                              >
                                {quotedPrice > 0 ? formatCurrency(quotedPrice) : '—'}
                              </button>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-center text-xs font-semibold bg-accent/10 ${
                            diff !== null ? (diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : '') : ''
                          }`}>
                            {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {supplierNames.length > 0 && bidItems.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h3 className="font-medium mb-2">Resumo por Fornecedor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Total Licitação</p>
              <p className="text-lg font-bold">{formatCurrency(bidItems.reduce((s, i) => s + i.bid_total, 0))}</p>
            </div>
            {supplierNames.map(name => {
              const sq = quotes.filter(q => q.supplier_name === name && q.quoted_price > 0 && !q.id.startsWith('temp-'));
              const total = sq.reduce((s, q) => {
                const item = bidItems.find(i => i.id === q.bid_item_id);
                return s + (item ? q.quoted_price * item.quantity : 0);
              }, 0);
              const bidTotal = bidItems.reduce((s, i) => s + i.bid_total, 0);
              const diff = bidTotal > 0 ? ((total - bidTotal) / bidTotal) * 100 : 0;
              return (
                <div key={name} className="p-3 rounded bg-accent/20 border border-accent/30">
                  <p className="text-xs text-muted-foreground">{name}</p>
                  <p className="text-lg font-bold">{formatCurrency(total)}</p>
                  <p className="text-xs text-muted-foreground">{sq.length} itens cotados</p>
                  {sq.length > 0 && (
                    <p className={`text-xs font-semibold ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs licitação
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
