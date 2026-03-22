import { useState } from "react";
import { ProjectComparativosTab } from "./ProjectComparativosTab";
import { ProjectFornecimentosTab } from "./ProjectFornecimentosTab";
import { Package, Scale } from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
}

export function ComparativosWrapper({ projectId, projectName }: Props) {
  const [activeTab, setActiveTab] = useState<"comparativos" | "fornecimentos">("comparativos");

  return (
    <div className="flex flex-col" style={{ minHeight: "70vh" }}>
      <div className="flex items-center gap-1 border-b border-border bg-card px-2">
        <button
          onClick={() => setActiveTab("fornecimentos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "fornecimentos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="h-4 w-4" />
          Fornecimentos da Obra
        </button>
        <button
          onClick={() => setActiveTab("comparativos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "comparativos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="rounded bg-primary/10 px-1.5 py-0.5">
            <span className="text-[10px] font-bold text-primary">CMP</span>
          </div>
          Comparativos — {projectName}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "fornecimentos" && <ProjectFornecimentosTab projectId={projectId} />}
        {activeTab === "comparativos" && <ProjectComparativosTab projectId={projectId} projectName={projectName} />}
      </div>
    </div>
  );
}
