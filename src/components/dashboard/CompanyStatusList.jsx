import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function CompanyStatusList({ companies }) {
  if (!companies?.length) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma empresa cadastrada</p>
      </div>
    );
  }

  const getStatusInfo = (company) => {
    const last = company.lastSyncAt || company.ultimo_envio;
    if (!last) return { icon: Clock, color: "text-slate-400", dot: "bg-slate-300", label: "Sem envios" };
    const daysSince = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    if (daysSince > 7) return { icon: AlertTriangle, color: "text-red-500", dot: "bg-red-500", label: `${daysSince}d sem envio` };
    if (daysSince > 3) return { icon: Clock, color: "text-amber-500", dot: "bg-amber-400", label: `${daysSince}d atrás` };
    return { icon: CheckCircle2, color: "text-emerald-500", dot: "bg-emerald-400", label: "Em dia" };
  };

  const avatarColors = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-600",
  ];

  return (
    <div className="divide-y divide-slate-50">
      {companies.map((company, i) => {
        const status = getStatusInfo(company);
        const StatusIcon = status.icon;
        return (
          <motion.div key={company.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Link
              to={createPageUrl(`CompanyDetail?id=${company.id}`)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors group"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                {company.nome_fantasia?.[0]?.toUpperCase() || company.razao_social?.[0]?.toUpperCase() || "E"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                  {company.nome_fantasia || company.razao_social}
                </p>
                <p className="text-[10px] text-slate-400 truncate font-mono">{company.cnpj}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <motion.div
                  className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                  animate={status.dot === "bg-emerald-400" ? { opacity: [1, 0.3, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className={`text-[10px] font-semibold ${status.color}`}>{status.label}</span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}