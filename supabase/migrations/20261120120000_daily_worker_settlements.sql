CREATE TABLE public.daily_worker_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name TEXT NOT NULL CHECK (length(trim(worker_name)) > 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL CHECK (period_end >= period_start),
  work_days JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(work_days) = 'array'),
  labor_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (labor_amount >= 0),
  meal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (meal_amount >= 0),
  carry_advance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (carry_advance >= 0),
  payments JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(payments) = 'array'),
  notes TEXT NOT NULL DEFAULT '',
  source_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_name, period_start, period_end)
);

ALTER TABLE public.daily_worker_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read daily_worker_settlements" ON public.daily_worker_settlements FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert daily_worker_settlements" ON public.daily_worker_settlements FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update daily_worker_settlements" ON public.daily_worker_settlements FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete daily_worker_settlements" ON public.daily_worker_settlements FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.daily_worker_settlements
  (worker_name, period_start, period_end, work_days, labor_amount, meal_amount, carry_advance, payments, notes, source_key)
VALUES
  ('Mário', '2026-11-16', '2026-11-19', '[{"date":"2026-11-16","hours":5,"note":"Chegou às 12h"},{"date":"2026-11-17","hours":9,"note":""},{"date":"2026-11-19","hours":8,"note":""}]', 175, 20, 50, '[{"date":"2026-11-17","amount":50,"kind":"Adiantamento","note":"Informado pelo usuário; comprovante não anexado"},{"date":"2026-11-19","amount":195,"kind":"Saldo","note":"Informado pelo usuário; comprovante não anexado"}]', 'R$ 50 além dos R$ 195 de diárias e marmita; finalidade da diferença a confirmar. Valores e pagamentos informados pelo usuário; comprovantes não anexados.', 'diarista-202611-mario-16-19'),
  ('Frank', '2026-11-16', '2026-11-17', '[{"date":"2026-11-16","hours":8,"note":"Chegou às 12h para resolver assunto bancário; 8 horas confirmadas pelo usuário"},{"date":"2026-11-17","hours":9,"note":""}]', 262.50, 0, 0, '[{"date":"2026-11-19","amount":262.50,"kind":"Saldo","note":"Informado pelo usuário; comprovante não anexado"}]', 'Jornada de 8 horas em 16/11 confirmada pelo usuário apesar da observação de chegada ao meio-dia.', 'diarista-202611-frank-16-17'),
  ('Davi', '2026-11-16', '2026-11-19', '[{"date":"2026-11-16","hours":9,"note":""},{"date":"2026-11-17","hours":9,"note":""},{"date":"2026-11-18","hours":9,"note":""},{"date":"2026-11-19","hours":9,"note":""}]', 450, 88, 0, '[{"date":null,"amount":75,"kind":"Adiantamento","note":"Data não informada; comprovante não anexado"},{"date":"2026-11-19","amount":463,"kind":"Saldo","note":"Informado pelo usuário; comprovante não anexado"}]', 'Ex-colaborador; serviço por diárias após desligamento, separado da folha. Confirmar identificação completa e documentos antes de uso contábil.', 'diarista-202611-davi-16-19'),
  ('Antônio', '2026-11-16', '2026-11-19', '[{"date":"2026-11-16","hours":8,"note":""},{"date":"2026-11-17","hours":8,"note":""},{"date":"2026-11-18","hours":8,"note":""},{"date":"2026-11-19","hours":8,"note":""}]', 400, 80, 0, '[{"date":"2026-11-19","amount":480,"kind":"Saldo","note":"Informado pelo usuário; comprovante não anexado"}]', 'R$ 400 de diárias mais R$ 80 de marmitas, confirmado pelo usuário.', 'diarista-202611-antonio-16-19'),
  ('Gustavo', '2026-11-16', '2026-11-19', '[{"date":"2026-11-16","hours":9,"note":""},{"date":"2026-11-17","hours":9,"note":""},{"date":"2026-11-18","hours":9,"note":""},{"date":"2026-11-19","hours":9,"note":""}]', 450, 20, 0, '[{"date":"2026-11-19","amount":470,"kind":"Saldo","note":"Informado pelo usuário; comprovante não anexado"}]', 'R$ 450 de diárias mais R$ 20 de marmita.', 'diarista-202611-gustavo-16-19'),
  ('Mário', '2026-11-10', '2026-11-13', '[{"date":"2026-11-10","hours":9,"amount":132.50,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-11","hours":8,"amount":100,"mealTaken":true,"note":"Saiu às 17h"},{"date":"2026-11-12","hours":9,"amount":62.50,"mealTaken":true,"note":"Valor diário informado após adiantamento de R$ 50"},{"date":"2026-11-13","hours":8,"amount":100,"mealTaken":true,"note":""}]', 445, 0, 0, '[{"date":"2026-11-12","amount":50,"kind":"Adiantamento","note":"Informado pelo usuário; comprovante não anexado"},{"date":"2026-11-13","amount":395,"kind":"Saldo","note":"Pagamento informado pelo usuário; comprovante não anexado"}]', 'R$ 395 de saldo após adiantamento de R$ 50 em 12/11; total desembolsado de R$ 445. Marmitas indicadas por dia, sem valor individual informado.', 'diarista-202611-mario-10-13'),
  ('Frank', '2026-11-09', '2026-11-13', '[{"date":"2026-11-09","hours":9,"amount":112.50,"note":""},{"date":"2026-11-10","hours":9,"amount":112.50,"note":""},{"date":"2026-11-11","hours":8,"amount":100,"note":"Chegou às 9h por atraso do ônibus"},{"date":"2026-11-12","hours":9,"amount":112.50,"note":""},{"date":"2026-11-13","hours":8,"amount":100,"note":""}]', 537.50, 0, 0, '[{"date":"2026-11-13","amount":537.50,"kind":"Saldo","note":"Pagamento informado pelo usuário; comprovante não anexado"}]', 'Total informado e pago de R$ 537,50.', 'diarista-202611-frank-09-13'),
  ('Davi', '2026-11-10', '2026-11-13', '[{"date":"2026-11-10","hours":9,"amount":112.50,"note":""},{"date":"2026-11-11","hours":9,"amount":112.50,"note":""},{"date":"2026-11-12","hours":9,"amount":112.50,"note":""},{"date":"2026-11-13","hours":9,"amount":112.50,"note":""}]', 450, 0, 0, '[{"date":"2026-11-13","amount":450,"kind":"Saldo","note":"Pagamento informado pelo usuário; comprovante não anexado"}]', 'Total informado e pago de R$ 450. Ex-colaborador; diárias separadas da folha.', 'diarista-202611-davi-10-13'),
  ('Antônio', '2026-11-12', '2026-11-13', '[{"date":"2026-11-12","hours":8,"amount":100,"mealTaken":true,"note":"Pegou marmita"},{"date":"2026-11-13","hours":8,"amount":120,"mealTaken":false,"note":"Não pegou marmita"}]', 220, 0, 0, '[{"date":"2026-11-13","amount":220,"kind":"Saldo","note":"Pagamento informado pelo usuário; comprovante não anexado"}]', 'Total informado e pago de R$ 220. Marmitas indicadas por dia, sem valor individual informado.', 'diarista-202611-antonio-12-13')
ON CONFLICT (source_key) DO NOTHING;
