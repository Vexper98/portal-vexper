import React from "react";
import { Card } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colorMap = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-amber-500",
    red: "from-red-500 to-rose-500",
    purple: "from-violet-500 to-purple-600",
    cyan: "from-cyan-500 to-sky-500",
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      <div className={`h-1 bg-gradient-to-r ${colorMap[color] || colorMap.blue}`} />
    </Card>
  );
}