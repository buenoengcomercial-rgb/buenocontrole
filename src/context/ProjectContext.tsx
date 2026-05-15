import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Project, WorkAllocation, OutsourcedService, ProjectDocument, Measurement, DASExpense, ProjectPurchase, EquipmentRental } from '@/types/project';

interface ProjectState {
  projects: Project[];
  allocations: WorkAllocation[];
  outsourcedServices: OutsourcedService[];
  projectDocuments: ProjectDocument[];
  measurements: Measurement[];
  dasExpenses: DASExpense[];
  projectPurchases: ProjectPurchase[];
  equipmentRentals: EquipmentRental[];
  loading: boolean;
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (p: Project) => void;
  deleteProject: (id: string) => void;
  addAllocation: (a: Omit<WorkAllocation, 'id' | 'createdAt'>) => void;
  deleteAllocation: (id: string) => void;
  addOutsourcedService: (s: Omit<OutsourcedService, 'id' | 'createdAt'>) => void;
  deleteOutsourcedService: (id: string) => void;
  addProjectDocument: (d: Omit<ProjectDocument, 'id' | 'createdAt'>) => void;
  updateProjectDocument: (d: ProjectDocument) => void;
  deleteProjectDocument: (id: string) => void;
  addMeasurement: (m: Omit<Measurement, 'id' | 'createdAt'>) => void;
  updateMeasurement: (m: Measurement) => void;
  deleteMeasurement: (id: string) => void;
  addDASExpense: (d: Omit<DASExpense, 'id' | 'createdAt'>) => void;
  updateDASExpense: (d: DASExpense) => void;
  deleteDASExpense: (id: string) => void;
  addProjectPurchase: (p: Omit<ProjectPurchase, 'id' | 'createdAt'>) => void;
  updateProjectPurchase: (p: ProjectPurchase) => void;
  deleteProjectPurchase: (id: string) => void;
  addEquipmentRental: (r: Omit<EquipmentRental, 'id' | 'createdAt'>) => void;
  updateEquipmentRental: (r: EquipmentRental) => void;
  deleteEquipmentRental: (id: string) => void;
}

const ProjectContext = createContext<ProjectState | null>(null);

