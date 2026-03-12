import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentDocumentsTable from "../components/dashboard/RecentDocumentsTable";
import CompanyStatusList from "../components/dashboard/CompanyStatusList";
import ActivityChart from "../components/dashboard/ActivityChart";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export default function Dashboard() {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [agentDocs, setAgentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [comps, docs, aDocs] = await Promise.all([
      base44.entities.Company.list("-created_date", 100),
      base44.entities.FiscalDocument.list("-created_date", 200),
      base44.entities.Document.list("-created_date", 200),
    ]);
    setCompanies(comps);
    setDocuments(docs);
    setAgentDocs(aDocs);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Auto-refresh a cada 30s para refletir novos envios do agente
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  // Combina FiscalDocuments + Documents do agente para contagens e gráfico
  const allDocs = [
    ...documents,
    ...agentDocs.map(d => ({
      ...d,
      created_date: d.createdAt || d.created_date,
      status: d.status,
      company_name: companies.find(c => c.id === d.companyId)?.nome_fantasia ||
                    companies.find(c => c.id === d.companyId)?.razao_social || "",
      nome_arquivo: d.filename,
      tipo_documento: "nfe_xml",
    })),
  ];

  const docsToday = allDocs.filter(d => (d.created_date || "") >= todayStart).length;
  const docsWeek = allDocs.filter(d => (d.created_date || "") >= weekStart).length;
  const docsMonth = allDocs.filter(d => (d.created_date || "") >= monthStart).length;
  const docsErro = allDocs.filter(d => d.status === "erro").length;
  const activeCompanies = companies.filter(c => c.status === "ativa").length;

  // Empresas únicas que têm documentos do agente
  const companiesWithAgentDocs = [...new Set(agentDocs.map(d => d.companyId))].length;

  const companiesNoSend = companies.filter(c => {
    if (!c.ultimo_envio) return true;
    return (Date.now() - new Date(c.ultimo_envio).getTime()) > 7 * 86400000;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral do escritório</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Empresas Ativas" value={activeCompanies} icon={Building2} color="blue" subtitle={`${companies.length} total`} />
        <StatCard title="Docs Hoje" value={docsToday} icon={FileText} color="green" subtitle={`${docsWeek} na semana · ${docsMonth} no mês`} />
        <StatCard title="Via Agente" value={agentDocs.length} icon={CheckCircle2} color="cyan" subtitle={`${companiesWithAgentDocs} empresa(s)`} />
        <StatCard title="Sem Envio (7d+)" value={companiesNoSend.length} icon={Clock} color="orange" subtitle="Empresas paradas" />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Documentos Recebidos (14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart documents={allDocs} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Status das Empresas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <CompanyStatusList companies={companies.slice(0, 8)} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Últimos Documentos Recebidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentDocumentsTable documents={allDocs.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
}