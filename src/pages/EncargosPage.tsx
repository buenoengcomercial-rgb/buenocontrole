import React, { useState, useMemo } from 'react';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, CheckCircle2, Clock, Paperclip, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';
import type { CompanyCharge, ChargeType } from '@/types/safety';

const PAYER_CNPJ = '39973085000120';
const categories = {
  trabalhistas: { label: 'Encargos trabalhistas', types: ['INSS', 'FGTS'] as ChargeType[] },
  federais: { label: 'Tributos federais', types: ['PIS', 'COFINS', 'IRPJ', 'CSLL'] as ChargeType[] },
  municipais: { label: 'Tributos municipais', types: ['ISSQN'] as ChargeType[] },
};
type Category = keyof typeof categories;

export default function EncargosPage() {
  const { charges, addCharge, updateCharge, deleteCharge } = useSafetyData();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState<'all' | ChargeType>('all');
  const [category, setCategory] = useState<Category>('trabalhistas');
  const [attachOpenId, setAttachOpenId] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    chargeType: 'INSS' as ChargeType,
    month: currentMonth,
    value: 0,
    dueDate: '',
    paid: false,
    paymentDate: '',
    notes: '',
    payerCnpj: PAYER_CNPJ,
    source: 'Manual',
    sourceDocumentId: '',
    documentNumber: '',
    documentUrl: '',
    documentHash: '',
    verificationStatus: 'A confirmar',
  });

  const filtered = useMemo(() =>
    charges
      .filter(c => c.month.startsWith(filterYear))
      .filter(c => c.payerCnpj.replace(/\D/g, '') === PAYER_CNPJ)
      .filter(c => categories[category].types.includes(c.chargeType))
      .filter(c => filterType === 'all' || c.chargeType === filterType)
      .sort((a, b) => b.month.localeCompare(a.month) || a.chargeType.localeCompare(b.chargeType)),
    [charges, filterYear, filterType, category]
  );

  const handleOpen = (c?: CompanyCharge) => {
    if (c) {
      setEditId(c.id);
      setForm({ chargeType: c.chargeType, month: c.month, value: c.value, dueDate: c.dueDate, paid: c.paid, paymentDate: c.paymentDate, notes: c.notes, payerCnpj: c.payerCnpj, source: c.source, sourceDocumentId: c.sourceDocumentId, documentNumber: c.documentNumber, documentUrl: c.documentUrl, documentHash: c.documentHash, verificationStatus: c.verificationStatus });
    } else {
      setEditId(null);
      setForm({ chargeType: categories[category].types[0], month: currentMonth, value: 0, dueDate: '', paid: false, paymentDate: '', notes: '', payerCnpj: PAYER_CNPJ, source: 'Manual', sourceDocumentId: '', documentNumber: '', documentUrl: '', documentHash: '', verificationStatus: 'A confirmar' });
    }
    setOpen(true);
  };

  const handleMonthChange = (month: string) => {
    setForm(prev => ({ ...prev, month }));
  };

  const handleSubmit = async () => {
    if (!form.month || !form.dueDate) { toast.error('Preencha mês e data de vencimento.'); return; }
    if (form.value <= 0) { toast.error('Informe o valor do imposto.'); return; }
    if (form.paid && !form.paymentDate) { toast.error('Informe a data do pagamento comprovado.'); return; }
    if (form.source === 'Nibo Empresa' && (form.verificationStatus === 'Guia conferida' || form.paid) && !form.sourceDocumentId.trim()) { toast.error('Informe o ID do documento do Nibo para confirmar a guia ou o pagamento.'); return; }
    try {
      if (editId) {
        const existing = charges.find(c => c.id === editId)!;
        await updateCharge({ ...existing, ...form });
      } else await addCharge(form);
      toast.success('Imposto salvo.');
      setOpen(false);
    } catch (error) { toast.error(`Não foi possível salvar: ${error instanceof Error ? error.message : String(error)}`); }
  };

  const total = filtered.reduce((s, c) => s + c.value, 0);
  const openTotal = filtered.filter(c => !c.paid && c.verificationStatus !== 'Pago no Nibo; comprovante pendente').reduce((s, c) => s + c.value, 0);
  const pendingCount = filtered.filter(c => !c.paid).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Impostos</h1>
          <p className="text-sm text-muted-foreground mt-1">K. C. Bueno de Godoy Oliveira Ltda. · CNPJ 39.973.085/0001-20</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo imposto</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} imposto</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="label-caps mb-1 block">Tributo</label>
                <Select value={form.chargeType} onValueChange={(v) => setForm(f => ({ ...f, chargeType: v as ChargeType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories[category].types.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block">Mês de Referência</label>
                  <Input type="month" value={form.month} onChange={e => handleMonthChange(e.target.value)} />
                </div>
                <div>
                  <label className="label-caps mb-1 block">Vencimento da guia</label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label-caps mb-1 block">Valor (R$)</label>
                <Input type="number" min={0} step={0.01} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-caps mb-1 block">Origem</label><Select value={form.source} onValueChange={source => setForm(f => ({ ...f, source }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Manual">Manual</SelectItem><SelectItem value="Nibo Empresa">Nibo Empresa</SelectItem></SelectContent></Select></div>
                <div><label className="label-caps mb-1 block">Conferência</label><Select value={form.verificationStatus} onValueChange={verificationStatus => setForm(f => ({ ...f, verificationStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A confirmar">A confirmar</SelectItem><SelectItem value="Guia conferida">Guia conferida</SelectItem><SelectItem value="Erro de leitura">Erro de leitura</SelectItem><SelectItem value="Pago no Nibo; comprovante pendente">Pago no Nibo; comprovante pendente</SelectItem><SelectItem value="Pagamento comprovado">Pagamento comprovado</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-caps mb-1 block">Documento / referência</label><Input value={form.documentNumber} onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))} /></div>
                <div><label className="label-caps mb-1 block">ID no Nibo</label><Input value={form.sourceDocumentId} onChange={e => setForm(f => ({ ...f, sourceDocumentId: e.target.value }))} /></div>
              </div>
              <div><label className="label-caps mb-1 block">Link do documento</label><Input type="url" value={form.documentUrl} onChange={e => setForm(f => ({ ...f, documentUrl: e.target.value }))} /></div>
              <div>
                <label className="label-caps mb-1 block">Observações</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações do contador, detalhes do pagamento..." />
              </div>
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-semibold text-foreground mb-3">Controle de Pagamento</p>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} /> Pagamento comprovado
                  </label>
                  <div>
                    <label className="label-caps mb-1 block">Data Pagamento</label>
                    <Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => void handleSubmit()}>{editId ? 'Salvar' : 'Registrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Categorias de impostos">
        {(Object.entries(categories) as [Category, typeof categories[Category]][]).map(([key, value]) => <button key={key} type="button" role="tab" aria-selected={category === key} className={`rounded-md px-3 py-2 text-sm ${category === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => { setCategory(key); setFilterType('all'); }}>{value.label}</button>)}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex gap-4">
          <div>
            <label className="label-caps mb-1 block">Filtrar por Ano</label>
            <Input type="number" min={2020} max={2030} value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-32" />
          </div>
          <div>
            <label className="label-caps mb-1 block">Tipo</label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | ChargeType)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {categories[category].types.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 mt-4 sm:mt-5">
          <div className="border-l pl-4">
            <p className="text-xs text-muted-foreground">Total ({filterYear})</p>
            <p className="text-lg font-semibold">{formatCurrency(total)}</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-xs text-muted-foreground">Em aberto</p>
            <p className="text-lg font-semibold">{formatCurrency(openTotal)}</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-lg font-semibold text-warning">{pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(c => (
          <div key={c.id} className="border-b py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.chargeType === 'INSS' ? 'bg-primary/10 text-primary' : 'bg-accent/50 text-accent-foreground'}`}>
                  {c.chargeType}
                </span>
                <span className="text-sm font-medium">{c.month}</span>
                <span className="text-sm text-muted-foreground">Venc: {c.dueDate ? formatDate(c.dueDate) : '—'}</span>
                <span className="text-sm font-semibold">{formatCurrency(c.value)}</span>
                <span className="text-xs text-muted-foreground">{c.documentNumber || c.source} · {c.verificationStatus}</span>
                {c.paid
                  ? <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium"><CheckCircle2 className="w-3 h-3" />Pago</span>
                  : <span className="inline-flex items-center gap-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium"><Clock className="w-3 h-3" />{c.verificationStatus === 'Pago no Nibo; comprovante pendente' ? 'A comprovar' : 'Pendente'}</span>
                }
                {c.paymentDate && <span className="text-sm text-muted-foreground">Pgto: {formatDate(c.paymentDate)}</span>}
              </div>
              <div className="flex gap-1">
                {c.documentUrl && <a href={c.documentUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-muted" aria-label={`Abrir documento ${c.chargeType}`} title="Abrir documento no Nibo"><ExternalLink className="w-4 h-4" /></a>}
                <button onClick={() => setAttachOpenId(attachOpenId === c.id ? null : c.id)} className={`p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground ${attachOpenId === c.id ? 'bg-muted text-foreground' : ''}`} title="Anexar documento"><Paperclip className="w-4 h-4" /></button>
                <button onClick={() => handleOpen(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { if (window.confirm('Excluir este imposto do controle?')) void deleteCharge(c.id).then(() => toast.success('Imposto removido.')).catch(error => toast.error(`Não foi possível excluir: ${error.message}`)); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label={`Excluir ${c.chargeType} ${c.month}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {attachOpenId === c.id && (
              <div className="px-6 py-3 border-t border-border">
                <AttachedDocuments entityType="encargo" entityId={c.id} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-meta">
            Nenhum imposto registrado neste filtro.
          </div>
        )}
      </div>
    </div>
  );
}
