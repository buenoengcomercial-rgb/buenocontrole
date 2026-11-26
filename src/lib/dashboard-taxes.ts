import type { ChargeType, CompanyCharge } from '@/types/safety';

export const COMPANY_CNPJ = '39973085000120';

export const TAX_GROUPS: { title: string; types: ChargeType[] }[] = [
  { title: 'Encargos trabalhistas', types: ['INSS', 'FGTS'] },
  { title: 'Tributos federais', types: ['PIS', 'COFINS', 'IRPJ', 'CSLL'] },
  { title: 'Tributos municipais', types: ['ISSQN'] },
];

export function companyTaxes(charges: CompanyCharge[]): CompanyCharge[] {
  return charges.filter(charge => charge.payerCnpj.replace(/\D/g, '') === COMPANY_CNPJ);
}

export function taxSummary(charges: CompanyCharge[], today?: string) {
  const open = charges.filter(charge => !charge.paid && charge.verificationStatus !== 'Pago no Nibo; comprovante pendente');
  const proofPending = charges.filter(charge => !charge.paid && charge.verificationStatus === 'Pago no Nibo; comprovante pendente');
  const paid = charges.filter(charge => charge.paid);
  return {
    count: charges.length,
    openCount: open.length,
    openValue: open.reduce((sum, charge) => sum + charge.value, 0),
    overdueCount: today ? open.filter(charge => charge.dueDate && charge.dueDate < today).length : 0,
    proofPendingCount: proofPending.length,
    paidCount: paid.length,
    dueDates: [...new Set(open.map(charge => charge.dueDate).filter(Boolean))].sort(),
  };
}
