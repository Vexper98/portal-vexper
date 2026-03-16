import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarCheck, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG = {
  pendente:    { label: "Pendente",    color: "bg-slate-500/20 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
  em_andamento:{ label: "Em andamento",color: "bg-blue-500/20 text-blue-300 border-blue-500/30",   dot: "bg-blue-400" },
  concluido:   { label: "Concluído",   color: "bg-green-500/20 text-green-300 border-green-500/30",dot: "bg-green-400" },
  atrasado:    { label: "Atrasado",    color: "bg-red-500/20 text-red-300 border-red-500/30",      dot: "bg-red-500" },
};

const PRIORIDADE_CONFIG = {
  baixa:   { color: "border-l-slate-400" },
  normal:  { color: "border-l-blue-400" },
  alta:    { color: "border-l-orange-400" },
  urgente: { color: "border-l-red-500" },
};

export default function FiscalCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_id: "",
    competencia: format(new Date(), "yyyy-MM"),
    data_limite: "",
    tipo_fechamento: "mensal",
    prioridade: "normal",
    observacoes: "",
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadCompanies(u);
      loadSchedules(u);
    }).catch(() => {});
  }, []);

  const loadCompanies = async (u) => {
    if (!u) return;
    let data;
    if (u.role === "admin") {
      data = await base44.entities.Company.list();
    } else if (u.role === "contador") {
      data = await base44.entities.Company.filter({ contadorEmail: u.email });
    } else {
      data = await base44.entities.Company.filter({ email: u.email });
    }
    setCompanies(data || []);
  };

  const loadSchedules = async (u) => {
    const currentUser = u || user;
    if (!currentUser) return;
    let data;
    if (currentUser.role === "admin") {
      data = await base44.entities.FiscalSchedule.list("-data_limite", 200);
    } else if (currentUser.role === "contador") {
      data = await base44.entities.FiscalSchedule.filter({ contador_email: currentUser.email }, "-data_limite", 200);
    } else {
      // empresa: vê schedules das suas empresas (vinculadas por email ou created_by)
      const [byEmail, byCreator] = await Promise.all([
        base44.entities.Company.filter({ email: currentUser.email }),
        base44.entities.Company.filter({ created_by: currentUser.email }),
      ]);
      const allCompanies = [...byEmail, ...byCreator];
      const myIds = new Set(allCompanies.map(c => c.id));
      if (myIds.size === 0) { data = []; }
      else {
        const all = await base44.entities.FiscalSchedule.list("-data_limite", 200);
        data = all.filter(s => myIds.has(s.company_id));
      }
    }
    setSchedules(data || []);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getSchedulesForDay = (day) =>
    schedules.filter(s => s.data_limite && isSameDay(parseISO(s.data_limite), day));

  const selectedDaySchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  const monthSchedules = schedules.filter(s => {
    if (!s.data_limite) return false;
    const d = parseISO(s.data_limite);
    return isSameMonth(d, currentMonth);
  });

  const openCreateModal = (day) => {
    setForm(f => ({
      ...f,
      data_limite: format(day, "yyyy-MM-dd"),
      competencia: format(day, "yyyy-MM"),
    }));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.company_id || !form.data_limite) return;
    setSaving(true);
    const company = companies.find(c => c.id === form.company_id);
    await base44.entities.FiscalSchedule.create({
      ...form,
      company_name: company?.razao_social || company?.nome_fantasia || "",
      status: "pendente",
      contador_email: user?.email || "",
    });
    await loadSchedules();
    setShowModal(false);
    setSaving(false);
  };

  const canCreate = user && ["admin", "contador", "empresa"].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-cyan-400" />
            Calendário Fiscal
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Prazos e obrigações fiscais{canCreate ? " · Clique em um dia para agendar" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm min-w-[130px] text-center capitalize">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: monthSchedules.length, color: "text-slate-300" },
          { label: "Pendentes", value: monthSchedules.filter(s => s.status === "pendente").length, color: "text-slate-400" },
          { label: "Em andamento", value: monthSchedules.filter(s => s.status === "em_andamento").length, color: "text-blue-400" },
          { label: "Atrasados", value: monthSchedules.filter(s => s.status === "atrasado").length, color: "text-red-400" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-7 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} className="text-center text-xs text-slate-600 font-medium py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const daySchedules = getSchedulesForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDay(isSelected ? null : day);
                    if (canCreate) openCreateModal(day);
                  }}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 transition-all text-sm font-medium group
                    ${isSelected ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" :
                      isToday ? "border text-white" : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"}
                  `}
                  style={isToday && !isSelected ? { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" } : {}}
                >
                  <span className={`text-xs ${isToday && !isSelected ? "text-cyan-400 font-bold" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {daySchedules.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                      {daySchedules.slice(0, 3).map((s, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s.status]?.dot || "bg-slate-400"}`} />
                      ))}
                      {daySchedules.length > 3 && <span className="text-[8px] text-slate-500">+{daySchedules.length - 3}</span>}
                    </div>
                  )}
                  {canCreate && (
                    <div className="absolute top-0.5 right-0.5 text-cyan-500 opacity-0 group-hover:opacity-60 transition-opacity">
                      <Plus className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                <span className="text-xs text-slate-500">{val.label}</span>
              </div>
            ))}
            {canCreate && <span className="text-xs text-slate-600 ml-auto">Clique no <Plus className="inline w-3 h-3" /> para agendar</span>}
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white capitalize">
                  {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                {canCreate && (
                  <Button size="sm" onClick={() => openCreateModal(selectedDay)} className="h-7 text-xs gap-1 bg-cyan-600 hover:bg-cyan-500">
                    <Plus className="w-3 h-3" /> Agendar
                  </Button>
                )}
              </div>
              {selectedDaySchedules.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum prazo neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDaySchedules.map(s => (
                    <div
                      key={s.id}
                      className={`rounded-xl p-3 border-l-2 ${PRIORIDADE_CONFIG[s.prioridade]?.color || "border-l-slate-400"}`}
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{s.company_name || "Empresa"}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_CONFIG[s.status]?.color}`}>
                          {STATUS_CONFIG[s.status]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Competência: {s.competencia}</p>
                      {s.tipo_fechamento && <p className="text-xs text-slate-600 capitalize">{s.tipo_fechamento}</p>}
                      {s.observacoes && <p className="text-xs text-slate-500 mt-1 italic">{s.observacoes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-white">Próximos prazos</h3>
              <div className="space-y-2">
                {monthSchedules
                  .filter(s => s.data_limite && s.status !== "concluido")
                  .sort((a, b) => a.data_limite.localeCompare(b.data_limite))
                  .slice(0, 8)
                  .map(s => (
                    <div
                      key={s.id}
                      className={`rounded-xl p-3 border-l-2 ${PRIORIDADE_CONFIG[s.prioridade]?.color || "border-l-slate-400"} cursor-pointer`}
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                      onClick={() => setSelectedDay(parseISO(s.data_limite))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white truncate">{s.company_name || "Empresa"}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${STATUS_CONFIG[s.status]?.color}`}>
                          {STATUS_CONFIG[s.status]?.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {format(parseISO(s.data_limite), "dd/MM", { locale: ptBR })} · {s.competencia}
                      </p>
                    </div>
                  ))}
                {monthSchedules.filter(s => s.status !== "concluido").length === 0 && (
                  <p className="text-slate-500 text-sm">Nenhum prazo pendente no mês.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Appointment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent style={{ background: "#0d1b38", border: "1px solid rgba(6,182,212,0.2)", color: "white" }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-cyan-400" />
              Agendar Compromisso Fiscal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Data do prazo</label>
              <Input
                type="date"
                value={form.data_limite}
                onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Empresa / Cliente</label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent style={{ background: "#0d1b38", border: "1px solid rgba(6,182,212,0.2)", color: "white" }}>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id} style={{ color: "white" }}>
                      {c.razao_social || c.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Competência (mês/ano)</label>
              <Input
                type="month"
                value={form.competencia}
                onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                <Select value={form.tipo_fechamento} onValueChange={v => setForm(f => ({ ...f, tipo_fechamento: v }))}>
                  <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0d1b38", border: "1px solid rgba(6,182,212,0.2)", color: "white" }}>
                    <SelectItem value="mensal" style={{ color: "white" }}>Mensal</SelectItem>
                    <SelectItem value="trimestral" style={{ color: "white" }}>Trimestral</SelectItem>
                    <SelectItem value="anual" style={{ color: "white" }}>Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Prioridade</label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0d1b38", border: "1px solid rgba(6,182,212,0.2)", color: "white" }}>
                    <SelectItem value="baixa" style={{ color: "white" }}>Baixa</SelectItem>
                    <SelectItem value="normal" style={{ color: "white" }}>Normal</SelectItem>
                    <SelectItem value="alta" style={{ color: "white" }}>Alta</SelectItem>
                    <SelectItem value="urgente" style={{ color: "white" }}>Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Observações (opcional)</label>
              <Input
                placeholder="Ex: Entregar SPED, DAS Simples..."
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} style={{ borderColor: "rgba(255,255,255,0.1)", color: "white", background: "transparent" }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                onClick={handleSave}
                disabled={saving || !form.company_id}
              >
                {saving ? "Salvando..." : "Agendar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}