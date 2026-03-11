import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Employee, WorkDay, SalaryAdvance, SalaryPayment } from '@/types/employee';
import { calculateAdvance, calculateMealVoucher, getAdvancePaymentDate } from '@/types/employee';

interface EmployeeState {
  employees: Employee[];
  workDays: WorkDay[];
  advances: SalaryAdvance[];
  payments: SalaryPayment[];
  addEmployee: (e: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  addWorkDay: (w: Omit<WorkDay, 'id' | 'mealVoucherValue'>) => void;
  updateWorkDay: (w: WorkDay) => void;
  deleteWorkDay: (id: string) => void;
  generateAdvance: (employeeId: string, month: string) => void;
  addPayment: (p: Omit<SalaryPayment, 'id' | 'createdAt'>) => void;
  deletePayment: (id: string) => void;
  deleteAdvance: (id: string) => void;
}

const EmployeeContext = createContext<EmployeeState | null>(null);

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const SAMPLE_EMPLOYEES: Employee[] = [
  { id: '1', name: 'João Silva', cpf: '123.456.789-00', role: 'Eletricista', grossSalary: 3500, admissionDate: '2023-03-15', phone: '(11) 99999-0001', status: 'ativo', createdAt: '2023-03-15' },
  { id: '2', name: 'Maria Santos', cpf: '987.654.321-00', role: 'Encanadora', grossSalary: 3200, admissionDate: '2023-06-01', phone: '(11) 99999-0002', status: 'ativo', createdAt: '2023-06-01' },
  { id: '3', name: 'Carlos Oliveira', cpf: '456.789.123-00', role: 'Pedreiro', grossSalary: 2800, admissionDate: '2024-01-10', phone: '(11) 99999-0003', status: 'ativo', createdAt: '2024-01-10' },
];

const SAMPLE_WORK_DAYS: WorkDay[] = (() => {
  const days: WorkDay[] = [];
  let id = 1;
  // Generate some work days for March 2025
  for (let d = 1; d <= 10; d++) {
    const date = `2025-03-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    for (const empId of ['1', '2', '3']) {
      const interior = empId === '3' && d <= 5;
      days.push({
        id: String(id++),
        employeeId: empId,
        date,
        worked: true,
        interior,
        mealVoucherValue: calculateMealVoucher(true, interior),
      });
    }
  }
  return days;
})();

const SAMPLE_ADVANCES: SalaryAdvance[] = [
  { id: '1', employeeId: '1', month: '2025-02', value: calculateAdvance(3500), paymentDate: '2025-02-22', createdAt: '2025-02-22' },
  { id: '2', employeeId: '2', month: '2025-02', value: calculateAdvance(3200), paymentDate: '2025-02-22', createdAt: '2025-02-22' },
];

const SAMPLE_PAYMENTS: SalaryPayment[] = [
  { id: '1', employeeId: '1', month: '2025-02', grossSalary: 3500, advanceDiscount: 1400, otherDiscounts: 0, otherAdditions: 0, netSalary: 2100, paymentDate: '2025-03-07', createdAt: '2025-03-07' },
];

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(SAMPLE_EMPLOYEES);
  const [workDays, setWorkDays] = useState<WorkDay[]>(SAMPLE_WORK_DAYS);
  const [advances, setAdvances] = useState<SalaryAdvance[]>(SAMPLE_ADVANCES);
  const [payments, setPayments] = useState<SalaryPayment[]>(SAMPLE_PAYMENTS);

  const addEmployee = useCallback((e: Omit<Employee, 'id' | 'createdAt'>) => {
    setEmployees(prev => [...prev, { ...e, id: genId(), createdAt: now() }]);
  }, []);
  const updateEmployee = useCallback((e: Employee) => {
    setEmployees(prev => prev.map(x => x.id === e.id ? e : x));
  }, []);
  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(x => x.id !== id));
  }, []);

  const addWorkDay = useCallback((w: Omit<WorkDay, 'id' | 'mealVoucherValue'>) => {
    const mealVoucherValue = calculateMealVoucher(w.worked, w.interior);
    setWorkDays(prev => [...prev, { ...w, id: genId(), mealVoucherValue }]);
  }, []);
  const updateWorkDay = useCallback((w: WorkDay) => {
    const mealVoucherValue = calculateMealVoucher(w.worked, w.interior);
    setWorkDays(prev => prev.map(x => x.id === w.id ? { ...w, mealVoucherValue } : x));
  }, []);
  const deleteWorkDay = useCallback((id: string) => {
    setWorkDays(prev => prev.filter(x => x.id !== id));
  }, []);

  const generateAdvance = useCallback((employeeId: string, month: string) => {
    setAdvances(prev => {
      const exists = prev.find(a => a.employeeId === employeeId && a.month === month);
      if (exists) return prev;
      const emp = employees.find(e => e.id === employeeId);
      if (!emp) return prev;
      const [y, m] = month.split('-').map(Number);
      const payDate = getAdvancePaymentDate(y, m);
      return [...prev, {
        id: genId(),
        employeeId,
        month,
        value: calculateAdvance(emp.grossSalary),
        paymentDate: payDate.toISOString().slice(0, 10),
        createdAt: now(),
      }];
    });
  }, [employees]);

  const addPayment = useCallback((p: Omit<SalaryPayment, 'id' | 'createdAt'>) => {
    setPayments(prev => [...prev, { ...p, id: genId(), createdAt: now() }]);
  }, []);
  const deletePayment = useCallback((id: string) => {
    setPayments(prev => prev.filter(x => x.id !== id));
  }, []);
  const deleteAdvance = useCallback((id: string) => {
    setAdvances(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <EmployeeContext.Provider value={{
      employees, workDays, advances, payments,
      addEmployee, updateEmployee, deleteEmployee,
      addWorkDay, updateWorkDay, deleteWorkDay,
      generateAdvance, addPayment, deletePayment, deleteAdvance,
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
