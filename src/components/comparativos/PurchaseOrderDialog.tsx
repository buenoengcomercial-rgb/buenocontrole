import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ItemData, ItemPrice } from "./ItemsTable";
import type { SupplierData } from "./SuppliersPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemData[];
  suppliers: SupplierData[];
  prices: ItemPrice[];
  groupCode: string;
  obraName: string;
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PurchaseOrderDialog({ open, onOpenChange, items, suppliers, prices, groupCode, obraName }: Props) {
  const [paymentCondition, setPaymentCondition] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [observations, setObservations] = useState("");

  // Find winner (lowest total with all prices filled)
  const supplierTotals = suppliers.map((sup) => {
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
    return { supplier: sup, total, complete };
  }).filter((r) => r.complete).sort((a, b) => a.total - b.total);

  const winner = supplierTotals[0];
  if (!winner) return null;

  const orderItems = items.map((item) => {
    const sp = prices.find((p) => p.item_id === item.id && p.supplier_id === winner.supplier.id);
    const unitPrice = sp?.price ?? 0;
    return { code: item.code, description: item.description, unit: item.unit, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity };
  });

  const totalValue = winner.total;
  const date = new Date().toLocaleDateString("pt-BR");

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("PEDIDO DE COMPRA", 14, 22);
    doc.setFontSize(10);
    doc.text(`Cotação: ${groupCode}`, 14, 32);
    doc.text(`Data: ${date}`, 14, 38);
    doc.text(`Fornecedor: ${winner.supplier.name}`, 14, 44);
    if (obraName) doc.text(`Obra: ${obraName}`, 14, 50);
    const startY = obraName ? 58 : 52;
    autoTable(doc, {
      startY,
      head: [["Cód.", "Descrição", "Ud", "Qtd", "Preço Unit.", "Total"]],
      body: orderItems.map((i) => [i.code, i.description, i.unit, i.quantity.toFixed(2), fmtCurrency(i.unitPrice), fmtCurrency(i.total)]),
      foot: [["", "", "", "", "TOTAL:", fmtCurrency(totalValue)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 51, 84] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    if (paymentCondition) doc.text(`Condição de Pagamento: ${paymentCondition}`, 14, finalY);
    if (deliveryDeadline) doc.text(`Prazo de Entrega: ${deliveryDeadline}`, 14, finalY + 6);
    if (observations) doc.text(`Observações: ${observations}`, 14, finalY + 12);
    doc.save(`Pedido_${groupCode}_${winner.supplier.name}.pdf`);
  };

  const exportExcel = () => {
    const wsData = [
      ["PEDIDO DE COMPRA"], [],
      ["Cotação", groupCode], ["Data", date], ["Fornecedor", winner.supplier.name], ["Obra", obraName || "—"], [],
      ["Cód.", "Descrição", "Ud", "Qtd", "Preço Unit.", "Total"],
      ...orderItems.map((i) => [i.code, i.description, i.unit, i.quantity, i.unitPrice, i.total]),
      [], ["", "", "", "", "TOTAL:", totalValue], [],
      ["Condição de Pagamento", paymentCondition], ["Prazo de Entrega", deliveryDeadline], ["Observações", observations],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedido");
    XLSX.writeFile(wb, `Pedido_${groupCode}_${winner.supplier.name}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🧾 Gerar Pedido de Compra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div><span className="text-muted-foreground">Cotação:</span> <strong>{groupCode}</strong></div>
            <div><span className="text-muted-foreground">Data:</span> <strong>{date}</strong></div>
            <div><span className="text-muted-foreground">Fornecedor Vencedor:</span> <strong className="text-savings">{winner.supplier.name}</strong></div>
            <div><span className="text-muted-foreground">Obra:</span> <strong>{obraName || "—"}</strong></div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Cód.</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Descrição</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">Ud</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">Qtd</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">Preço Unit.</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.code} className="border-b border-border">
                    <td className="px-2 py-1">{item.code}</td>
                    <td className="px-2 py-1">{item.description}</td>
                    <td className="px-2 py-1 text-center">{item.unit}</td>
                    <td className="px-2 py-1 text-right">{item.quantity.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right">{fmtCurrency(item.unitPrice)}</td>
                    <td className="px-2 py-1 text-right font-medium">{fmtCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold">
                  <td colSpan={5} className="px-2 py-1.5 text-right text-xs">TOTAL:</td>
                  <td className="px-2 py-1.5 text-right text-xs text-savings">{fmtCurrency(totalValue)}</td>
                </tr>
              </tfoot>
            </table>
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
            <Button onClick={exportPDF} className="flex-1 gap-2">
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button onClick={exportExcel} variant="outline" className="flex-1 gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
