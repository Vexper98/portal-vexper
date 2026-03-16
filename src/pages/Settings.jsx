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
import { motion } from "framer-motion";
import {
  Users, Shield, UserPlus, Cpu, Database, Zap,
  CheckCircle, Pencil, TrendingUp, Activity, Lock, Globe
} from "lucide-react";
import ContadorPanel from "../components/settings/ContadorPanel";

const roleBadge = {
  admin: "bg-red-500/15 text-red-500 border-red-500/30",
  contador: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  empresa: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  suporte: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};
const roleLabel = { admin: "Administrador", contador: "Contador", empresa: "Empresa", suporte: "Suporte" };
const roleIcon = { admin: "🔴", contador: "🔵", empresa: "🟢", suporte: "🟣" };

const roleAvatarGradient = {
  admin: "from-red-500 to-rose-600",
  contador: "from-blue-500 to-cyan-600",
  empresa: "from-emerald-500 to-teal-600",
  suporte: "from-purple-500 to-violet-600",
};

function FloatingParticle({ delay, x, y }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [-8, 8, -8], opacity: [0.2, 0.7, 0.2] }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay }}
    />
  );
}

function AdminPanel({ users, onInvite, onEditRole }) {
  const stats = [
    { label: "Total Usuários", value: users.length, icon: Users, color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/20", light: "bg-blue-50", text: "text-blue-600" },
    { label: "Administradores", value: users.filter(u => u.role === "admin").length, icon: Shield, color: "from-red-500 to-rose-600", shadow: "shadow-red-500/20", light: "bg-red-50", text: "text-red-600" },
    { label: "Contadores", value: users.filter(u => u.role === "contador").length, icon: Cpu, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", light: "bg-violet-50", text: "text-violet-600" },
    { label: "Empresas", value: users.filter(u => u.role === "empresa").length, icon: Database, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20", light: "bg-emerald-50", text: "text-emerald-600" },
  ];

  const particles = [
    { delay: 0, x: 10, y: 20 }, { delay: 0.5, x: 20, y: 60 }, { delay: 1, x: 35, y: 30 },
    { delay: 1.5, x: 55, y: 70 }, { delay: 0.8, x: 70, y: 25 }, { delay: 1.2, x: 85, y: 55 },
    { delay: 0.3, x: 90, y: 80 }, { delay: 1.8, x: 45, y: 85 },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px]">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f2e] via-[#0f1f4a] to-[#091830]" style={{ opacity: 0.93 }} />
        {/* Animated mesh */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,179,237,0.8) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        {/* Glow orbs */}
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-0 right-10 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl -translate-y-1/2" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          className="absolute bottom-0 left-20 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl translate-y-1/2" />
        {/* Particles */}
        {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}

        <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-4">
              <motion.div whileHover={{ rotate: 15, scale: 1.1 }} transition={{ type: "spring" }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-blue-500/40">
                <Shield className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] uppercase tracking-[0.15em] px-2.5">
                  ⚡ Sistema Administrativo
                </Badge>
                <p className="text-slate-400 text-xs mt-1">Acesso total ao sistema</p>
              </div>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight">
              Painel <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Admin</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-md">
              Gerencie usuários, permissões e configurações do sistema com total controle e visibilidade.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="flex gap-3 flex-wrap justify-end">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center min-w-[80px] hover:bg-white/10 transition-colors cursor-default">
                <p className={`text-2xl font-black ${s.text.replace("text-", "text-")} text-white`}>{s.value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{s.label.split(" ")[0]}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 200 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <div className={`relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-sm hover:shadow-lg ${s.shadow} transition-all cursor-default group`}>
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md ${s.shadow} group-hover:scale-110 transition-transform`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <p className="text-3xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Users Table */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-3xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="relative px-6 py-5 border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-blue-50/30 to-white" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Usuários do Sistema</h2>
                <p className="text-xs text-slate-400">{users.length} usuários cadastrados</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={onInvite} size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:opacity-90 shadow-lg shadow-blue-500/25 rounded-xl px-4">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Convidar Usuário
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="divide-y divide-slate-50/80 px-2 py-2">
            {users.map((u, i) => (
              <motion.div key={u.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50/80 transition-all group cursor-default">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleAvatarGradient[u.role] || "from-slate-400 to-slate-500"} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm`}>
                  {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || "—"}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] font-bold px-2.5 py-0.5 ${roleBadge[u.role] || "bg-slate-100 text-slate-500"}`}>
                  {roleIcon[u.role]} {roleLabel[u.role] || u.role}
                </Badge>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button size="icon" variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => onEditRole(u)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              </motion.div>
            ))}
        </div>
      </motion.div>

      {/* System Info Cards */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Cpu, label: "Versão do Sistema", value: "v1.0.0 — Produção",
            color: "from-blue-500 to-indigo-600", bg: "from-blue-50 to-indigo-50/50", border: "border-blue-200/60",
            img: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&q=60",
            badge: "Estável", badgeColor: "bg-blue-100 text-blue-700"
          },
          {
            icon: Database, label: "Documentos Suportados", value: "NF-e • NFC-e • CT-e • NFS-e",
            color: "from-violet-500 to-purple-600", bg: "from-violet-50 to-purple-50/50", border: "border-violet-200/60",
            img: "https://images.unsplash.com/photo-1568234928966-359c35dd8327?w=400&q=60",
            badge: "4 tipos", badgeColor: "bg-violet-100 text-violet-700"
          },
          {
            icon: Zap, label: "Agente Desktop", value: "Windows • Linux • macOS",
            color: "from-amber-500 to-orange-500", bg: "from-amber-50 to-orange-50/50", border: "border-amber-200/60",
            img: "https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=400&q=60",
            badge: "Multi-plataforma", badgeColor: "bg-amber-100 text-amber-700"
          },
        ].map((item, i) => (
          <motion.div key={item.label} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}
            className={`relative rounded-2xl bg-gradient-to-br ${item.bg} border ${item.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
            <div className="absolute right-0 top-0 w-28 h-28 opacity-10 overflow-hidden rounded-bl-3xl">
              <img src={item.img} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-5 relative">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md mb-4`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">{item.label}</p>
              <p className="text-sm font-bold text-slate-700 mt-1 mb-2">{item.value}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>{item.badge}</span>
            </div>
          </motion.div>
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
      try {
        const me = await base44.auth.me();
        setCurrentUser(me);
        if (me?.role === "admin") {
          try {
            const u = await base44.entities.User.list("-created_date", 100);
            setUsers(u);
          } catch (e) { console.error(e); }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const handleEditRole = async () => {
    if (!editRoleUser || !editRoleValue) return;
    setSavingRole(true);
    await base44.entities.User.update(editRoleUser.id, { role: editRoleValue });
    toast.success(`Perfil de ${editRoleUser.full_name || editRoleUser.email} atualizado`);
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
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );

  if (currentUser?.role !== "admin") {
    return <ContadorPanel user={currentUser} />;
  }

  return (
    <>
      <AdminPanel users={users} onInvite={() => setInviteOpen(true)} onEditRole={(u) => { setEditRoleUser(u); setEditRoleValue(u.role || "empresa"); }} />

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-0 shadow-2xl rounded-3xl overflow-hidden max-w-md">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50/30 -z-10" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 -z-10" />
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Convidar Usuário</DialogTitle>
                <p className="text-xs text-slate-500">Envie um convite por e-mail</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">E-mail *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Perfil</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🔴 Administrador</SelectItem>
                  <SelectItem value="contador">🔵 Contador</SelectItem>
                  <SelectItem value="empresa">🟢 Empresa</SelectItem>
                  <SelectItem value="suporte">🟣 Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:opacity-90 rounded-xl shadow-lg shadow-blue-500/25 px-5">
              {inviting ? "Enviando..." : <><CheckCircle className="w-4 h-4 mr-1.5" /> Enviar Convite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRoleUser} onOpenChange={(o) => !o && setEditRoleUser(null)}>
        <DialogContent className="border-0 shadow-2xl rounded-3xl overflow-hidden max-w-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-violet-50/30 -z-10" />
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Alterar Perfil</DialogTitle>
                <p className="text-xs text-slate-500 truncate max-w-[180px]">{editRoleUser?.full_name || editRoleUser?.email}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Novo Perfil</Label>
              <Select value={editRoleValue} onValueChange={setEditRoleValue}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🔴 Administrador</SelectItem>
                  <SelectItem value="contador">🔵 Contador</SelectItem>
                  <SelectItem value="empresa">🟢 Empresa</SelectItem>
                  <SelectItem value="suporte">🟣 Suporte</SelectItem>
                  <SelectItem value="user">⚪ Usuário padrão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditRoleUser(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleEditRole} disabled={savingRole}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 hover:opacity-90 rounded-xl shadow-lg shadow-violet-500/25 px-5">
              {savingRole ? "Salvando..." : <><CheckCircle className="w-4 h-4 mr-1.5" /> Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}