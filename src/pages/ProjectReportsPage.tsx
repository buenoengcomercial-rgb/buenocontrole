import { useMemo, useState } from 'react';
import { useProjectData } from '@/context/ProjectContext';
import { useEmployeeData } from '@/context/EmployeeContext';
import { useAppData } from '@/context/AppContext';
import { useSafetyData } from '@/context/SafetyContext';
import { formatCurrency } from '@/lib/format';
import { Download } from 'lucide-react';

export default function ProjectReportsPage() {
  const { projects, allocations, outsourcedServices } = useProjectData();
  const { employees } = useEmployeeData();
  const { purchases } = useAppData();
  const { charges } = useSafetyData();
  const [selectedProject, setSelectedProject] = useState('');

  const projectCosts = useMemo(() => {
    return projects.map(p => {
      const projAllocations = allocations.filter(a => a.projectId === p.id && a.worked);
      const projPurchases = purchases.filter(pu => pu.city === p.city);
      const projOutsourced = outsourcedServices.filter(s => s.projectId === p.id);

      const materialCost = projPurchases.reduce((s, pu) => s + pu.finalPrice, 0);
      const outsourcedCost = projOutsourced.reduce((s, sv) => s + sv.value, 0);

      let laborCost = 0;
      projAllocations.forEach(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        if (!emp) return;
        const month = a.date.slice(0, 7);
        const empCharges = charges.filter(c => c.employeeId === a.employeeId && c.month === month);
        const monthlyCharges = empCharges.reduce((s, c) => s + c.inssValue + c.fgtsValue, 0);
        laborCost += (emp.grossSalary + monthlyCharges) / 22;
      });

      const totalCost = materialCost + laborCost + outsourcedCost;
      const profit = p.contractValue - totalCost;

      return { ...p, materialCost, laborCost, outsourcedCost, totalCost, profit, workerCount: new Set(projAllocations.map(a => a.employeeId)).size };
    });
  }, [projects, allocations, purchases, outsourcedServices, employees, charges]);

  const exportCSV = () => {
    const headers = ['Obra', 'Cliente', 'Contrato', 'Materiais', 'Mão de Obra', 'Terceirizados', 'Custo Total', 'Lucro'];
    const rows = projectCosts.map(p => [p.name, p.client, p.contractValue, p.materialCost, p.laborCost, p.outsourcedCost, p.totalCost, p.profit].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio_obras.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Relatórios de Obras</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="label-caps text-left px-4 py-3">Obra</th>
              <th className="label-caps text-left px-4 py-3">Cliente</th>
              <th className="label-caps text-right px-4 py-3">Contrato</th>
              <th className="label-caps text-right px-4 py-3">Materiais</th>
              <th className="label-caps text-right px-4 py-3">Mão de Obra</th>
              <th className="label-caps text-right px-4 py-3">Terceiriz.</th>
              <th className="label-caps text-right px-4 py-3">Custo Total</th>
              <th className="label-caps text-right px-4 py-3">Lucro</th>
              <th className="label-caps text-center px-4 py-3">Colab.</th>
            </tr>
          </thead>
          <tbody>
            {projectCosts.map(p => (
              <tr key={p.id} className="border-b border-border hover:bg-row-hover transition-colors">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.client}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.contractValue)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.materialCost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.laborCost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.outsourcedCost)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.totalCost)}</td>
                <td className={`px-4 py-3 text-right font-bold ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(p.profit)}</td>
                <td className="px-4 py-3 text-center">{p.workerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
