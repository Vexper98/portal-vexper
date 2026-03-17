import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, AlertTriangle, Clock, Zap, RefreshCw, Activity, Shield } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentDocumentsTable from "../components/dashboard/RecentDocumentsTable";
import CompanyStatusList from "../components/dashboard/CompanyStatusList";
import ActivityChart from "../components/dashboard/ActivityChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b20f55fd3ef9a7984c9160/a79383218_logo.png";

export default function Dashboard() {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const [u, comps, docs] = await Promise.all([
      base44.auth.me(),
      base44.entities.Company.list("-created_date", 20000),
      base44.entities.Document.list("-created_date", 20000),
    ]);
    const isAdmin = u?.role === "admin";
    const restricted = !isAdmin && (u?.role === "contador" || u?.role === "common_user");
    const myCompanies = restricted
      ? comps.filter(c => c.contadorEmail === u.email || c.contador_responsavel === u.email)
      : comps;
    const myIds = new Set(myCompanies.map(c => c.id));
    const myDocs = restricted ? docs.filter(d => myIds.has(d.companyId)) : docs;
    setCompanies(myCompanies);
    setDocuments(myDocs);
    setLoading(false);
    setLastSync(new Date());
    setSyncing(false);
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      setSyncing(true);
      load();
    }, 10000);
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
      <div className="space-y-6" style={{ background: "transparent" }}>
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 min-h-screen -m-4 lg:-m-8 p-4 lg:p-8" style={{ background: "linear-gradient(160deg, #060d1f 0%, #070f20 60%, #040c1a 100%)" }}>

      {/* HERO BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #060d1f 0%, #0d1b38 50%, #071528 100%)" }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(rgba(6,182,212,1) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-48 rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-40 rounded-full blur-[60px]" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)" }} />

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)" }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />

        {/* Pulse dots */}
        {[...Array(4)].map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full bg-cyan-400"
            style={{ width: 3, height: 3, top: `${20 + i * 20}%`, left: `${8 + i * 22}%`, opacity: 0.4 }}
            animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 2, 1] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}

        <div className="relative px-8 py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Left: logo + title */}
          <div className="flex items-center gap-5">
            <motion.img
              src={LOGO_URL}
              alt="Exper Sistemas"
              className="h-20 w-auto"
              style={{ filter: "brightness(1.3) drop-shadow(0 0 12px rgba(6,182,212,0.4))" }}
              animate={{ filter: ["brightness(1.1) drop-shadow(0 0 8px rgba(6,182,212,0.3))", "brightness(1.4) drop-shadow(0 0 16px rgba(6,182,212,0.6))", "brightness(1.1) drop-shadow(0 0 8px rgba(6,182,212,0.3))"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-green-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                <span className="text-[10px] text-green-400 font-semibold uppercase tracking-[0.2em]">Sistema Online</span>
                <span className="text-[10px] text-slate-600 font-mono">·</span>
                {syncing ? (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-500 font-mono">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sincronizando...
                  </span>
                ) : lastSync && (
                  <span className="text-[10px] text-slate-600 font-mono">
                    Sync {lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard <span className="text-cyan-400">Fiscal</span></h1>
              <p className="text-slate-400 text-xs mt-0.5">{companies.length} empresas · {documents.length} documentos</p>
            </div>
          </div>

          {/* Right: counters + refresh */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "NFe",   value: documents.filter(d => d.documentType === "NFe").length,   color: "text-cyan-400" },
              { label: "NFCe",  value: documents.filter(d => d.documentType === "NFCe").length,  color: "text-blue-400" },
              { label: "Hoje",  value: docsToday,  color: "text-emerald-400" },
              { label: "Mês",   value: docsMonth,  color: "text-violet-400" },
            ].map(item => (
              <div key={item.label} className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-xl text-xs"
              style={{ background: "rgba(6,182,212,0.05)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Empresas Ativas", value: activeCompanies, icon: Building2, color: "blue",   subtitle: `${companies.length} cadastradas` },
          { title: "Docs Hoje",       value: docsToday,       icon: FileText,   color: "cyan",   subtitle: `${docsWeek} semana · ${docsMonth} mês` },
          { title: "Via Agente",      value: agentDocs,       icon: Zap,        color: "purple", subtitle: `${documents.length - agentDocs} manual(is)` },
          { title: "Erros / Atrasos", value: docsErro,        icon: AlertTriangle, color: "red", subtitle: `${companiesNoSend.length} sem sincronização` },
        ].map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* ALERT */}
      <AnimatePresence>
        {companiesNoSend.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">{companiesNoSend.length} empresa(s) sem sincronização há mais de 7 dias</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                {companiesNoSend.slice(0, 3).map(c => c.nome_fantasia || c.razao_social).join(", ")}
                {companiesNoSend.length > 3 && ` e mais ${companiesNoSend.length - 3}...`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHART + STATUS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(6,182,212,0.15)" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Documentos Recebidos</h2>
                <p className="text-[11px] text-slate-500">Últimos 14 dias</p>
              </div>
            </div>
            <Badge className="text-[10px] font-mono" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
              {docsWeek} esta semana
            </Badge>
          </div>
          <div className="p-4">
            <ActivityChart documents={enrichedDocs} />
          </div>
        </div>

        {/* Company status */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Status das Empresas</h2>
                <p className="text-[11px] text-slate-500">{activeCompanies} ativas</p>
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
        className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Últimos Documentos Recebidos</h2>
              <p className="text-[11px] text-slate-500">10 mais recentes</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["NFe","NFCe","XML"].map(t => {
              const count = documents.filter(d => d.documentType === t).length;
              return count > 0 ? (
                <Badge key={t} className="text-[9px] font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
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