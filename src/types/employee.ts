export interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: string;
  grossSalary: number;
  admissionDate: string;
  phone: string;
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
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  value: number;
  paymentDate: string;
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
