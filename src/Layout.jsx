import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Building2, FileText, Upload, Bell, BarChart3,
  Settings, LogOut, Menu, X, ChevronDown, Shield, User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard", roles: ["admin", "contador", "suporte"] },
  { name: "Empresas", icon: Building2, page: "Companies", roles: ["admin", "contador", "suporte"] },
  { name: "Documentos", icon: FileText, page: "Documents", roles: ["admin", "contador", "suporte", "empresa"] },
  { name: "Enviar Arquivos", icon: Upload, page: "DocumentUpload", roles: ["admin", "contador", "empresa"] },
  { name: "Notificações", icon: Bell, page: "Notifications", roles: ["admin", "contador", "suporte", "empresa"] },
  { name: "Relatórios", icon: BarChart3, page: "Reports", roles: ["admin", "contador"] },
  { name: "Configurações", icon: Settings, page: "Settings", roles: ["admin"] },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadNotifications = async () => {
      const notifs = await base44.entities.Notification.filter({ destinatario: user.email, lida: false });
      setUnreadCount(notifs.length);
    };
    loadNotifications();
  }, [user, currentPageName]);

  const userRole = user?.role || "empresa";
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getRoleLabel = (role) => {
    const labels = { admin: "Administrador", contador: "Contador", empresa: "Empresa", suporte: "Suporte" };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <style>{`
        :root {
          --primary: #1e3a5f;
          --primary-light: #2563eb;
          --accent: #0ea5e9;
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1729] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Portal do Contador</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Gestão Fiscal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.name}</span>
                  {item.page === "Notifications" && unreadCount > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0 h-5">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          {user && (
            <div className="p-4 border-t border-white/10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold">
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
                      <p className="text-[10px] text-slate-400">{getRoleLabel(userRole)}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))}>
                    <Settings className="w-4 h-4 mr-2" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <Link to={createPageUrl("Notifications")} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}