import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyCharge, Vacation, EmployeeDocument, EPIDelivery, ASO, Training } from '@/types/safety';

interface SafetyState {
  charges: CompanyCharge[];
  vacations: Vacation[];
  documents: EmployeeDocument[];
  epiDeliveries: EPIDelivery[];
  asos: ASO[];
  trainings: Training[];
  loading: boolean;
  addCharge: (c: Omit<CompanyCharge, 'id' | 'createdAt'>) => void;
  updateCharge: (c: CompanyCharge) => void;
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

function mapCharge(r: any): CompanyCharge {
  return { id: r.id, chargeType: r.charge_type as CompanyCharge['chargeType'], month: r.month, value: Number(r.value), dueDate: r.due_date || '', paid: r.paid, paymentDate: r.payment_date || '', notes: r.notes || '', createdAt: r.created_at };
}
function mapVacation(r: any): Vacation {
  return { id: r.id, employeeId: r.employee_id, startDate: r.start_date, endDate: r.end_date, status: r.status as Vacation['status'], vacationValue: Number(r.vacation_value), bonusValue: Number(r.bonus_value), totalPaid: Number(r.total_paid), paymentDate: r.payment_date || '', notes: r.notes, createdAt: r.created_at };
}
function mapDoc(r: any): EmployeeDocument {
  return { id: r.id, employeeId: r.employee_id, type: r.type as EmployeeDocument['type'], completed: r.completed, date: r.date, fileName: r.file_name, createdAt: r.created_at };
}
function mapEPI(r: any): EPIDelivery {
  return { id: r.id, employeeId: r.employee_id, epiType: r.epi_type, unit: r.unit, deliveryDate: r.delivery_date, quantity: Number(r.quantity), notes: r.notes, fileName: r.file_name, createdAt: r.created_at };
}
function mapASO(r: any): ASO {
  return { id: r.id, employeeId: r.employee_id, type: r.type as ASO['type'], examDate: r.exam_date, expiryDate: r.expiry_date, fileName: r.file_name, createdAt: r.created_at };
}
function mapTraining(r: any): Training {
  return { id: r.id, employeeId: r.employee_id, trainingType: r.training_type, trainingDate: r.training_date, expiryDate: r.expiry_date, fileName: r.file_name, createdAt: r.created_at };
}

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [charges, setCharges] = useState<CompanyCharge[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [epiDeliveries, setEPIDeliveries] = useState<EPIDelivery[]>([]);
  const [asos, setASOs] = useState<ASO[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('company_charges').select('*').then(({ data }) => setCharges((data || []).map(mapCharge))),
      supabase.from('vacations').select('*').then(({ data }) => setVacations((data || []).map(mapVacation))),
      supabase.from('employee_documents').select('*').then(({ data }) => setDocuments((data || []).map(mapDoc))),
      supabase.from('epi_deliveries').select('*').then(({ data }) => setEPIDeliveries((data || []).map(mapEPI))),
      supabase.from('asos').select('*').then(({ data }) => setASOs((data || []).map(mapASO))),
      supabase.from('trainings').select('*').then(({ data }) => setTrainings((data || []).map(mapTraining))),
    ]).finally(() => setLoading(false));
  }, []);

  // Company Charges
  const addCharge = useCallback(async (c: Omit<CompanyCharge, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('company_charges').insert({
      month: c.month, inss_value: c.inssValue, fgts_value: c.fgtsValue,
      due_date: c.dueDate || null, paid: c.paid, payment_date: c.paymentDate || null, notes: c.notes,
    }).select().single();
    if (data) setCharges(prev => [...prev, mapCharge(data)]);
  }, []);
  const updateCharge = useCallback(async (c: CompanyCharge) => {
    await supabase.from('company_charges').update({
      month: c.month, inss_value: c.inssValue, fgts_value: c.fgtsValue,
      due_date: c.dueDate || null, paid: c.paid, payment_date: c.paymentDate || null, notes: c.notes,
    }).eq('id', c.id);
    setCharges(prev => prev.map(x => x.id === c.id ? c : x));
  }, []);
  const deleteCharge = useCallback(async (id: string) => {
    await supabase.from('company_charges').delete().eq('id', id);
    setCharges(prev => prev.filter(x => x.id !== id));
  }, []);

  // Vacations
  const addVacation = useCallback(async (v: Omit<Vacation, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('vacations').insert({
      employee_id: v.employeeId, start_date: v.startDate, end_date: v.endDate, status: v.status,
      vacation_value: v.vacationValue, bonus_value: v.bonusValue, total_paid: v.totalPaid,
      payment_date: v.paymentDate || null, notes: v.notes,
    }).select().single();
    if (data) setVacations(prev => [...prev, mapVacation(data)]);
  }, []);
  const updateVacation = useCallback(async (v: Vacation) => {
    await supabase.from('vacations').update({
      employee_id: v.employeeId, start_date: v.startDate, end_date: v.endDate, status: v.status,
      vacation_value: v.vacationValue, bonus_value: v.bonusValue, total_paid: v.totalPaid,
      payment_date: v.paymentDate || null, notes: v.notes,
    }).eq('id', v.id);
    setVacations(prev => prev.map(x => x.id === v.id ? v : x));
  }, []);
  const deleteVacation = useCallback(async (id: string) => {
    await supabase.from('vacations').delete().eq('id', id);
    setVacations(prev => prev.filter(x => x.id !== id));
  }, []);

  // Documents
  const addDocument = useCallback(async (d: Omit<EmployeeDocument, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('employee_documents').insert({
      employee_id: d.employeeId, type: d.type, completed: d.completed, date: d.date, file_name: d.fileName,
    }).select().single();
    if (data) setDocuments(prev => [...prev, mapDoc(data)]);
  }, []);
  const updateDocument = useCallback(async (d: EmployeeDocument) => {
    await supabase.from('employee_documents').update({
      employee_id: d.employeeId, type: d.type, completed: d.completed, date: d.date, file_name: d.fileName,
    }).eq('id', d.id);
    setDocuments(prev => prev.map(x => x.id === d.id ? d : x));
  }, []);
  const deleteDocument = useCallback(async (id: string) => {
    await supabase.from('employee_documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(x => x.id !== id));
  }, []);

  // EPI
  const addEPIDelivery = useCallback(async (e: Omit<EPIDelivery, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('epi_deliveries').insert({
      employee_id: e.employeeId, epi_type: e.epiType, unit: e.unit, delivery_date: e.deliveryDate, quantity: e.quantity, notes: e.notes, file_name: e.fileName,
    }).select().single();
    if (data) setEPIDeliveries(prev => [...prev, mapEPI(data)]);
  }, []);
  const deleteEPIDelivery = useCallback(async (id: string) => {
    await supabase.from('epi_deliveries').delete().eq('id', id);
    setEPIDeliveries(prev => prev.filter(x => x.id !== id));
  }, []);

  // ASO
  const addASO = useCallback(async (a: Omit<ASO, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('asos').insert({
      employee_id: a.employeeId, type: a.type, exam_date: a.examDate, expiry_date: a.expiryDate, file_name: a.fileName,
    }).select().single();
    if (data) setASOs(prev => [...prev, mapASO(data)]);
  }, []);
  const updateASO = useCallback(async (a: ASO) => {
    await supabase.from('asos').update({
      employee_id: a.employeeId, type: a.type, exam_date: a.examDate, expiry_date: a.expiryDate, file_name: a.fileName,
    }).eq('id', a.id);
    setASOs(prev => prev.map(x => x.id === a.id ? a : x));
  }, []);
  const deleteASO = useCallback(async (id: string) => {
    await supabase.from('asos').delete().eq('id', id);
    setASOs(prev => prev.filter(x => x.id !== id));
  }, []);

  // Training
  const addTraining = useCallback(async (t: Omit<Training, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('trainings').insert({
      employee_id: t.employeeId, training_type: t.trainingType, training_date: t.trainingDate, expiry_date: t.expiryDate, file_name: t.fileName,
    }).select().single();
    if (data) setTrainings(prev => [...prev, mapTraining(data)]);
  }, []);
  const updateTraining = useCallback(async (t: Training) => {
    await supabase.from('trainings').update({
      employee_id: t.employeeId, training_type: t.trainingType, training_date: t.trainingDate, expiry_date: t.expiryDate, file_name: t.fileName,
    }).eq('id', t.id);
    setTrainings(prev => prev.map(x => x.id === t.id ? t : x));
  }, []);
  const deleteTraining = useCallback(async (id: string) => {
    await supabase.from('trainings').delete().eq('id', id);
    setTrainings(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <SafetyContext.Provider value={{
      charges, vacations, documents, epiDeliveries, asos, trainings, loading,
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