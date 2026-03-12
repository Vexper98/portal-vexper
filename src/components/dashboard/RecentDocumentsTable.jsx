import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ExternalLink } from "lucide-react";

const statusConfig = {
  enviado: { label: "Enviado", class: "bg-blue-50 text-blue-700 border-blue-200" },
  processado: { label: "Processado", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pendente: { label: "Pendente", class: "bg-amber-50 text-amber-700 border-amber-200" },
  erro: { label: "Erro", class: "bg-red-50 text-red-700 border-red-200" },
  duplicado: { label: "Duplicado", class: "bg-slate-50 text-slate-600 border-slate-200" },
};

const tipoConfig = {
  nfe_xml: "NF-e XML",
  nfce_xml: "NFC-e XML",
  cte_xml: "CT-e XML",
  nfse_xml: "NFS-e XML",
  pdf_nota: "PDF Nota",
  outros: "Outros",
};

export default function RecentDocumentsTable({ documents }) {
  if (!documents?.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhum documento recente</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="text-xs font-semibold text-slate-500 uppercase">Empresa</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase">Arquivo</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase">Tipo</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase">Data</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const st = statusConfig[doc.status] || statusConfig.pendente;
            return (
              <TableRow key={doc.id} className="hover:bg-slate-50/50 border-slate-100">
                <TableCell className="font-medium text-sm text-slate-900">{doc.company_name || "—"}</TableCell>
                <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">{doc.nome_arquivo}</TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-slate-500">{tipoConfig[doc.tipo_documento] || doc.tipo_documento}</span>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {doc.created_date ? format(new Date(doc.created_date), "dd MMM yyyy", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] font-semibold ${st.class}`}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}