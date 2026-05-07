import { useState, useMemo } from 'react';
import { useEmployeeData } from '@/context/EmployeeContext';
import { calculateAdvance, getSalaryPaymentDate } from '@/types/employee';
import type { SalaryPayment, SalaryAdvance } from '@/types/employee';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, DollarSign, ArrowUpCircle, MessageSquare, Edit2, CreditCard, KeyRound, ChevronDown, ChevronRight, Pencil, FileText } from 'lucide-react';
import { toast } from 'sonner';
import AttachedDocuments from '@/components/AttachedDocuments';

const PAYMENT_METHODS = ['PIX', 'Transferência', 'Dinheiro', 'Boleto', 'Cheque'] as const;

export default function PaymentsPage() {
  const { employees, advances, payments, workDays, generateAdvance, addAdvanceManual, updateAdvance, addPayment, updatePayment, deleteAdvance, deletePayment } = useEmployeeData();
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

  // Advance generation
  const [advMonth, setAdvMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [advEmployee, setAdvEmployee] = useState('');
  const [advCustomValue, setAdvCustomValue] = useState<number | ''>('');
  const [advNotes, setAdvNotes] = useState('');
  const [advPayDate, setAdvPayDate] = useState('');

  const handleGenerateAdvance = () => {
    if (!advEmployee) { toast.error('Selecione um colaborador.'); return; }
    if (advCustomValue && advCustomValue > 0) {
      addAdvanceManual(advEmployee, advMonth, advCustomValue, advNotes, advPayDate || undefined);
    } else {
      const emp = activeEmployees.find(e => e.id === advEmployee);
      if (emp) addAdvanceManual(advEmployee, advMonth, calculateAdvance(emp.grossSalary), advNotes, advPayDate || undefined);
    }
    toast.success('Adiantamento gerado.');
    setAdvCustomValue('');
    setAdvNotes('');
    setAdvPayDate('');
  };

  const handleGenerateAllAdvances = () => {
    let count = 0;
    activeEmployees.forEach(emp => {
      const exists = advances.find(a => a.employeeId === emp.id && a.month === advMonth);
      if (!exists) { generateAdvance(emp.id, advMonth); count++; }
    });
    toast.success(`${count} adiantamentos gerados.`);
  };

  // Salary payment form
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    employeeId: '', month: '', inssDiscount: 0, absenceDiscount: 0, otherDiscounts: 0, otherAdditions: 0,
    paidValue: '' as number | '', paymentDate: '', paymentMethod: 'PIX', notes: '',
  });

  // Edit payment
  const [editOpen, setEditOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<SalaryPayment | null>(null);

  const selectedEmp = useMemo(() => employees.find(e => e.id === payForm.employeeId), [payForm.employeeId, employees]);

  // Calculate absence days for selected employee/month
  const absenceDays = useMemo(() => {
    if (!payForm.employeeId || !payForm.month) return 0;
    return workDays.filter(w => w.employeeId === payForm.employeeId && w.date.startsWith(payForm.month) && !w.worked).length;
  }, [payForm.employeeId, payForm.month, workDays]);

  const payPreview = useMemo(() => {
    if (!selectedEmp || !payForm.month) return null;
    const empAdvances = advances.filter(a => a.employeeId === payForm.employeeId && a.month === payForm.month);
    const totalAdvances = empAdvances.reduce((s, a) => s + a.value, 0);
    const totalDiscounts = payForm.inssDiscount + payForm.absenceDiscount + payForm.otherDiscounts;
    const netSalary = selectedEmp.grossSalary - totalAdvances - totalDiscounts + payForm.otherAdditions;
    const [y, m] = payForm.month.split('-').map(Number);
    const defaultDate = getSalaryPaymentDate(y, m + 1).toISOString().slice(0, 10);
    return { grossSalary: selectedEmp.grossSalary, totalAdvances, totalDiscounts, netSalary, defaultDate };
  }, [payForm, selectedEmp, advances]);

  const handlePayment = () => {
    if (!payPreview || !payForm.employeeId) return;
    const exists = payments.find(p => p.employeeId === payForm.employeeId && p.month === payForm.month);
    if (exists) { toast.error('Pagamento já registrado para este mês.'); return; }
    const paidValue = payForm.paidValue !== '' ? Number(payForm.paidValue) : payPreview.netSalary;
    addPayment({
      employeeId: payForm.employeeId,
      month: payForm.month,
      grossSalary: payPreview.grossSalary,
      advanceDiscount: payPreview.totalAdvances,
      otherDiscounts: payForm.inssDiscount + payForm.absenceDiscount + payForm.otherDiscounts,
      otherAdditions: payForm.otherAdditions,
      netSalary: paidValue,
      paymentDate: payForm.paymentDate || payPreview.defaultDate,
      paymentMethod: payForm.paymentMethod,
      notes: payForm.notes,
    });
    toast.success('Pagamento registrado.');
    setPayOpen(false);
    resetPayForm();
  };

  const resetPayForm = () => setPayForm({ employeeId: '', month: '', inssDiscount: 0, absenceDiscount: 0, otherDiscounts: 0, otherAdditions: 0, paidValue: '', paymentDate: '', paymentMethod: 'PIX', notes: '' });

  const openEdit = (p: SalaryPayment) => {
    setEditPayment({ ...p });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editPayment) return;
    updatePayment(editPayment);
    toast.success('Pagamento atualizado.');
    setEditOpen(false);
  };

  // Filter
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const filteredAdvances = useMemo(() => advances.filter(a => a.month === filterMonth).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)), [advances, filterMonth]);
  const filteredPayments = useMemo(() => payments.filter(p => p.month === filterMonth).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)), [payments, filterMonth]);

  // Expand advance details (now grouped by employee)
  const [expandedAdvance, setExpandedAdvance] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  // Edit advance
  const [editAdvOpen, setEditAdvOpen] = useState(false);
  const [editAdvance, setEditAdvance] = useState<SalaryAdvance | null>(null);

  const handleSaveAdvanceEdit = () => {
    if (!editAdvance) return;
    updateAdvance(editAdvance);
    toast.success('Adiantamento atualizado.');
    setEditAdvOpen(false);
  };

  return (
    <div className="space-y-6">
      <h1>Pagamentos</h1>

      <Tabs defaultValue="salaries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="salaries" className="gap-2"><DollarSign className="w-4 h-4" />Salários</TabsTrigger>
          <TabsTrigger value="advances" className="gap-2"><ArrowUpCircle className="w-4 h-4" />Adiantamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="salaries" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Dialog open={payOpen} onOpenChange={(open) => { setPayOpen(open); if (!open) resetPayForm(); }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Registrar Pagamento</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Registrar Pagamento de Salário</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-caps mb-1 block">Colaborador</label>
                      <Select value={payForm.employeeId} onValueChange={v => setPayForm(f => ({ ...f, employeeId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="label-caps mb-1 block">Mês Referência</label><Input type="month" value={payForm.month} onChange={e => setPayForm(f => ({ ...f, month: e.target.value }))} /></div>
                  </div>

                  {/* PIX info */}
                  {selectedEmp && selectedEmp.pixKey && (
                    <div className="bg-accent/30 rounded-lg p-3 flex items-start gap-3">
                      <KeyRound className="w-4 h-4 mt-0.5 text-primary" />
                      <div className="text-sm">
                        <p className="font-medium">{selectedEmp.name}</p>
                        <p className="text-muted-foreground">PIX ({selectedEmp.pixKeyType}): <span className="font-mono font-medium text-foreground">{selectedEmp.pixKey}</span></p>
                      </div>
                    </div>
                  )}

                  {/* Discounts */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label-caps mb-1 block">Desconto INSS</label>
                      <Input type="number" min={0} step={0.01} value={payForm.inssDiscount || ''} onChange={e => setPayForm(f => ({ ...f, inssDiscount: Number(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="label-caps mb-1 block">Desc. Faltas {absenceDays > 0 && <span className="text-destructive">({absenceDays}d)</span>}</label>
                      <Input type="number" min={0} step={0.01} value={payForm.absenceDiscount || ''} onChange={e => setPayForm(f => ({ ...f, absenceDiscount: Number(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="label-caps mb-1 block">Outros Descontos</label>
                      <Input type="number" min={0} step={0.01} value={payForm.otherDiscounts || ''} onChange={e => setPayForm(f => ({ ...f, otherDiscounts: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>

                  <div>
                    <label className="label-caps mb-1 block">Outros Adicionais</label>
                    <Input type="number" min={0} step={0.01} value={payForm.otherAdditions || ''} onChange={e => setPayForm(f => ({ ...f, otherAdditions: Number(e.target.value) || 0 }))} />
                  </div>

                  {/* Summary */}
                  {payPreview && (
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span>Salário Bruto</span><strong>{formatCurrency(payPreview.grossSalary)}</strong></div>
                      <div className="flex justify-between text-destructive"><span>(-) Adiantamentos</span><strong>{formatCurrency(payPreview.totalAdvances)}</strong></div>
                      {payForm.inssDiscount > 0 && <div className="flex justify-between text-destructive"><span>(-) INSS</span><strong>{formatCurrency(payForm.inssDiscount)}</strong></div>}
                      {payForm.absenceDiscount > 0 && <div className="flex justify-between text-destructive"><span>(-) Faltas</span><strong>{formatCurrency(payForm.absenceDiscount)}</strong></div>}
                      {payForm.otherDiscounts > 0 && <div className="flex justify-between text-destructive"><span>(-) Outros descontos</span><strong>{formatCurrency(payForm.otherDiscounts)}</strong></div>}
                      {payForm.otherAdditions > 0 && <div className="flex justify-between text-success"><span>(+) Adicionais</span><strong>{formatCurrency(payForm.otherAdditions)}</strong></div>}
                      <div className="border-t border-border pt-2 flex justify-between text-base font-semibold">
                        <span>Valor a Pagar (calculado)</span>
                        <span className={payPreview.netSalary < 0 ? 'text-destructive' : ''}>{formatCurrency(payPreview.netSalary)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-caps mb-1 block">Valor Pago (já com adiantamento descontado)</label>
                      <Input type="number" min={0} step={0.01} value={payForm.paidValue !== '' ? payForm.paidValue : (payPreview ? payPreview.netSalary.toFixed(2) : '')} onChange={e => setPayForm(f => ({ ...f, paidValue: e.target.value ? Number(e.target.value) : '' }))} placeholder={payPreview ? formatCurrency(payPreview.netSalary) : '0,00'} />
                    </div>
                    <div>
                      <label className="label-caps mb-1 block">Data do Pagamento</label>
                      <Input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <label className="label-caps mb-1 block">Forma de Pagamento</label>
                    <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="label-caps mb-1 block">Observação</label>
                    <Textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais sobre o pagamento..." className="min-h-[60px]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
                  <Button onClick={handlePayment} disabled={!payPreview}>Confirmar Pagamento</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div><label className="label-caps mb-1 block">Filtrar por mês</label><Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" /></div>


          {/* Payments list as expandable cards */}
          <div className="space-y-3">
            {filteredPayments.map(p => {
              const emp = employees.find(e => e.id === p.employeeId);
              const isExpanded = expandedPayment === p.id;
              return (
                <div key={p.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-row-hover transition-colors" onClick={() => setExpandedPayment(isExpanded ? null : p.id)}>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{emp?.name || '—'}</span>
                      <span className="text-xs text-muted-foreground">{p.month}</span>
                      {p.paymentMethod && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{p.paymentMethod}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase">Total</span>
                        <span className="text-sm font-semibold">{formatCurrency(p.advanceDiscount + ((p.grossSalary + p.otherAdditions) - (p.advanceDiscount + p.otherDiscounts)))}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</span>
                      {p.notes && <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />}
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deletePayment(p.id); toast.success('Removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-6 pb-4 space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><span className="label-caps text-xs block">Bruto</span><span>{formatCurrency(p.grossSalary)}</span></div>
                        <div><span className="label-caps text-xs block">Adiantamento</span><span className="text-destructive">{formatCurrency(p.advanceDiscount)}</span></div>
                        <div><span className="label-caps text-xs block">Descontos</span><span className="text-destructive">{formatCurrency(p.otherDiscounts)}</span></div>
                        <div><span className="label-caps text-xs block">Adicionais</span><span>{formatCurrency(p.otherAdditions)}</span></div>
                      </div>
                      {emp?.pixKey && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <KeyRound className="w-3.5 h-3.5" />
                          PIX ({emp.pixKeyType}): <span className="font-mono font-medium text-foreground">{emp.pixKey}</span>
                        </div>
                      )}
                      {p.notes && (
                        <div>
                          <span className="label-caps text-xs">Observação</span>
                          <p className="text-sm text-muted-foreground mt-1">{p.notes}</p>
                        </div>
                      )}
                      <AttachedDocuments entityType="salary_payment" entityId={p.id} />
                    </div>
                  )}
                </div>
              );
            })}
            {filteredPayments.length === 0 && (
              <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-meta">Nenhum pagamento encontrado.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="advances" className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div><label className="label-caps mb-1 block">Mês</label><Input type="month" value={advMonth} onChange={e => setAdvMonth(e.target.value)} className="w-[200px]" /></div>
              <div className="flex-1 min-w-[200px]">
                <label className="label-caps mb-1 block">Colaborador</label>
                <Select value={advEmployee} onValueChange={setAdvEmployee}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-caps mb-1 block">Valor (vazio = 40%)</label>
                <Input type="number" min={0} step={0.01} value={advCustomValue} onChange={e => setAdvCustomValue(e.target.value ? Number(e.target.value) : '')} placeholder="Automático 40%" className="w-[180px]" />
              </div>
              <div>
                <label className="label-caps mb-1 block">Data do Pagamento</label>
                <Input type="date" value={advPayDate} onChange={e => setAdvPayDate(e.target.value)} className="w-[180px]" />
              </div>
            </div>
            {(() => {
              const selEmp = activeEmployees.find(e => e.id === advEmployee);
              if (!selEmp || !selEmp.pixKey) return null;
              return (
                <div className="bg-accent/30 rounded-lg p-3 flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className="text-sm">PIX ({selEmp.pixKeyType}): <span className="font-mono font-medium text-foreground">{selEmp.pixKey}</span></span>
                </div>
              );
            })()}
            <div>
              <label className="label-caps mb-1 block">Observações</label>
              <Textarea value={advNotes} onChange={e => setAdvNotes(e.target.value)} placeholder="Motivo, referência do pagamento, ajustes..." className="min-h-[60px]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerateAdvance}>Gerar Adiantamento</Button>
              <Button variant="outline" onClick={handleGenerateAllAdvances}>Gerar Todos (40%)</Button>
              <Button variant="outline" onClick={() => {
                const rows = filteredAdvances
                  .map(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    return { name: emp?.name || '—', date: a.paymentDate, value: a.value, notes: a.notes || '' };
                  })
                  .sort((a, b) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date));
                if (!rows.length) { toast.error('Nenhum adiantamento para exportar.'); return; }
                const lines = ['Colaborador;Data;Valor;Observações'];
                rows.forEach(r => lines.push(`${r.name};${formatDate(r.date)};${formatCurrency(r.value)};${r.notes}`));
                const total = rows.reduce((s, r) => s + r.value, 0);
                lines.push('');
                lines.push(`Total;;${formatCurrency(total)};`);
                const bom = '\uFEFF';
                const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `adiantamentos_${filterMonth}.csv`; a.click();
                URL.revokeObjectURL(url);
                toast.success('Relatório exportado.');
              }}>
                <FileText className="w-4 h-4 mr-1" /> Relatório
              </Button>
            </div>
          </div>

          <div><label className="label-caps mb-1 block">Filtrar por mês</label><Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="max-w-[200px]" /></div>

          {/* Grouped by employee */}
          <div className="space-y-3">
            {(() => {
              const grouped = filteredAdvances.reduce<Record<string, typeof filteredAdvances>>((acc, a) => {
                if (!acc[a.employeeId]) acc[a.employeeId] = [];
                acc[a.employeeId].push(a);
                return acc;
              }, {});

              const entries = Object.entries(grouped).map(([empId, advs]) => {
                const emp = employees.find(e => e.id === empId);
                const total = advs.reduce((s, a) => s + a.value, 0);
                return { empId, emp, advs, total };
              }).sort((a, b) => (a.emp?.name || '').localeCompare(b.emp?.name || ''));

              if (entries.length === 0) {
                return <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-meta">Nenhum adiantamento encontrado.</div>;
              }

              return entries.map(({ empId, emp, advs, total }) => {
                const isExpanded = expandedAdvance === empId;
                return (
                  <div key={empId} className="bg-card rounded-xl shadow-card overflow-hidden">
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-row-hover transition-colors"
                      onClick={() => setExpandedAdvance(isExpanded ? null : empId)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">{emp?.name || '—'}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{advs.length} registro{advs.length > 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border">
                        {advs.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)).map(a => (
                          <div key={a.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors border-b border-border last:border-b-0">
                            <div className="flex items-center gap-4">
                              <span className="text-sm">{formatCurrency(a.value)}</span>
                              <span className="text-xs text-muted-foreground">Pagamento: {formatDate(a.paymentDate)}</span>
                              <span className="text-xs text-muted-foreground">Cadastro: {new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
                              {a.notes && (
                                <span className="text-xs text-muted-foreground italic border-l border-border pl-3 max-w-[400px] truncate" title={a.notes}>
                                  {a.notes}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditAdvance({ ...a }); setEditAdvOpen(true); }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteAdvance(a.id); toast.success('Removido.'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Payment Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Pagamento</DialogTitle></DialogHeader>
          {editPayment && (() => {
            const emp = employees.find(e => e.id === editPayment.employeeId);
            return (
              <div className="grid gap-4 py-4">
                <div className="text-sm font-medium">{emp?.name}</div>
                <div>
                  <label className="label-caps mb-1 block">Mês de Referência</label>
                  <Input type="month" value={editPayment.month} onChange={e => setEditPayment(p => p ? { ...p, month: e.target.value } : p)} className="max-w-[200px]" />
                </div>
                {emp?.pixKey && (
                  <div className="bg-accent/30 rounded-lg p-3 flex items-start gap-3 text-sm">
                    <KeyRound className="w-4 h-4 mt-0.5 text-primary" />
                    <span>PIX ({emp.pixKeyType}): <span className="font-mono font-medium">{emp.pixKey}</span></span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps mb-1 block">Valor Pago</label>
                    <Input type="number" min={0} step={0.01} value={editPayment.netSalary} onChange={e => setEditPayment(p => p ? { ...p, netSalary: Number(e.target.value) } : p)} />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Data do Pagamento</label>
                    <Input type="date" value={editPayment.paymentDate} onChange={e => setEditPayment(p => p ? { ...p, paymentDate: e.target.value } : p)} />
                  </div>
                </div>
                <div>
                  <label className="label-caps mb-1 block">Forma de Pagamento</label>
                  <Select value={editPayment.paymentMethod || 'PIX'} onValueChange={v => setEditPayment(p => p ? { ...p, paymentMethod: v } : p)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="label-caps mb-1 block">Observação</label>
                  <Textarea value={editPayment.notes} onChange={e => setEditPayment(p => p ? { ...p, notes: e.target.value } : p)} className="min-h-[60px]" />
                </div>
                <AttachedDocuments entityType="salary_payment" entityId={editPayment.id} />
              </div>
            );
          })()}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Advance Dialog */}
      <Dialog open={editAdvOpen} onOpenChange={setEditAdvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Adiantamento</DialogTitle></DialogHeader>
          {editAdvance && (() => {
            const emp = employees.find(e => e.id === editAdvance.employeeId);
            return (
              <div className="grid gap-4 py-4">
                <div className="text-sm font-medium">{emp?.name}</div>
                <div>
                  <label className="label-caps mb-1 block">Mês de Referência</label>
                  <Input type="month" value={editAdvance.month} onChange={e => setEditAdvance(a => a ? { ...a, month: e.target.value } : a)} className="max-w-[200px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps mb-1 block">Valor</label>
                    <Input type="number" min={0} step={0.01} value={editAdvance.value} onChange={e => setEditAdvance(a => a ? { ...a, value: Number(e.target.value) || 0 } : a)} />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Data do Pagamento</label>
                    <Input type="date" value={editAdvance.paymentDate} onChange={e => setEditAdvance(a => a ? { ...a, paymentDate: e.target.value } : a)} />
                  </div>
                </div>
                <div>
                  <label className="label-caps mb-1 block">Observações</label>
                  <Textarea value={editAdvance.notes} onChange={e => setEditAdvance(a => a ? { ...a, notes: e.target.value } : a)} className="min-h-[60px]" />
                </div>
              </div>
            );
          })()}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditAdvOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdvanceEdit}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
