import { useMemo } from 'react';
import { useAppData } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { TrendingUp, ShoppingCart, Truck, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const { purchases, suppliers, materials } = useAppData();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const totalThisMonth = useMemo(() => {
    return purchases
      .filter(p => p.date.startsWith(currentMonth))
      .reduce((sum, p) => sum + p.finalPrice, 0);
  }, [purchases, currentMonth]);

  const totalAll = useMemo(() => purchases.reduce((sum, p) => sum + p.finalPrice, 0), [purchases]);

  const topSupplier = useMemo(() => {
    const counts: Record<string, number> = {};
    purchases.forEach(p => { counts[p.supplierId] = (counts[p.supplierId] || 0) + 1; });
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return suppliers.find(s => s.id === topId);
  }, [purchases, suppliers]);

  const topMaterials = useMemo(() => {
    const counts: Record<string, { qty: number; name: string }> = {};
    purchases.forEach(p => {
      const mat = materials.find(m => m.id === p.materialId);
      if (!mat) return;
      if (!counts[p.materialId]) counts[p.materialId] = { qty: 0, name: mat.name };
      counts[p.materialId].qty += p.quantity;
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [purchases, materials]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    purchases.forEach(p => {
      const m = p.date.slice(0, 7);
      months[m] = (months[m] || 0) + p.finalPrice;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total,
      }));
  }, [purchases]);

  const recentPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [purchases]);

  const kpis = [
    { label: 'Total Gasto no Mês', value: formatCurrency(totalThisMonth), icon: TrendingUp, accent: true },
    { label: 'Total Geral', value: formatCurrency(totalAll), icon: ShoppingCart },
    { label: 'Fornecedores', value: suppliers.length.toString(), icon: Truck },
    { label: 'Materiais', value: materials.length.toString(), icon: Package },
  ];

  return (
    <div className="space-y-8">
      <h1>Dashboard de Compras</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl p-6 shadow-card ${kpi.accent ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`label-caps ${kpi.accent ? 'text-primary-foreground/70' : ''}`}>{kpi.label}</span>
              <kpi.icon className={`w-5 h-5 ${kpi.accent ? 'text-primary-foreground/50' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card">
          <h2 className="mb-4">Gastos por Mês</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(240 4% 46%)" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(240 6% 90%)', boxShadow: '0 4px 6px -2px rgba(0,0,0,.04)' }}
                />
                <Bar dataKey="total" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Materials */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h2 className="mb-4">Materiais Mais Comprados</h2>
          <div className="space-y-3">
            {topMaterials.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm truncate mr-2">{m.name}</span>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{m.qty} un.</span>
              </div>
            ))}
            {topMaterials.length === 0 && <p className="text-meta">Nenhuma compra registrada.</p>}
          </div>
        </div>
      </div>

      {/* Recent Purchases + Top Supplier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-6 pt-6 pb-3">
            <h2>Últimas Compras</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="label-caps text-left px-6 py-3">Data</th>
                  <th className="label-caps text-left px-6 py-3">Fornecedor</th>
                  <th className="label-caps text-left px-6 py-3">Material</th>
                  <th className="label-caps text-right px-6 py-3">Valor Final</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map(p => {
                  const supplier = suppliers.find(s => s.id === p.supplierId);
                  const material = materials.find(m => m.id === p.materialId);
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-row-hover transition-colors duration-150">
                      <td className="px-6 py-4 text-sm">{formatDate(p.date)}</td>
                      <td className="px-6 py-4 text-sm">{supplier?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm">{material?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(p.finalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card">
          <h2 className="mb-4">Fornecedor Destaque</h2>
          {topSupplier ? (
            <div className="space-y-3">
              <p className="text-lg font-semibold">{topSupplier.name}</p>
              <p className="text-meta">{topSupplier.cnpj}</p>
              <p className="text-meta">{topSupplier.phone}</p>
              <p className="text-meta">{topSupplier.email}</p>
              <div className="mt-4 pt-4 border-t border-border">
                <span className="label-caps">Total de compras</span>
                <p className="text-xl font-semibold mt-1">
                  {purchases.filter(p => p.supplierId === topSupplier.id).length}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-meta">Nenhum fornecedor encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
