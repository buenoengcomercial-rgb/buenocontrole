import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Paperclip, AlertTriangle, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjectData } from '@/context/ProjectContext';
import AttachedDocuments from '@/components/AttachedDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/format';

type OutsourcedPayment = {
  id: string;
  outsourcedServiceId: string;
  date: string;
  value: number;
  notes: string;
};

type StatusFilter = 'todos' | 'pendente' | 'parcial' | 'pago' | 'acima';

function getStatus(total: number, paid: number): StatusFilter {
  if (paid <= 0) return 'pendente';
  if (paid > total) return 'acima';
  if (paid >= total) return 'pago';
  return 'parcial';
}

function statusLabel(status: StatusFilter) {
  const labels: Record<StatusFilter, string> = {
    todos: 'Todos',
    pendente: 'Pendente',
    parcial: 'Parcial',
    pago: 'Pago',
    acima: 'Acima do contratado',
  };
  return labels[status];
}

function statusClass(status: StatusFilter) {
  if (status === 'pago') return 'bg-green-100 text-green-700';
  if (status === 'parcial') return 'bg-orange-100 text-orange-700';
  if (status === 'acima') return 'bg-red-100 text-red-700';
  return 'bg-muted text-muted-foreground';
}

export default function OutsourcedPaymentsPage() {
  const { projects, outsourcedServices, updateOutsourcedServiceStatus } = useProjectData();
  const [payments, setPayments] = useState<Record<string, OutsourcedPayment[]>>({});
  const [activeTab, setActiveTab] = useState<'open' | 'finalized'>('open');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<Record<string, boolean>>({});
  const [paymentForms, setPaymentForms] = useState<Record<string, { date: string; value: number | ''; notes: string }>>({});
  const [projectFilter, setProjectFilter] = useState('todos');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadPayments = async () => {
      const serviceIds = outsourcedServices.map(s => s.id);
      if (serviceIds.length === 0) {
        setPayments({});
        return;
      }

      const { data, error } = await supabase
        .from('outsourced_payments')
        .select('*')
        .in('outsourced_service_id', serviceIds)
        .order('date', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar pagamentos de terceirizados.');
        return;
      }

      const grouped: Record<string, OutsourcedPayment[]> = {};
      (data || []).forEach((p: any) => {
        const serviceId = p.outsourced_service_id;
        if (!grouped[serviceId]) grouped[serviceId] = [];
        grouped[serviceId].push({
          id: p.id,
          outsourcedServiceId: serviceId,
          date: p.date,
          value: Number(p.value || 0),
          notes: p.notes || '',
        });
      });
      setPayments(grouped);
    };

    void loadPayments();
  }, [outsourcedServices]);

  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Obra nao encontrada';
  const getServicePaid = (serviceId: string) => (payments[serviceId] || []).reduce((sum, p) => sum + p.value, 0);

  const servicesWithTotals = useMemo(() => {
    return outsourcedServices
      .map(service => {
        const paid = getServicePaid(service.id);
        const remaining = service.value - paid;
        const status = getStatus(service.value, paid);
        return { service, paid, remaining, status };
      })
      .filter(({ service, status }) => {
        if (projectFilter !== 'todos' && service.projectId !== projectFilter) return false;
        if (!service.finalized && statusFilter !== 'todos' && status !== statusFilter) return false;
        if (companyFilter.trim() && !service.company.toLowerCase().includes(companyFilter.trim().toLowerCase())) return false;
        if (startDate && service.date < startDate) return false;
        if (endDate && service.date > endDate) return false;
        return true;
      })
      .sort((a, b) => b.service.date.localeCompare(a.service.date) || a.service.company.localeCompare(b.service.company));
  }, [outsourcedServices, payments, projectFilter, companyFilter, statusFilter, startDate, endDate]);

  const openServices = useMemo(() => servicesWithTotals.filter(item => !item.service.finalized), [servicesWithTotals]);
  const finalizedServices = useMemo(() => servicesWithTotals.filter(item => item.service.finalized), [servicesWithTotals]);
  const visibleServices = activeTab === 'open' ? openServices : finalizedServices;

  const totalContract = openServices.reduce((sum, item) => sum + item.service.value, 0);
  const totalPaid = openServices.reduce((sum, item) => sum + item.paid, 0);
  const totalRemaining = totalContract - totalPaid;

  const setFormValue = (serviceId: string, patch: Partial<{ date: string; value: number | ''; notes: string }>) => {
    setPaymentForms(prev => ({
      ...prev,
      [serviceId]: { date: '', value: '', notes: '', ...(prev[serviceId] || {}), ...patch },
    }));
  };

  const addPayment = async (serviceId: string, remaining: number) => {
    const form = paymentForms[serviceId];
    if (!form?.date || !form.value || Number(form.value) <= 0) {
      toast.error('Informe data e valor do pagamento.');
      return;
    }

    const value = Number(form.value);
    if (remaining >= 0 && value > remaining) {
      const ok = window.confirm('O valor informado e maior que o saldo restante. Deseja registrar mesmo assim?');
      if (!ok) return;
    }

    const { data, error } = await (supabase.from('outsourced_payments') as any)
      .insert({
        outsourced_service_id: serviceId,
        date: form.date,
        value,
        notes: form.notes || '',
      })
      .select()
      .single();

    if (error || !data) {
      toast.error('Erro ao registrar pagamento.');
      return;
    }

    const next: OutsourcedPayment = {
      id: data.id,
      outsourcedServiceId: data.outsourced_service_id,
      date: data.date,
      value: Number(data.value || 0),
      notes: data.notes || '',
    };

    setPayments(prev => ({
      ...prev,
      [serviceId]: [next, ...(prev[serviceId] || [])],
    }));
    setPaymentForms(prev => ({ ...prev, [serviceId]: { date: '', value: '', notes: '' } }));
    setShowPaymentForm(prev => ({ ...prev, [serviceId]: false }));
    toast.success('Pagamento registrado.');
  };

  const deletePayment = async (serviceId: string, paymentId: string) => {
    const { error } = await (supabase.from('outsourced_payments') as any).delete().eq('id', paymentId);
    if (error) {
      toast.error('Erro ao excluir pagamento.');
      return;
    }

    setPayments(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || []).filter(p => p.id !== paymentId),
    }));
    toast.success('Pagamento excluido.');
  };

  const toggleFinalized = async (serviceId: string, finalized: boolean) => {
    const message = finalized
      ? 'Deseja finalizar este terceirizado? Ele saira da aba Em aberto e deixara de contar nos totais principais.'
      : 'Deseja reabrir este terceirizado? Ele voltara para a aba Em aberto e voltara a contar nos totais principais.';
    if (!window.confirm(message)) return;

    const ok = await updateOutsourcedServiceStatus(serviceId, finalized);
    if (!ok) {
      toast.error(finalized ? 'Erro ao finalizar terceirizado.' : 'Erro ao reabrir terceirizado.');
      return;
    }

    setExpandedService(null);
    toast.success(finalized ? 'Terceirizado finalizado.' : 'Terceirizado reaberto.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Pagamentos de Terceirizados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controle geral dos servicos terceirizados cadastrados nas obras, com pagamentos e comprovantes individuais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <span className="label-caps">Valor Total Contratado</span>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalContract)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <span className="label-caps text-green-600">Total Pago</span>
          <p className="text-2xl font-semibold mt-1 text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <span className={`label-caps ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>Saldo Restante</span>
          <p className={`text-2xl font-semibold mt-1 ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-card grid gap-3 md:grid-cols-5">
        <div>
          <label className="label-caps mb-1 block">Obra</label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="label-caps mb-1 block">Empresa</label>
          <Input value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} placeholder="Buscar..." />
        </div>
        <div>
          <label className="label-caps mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={value => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="acima">Acima do contratado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="label-caps mb-1 block">Data inicial</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label-caps mb-1 block">Data final</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'open' | 'finalized')} className="space-y-3">
        <TabsList>
          <TabsTrigger value="open">Em aberto</TabsTrigger>
          <TabsTrigger value="finalized">Finalizados</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
        {visibleServices.map(({ service, paid, remaining, status }) => {
          const servicePayments = payments[service.id] || [];
          const isExpanded = expandedService === service.id;
          const form = paymentForms[service.id] || { date: '', value: '', notes: '' };
          const showForm = showPaymentForm[service.id] || false;
          const pctPaid = service.value > 0 ? Math.min((paid / service.value) * 100, 100) : 0;

          return (
            <div key={service.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              <div
                className="px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedService(isExpanded ? null : service.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-[120px_180px_180px_minmax(180px,1fr)] min-w-0">
                    <div><span className="text-xs text-muted-foreground">Data</span><p className="text-sm font-medium">{formatDate(service.date)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Obra</span><p className="text-sm font-medium truncate">{getProjectName(service.projectId)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Empresa</span><p className="text-sm font-medium truncate">{service.company}</p></div>
                    <div><span className="text-xs text-muted-foreground">Descricao</span><p className="text-sm truncate">{service.description || '-'}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:min-w-[560px]">
                  <div className="text-right"><span className="text-xs text-muted-foreground">Valor Total</span><p className="text-sm font-semibold">{formatCurrency(service.value)}</p></div>
                  <div className="text-right"><span className="text-xs text-green-600">Pago</span><p className="text-sm font-medium text-green-600">{formatCurrency(paid)}</p></div>
                  <div className="text-right"><span className={`text-xs ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>Restante</span><p className={`text-sm font-medium ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(remaining)}</p></div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <p>
                      {service.finalized ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Finalizado</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass(status)}`}>{statusLabel(status)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right"><span className="text-xs text-muted-foreground">Comprov.</span><p className="text-sm font-medium flex items-center justify-end gap-1"><Paperclip className="w-3.5 h-3.5" />{servicePayments.length}</p></div>
                </div>
              </div>

              <div className="px-4 pb-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${status === 'acima' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pctPaid}%` }} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {remaining < 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4" />
                      Total pago acima do valor contratado em {formatCurrency(Math.abs(remaining))}.
                    </div>
                  )}

                  <AttachedDocuments entityType="outsourced" entityId={service.id} />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="label-caps text-sm">Pagamentos</h4>
                      <div className="flex flex-wrap justify-end gap-2">
                        {!service.finalized && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={e => {
                              e.stopPropagation();
                              setShowPaymentForm(prev => ({ ...prev, [service.id]: !showForm }));
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Registrar Pagamento
                          </Button>
                        )}
                        {service.finalized ? (
                          <Button size="sm" variant="outline" onClick={() => void toggleFinalized(service.id, false)}>
                            <RotateCcw className="w-4 h-4 mr-1" /> Reabrir
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void toggleFinalized(service.id, true)}>
                            <Archive className="w-4 h-4 mr-1" /> Finalizar
                          </Button>
                        )}
                      </div>
                    </div>

                    {showForm && !service.finalized && (
                      <div className="grid grid-cols-1 gap-3 bg-muted/50 rounded-lg p-3 md:grid-cols-[160px_160px_1fr_auto]">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Data *</label>
                          <Input type="date" value={form.date} onChange={e => setFormValue(service.id, { date: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Valor *</label>
                          <Input type="number" min={0} step={0.01} value={form.value} onChange={e => setFormValue(service.id, { value: e.target.value ? Number(e.target.value) : '' })} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Observacoes</label>
                          <Textarea value={form.notes} onChange={e => setFormValue(service.id, { notes: e.target.value })} className="min-h-[40px]" />
                        </div>
                        <div className="flex items-end">
                          <Button onClick={() => void addPayment(service.id, remaining)}>Salvar</Button>
                        </div>
                      </div>
                    )}

                    {servicePayments.length > 0 ? (
                      <div className="space-y-3">
                        {servicePayments.map(payment => (
                          <div key={payment.id} className="rounded-xl border border-border overflow-hidden">
                            <div className="grid gap-3 px-4 py-3 md:grid-cols-[140px_160px_1fr_auto] md:items-center">
                              <div><span className="text-xs text-muted-foreground">Data</span><p className="text-sm font-medium">{formatDate(payment.date)}</p></div>
                              <div><span className="text-xs text-muted-foreground">Valor</span><p className="text-sm font-semibold text-green-600">{formatCurrency(payment.value)}</p></div>
                              <div><span className="text-xs text-muted-foreground">Observacoes</span><p className="text-sm text-muted-foreground">{payment.notes || '-'}</p></div>
                              <button onClick={() => void deletePayment(service.id, payment.id)} className="justify-self-end text-destructive p-1.5 rounded-md hover:bg-destructive/10" title="Excluir pagamento">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="px-4 pb-4">
                              <AttachedDocuments entityType="outsourced_payment" entityId={payment.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhum pagamento registrado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visibleServices.length === 0 && (
          <div className="bg-card rounded-xl shadow-card px-6 py-12 text-center text-muted-foreground">
            {activeTab === 'open' ? 'Nenhum terceirizado em aberto para os filtros selecionados.' : 'Nenhum terceirizado finalizado para os filtros selecionados.'}
          </div>
        )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
