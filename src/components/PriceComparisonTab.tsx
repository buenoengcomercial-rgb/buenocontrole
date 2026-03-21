import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Plus, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BidItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  bid_unit_price: number;
  bid_total: number;
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

  // Form state for adding a quote
  const [selectedItemId, setSelectedItemId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('bid_items').select('*').order('bid_total', { ascending: false }),
      supabase.from('price_quotes').select('*').eq('project_id', projectId),
    ]).then(([itemsRes, quotesRes]) => {
      setBidItems((itemsRes.data || []) as BidItem[]);
      setQuotes((quotesRes.data || []) as PriceQuote[]);
      setLoading(false);
    });
  }, [projectId]);

  const addQuote = useCallback(async () => {
    if (!selectedItemId || !supplierName.trim() || !quotedPrice) {
      toast.error('Preencha todos os campos');
      return;
    }
    const { data, error } = await supabase.from('price_quotes').insert({
      project_id: projectId,
      bid_item_id: selectedItemId,
      supplier_name: supplierName.trim(),
      quoted_price: Number(quotedPrice),
      notes: '',
    }).select().single();
    if (error) { toast.error('Erro ao salvar cotação'); return; }
    if (data) setQuotes(prev => [...prev, data as PriceQuote]);
    setSupplierName('');
    setQuotedPrice('');
    setSelectedItemId('');
    setShowForm(false);
    toast.success('Cotação adicionada');
  }, [projectId, selectedItemId, supplierName, quotedPrice]);

  const deleteQuote = useCallback(async (id: string) => {
    await supabase.from('price_quotes').delete().eq('id', id);
    setQuotes(prev => prev.filter(q => q.id !== id));
    toast.success('Cotação removida');
  }, []);

  // Get unique supplier names for this project
  const supplierNames = [...new Set(quotes.map(q => q.supplier_name))];

  const filtered = bidItems.filter(item =>
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Comparativo de Preços — Licitação x Orçamento</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Cotação
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Item</label>
              <select
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
              >
                <option value="">Selecione um item...</option>
                {bidItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.description.substring(0, 80)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fornecedor</label>
              <Input className="mt-1" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Preço Unitário Orçado</label>
              <Input className="mt-1" type="number" step="0.01" value={quotedPrice} onChange={e => setQuotedPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addQuote}>Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Scrollable table container */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-max min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[80px]">Código</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[400px]">Descrição</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[60px]">Und</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[100px]">Qtd</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[120px] bg-primary/10">Preço Licitação</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[120px] bg-primary/10">Total Licitação</th>
              {supplierNames.map(name => (
                <React.Fragment key={name}>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[130px] bg-accent/30">{name} (Unit.)</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[130px] bg-accent/30">{name} (Total)</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[60px] bg-accent/30">Dif %</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[40px]"></th>
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
                  <td className="px-3 py-2 whitespace-normal">{item.description}</td>
                  <td className="px-3 py-2 text-center">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right bg-primary/5 font-medium">{formatCurrency(item.bid_unit_price)}</td>
                  <td className="px-3 py-2 text-right bg-primary/5 font-medium">{formatCurrency(item.bid_total)}</td>
                  {supplierNames.map(name => {
                    const quote = itemQuotes.find(q => q.supplier_name === name);
                    if (!quote) {
                      return (
                        <React.Fragment key={name}>
                          <td className="px-3 py-2 text-right text-muted-foreground bg-accent/10">—</td>
                          <td className="px-3 py-2 text-right text-muted-foreground bg-accent/10">—</td>
                          <td className="px-3 py-2 text-center bg-accent/10">—</td>
                          <td className="px-3 py-2"></td>
                        </React.Fragment>
                      );
                    }
                    const quotedTotal = quote.quoted_price * item.quantity;
                    const diff = item.bid_unit_price > 0 ? ((quote.quoted_price - item.bid_unit_price) / item.bid_unit_price) * 100 : 0;
                    const isBelow = diff < 0;
                    const isAbove = diff > 0;
                    return (
                      <React.Fragment key={name}>
                        <td className="px-3 py-2 text-right bg-accent/10">{formatCurrency(quote.quoted_price)}</td>
                        <td className="px-3 py-2 text-right bg-accent/10">{formatCurrency(quotedTotal)}</td>
                        <td className={`px-3 py-2 text-center text-xs font-semibold bg-accent/10 ${isBelow ? 'text-green-600' : isAbove ? 'text-red-600' : ''}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => deleteQuote(quote.id)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Summary */}
      {supplierNames.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h3 className="font-medium mb-2">Resumo por Fornecedor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Total Licitação</p>
              <p className="text-lg font-bold">{formatCurrency(bidItems.reduce((sum, i) => sum + i.bid_total, 0))}</p>
            </div>
            {supplierNames.map(name => {
              const supplierQuotes = quotes.filter(q => q.supplier_name === name);
              const total = supplierQuotes.reduce((sum, q) => {
                const item = bidItems.find(i => i.id === q.bid_item_id);
                return sum + (item ? q.quoted_price * item.quantity : 0);
              }, 0);
              const bidTotal = bidItems.reduce((sum, i) => sum + i.bid_total, 0);
              const globalDiff = bidTotal > 0 ? ((total - bidTotal) / bidTotal) * 100 : 0;
              return (
                <div key={name} className="p-3 rounded bg-accent/20 border border-accent/30">
                  <p className="text-xs text-muted-foreground">{name}</p>
                  <p className="text-lg font-bold">{formatCurrency(total)}</p>
                  <p className="text-xs text-muted-foreground">{supplierQuotes.length} itens cotados</p>
                  {supplierQuotes.length > 0 && (
                    <p className={`text-xs font-semibold ${globalDiff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {globalDiff > 0 ? '+' : ''}{globalDiff.toFixed(1)}% vs licitação
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
