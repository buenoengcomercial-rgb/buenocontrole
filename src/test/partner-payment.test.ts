import { describe, expect, it } from 'vitest';
import { activeSalaryPayments } from '@/types/employee';
import type { SalaryPayment } from '@/types/employee';

describe('activeSalaryPayments', () => {
  const payment = { id: 'original', netSalary: 1499.43 } as SalaryPayment;

  it('keeps the original receipt when no replacement exists', () => {
    expect(activeSalaryPayments([payment], [])).toEqual([payment]);
  });

  it('removes a replaced receipt from active totals without changing the source', () => {
    const source = [payment];
    expect(activeSalaryPayments(source, [{ replacesSalaryPaymentId: 'original' }])).toEqual([]);
    expect(source).toEqual([payment]);
  });
});
