import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ExternalLink, FileCheck } from "lucide-react";

const statusConfig = {
  recebido:   { label: "Recebido",   bg: "rgba(59,130,246,0.12)",   color: "#60a5fa", dot: "bg-blue-400"    },
  processado: { label: "Processado", bg: "rgba(16,185,129,0.12)",   color: "#34d399", dot: "bg-emerald-400" },
  pendente:   { label: "Pendente",   bg: "rgba(245,158,11,0.12)",   color: "#fbbf24", dot: "bg-amber-400"   },
  erro:       { label: "Erro",       bg: "rgba(239,68,68,0.12)",    color: "#f87171", dot: "bg-red-400"     },
  duplicado:  { label: "Duplicado",  bg: "rgba(100,116,139,0.12)",  color: "#94a3b8", dot: "bg-slate-500"   },
};

const tipoConfig = {
  nfe_xml:  { label: "NF-e",  grad: "from-blue-500 to-cyan-500"     },
  nfce_xml: { label: "NFC-e", grad: "from-emerald-500 to-teal-500"  },
  cte_xml:  { label: "CT-e",  grad: "from-violet-500 to-purple-500" },
  nfse_xml: { label: "NFS-e", grad: "from-amber-500 to-orange-500"  },
  pdf_nota: { label: "PDF",   grad: "from-rose-500 to-pink-500"     },
  outros:   { label: "XML",   grad: "from-slate-500 to-slate-600"   },
};

export default function RecentDocumentsTable({ documents }) {
  if (!documents?.length) {
    return (
      <div className="text-center py-14">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <FileText className="w-6 h-6 text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-500">Nenhum documento recente</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["Empresa","Arquivo","Tipo","Data","Status",""].map((h, i) => (
              <th key={i} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, i) => {
            const st = statusConfig[doc.status] || statusConfig.recebido;
            const tipo = tipoConfig[doc.tipo_documento] || tipoConfig.outros;
            return (
              <tr key={doc.id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                className="transition-colors group hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold text-slate-200 truncate max-w-[140px]">{doc.company_name || "—"}</p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${tipo.grad} flex items-center justify-center flex-shrink-0`}>
                      <FileCheck className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-slate-400 truncate max-w-[150px] font-mono">{doc.nome_arquivo}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${tipo.grad} text-white`}>
                    {tipo.label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-slate-500 font-mono">
                    {doc.created_date ? format(new Date(doc.created_date), "dd/MM/yy", { locale: ptBR }) : "—"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500 hover:text-cyan-300">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}