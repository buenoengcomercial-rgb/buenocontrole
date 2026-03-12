export interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: string;
  grossSalary: number;
  admissionDate: string;
  phone: string;
  pixKeyType: string;
  pixKey: string;
  status: 'ativo' | 'desligado';
  createdAt: string;
}

export interface WorkDay {
  id: string;
  employeeId: string;
  date: string;
  worked: boolean;
  interior: boolean;
  mealVoucherValue: number; // 20 if worked && !interior, 0 otherwise
  absenceType: string; // '' | 'falta_justificada'
  absenceReason: string;
  absenceNotes: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  value: number;
  paymentDate: string;
  notes: string;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  grossSalary: number;
  advanceDiscount: number;
  otherDiscounts: number;
  otherAdditions: number;
  netSalary: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  createdAt: string;
}

export const EMPLOYEE_STATUSES = ['ativo', 'desligado'] as const;

export function calculateAdvance(grossSalary: number): number {
  return Math.round(grossSalary * 0.4 * 100) / 100;
}

export function calculateMealVoucher(worked: boolean, interior: boolean): number {
  return worked && !interior ? 20 : 0;
}

/** First Saturday after the 15th of a given month */
export function getAdvancePaymentDate(year: number, month: number): Date {
  const d = new Date(year, month - 1, 16); // day after 15th
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d;
}

/** 5th business day of a given month */
export function getSalaryPaymentDate(year: number, month: number): Date {
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (count < 5) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    if (count < 5) d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Calculate proportional 13th salary for a given year */
export function calculate13thSalary(grossSalary: number, admissionDate: string, year: number): number {
  const admission = new Date(admissionDate + 'T00:00:00');
  const admYear = admission.getFullYear();
  if (admYear > year) return 0;
  const admMonth = admission.getMonth(); // 0-indexed
  // If admitted after day 15 of the month, that month doesn't count
  const firstMonth = admYear === year
    ? (admission.getDate() > 15 ? admMonth + 1 : admMonth)
    : 0;
  const months = Math.max(0, Math.min(12, 12 - firstMonth));
  return Math.round((grossSalary / 12) * months * 100) / 100;
}

/** Calculate daily 13th salary cost for a single day worked */
export function calculate13thDailyCost(grossSalary: number): number {
  // 13th = 1 month salary / year => daily portion = grossSalary / (12 * 22)
  return grossSalary / (12 * 22);
}
