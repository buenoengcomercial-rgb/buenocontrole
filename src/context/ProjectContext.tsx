import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Project, WorkAllocation, OutsourcedService, ProjectDocument, Measurement, DASExpense, ProjectPurchase } from '@/types/project';

interface ProjectState {
  projects: Project[];
  allocations: WorkAllocation[];
  outsourcedServices: OutsourcedService[];
  projectDocuments: ProjectDocument[];
  measurements: Measurement[];
  dasExpenses: DASExpense[];
  projectPurchases: ProjectPurchase[];
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
  return { id: r.id, projectId: r.project_id, type: r.type as ProjectDocument['type'], description: r.description, documentDate: r.document_date, expiryDate: r.expiry_date || '', fileName: r.file_name, createdAt: r.created_at };
}
function mapMeasurement(r: any): Measurement {
  return { id: r.id, projectId: r.project_id, number: r.number, date: r.date, description: r.description, value: Number(r.value), percentExecuted: Number(r.percent_executed), status: r.status as Measurement['status'], createdAt: r.created_at };
}
function mapDAS(r: any): DASExpense {
  return { id: r.id, month: r.month, dueDate: r.due_date, value: Number(r.value), paid: r.paid, createdAt: r.created_at };
}
function mapProjectPurchase(r: any): ProjectPurchase {
  return { id: r.id, projectId: r.project_id, supplierId: r.supplier_id, materialId: r.material_id, date: r.date, invoiceNumber: r.invoice_number, totalValue: Number(r.total_value), freightValue: Number(r.freight_value || 0), icmsValue: Number(r.icms_value || 0), description: r.description, notes: r.notes, createdAt: r.created_at };
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<WorkAllocation[]>([]);
  const [outsourcedServices, setOutsourcedServices] = useState<OutsourcedService[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [dasExpenses, setDASExpenses] = useState<DASExpense[]>([]);
  const [projectPurchases, setProjectPurchases] = useState<ProjectPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*').then(({ data }) => setProjects((data || []).map(mapProject))),
      supabase.from('work_allocations').select('*').then(({ data }) => setAllocations((data || []).map(mapAllocation))),
      supabase.from('outsourced_services').select('*').then(({ data }) => setOutsourcedServices((data || []).map(mapOutsourced))),
      supabase.from('project_documents').select('*').then(({ data }) => setProjectDocuments((data || []).map(mapProjectDoc))),
      supabase.from('measurements').select('*').then(({ data }) => setMeasurements((data || []).map(mapMeasurement))),
      supabase.from('das_expenses').select('*').then(({ data }) => setDASExpenses((data || []).map(mapDAS))),
      supabase.from('project_purchases').select('*').then(({ data }) => setProjectPurchases((data || []).map(mapProjectPurchase))),
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
    }).select().single();
    if (data) setProjectDocuments(prev => [...prev, mapProjectDoc(data)]);
  }, []);
  const updateProjectDocument = useCallback(async (d: ProjectDocument) => {
    await supabase.from('project_documents').update({
      project_id: d.projectId, type: d.type, description: d.description, document_date: d.documentDate,
      expiry_date: d.expiryDate || null, file_name: d.fileName,
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
      month: d.month, due_date: d.dueDate, value: d.value, paid: d.paid,
    }).select().single();
    if (data) setDASExpenses(prev => [...prev, mapDAS(data)]);
  }, []);
  const updateDASExpense = useCallback(async (d: DASExpense) => {
    await supabase.from('das_expenses').update({
      month: d.month, due_date: d.dueDate, value: d.value, paid: d.paid,
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
      date: p.date, invoice_number: p.invoiceNumber, total_value: p.totalValue,
      freight_value: p.freightValue || 0, icms_value: p.icmsValue || 0,
      description: p.description, notes: p.notes,
    }).select().single();
    if (data) setProjectPurchases(prev => [...prev, mapProjectPurchase(data)]);
  }, []);
  const updateProjectPurchase = useCallback(async (p: ProjectPurchase) => {
    await supabase.from('project_purchases').update({
      supplier_id: p.supplierId || null, material_id: p.materialId || null,
      date: p.date, invoice_number: p.invoiceNumber, total_value: p.totalValue,
      freight_value: p.freightValue || 0, icms_value: p.icmsValue || 0,
      description: p.description, notes: p.notes,
    }).eq('id', p.id);
    setProjectPurchases(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);
  const deleteProjectPurchase = useCallback(async (id: string) => {
    await supabase.from('project_purchases').delete().eq('id', id);
    setProjectPurchases(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, allocations, outsourcedServices, projectDocuments, measurements, dasExpenses, projectPurchases, loading,
      addProject, updateProject, deleteProject,
      addAllocation, deleteAllocation,
      addOutsourcedService, deleteOutsourcedService,
      addProjectDocument, updateProjectDocument, deleteProjectDocument,
      addMeasurement, updateMeasurement, deleteMeasurement,
      addDASExpense, updateDASExpense, deleteDASExpense,
      addProjectPurchase, deleteProjectPurchase,
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
