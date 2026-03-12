import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, AlertTriangle, Clock, TrendingUp, Zap, RefreshCw, Activity } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentDocumentsTable from "../components/dashboard/RecentDocumentsTable";
import CompanyStatusList from "../components/dashboard/CompanyStatusList";
import ActivityChart from "../components/dashboard/ActivityChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export default function Dashboard() {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const [u, comps, docs] = await Promise.all([
      base44.auth.me(),
      base44.entities.Company.list("-created_date", 20000),
      base44.entities.Document.list("-created_date", 20000),
    ]);
    const restricted = u?.role === "contador";
    const myCompanies = restricted
      ? comps.filter(c => c.contadorEmail === u.email || c.contador_responsavel === u.email)
      : comps;
    const myIds = new Set(myCompanies.map(c => c.id));
    const myDocs = restricted ? docs.filter(d => myIds.has(d.companyId)) : docs;
    console.log("[Dashboard] Loaded:", { totalDocs: docs.length, filteredDocs: myDocs.length, restricted, userRole: u?.role });
    setCompanies(myCompanies);
    setDocuments(myDocs);
    setLoading(false);
    if (manual) setRefreshing(false);
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
   const docsXml    = documents.filter(d => d.documentType === "XML").length;
  const activeCompanies = companies.filter(c => c.active !== false && c.status !== "inativa").length;

  const companiesNoSend = companies.filter(c => {
    const last = c.lastSyncAt || c.ultimo_envio;
    if (!last) return true;
    return (Date.now() - new Date(last).getTime()) > 7 * 86400000;
  });

  const companyMap = {};
  companies.forEach(c => { companyMap[c.id] = c; });
  const enrichedDocs = documents.map(d => ({
    ...d,
    company_name: companyMap[d.companyId]?.nome_fantasia || companyMap[d.companyId]?.razao_social || "",
    nome_arquivo: d.filename,
    tipo_documento: d.documentType === "NFe" ? "nfe_xml" : d.documentType === "NFCe" ? "nfce_xml" : "outros",
    created_date: d.uploadedAt || d.created_date,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1729] via-[#162040] to-[#0a1f3c]" />
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(rgba(148,219,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(148,219,255,0.6) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-blue-600/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[60px]" />
        {/* Animated pulse dots */}
        {[...Array(5)].map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full bg-cyan-400/50"
            style={{ width: 4, height: 4, top: `${15 + i * 18}%`, left: `${5 + i * 18}%` }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 2, 1] }}
            transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        <div className="relative px-8 py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] text-green-400 font-semibold uppercase tracking-widest">Sistema Online</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm">{companies.length} empresas monitoradas · {documents.length} documentos no total</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3">
            <div className="flex gap-2">
              {["NFe","NFCe"].map(t => {
                const count = documents.filter(d => d.documentType === t).length;
                return (
                  <div key={t} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-lg font-bold text-white">{count}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">{t}</p>
                  </div>
                );
              })}
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-bold text-cyan-400">{docsToday}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-wide">Hoje</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              className="border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </motion.div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Empresas Ativas", value: activeCompanies, icon: Building2, color: "blue", subtitle: `${companies.length} cadastradas` },
          { title: "Docs Hoje", value: docsToday, icon: FileText, color: "green", subtitle: `${docsWeek} semana · ${docsMonth} mês` },
          { title: "Via Agente", value: agentDocs, icon: Zap, color: "purple", subtitle: `${documents.length - agentDocs} manual(is)` },
          { title: "Erros / Sem Envio", value: docsErro, icon: AlertTriangle, color: "red", subtitle: `${companiesNoSend.length} sem sincronização` },
        ].map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* ALERT */}
      <AnimatePresence>
        {companiesNoSend.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {companiesNoSend.length} empresa(s) sem sincronização há mais de 7 dias
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {companiesNoSend.slice(0, 3).map(c => c.nome_fantasia || c.razao_social).join(", ")}
                {companiesNoSend.length > 3 && ` e mais ${companiesNoSend.length - 3}...`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHART + STATUS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Documentos Recebidos</h2>
                <p className="text-[11px] text-slate-400">Últimos 14 dias</p>
              </div>
            </div>
            <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">
              {docsWeek} esta semana
            </Badge>
          </div>
          <div className="p-4">
            <ActivityChart documents={enrichedDocs} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Status das Empresas</h2>
                <p className="text-[11px] text-slate-400">{activeCompanies} ativas</p>
              </div>
            </div>
          </div>
          <div className="p-2">
            <CompanyStatusList companies={companies.slice(0, 8)} />
          </div>
        </div>
      </motion.div>

      {/* RECENT DOCS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Últimos Documentos Recebidos</h2>
              <p className="text-[11px] text-slate-400">10 mais recentes</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {["NFe","NFCe","XML"].map(t => {
              const count = documents.filter(d => d.documentType === t).length;
              return count > 0 ? (
                <Badge key={t} className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">
                  {t} {count}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
        <RecentDocumentsTable documents={enrichedDocs.slice(0, 10)} />
      </motion.div>
    </div>
  );
}