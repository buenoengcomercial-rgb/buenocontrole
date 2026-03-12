export interface PayrollCharge {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  inssValue: number;
  fgtsValue: number;
  createdAt: string;
}

export interface Vacation {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'em_ferias' | 'concluidas';
  vacationValue: number;
  bonusValue: number; // 1/3 adicional
  totalPaid: number;
  paymentDate: string;
  notes: string;
  createdAt: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: 'integracao' | 'contratacao' | 'ficha_epi';
  completed: boolean;
  date: string;
  fileName: string;
  createdAt: string;
}

export interface EPIDelivery {
  id: string;
  employeeId: string;
  epiType: string;
  unit: string;
  deliveryDate: string;
  quantity: number;
  notes: string;
  fileName: string;
  createdAt: string;
}

export type ASOType = 'admissional' | 'periodico' | 'retorno' | 'demissional';

export interface ASO {
  id: string;
  employeeId: string;
  type: ASOType;
  examDate: string;
  expiryDate: string;
  fileName: string;
  createdAt: string;
}

export interface Training {
  id: string;
  employeeId: string;
  trainingType: string;
  trainingDate: string;
  expiryDate: string;
  fileName: string;
  createdAt: string;
}

export const ASO_TYPES: { value: ASOType; label: string }[] = [
  { value: 'admissional', label: 'Admissional' },
  { value: 'periodico', label: 'Periódico' },
  { value: 'retorno', label: 'Retorno ao Trabalho' },
  { value: 'demissional', label: 'Demissional' },
];

export const DOC_TYPES: { value: EmployeeDocument['type']; label: string }[] = [
  { value: 'integracao', label: 'Integração de Segurança' },
  { value: 'contratacao', label: 'Documentos de Contratação' },
  { value: 'ficha_epi', label: 'Ficha de EPI' },
];

export const TRAINING_TYPES = ['NR10', 'NR35', 'NR18', 'NR12', 'NR33', 'NR06', 'Outro'] as const;

export const EPI_TYPES = [
  'Capacete', 'Óculos de Proteção', 'Luvas', 'Botina', 'Cinto de Segurança',
  'Protetor Auricular', 'Máscara', 'Uniforme', 'Colete Refletivo', 'Outro'
] as const;

/** Returns days until expiry. Negative = already expired */
export function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Check if vacation period is close to limit (11 months from admission anniversary) */
export function isVacationDueSoon(admissionDate: string): { due: boolean; daysLeft: number } {
  const admission = new Date(admissionDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Find the next anniversary
  let nextAnniversary = new Date(admission);
  while (nextAnniversary <= now) {
    nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
  }

  // Vacation must be taken before anniversary (limit period)
  const daysLeft = Math.ceil((nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { due: daysLeft <= 60, daysLeft };
}
