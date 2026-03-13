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
  FileCheck, FileX, LayoutDashboard, ArrowLeft, TrendingUp, Calendar, Layers
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import JSZip from "jszip";

const typeColors = {
  NFe: "bg-blue-500/15 text-blue-600 border-blue-400/30",
  NFCe: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
  XML: "bg-slate-500/15 text-slate-500 border-slate-400/30",
};
const typeBg = {
  NFe: "from-blue-500 to-indigo-600",
  NFCe: "from-emerald-500 to-teal-600",
  XML: "from-slate-400 to-slate-600",
};
const typeGlow = {
  NFe: "shadow-blue-500/30",
  NFCe: "shadow-emerald-500/30",
  XML: "shadow-slate-500/20",
};

export default function ContadorPanel({ user }) {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [comps, docs] = await Promise.all([
        base44.entities.Company.filter({ contadorEmail: user.email }),
        base44.entities.Document.list("-created_date", 20000),
      ]);
      setCompanies(comps);
      const compIds = new Set(comps.map(c => c.id));
      setDocuments(docs.filter(d => compIds.has(d.companyId)));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
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
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      const text = await resp.text();
      return { content: text, filename };
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
      if (result) {
        triggerDownload(result.content, result.filename || `${doc.id}.xml`);
        toast.success("Arquivo baixado com sucesso");
      } else {
        toast.error("Arquivo sem conteúdo disponível");
      }
    } catch (e) {
      console.error("Erro ao baixar:", e);
      toast.error("Erro ao baixar arquivo");
    } finally {
      setDownloading(false);
    }
  };

  const downloadSelected = async () => {
    const docsToDownload = documents.filter(d => selected.includes(d.id));
    if (docsToDownload.length === 0) return;
    if (docsToDownload.length === 1) { await downloadDoc(docsToDownload[0]); return; }

    setDownloading(true);
    try {
      const batchSize = 20;
      const zip = new JSZip();
      let added = 0;
      const companyFolderMap = {};
      companies.forEach(c => {
        companyFolderMap[c.id] = (c.razao_social || c.id).replace(/[\\/:*?"<>|]/g, "_").slice(0, 50);
      });
      const usedPaths = new Set();

      for (let i = 0; i < docsToDownload.length; i += batchSize) {
        const batch = docsToDownload.slice(i, i + batchSize);
        const res = await base44.functions.invoke('getDocumentsForDownload', { documentIds: batch.map(d => d.id) });
        for (const doc of res.data.documents) {
          const result = await getDocContent(doc).catch(() => null);
          if (!result?.content) continue;
          const folder = companyFolderMap[doc.companyId] || "Outros";
          let fname = result.filename;
          let path = `${folder}/${fname}`;
          if (usedPaths.has(path)) {
            const base = fname.replace(/\.xml$/i, "");
            path = `${folder}/${base}_${doc.id}.xml`;
          }
          usedPaths.add(path);
          zip.file(path, result.content);
          added++;
        }
      }

      if (added === 0) { toast.error("Nenhum arquivo pôde ser incluído no ZIP."); return; }
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `documentos_${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`${added} arquivo(s) empacotados com sucesso`);
      setSelected([]);
    } catch (e) {
      console.error("Erro ao baixar arquivos:", e);
      toast.error("Erro ao baixar arquivos");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}>
          <Skeleton className="h-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
        </motion.div>
      ))}
    </div>
  );

  const nfe = documents.filter(d => d.documentType === "NFe").length;
  const nfce = documents.filter(d => d.documentType === "NFCe").length;
  const xml = documents.filter(d => d.documentType === "XML" || !d.documentType).length;

  const statCards = [
    { label: "NF-e", value: nfe, color: "text-blue-500", bg: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30" },
    { label: "NFC-e", value: nfce, color: "text-emerald-500", bg: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" },
    { label: "XML", value: xml, color: "text-slate-400", bg: "from-slate-500 to-slate-600", glow: "shadow-slate-500/20" },
    { label: "Clientes", value: companies.length, color: "text-cyan-400", bg: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="outline" size="sm"
          className="rounded-xl gap-2 border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/40"
          style={{ background: "rgba(255,255,255,0.04)" }}
          onClick={() => navigate("/Dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </Button>
      </motion.div>

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[240px]">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#071124] via-[#0d1e45] to-[#061530]" style={{ opacity: 0.95 }} />
        {/* Dot mesh */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(147,210,255,0.9) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        {/* Glow orbs */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-0 right-0 w-96 h-72 bg-cyan-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          className="absolute bottom-0 left-1/4 w-80 h-64 bg-blue-600/20 rounded-full blur-3xl translate-y-1/3" />

        {/* Animated lines */}
        {[...Array(4)].map((_, i) => (
          <motion.div key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
            style={{ top: `${20 + i * 22}%`, left: 0, right: 0 }}
            animate={{ opacity: [0, 0.5, 0], x: ["-100%", "100%"] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8, ease: "linear" }}
          />
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
                <Badge className="bg-cyan-400/20 text-cyan-300 border-cyan-400/30 text-[10px] uppercase tracking-[0.15em] px-2.5">
                  📊 Portal do Contador
                </Badge>
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

          {/* Stat pills */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-3">
            {statCards.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center hover:bg-white/10 transition-all cursor-default shadow-lg ${s.glow}`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Company Cards */}
      {companies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Seus Clientes</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c, i) => {
              const docsCount = documents.filter(d => d.companyId === c.id).length;
              const isActive = filterCompany === c.id;
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all ${isActive
                    ? "border-blue-400/50 shadow-lg shadow-blue-500/15 bg-gradient-to-br from-blue-50 to-indigo-50"
                    : "border-slate-200/60 shadow-sm hover:shadow-md bg-white"}`}
                  onClick={() => setFilterCompany(isActive ? "all" : c.id)}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${docsCount > 0 ? "from-blue-500 to-cyan-500" : "from-slate-200 to-slate-300"}`} />
                  {isActive && (
                    <div className="absolute inset-0 opacity-5"
                      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                  )}
                  <div className="p-4 flex items-center gap-3 relative">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 transition-all shadow-sm ${isActive
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30"
                      : "bg-slate-100 text-slate-600"}`}>
                      {c.razao_social?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${isActive ? "text-blue-800" : "text-slate-800"}`}>
                        {c.razao_social}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">{c.cnpj}</p>
                    </div>
                    <div className={`text-center px-2.5 py-1 rounded-xl ${docsCount > 0
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-400"}`}>
                      <p className="text-sm font-black">{docsCount}</p>
                      <p className="text-[9px] uppercase tracking-wide">docs</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Documents Table */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-3xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">

        {/* Table Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-blue-50/20 to-white" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Documentos Fiscais
                    {filterCompany !== "all" && (
                      <span className="text-xs text-blue-600 font-normal bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                        {companies.find(c => c.id === filterCompany)?.razao_social}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {filtered.length} arquivo(s) encontrado(s) · {selected.length > 0 && `${selected.length} selecionado(s)`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <AnimatePresence>
                  {selected.length > 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.85, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.85 }}>
                      <Button size="sm" onClick={downloadSelected} disabled={downloading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:opacity-90 shadow-lg shadow-blue-500/25 rounded-xl px-4 gap-1.5">
                        {downloading
                          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Baixando...</>
                          : <><FileDown className="w-3.5 h-3.5" /> Baixar {selected.length} arquivo(s)</>}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button size="sm" variant="outline" onClick={load} className="rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </Button>
                {filterCompany !== "all" && (
                  <Button size="sm" variant="outline" onClick={() => setFilterCompany("all")} className="rounded-xl text-xs border-slate-200">
                    Ver todos
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input className="pl-9 h-9 text-sm rounded-xl border-slate-200 focus:border-blue-400 bg-white"
                  placeholder="Buscar por arquivo, empresa ou chave de acesso..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-52 rounded-xl border-slate-200 bg-white">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-32 rounded-xl border-slate-200 bg-white">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100/80 bg-slate-50/60">
                <TableHead className="w-10 pl-6">
                  <input type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300 accent-blue-600 cursor-pointer" />
                </TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivo</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recebido em</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave de Acesso</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center">
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shadow-inner">
                        <FileX className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Nenhum documento encontrado</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ajuste os filtros ou aguarde novos envios</p>
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
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className={`border-slate-100/80 transition-all group cursor-default ${isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/60"}`}>
                        <TableCell className="pl-6">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.id)}
                            className="rounded border-slate-300 accent-blue-600 cursor-pointer" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${typeBg[type]} flex items-center justify-center flex-shrink-0 shadow-sm ${typeGlow[type]}`}>
                              <FileCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 max-w-[160px] truncate">
                              {doc.originalFilename || doc.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                              {comp?.razao_social?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm text-slate-600 truncate max-w-[120px]">{comp?.razao_social || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold px-2 ${typeColors[type]}`}>
                            {type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <span className="text-xs text-slate-500">
                              {doc.created_date ? (() => { try { return format(new Date(doc.created_date), "dd/MM/yyyy HH:mm"); } catch { return "—"; } })() : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-slate-300 bg-slate-50 px-2 py-0.5 rounded-lg">
                            {doc.accessKey ? `${doc.accessKey.slice(0, 12)}···` : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button size="icon" variant="ghost"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-600 rounded-xl"
                              disabled={downloading}
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

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">{filtered.length} documento(s) · {selected.length} selecionado(s)</p>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-xs text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline">
                Limpar seleção
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}