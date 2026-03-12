import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { EmployeeProvider } from "@/context/EmployeeContext";
import { SafetyProvider } from "@/context/SafetyContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { AttachmentProvider } from "@/context/AttachmentContext";
import AppShell from "@/components/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import SuppliersPage from "@/pages/SuppliersPage";
import MaterialsPage from "@/pages/MaterialsPage";
import PurchasesPage from "@/pages/PurchasesPage";
import ReportsPage from "@/pages/ReportsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import WorkDaysPage from "@/pages/WorkDaysPage";
import PaymentsPage from "@/pages/PaymentsPage";
import EmployeeDashboardPage from "@/pages/EmployeeDashboardPage";
import EmployeeReportsPage from "@/pages/EmployeeReportsPage";
import EncargosPage from "@/pages/EncargosPage";
import FeriasPage from "@/pages/FeriasPage";
import DocumentacaoPage from "@/pages/DocumentacaoPage";
import EPIPage from "@/pages/EPIPage";
import ASOPage from "@/pages/ASOPage";
import TreinamentosPage from "@/pages/TreinamentosPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ProjectReportsPage from "@/pages/ProjectReportsPage";
import DASPage from "@/pages/DASPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <EmployeeProvider>
          <SafetyProvider>
            <ProjectProvider>
              <BrowserRouter>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/obras" element={<ProjectsPage />} />
                    <Route path="/obras/:id" element={<ProjectDetailPage />} />
                    <Route path="/obras/relatorios" element={<ProjectReportsPage />} />
                    <Route path="/financeiro/das" element={<DASPage />} />
                    <Route path="/fornecedores" element={<SuppliersPage />} />
                    <Route path="/materiais" element={<MaterialsPage />} />
                    <Route path="/compras" element={<PurchasesPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    <Route path="/colaboradores" element={<EmployeesPage />} />
                    <Route path="/colaboradores/painel" element={<EmployeeDashboardPage />} />
                    <Route path="/colaboradores/dias" element={<WorkDaysPage />} />
                    <Route path="/colaboradores/pagamentos" element={<PaymentsPage />} />
                    <Route path="/colaboradores/encargos" element={<EncargosPage />} />
                    <Route path="/colaboradores/ferias" element={<FeriasPage />} />
                    <Route path="/colaboradores/relatorios" element={<EmployeeReportsPage />} />
                    <Route path="/seguranca/documentacao" element={<DocumentacaoPage />} />
                    <Route path="/seguranca/epi" element={<EPIPage />} />
                    <Route path="/seguranca/aso" element={<ASOPage />} />
                    <Route path="/seguranca/treinamentos" element={<TreinamentosPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppShell>
              </BrowserRouter>
            </ProjectProvider>
          </SafetyProvider>
        </EmployeeProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
