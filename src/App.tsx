import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import AppShell from "@/components/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import SuppliersPage from "@/pages/SuppliersPage";
import MaterialsPage from "@/pages/MaterialsPage";
import PurchasesPage from "@/pages/PurchasesPage";
import ReportsPage from "@/pages/ReportsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/fornecedores" element={<SuppliersPage />} />
              <Route path="/materiais" element={<MaterialsPage />} />
              <Route path="/compras" element={<PurchasesPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
