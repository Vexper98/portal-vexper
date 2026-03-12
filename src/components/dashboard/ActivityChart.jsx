import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActivityChart({ documents }) {
  const chartData = useMemo(() => {
    const days = 14;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, "yyyy-MM-dd");
      const count = documents?.filter(d => {
        const docDate = format(new Date(d.created_date), "yyyy-MM-dd");
        return docDate === dateStr;
      }).length || 0;
      data.push({
        date: format(date, "dd/MM", { locale: ptBR }),
        documentos: count,
      });
    }
    return data;
  }, [documents]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Area type="monotone" dataKey="documentos" stroke="#2563eb" strokeWidth={2} fill="url(#colorDocs)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}