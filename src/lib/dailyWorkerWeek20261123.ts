import { supabase } from '@/integrations/supabase/client';

const entries = [
  {
    worker_name: 'Cauã', period_start: '2026-11-24', period_end: '2026-11-26',
    work_days: [
      { date: '2026-11-24', hours: 9, amount: 112.5, mealTaken: true, note: '' },
      { date: '2026-11-25', hours: 9, amount: 134.5, mealTaken: false, note: '' },
      { date: '2026-11-26', hours: 8, amount: 122, mealTaken: false, note: '' },
    ],
    labor_amount: 369, source_key: 'diarista-202611-caua-24-26',
  },
  {
    worker_name: 'Gustavo', period_start: '2026-11-23', period_end: '2026-11-27',
    work_days: [
      { date: '2026-11-23', hours: 9, amount: 132.5, mealTaken: false, note: '' },
      { date: '2026-11-25', hours: 9, amount: 132.5, mealTaken: false, note: '' },
      { date: '2026-11-26', hours: 9, amount: 112.5, mealTaken: true, note: '' },
      { date: '2026-11-27', hours: 8, amount: 120, mealTaken: false, note: '' },
    ],
    labor_amount: 497.5, source_key: 'diarista-202611-gustavo-23-27',
  },
  {
    worker_name: 'Antônio', period_start: '2026-11-23', period_end: '2026-11-26',
    work_days: ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'].map(date => ({ date, hours: 8, mealTaken: false, note: '' })),
    labor_amount: 480, source_key: 'diarista-202611-antonio-23-26',
  },
] as const;

const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export async function ensureDailyWorkerWeek20261123() {
  for (const entry of entries) {
    const { data, error } = await supabase.from('daily_worker_settlements')
      .select('worker_name, source_key').eq('period_start', entry.period_start).eq('period_end', entry.period_end);
    if (error) throw error;
    if (data?.some(row => row.source_key === entry.source_key || normalize(row.worker_name) === normalize(entry.worker_name))) continue;
    const { error: insertError } = await supabase.from('daily_worker_settlements').insert({
      ...entry,
      work_days: [...entry.work_days],
      meal_amount: 0,
      carry_advance: 0,
      payments: [{ date: null, amount: entry.labor_amount, kind: 'Saldo', note: 'Pago conforme informado pelo usuário; data e comprovante pendentes' }],
      notes: 'Total pago informado pelo usuário. Data da transferência e comprovante pendentes. Valores diários já consideram a marmita quando indicada; não somar alimentação novamente.',
    });
    if (insertError && insertError.code !== '23505') throw insertError;
  }
}
