import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarCheck, Clock, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [user]);

  const loadSchedules = async () => {
    if (!user) return;
    const filter = {};
    if (user.role === "empresa") filter.contador_email = user.email;
    else if (user.role === "contador") filter.contador_email = user.email;
    const data = await base44.entities.FiscalSchedule.list("-data_limite", 200);
    setSchedules(data);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  // pad start
  const firstDayOfWeek = startOfMonth(currentMonth).getDay(); // 0=sun
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getSchedulesForDay = (day) =>
    schedules.filter(s => s.data_limite && isSameDay(parseISO(s.data_limite), day));

  const selectedDaySchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  const monthSchedules = schedules.filter(s => {
    if (!s.data_limite) return false;
    const d = parseISO(s.data_limite);
    return isSameMonth(d, currentMonth);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-cyan-400" />
            Cronograma Fiscal
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Prazos e obrigações fiscais do mês</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm min-w-[130px] text-center capitalize">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
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
          {/* Week headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} className="text-center text-xs text-slate-600 font-medium py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const daySchedules = getSchedulesForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const hasAtrasado = daySchedules.some(s => s.status === "atrasado");
              const hasUrgente = daySchedules.some(s => s.prioridade === "urgente");

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 transition-all text-sm font-medium
                    ${isSelected ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" :
                      isToday ? "bg-white/8 border border-white/15 text-white" :
                      "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"}
                  `}
                >
                  <span className={`text-xs ${isToday && !isSelected ? "text-cyan-400 font-bold" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {daySchedules.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                      {daySchedules.slice(0, 3).map((s, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s.status]?.dot || "bg-slate-400"}`}
                        />
                      ))}
                      {daySchedules.length > 3 && <span className="text-[8px] text-slate-500">+{daySchedules.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                <span className="text-xs text-slate-500">{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {selectedDay ? (
            <>
              <h3 className="text-sm font-semibold text-white capitalize">
                {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              {selectedDaySchedules.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum prazo neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDaySchedules.map(s => (
                    <div
                      key={s.id}
                      className={`rounded-xl p-3 border-l-2 ${PRIORIDADE_CONFIG[s.prioridade]?.color || "border-l-slate-400"}`}
                      style={{ background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{s.company_name || "Empresa"}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_CONFIG[s.status]?.color}`}>
                          {STATUS_CONFIG[s.status]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Competência: {s.competencia}</p>
                      {s.tipo_fechamento && (
                        <p className="text-xs text-slate-600 capitalize">{s.tipo_fechamento}</p>
                      )}
                      {s.observacoes && (
                        <p className="text-xs text-slate-500 mt-1 italic">{s.observacoes}</p>
                      )}
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
    </div>
  );
}