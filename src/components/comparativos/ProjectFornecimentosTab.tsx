import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ObraMaterialsTab, type ObraMaterial } from "@/components/comparativos/ObraMaterialsTab";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface ComparisonGroup {
  id: string;
  code: string;
  description: string;
}

interface Props {
  projectId: string;
}

export function ProjectFornecimentosTab({ projectId }: Props) {
  const [obraMaterials, setObraMaterials] = useState<ObraMaterial[]>([]);
  const [groups, setGroups] = useState<ComparisonGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const groupsRef = useRef<ComparisonGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [mRes, gRes, pRes] = await Promise.all([
        supabase.from("obra_materials").select("*").order("created_at"),
        supabase.from("purchase_comparisons").select("id, code, description").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name").order("name"),
      ]);
      if (mRes.data) setObraMaterials(mRes.data.map((m: any) => ({ id: m.id, code: m.code, description: m.description, unit: m.unit, quantity: Number(m.quantity), price: Number(m.price), purchase_group: m.purchase_group, linked_group_id: m.linked_group_id })));
      if (gRes.data) {
        const mapped = gRes.data.map((g: any) => ({ id: g.id, code: g.code, description: g.description }));
        setGroups(mapped);
        groupsRef.current = mapped;
      }
      if (pRes.data) setProjects(pRes.data.map((p: any) => ({ id: p.id, name: p.name })));
      setLoading(false);
    };
    load();
  }, [projectId]);

  const importObraMaterials = async (newItems: Omit<ObraMaterial, "id" | "linked_group_id">[]) => {
    const inserts = newItems.map((m) => ({ code: m.code, description: m.description, unit: m.unit, quantity: m.quantity, price: m.price, purchase_group: m.purchase_group }));
    const { data, error } = await supabase.from("obra_materials").insert(inserts).select();
    if (error) { toast.error("Erro ao importar materiais"); return; }
    if (data) {
      setObraMaterials((prev) => [...prev, ...data.map((m: any) => ({ id: m.id, code: m.code, description: m.description, unit: m.unit, quantity: Number(m.quantity), price: Number(m.price), purchase_group: m.purchase_group, linked_group_id: m.linked_group_id }))]);
      toast.success(`${data.length} materiais importados`);
    }
  };

  const unlinkMaterialFromGroup = async (material: ObraMaterial) => {
    if (!material.linked_group_id) return;
    const groupId = material.linked_group_id;
    await supabase.from("comparison_items").delete().eq("comparison_id", groupId).eq("code", material.code).eq("description", material.description);
    await supabase.from("obra_materials").update({ linked_group_id: null } as any).eq("id", material.id);
    setObraMaterials((prev) => prev.map((m) => m.id === material.id ? { ...m, linked_group_id: null } : m));
    const { count } = await supabase.from("comparison_items").select("id", { count: "exact", head: true }).eq("comparison_id", groupId);
    const linkedCount = obraMaterials.filter((m) => m.id !== material.id && m.linked_group_id === groupId).length;
    if ((count === 0 || count === null) && linkedCount === 0) {
      await supabase.from("comparison_suppliers").delete().eq("comparison_id", groupId);
      await supabase.from("purchase_comparisons").delete().eq("id", groupId);
      setGroups((prev) => { const next = prev.filter((g) => g.id !== groupId); groupsRef.current = next; return next; });
    }
  };

  const updateObraMaterialGroup = async (id: string, group: string) => {
    const material = obraMaterials.find((m) => m.id === id);
    if (!material) return;
    if (material.linked_group_id) { await unlinkMaterialFromGroup(material); }
    await supabase.from("obra_materials").update({ purchase_group: group } as any).eq("id", id);
    setObraMaterials((prev) => prev.map((m) => m.id === id ? { ...m, purchase_group: group, linked_group_id: null } : m));
  };

  const toggleObraMaterialLink = async (id: string, linked: boolean, _groupId: string | null) => {
    const material = obraMaterials.find((m) => m.id === id);
    if (!material) return;
    if (!linked) { await unlinkMaterialFromGroup(material); return; }
    if (!material.purchase_group) return;

    let targetGroup = groupsRef.current.find((g) => g.description.toUpperCase() === material.purchase_group.toUpperCase());
    if (!targetGroup) {
      const { data: allGroups } = await supabase.from("purchase_comparisons").select("id").eq("project_id", projectId);
      const code = `CMP${String((allGroups?.length || 0) + 1).padStart(4, "0")}`;
      const { data, error } = await supabase.from("purchase_comparisons").insert({ code, description: material.purchase_group, project_id: projectId }).select().single();
      if (error || !data) { toast.error("Erro ao criar comparativo"); return; }
      targetGroup = { id: data.id, code: data.code, description: data.description };
      groupsRef.current = [targetGroup, ...groupsRef.current];
      setGroups((prev) => [targetGroup!, ...prev]);
    }

    await supabase.from("obra_materials").update({ linked_group_id: targetGroup.id } as any).eq("id", id);
    setObraMaterials((prev) => prev.map((m) => m.id === id ? { ...m, linked_group_id: targetGroup!.id } : m));

    await supabase.from("comparison_items").insert({
      comparison_id: targetGroup.id, code: material.code, description: material.description, unit: material.unit, quantity: material.quantity, base_price: material.price,
    });

    toast.success(`Material vinculado ao comparativo "${targetGroup.description}"`);
  };

  const removeObraMaterial = async (id: string) => {
    await supabase.from("obra_materials").delete().eq("id", id);
    setObraMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Carregando...</div>;

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <ObraMaterialsTab
        materials={obraMaterials}
        groups={groups}
        onImport={importObraMaterials}
        onUpdateGroup={updateObraMaterialGroup}
        onToggleLink={toggleObraMaterialLink}
        onRemove={removeObraMaterial}
      />
    </div>
  );
}
