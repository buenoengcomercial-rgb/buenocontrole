import { describe, expect, it } from 'vitest';
import { notesForLegacyStorage, parseTaxCheckpoint, readImportedNotes } from '@/lib/tax-import';
import type { CompanyCharge } from '@/types/safety';

const source = {
  payerCnpj: '39973085000120',
  items: [{
    type: 'INSS', competence: '2026-08', value: 544.62, dueDate: '2026-09-18',
    reference: 'DARF Previdenciario', documentNumber: '07.16.26253.0658077-7',
    niboStatus: 'Nao encontrado', guideRead: true,
  }],
};

describe('tax checkpoint import', () => {
  it('keeps the documentary month and does not claim payment', () => {
    const { ready, skipped } = parseTaxCheckpoint(source, []);
    expect(skipped).toBe(0);
    expect(ready[0]).toMatchObject({ month: '2026-08', value: 544.62, dueDate: '2026-09-18', paid: false, documentNumber: '07.16.26253.0658077-7', verificationStatus: 'Guia conferida' });
  });

  it('skips an existing guide by document or fallback identity', () => {
    const first = parseTaxCheckpoint(source, []).ready[0];
    const existing = { ...first, id: 'one', createdAt: '2026-11-20' } as CompanyCharge;
    expect(parseTaxCheckpoint(source, [existing])).toMatchObject({ ready: [], skipped: 1 });
    expect(parseTaxCheckpoint(source, [{ ...existing, documentNumber: '' }])).toMatchObject({ ready: [], skipped: 1 });
  });

  it('rejects another CNPJ or an unread guide before writing', () => {
    expect(() => parseTaxCheckpoint({ ...source, payerCnpj: '51015837000145' }, [])).toThrow('CNPJ');
    expect(() => parseTaxCheckpoint({ ...source, items: [{ ...source.items[0], guideRead: false }] }, [])).toThrow('não conferida');
  });

  it('recovers metadata from legacy notes without showing the marker', () => {
    const charge = parseTaxCheckpoint(source, []).ready[0];
    const stored = notesForLegacyStorage(charge);
    expect(readImportedNotes(stored)).toMatchObject({ notes: charge.notes, metadata: { documentNumber: charge.documentNumber, verificationStatus: charge.verificationStatus } });
  });
});
