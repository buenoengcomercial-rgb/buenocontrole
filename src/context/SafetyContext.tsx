import React, { createContext, useContext, useState, useCallback } from 'react';
import type { PayrollCharge, Vacation, EmployeeDocument, EPIDelivery, ASO, Training } from '@/types/safety';

interface SafetyState {
  charges: PayrollCharge[];
  vacations: Vacation[];
  documents: EmployeeDocument[];
  epiDeliveries: EPIDelivery[];
  asos: ASO[];
  trainings: Training[];
  addCharge: (c: Omit<PayrollCharge, 'id' | 'createdAt'>) => void;
  updateCharge: (c: PayrollCharge) => void;
  deleteCharge: (id: string) => void;
  addVacation: (v: Omit<Vacation, 'id' | 'createdAt'>) => void;
  updateVacation: (v: Vacation) => void;
  deleteVacation: (id: string) => void;
  addDocument: (d: Omit<EmployeeDocument, 'id' | 'createdAt'>) => void;
  updateDocument: (d: EmployeeDocument) => void;
  deleteDocument: (id: string) => void;
  addEPIDelivery: (e: Omit<EPIDelivery, 'id' | 'createdAt'>) => void;
  deleteEPIDelivery: (id: string) => void;
  addASO: (a: Omit<ASO, 'id' | 'createdAt'>) => void;
  updateASO: (a: ASO) => void;
  deleteASO: (id: string) => void;
  addTraining: (t: Omit<Training, 'id' | 'createdAt'>) => void;
  updateTraining: (t: Training) => void;
  deleteTraining: (id: string) => void;
}

const SafetyContext = createContext<SafetyState | null>(null);
const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const SAMPLE_CHARGES: PayrollCharge[] = [
  { id: '1', employeeId: '1', month: '2025-02', inssValue: 385, fgtsValue: 280, dueDate: '2025-03-07', paid: true, paidValue: 665, paymentDate: '2025-03-05', createdAt: '2025-02-28' },
  { id: '2', employeeId: '2', month: '2025-02', inssValue: 352, fgtsValue: 256, dueDate: '2025-03-07', paid: false, paidValue: 0, paymentDate: '', createdAt: '2025-02-28' },
];

const SAMPLE_ASOS: ASO[] = [
  { id: '1', employeeId: '1', type: 'periodico', examDate: '2025-01-15', expiryDate: '2026-01-15', fileName: 'aso_joao.pdf', createdAt: '2025-01-15' },
  { id: '2', employeeId: '3', type: 'admissional', examDate: '2024-01-10', expiryDate: '2025-04-10', fileName: 'aso_carlos.pdf', createdAt: '2024-01-10' },
];

const SAMPLE_TRAININGS: Training[] = [
  { id: '1', employeeId: '1', trainingType: 'NR10', trainingDate: '2024-06-15', expiryDate: '2026-06-15', fileName: 'nr10_joao.pdf', createdAt: '2024-06-15' },
  { id: '2', employeeId: '2', trainingType: 'NR35', trainingDate: '2024-09-01', expiryDate: '2025-04-01', fileName: 'nr35_maria.pdf', createdAt: '2024-09-01' },
];

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [charges, setCharges] = useState<PayrollCharge[]>(SAMPLE_CHARGES);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [epiDeliveries, setEPIDeliveries] = useState<EPIDelivery[]>([]);
  const [asos, setASOs] = useState<ASO[]>(SAMPLE_ASOS);
  const [trainings, setTrainings] = useState<Training[]>(SAMPLE_TRAININGS);

  const addCharge = useCallback((c: Omit<PayrollCharge, 'id' | 'createdAt'>) => {
    setCharges(prev => [...prev, { ...c, id: genId(), createdAt: now() }]);
  }, []);
  const updateCharge = useCallback((c: PayrollCharge) => {
    setCharges(prev => prev.map(x => x.id === c.id ? c : x));
  }, []);
  const deleteCharge = useCallback((id: string) => {
    setCharges(prev => prev.filter(x => x.id !== id));
  }, []);

  const addVacation = useCallback((v: Omit<Vacation, 'id' | 'createdAt'>) => {
    setVacations(prev => [...prev, { ...v, id: genId(), createdAt: now() }]);
  }, []);
  const updateVacation = useCallback((v: Vacation) => {
    setVacations(prev => prev.map(x => x.id === v.id ? v : x));
  }, []);
  const deleteVacation = useCallback((id: string) => {
    setVacations(prev => prev.filter(x => x.id !== id));
  }, []);

  const addDocument = useCallback((d: Omit<EmployeeDocument, 'id' | 'createdAt'>) => {
    setDocuments(prev => [...prev, { ...d, id: genId(), createdAt: now() }]);
  }, []);
  const updateDocument = useCallback((d: EmployeeDocument) => {
    setDocuments(prev => prev.map(x => x.id === d.id ? d : x));
  }, []);
  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(x => x.id !== id));
  }, []);

  const addEPIDelivery = useCallback((e: Omit<EPIDelivery, 'id' | 'createdAt'>) => {
    setEPIDeliveries(prev => [...prev, { ...e, id: genId(), createdAt: now() }]);
  }, []);
  const deleteEPIDelivery = useCallback((id: string) => {
    setEPIDeliveries(prev => prev.filter(x => x.id !== id));
  }, []);

  const addASO = useCallback((a: Omit<ASO, 'id' | 'createdAt'>) => {
    setASOs(prev => [...prev, { ...a, id: genId(), createdAt: now() }]);
  }, []);
  const updateASO = useCallback((a: ASO) => {
    setASOs(prev => prev.map(x => x.id === a.id ? a : x));
  }, []);
  const deleteASO = useCallback((id: string) => {
    setASOs(prev => prev.filter(x => x.id !== id));
  }, []);

  const addTraining = useCallback((t: Omit<Training, 'id' | 'createdAt'>) => {
    setTrainings(prev => [...prev, { ...t, id: genId(), createdAt: now() }]);
  }, []);
  const updateTraining = useCallback((t: Training) => {
    setTrainings(prev => prev.map(x => x.id === t.id ? t : x));
  }, []);
  const deleteTraining = useCallback((id: string) => {
    setTrainings(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <SafetyContext.Provider value={{
      charges, vacations, documents, epiDeliveries, asos, trainings,
      addCharge, updateCharge, deleteCharge,
      addVacation, updateVacation, deleteVacation,
      addDocument, updateDocument, deleteDocument,
      addEPIDelivery, deleteEPIDelivery,
      addASO, updateASO, deleteASO,
      addTraining, updateTraining, deleteTraining,
    }}>
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafetyData() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafetyData must be used within SafetyProvider');
  return ctx;
}
