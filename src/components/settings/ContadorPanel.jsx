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
import { Download, FileText, Building2, Search, FileDown, RefreshCw, FileCheck, FileX, Cpu, Database, LayoutDashboard, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import JSZip from "jszip";

const typeColors = {
  NFe: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  NFCe: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  XML: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const typeBg = {
  NFe: "from-blue-500 to-cyan-500",
  NFCe: "from-emerald-500 to-teal-500",
  XML: "from-slate-500 to-slate-600",
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
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDocContent = async (doc) => {
    // If has xmlContent directly, use it
    if (doc.xmlContent) return { content: doc.xmlContent, filename: doc.filename };
    // If has fileUrl, fetch it
    if (doc.fileUrl) {
      const resp = await fetch(doc.fileUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      return { content: text, filename: doc.filename };
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
      } else {
        toast.error("Arquivo sem conteúdo disponível para download");
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
      // Process in batches of 20 to avoid timeouts
      const batchSize = 20;
      const zip = new JSZip();
      let added = 0;
      const usedFilenames = new Set();

      for (let i = 0; i < docsToDownload.length; i += batchSize) {
        const batch = docsToDownload.slice(i, i + batchSize);
        const res = await base44.functions.invoke('getDocumentsForDownload', { 
          documentIds: batch.map(d => d.id) 
        });
        
        for (const doc of res.data.documents) {
          const result = await getDocContent(doc).catch(() => null);
          if (result?.content) {
            // Ensure unique filenames
            let fname = result.filename || `${doc.id}.xml`;
            if (usedFilenames.has(fname)) {
              const ext = fname.includes(".") ? fname.split(".").pop() : "xml";
              fname = `${fname.replace(`.${ext}`, "")}_${doc.id}.${ext}`;
            }
            usedFilenames.add(fname);
            zip.file(fname, result.content);
            added++;
          }
        }
      }

      if (added === 0) { toast.error("Nenhum arquivo pôde ser incluído no ZIP."); return; }

      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `documentos_${new Date().toISOString().slice(0,10)}.zip`, "application/zip");
      toast.success(`${added} arquivo(s) baixado(s) com sucesso`);
      setSelected([]);
    } catch (e) {
      console.error("Erro ao baixar arquivos:", e);
      toast.error("Erro ao baixar arquivos");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );

  const nfe = documents.filter(d => d.documentType === "NFe").length;
  const nfce = documents.filter(d => d.documentType === "NFCe").length;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => navigate("/Dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
        </Button>
      </div>

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1729] via-[#1a2744] to-[#0c2340]" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(99,179,237,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />

        {/* Animated dots */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
            style={{ top: `${20 + i * 12}%`, left: `${10 + i * 14}%` }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
            transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}

        <div className="relative p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/40">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] uppercase tracking-widest">Portal Contador</Badge>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Olá, {user?.full_name?.split(" ")[0] || "Contador"} 👋</h1>
            <p className="text-slate-400 mt-1 text-sm">{companies.length} empresas vinculadas · {documents.length} documentos recebidos</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-3 flex-wrap">
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center min-w-[80px]">
              <p className="text-2xl font-bold text-blue-400">{nfe}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">NF-e</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center min-w-[80px]">
              <p className="text-2xl font-bold text-emerald-400">{nfce}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">NFC-e</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center min-w-[80px]">
              <p className="text-2xl font-bold text-cyan-400">{companies.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Clientes</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Company cards */}
      {companies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Seus Clientes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c, i) => {
              const docsCount = documents.filter(d => d.companyId === c.id).length;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                  className="relative rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group cursor-pointer"
                  onClick={() => setFilterCompany(filterCompany === c.id ? "all" : c.id)}>
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${docsCount > 0 ? "from-blue-500 to-cyan-500" : "from-slate-300 to-slate-400"}`} />
                  <div className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${filterCompany === c.id ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600"} transition-all`}>
                      {c.razao_social?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.razao_social}</p>
                      <p className="text-[11px] text-slate-400 truncate">{c.cnpj}</p>
                    </div>
                    <Badge className={`text-[10px] font-bold ${docsCount > 0 ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                      {docsCount}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Documents Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Documentos Fiscais
                  {filterCompany !== "all" && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      · {companies.find(c => c.id === filterCompany)?.razao_social}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">{filtered.length} arquivo(s) encontrado(s)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <AnimatePresence>
                {selected.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <Button size="sm" onClick={downloadSelected} disabled={downloading}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 hover:opacity-90 shadow-md shadow-blue-500/20 rounded-xl">
                      {downloading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
                      {downloading ? "Baixando..." : `Baixar ${selected.length} arquivo(s)`}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button size="sm" variant="outline" onClick={load} className="rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              {filterCompany !== "all" && (
                <Button size="sm" variant="outline" onClick={() => setFilterCompany("all")} className="rounded-xl text-xs">
                  Ver todos
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input className="pl-8 h-8 text-sm rounded-xl border-slate-200" placeholder="Buscar arquivo, empresa, chave..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-52 rounded-xl border-slate-200">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-32 rounded-xl border-slate-200">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="NFe">NF-e</SelectItem>
                <SelectItem value="NFCe">NFC-e</SelectItem>
                <SelectItem value="XML">XML</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/50">
                <TableHead className="w-8 pl-6">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivo</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recebido em</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chave de Acesso</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <FileX className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">Nenhum documento encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filtered.map((doc, i) => {
                    const comp = companies.find(c => c.id === doc.companyId);
                    return (
                      <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="border-slate-100 hover:bg-blue-50/30 transition-colors group">
                        <TableCell className="pl-6">
                          <input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${typeBg[doc.documentType] || typeBg.XML} flex items-center justify-center flex-shrink-0`}>
                              <FileCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 max-w-[160px] truncate">
                              {doc.originalFilename || doc.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{comp?.razao_social || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold ${typeColors[doc.documentType] || typeColors.XML}`}>
                            {doc.documentType || "XML"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">
                                            {doc.created_date ? (() => { try { return format(new Date(doc.created_date), "dd/MM/yyyy HH:mm"); } catch { return "—"; } })() : "—"}
                                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-slate-400">
                            {doc.accessKey ? `${doc.accessKey.slice(0, 14)}...` : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-600 rounded-lg"
                            disabled={downloading}
                            onClick={() => downloadDoc(doc)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}