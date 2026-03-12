import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ExternalLink, FileCheck } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig = {
  recebido:   { label: "Recebido",   cls: "bg-blue-500/15 text-blue-600 border-blue-500/20",       dot: "bg-blue-500"    },
  processado: { label: "Processado", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
  pendente:   { label: "Pendente",   cls: "bg-amber-500/15 text-amber-600 border-amber-500/20",     dot: "bg-amber-500"   },
  erro:       { label: "Erro",       cls: "bg-red-500/15 text-red-600 border-red-500/20",           dot: "bg-red-500"     },
  duplicado:  { label: "Duplicado",  cls: "bg-slate-500/15 text-slate-500 border-slate-500/20",     dot: "bg-slate-400"   },
};

const tipoConfig = {
  nfe_xml:  { label: "NF-e",   grad: "from-blue-500 to-cyan-500"    },
  nfce_xml: { label: "NFC-e",  grad: "from-emerald-500 to-teal-500" },
  cte_xml:  { label: "CT-e",   grad: "from-violet-500 to-purple-500"},
  nfse_xml: { label: "NFS-e",  grad: "from-amber-500 to-orange-500" },
  pdf_nota: { label: "PDF",    grad: "from-rose-500 to-pink-500"    },
  outros:   { label: "XML",    grad: "from-slate-400 to-slate-500"  },
};

export default function RecentDocumentsTable({ documents }) {
  if (!documents?.length) {
    return (
      <div className="text-center py-14 text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-medium">Nenhum documento recente</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arquivo</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {documents.map((doc, i) => {
            const st = statusConfig[doc.status] || statusConfig.recebido;
            const tipo = tipoConfig[doc.tipo_documento] || tipoConfig.outros;
            return (
              <motion.tr key={doc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-6 py-3">
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{doc.company_name || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${tipo.grad} flex items-center justify-center flex-shrink-0`}>
                      <FileCheck className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-slate-600 truncate max-w-[150px]">{doc.nome_arquivo}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${tipo.grad} text-white`}>
                    {tipo.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-400 font-mono">
                    {doc.created_date ? format(new Date(doc.created_date), "dd/MM/yy", { locale: ptBR }) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <Badge variant="outline" className={`text-[9px] font-bold ${st.cls}`}>{st.label}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}