function mapProject(r: any): Project {
  return { id: r.id, name: r.name, client: r.client, city: r.city, address: r.address, responsible: r.responsible, startDate: r.start_date, expectedEndDate: r.expected_end_date, contractValue: Number(r.contract_value), notes: r.notes, createdAt: r.created_at };
}
function mapAllocation(r: any): WorkAllocation {
  return { id: r.id, employeeId: r.employee_id, projectId: r.project_id, date: r.date, worked: r.worked, interior: r.interior, createdAt: r.created_at };
}
function mapOutsourced(r: any): OutsourcedService {
  return { id: r.id, projectId: r.project_id, date: r.date, company: r.company, cnpj: r.cnpj, description: r.description, value: Number(r.value), invoiceNumber: r.invoice_number, fileName: r.file_name, createdAt: r.created_at };
}
function mapProjectDoc(r: any): ProjectDocument {
  return { id: r.id, projectId: r.project_id, type: r.type as ProjectDocument['type'], description: r.description, documentDate: r.document_date, expiryDate: r.expiry_date || '', fileName: r.file_name, value: Number(r.value || 0), paymentDate: r.payment_date || '', paymentStatus: r.payment_status || 'pendente', docNotes: r.doc_notes || '', createdAt: r.created_at };
}
function mapMeasurement(r: any): Measurement {
  return { id: r.id, projectId: r.project_id, number: r.number, date: r.date, description: r.description, value: Number(r.value), percentExecuted: Number(r.percent_executed), status: r.status as Measurement['status'], createdAt: r.created_at };
}
function mapDAS(r: any): DASExpense {
  return { id: r.id, month: r.month, dueDate: r.due_date, value: Number(r.value), paid: r.paid, projectId: r.project_id || null, createdAt: r.created_at };
}
function mapProjectPurchase(r: any): ProjectPurchase {
  return { id: r.id, projectId: r.project_id, supplierId: r.supplier_id, materialId: r.material_id, date: r.date, invoiceNumber: r.invoice_number, quantity: Number(r.quantity || 1), unitPrice: Number(r.unit_price || 0), totalValue: Number(r.total_value), freightValue: Number(r.freight_value || 0), icmsValue: Number(r.icms_value || 0), description: r.description, notes: r.notes, paymentMethod: r.payment_method || '', installments: r.installments || 1, firstInstallmentDate: r.first_installment_date || null, createdAt: r.created_at };
}
function mapEquipmentRental(r: any): EquipmentRental {
  return { id: r.id, projectId: r.project_id, equipmentName: r.equipment_name, equipmentType: r.equipment_type, supplier: r.supplier, billingType: r.billing_type, unitValue: Number(r.unit_value), quantity: Number(r.quantity), totalValue: Number(r.total_value), startDate: r.start_date, endDate: r.end_date || '', invoiceNumber: r.invoice_number, notes: r.notes, createdAt: r.created_at };
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<WorkAllocation[]>([]);
  const [outsourcedServices, setOutsourcedServices] = useState<OutsourcedService[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [dasExpenses, setDASExpenses] = useState<DASExpense[]>([]);
  const [projectPurchases, setProjectPurchases] = useState<ProjectPurchase[]>([]);
  const [equipmentRentals, setEquipmentRentals] = useState<EquipmentRental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*').then(({ data }) => setProjects((data || []).map(mapProject))),
      supabase.from('work_allocations').select('*').then(({ data }) => setAllocations((data || []).map(mapAllocation))),
      supabase.from('outsourced_services').select('*').then(({ data }) => setOutsourcedServices((data || []).map(mapOutsourced))),
      supabase.from('project_documents').select('*').then(({ data }) => setProjectDocuments((data || []).map(mapProjectDoc))),
      supabase.from('measurements').select('*').then(({ data }) => setMeasurements((data || []).map(mapMeasurement))),
      supabase.from('das_expenses').select('*').then(({ data }) => setDASExpenses((data || []).map(mapDAS))),
      supabase.from('project_purchases').select('*').order('created_at', { ascending: false }).then(({ data }) => setProjectPurchases((data || []).map(mapProjectPurchase))),
      supabase.from('equipment_rentals').select('*').then(({ data }) => setEquipmentRentals((data || []).map(mapEquipmentRental))),
    ]).finally(() => setLoading(false));
  }, []);

  const addProject = useCallback(async (p: Omit<Project, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('projects').insert({
      name: p.name, client: p.client, city: p.city, address: p.address, responsible: p.responsible,
      start_date: p.startDate, expected_end_date: p.expectedEndDate, contract_value: p.contractValue, notes: p.notes,
    }).select().single();
    if (data) setProjects(prev => [...prev, mapProject(data)]);
  }, []);
  const updateProject = useCallback(async (p: Project) => {
    await supabase.from('projects').update({
      name: p.name, client: p.client, city: p.city, address: p.address, responsible: p.responsible,
      start_date: p.startDate, expected_end_date: p.expectedEndDate, contract_value: p.contractValue, notes: p.notes,
    }).eq('id', p.id);
    setProjects(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);
  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(x => x.id !== id));
  }, []);

  const addAllocation = useCallback(async (a: Omit<WorkAllocation, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('work_allocations').insert({
      employee_id: a.employeeId, project_id: a.projectId, date: a.date, worked: a.worked, interior: a.interior,
    }).select().single();
    if (data) setAllocations(prev => [...prev, mapAllocation(data)]);
  }, []);
  const deleteAllocation = useCallback(async (id: string) => {
    await supabase.from('work_allocations').delete().eq('id', id);
    setAllocations(prev => prev.filter(x => x.id !== id));
  }, []);

  const addOutsourcedService = useCallback(async (s: Omit<OutsourcedService, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('outsourced_services').insert({
      project_id: s.projectId, date: s.date, company: s.company, cnpj: s.cnpj, description: s.description,
      value: s.value, invoice_number: s.invoiceNumber, file_name: s.fileName,
    }).select().single();
    if (data) setOutsourcedServices(prev => [...prev, mapOutsourced(data)]);
  }, []);
  const deleteOutsourcedService = useCallback(async (id: string) => {
    await supabase.from('outsourced_services').delete().eq('id', id);
    setOutsourcedServices(prev => prev.filter(x => x.id !== id));
  }, []);

  const addProjectDocument = useCallback(async (d: Omit<ProjectDocument, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('project_documents').insert({
      project_id: d.projectId, type: d.type, description: d.description, document_date: d.documentDate,
      expiry_date: d.expiryDate || null, file_name: d.fileName,
      value: d.value || 0, payment_date: d.paymentDate || null, payment_status: d.paymentStatus || 'pendente', doc_notes: d.docNotes || '',
    }).select().single();
    if (data) setProjectDocuments(prev => [...prev, mapProjectDoc(data)]);
  }, []);
  const updateProjectDocument = useCallback(async (d: ProjectDocument) => {
    await supabase.from('project_documents').update({
      project_id: d.projectId, type: d.type, description: d.description, document_date: d.documentDate,
      expiry_date: d.expiryDate || null, file_name: d.fileName,
      value: d.value || 0, payment_date: d.paymentDate || null, payment_status: d.paymentStatus || 'pendente', doc_notes: d.docNotes || '',
    }).eq('id', d.id);
    setProjectDocuments(prev => prev.map(x => x.id === d.id ? d : x));
  }, []);
  const deleteProjectDocument = useCallback(async (id: string) => {
    await supabase.from('project_documents').delete().eq('id', id);
    setProjectDocuments(prev => prev.filter(x => x.id !== id));
  }, []);

  const addMeasurement = useCallback(async (m: Omit<Measurement, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('measurements').insert({
      project_id: m.projectId, number: m.number, date: m.date, description: m.description,
      value: m.value, percent_executed: m.percentExecuted, status: m.status,
    }).select().single();
    if (data) setMeasurements(prev => [...prev, mapMeasurement(data)]);
  }, []);
  const updateMeasurement = useCallback(async (m: Measurement) => {
    await supabase.from('measurements').update({
      project_id: m.projectId, number: m.number, date: m.date, description: m.description,
      value: m.value, percent_executed: m.percentExecuted, status: m.status,
    }).eq('id', m.id);
    setMeasurements(prev => prev.map(x => x.id === m.id ? m : x));
  }, []);
  const deleteMeasurement = useCallback(async (id: string) => {
    await supabase.from('measurements').delete().eq('id', id);
    setMeasurements(prev => prev.filter(x => x.id !== id));
  }, []);

  const addDASExpense = useCallback(async (d: Omit<DASExpense, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('das_expenses').insert({
      month: d.month, due_date: d.dueDate, value: d.value, paid: d.paid, project_id: d.projectId || null,
    }).select().single();
    if (data) setDASExpenses(prev => [...prev, mapDAS(data)]);
  }, []);
  const updateDASExpense = useCallback(async (d: DASExpense) => {
    await supabase.from('das_expenses').update({
      month: d.month, due_date: d.dueDate, value: d.value, paid: d.paid, project_id: d.projectId || null,
    }).eq('id', d.id);
    setDASExpenses(prev => prev.map(x => x.id === d.id ? d : x));
  }, []);
  const deleteDASExpense = useCallback(async (id: string) => {
    await supabase.from('das_expenses').delete().eq('id', id);
    setDASExpenses(prev => prev.filter(x => x.id !== id));
  }, []);

  const addProjectPurchase = useCallback(async (p: Omit<ProjectPurchase, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('project_purchases').insert({
      project_id: p.projectId, supplier_id: p.supplierId || null, material_id: p.materialId || null,
      date: p.date, invoice_number: p.invoiceNumber, quantity: p.quantity || 1, unit_price: p.unitPrice || 0,
      total_value: p.totalValue, freight_value: p.freightValue || 0, icms_value: p.icmsValue || 0,
      description: p.description, notes: p.notes,
      payment_method: p.paymentMethod || '', installments: p.installments || 1,
    }).select().single();
    if (data) setProjectPurchases(prev => [mapProjectPurchase(data), ...prev]);
  }, []);
  const updateProjectPurchase = useCallback(async (p: ProjectPurchase) => {
    await supabase.from('project_purchases').update({
      supplier_id: p.supplierId || null, material_id: p.materialId || null,
      date: p.date, invoice_number: p.invoiceNumber, quantity: p.quantity || 1, unit_price: p.unitPrice || 0,
      total_value: p.totalValue, freight_value: p.freightValue || 0, icms_value: p.icmsValue || 0,
      description: p.description, notes: p.notes,
      payment_method: p.paymentMethod || '', installments: p.installments || 1,
    }).eq('id', p.id);
    setProjectPurchases(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);
  const deleteProjectPurchase = useCallback(async (id: string) => {
    await supabase.from('project_purchases').delete().eq('id', id);
    setProjectPurchases(prev => prev.filter(x => x.id !== id));
  }, []);

  const addEquipmentRental = useCallback(async (r: Omit<EquipmentRental, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('equipment_rentals').insert({
      project_id: r.projectId, equipment_name: r.equipmentName, equipment_type: r.equipmentType,
      supplier: r.supplier, billing_type: r.billingType, unit_value: r.unitValue,
      quantity: r.quantity, total_value: r.totalValue, start_date: r.startDate,
      end_date: r.endDate || null, invoice_number: r.invoiceNumber, notes: r.notes,
    }).select().single();
    if (data) setEquipmentRentals(prev => [...prev, mapEquipmentRental(data)]);
  }, []);
  const updateEquipmentRental = useCallback(async (r: EquipmentRental) => {
    await supabase.from('equipment_rentals').update({
      equipment_name: r.equipmentName, equipment_type: r.equipmentType,
      supplier: r.supplier, billing_type: r.billingType, unit_value: r.unitValue,
      quantity: r.quantity, total_value: r.totalValue, start_date: r.startDate,
      end_date: r.endDate || null, invoice_number: r.invoiceNumber, notes: r.notes,
    }).eq('id', r.id);
    setEquipmentRentals(prev => prev.map(x => x.id === r.id ? r : x));
  }, []);
  const deleteEquipmentRental = useCallback(async (id: string) => {
    await supabase.from('equipment_rentals').delete().eq('id', id);
    setEquipmentRentals(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, allocations, outsourcedServices, projectDocuments, measurements, dasExpenses, projectPurchases, equipmentRentals, loading,
      addProject, updateProject, deleteProject,
      addAllocation, deleteAllocation,
      addOutsourcedService, deleteOutsourcedService,
      addProjectDocument, updateProjectDocument, deleteProjectDocument,
      addMeasurement, updateMeasurement, deleteMeasurement,
      addDASExpense, updateDASExpense, deleteDASExpense,
      addProjectPurchase, updateProjectPurchase, deleteProjectPurchase,
      addEquipmentRental, updateEquipmentRental, deleteEquipmentRental,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectData() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectData must be used within ProjectProvider');
  return ctx;
}
