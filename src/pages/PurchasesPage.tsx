import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '@/context/AppContext';
import { Plus, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/format';
import { TAX_TYPES } from '@/types';
import AttachedDocuments from '@/components/AttachedDocuments';

export default function PurchasesPage() {
  const { purchases, suppliers, materials, addPurchase, deletePurchase } = useAppData();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxType, setTaxType] = useState('');
  const [taxValue, setTaxValue] = useState('');
  const [city, setCity] = useState('');

  const totalPrice = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const u = parseFloat(unitPrice) || 0;
    return q * u;
  }, [quantity, unitPrice]);

  const finalPrice = useMemo(() => {
    return totalPrice + (parseFloat(taxValue) || 0);
  }, [totalPrice, taxValue]);

  const resetForm = () => {
    setSupplierId(''); setDate(''); setInvoiceNumber(''); setMaterialId('');
    setQuantity(''); setUnitPrice(''); setTaxType(''); setTaxValue(''); setCity('');
  };

  const handleSave = () => {
    if (!supplierId || !date || !materialId || !quantity || !unitPrice) return;
    addPurchase({
      supplierId, date, invoiceNumber, materialId,
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitPrice),
      totalPrice,
      taxType: taxType as any || 'Outro',
      taxValue: parseFloat(taxValue) || 0,
      finalPrice,
      city,
    });
    setDialogOpen(false);
    resetForm();
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return purchases.filter(p => {
      const sup = suppliers.find(x => x.id === p.supplierId);
      const mat = materials.find(x => x.id === p.materialId);
      return (
        sup?.name.toLowerCase().includes(s) ||
        mat?.name.toLowerCase().includes(s) ||
        p.invoiceNumber.toLowerCase().includes(s) ||
        p.date.includes(s)
      );
    });
  }, [purchases, suppliers, materials, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1>Compras</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="shadow-xs hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all duration-150">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Compra
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por fornecedor, material, NF ou data..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 shadow-input focus:shadow-input-focus" />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="label-caps text-left px-6 py-3">Data</th>
                <th className="label-caps text-left px-6 py-3">Fornecedor</th>
                <th className="label-caps text-left px-6 py-3 hidden md:table-cell">Material</th>
                <th className="label-caps text-left px-6 py-3 hidden lg:table-cell">NF</th>
                <th className="label-caps text-right px-6 py-3 hidden md:table-cell">Qtd</th>
                <th className="label-caps text-right px-6 py-3 hidden lg:table-cell">Valor Unit.</th>
                <th className="label-caps text-right px-6 py-3 hidden lg:table-cell">Imposto</th>
                <th className="label-caps text-right px-6 py-3">Valor Final</th>
                <th className="label-caps text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const sup = suppliers.find(x => x.id === p.supplierId);
                const mat = materials.find(x => x.id === p.materialId);
                return (
                  <React.Fragment key={p.id}>
                  <tr className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                    <td className="px-6 py-4 text-sm">{formatDate(p.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium">{sup?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm hidden md:table-cell">{mat?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm hidden lg:table-cell text-muted-foreground">{p.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-right hidden md:table-cell">{p.quantity}</td>
                    <td className="px-6 py-4 text-sm text-right hidden lg:table-cell">{formatCurrency(p.unitPrice)}</td>
                    <td className="px-6 py-4 text-sm text-right hidden lg:table-cell text-muted-foreground">{formatCurrency(p.taxValue)}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(p.finalPrice)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-2 rounded-lg hover:bg-muted transition-colors duration-150">{expandedId === p.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</button>
                        <button onClick={() => deletePurchase(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors duration-150"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr><td colSpan={9} className="px-6 py-4 bg-muted/30"><AttachedDocuments entityType="purchase" entityId={p.id} /></td></tr>
                  )}
                  </React.Fragment>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-meta">Nenhuma compra encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Fornecedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data da Compra *</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Material *</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número da Nota Fiscal</Label>
                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Label>Unidade</Label>
                <Input value={materialId ? (materials.find(m => m.id === materialId)?.unit || '') : ''} readOnly className="mt-1 bg-muted" placeholder="Selecione material" />
              </div>
              <div>
                <Label>Quantidade *</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" min="0" step="any" />
              </div>
              <div>
                <Label>Valor Unitário (R$) *</Label>
                <Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" min="0" step="0.01" />
              </div>
              <div>
                <Label>Valor Total</Label>
                <Input value={formatCurrency(totalPrice)} readOnly className="mt-1 bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Tipo de Imposto</Label>
                <Select value={taxType} onValueChange={setTaxType}>
                  <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Imposto (R$)</Label>
                <Input type="number" value={taxValue} onChange={e => setTaxValue(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" min="0" step="0.01" />
              </div>
              <div>
                <Label>Valor Final</Label>
                <Input value={formatCurrency(finalPrice)} readOnly className="mt-1 bg-muted font-semibold" />
              </div>
            </div>
            <div>
              <Label>Cidade da Compra</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="shadow-xs hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all duration-150">Salvar Compra</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
