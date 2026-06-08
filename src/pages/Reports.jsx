import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart as PieIcon, FileText, Building2 } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listAll } from "@/lib/base44-pagination";

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const tipoLabels = {
  nfe_xml: "NF-e", nfce_xml: "NFC-e", cte_xml: "CT-e",
  nfse_xml: "NFS-e", pdf_nota: "PDF", outros: "Outros",
};

export default function Reports() {
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("all");

  useEffect(() => {
    const load = async () => {
      const [u, docs, comps] = await Promise.all([
        base44.auth.me(),
        listAll(base44.entities.Document, "-created_date", {
          fields: ["id", "companyId", "documentType", "status", "source", "uploadedAt", "created_date", "valor_nota"],
        }),
        base44.entities.Company.list("-created_date", 200),
      ]);
      const isContador = u?.role === "contador";
      const myCompanies = isContador
        ? comps.filter(c => c.contadorEmail === u.email || c.contador_responsavel === u.email)
        : comps;
      const myIds = new Set(myCompanies.map(c => c.id));
      const normalizedDocs = docs.map(d => ({
        ...d,
        company_id: d.companyId || d.company_id,
        tipo_documento: d.tipo_documento || (
          d.documentType === "NFe" ? "nfe_xml" :
          d.documentType === "NFCe" ? "nfce_xml" :
          "outros"
        ),
        created_date: d.uploadedAt || d.created_date,
      }));
      const myDocs = isContador ? normalizedDocs.filter(d => myIds.has(d.company_id)) : normalizedDocs;
      setDocuments(myDocs);
      setCompanies(myCompanies);
      setLoading(false);
    };
    load();
  }, []);

  const filteredDocs = selectedCompany === "all" ? documents : documents.filter(d => d.company_id === selectedCompany);

  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate).toISOString();
      const end = endOfMonth(monthDate).toISOString();
      const count = filteredDocs.filter(d => d.created_date >= start && d.created_date <= end).length;
      data.push({
        month: format(monthDate, "MMM/yy", { locale: ptBR }),
        documentos: count,
      });
    }
    return data;
  }, [filteredDocs]);

  const tipoData = useMemo(() => {
    const counts = {};
    filteredDocs.forEach(d => { counts[d.tipo_documento] = (counts[d.tipo_documento] || 0) + 1; });
    return Object.entries(counts).map(([tipo, value]) => ({ name: tipoLabels[tipo] || tipo, value }));
  }, [filteredDocs]);

  const statusData = useMemo(() => {
    const counts = {};
    filteredDocs.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [filteredDocs]);

  const totalValor = filteredDocs.reduce((sum, d) => sum + (d.valor_nota || 0), 0);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1">Análise de documentos fiscais</p>
        </div>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Empresas</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Documentos" value={filteredDocs.length} icon={FileText} color="blue" />
        <StatCard title="Empresas" value={selectedCompany === "all" ? companies.length : 1} icon={Building2} color="purple" />
        <StatCard title="Valor Total" value={`R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={BarChart3} color="green" />
        <StatCard title="Erros" value={filteredDocs.filter(d => d.status === "erro").length} icon={PieIcon} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Documentos por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="documentos" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Por Tipo de Documento</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={tipoData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {tipoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
