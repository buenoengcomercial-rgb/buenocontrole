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
  value: number;
  paymentDate: string;
  paymentStatus: 'pago' | 'pendente';
  docNotes: string;
  createdAt: string;
}

export type MeasurementStatus = 'pendente' | 'enviada' | 'aprovada' | 'paga';

export const MEASUREMENT_STATUSES: { value: MeasurementStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'paga', label: 'Paga' },
];

export interface Measurement {
  id: string;
  projectId: string;
  number: number;
  date: string;
  description: string;
  value: number;
  percentExecuted: number;
  status: MeasurementStatus;
  createdAt: string;
}

export interface DASExpense {
  id: string;
  month: string; // YYYY-MM
  dueDate: string;
  value: number;
  paid: boolean;
  createdAt: string;
}

export interface ProjectPurchase {
  id: string;
  projectId: string;
  supplierId: string | null;
  materialId: string | null;
  date: string;
  invoiceNumber: string;
  totalValue: number;
  freightValue: number;
  icmsValue: number;
  description: string;
  notes: string;
  createdAt: string;
}
