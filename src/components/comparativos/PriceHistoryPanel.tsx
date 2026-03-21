import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { History } from "lucide-react";

interface HistoryEntry {
  id: string;
  item_code: string;
  item_description: string;
  supplier_name: string;
  price: number;
  date: string;
}

interface Props {
  history: HistoryEntry[];
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const COLORS = ["hsl(152, 55%, 42%)", "hsl(220, 60%, 50%)", "hsl(0, 72%, 52%)", "hsl(45, 93%, 55%)", "hsl(280, 60%, 50%)"];

export function PriceHistoryPanel({ history }: Props) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const itemCodes = [...new Set(history.map((h) => h.item_code))];
  const activeCode = selectedCode || itemCodes[0] || null;

  const filteredHistory = activeCode ? history.filter((h) => h.item_code === activeCode) : [];

  const dateMap = new Map<string, Record<string, number>>();
  for (const entry of filteredHistory) {
    const dateStr = new Date(entry.date).toLocaleDateString("pt-BR");
    if (!dateMap.has(dateStr)) dateMap.set(dateStr, {});
    dateMap.get(dateStr)![entry.supplier_name] = entry.price;
  }

  const chartData = [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, prices]) => ({ date, ...prices }));

  const supplierNames = [...new Set(filteredHistory.map((h) => h.supplier_name))];

  if (history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preencha preços dos itens para gerar o histórico
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <History className="h-4 w-4 text-primary" />
        Histórico de Preços
      </h3>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {itemCodes.map((code) => {
          const item = history.find((h) => h.item_code === code);
          return (
            <button
              key={code}
              onClick={() => setSelectedCode(code)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCode === code
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {item?.item_description || code}
            </button>
          );
        })}
      </div>

      {activeCode && chartData.length > 0 && (
        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip formatter={(value: number) => [fmtCurrency(value), ""]} />
                <Legend />
                {supplierNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="w-[280px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Fornecedor</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Data</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">Preço</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-border">
                    <td className="px-2 py-1 font-medium">{entry.supplier_name}</td>
                    <td className="px-2 py-1 text-muted-foreground">{new Date(entry.date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-2 py-1 text-right">{fmtCurrency(entry.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
