import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'; // v2
import { supabase } from '@/integrations/supabase/client';
import type { Employee, WorkDay, SalaryAdvance, SalaryPayment } from '@/types/employee';
import { calculateAdvance, calculateMealVoucher, getAdvancePaymentDate } from '@/types/employee';

interface EmployeeState {
  employees: Employee[];
  workDays: WorkDay[];
  advances: SalaryAdvance[];
  payments: SalaryPayment[];
  loading: boolean;
  addEmployee: (e: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  addWorkDay: (w: Omit<WorkDay, 'id' | 'mealVoucherValue'>) => void;
  updateWorkDay: (w: WorkDay) => void;
  deleteWorkDay: (id: string) => void;
  generateAdvance: (employeeId: string, month: string) => void;
  addAdvanceManual: (employeeId: string, month: string, value: number, notes?: string, paymentDate?: string) => void;
  updateAdvance: (a: SalaryAdvance) => void;
  addPayment: (p: Omit<SalaryPayment, 'id' | 'createdAt'>) => void;
  updatePayment: (p: SalaryPayment) => void;
  deletePayment: (id: string) => void;
  deleteAdvance: (id: string) => void;
}

const EmployeeContext = createContext<EmployeeState | null>(null);

function mapEmployee(r: any): Employee {
  return { id: r.id, name: r.name, cpf: r.cpf, role: r.role, grossSalary: Number(r.gross_salary), admissionDate: r.admission_date, phone: r.phone, pixKeyType: r.pix_key_type || '', pixKey: r.pix_key || '', status: r.status as Employee['status'], createdAt: r.created_at };
}
function mapWorkDay(r: any): WorkDay {
  return { id: r.id, employeeId: r.employee_id, projectId: r.project_id || null, date: r.date, worked: r.worked, interior: r.interior, mealVoucherValue: Number(r.meal_voucher_value), absenceType: r.absence_type || '', absenceReason: r.absence_reason || '', absenceNotes: r.absence_notes || '' };
}
function mapAdvance(r: any): SalaryAdvance {
  return { id: r.id, employeeId: r.employee_id, month: r.month, value: Number(r.value), paymentDate: r.payment_date, notes: r.notes || '', createdAt: r.created_at };
}
function mapPayment(r: any): SalaryPayment {
  return { id: r.id, employeeId: r.employee_id, month: r.month, grossSalary: Number(r.gross_salary), advanceDiscount: Number(r.advance_discount), otherDiscounts: Number(r.other_discounts), otherAdditions: Number(r.other_additions), netSalary: Number(r.net_salary), paymentDate: r.payment_date, paymentMethod: r.payment_method || '', notes: r.notes || '', createdAt: r.created_at };
}

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('employees').select('*').then(({ data }) => setEmployees((data || []).map(mapEmployee))),
      supabase.from('work_days').select('*').then(({ data }) => setWorkDays((data || []).map(mapWorkDay))),
      supabase.from('salary_advances').select('*').then(({ data }) => setAdvances((data || []).map(mapAdvance))),
      supabase.from('salary_payments').select('*').then(({ data }) => setPayments((data || []).map(mapPayment))),
    ]).finally(() => setLoading(false));
  }, []);

  const addEmployee = useCallback(async (e: Omit<Employee, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('employees').insert({
      name: e.name, cpf: e.cpf, role: e.role, gross_salary: e.grossSalary, admission_date: e.admissionDate, phone: e.phone, status: e.status, pix_key_type: e.pixKeyType, pix_key: e.pixKey,
    }).select().single();
    if (data) setEmployees(prev => [...prev, mapEmployee(data)]);
  }, []);
  const updateEmployee = useCallback(async (e: Employee) => {
    await supabase.from('employees').update({
      name: e.name, cpf: e.cpf, role: e.role, gross_salary: e.grossSalary, admission_date: e.admissionDate, phone: e.phone, status: e.status, pix_key_type: e.pixKeyType, pix_key: e.pixKey,
    }).eq('id', e.id);
    setEmployees(prev => prev.map(x => x.id === e.id ? e : x));
  }, []);
  const deleteEmployee = useCallback(async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    setEmployees(prev => prev.filter(x => x.id !== id));
  }, []);

  const addWorkDay = useCallback(async (w: Omit<WorkDay, 'id' | 'mealVoucherValue'>) => {
    const mealVoucherValue = w.absenceType === 'falta_justificada' ? 0 : calculateMealVoucher(w.worked, w.interior);
    const { data } = await supabase.from('work_days').insert({
      employee_id: w.employeeId, project_id: w.projectId || null, date: w.date, worked: w.worked, interior: w.interior, meal_voucher_value: mealVoucherValue,
      absence_type: w.absenceType || '', absence_reason: w.absenceReason || '', absence_notes: w.absenceNotes || '',
    }).select().single();
    if (data) setWorkDays(prev => [...prev, mapWorkDay(data)]);
  }, []);
  const updateWorkDay = useCallback(async (w: WorkDay) => {
    const mealVoucherValue = w.absenceType === 'falta_justificada' ? 0 : calculateMealVoucher(w.worked, w.interior);
    await supabase.from('work_days').update({
      employee_id: w.employeeId, project_id: w.projectId || null, date: w.date, worked: w.worked, interior: w.interior, meal_voucher_value: mealVoucherValue,
      absence_type: w.absenceType || '', absence_reason: w.absenceReason || '', absence_notes: w.absenceNotes || '',
    }).eq('id', w.id);
    setWorkDays(prev => prev.map(x => x.id === w.id ? { ...w, mealVoucherValue } : x));
  }, []);
  const deleteWorkDay = useCallback(async (id: string) => {
    await supabase.from('work_days').delete().eq('id', id);
    setWorkDays(prev => prev.filter(x => x.id !== id));
  }, []);

  const generateAdvance = useCallback(async (employeeId: string, month: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    const [y, m] = month.split('-').map(Number);
    const payDate = getAdvancePaymentDate(y, m);
    const { data } = await supabase.from('salary_advances').insert({
      employee_id: employeeId, month, value: calculateAdvance(emp.grossSalary), payment_date: payDate.toISOString().slice(0, 10),
    }).select().single();
    if (data) setAdvances(prev => [...prev, mapAdvance(data)]);
  }, [employees]);

  const addAdvanceManual = useCallback(async (employeeId: string, month: string, value: number, notes?: string, paymentDate?: string) => {
    const [y, m] = month.split('-').map(Number);
    const payDate = paymentDate || getAdvancePaymentDate(y, m).toISOString().slice(0, 10);
    const { data } = await supabase.from('salary_advances').insert({
      employee_id: employeeId, month, value, payment_date: payDate, notes: notes || '',
    }).select().single();
    if (data) setAdvances(prev => [...prev, mapAdvance(data)]);
  }, []);

  const updateAdvance = useCallback(async (a: SalaryAdvance) => {
    await supabase.from('salary_advances').update({
      value: a.value, payment_date: a.paymentDate, notes: a.notes || '',
    }).eq('id', a.id);
    setAdvances(prev => prev.map(x => x.id === a.id ? a : x));
  }, []);

  const addPayment = useCallback(async (p: Omit<SalaryPayment, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('salary_payments').insert({
      employee_id: p.employeeId, month: p.month, gross_salary: p.grossSalary, advance_discount: p.advanceDiscount,
      other_discounts: p.otherDiscounts, other_additions: p.otherAdditions, net_salary: p.netSalary, payment_date: p.paymentDate,
      payment_method: p.paymentMethod || '', notes: p.notes || '',
    }).select().single();
    if (data) setPayments(prev => [...prev, mapPayment(data)]);
  }, []);
  const updatePayment = useCallback(async (p: SalaryPayment) => {
    await supabase.from('salary_payments').update({
      gross_salary: p.grossSalary, advance_discount: p.advanceDiscount,
      other_discounts: p.otherDiscounts, other_additions: p.otherAdditions, net_salary: p.netSalary,
      payment_date: p.paymentDate, payment_method: p.paymentMethod || '', notes: p.notes || '',
    }).eq('id', p.id);
    setPayments(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);
  const deletePayment = useCallback(async (id: string) => {
    await supabase.from('salary_payments').delete().eq('id', id);
    setPayments(prev => prev.filter(x => x.id !== id));
  }, []);
  const deleteAdvance = useCallback(async (id: string) => {
    await supabase.from('salary_advances').delete().eq('id', id);
    setAdvances(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <EmployeeContext.Provider value={{
      employees, workDays, advances, payments, loading,
      addEmployee, updateEmployee, deleteEmployee,
      addWorkDay, updateWorkDay, deleteWorkDay,
      generateAdvance, addAdvanceManual, updateAdvance, addPayment, updatePayment, deletePayment, deleteAdvance,
    }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployeeData() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployeeData must be used within EmployeeProvider');
  return ctx;
}
