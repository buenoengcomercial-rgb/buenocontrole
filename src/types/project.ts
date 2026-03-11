export interface Project {
  id: string;
  name: string;
  client: string;
  city: string;
  address: string;
  responsible: string;
  startDate: string;
  expectedEndDate: string;
  contractValue: number;
  notes: string;
  createdAt: string;
}

export interface WorkAllocation {
  id: string;
  employeeId: string;
  projectId: string;
  date: string;
  worked: boolean;
  interior: boolean;
  createdAt: string;
}

export interface OutsourcedService {
  id: string;
  projectId: string;
  date: string;
  company: string;
  cnpj: string;
  description: string;
  value: number;
  invoiceNumber: string;
  fileName: string;
  createdAt: string;
}

export type ProjectDocType =
  | 'ART'
  | 'Projetos técnicos'
  | 'Projeto elétrico'
  | 'Projeto de incêndio'
  | 'Contratos com cliente'
  | 'Laudos técnicos'
  | 'PGR'
  | 'PCMSO'
  | 'Licenças'
  | 'Outros documentos';

export const PROJECT_DOC_TYPES: ProjectDocType[] = [
  'ART',
  'Projetos técnicos',
  'Projeto elétrico',
  'Projeto de incêndio',
  'Contratos com cliente',
  'Laudos técnicos',
  'PGR',
  'PCMSO',
  'Licenças',
  'Outros documentos',
];

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: ProjectDocType;
  description: string;
  documentDate: string;
  expiryDate: string;
  fileName: string;
  createdAt: string;
}
