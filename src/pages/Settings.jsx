import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, UserPlus, Settings as SettingsIcon, Cpu, Database, Zap, CheckCircle, Pencil } from "lucide-react";
import ContadorPanel from "../components/settings/ContadorPanel";

const roleBadge = {
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  contador: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  empresa: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suporte: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};
const roleLabel = { admin: "Administrador", contador: "Contador", empresa: "Empresa", suporte: "Suporte" };

const roleIcon = { admin: "🔴", contador: "🔵", empresa: "🟢", suporte: "🟣" };

function AdminPanel({ users, onInvite, onEditRole }) {
  const stats = [
    { label: "Total Usuários", value: users.length, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Admins", value: users.filter(u => u.role === "admin").length, icon: Shield, color: "from-red-500 to-pink-500" },
    { label: "Contadores", value: users.filter(u => u.role === "contador").length, icon: Cpu, color: "from-violet-500 to-purple-500" },
    { label: "Empresas", value: users.filter(u => u.role === "empresa").length, icon: Database, color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1729] via-[#1a2744] to-[#0f2d4a]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(99,179,237,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] uppercase tracking-widest">Admin</Badge>
            </div>
            <h1 className="text-3xl font-bold text-white mt-3">Painel Administrativo</h1>
            <p className="text-slate-400 mt-1 text-sm">Gerencie usuários, permissões e configurações do sistema</p>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow group">
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.color}`} />
              <div className="p-5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Users Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Usuários do Sistema</h2>
              <p className="text-[11px] text-slate-400">{users.length} usuários cadastrados</p>
            </div>
          </div>
          <Button onClick={onInvite} size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 hover:opacity-90 shadow-md shadow-blue-500/20">
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Convidar
          </Button>
        </div>

        <div className="divide-y divide-slate-50">
          <AnimatePresence>
            {users.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0 group-hover:from-blue-100 group-hover:to-cyan-100 group-hover:text-blue-700 transition-all">
                  {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || "—"}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] font-semibold ${roleBadge[u.role] || ""}`}>
                  {roleIcon[u.role]} {roleLabel[u.role] || u.role}
                </Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onEditRole(u)}>
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* System Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Cpu, label: "Versão do Sistema", value: "v1.0.0", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50" },
          { icon: Database, label: "Documentos Suportados", value: "NF-e, NFC-e, CT-e, NFS-e", color: "from-violet-500 to-purple-500", bg: "bg-violet-50" },
          { icon: Zap, label: "Agente Desktop", value: "Windows • Linux • macOS", color: "from-amber-500 to-orange-500", bg: "bg-amber-50" },
        ].map((item, i) => (
          <div key={item.label} className={`rounded-2xl ${item.bg} border border-slate-200/60 p-5 flex items-center gap-4`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm`}>
              <item.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("empresa");
  const [inviting, setInviting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editRoleUser, setEditRoleUser] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setCurrentUser(me);
      if (me?.role === "admin") {
        const u = await base44.entities.User.list("-created_date", 100);
        setUsers(u);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleEditRole = async () => {
    if (!editRoleUser || !editRoleValue) return;
    setSavingRole(true);
    await base44.entities.User.update(editRoleUser.id, { role: editRoleValue });
    toast.success(`Perfil de ${editRoleUser.full_name || editRoleUser.email} atualizado para ${roleLabel[editRoleValue] || editRoleValue}`);
    setSavingRole(false);
    setEditRoleUser(null);
    const u = await base44.entities.User.list("-created_date", 100);
    setUsers(u);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail("");
    setInviting(false);
    setInviteOpen(false);
  };

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );

  if (currentUser?.role !== "admin") {
    return (
      <div className="space-y-6">
        <ContadorPanel user={currentUser} />
      </div>
    );
  }

  return (
    <>
      <AdminPanel users={users} onInvite={() => setInviteOpen(true)} onEditRole={(u) => { setEditRoleUser(u); setEditRoleValue(u.role || "empresa"); }} />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-0 shadow-2xl">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-50 to-white -z-10" />
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-lg font-bold">Convidar Usuário</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com" className="rounded-xl border-slate-200 focus:border-blue-400" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Perfil</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🔴 Administrador</SelectItem>
                  <SelectItem value="contador">🔵 Contador</SelectItem>
                  <SelectItem value="empresa">🟢 Empresa</SelectItem>
                  <SelectItem value="suporte">🟣 Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 hover:opacity-90 rounded-xl shadow-md shadow-blue-500/20">
              {inviting ? "Enviando..." : <><CheckCircle className="w-4 h-4 mr-1.5" /> Enviar Convite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}