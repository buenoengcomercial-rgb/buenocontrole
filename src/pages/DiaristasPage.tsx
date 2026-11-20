import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Settlement = Tables<'daily_worker_settlements'>;
type WorkDay = { date: string; hours: number; amount?: number; mealTaken?: boolean; note: string };
type Payment = { date: string | null; amount: number; kind: string; note: string };
type Draft = {
  id?: string;
  workerName: string;
  periodStart: string;
  periodEnd: string;
  workDays: WorkDay[];
  laborAmount: number;
  mealAmount: number;
  carryAdvance: number;
  payments: Payment[];
  notes: string;
};

const emptyDraft = (): Draft => ({ workerName: '', periodStart: '', periodEnd: '', workDays: [], laborAmount: 0, mealAmount: 0, carryAdvance: 0, payments: [], notes: '' });
const money = (value: number) => Math.round((Number(value) || 0) * 100);
const amountDue = (item: Draft) => money(item.laborAmount) + money(item.mealAmount) + money(item.carryAdvance);
const amountPaid = (item: Draft) => item.payments.reduce((sum, payment) => sum + money(payment.amount), 0);
const workDaysOf = (value: unknown): WorkDay[] => Array.isArray(value) ? value.filter(day => day && typeof day === 'object').map(day => ({ date: String(day.date || ''), hours: Number(day.hours || 0), amount: day.amount == null ? undefined : Number(day.amount), mealTaken: typeof day.mealTaken === 'boolean' ? day.mealTaken : undefined, note: String(day.note || '') })) : [];
const paymentsOf = (value: unknown): Payment[] => Array.isArray(value) ? value.filter(payment => payment && typeof payment === 'object').map(payment => ({ date: payment.date || null, amount: Number(payment.amount || 0), kind: String(payment.kind || 'Saldo'), note: String(payment.note || '') })) : [];
const asDraft = (row: Settlement): Draft => ({ id: row.id, workerName: row.worker_name, periodStart: row.period_start, periodEnd: row.period_end, workDays: workDaysOf(row.work_days), laborAmount: Number(row.labor_amount), mealAmount: Number(row.meal_amount), carryAdvance: Number(row.carry_advance), payments: paymentsOf(row.payments), notes: row.notes });

function status(item: Draft) {
  const due = amountDue(item);
  const paid = amountPaid(item);
  if (!paid) return 'Pagamento a confirmar';
  if (paid < due) return 'Pagamento parcial';
  if (paid > due) return 'Pago acima do apurado';
  if (item.payments.some(payment => !payment.date)) return 'Pago; data pendente';
  return 'Pago (informado)';
}

