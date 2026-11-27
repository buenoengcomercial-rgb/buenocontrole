import { describe, expect, it } from 'vitest';
import { findVodelinaLoanToCorrect } from '@/lib/loanCorrection';

const loan = { id: 'loan-1', company: 'VÓ DELINA', date: '2026-05-01', service_category: 'emprestimo', value: 150000 };

describe('Vó Delina loan correction', () => {
  it('accepts the displayed old amount and the previously reported amount', () => {
    expect(findVodelinaLoanToCorrect([loan])?.id).toBe('loan-1');
    expect(findVodelinaLoanToCorrect([{ ...loan, value: 250000 }])?.id).toBe('loan-1');
  });

  it('does not touch an already corrected, different, or ambiguous loan', () => {
    expect(findVodelinaLoanToCorrect([{ ...loan, value: 350000 }])).toBeNull();
    expect(findVodelinaLoanToCorrect([{ ...loan, company: 'OUTRO EMPRESTIMO' }])).toBeNull();
    expect(findVodelinaLoanToCorrect([loan, { ...loan, id: 'loan-2' }])).toBeNull();
  });
});
