import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Plus, Trash2, Upload, Star, FileSpreadsheet, BarChart3, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Comparison {
  id: string;
  code: string;
  description: string;
  project_id: string | null;
  date: string;
}

interface Supplier {
  id: string;
  comparison_id: string;
  name: string;
  delivery_days: number;
  rating: number;
}

interface CompItem {
  id: string;
  comparison_id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  base_price: number;
}

interface ItemPrice {
  id: string;
  item_id: string;
  supplier_id: string;
  price: number;
}

interface Project {
  id: string;
  name: string;
}

type SubTab = 'fornecimentos' | 'analise' | 'historico';

export default function ComparativosPage() {
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<CompItem[]>([]);
  const [prices, setPrices] = useState<ItemPrice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('fornecimentos');

  // Forms
  const [showNewComp, setShowNewComp] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newProjId, setNewProjId] = useState('');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnit, setItemUnit] = useState('UN');
  const [itemQty, setItemQty] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ itemId: string; supplierId: string } | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // History
  const [history, setHistory] = useState<any[]>([]);

  // Load initial data
  useEffect(() => {
    Promise.all([
      supabase.from('purchase_comparisons').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name'),
    ]).then(([compRes, projRes]) => {
      setComparisons((compRes.data || []) as Comparison[]);
      setProjects((projRes.data || []) as Project[]);
      setLoading(false);
    });
  }, []);

  // Load selected comparison data
  useEffect(() => {
    if (!selectedId) { setSuppliers([]); setItems([]); setPrices([]); return; }
    Promise.all([
      supabase.from('comparison_suppliers').select('*').eq('comparison_id', selectedId),
      supabase.from('comparison_items').select('*').eq('comparison_id', selectedId).order('created_at'),
      supabase.from('comparison_item_prices').select('*'),
    ]).then(([sRes, iRes, pRes]) => {
      setSuppliers((sRes.data || []) as Supplier[]);
      const compItems = (iRes.data || []) as CompItem[];
      setItems(compItems);
      const itemIds = compItems.map(i => i.id);
      setPrices(((pRes.data || []) as ItemPrice[]).filter(p => itemIds.includes(p.item_id)));
    });
  }, [selectedId]);

  // Load history when tab changes
  useEffect(() => {
    if (subTab === 'historico') {
      supabase.from('price_history').select('*').order('date', { ascending: false }).limit(200)
        .then(res => setHistory(res.data || []));
    }
  }, [subTab]);

  // Generate next code
  const nextCode = useCallback(() => {
    const nums = comparisons.map(c => {
      const m = c.code.match(/CMP(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });
    const next = Math.max(0, ...nums) + 1;
    return `CMP${String(next).padStart(4, '0')}`;
  }, [comparisons]);

  const createComparison = useCallback(async () => {
    if (!newDesc.trim()) { toast.error('Informe a descrição'); return; }
    const code = nextCode();
    const { data, error } = await supabase.from('purchase_comparisons').insert({
      code, description: newDesc.trim(),
      project_id: newProjId || null,
      date: new Date().toISOString().split('T')[0],
    }).select().single();
    if (error || !data) { toast.error('Erro ao criar'); return; }
    setComparisons(prev => [data as Comparison, ...prev]);
    setSelectedId((data as Comparison).id);
    setNewDesc(''); setNewProjId(''); setShowNewComp(false);
    toast.success('Comparativo criado');
  }, [newDesc, newProjId, nextCode]);

  const deleteComparison = useCallback(async (id: string) => {
    await supabase.from('purchase_comparisons').delete().eq('id', id);
    setComparisons(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success('Comparativo removido');
  }, [selectedId]);

  const addSupplier = useCallback(async () => {
    if (!supplierName.trim() || !selectedId) return;
    const { data } = await supabase.from('comparison_suppliers').insert({
      comparison_id: selectedId, name: supplierName.trim(),
    }).select().single();
    if (data) setSuppliers(prev => [...prev, data as Supplier]);
    setSupplierName(''); setShowNewSupplier(false);
    toast.success('Fornecedor adicionado');
  }, [supplierName, selectedId]);

  const updateSupplier = useCallback(async (id: string, field: string, value: any) => {
    await supabase.from('comparison_suppliers').update({ [field]: value }).eq('id', id);
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    await supabase.from('comparison_suppliers').delete().eq('id', id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    setPrices(prev => prev.filter(p => p.supplier_id !== id));
    toast.success('Fornecedor removido');
  }, []);

  const addItem = useCallback(async () => {
    if (!itemDesc.trim() || !selectedId) return;
    const { data } = await supabase.from('comparison_items').insert({
      comparison_id: selectedId, code: itemCode.trim(), description: itemDesc.trim(),
      unit: itemUnit, quantity: Number(itemQty) || 0,
    }).select().single();
    if (data) setItems(prev => [...prev, data as CompItem]);
    setItemCode(''); setItemDesc(''); setItemUnit('UN'); setItemQty(''); setShowNewItem(false);
    toast.success('Item adicionado');
  }, [selectedId, itemCode, itemDesc, itemUnit, itemQty]);

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('comparison_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setPrices(prev => prev.filter(p => p.item_id !== id));
  }, []);

  const savePrice = useCallback(async (itemId: string, supplierId: string, price: number) => {
    const existing = prices.find(p => p.item_id === itemId && p.supplier_id === supplierId);
    if (existing) {
      await supabase.from('comparison_item_prices').update({ price }).eq('id', existing.id);
      setPrices(prev => prev.map(p => p.id === existing.id ? { ...p, price } : p));
    } else {
      const { data } = await supabase.from('comparison_item_prices').insert({
        item_id: itemId, supplier_id: supplierId, price,
      }).select().single();
      if (data) setPrices(prev => [...prev, data as ItemPrice]);
    }
    // Save to history
    const item = items.find(i => i.id === itemId);
    const supplier = suppliers.find(s => s.id === supplierId);
    if (item && supplier) {
      await supabase.from('price_history').insert({
        item_code: item.code, item_description: item.description,
        supplier_name: supplier.name, price, comparison_id: selectedId,
      });
    }
    setEditingPrice(null);
  }, [prices, items, suppliers, selectedId]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length < 2) { toast.error('Planilha vazia'); return; }

      const hdr = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
      const find = (kw: string[]) => hdr.findIndex(h => kw.some(k => h.includes(k)));
      const codeCol = find(['código', 'codigo', 'cod', 'item']);
      const descCol = find(['descrição', 'descricao', 'resumo', 'desc']);
      const unitCol = find(['unidade', 'und', 'ud', 'un']);
      const qtyCol = find(['quantidade', 'qtd', 'quant']);
      const priceCol = find(['preço', 'preco', 'price', 'valor unit', 'p.unit', 'unitário', 'unitario']);
      if (descCol === -1) { toast.error('Coluna descrição não encontrada'); return; }

      const newItems: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[descCol]) continue;
        const desc = String(r[descCol]).trim();
        if (!desc) continue;
        newItems.push({
          comparison_id: selectedId,
          code: codeCol >= 0 ? String(r[codeCol] || '').trim() : String(i),
          description: desc,
          unit: unitCol >= 0 ? String(r[unitCol] || '').trim() : 'UN',
          quantity: qtyCol >= 0 ? Number(r[qtyCol]) || 0 : 0,
          base_price: priceCol >= 0 ? Number(r[priceCol]) || 0 : 0,
        });
      }

      for (let i = 0; i < newItems.length; i += 50) {
        const { data } = await supabase.from('comparison_items').insert(newItems.slice(i, i + 50)).select();
        if (data) setItems(prev => [...prev, ...(data as CompItem[])]);
      }
      toast.success(`${newItems.length} itens importados`);
    } catch { toast.error('Erro ao processar'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }, [selectedId]);

  const selected = comparisons.find(c => c.id === selectedId);
  const projName = (pid: string | null) => projects.find(p => p.id === pid)?.name || '—';

  if (loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">CMP</div>
          <h1 className="text-xl font-bold">Comparativos de Compras</h1>
        </div>
      </div>

      {/* Split: Comparativos + Fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden mb-6">
        {/* LEFT: Comparativos */}
        <div className="border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comparativos</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowNewComp(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showNewComp && (
            <div className="p-3 border-b border-border bg-muted/30 space-y-2">
              <Input placeholder="Descrição" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="h-8 text-sm" />
              <select className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" value={newProjId} onChange={e => setNewProjId(e.target.value)}>
                <option value="">Obra (opcional)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={createComparison}>Criar</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNewComp(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <div className="divide-y divide-border max-h-[250px] overflow-y-auto">
            {comparisons.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum comparativo</p>}
            {comparisons.map(c => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm hover:bg-muted/30 transition-colors ${selectedId === c.id ? 'bg-primary/10' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs">{c.code}</span>
                    <span className="truncate">{c.description}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{projName(c.project_id)}</span>
                    <span>{c.date}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteComparison(c.id); }} className="text-destructive hover:text-destructive/80 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Fornecedores */}
        <div>
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fornecedores</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (selectedId) setShowNewSupplier(true); else toast.error('Selecione um comparativo'); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showNewSupplier && (
            <div className="p-3 border-b border-border bg-muted/30 flex gap-2 items-end">
              <Input placeholder="Nome do fornecedor" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="h-8 text-sm flex-1"
                onKeyDown={e => e.key === 'Enter' && addSupplier()} />
              <Button size="sm" className="h-8 text-xs" onClick={addSupplier}>Adicionar</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewSupplier(false)}>×</Button>
            </div>
          )}

          <div className="max-h-[250px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-1.5 text-left w-10">Nº</th>
                  <th className="px-4 py-1.5 text-left">Fornecedor</th>
                  <th className="px-4 py-1.5 text-center">Prazo</th>
                  <th className="px-4 py-1.5 text-center">Avaliação</th>
                  <th className="px-4 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-4 text-sm">
                    {selectedId ? 'Nenhum fornecedor' : 'Selecione um comparativo'}
                  </td></tr>
                )}
                {suppliers.map((s, idx) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-1.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-1.5 font-medium">{s.name}</td>
                    <td className="px-4 py-1.5 text-center">
                      <Input type="number" className="h-7 w-16 text-xs text-center mx-auto" value={s.delivery_days || ''}
                        onChange={e => updateSupplier(s.id, 'delivery_days', Number(e.target.value) || 0)}
                        placeholder="—" />
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => updateSupplier(s.id, 'rating', n)}
                            className={n <= s.rating ? 'text-yellow-500' : 'text-muted-foreground/30'}>
                            <Star className="w-3.5 h-3.5" fill={n <= s.rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <button onClick={() => deleteSupplier(s.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sub tabs */}
      {selectedId && (
        <>
          <div className="flex items-center gap-1 border-b border-border mb-4">
            {([
              { key: 'fornecimentos' as SubTab, label: 'Fornecimentos', icon: FileSpreadsheet },
              { key: 'analise' as SubTab, label: 'Análise de Cotação', icon: BarChart3 },
              { key: 'historico' as SubTab, label: 'Histórico de Preços', icon: Clock },
            ]).map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  subTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {subTab === 'fornecimentos' && (
            <FornecimentoTab
              items={items} suppliers={suppliers} prices={prices}
              editingPrice={editingPrice} editPriceVal={editPriceVal}
              setEditingPrice={setEditingPrice} setEditPriceVal={setEditPriceVal}
              savePrice={savePrice} deleteItem={deleteItem}
              showNewItem={showNewItem} setShowNewItem={setShowNewItem}
              itemCode={itemCode} setItemCode={setItemCode}
              itemDesc={itemDesc} setItemDesc={setItemDesc}
              itemUnit={itemUnit} setItemUnit={setItemUnit}
              itemQty={itemQty} setItemQty={setItemQty}
              addItem={addItem} fileRef={fileRef} handleImport={handleImport}
            />
          )}

          {subTab === 'analise' && <AnaliseTab items={items} suppliers={suppliers} prices={prices} />}
          {subTab === 'historico' && <HistoricoTab history={history} />}
        </>
      )}
    </div>
  );
}

// ===== Fornecimento Tab =====
function FornecimentoTab({ items, suppliers, prices, editingPrice, editPriceVal, setEditingPrice, setEditPriceVal, savePrice, deleteItem, showNewItem, setShowNewItem, itemCode, setItemCode, itemDesc, setItemDesc, itemUnit, setItemUnit, itemQty, setItemQty, addItem, fileRef, handleImport }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fornecimento</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Importar (Excel / PDF)
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setShowNewItem(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {showNewItem && (
        <div className="bg-muted/30 rounded-lg p-3 border border-border grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input placeholder="Código" value={itemCode} onChange={e => setItemCode(e.target.value)} className="h-8 text-sm" />
          <Input placeholder="Descrição" value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="h-8 text-sm col-span-2" />
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={itemUnit} onChange={e => setItemUnit(e.target.value)}>
            {['UN', 'M', 'M²', 'M³', 'KG', 'L', 'CJ', 'PC', 'RL', 'GL'].map(u => <option key={u}>{u}</option>)}
          </select>
          <div className="flex gap-2">
            <Input placeholder="Qtd" type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} className="h-8 text-sm" />
            <Button size="sm" className="h-8 text-xs shrink-0" onClick={addItem}>OK</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => setShowNewItem(false)}>×</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-max min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border text-xs">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[80px]">Código</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[300px]">Resumo</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[90px]">Quantidade</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-[50px]">Ud</th>
              {suppliers.map((s: Supplier, idx: number) => (
                <React.Fragment key={s.id}>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[100px]">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground/60">{idx + 1} Preço</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[110px]">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground/60">Importância {idx + 1}</span>
                    </div>
                  </th>
                </React.Fragment>
              ))}
              <th className="px-3 py-2 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={4 + suppliers.length * 2 + 1} className="text-center text-muted-foreground py-8 text-sm">
                Nenhum item. Importe uma planilha ou adicione manualmente.
              </td></tr>
            )}
            {items.map((item: CompItem) => {
              const itemPrices = prices.filter((p: ItemPrice) => p.item_id === item.id);
              const priceValues = itemPrices.filter((p: ItemPrice) => p.price > 0).map((p: ItemPrice) => p.price);
              const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : null;
              const maxPrice = priceValues.length > 1 ? Math.max(...priceValues) : null;

              return (
                <tr key={item.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-1.5 text-xs font-mono">{item.code}</td>
                  <td className="px-3 py-1.5 text-xs leading-tight" title={item.description}>
                    {item.description.length > 120 ? item.description.substring(0, 120) + '...' : item.description}
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs">{item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-1.5 text-center text-xs">{item.unit}</td>
                  {suppliers.map((s: Supplier) => {
                    const pp = itemPrices.find((p: ItemPrice) => p.supplier_id === s.id);
                    const price = pp?.price || 0;
                    const total = price * item.quantity;
                    const isMin = price > 0 && price === minPrice;
                    const isMax = price > 0 && price === maxPrice && maxPrice !== minPrice;
                    const isEditing = editingPrice?.itemId === item.id && editingPrice?.supplierId === s.id;

                    return (
                      <React.Fragment key={s.id}>
                        <td className={`px-3 py-1 text-right ${isMin ? 'bg-green-50 dark:bg-green-950/30' : isMax ? 'bg-red-50 dark:bg-red-950/30' : ''}`}>
                          {isEditing ? (
                            <Input type="number" step="0.01" className="h-7 w-24 text-xs text-right ml-auto" autoFocus
                              value={editPriceVal} onChange={e => setEditPriceVal(e.target.value)}
                              onBlur={() => { if (editPriceVal) savePrice(item.id, s.id, Number(editPriceVal)); else setEditingPrice(null); }}
                              onKeyDown={e => { if (e.key === 'Enter' && editPriceVal) savePrice(item.id, s.id, Number(editPriceVal)); if (e.key === 'Escape') setEditingPrice(null); }}
                            />
                          ) : (
                            <button className={`text-xs hover:bg-muted rounded px-1 py-0.5 min-w-[60px] text-right block ml-auto ${isMin ? 'text-green-700 dark:text-green-400 font-semibold' : isMax ? 'text-red-700 dark:text-red-400' : ''}`}
                              onClick={() => { setEditingPrice({ itemId: item.id, supplierId: s.id }); setEditPriceVal(price > 0 ? String(price) : ''); }}>
                              {price > 0 ? formatCurrency(price) : '—'}
                            </button>
                          )}
                        </td>
                        <td className={`px-3 py-1.5 text-right text-xs font-medium ${isMin ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30' : isMax ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30' : ''}`}>
                          {price > 0 ? formatCurrency(total) : '—'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-3 py-1.5">
                    <button onClick={() => deleteItem(item.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Análise Tab =====
function AnaliseTab({ items, suppliers, prices }: { items: CompItem[]; suppliers: Supplier[]; prices: ItemPrice[] }) {
  const supplierTotals = suppliers.map(s => {
    const total = items.reduce((sum, item) => {
      const p = prices.find(pr => pr.item_id === item.id && pr.supplier_id === s.id);
      return sum + (p ? p.price * item.quantity : 0);
    }, 0);
    const quotedItems = prices.filter(p => p.supplier_id === s.id && p.price > 0).length;
    return { ...s, total, quotedItems };
  }).sort((a, b) => {
    if (a.total === 0) return 1;
    if (b.total === 0) return -1;
    return a.total - b.total;
  });

  const cheapest = supplierTotals.find(s => s.total > 0)?.total || 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Ranking de Fornecedores</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supplierTotals.map((s, idx) => {
          const diff = cheapest > 0 && s.total > 0 ? ((s.total - cheapest) / cheapest) * 100 : 0;
          return (
            <div key={s.id} className={`p-4 rounded-lg border ${idx === 0 && s.total > 0 ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">{idx + 1}º — {s.name}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-3 h-3 ${n <= s.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xl font-bold">{s.total > 0 ? formatCurrency(s.total) : '—'}</p>
              <p className="text-xs text-muted-foreground">{s.quotedItems} de {items.length} itens cotados</p>
              {idx > 0 && diff > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">+{diff.toFixed(1)}% vs mais barato</p>
              )}
              {idx === 0 && s.total > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-1">✓ Menor preço</p>
              )}
              {s.delivery_days > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Prazo: {s.delivery_days} dias</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Item-by-item analysis */}
      <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mt-6">Análise por Item</h3>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border text-xs">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
              {suppliers.map(s => (
                <th key={s.id} className="px-3 py-2 text-right font-medium text-muted-foreground">{s.name}</th>
              ))}
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Vencedor</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const itemPrices = suppliers.map(s => {
                const p = prices.find(pr => pr.item_id === item.id && pr.supplier_id === s.id);
                return { supplier: s, price: p?.price || 0, total: (p?.price || 0) * item.quantity };
              });
              const validPrices = itemPrices.filter(p => p.price > 0);
              const winner = validPrices.length > 0 ? validPrices.reduce((a, b) => a.price < b.price ? a : b) : null;

              return (
                <tr key={item.id} className="border-b border-border">
                  <td className="px-3 py-1.5 text-xs">
                    <span className="font-mono mr-2">{item.code}</span>
                    {item.description.substring(0, 60)}{item.description.length > 60 ? '...' : ''}
                  </td>
                  {itemPrices.map(p => (
                    <td key={p.supplier.id} className={`px-3 py-1.5 text-right text-xs ${
                      winner && p.supplier.id === winner.supplier.id ? 'text-green-700 dark:text-green-400 font-semibold' : ''
                    }`}>
                      {p.price > 0 ? formatCurrency(p.total) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center text-xs font-medium text-green-600">
                    {winner ? winner.supplier.name : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Histórico Tab =====
function HistoricoTab({ history }: { history: any[] }) {
  if (history.length === 0) return <p className="text-muted-foreground text-sm py-8 text-center">Nenhum histórico de preços registrado.</p>;

  // Group by item_code + item_description
  const grouped: Record<string, any[]> = {};
  history.forEach(h => {
    const key = `${h.item_code}|${h.item_description}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([key, records]) => {
        const [code, desc] = key.split('|');
        return (
          <div key={key} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 border-b border-border">
              <span className="font-mono text-xs mr-2">{code}</span>
              <span className="text-sm">{desc?.substring(0, 100)}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-1.5 text-left">Data</th>
                  <th className="px-4 py-1.5 text-left">Fornecedor</th>
                  <th className="px-4 py-1.5 text-right">Preço</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-1.5 text-xs">{r.date}</td>
                    <td className="px-4 py-1.5 text-xs">{r.supplier_name}</td>
                    <td className="px-4 py-1.5 text-right text-xs font-medium">{formatCurrency(r.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
