import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Building2, FileText, Upload, Bell, BarChart3,
  Settings, LogOut, Menu, X, ChevronDown, Shield, Zap, Users, Download, CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b20f55fd3ef9a7984c9160/a79383218_logo.png";

const NAV_ITEMS = [
  { name: "Dashboard",      icon: LayoutDashboard, page: "Dashboard",      roles: ["admin", "contador", "suporte"] },
  { name: "Empresas",       icon: Building2,       page: "Companies",      roles: ["admin", "contador", "suporte"] },
  { name: "Documentos",     icon: FileText,        page: "Documents",      roles: ["admin", "contador", "suporte", "empresa"] },
  { name: "Enviar Arquivos",icon: Upload,          page: "DocumentUpload", roles: ["admin", "contador", "empresa"] },
  { name: "Notificações",   icon: Bell,            page: "Notifications",  roles: ["admin", "contador", "suporte", "empresa"] },
  { name: "Relatórios",     icon: BarChart3,       page: "Reports",        roles: ["admin", "contador"] },
  { name: "Meus Clientes",  icon: Users,           page: "MyClients",      roles: ["admin", "contador"] },
  { name: "Meus Documentos",icon: Download,        page: "Settings",       roles: ["contador"] },
  { name: "Cronograma",     icon: CalendarCheck,   page: "FiscalSchedule", path: "/FiscalSchedule", roles: ["admin", "contador"] },
  { name: "Agente Sync",    icon: Zap,             page: "SyncAgent",      roles: ["admin", "contador"] },
  { name: "Configurações",  icon: Settings,        page: "Settings",       roles: ["admin"] },
];

const getRoleLabel = (role) => ({ admin: "Administrador", contador: "Contador", empresa: "Empresa", suporte: "Suporte" }[role] || role);

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    base44.entities.Notification.filter({ destinatario: user.email, lida: false })
      .then(n => setUnreadCount(n.length)).catch(() => {});
  }, [user, currentPageName]);

  const knownRoles = ["admin", "contador", "suporte", "empresa"];
  const userRole = knownRoles.includes(user?.role) ? user.role : "empresa";
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen flex" style={{ background: "#060d1f" }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out`}
        style={{
          background: "linear-gradient(180deg, #080f24 0%, #060d1f 100%)",
          borderRight: "1px solid rgba(6,182,212,0.1)",
        }}
      >

        {/* Logo area */}
        <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <img
              src={LOGO_URL}
              alt="Exper Sistemas"
              className="h-9 w-auto"
              style={{ filter: "brightness(1.2) drop-shadow(0 0 8px rgba(6,182,212,0.4))" }}
            />
          </Link>
          <p className="text-[9px] text-cyan-500/60 uppercase tracking-[0.25em] mt-2 ml-0.5 font-mono">Portal Fiscal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.name + item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? "text-cyan-300"
                    : "text-slate-500 hover:text-slate-200"
                }`}
                style={isActive ? { background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.15)" } : { border: "1px solid transparent" }}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-full" />
                )}
                <item.icon className={`w-[17px] h-[17px] flex-shrink-0 transition-colors ${isActive ? "text-cyan-400" : "text-slate-600 group-hover:text-slate-300"}`} />
                <span className="truncate">{item.name}</span>
                {item.page === "Notifications" && unreadCount > 0 && (
                  <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center" style={{ background: "#ef4444", color: "white", border: "none" }}>
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {user.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{user.full_name || user.email}</p>
                    <p className="text-[10px] text-slate-600">{getRoleLabel(userRole)}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52" style={{ background: "#0d1b38", border: "1px solid rgba(6,182,212,0.15)", color: "white" }}>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))} className="text-slate-300 hover:text-white focus:text-white focus:bg-white/5">
                  <Settings className="w-4 h-4 mr-2 text-slate-500" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.06)" }} />
                <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Overlay mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 h-14"
          style={{ background: "rgba(6,13,31,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {/* Logo visible on mobile top bar */}
            <img src={LOGO_URL} alt="Exper" className="h-7 w-auto lg:hidden" style={{ filter: "brightness(1.2) drop-shadow(0 0 6px rgba(6,182,212,0.4))" }} />
          </div>

          <div className="flex items-center gap-2">
            {/* Current page label */}
            <span className="hidden sm:block text-xs text-slate-600 font-mono uppercase tracking-widest">{currentPageName}</span>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <Link to={createPageUrl("Notifications")} className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-200">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}