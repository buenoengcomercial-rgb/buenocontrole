import { describe, expect, it } from 'vitest';
import { companyTaxes, taxSummary, TAX_GROUPS } from '@/lib/dashboard-taxes';
import type { CompanyCharge } from '@/types/safety';

const charge = (overrides: Partial<CompanyCharge> = {}): CompanyCharge => ({
  id: '1', chargeType: 'INSS', month: '2026-10', value: 100, dueDate: '2026-11-20',
  paymentDate: '', paid: false, notes: '', payerCnpj: '39.973.085/0001-20',
  source: 'Nibo Empresa', sourceDocumentId: '', documentNumber: '', documentUrl: '',
  documentHash: '', verificationStatus: 'Guia conferida', createdAt: '2026-11-01', ...overrides,
});

describe('dashboard taxes', () => {
  it('covers all tax types in their operational groups', () => {
    expect(TAX_GROUPS.flatMap(group => group.types)).toEqual(['INSS', 'FGTS', 'PIS', 'COFINS', 'IRPJ', 'CSLL', 'ISSQN']);
  });

  it('keeps another company out and sums multiple guides per tax', () => {
    const items = companyTaxes([charge(), charge({ id: '2', value: 50 }), charge({ id: '3', value: 900, payerCnpj: '51.015.837/0001-45' })]);
    expect(taxSummary(items)).toMatchObject({ count: 2, openCount: 2, openValue: 150 });
  });

  it('does not count Nibo payment awaiting proof as an open guide or confirmed paid', () => {
    expect(taxSummary([charge(), charge({ id: '2', verificationStatus: 'Pago no Nibo; comprovante pendente' }), charge({ id: '3', paid: true })]))
      .toMatchObject({ count: 3, openCount: 1, openValue: 100, proofPendingCount: 1, paidCount: 1 });
  });

  it('marks only unpaid guides with a past due date as overdue', () => {
    expect(taxSummary([charge(), charge({ id: '2', dueDate: '2026-11-25' }), charge({ id: '3', paid: true })], '2026-11-25'))
      .toMatchObject({ overdueCount: 1, openCount: 2 });
  });
});
