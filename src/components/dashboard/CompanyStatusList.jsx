import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Building2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function CompanyStatusList({ companies }) {
  if (!companies?.length) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhuma empresa cadastrada</p>
      </div>
    );
  }

  const getStatusInfo = (company) => {
    if (!company.ultimo_envio) {
      return { icon: Clock, color: "text-slate-400", bg: "bg-slate-50", label: "Sem envios" };
    }
    const daysSince = Math.floor((Date.now() - new Date(company.ultimo_envio).getTime()) / 86400000);
    if (daysSince > 7) return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", label: `${daysSince}d sem envio` };
    if (daysSince > 3) return { icon: Clock, color: "text-amber-500", bg: "bg-amber-50", label: `${daysSince}d atrás` };
    return { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Em dia" };
  };

  return (
    <div className="space-y-2">
      {companies.map((company) => {
        const status = getStatusInfo(company);
        const StatusIcon = status.icon;
        return (
          <Link
            key={company.id}
            to={createPageUrl(`CompanyDetail?id=${company.id}`)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {company.nome_fantasia?.[0] || company.razao_social?.[0] || "E"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {company.nome_fantasia || company.razao_social}
              </p>
              <p className="text-xs text-slate-400">{company.cnpj}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
              <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}