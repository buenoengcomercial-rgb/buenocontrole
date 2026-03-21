import { Trophy, TrendingDown, Medal, Star, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ItemData, ItemPrice } from "./ItemsTable";
import type { SupplierData } from "./SuppliersPanel";

interface Props {
  items: ItemData[];
  suppliers: SupplierData[];
  prices: ItemPrice[];
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface RankedSupplier {
  supplier: SupplierData;
  total: number;
  complete: boolean;
  costBenefitScore: number;
}

function getRanking(items: ItemData[], suppliers: SupplierData[], prices: ItemPrice[]): RankedSupplier[] {
  const results = suppliers.map((sup) => {
    let total = 0;
    let complete = true;
    for (const item of items) {
      const sp = prices.find((p) => p.item_id === item.id && p.supplier_id === sup.id);
      if (sp && sp.price > 0) {
        total += sp.price * item.quantity;
      } else {
        complete = false;
      }
    }
    return { supplier: sup, total, complete, costBenefitScore: 0 };
  }).filter((r) => r.complete);

  if (results.length === 0) return [];

  const maxTotal = Math.max(...results.map((r) => r.total));
  const minTotal = Math.min(...results.map((r) => r.total));
  const range = maxTotal - minTotal || 1;

  for (const r of results) {
    const priceScore = ((maxTotal - r.total) / range) * 50;
    const deliveryScore = r.supplier.delivery_days ? Math.max(0, 25 - (r.supplier.delivery_days / 2)) : 12.5;
    const ratingScore = r.supplier.rating ? (r.supplier.rating / 5) * 25 : 12.5;
    r.costBenefitScore = Math.round(priceScore + deliveryScore + ratingScore);
  }

  return results.sort((a, b) => a.total - b.total);
}

const MEDAL_ICONS = [
  <Trophy key="1" className="h-5 w-5 text-highlight" />,
  <Medal key="2" className="h-5 w-5 text-muted-foreground" />,
  <Medal key="3" className="h-5 w-5 text-amber-700" />,
];

const BAR_COLORS = [
  "hsl(152, 55%, 42%)", "hsl(215, 25%, 60%)", "hsl(215, 25%, 70%)", "hsl(215, 25%, 75%)", "hsl(0, 72%, 52%)",
];

export function CotacaoAnalysis({ items, suppliers, prices }: Props) {
  const totalContracted = items.reduce((s, i) => s + i.base_price * i.quantity, 0);
  const ranking = getRanking(items, suppliers, prices);

  if (ranking.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preencha os preços de todos os itens para pelo menos um fornecedor para ver a análise
      </div>
    );
  }

  const winner = ranking[0];
  const mostExpensive = ranking[ranking.length - 1];
  const economyVsContract = totalContracted - winner.total;
  const economyVsMostExpensive = mostExpensive.total - winner.total;
  const bestCostBenefit = [...ranking].sort((a, b) => b.costBenefitScore - a.costBenefitScore)[0];

  const chartData = ranking.map((r) => ({ name: r.supplier.name, total: r.total }));

  return (
    <div className="flex h-full gap-4 overflow-y-auto p-4">
      <div className="flex w-[340px] flex-shrink-0 flex-col gap-3 overflow-y-auto">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Trophy className="h-4 w-4 text-primary" /> Ranking da Cotação
        </h3>
        <div className="space-y-2">
          {ranking.map((r, i) => (
            <div key={r.supplier.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
              i === 0 ? "border-savings/30 bg-savings/10" : "border-border bg-card"
            }`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {i < 3 ? MEDAL_ICONS[i] : <span className="text-xs font-bold text-muted-foreground">{i + 1}º</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.supplier.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${i === 0 ? "text-savings font-medium" : "text-muted-foreground"}`}>
                    {fmtCurrency(r.total)}
                  </span>
                  {r.supplier.delivery_days > 0 && (
                    <span className="text-[10px] text-muted-foreground">{r.supplier.delivery_days}d</span>
                  )}
                  {r.supplier.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-highlight text-highlight" />
                      <span className="text-[10px] text-muted-foreground">{r.supplier.rating}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{i + 1}º</span>
                <div className="mt-0.5 text-[10px] text-muted-foreground">CB: {r.costBenefitScore}%</div>
              </div>
            </div>
          ))}
        </div>

        {bestCostBenefit && bestCostBenefit.supplier.id !== winner.supplier.id && (
          <div className="rounded-lg border border-highlight/30 bg-highlight/5 p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Zap className="h-3.5 w-3.5 text-highlight" /> Melhor Custo-Benefício
            </h4>
            <p className="mt-1 text-sm font-semibold">{bestCostBenefit.supplier.name}</p>
            <p className="text-xs text-muted-foreground">Score: {bestCostBenefit.costBenefitScore}% — {fmtCurrency(bestCostBenefit.total)}</p>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingDown className="h-4 w-4 text-savings" /> Análise de Economia
          </h3>
          {economyVsContract > 0 && (
            <div className="rounded-lg border border-savings/30 bg-savings/5 p-3">
              <p className="text-xs text-muted-foreground">Economia vs Contratado</p>
              <p className="text-lg font-bold text-savings">{fmtCurrency(economyVsContract)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Contratado: {fmtCurrency(totalContracted)} → Vencedor: {fmtCurrency(winner.total)}
              </p>
            </div>
          )}
          {ranking.length > 1 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Economia vs Mais Caro</p>
              <p className="text-lg font-bold text-savings">{fmtCurrency(economyVsMostExpensive)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {mostExpensive.supplier.name}: {fmtCurrency(mostExpensive.total)} → {winner.supplier.name}: {fmtCurrency(winner.total)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="mb-2 text-sm font-bold text-foreground">Comparação de Preços por Fornecedor</h3>
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(value: number) => [fmtCurrency(value), "Total"]} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? BAR_COLORS[0] : i === chartData.length - 1 ? BAR_COLORS[4] : BAR_COLORS[Math.min(i, 3)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs">
          <div><span className="text-muted-foreground">Contratado: </span><span className="font-bold">{fmtCurrency(totalContracted)}</span></div>
          <div><span className="text-muted-foreground">Menor Preço: </span><span className="font-bold text-savings">{fmtCurrency(winner.total)}</span></div>
          {ranking.length > 1 && (
            <div><span className="text-muted-foreground">Maior Preço: </span><span className="font-bold text-destructive">{fmtCurrency(mostExpensive.total)}</span></div>
          )}
          <div><span className="text-muted-foreground">Fornecedores: </span><span className="font-bold">{ranking.length}</span></div>
        </div>
      </div>
    </div>
  );
}
