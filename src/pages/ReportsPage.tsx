import { useState, useMemo } from 'react';
import { useAppData } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ReportType = 'period' | 'supplier' | 'materials' | 'monthly';

export default function ReportsPage() {
  const { purchases, suppliers, materials } = useAppData();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');

  const filteredByPeriod = useMemo(() => {
    return purchases.filter(p => {
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      if (selectedSupplier !== 'all' && p.supplierId !== selectedSupplier) return false;
      return true;
    });
  }, [purchases, dateFrom, dateTo, selectedSupplier]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    filteredByPeriod.forEach(p => {
      const m = p.date.slice(0, 7);
      months[m] = (months[m] || 0) + p.finalPrice;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total,
      }));
  }, [filteredByPeriod]);

  const supplierData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredByPeriod.forEach(p => {
      const sup = suppliers.find(s => s.id === p.supplierId);
      const name = sup?.name || 'Desconhecido';
      data[name] = (data[name] || 0) + p.finalPrice;
    });
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .map(([name, total]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, total }));
  }, [filteredByPeriod, suppliers]);

  const materialData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredByPeriod.forEach(p => {
      const mat = materials.find(m => m.id === p.materialId);
      const name = mat?.name || 'Desconhecido';
      data[name] = (data[name] || 0) + p.quantity;
    });
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, qty]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, qty }));
  }, [filteredByPeriod, materials]);

  const totalFiltered = useMemo(() => filteredByPeriod.reduce((s, p) => s + p.finalPrice, 0), [filteredByPeriod]);

  return (
    <div className="space-y-6">
      <h1>Relatórios</h1>

      {/* Filters */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="label-caps">Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
              <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Total por Mês</SelectItem>
                <SelectItem value="period">Compras por Período</SelectItem>
                <SelectItem value="supplier">Por Fornecedor</SelectItem>
                <SelectItem value="materials">Materiais Mais Comprados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-caps">Data Início</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
          </div>
          <div>
            <Label className="label-caps">Data Fim</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 shadow-input focus:shadow-input-focus" />
          </div>
          <div>
            <Label className="label-caps">Fornecedor</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="mt-1 shadow-input focus:shadow-input-focus"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
          <div>
            <span className="label-caps">Total no período</span>
            <p className="text-xl font-semibold mt-1">{formatCurrency(totalFiltered)}</p>
          </div>
          <div>
            <span className="label-caps">Compras</span>
            <p className="text-xl font-semibold mt-1">{filteredByPeriod.length}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h2 className="mb-4">
          {reportType === 'monthly' && 'Total Gasto por Mês'}
          {reportType === 'period' && 'Compras por Período'}
          {reportType === 'supplier' && 'Gastos por Fornecedor'}
          {reportType === 'materials' && 'Materiais Mais Comprados'}
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {(reportType === 'monthly' || reportType === 'period') ? (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} contentStyle={{ borderRadius: 8, border: '1px solid hsl(240 6% 90%)' }} />
                <Bar dataKey="total" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : reportType === 'supplier' ? (
              <BarChart data={supplierData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" width={140} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} contentStyle={{ borderRadius: 8, border: '1px solid hsl(240 6% 90%)' }} />
                <Bar dataKey="total" fill="hsl(221 83% 53%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <BarChart data={materialData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" width={140} />
                <Tooltip formatter={(value: number) => [value, 'Quantidade']} contentStyle={{ borderRadius: 8, border: '1px solid hsl(240 6% 90%)' }} />
                <Bar dataKey="qty" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table for period report */}
      {(reportType === 'period') && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Data</th>
                  <th className="label-caps text-left px-6 py-3">Fornecedor</th>
                  <th className="label-caps text-left px-6 py-3 hidden md:table-cell">Material</th>
                  <th className="label-caps text-right px-6 py-3">Valor Final</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredByPeriod].sort((a, b) => b.date.localeCompare(a.date)).map(p => {
                  const sup = suppliers.find(s => s.id === p.supplierId);
                  const mat = materials.find(m => m.id === p.materialId);
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                      <td className="px-6 py-4 text-sm">{formatDate(p.date)}</td>
                      <td className="px-6 py-4 text-sm font-medium">{sup?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm hidden md:table-cell">{mat?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(p.finalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
