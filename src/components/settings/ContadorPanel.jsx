import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, FileText, Building2, Search, FileDown, RefreshCw,
  FileCheck, FileX, LayoutDashboard, TrendingUp, Calendar, Layers,
  Receipt, CreditCard, Banknote, AlertTriangle, Sparkles, Lock,
  Clock, CheckCircle2, ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isAfter, isBefore, addDays } from "date-fns";
import JSZip from "jszip";
import UpgradeModal from "../contador/UpgradeModal";

const typeColors = {
  NFe: "bg-blue-500/15 text-blue-400 border-blue-400/30",
  NFCe: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  XML: "bg-slate-500/15 text-slate-400 border-slate-400/30",
};
const typeBg = {
  NFe: "from-blue-500 to-indigo-600",
  NFCe: "from-emerald-500 to-teal-600",
  XML: "from-slate-400 to-slate-600",
};

const isPro = (user) => user?.plan === "pro_contador" || user?.pro_enabled === true;

export default function ContadorPanel({ user }) {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [taxGuides, setTaxGuides] = useState([]);
  const [accountsReceivable, setAccountsReceivable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const userIsPro = isPro(user);

  const load = async () => {
    setLoading(true);
    try {
      const comps = await base44.entities.Company.filter({ contadorEmail: user.email });
      setCompanies(comps);
      const compIds = new Set(comps.map(c => c.id));
      const docs = await base44.entities.Document.list("-created_date", 20000);
      setDocuments(docs.filter(d => compIds.has(d.companyId)));

      if (userIsPro) {
        try {
          const [guides, ar] = await Promise.all([
            base44.entities.TaxGuide.filter({ owner_user_id: user.email }),
            base44.entities.AccountReceivable.filter({ owner_user_id: user.email }),
          ]);
          setTaxGuides(guides);
          setAccountsReceivable(ar);
        } catch (_) {}
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { if (user?.email) load(); }, [user]);

  const filtered = documents.filter(d => {
    const comp = companies.find(c => c.id === d.companyId);
    const matchSearch = !search ||
      d.originalFilename?.toLowerCase().includes(search.toLowerCase()) ||
      comp?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      d.accessKey?.includes(search);
    const matchComp = filterCompany === "all" || d.companyId === filterCompany;
    const matchType = filterType === "all" || d.documentType === filterType;
    return matchSearch && matchComp && matchType;
  });

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(d => d.id));

  const triggerDownload = (content, filename, mimeType = "application/xml") => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const ensureXmlExt = (name) => {
    if (!name) return "documento.xml";
    return name.toLowerCase().endsWith(".xml") ? name : `${name}.xml`;
  };

  const getDocContent = async (doc) => {
    const filename = ensureXmlExt(doc.filename);
    if (doc.xmlContent) return { content: doc.xmlContent, filename };
    if (doc.fileUrl) {
      const resp = await fetch(doc.fileUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return { content: await resp.text(), filename };
    }
    return null;
  };

  const downloadDoc = async (doc) => {
    setDownloading(true);
    try {
      const res = await base44.functions.invoke('getDocumentsForDownload', { documentIds: [doc.id] });
      const fullDoc = res.data.documents[0];
      if (!fullDoc) { toast.error("Documento não encontrado"); return; }
      const result = await getDocContent(fullDoc);
      if (result) { triggerDownload(result.content, result.filename || `${doc.id}.xml`); toast.success("Arquivo baixado"); }
      else toast.error("Arquivo sem conteúdo");
    } catch (e) { toast.error("Erro ao baixar arquivo"); }
    finally { setDownloading(false); }
  };

  const downloadSelected = async () => {
    const docsToDownload = documents.filter(d => selected.includes(d.id));
    if (docsToDownload.length === 0) return;
    if (docsToDownload.length === 1) { await downloadDoc(docsToDownload[0]); return; }
    setDownloading(true);
    try {
      const zip = new JSZip();
      const companyFolderMap = {};
      companies.forEach(c => { companyFolderMap[c.id] = (c.razao_social || c.id).replace(/[\\/:*?"<>|]/g, "_").slice(0, 50); });
      const usedPaths = new Set();
      let added = 0;
      for (let i = 0; i < docsToDownload.length; i += 20) {
        const batch = docsToDownload.slice(i, i + 20);
        const res = await base44.functions.invoke('getDocumentsForDownload', { documentIds: batch.map(d => d.id) });
        for (const doc of res.data.documents) {
          const result = await getDocContent(doc).catch(() => null);
          if (!result?.content) continue;
          const folder = companyFolderMap[doc.companyId] || "Outros";
          let path = `${folder}/${result.filename}`;
          if (usedPaths.has(path)) path = `${folder}/${result.filename.replace(/\.xml$/i, "")}_${doc.id}.xml`;
          usedPaths.add(path);
          zip.file(path, result.content);
          added++;
        }
      }
      if (added === 0) { toast.error("Nenhum arquivo disponível"); return; }
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `documentos_${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`${added} arquivo(s) baixados`);
      setSelected([]);
    } catch (e) { toast.error("Erro ao baixar arquivos"); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );

  const nfe = documents.filter(d => d.documentType === "NFe").length;
  const nfce = documents.filter(d => d.documentType === "NFCe").length;
  const xml = documents.filter(d => d.documentType === "XML" || !d.documentType).length;
  const pendingGuides = taxGuides.filter(g => g.status === "pendente" || g.status === "vencida").length;
  const overdueAR = accountsReceivable.filter(a => a.status === "atrasado").length;
  const upcomingAR = accountsReceivable.filter(a => {
    if (a.status !== "pendente" || !a.vencimento) return false;
    const d = new Date(a.vencimento);
    return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), 7));
  });

  const topCards = [
    { label: "NF-e", value: nfe, color: "text-blue-400", bg: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30" },
    { label: "NFC-e", value: nfce, color: "text-emerald-400", bg: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" },
    { label: "XML", value: xml, color: "text-slate-400", bg: "from-slate-500 to-slate-600", glow: "shadow-slate-500/20" },
    { label: "Clientes", value: companies.length, color: "text-cyan-400", bg: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/30" },
  ];

  const moduleCards = [
    {
      label: "Guias Pendentes", value: userIsPro ? pendingGuides : "—",
      icon: Receipt, color: "from-amber-500 to-orange-500", isPremium: !userIsPro,
      onClick: () => userIsPro ? navigate("/TaxGuides") : setUpgradeModal(true),
    },
    {
      label: "Contas a Pagar", value: userIsPro ? "Ver" : "—",
      icon: CreditCard, color: "from-red-500 to-rose-600", isPremium: !userIsPro,
      onClick: () => userIsPro ? navigate("/ContasAPagar") : setUpgradeModal(true),
    },
    {
      label: "Contas a Receber", value: userIsPro ? overdueAR + " atraso" : "—",
      icon: Banknote, color: "from-green-500 to-emerald-600", isPremium: !userIsPro,
      onClick: () => userIsPro ? navigate("/ContasAReceber") : setUpgradeModal(true),
    },
    {
      label: "Mensalidades Atraso", value: userIsPro ? overdueAR : "—",
      icon: AlertTriangle, color: "from-rose-500 to-red-600", isPremium: !userIsPro,
      onClick: () => userIsPro ? navigate("/ContasAReceber") : setUpgradeModal(true),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px]">
        <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=80" alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#071124] via-[#0d1e45] to-[#061530]" style={{ opacity: 0.97 }} />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(6,182,212,1) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-0 right-0 w-96 h-72 bg-cyan-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        {[...Array(3)].map((_, i) => (
          <motion.div key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
            style={{ top: `${25 + i * 25}%`, left: 0, right: 0 }}
            animate={{ opacity: [0, 0.4, 0], x: ["-100%", "100%"] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 1.2, ease: "linear" }} />
        ))}

        <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ boxShadow: ["0 0 20px rgba(6,182,212,0.3)", "0 0 40px rgba(6,182,212,0.6)", "0 0 20px rgba(6,182,212,0.3)"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <LayoutDashboard className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-400/20 text-cyan-300 border-cyan-400/30 text-[10px] uppercase tracking-[0.15em] px-2.5">
                    📊 Portal do Contador
                  </Badge>
                  {userIsPro ? (
                    <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] uppercase tracking-[0.1em] px-2 gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> PRO
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-400/10 text-slate-400 border-slate-400/20 text-[10px] uppercase tracking-[0.1em] px-2">
                      FREE
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-1">Gestão fiscal centralizada</p>
              </div>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight">
              Olá, <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {user?.full_name?.split(" ")[0] || "Contador"}
              </span> 👋
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              {companies.length} empresa(s) vinculada(s) · {documents.length} documentos recebidos
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-3">
            {topCards.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }}
                whileHover={{ scale: 1.05 }}
                className={`px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center hover:bg-white/10 transition-all cursor-default shadow-lg ${s.glow}`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Module Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {moduleCards.map((card, i) => (
          <motion.div key={card.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
            whileHover={{ y: -3 }}
            className="relative rounded-2xl border overflow-hidden cursor-pointer group transition-all"
            style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(255,255,255,0.07)" }}
            onClick={card.onClick}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-md`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                {card.isPremium ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400 mt-1" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 mt-1 group-hover:text-slate-400 transition-colors" />
                )}
              </div>
              <p className="text-xl font-black text-white">{card.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{card.label}</p>
              {card.isPremium && (
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">⭐ Plano PRO</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Upsell card for free users */}
      {!userIsPro && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="relative rounded-3xl overflow-hidden p-6 cursor-pointer group"
          style={{ background: "linear-gradient(135deg, #0d1830, #0f2040)", border: "1px solid rgba(6,182,212,0.15)" }}
          onClick={() => setUpgradeModal(true)}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(6,182,212,0.5) 0%, transparent 40%), radial-gradient(circle at 80% 50%, rgba(99,102,241,0.4) 0%, transparent 40%)" }} />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30 flex-shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h3 className="text-lg font-black text-white">Evolua para o ProContador</h3>
                <p className="text-sm text-slate-400">Libere guias de impostos, contas a pagar e receber, relatórios, WhatsApp, Email e muito mais.</p>
              </div>
            </div>
            <Button className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 hover:opacity-90 shadow-lg shadow-amber-500/30 px-6 flex-shrink-0 gap-2">
              <Sparkles className="w-4 h-4" /> Quero assinar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Companies */}
      {companies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-cyan-400/80 uppercase tracking-wider">Seus Clientes</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c, i) => {
              const docsCount = documents.filter(d => d.companyId === c.id).length;
              const isActive = filterCompany === c.id;
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl border overflow-hidden cursor-pointer transition-all"
                  style={{
                    background: isActive ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.04)",
                    borderColor: isActive ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.07)"
                  }}
                  onClick={() => setFilterCompany(isActive ? "all" : c.id)}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${docsCount > 0 ? "from-blue-500 to-cyan-500" : "from-slate-600 to-slate-700"}`} />
                  <div className="p-4 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 shadow-sm transition-all ${isActive ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white" : "text-slate-300"}`}
                      style={!isActive ? { background: "rgba(255,255,255,0.08)" } : {}}>
                      {c.razao_social?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${isActive ? "text-cyan-300" : "text-slate-200"}`}>{c.razao_social}</p>
                      <p className="text-[11px] text-slate-500 truncate font-mono">{c.cnpj}</p>
                    </div>
                    <div className="text-center px-2.5 py-1 rounded-xl" style={{ background: docsCount > 0 ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)" }}>
                      <p className={`text-sm font-black ${docsCount > 0 ? "text-blue-400" : "text-slate-500"}`}>{docsCount}</p>
                      <p className="text-[9px] uppercase tracking-wide text-slate-500">docs</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Documents Table */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(6,182,212,0.12)" }}>
        <div className="relative px-6 py-5 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Documentos Fiscais</h2>
                  <p className="text-xs text-slate-400">{filtered.length} arquivo(s) · {selected.length > 0 && `${selected.length} selecionado(s)`}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <AnimatePresence>
                  {selected.length > 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}>
                      <Button size="sm" onClick={downloadSelected} disabled={downloading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:opacity-90 shadow-lg shadow-blue-500/25 rounded-xl px-4 gap-1.5">
                        {downloading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Baixando...</> : <><FileDown className="w-3.5 h-3.5" /> Baixar {selected.length}</>}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button size="sm" variant="outline" onClick={load}
                  className="rounded-xl gap-1.5 border-white/10 text-slate-400 hover:text-white"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input className="pl-9 h-9 text-sm rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                  placeholder="Buscar por arquivo, empresa ou chave de acesso..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-52 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-32 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
                  <Layers className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="NFe">NF-e</SelectItem>
                  <SelectItem value="NFCe">NFC-e</SelectItem>
                  <SelectItem value="XML">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                <TableHead className="w-10 pl-6">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll}
                    className="rounded border-slate-600 accent-blue-500 cursor-pointer" />
                </TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Arquivo</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresa</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recebido em</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Origem</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center">
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <FileX className="w-8 h-8 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-400">Nenhum documento encontrado</p>
                        <p className="text-xs text-slate-600 mt-0.5">Aguarde novos envios do agente ou ajuste os filtros.</p>
                      </div>
                    </motion.div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filtered.map((doc, i) => {
                    const comp = companies.find(c => c.id === doc.companyId);
                    const isSelected = selected.includes(doc.id);
                    const type = doc.documentType || "XML";
                    return (
                      <motion.tr key={doc.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                        className="group cursor-default transition-all"
                        style={{ borderColor: "rgba(255,255,255,0.04)", background: isSelected ? "rgba(59,130,246,0.08)" : "transparent" }}>
                        <TableCell className="pl-6">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.id)}
                            className="rounded border-slate-600 accent-blue-500 cursor-pointer" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${typeBg[type]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <FileCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-300 max-w-[160px] truncate">
                              {doc.originalFilename || doc.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.08)" }}>
                              {comp?.razao_social?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm text-slate-400 truncate max-w-[120px]">{comp?.razao_social || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold px-2 ${typeColors[type]}`}>{type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <span className="text-xs text-slate-500">
                              {doc.created_date ? (() => { try { return format(new Date(doc.created_date), "dd/MM/yyyy HH:mm"); } catch { return "—"; } })() : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.source === "agent" ? (
                            <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 gap-1">
                              🤖 Agente
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] bg-slate-500/10 text-slate-400 border-slate-500/20">
                              Manual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button size="icon" variant="ghost" disabled={downloading}
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:text-blue-400"
                              style={{ background: "rgba(59,130,246,0.1)" }}
                              onClick={() => downloadDoc(doc)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </motion.div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs text-slate-500">{filtered.length} documento(s) · {selected.length} selecionado(s)</p>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline">
                Limpar seleção
              </button>
            )}
          </div>
        )}
      </motion.div>

      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
    </div>
  );
}