import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, FileText, AlertTriangle, Clock, TrendingUp, Zap, RefreshCw
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentDocumentsTable from "../components/dashboard/RecentDocumentsTable";
import CompanyStatusList from "../components/dashboard/CompanyStatusList";
import ActivityChart from "../components/dashboard/ActivityChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export default function Dashboard() {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [u, comps, docs] = await Promise.all([
      base44.auth.me(),
      base44.entities.Company.list("-created_date", 200),
      base44.entities.Document.list("-created_date", 500),
    ]);
    const restricted = u?.role === "contador";
    const myCompanies = restricted
      ? comps.filter(c => c.contadorEmail === u.email || c.contador_responsavel === u.email)
      : comps;
    const myIds = new Set(myCompanies.map(c => c.id));
    const myDocs = restricted ? docs.filter(d => myIds.has(d.companyId)) : docs;
    setCompanies(myCompanies);
    setDocuments(myDocs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const now        = new Date();
  const todayStart = startOfDay(now).toISOString();
  const weekStart  = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const docsToday  = documents.filter(d => (d.uploadedAt || d.created_date || "") >= todayStart).length;
  const docsWeek   = documents.filter(d => (d.uploadedAt || d.created_date || "") >= weekStart).length;
  const docsMonth  = documents.filter(d => (d.uploadedAt || d.created_date || "") >= monthStart).length;
  const docsErro   = documents.filter(d => d.status === "erro").length;
  const agentDocs  = documents.filter(d => d.source === "agent").length;

  const activeCompanies = companies.filter(c => c.active !== false && c.status !== "inativa").length;

  const companiesNoSend = companies.filter(c => {
    const last = c.lastSyncAt || c.ultimo_envio;
    if (!last) return true;
    return (Date.now() - new Date(last).getTime()) > 7 * 86400000;
  });

  // Enrich docs with company names for table
  const companyMap = {};
  companies.forEach(c => { companyMap[c.id] = c; });
  const enrichedDocs = documents.map(d => ({
    ...d,
    company_name: companyMap[d.companyId]?.nome_fantasia || companyMap[d.companyId]?.razao_social || "",
    nome_arquivo: d.filename,
    tipo_documento: d.documentType === "NFe" ? "nfe_xml" : d.documentType === "NFCe" ? "nfce_xml" : "outros",
    created_date: d.uploadedAt || d.created_date,
  }));

  // Chart data - last 14 days
  const chartDocs = enrichedDocs;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do escritório</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Empresas Ativas"
          value={activeCompanies}
          icon={Building2}
          color="blue"
          subtitle={`${companies.length} cadastradas`}
        />
        <StatCard
          title="Docs Hoje"
          value={docsToday}
          icon={FileText}
          color="green"
          subtitle={`${docsWeek} esta semana · ${docsMonth} no mês`}
        />
        <StatCard
          title="Via Agente"
          value={agentDocs}
          icon={Zap}
          color="purple"
          subtitle={`${documents.length - agentDocs} manual(is)`}
        />
        <StatCard
          title="Erros / Sem Envio"
          value={docsErro}
          icon={AlertTriangle}
          color="red"
          subtitle={`${companiesNoSend.length} empresa(s) sem sincronização`}
        />
      </div>

      {/* Alert for companies without sync */}
      {companiesNoSend.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {companiesNoSend.length} empresa(s) sem sincronização há mais de 7 dias
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {companiesNoSend.slice(0, 3).map(c => c.nome_fantasia || c.razao_social).join(", ")}
              {companiesNoSend.length > 3 && ` e mais ${companiesNoSend.length - 3}...`}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Documentos Recebidos (14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart documents={chartDocs} />
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Últimos Documentos Recebidos
            </CardTitle>
            <div className="flex gap-1">
              {["NFe","NFCe","XML"].map(t => {
                const count = documents.filter(d => d.documentType === t).length;
                return count > 0 ? (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}: {count}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RecentDocumentsTable documents={enrichedDocs.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
}