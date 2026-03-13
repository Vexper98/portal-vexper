import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, Plus, Building2, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

const STATUS_CONFIG = {
  pendente:     { label: "Pendente",     color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  concluido:    { label: "Concluído",    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  atrasado:     { label: "Atrasado",     color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

const PRIORITY_CONFIG = {
  baixa:   { label: "Baixa",   color: "text-slate-400" },
  normal:  { label: "Normal",  color: "text-blue-400" },
  alta:    { label: "Alta",    color: "text-amber-400" },
  urgente: { label: "Urgente", color: "text-red-400" },
};

const currentCompetencia = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function FiscalSchedule() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterComp, setFilterComp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [form, setForm] = useState({});

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [comps, scheds] = await Promise.all([
      base44.entities.Company.list("-razao_social", 500),
      base44.entities.FiscalSchedule.list("-created_date", 500),
    ]);
    const restricted = u?.role === "contador";
    const myComps = restricted
      ? comps.filter(c => c.contadorEmail === u.email || c.contador_responsavel === u.email)
      : comps;
    const myIds = new Set(myComps.map(c => c.id));
    const myScheds = restricted ? scheds.filter(s => myIds.has(s.company_id)) : scheds;
    setCompanies(myComps);
    setSchedules(myScheds);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ competencia: competencia, status: "pendente", tipo_fechamento: "mensal", prioridade: "normal" });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setDialogOpen(true);
  };

  const saveForm = async () => {
    const comp = companies.find(c => c.id === form.company_id);
    const payload = { ...form, company_name: comp?.nome_fantasia || comp?.razao_social || "", contador_email: user?.email };
    if (editItem) {
      await base44.entities.FiscalSchedule.update(editItem.id, payload);
    } else {
      await base44.entities.FiscalSchedule.create(payload);
    }
    setDialogOpen(false);
    loadData();
  };

  const updateStatus = async (id, status) => {
    await base44.entities.FiscalSchedule.update(id, { status });
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const filtered = schedules.filter(s => {
    const matchComp = filterComp === "all" || s.company_id === filterComp;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchComp2 = !competencia || s.competencia === competencia;
    return matchComp && matchStatus && matchComp2;
  });

  const stats = {
    total: filtered.length,
    concluido: filtered.filter(s => s.status === "concluido").length,
    pendente: filtered.filter(s => s.status === "pendente").length,
    atrasado: filtered.filter(s => s.status === "atrasado").length,
  };

  if (loading) return (
    <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />)}</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Cronograma de Fechamentos</h1>
            <p className="text-xs text-slate-500">Controle de obrigações fiscais por empresa</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openNew} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Compromisso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: CalendarCheck, color: "text-cyan-400" },
          { label: "Concluídos", value: stats.concluido, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Pendentes", value: stats.pendente, icon: Clock, color: "text-blue-400" },
          { label: "Atrasados", value: stats.atrasado, icon: AlertTriangle, color: "text-red-400" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(6,182,212,0.1)" }}>
            <s.icon className={`w-6 h-6 ${s.color}`} />
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="month"
          value={competencia}
          onChange={e => setCompetencia(e.target.value)}
          className="w-40 h-9 text-sm"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
        />
        <Select value={filterComp} onValueChange={setFilterComp}>
          <SelectTrigger className="w-48 h-9" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Empresas</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(6,182,212,0.12)" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-slate-500 font-mono">{filtered.length} compromisso(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Empresa", "Competência", "Tipo", "Data Limite", "Prioridade", "Status", "Ações"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.pendente;
                const pr = PRIORITY_CONFIG[item.prioridade] || PRIORITY_CONFIG.normal;
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onClick={() => openEdit(item)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-sm text-white font-medium">{item.company_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300 font-mono">{item.competencia}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 capitalize">{item.tipo_fechamento}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">
                      {item.data_limite ? format(new Date(item.data_limite + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${pr.color}`}>{pr.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={`text-[10px] border ${st.color}`}>{st.label}</Badge>
                    </td>
                    <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                      <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                        <SelectTrigger className="h-7 w-36 text-xs" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum compromisso encontrado</p>
                    <p className="text-xs mt-1">Clique em "Novo Compromisso" para adicionar</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: "#0d1b38", border: "1px solid rgba(6,182,212,0.2)", color: "white" }}>
          <DialogHeader>
            <DialogTitle className="text-white">{editItem ? "Editar Compromisso" : "Novo Compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Empresa *</label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Competência</label>
                <Input type="month" value={form.competencia || ""} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Data Limite</label>
                <Input type="date" value={form.data_limite || ""} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                <Select value={form.tipo_fechamento || "mensal"} onValueChange={v => setForm(f => ({ ...f, tipo_fechamento: v }))}>
                  <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Prioridade</label>
                <Select value={form.prioridade || "normal"} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Status</label>
              <Select value={form.status || "pendente"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Observações</label>
              <Input value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Notas sobre este fechamento..."
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-slate-300">Cancelar</Button>
            <Button onClick={saveForm} disabled={!form.company_id} className="bg-gradient-to-r from-cyan-600 to-blue-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}