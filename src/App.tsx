import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { EmployeeProvider } from "@/context/EmployeeContext";
import { SafetyProvider } from "@/context/SafetyContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { AttachmentProvider } from "@/context/AttachmentContext";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
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
import UsersPage from "@/pages/UsersPage";
import AuditLogPage from "@/pages/AuditLogPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, role, isAdmin } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}

function SafetyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Both admin and seguranca_docs can access safety routes
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, role } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // seguranca_docs users can only access safety routes
  if (role === 'seguranca_docs') {
    return (
      <AppShell>
        <Routes>
          <Route path="/seguranca/documentacao" element={<DocumentacaoPage />} />
          <Route path="/seguranca/epi" element={<EPIPage />} />
          <Route path="/seguranca/aso" element={<ASOPage />} />
          <Route path="/seguranca/treinamentos" element={<TreinamentosPage />} />
          <Route path="*" element={<Navigate to="/seguranca/documentacao" replace />} />
        </Routes>
      </AppShell>
    );
  }

  return (
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
        <Route path="/admin/usuarios" element={<UsersPage />} />
        <Route path="/admin/logs" element={<AuditLogPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <EmployeeProvider>
              <SafetyProvider>
                <ProjectProvider>
                  <AttachmentProvider>
                    <AppRoutes />
                  </AttachmentProvider>
                </ProjectProvider>
              </SafetyProvider>
            </EmployeeProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