export default function DiaristasPage() {
  const [rows, setRows] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; });
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Settlement | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const result: Settlement[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from('daily_worker_settlements').select('*').order('period_start', { ascending: false }).range(offset, offset + 999);
      if (error) { toast.error(`Não foi possível carregar Diaristas: ${error.message}`); setLoading(false); return; }
      result.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    setRows(result);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const visible = useMemo(() => rows.filter(row => (!month || row.period_start.slice(0, 7) === month) && (!search || row.worker_name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))), [rows, month, search]);
  const due = visible.reduce((sum, row) => sum + amountDue(asDraft(row)), 0);
  const paid = visible.reduce((sum, row) => sum + amountPaid(asDraft(row)), 0);

  const save = async () => {
    if (!draft) return;
    if (!draft.workerName.trim() || !draft.periodStart || !draft.periodEnd || draft.periodEnd < draft.periodStart) { toast.error('Confira nome e período.'); return; }
    if ([draft.laborAmount, draft.mealAmount, draft.carryAdvance].some(value => !Number.isFinite(value) || value < 0)) { toast.error('Valores apurados devem ser positivos.'); return; }
    if (draft.workDays.some(day => !day.date || day.date < draft.periodStart || day.date > draft.periodEnd || !Number.isFinite(day.hours) || day.hours < 0 || (day.amount != null && (!Number.isFinite(day.amount) || day.amount < 0)))) { toast.error('Confira datas, horas e valores diários.'); return; }
    if (draft.payments.some(payment => !Number.isFinite(payment.amount) || payment.amount <= 0)) { toast.error('Confira os valores dos pagamentos.'); return; }
    const duplicateDays = new Set(draft.workDays.map(day => day.date));
    if (duplicateDays.size !== draft.workDays.length) { toast.error('Há dias repetidos no período.'); return; }
    setSaving(true);
    const values = { worker_name: draft.workerName.trim(), period_start: draft.periodStart, period_end: draft.periodEnd, work_days: draft.workDays, labor_amount: draft.laborAmount, meal_amount: draft.mealAmount, carry_advance: draft.carryAdvance, payments: draft.payments, notes: draft.notes, updated_at: new Date().toISOString() };
    const { error } = draft.id ? await supabase.from('daily_worker_settlements').update(values).eq('id', draft.id) : await supabase.from('daily_worker_settlements').insert(values);
    setSaving(false);
    if (error) { toast.error(`Não foi possível salvar: ${error.message}`); return; }
    setDraft(null);
    toast.success('Apuração salva.');
    void reload();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('daily_worker_settlements').delete().eq('id', deleting.id);
    if (error) toast.error(`Não foi possível excluir: ${error.message}`);
    else { toast.success('Apuração excluída.'); void reload(); }
    setDeleting(null);
  };

  const patchDay = (index: number, patch: Partial<WorkDay>) => setDraft(current => current && ({ ...current, workDays: current.workDays.map((day, i) => i === index ? { ...day, ...patch } : day) }));
  const patchPayment = (index: number, patch: Partial<Payment>) => setDraft(current => current && ({ ...current, payments: current.payments.map((payment, i) => i === index ? { ...payment, ...patch } : payment) }));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Diárias</h2><Button onClick={() => setDraft(emptyDraft())}><Plus className="w-4 h-4 mr-2" />Nova apuração</Button></div>
    <div className="flex flex-wrap gap-3"><Input type="month" aria-label="Filtrar por mês" className="w-48" value={month} onChange={event => setMonth(event.target.value)} /><Input aria-label="Buscar diarista" placeholder="Buscar diarista" className="w-60" value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y py-4 text-sm"><div><span className="text-muted-foreground">Total a conciliar</span><strong className="block text-lg">{formatCurrency(due / 100)}</strong></div><div><span className="text-muted-foreground">Pagamentos informados</span><strong className="block text-lg">{formatCurrency(paid / 100)}</strong></div><div><span className="text-muted-foreground">Diferença</span><strong className="block text-lg">{formatCurrency((due - paid) / 100)}</strong></div></div>
    {loading ? <p className="text-muted-foreground">Carregando...</p> : visible.length === 0 ? <p className="text-muted-foreground">Nenhuma apuração encontrada.</p> : <div className="border rounded-md divide-y bg-background">{visible.map(row => {
      const item = asDraft(row);
      return <div key={row.id}>
        <div className="flex flex-wrap items-center gap-3 p-4"><button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(expanded === row.id ? null : row.id)} aria-expanded={expanded === row.id}>{expanded === row.id ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}<span><strong className="block">{row.worker_name}</strong><small className="text-muted-foreground">{formatDate(row.period_start)} a {formatDate(row.period_end)}</small></span></button><span className="text-sm text-muted-foreground">{status(item)}</span><strong className="min-w-24 text-right">{formatCurrency(amountDue(item) / 100)}</strong><Button size="sm" variant="outline" onClick={() => setDraft(item)}>Editar</Button><Button size="icon" variant="ghost" title="Excluir apuração" aria-label={`Excluir apuração de ${row.worker_name}`} onClick={() => setDeleting(row)}><Trash2 className="w-4 h-4" /></Button></div>
        {expanded === row.id && <div className="border-t px-4 pb-4 pt-3 space-y-3 text-sm"><div className="flex flex-wrap gap-x-6 gap-y-1"><span>Diárias: {formatCurrency(item.laborAmount)}</span><span>Marmitas: {formatCurrency(item.mealAmount)}</span><span>Adiantamento adicional: {formatCurrency(item.carryAdvance)}</span><span>Pago: {formatCurrency(amountPaid(item) / 100)}</span></div><div><strong>Jornadas</strong><div className="mt-1 space-y-1">{item.workDays.map((day, i) => <p key={`${day.date}-${i}`}><CalendarDays className="inline w-3 h-3 mr-1" />{formatDate(day.date)} · {day.hours}h{day.amount != null ? ` · ${formatCurrency(day.amount)}` : ''}{day.mealTaken != null ? ` · marmita: ${day.mealTaken ? 'sim' : 'não'}` : ''}{day.note ? ` · ${day.note}` : ''}</p>)}</div></div><div><strong>Pagamentos</strong><div className="mt-1 space-y-1">{item.payments.length ? item.payments.map((payment, i) => <p key={i}>{payment.date ? formatDate(payment.date) : 'Data a confirmar'} · {payment.kind} · {formatCurrency(payment.amount)}{payment.note ? ` · ${payment.note}` : ''}</p>) : <p className="text-muted-foreground">Nenhum pagamento confirmado.</p>}</div></div>{item.notes && <p className="text-muted-foreground">{item.notes}</p>}</div>}
      </div>;
    })}</div>}

    <Dialog open={!!draft} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{draft?.id ? 'Editar apuração' : 'Nova apuração'}</DialogTitle></DialogHeader>{draft && <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><Label>Nome</Label><Input value={draft.workerName} onChange={e => setDraft({ ...draft, workerName: e.target.value })} /></div><div><Label>Início</Label><Input type="date" value={draft.periodStart} onChange={e => setDraft({ ...draft, periodStart: e.target.value })} /></div><div><Label>Fim</Label><Input type="date" value={draft.periodEnd} onChange={e => setDraft({ ...draft, periodEnd: e.target.value })} /></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><Label>Diárias (R$)</Label><Input type="number" min="0" step="0.01" value={draft.laborAmount} onChange={e => setDraft({ ...draft, laborAmount: Number(e.target.value) })} /></div><div><Label>Marmitas (R$)</Label><Input type="number" min="0" step="0.01" value={draft.mealAmount} onChange={e => setDraft({ ...draft, mealAmount: Number(e.target.value) })} /></div><div><Label>Adiantamento adicional (R$)</Label><Input type="number" min="0" step="0.01" value={draft.carryAdvance} onChange={e => setDraft({ ...draft, carryAdvance: Number(e.target.value) })} /></div></div>
      <section className="space-y-2"><div className="flex items-center justify-between"><h2 className="font-medium">Dias trabalhados</h2><Button type="button" size="sm" variant="outline" onClick={() => setDraft({ ...draft, workDays: [...draft.workDays, { date: draft.periodStart, hours: 0, note: '' }] })}><Plus className="w-4 h-4 mr-1" />Dia</Button></div>{draft.workDays.map((day, i) => <div key={i} className="grid grid-cols-2 sm:grid-cols-[1.2fr_.6fr_1fr_1fr_2fr_auto] gap-2 items-end"><div><Label>Data</Label><Input type="date" value={day.date} onChange={e => patchDay(i, { date: e.target.value })} /></div><div><Label>Horas</Label><Input type="number" min="0" step="0.5" value={day.hours} onChange={e => patchDay(i, { hours: Number(e.target.value) })} /></div><div><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={day.amount ?? ''} onChange={e => patchDay(i, { amount: e.target.value === '' ? undefined : Number(e.target.value) })} /></div><div><Label>Marmita</Label><select className="flex h-10 w-full rounded-md border bg-background px-2 text-sm" value={day.mealTaken == null ? '' : day.mealTaken ? 'sim' : 'nao'} onChange={e => patchDay(i, { mealTaken: e.target.value === '' ? undefined : e.target.value === 'sim' })}><option value="">Não informado</option><option value="sim">Sim</option><option value="nao">Não</option></select></div><div><Label>Observação</Label><Input value={day.note} onChange={e => patchDay(i, { note: e.target.value })} /></div><Button type="button" size="icon" variant="ghost" aria-label="Remover dia" onClick={() => setDraft({ ...draft, workDays: draft.workDays.filter((_, index) => index !== i) })}><Trash2 className="w-4 h-4" /></Button></div>)}</section>
      <section className="space-y-2"><div className="flex items-center justify-between"><h2 className="font-medium">Pagamentos e adiantamentos</h2><Button type="button" size="sm" variant="outline" onClick={() => setDraft({ ...draft, payments: [...draft.payments, { date: null, amount: 0, kind: 'Saldo', note: '' }] })}><Plus className="w-4 h-4 mr-1" />Pagamento</Button></div>{draft.payments.map((payment, i) => <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-end"><div><Label>Data</Label><Input type="date" value={payment.date || ''} onChange={e => patchPayment(i, { date: e.target.value || null })} /></div><div><Label>Valor (R$)</Label><Input type="number" min="0.01" step="0.01" value={payment.amount} onChange={e => patchPayment(i, { amount: Number(e.target.value) })} /></div><div><Label>Tipo</Label><select className="flex h-10 w-full rounded-md border bg-background px-2 text-sm" value={payment.kind} onChange={e => patchPayment(i, { kind: e.target.value })}><option>Saldo</option><option>Adiantamento</option><option>Outro</option></select></div><div><Label>Observação</Label><Input value={payment.note} onChange={e => patchPayment(i, { note: e.target.value })} /></div><Button type="button" size="icon" variant="ghost" aria-label="Remover pagamento" onClick={() => setDraft({ ...draft, payments: draft.payments.filter((_, index) => index !== i) })}><Trash2 className="w-4 h-4" /></Button></div>)}</section>
      <div><Label>Observações</Label><Textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></div><p className="text-sm text-muted-foreground">Total a conciliar: {formatCurrency(amountDue(draft) / 100)} · Pagamentos informados: {formatCurrency(amountPaid(draft) / 100)} · Diferença: {formatCurrency((amountDue(draft) - amountPaid(draft)) / 100)}</p>
    </div>}<DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button disabled={saving} onClick={() => void save()}>{saving ? 'Salvando...' : 'Salvar'}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir apuração?</AlertDialogTitle><AlertDialogDescription>Os dias e pagamentos desta apuração serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void remove()}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
