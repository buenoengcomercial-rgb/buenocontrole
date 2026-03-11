import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Supplier, Material, Purchase } from '@/types';

interface AppState {
  suppliers: Supplier[];
  materials: Material[];
  purchases: Purchase[];
  addSupplier: (s: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addMaterial: (m: Omit<Material, 'id' | 'createdAt'>) => void;
  updateMaterial: (m: Material) => void;
  deleteMaterial: (id: string) => void;
  addPurchase: (p: Omit<Purchase, 'id' | 'createdAt'>) => void;
  deletePurchase: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// Sample data
const SAMPLE_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'Materiais São Paulo Ltda', cnpj: '12.345.678/0001-90', phone: '(11) 3456-7890', email: 'contato@matsp.com.br', address: 'Rua Augusta, 1200 - São Paulo/SP', notes: 'Fornecedor principal de materiais elétricos', createdAt: '2024-01-15' },
  { id: '2', name: 'Hidráulica Central', cnpj: '98.765.432/0001-10', phone: '(11) 2345-6789', email: 'vendas@hidraulicacentral.com.br', address: 'Av. Brasil, 500 - Guarulhos/SP', notes: '', createdAt: '2024-02-01' },
  { id: '3', name: 'EPI Segurança Total', cnpj: '11.222.333/0001-44', phone: '(21) 9876-5432', email: 'comercial@episeg.com.br', address: 'Rua das Flores, 88 - Rio de Janeiro/RJ', notes: 'Entrega em até 3 dias úteis', createdAt: '2024-03-10' },
];

const SAMPLE_MATERIALS: Material[] = [
  { id: '1', name: 'Cabo Flexível 2.5mm', description: 'Cabo elétrico flexível 2.5mm², 750V', unit: 'Metro', category: 'Elétrico', notes: '', createdAt: '2024-01-20' },
  { id: '2', name: 'Tubo PVC 50mm', description: 'Tubo PVC soldável 50mm, barra 6m', unit: 'Peça', category: 'Hidráulico', notes: '', createdAt: '2024-01-22' },
  { id: '3', name: 'Cimento CP-II', description: 'Cimento Portland CP-II 50kg', unit: 'Kg', category: 'Construção', notes: 'Armazenar em local seco', createdAt: '2024-02-05' },
  { id: '4', name: 'Luva de Procedimento', description: 'Luva látex tamanho M, caixa c/ 100', unit: 'Caixa', category: 'EPI', notes: '', createdAt: '2024-02-10' },
  { id: '5', name: 'Papel A4', description: 'Papel sulfite A4 75g, resma 500 folhas', unit: 'Pacote', category: 'Escritório', notes: '', createdAt: '2024-03-01' },
];

const SAMPLE_PURCHASES: Purchase[] = [
  { id: '1', supplierId: '1', date: '2024-12-05', invoiceNumber: 'NF-001234', materialId: '1', quantity: 500, unitPrice: 2.80, totalPrice: 1400, taxType: 'ICMS', taxValue: 252, finalPrice: 1652, city: 'São Paulo', createdAt: '2024-12-05' },
  { id: '2', supplierId: '2', date: '2024-12-10', invoiceNumber: 'NF-005678', materialId: '2', quantity: 30, unitPrice: 45.90, totalPrice: 1377, taxType: 'ICMS', taxValue: 247.86, finalPrice: 1624.86, city: 'Guarulhos', createdAt: '2024-12-10' },
  { id: '3', supplierId: '1', date: '2025-01-08', invoiceNumber: 'NF-001890', materialId: '1', quantity: 200, unitPrice: 2.85, totalPrice: 570, taxType: 'ICMS', taxValue: 102.60, finalPrice: 672.60, city: 'São Paulo', createdAt: '2025-01-08' },
  { id: '4', supplierId: '3', date: '2025-01-15', invoiceNumber: 'NF-009012', materialId: '4', quantity: 10, unitPrice: 32.00, totalPrice: 320, taxType: 'PIS', taxValue: 5.28, finalPrice: 325.28, city: 'Rio de Janeiro', createdAt: '2025-01-15' },
  { id: '5', supplierId: '1', date: '2025-02-20', invoiceNumber: 'NF-002345', materialId: '3', quantity: 100, unitPrice: 38.50, totalPrice: 3850, taxType: 'ICMS', taxValue: 693, finalPrice: 4543, city: 'São Paulo', createdAt: '2025-02-20' },
  { id: '6', supplierId: '2', date: '2025-03-01', invoiceNumber: 'NF-006789', materialId: '2', quantity: 50, unitPrice: 44.00, totalPrice: 2200, taxType: 'IPI', taxValue: 220, finalPrice: 2420, city: 'Guarulhos', createdAt: '2025-03-01' },
  { id: '7', supplierId: '3', date: '2025-03-05', invoiceNumber: 'NF-009456', materialId: '5', quantity: 20, unitPrice: 24.90, totalPrice: 498, taxType: 'PIS', taxValue: 8.22, finalPrice: 506.22, city: 'Rio de Janeiro', createdAt: '2025-03-05' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(SAMPLE_SUPPLIERS);
  const [materials, setMaterials] = useState<Material[]>(SAMPLE_MATERIALS);
  const [purchases, setPurchases] = useState<Purchase[]>(SAMPLE_PURCHASES);

  const addSupplier = useCallback((s: Omit<Supplier, 'id' | 'createdAt'>) => {
    setSuppliers(prev => [...prev, { ...s, id: genId(), createdAt: now() }]);
  }, []);
  const updateSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x));
  }, []);
  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(x => x.id !== id));
  }, []);

  const addMaterial = useCallback((m: Omit<Material, 'id' | 'createdAt'>) => {
    setMaterials(prev => [...prev, { ...m, id: genId(), createdAt: now() }]);
  }, []);
  const updateMaterial = useCallback((m: Material) => {
    setMaterials(prev => prev.map(x => x.id === m.id ? m : x));
  }, []);
  const deleteMaterial = useCallback((id: string) => {
    setMaterials(prev => prev.filter(x => x.id !== id));
  }, []);

  const addPurchase = useCallback((p: Omit<Purchase, 'id' | 'createdAt'>) => {
    setPurchases(prev => [...prev, { ...p, id: genId(), createdAt: now() }]);
  }, []);
  const deletePurchase = useCallback((id: string) => {
    setPurchases(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ suppliers, materials, purchases, addSupplier, updateSupplier, deleteSupplier, addMaterial, updateMaterial, deleteMaterial, addPurchase, deletePurchase }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used within AppProvider');
  return ctx;
}
