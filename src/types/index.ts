export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  notes: string;
  createdAt: string;
}

export type TaxType = 'ICMS' | 'ISS' | 'IPI' | 'PIS' | 'COFINS' | 'Outro';

export interface Purchase {
  id: string;
  supplierId: string;
  date: string;
  invoiceNumber: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxType: TaxType;
  taxValue: number;
  finalPrice: number;
  city: string;
  createdAt: string;
}

export const UNITS = ['Metro', 'Peça', 'Caixa', 'Kg', 'Litro', 'Unidade', 'Pacote', 'Rolo', 'M²', 'M³', 'Par', 'Conjunto'] as const;

export const MATERIAL_CATEGORIES = [
  'Hidrante',
  'SPDA',
  'Alarme de emergência',
  'Sinalização',
  'Luminária de emergência',
  'Civil',
  'Bomba',
  'Comando',
  'Elétrica',
  'Hidráulica',
  'Ferramentas',
  'Fixação',
  'Tubulação',
  'Conexões',
  'Equipamentos',
  'Outros',
] as const;

export const CATEGORIES = ['Elétrico', 'Hidráulico', 'Construção', 'Escritório', 'Limpeza', 'EPI', 'Ferramentas', 'Outros'] as const;

export const TAX_TYPES: TaxType[] = ['ICMS', 'ISS', 'IPI', 'PIS', 'COFINS', 'Outro'];
