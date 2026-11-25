import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type BaseReceipt = { name: string; date: string; amount: number; pixId: string; document: string };
type Receipt = BaseReceipt & (
  | { type: 'advance' | 'meal' }
  | { type: 'daily'; periodStart: string; periodEnd: string; days: string[]; dayRate: number }
);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const normalized = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const validDate = (value: string) => datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

function parseReceipts(value: unknown): Receipt[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('O arquivo deve conter uma lista de comprovantes.');
  const ids = new Set<string>();
  return value.map((item, index) => {
    const row = item as Partial<Receipt>;
    if (!row || typeof row !== 'object' || !['advance', 'meal', 'daily'].includes(row.type || '') ||
        typeof row.name !== 'string' || !row.name.trim() || !validDate(row.date || '') ||
        typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0 ||
        typeof row.pixId !== 'string' || !row.pixId.trim() || typeof row.document !== 'string' || !row.document.trim()) {
      throw new Error(`Comprovante ${index + 1} incompleto ou inválido.`);
    }
    if (ids.has(row.pixId)) throw new Error(`ID Pix repetido no arquivo: ${row.pixId}`);
    ids.add(row.pixId);
    if (row.type === 'daily' && (!validDate(row.periodStart || '') || !validDate(row.periodEnd || '') ||
        row.periodEnd! < row.periodStart! || !Array.isArray(row.days) || row.days.length === 0 ||
        row.days.some(day => typeof day !== 'string' || !validDate(day) || day < row.periodStart! || day > row.periodEnd!) ||
        typeof row.dayRate !== 'number' || row.dayRate <= 0 ||
        Math.round(row.dayRate * row.days.length * 100) !== Math.round(row.amount * 100))) {
      throw new Error(`Diárias do comprovante ${index + 1} não conferem com o pagamento.`);
    }
    return row as Receipt;
  });
}

export default function ReceiptImport({ employees }: { employees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [busy, setBusy] = useState(false);

  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      setReceipts(parseReceipts(JSON.parse(await file.text())));
    } catch (error) {
      setReceipts([]);
      toast.error(error instanceof Error ? error.message : 'Arquivo inválido.');
    }
  };

  const importReceipts = async () => {
    setBusy(true);
    let added = 0;
    let skipped = 0;
    try {
      for (const receipt of receipts) {
        if (receipt.type === 'daily') {
          const { data: matches, error: readError } = await supabase.from('daily_worker_settlements')
            .select('id').ilike('notes', `%${receipt.pixId}%`).limit(1);
          if (readError) throw readError;
          if (matches?.length) { skipped++; continue; }
          const { error } = await supabase.from('daily_worker_settlements').insert({
            worker_name: receipt.name,
            period_start: receipt.periodStart,
            period_end: receipt.periodEnd,
            work_days: receipt.days.map(date => ({ date, amount: receipt.dayRate, note: 'Horas não informadas' })),
            labor_amount: receipt.amount,
            meal_amount: 0,
            carry_advance: 0,
            payments: [{ date: receipt.date, amount: receipt.amount, kind: 'Saldo', note: `Pix ${receipt.pixId}; documento BB ${receipt.document}` }],
            notes: `Pagamento conforme comprovante BB ${receipt.document}; Pix ${receipt.pixId}. Horas não informadas.`,
          });
          if (error) throw error;
        } else {
          const candidates = employees.filter(employee => normalized(employee.name) === normalized(receipt.name));
          if (candidates.length !== 1) throw new Error(`Colaborador não encontrado de forma única: ${receipt.name}`);
          const employee = candidates[0];
          const { data: matches, error: readError } = await supabase.from('salary_advances')
            .select('id').eq('employee_id', employee.id).ilike('notes', `%${receipt.pixId}%`).limit(1);
          if (readError) throw readError;
          if (matches?.length) { skipped++; continue; }
          const prefix = receipt.type === 'meal' ? 'Alimentação' : 'Adiantamento salarial';
          const { error } = await supabase.from('salary_advances').insert({
            employee_id: employee.id,
            month: receipt.date.slice(0, 7),
            payment_date: receipt.date,
            value: receipt.amount,
            notes: `${prefix}: comprovante BB ${receipt.document}; Pix ${receipt.pixId}`,
          });
          if (error) throw error;
        }
        added++;
      }
      toast.success(`${added} lançamento(s) importado(s); ${skipped} já existente(s).`);
      setOpen(false);
      setReceipts([]);
      if (added) window.location.reload();
    } catch (error) {
      toast.error(`Importação interrompida após ${added} lançamento(s): ${error instanceof Error ? error.message : 'erro no banco'}`);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><FileUp className="mr-2 h-4 w-4" />Importar comprovantes</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Importar comprovantes</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Selecione um arquivo JSON local. IDs Pix já registrados serão ignorados.</p>
      <input aria-label="Arquivo de comprovantes" type="file" accept="application/json,.json" onChange={event => void readFile(event.target.files?.[0])} />
      {receipts.length > 0 && <div className="max-h-60 overflow-y-auto text-sm space-y-1">{receipts.map(receipt => <p key={receipt.pixId}>{receipt.name} · {receipt.date} · R$ {receipt.amount.toFixed(2)} · {receipt.type}</p>)}</div>}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={busy || receipts.length === 0} onClick={() => void importReceipts()}>{busy ? 'Importando...' : 'Confirmar importação'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}
