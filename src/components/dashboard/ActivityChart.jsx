import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl" style={{ background: "#060d1f", border: "1px solid rgba(6,182,212,0.2)" }}>
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-cyan-400">{payload[0].value}</p>
      <p className="text-[10px] text-slate-600 font-mono">documentos</p>
    </div>
  );
};

export default function ActivityChart({ documents }) {
  const chartData = useMemo(() => {
    const days = 14;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, "yyyy-MM-dd");
      const count = documents?.filter(d => {
        try { return format(new Date(d.created_date), "yyyy-MM-dd") === dateStr; }
        catch { return false; }
      }).length || 0;
      data.push({ date: format(date, "dd/MM", { locale: ptBR }), documentos: count });
    }
    return data;
  }, [documents]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradDocs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(6,182,212,0.3)", strokeWidth: 1, strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="documentos"
          stroke="url(#gradLine)"
          strokeWidth={2.5}
          fill="url(#gradDocs)"
          dot={{ fill: "#06b6d4", strokeWidth: 2, r: 3, stroke: "#060d1f" }}
          activeDot={{ r: 5, fill: "#06b6d4", stroke: "#060d1f", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}