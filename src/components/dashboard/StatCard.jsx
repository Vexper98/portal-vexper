import React from "react";
import { motion } from "framer-motion";

const colorMap = {
  blue:   { grad: "from-blue-500 to-cyan-500",    glow: "shadow-blue-500/20",   bar: "from-blue-500 to-cyan-400",    bg: "from-blue-50 to-cyan-50",  text: "text-blue-600"  },
  green:  { grad: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/20",bar: "from-emerald-500 to-teal-400", bg: "from-emerald-50 to-teal-50",text: "text-emerald-600"},
  orange: { grad: "from-orange-500 to-amber-500", glow: "shadow-orange-500/20", bar: "from-orange-500 to-amber-400", bg: "from-orange-50 to-amber-50", text: "text-orange-600" },
  red:    { grad: "from-red-500 to-rose-500",     glow: "shadow-red-500/20",    bar: "from-red-500 to-rose-400",     bg: "from-red-50 to-rose-50",    text: "text-red-600"   },
  purple: { grad: "from-violet-500 to-purple-600",glow: "shadow-violet-500/20", bar: "from-violet-500 to-purple-500",bg: "from-violet-50 to-purple-50",text: "text-violet-600"},
  cyan:   { grad: "from-cyan-500 to-sky-500",     glow: "shadow-cyan-500/20",   bar: "from-cyan-500 to-sky-400",     bg: "from-cyan-50 to-sky-50",    text: "text-cyan-600"  },
};

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="relative rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
      {/* Top gradient bar */}
      <div className={`h-0.5 bg-gradient-to-r ${c.bar}`} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <motion.p
              key={value}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-3xl font-bold text-slate-800 mt-1.5 leading-none"
            >
              {value}
            </motion.p>
            {subtitle && <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{subtitle}</p>}
          </div>
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-lg ${c.glow} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Subtle bg glow on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none`} />
    </div>
  );
}