import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Supplier, Material, Purchase } from '@/types';

interface AppState {
  suppliers: Supplier[];
  materials: Material[];
  purchases: Purchase[];
  loading: boolean;
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

function mapSupplier(r: any): Supplier {
  return { id: r.id, name: r.name, cnpj: r.cnpj, phone: r.phone, email: r.email, address: r.address, notes: r.notes, createdAt: r.created_at };
}
function mapMaterial(r: any): Material {
  return { id: r.id, name: r.name, description: r.description, unit: r.unit, category: r.category, notes: r.notes, createdAt: r.created_at };
}
function mapPurchase(r: any): Purchase {
  return { id: r.id, supplierId: r.supplier_id, date: r.date, invoiceNumber: r.invoice_number, materialId: r.material_id, quantity: Number(r.quantity), unitPrice: Number(r.unit_price), totalPrice: Number(r.total_price), taxType: r.tax_type, taxValue: Number(r.tax_value), finalPrice: Number(r.final_price), city: r.city, createdAt: r.created_at };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('suppliers').select('*').then(({ data }) => setSuppliers((data || []).map(mapSupplier))),
      supabase.from('materials').select('*').then(({ data }) => setMaterials((data || []).map(mapMaterial))),
      supabase.from('purchases').select('*').then(({ data }) => setPurchases((data || []).map(mapPurchase))),
    ]).finally(() => setLoading(false));
  }, []);

  const addSupplier = useCallback(async (s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('suppliers').insert({ name: s.name, cnpj: s.cnpj, phone: s.phone, email: s.email, address: s.address, notes: s.notes }).select().single();
    if (data) setSuppliers(prev => [...prev, mapSupplier(data)]);
  }, []);
  const updateSupplier = useCallback(async (s: Supplier) => {
    await supabase.from('suppliers').update({ name: s.name, cnpj: s.cnpj, phone: s.phone, email: s.email, address: s.address, notes: s.notes }).eq('id', s.id);
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x));
  }, []);
  const deleteSupplier = useCallback(async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    setSuppliers(prev => prev.filter(x => x.id !== id));
  }, []);

  const addMaterial = useCallback(async (m: Omit<Material, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('materials').insert({ name: m.name, description: m.description, unit: m.unit, category: m.category, notes: m.notes }).select().single();
    if (data) setMaterials(prev => [...prev, mapMaterial(data)]);
  }, []);
  const updateMaterial = useCallback(async (m: Material) => {
    await supabase.from('materials').update({ name: m.name, description: m.description, unit: m.unit, category: m.category, notes: m.notes }).eq('id', m.id);
    setMaterials(prev => prev.map(x => x.id === m.id ? m : x));
  }, []);
  const deleteMaterial = useCallback(async (id: string) => {
    await supabase.from('materials').delete().eq('id', id);
    setMaterials(prev => prev.filter(x => x.id !== id));
  }, []);

  const addPurchase = useCallback(async (p: Omit<Purchase, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('purchases').insert({
      supplier_id: p.supplierId, date: p.date, invoice_number: p.invoiceNumber, material_id: p.materialId,
      quantity: p.quantity, unit_price: p.unitPrice, total_price: p.totalPrice, tax_type: p.taxType,
      tax_value: p.taxValue, final_price: p.finalPrice, city: p.city,
    }).select().single();
    if (data) setPurchases(prev => [...prev, mapPurchase(data)]);
  }, []);
  const deletePurchase = useCallback(async (id: string) => {
    await supabase.from('purchases').delete().eq('id', id);
    setPurchases(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ suppliers, materials, purchases, loading, addSupplier, updateSupplier, deleteSupplier, addMaterial, updateMaterial, deleteMaterial, addPurchase, deletePurchase }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used within AppProvider');
  return ctx;
}
