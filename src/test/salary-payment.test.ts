import { describe, expect, it } from 'vitest';
import { getSalaryPaymentTotal } from '@/types/employee';

describe('getSalaryPaymentTotal', () => {
  it('soma o adiantamento ao valor restante pago', () => {
    expect(getSalaryPaymentTotal({ advanceDiscount: 1149.15, netSalary: 842.25 })).toBeCloseTo(1991.4, 2);
  });

  it('retorna apenas o valor pago quando nao houve adiantamento', () => {
    expect(getSalaryPaymentTotal({ advanceDiscount: 0, netSalary: 2020.98 })).toBeCloseTo(2020.98, 2);
  });
});
