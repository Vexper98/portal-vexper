import React from "react";

const colorMap = {
  blue:   { grad: "from-blue-500 to-cyan-500",    glow: "shadow-blue-500/25",    border: "rgba(59,130,246,0.2)",  accent: "#3b82f6" },
  green:  { grad: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/25", border: "rgba(16,185,129,0.2)",  accent: "#10b981" },
  cyan:   { grad: "from-cyan-500 to-sky-500",     glow: "shadow-cyan-500/25",    border: "rgba(6,182,212,0.2)",   accent: "#06b6d4" },
  orange: { grad: "from-orange-500 to-amber-500", glow: "shadow-orange-500/25",  border: "rgba(249,115,22,0.2)",  accent: "#f97316" },
  red:    { grad: "from-red-500 to-rose-500",     glow: "shadow-red-500/25",     border: "rgba(239,68,68,0.2)",   accent: "#ef4444" },
  purple: { grad: "from-violet-500 to-purple-600",glow: "shadow-violet-500/25",  border: "rgba(139,92,246,0.2)",  accent: "#8b5cf6" },
};

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className="relative rounded-2xl overflow-hidden group cursor-default"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d1e35 100%)",
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Top accent bar */}
      <div className={`h-[2px] bg-gradient-to-r ${c.grad}`} />

      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(circle at 50% 0%, ${c.accent}15 0%, transparent 70%)` }} />

      <div className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
            <p
              className="text-3xl font-bold text-white mt-1.5 leading-none"
            >
              {value}
            </p>
            {subtitle && <p className="text-[11px] text-slate-500 mt-2">{subtitle}</p>}
          </div>
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-lg ${c.glow} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
