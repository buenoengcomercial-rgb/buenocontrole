import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Project, WorkAllocation, OutsourcedService, ProjectDocument } from '@/types/project';

interface ProjectState {
  projects: Project[];
  allocations: WorkAllocation[];
  outsourcedServices: OutsourcedService[];
  projectDocuments: ProjectDocument[];
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
}

const ProjectContext = createContext<ProjectState | null>(null);
const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Edifício Residencial Horizonte',
    client: 'Construtora ABC',
    city: 'São Paulo',
    address: 'Av. Paulista, 1500',
    responsible: 'João Silva',
    startDate: '2025-01-15',
    expectedEndDate: '2025-12-30',
    contractValue: 850000,
    notes: 'Instalações elétricas e hidráulicas',
    createdAt: '2025-01-10',
  },
  {
    id: 'p2',
    name: 'Subestação Industrial Beta',
    client: 'Indústria Beta S/A',
    city: 'Guarulhos',
    address: 'Rod. Presidente Dutra, km 220',
    responsible: 'Maria Santos',
    startDate: '2025-02-01',
    expectedEndDate: '2025-08-15',
    contractValue: 320000,
    notes: 'Montagem de subestação 13.8kV',
    createdAt: '2025-01-25',
  },
];

const SAMPLE_ALLOCATIONS: WorkAllocation[] = (() => {
  const allocs: WorkAllocation[] = [];
  let id = 1;
  for (let d = 3; d <= 7; d++) {
    const date = `2025-03-${String(d).padStart(2, '0')}`;
    allocs.push({ id: String(id++), employeeId: '1', projectId: 'p1', date, worked: true, interior: false, createdAt: now() });
    allocs.push({ id: String(id++), employeeId: '2', projectId: 'p1', date, worked: true, interior: false, createdAt: now() });
    allocs.push({ id: String(id++), employeeId: '3', projectId: 'p2', date, worked: true, interior: true, createdAt: now() });
  }
  return allocs;
})();

const SAMPLE_OUTSOURCED: OutsourcedService[] = [
  { id: 'o1', projectId: 'p1', date: '2025-03-05', company: 'Terraplanagem Rápida', cnpj: '55.666.777/0001-88', description: 'Serviço de escavação', value: 15000, invoiceNumber: 'NF-T001', fileName: '', createdAt: now() },
];

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
  const [allocations, setAllocations] = useState<WorkAllocation[]>(SAMPLE_ALLOCATIONS);
  const [outsourcedServices, setOutsourcedServices] = useState<OutsourcedService[]>(SAMPLE_OUTSOURCED);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);

  const addProject = useCallback((p: Omit<Project, 'id' | 'createdAt'>) => {
    setProjects(prev => [...prev, { ...p, id: genId(), createdAt: now() }]);
  }, []);
  const updateProject = useCallback((p: Project) => {
    setProjects(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);
  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(x => x.id !== id));
  }, []);

  const addAllocation = useCallback((a: Omit<WorkAllocation, 'id' | 'createdAt'>) => {
    setAllocations(prev => [...prev, { ...a, id: genId(), createdAt: now() }]);
  }, []);
  const deleteAllocation = useCallback((id: string) => {
    setAllocations(prev => prev.filter(x => x.id !== id));
  }, []);

  const addOutsourcedService = useCallback((s: Omit<OutsourcedService, 'id' | 'createdAt'>) => {
    setOutsourcedServices(prev => [...prev, { ...s, id: genId(), createdAt: now() }]);
  }, []);
  const deleteOutsourcedService = useCallback((id: string) => {
    setOutsourcedServices(prev => prev.filter(x => x.id !== id));
  }, []);

  const addProjectDocument = useCallback((d: Omit<ProjectDocument, 'id' | 'createdAt'>) => {
    setProjectDocuments(prev => [...prev, { ...d, id: genId(), createdAt: now() }]);
  }, []);
  const updateProjectDocument = useCallback((d: ProjectDocument) => {
    setProjectDocuments(prev => prev.map(x => x.id === d.id ? d : x));
  }, []);
  const deleteProjectDocument = useCallback((id: string) => {
    setProjectDocuments(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, allocations, outsourcedServices, projectDocuments,
      addProject, updateProject, deleteProject,
      addAllocation, deleteAllocation,
      addOutsourcedService, deleteOutsourcedService,
      addProjectDocument, updateProjectDocument, deleteProjectDocument,
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
