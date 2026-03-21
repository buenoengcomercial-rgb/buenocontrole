import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { FileText, FileSpreadsheet, TrendingDown, ShoppingCart, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ItemData, ItemPrice } from "./ItemsTable";
import type { SupplierData } from "./SuppliersPanel";

interface Props {
  items: ItemData[];
  suppliers: SupplierData[];
  prices: ItemPrice[];
  groupCode: string;
  obraName: string;
}

function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface OptimizedItem {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  winnerSupplier: string;
  winnerSupplierId: string;
  winnerPrice: number;
  total: number;
  maxPrice: number;
  diffPercent: number;
  savings: number;
  isTie: boolean;
}

type SortKey = "code" | "description" | "quantity" | "winnerSupplier" | "winnerPrice" | "total" | "diffPercent" | "savings";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
    : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
}

export function OptimizedPurchasePlan({ items, suppliers, prices, groupCode, obraName }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [orderOpen, setOrderOpen] = useState(false);
  const [paymentCondition, setPaymentCondition] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [observations, setObservations] = useState("");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const getPrice = (itemId: string, supplierId: string): number =>
    prices.find((p) => p.item_id === itemId && p.supplier_id === supplierId)?.price ?? 0;

  const optimizedItems = useMemo<OptimizedItem[]>(() => {
    return items.map((item) => {
      const supplierPrices = suppliers
        .map((s) => ({ supplier: s, price: getPrice(item.id, s.id) }))
        .filter((sp) => sp.price > 0);

      if (supplierPrices.length === 0) return null;

      const minPrice = Math.min(...supplierPrices.map((sp) => sp.price));
      const maxPrice = Math.max(...supplierPrices.map((sp) => sp.price));
      const winners = supplierPrices.filter((sp) => sp.price === minPrice);
      const isTie = winners.length > 1;
      const winner = winners[0];

      const total = minPrice * item.quantity;
      const maxTotal = maxPrice * item.quantity;
      const savings = maxTotal - total;
      const diffPercent = maxPrice > 0 && minPrice !== maxPrice ? ((maxPrice - minPrice) / maxPrice) * 100 : 0;

      return {
        code: item.code,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        winnerSupplier: winner.supplier.name,
        winnerSupplierId: winner.supplier.id,
        winnerPrice: minPrice,
        total,
        maxPrice,
        diffPercent,
        savings,
        isTie,
      };
    }).filter(Boolean) as OptimizedItem[];
  }, [items, suppliers, prices]);

  const sortedItems = useMemo(() => {
    if (!sortKey) return optimizedItems;
    return [...optimizedItems].sort((a, b) => {
      let cmp = 0;
      if (["quantity", "winnerPrice", "total", "diffPercent", "savings"].includes(sortKey)) {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "pt-BR", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [optimizedItems, sortKey, sortDir]);

  // Summary calculations
  const totalOptimized = optimizedItems.reduce((s, i) => s + i.total, 0);

  // Traditional: best single supplier total
  const traditionalTotals = suppliers.map((sup) => {
    let total = 0;
    let complete = true;
    for (const item of items) {
      const p = getPrice(item.id, sup.id);
      if (p > 0) total += p * item.quantity;
      else complete = false;
    }
    return { supplier: sup, total, complete };
  }).filter((t) => t.complete).sort((a, b) => a.total - b.total);

  const bestTraditional = traditionalTotals[0];
  const totalTraditional = bestTraditional?.total ?? 0;
  const totalSavings = totalTraditional > 0 ? totalTraditional - totalOptimized : 0;
  const savingsPercent = totalTraditional > 0 ? (totalSavings / totalTraditional) * 100 : 0;

  // Chart data: per supplier in optimized model
  const supplierOptimizedTotals = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const item of optimizedItems) {
      const existing = map.get(item.winnerSupplierId) || { name: item.winnerSupplier, total: 0 };
      existing.total += item.total;
      map.set(item.winnerSupplierId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [optimizedItems]);

  const chartConfig = {
    total: { label: "Valor Total", color: "hsl(var(--primary))" },
  };

  const comparisonChartData = [
    { name: bestTraditional ? `Melhor Fornecedor (${bestTraditional.supplier.name})` : "Fornecedor Único", value: totalTraditional },
    { name: "Compra Otimizada", value: totalOptimized },
  ];

  // Group items by winner supplier for optimized orders
  const ordersBySupplier = useMemo(() => {
    const map = new Map<string, { supplier: string; items: OptimizedItem[] }>();
    for (const item of optimizedItems) {
      const existing = map.get(item.winnerSupplierId) || { supplier: item.winnerSupplier, items: [] };
      existing.items.push(item);
      map.set(item.winnerSupplierId, existing);
    }
    return Array.from(map.values());
  }, [optimizedItems]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("PLANO DE COMPRAS OTIMIZADO", 14, 20);
    doc.setFontSize(9);
    doc.text(`Cotacao: ${groupCode}  |  Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    if (obraName) doc.text(`Obra: ${obraName}`, 14, 34);

    let y = obraName ? 40 : 34;
    doc.setFontSize(10);
    doc.text(`Total Otimizado: ${fmtCurrency(totalOptimized)}`, 14, y);
    if (totalTraditional > 0) {
      doc.text(`Total Tradicional: ${fmtCurrency(totalTraditional)}  |  Economia: ${fmtCurrency(totalSavings)} (${savingsPercent.toFixed(1)}%)`, 14, y + 6);
      y += 6;
    }
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Cod.", "Descricao", "Ud", "Qtd", "Fornecedor", "Preco Unit.", "Total", "Economia"]],
      body: sortedItems.map((i) => [
        i.code, i.description, i.unit, fmt(i.quantity),
        i.winnerSupplier, fmtCurrency(i.winnerPrice),
        fmtCurrency(i.total), fmtCurrency(i.savings),
      ]),
      foot: [["", "", "", "", "", "TOTAL:", fmtCurrency(totalOptimized), fmtCurrency(totalSavings)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 51, 84] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    if (paymentCondition) doc.text(`Condicao de Pagamento: ${paymentCondition}`, 14, finalY);
    if (deliveryDeadline) doc.text(`Prazo de Entrega: ${deliveryDeadline}`, 14, finalY + 6);
    if (observations) doc.text(`Observacoes: ${observations}`, 14, finalY + 12);

    doc.save(`PlanoCompras_Otimizado_${groupCode}.pdf`);
  };

  const exportExcel = () => {
    const wsData = [
      ["PLANO DE COMPRAS OTIMIZADO"], [],
      ["Cotação", groupCode], ["Data", new Date().toLocaleDateString("pt-BR")], ["Obra", obraName || "—"], [],
      ["Total Otimizado", totalOptimized], ["Total Tradicional", totalTraditional], ["Economia", totalSavings], [],
      ["Cód.", "Descrição", "Ud", "Qtd", "Fornecedor Vencedor", "Preço Unit.", "Total", "Diferença %", "Economia R$"],
      ...sortedItems.map((i) => [i.code, i.description, i.unit, i.quantity, i.winnerSupplier, i.winnerPrice, i.total, `${i.diffPercent.toFixed(1)}%`, i.savings]),
      [], ["", "", "", "", "", "TOTAL:", totalOptimized, "", totalSavings],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plano Otimizado");
    XLSX.writeFile(wb, `PlanoCompras_Otimizado_${groupCode}.xlsx`);
  };

  const generateOptimizedOrders = () => {
    const doc = new jsPDF();
    let pageNum = 0;

    for (const order of ordersBySupplier) {
      if (pageNum > 0) doc.addPage();
      pageNum++;

      doc.setFontSize(16);
      doc.text("PEDIDO DE COMPRA OTIMIZADO", 14, 20);
      doc.setFontSize(9);
      doc.text(`Cotacao: ${groupCode}  |  Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
      doc.text(`Fornecedor: ${order.supplier}`, 14, 34);
      if (obraName) doc.text(`Obra: ${obraName}`, 14, 40);

      const startY = obraName ? 48 : 42;
      const orderTotal = order.items.reduce((s, i) => s + i.total, 0);

      autoTable(doc, {
        startY,
        head: [["Cod.", "Descricao", "Ud", "Qtd", "Preco Unit.", "Total"]],
        body: order.items.map((i) => [i.code, i.description, i.unit, fmt(i.quantity), fmtCurrency(i.winnerPrice), fmtCurrency(i.total)]),
        foot: [["", "", "", "", "TOTAL:", fmtCurrency(orderTotal)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 51, 84] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      if (paymentCondition) doc.text(`Condicao de Pagamento: ${paymentCondition}`, 14, finalY);
      if (deliveryDeadline) doc.text(`Prazo de Entrega: ${deliveryDeadline}`, 14, finalY + 6);
      if (observations) doc.text(`Observacoes: ${observations}`, 14, finalY + 12);
    }

    doc.save(`Pedidos_Otimizados_${groupCode}.pdf`);
  };

  if (optimizedItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preencha preços na aba Fornecimentos para gerar o plano otimizado.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 p-3 border-b border-border">
        <Card className="border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Otimizado</p>
            <p className="text-lg font-bold text-savings">{fmtCurrency(totalOptimized)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Tradicional</p>
            <p className="text-lg font-bold">{totalTraditional > 0 ? fmtCurrency(totalTraditional) : "—"}</p>
            {bestTraditional && <p className="text-[10px] text-muted-foreground">{bestTraditional.supplier.name}</p>}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Economia Total</p>
            <p className="text-lg font-bold text-savings">{totalSavings > 0 ? fmtCurrency(totalSavings) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Economia %</p>
            <p className="text-lg font-bold text-savings">{savingsPercent > 0 ? `${savingsPercent.toFixed(1)}%` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">{optimizedItems.length} itens · {ordersBySupplier.length} fornecedores</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3 p-3 border-b border-border">
        <div className="rounded-lg border border-border p-3">
          <h4 className="text-xs font-bold mb-2">Comparação: Tradicional vs Otimizado</h4>
          <ChartContainer config={chartConfig} className="h-[140px] w-full">
            <BarChart data={comparisonChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtCurrency(Number(value))} />} />
              <Bar dataKey="value" radius={4}>
                <Cell fill="hsl(var(--muted-foreground))" />
                <Cell fill="hsl(var(--primary))" />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        <div className="rounded-lg border border-border p-3">
          <h4 className="text-xs font-bold mb-2">Distribuição por Fornecedor (Otimizado)</h4>
          <ChartContainer config={chartConfig} className="h-[140px] w-full">
            <BarChart data={supplierOptimizedTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtCurrency(Number(value))} />} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={exportPDF}>
          <FileText className="h-3 w-3" /> Exportar Plano (PDF)
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={exportExcel}>
          <FileSpreadsheet className="h-3 w-3" /> Exportar Plano (Excel)
        </Button>
        <Button size="sm" variant="default" className="h-7 gap-1.5 text-xs bg-savings hover:bg-savings/90" onClick={() => setOrderOpen(true)}>
          <ShoppingCart className="h-3 w-3" /> Gerar Pedido de Compra Otimizado
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("code")}>
                Código <SortIcon active={sortKey === "code"} dir={sortDir} />
              </th>
              <th className="min-w-[200px] px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("description")}>
                Descrição <SortIcon active={sortKey === "description"} dir={sortDir} />
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("quantity")}>
                Qtd <SortIcon active={sortKey === "quantity"} dir={sortDir} />
              </th>
              <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">Ud</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("winnerSupplier")}>
                Fornecedor Vencedor <SortIcon active={sortKey === "winnerSupplier"} dir={sortDir} />
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("winnerPrice")}>
                Preço Unit. <SortIcon active={sortKey === "winnerPrice"} dir={sortDir} />
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("total")}>
                Total <SortIcon active={sortKey === "total"} dir={sortDir} />
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("diffPercent")}>
                Diferença % <SortIcon active={sortKey === "diffPercent"} dir={sortDir} />
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("savings")}>
                Economia <SortIcon active={sortKey === "savings"} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.code} className="border-b border-border hover:bg-muted/30">
                <td className="px-2 py-1 font-medium">{item.code}</td>
                <td className="px-2 py-1">
                  <span className="line-clamp-1">{item.description}</span>
                </td>
                <td className="px-2 py-1 text-right">{fmt(item.quantity)}</td>
                <td className="px-2 py-1 text-center">{item.unit}</td>
                <td className="px-2 py-1">
                  <span className="rounded bg-savings/10 px-1.5 py-0.5 text-savings font-semibold">
                    {item.winnerSupplier}
                  </span>
                  {item.isTie && <span className="ml-1 text-[10px] text-amber-500" title="Empate de preço">⚠</span>}
                </td>
                <td className="px-2 py-1 text-right font-medium text-savings">{fmtCurrency(item.winnerPrice)}</td>
                <td className="px-2 py-1 text-right font-medium">{fmtCurrency(item.total)}</td>
                <td className="px-2 py-1 text-right">
                  {item.diffPercent > 0 ? (
                    <span className="flex items-center justify-end gap-0.5 text-destructive">
                      <TrendingDown className="h-3 w-3" />
                      {item.diffPercent.toFixed(1)}%
                    </span>
                  ) : "—"}
                </td>
                <td className="px-2 py-1 text-right font-medium text-savings">
                  {item.savings > 0 ? fmtCurrency(item.savings) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          {optimizedItems.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40 font-bold">
                <td colSpan={6} className="px-2 py-1.5 text-xs text-right">TOTAL:</td>
                <td className="px-2 py-1.5 text-right text-xs text-savings">{fmtCurrency(totalOptimized)}</td>
                <td></td>
                <td className="px-2 py-1.5 text-right text-xs text-savings">{totalSavings > 0 ? fmtCurrency(totalSavings) : "—"}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Optimized Order Dialog */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🛒 Pedido de Compra Otimizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Serão gerados <strong>{ordersBySupplier.length} pedidos</strong> separados, um para cada fornecedor vencedor:
            </p>
            <div className="space-y-2">
              {ordersBySupplier.map((order) => (
                <div key={order.supplier} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                  <span className="font-medium text-savings">{order.supplier}</span>
                  <span className="text-muted-foreground">{order.items.length} {order.items.length === 1 ? "item" : "itens"} · {fmtCurrency(order.items.reduce((s, i) => s + i.total, 0))}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium">Condição de Pagamento</label>
                <Input value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value)} placeholder="Ex: 30/60/90 dias" />
              </div>
              <div>
                <label className="text-sm font-medium">Prazo de Entrega</label>
                <Input value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} placeholder="Ex: 15 dias úteis" />
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Observações adicionais..." rows={2} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateOptimizedOrders} className="flex-1 gap-2">
                <FileText className="h-4 w-4" /> Gerar Pedidos (PDF)
              </Button>
              <Button onClick={exportExcel} variant="outline" className="flex-1 gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
