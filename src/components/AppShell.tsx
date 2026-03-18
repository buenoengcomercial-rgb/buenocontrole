import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, ShoppingCart, BarChart3, Menu, X, Users, CalendarDays, DollarSign, FileText, PieChart, Shield, HardHat, Palmtree, BookOpen, GraduationCap, Stethoscope, Building2, Wrench, Receipt, UserCog, ClipboardList, LogOut, FileCheck } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const allSections = [
  {
    title: 'Geral',
    adminOnly: true,
    links: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Obras',
    adminOnly: true,
    links: [
      { to: '/obras', label: 'Obras e Projetos', icon: Building2 },
      { to: '/obras/relatorios', label: 'Relatórios de Obras', icon: BarChart3 },
    ],
  },
  {
    title: 'Financeiro',
    adminOnly: true,
    links: [{ to: '/financeiro/das', label: 'DAS — Simples Nacional', icon: Receipt }],
  },
  {
    title: 'Compras',
    adminOnly: true,
    links: [
      { to: '/fornecedores', label: 'Fornecedores', icon: Truck },
      { to: '/materiais', label: 'Materiais', icon: Package },
      { to: '/compras', label: 'Compras', icon: ShoppingCart },
      { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  {
    title: 'Colaboradores',
    adminOnly: true,
    links: [
      { to: '/colaboradores/painel', label: 'Painel', icon: PieChart },
      { to: '/colaboradores', label: 'Colaboradores', icon: Users },
      { to: '/colaboradores/dias', label: 'Dias Trabalhados', icon: CalendarDays },
      { to: '/colaboradores/pagamentos', label: 'Pagamentos', icon: DollarSign },
      { to: '/colaboradores/encargos', label: 'Encargos', icon: Shield },
      { to: '/colaboradores/ferias', label: 'Férias', icon: Palmtree },
      { to: '/colaboradores/advertencias', label: 'Advertências', icon: ClipboardList },
      { to: '/colaboradores/relatorios', label: 'Relatórios', icon: FileText },
    ],
  },
  {
    title: 'Segurança & Docs',
    adminOnly: false,
    links: [
      { to: '/seguranca/documentacao', label: 'Documentação', icon: BookOpen },
      { to: '/seguranca/epi', label: 'Entrega de EPI', icon: HardHat },
      { to: '/seguranca/aso', label: 'ASO', icon: Stethoscope },
      { to: '/seguranca/treinamentos', label: 'Treinamentos', icon: GraduationCap },
    ],
  },
  {
    title: 'Administração',
    adminOnly: true,
    links: [
      { to: '/admin/usuarios', label: 'Usuários', icon: UserCog },
      { to: '/admin/logs', label: 'Registro de Ações', icon: ClipboardList },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, role, isAdmin, signOut } = useAuth();

  const sections = allSections.filter((s) => !s.adminOnly || isAdmin);

  const navContent = (onClickLink?: () => void) => (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">{section.title}</p>
          <div className="space-y-0.5">
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/' || link.to === '/colaboradores' || link.to === '/obras'}
                onClick={onClickLink}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 w-1.5 h-6 rounded-r-sm bg-sidebar-primary"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <link.icon className="w-[18px] h-[18px] shrink-0" />
                    {link.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar fixed inset-y-0 left-0 z-30">
        <div className="px-6 py-6">
          <h1 className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">Bueno Prev.Incêndio</h1>
          <p className="text-xs text-sidebar-foreground mt-0.5">Gestão de Engenharia</p>
        </div>
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-6">{navContent()}</nav>
        <div className="px-4 py-3 border-t border-sidebar-accent/30">
          <p className="text-xs text-sidebar-foreground truncate mb-1">{profile?.full_name || profile?.username}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />Sair
          </Button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar flex items-center px-4 z-40">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground hover:text-sidebar-accent-foreground p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="ml-3 text-sm font-semibold text-sidebar-accent-foreground">Bueno Prev.Incêndio</span>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 bg-foreground/50 z-40" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="lg:hidden fixed inset-y-0 left-0 w-60 bg-sidebar z-50">
              <div className="px-6 py-6">
                <h1 className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">Bueno Prev.Incêndio</h1>
              </div>
              <nav className="px-3 space-y-4 overflow-y-auto pb-6">{navContent(() => setMobileOpen(false))}</nav>
              <div className="px-4 py-3 border-t border-sidebar-accent/30">
                <p className="text-xs text-sidebar-foreground truncate mb-1">{profile?.full_name || profile?.username}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />Sair
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <div className="px-4 py-6 lg:px-12 lg:py-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
