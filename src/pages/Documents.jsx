import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, FileText, Download, Eye, Trash2, MoreHorizontal,
  PackageOpen, Copy, RefreshCw, CheckCircle2, HardDrive, Building2, Wand2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import XmlViewerModal from "../components/documents/XmlViewerModal";
import { listAll } from "@/lib/base44-pagination";

const STATUS = {
  recebido:  { label: "Recebido",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  processado: { label: "Processado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  erro:       { label: "Erro",       cls: "bg-red-50 text-red-700 border-red-200" },
};

const TYPES = {
  NFe:  { label: "NF-e",   cls: "bg-blue-100 text-blue-700 border-0" },
  NFCe: { label: "NFC-e",  cls: "bg-violet-100 text-violet-700 border-0" },
  XML:  { label: "XML",    cls: "bg-slate-100 text-slate-600 border-0" },
};

const SOURCES = {
  agent:  { label: "Agente",  cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  manual: { label: "Manual",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function Documents() {
  const [documents, setDocuments]     = useState([]);
  const [companies, setCompanies]     = useState([]);
  const [companiesMap, setCompaniesMap] = useState({});
  const [loading, setLoading]         = useState(true);

  const [search, setSearch]           = useState("");
  const [statusF, setStatusF]         = useState("all");
  const [typeF, setTypeF]             = useState("all");
  const [companyF, setCompanyF]       = useState(() => new URLSearchParams(window.location.search).get("company_id") || "all");
  const [sourceF, setSourceF]         = useState("all");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [competenciaF, setCompetenciaF] = useState("");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(50);

  const [selected, setSelected]       = useState(new Set());
  const [viewerDoc, setViewerDoc]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [copiedKey, setCopiedKey]     = useState(null);

  const loadData = async () => {
    const [u, docs, comps] = await Promise.all([
      base44.auth.me(),
      listAll(base44.entities.Document, "-created_date", {
        fields: [
          "id", "companyId", "filename", "originalFilename", "documentType", "status", "source",
          "uploadedAt", "created_date", "dataEmissao", "competencia", "accessKey", "emitterCnpj", "fileUrl", "created_by",
        ],
      }),
      listAll(base44.entities.Company, "-created_date", {
        fields: ["id", "razao_social", "nome_fantasia", "cnpj", "contadorEmail", "contador_responsavel"],
      }),
    ]);
    setUser(u);
    const role = u?.role;
    let myCompanies;
    let myDocs;
    if (role === "contador") {
      myCompanies = comps.filter(c => c.contadorEmail === u.email);
      const myIds = new Set(myCompanies.map(c => c.id));
      myDocs = docs.filter(d => myIds.has(d.companyId));
    } else if (role === "empresa") {
      // empresa só vê documentos que ela mesma enviou
      myDocs = docs.filter(d => d.created_by === u.email);
      const myIds = new Set(myDocs.map(d => d.companyId));
      myCompanies = comps.filter(c => myIds.has(c.id));
    } else {
      myCompanies = comps; // admin / suporte veem tudo
      myDocs = docs;
    }
    setDocuments(myDocs || docs);
    setCompanies(myCompanies);
    const map = {};
    myCompanies.forEach(c => { map[c.id] = c; });
    setCompaniesMap(map);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setPage(1); }, [search, statusF, typeF, companyF, sourceF, dateFrom, dateTo, competenciaF]);

  const getName = (cId) => {
    const c = companiesMap[cId];
    return c?.nome_fantasia || c?.razao_social || "—";
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.Document.delete(deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const triggerDownload = (href, filename) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); }, 100);
  };

  const handleDownload = (doc) => {
    const content = doc.xmlContent || "";
    const blob = new Blob([content], { type: "text/xml" });
    const blobUrl = URL.createObjectURL(blob);
    triggerDownload(doc.fileUrl || blobUrl, doc.filename || `${doc.id}.xml`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
  };

  const [downloading, setDownloading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [user, setUser] = useState(null);
  const [backupCompanyId, setBackupCompanyId] = useState(null);
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(false);

  const handleBulkDownload = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    const selectedDocs = documents.filter(d => selected.has(d.id));
    const zip = new JSZip();
    await Promise.all(selectedDocs.map(async (doc) => {
      const fname = doc.originalFilename || doc.filename || `${doc.id}.xml`;
      if (doc.fileUrl) {
        const res = await fetch(doc.fileUrl);
        const blob = await res.blob();
        zip.file(fname, blob);
      } else if (doc.xmlContent) {
        zip.file(fname, doc.xmlContent);
      }
    }));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `documentos_fiscais_${format(new Date(), "yyyyMMdd_HHmm")}.zip`);
    setTimeout(() => URL.revokeObjectURL(url), 200);
    setDownloading(false);
  };

  const handleDownloadOriginal = (doc) => {
    if (!doc.fileUrl) { handleDownload(doc); return; }
    triggerDownload(doc.fileUrl, doc.originalFilename || doc.filename || `${doc.id}.xml`);
  };

  const handleBackupByCompany = async (companyId) => {
    setBackupCompanyId(companyId);
    const company = companiesMap[companyId];
    const companyDocs = documents.filter(d => d.companyId === companyId);
    const zip = new JSZip();
    await Promise.all(companyDocs.map(async (doc) => {
      const fname = doc.originalFilename || doc.filename || `${doc.id}.xml`;
      if (doc.fileUrl) {
        const res = await fetch(doc.fileUrl);
        const blob = await res.blob();
        zip.file(fname, blob);
      } else if (doc.xmlContent) {
        zip.file(fname, doc.xmlContent);
      }
    }));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const companyName = (company?.nome_fantasia || company?.razao_social || companyId).replace(/[^a-zA-Z0-9]/g, "_");
    triggerDownload(url, `backup_${companyName}_${format(new Date(), "yyyyMMdd")}.zip`);
    setTimeout(() => URL.revokeObjectURL(url), 200);
    setBackupCompanyId(null);
  };

  const handleDeleteAllByCompany = async () => {
    if (!deleteCompanyTarget) return;
    setDeletingCompany(true);
    const companyDocs = documents.filter(d => d.companyId === deleteCompanyTarget.id);
    await Promise.all(companyDocs.map(d => base44.entities.Document.delete(d.id)));
    setDeleteCompanyTarget(null);
    setDeletingCompany(false);
    loadData();
  };

  const [backfillProgress, setBackfillProgress] = useState("");

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillProgress("Iniciando...");
    let totalUpdated = 0;
    let round = 0;
    while (true) {
      round++;
      setBackfillProgress(`Processando lote ${round}... (${totalUpdated} atualizados até agora)`);
      const res = await base44.functions.invoke("backfillEmissionDates", {});
      const data = res.data;
      totalUpdated += data?.updated || 0;
      if (!data?.hasMore || data?.updated === 0) {
        setBackfillProgress("");
        alert(`Concluído! ${totalUpdated} documentos atualizados.\n${data?.message || ""}`);
        break;
      }
      // Pequena pausa entre lotes
      await new Promise(r => setTimeout(r, 1000));
    }
    setBackfilling(false);
    loadData();
  };

  const copyKey = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = documents.filter(d => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      [d.filename, d.originalFilename, getName(d.companyId), d.accessKey, d.emitterCnpj]
        .some(v => v?.toLowerCase().includes(s));
    const matchStatus  = statusF === "all" || d.status === statusF;
    const matchType    = typeF   === "all" || d.documentType === typeF;
    const matchCompany = companyF === "all" || d.companyId === companyF;
    const matchSource  = sourceF === "all" || d.source === sourceF;
    const dtEmissao = d.dataEmissao || "";
    const matchFrom = !dateFrom || (dtEmissao >= dateFrom);
    const matchTo   = !dateTo   || (dtEmissao && dtEmissao <= dateTo);
    const matchCompetencia = !competenciaF || d.competencia === competenciaF;
    return matchSearch && matchStatus && matchType && matchCompany && matchSource && matchFrom && matchTo && matchCompetencia;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginated = filtered.slice(pageStart, pageEnd);

  const allChecked = paginated.length > 0 && paginated.every(d => selected.has(d.id));
  const toggleAll  = () => {
    if (allChecked) {
      setSelected(prev => {
        const n = new Set(prev);
        paginated.forEach(d => n.delete(d.id));
        return n;
      });
    } else {
      setSelected(prev => new Set([...prev, ...paginated.map(d => d.id)]));
    }
  };

  // Competências disponíveis para filtro
  const competencias = [...new Set(documents.map(d => d.competencia).filter(Boolean))].sort().reverse();

  const hasFilters = search || statusF !== "all" || typeF !== "all" || companyF !== "all" || sourceF !== "all" || dateFrom || dateTo || competenciaF;
  const clearFilters = () => {
    setSearch(""); setStatusF("all"); setTypeF("all");
    setCompanyF("all"); setSourceF("all"); setDateFrom(""); setDateTo(""); setCompetenciaF("");
  };

  if (loading) return (
    <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos Fiscais</h1>
          <p className="text-sm text-slate-500 mt-1">
            {documents.length} documentos · {filtered.length} exibidos
            {selected.size > 0 && ` · ${filtered.filter(d => selected.has(d.id)).length} selecionados`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {user?.role === "admin" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackfill}
              disabled={backfilling}
              title="Preencher datas de emissão em documentos antigos"
              className="text-amber-400 border-amber-700 hover:bg-amber-900/20"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              {backfilling ? (backfillProgress || "Processando...") : "Preencher datas"}
            </Button>
          )}
          {selected.size > 0 && (
            <Button onClick={handleBulkDownload} disabled={downloading} className="bg-blue-600 hover:bg-blue-700">
              <PackageOpen className="w-4 h-4 mr-2" />
              {downloading ? "Preparando..." : `Baixar ${selected.size} arquivo(s)`}
            </Button>
          )}
        </div>
      </div>

      {/* Admin: Backup por Empresa */}
      {user?.role === "admin" && companies.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-200">Backup / Limpeza por Empresa</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {companies.map(c => {
                const count = documents.filter(d => d.companyId === c.id).length;
                const isLoading = backupCompanyId === c.id;
                return (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{c.nome_fantasia || c.razao_social}</p>
                        <p className="text-[10px] text-slate-500">{count} docs</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-cyan-800 text-cyan-400 hover:bg-cyan-900/30"
                        onClick={() => handleBackupByCompany(c.id)}
                        disabled={isLoading || count === 0}
                        title="Baixar ZIP com todos os documentos"
                      >
                        {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        <span className="ml-1">ZIP</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-red-800 text-red-400 hover:bg-red-900/30"
                        onClick={() => setDeleteCompanyTarget(c)}
                        disabled={count === 0}
                        title="Apagar todos os documentos desta empresa"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por arquivo, chave de acesso, CNPJ emitente..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={companyF} onValueChange={setCompanyF}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Empresas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeF} onValueChange={setTypeF}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="NFe">NF-e</SelectItem>
                  <SelectItem value="NFCe">NFC-e</SelectItem>
                  <SelectItem value="XML">XML</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusF} onValueChange={setStatusF}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="processado">Processado</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceF} onValueChange={setSourceF}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={competenciaF} onValueChange={setCompetenciaF}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Competência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todas Competências</SelectItem>
                  {competencias.map(c => (
                    <SelectItem key={c} value={c}>
                      {c.slice(5, 7)}/{c.slice(0, 4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Emissão:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">De:</span>
              <Input type="date" className="w-36 h-8 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Até:</span>
              <Input type="date" className="w-36 h-8 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-slate-400 text-xs h-8" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/50">
                <TableHead className="w-10 pl-4">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Empresa</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Arquivo</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tipo</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Chave de Acesso</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">CNPJ Emitente</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Emissão</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Competência</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Origem</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Recebido em</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(doc => {
                const st  = STATUS[doc.status] || STATUS.recebido;
                const tp  = TYPES[doc.documentType] || TYPES.XML;
                const src = SOURCES[doc.source] || SOURCES.manual;
                const docDate = doc.uploadedAt || doc.created_date;
                return (
                  <TableRow key={doc.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="pl-4">
                      <Checkbox checked={selected.has(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{getName(doc.companyId)}</TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[160px] truncate" title={doc.filename}>
                      {doc.filename || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-bold ${tp.cls}`}>{tp.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.accessKey ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-slate-500 max-w-[110px] truncate" title={doc.accessKey}>
                            {doc.accessKey.slice(0, 14)}…
                          </span>
                          <button
                            onClick={() => copyKey(doc.accessKey, doc.id)}
                            className="text-slate-300 hover:text-blue-500 transition-colors"
                          >
                            {copiedKey === doc.id
                              ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                              : <Copy className="w-3 h-3" />
                            }
                          </button>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {doc.emitterCnpj || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {doc.dataEmissao ? format(new Date(doc.dataEmissao + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-cyan-400 whitespace-nowrap">
                      {doc.competencia ? `${doc.competencia.slice(5, 7)}/${doc.competencia.slice(0, 4)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${src.cls}`}>{src.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${st.cls}`}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {docDate ? format(new Date(docDate), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewerDoc(doc)}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar XML
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="w-4 h-4 mr-2" /> Baixar XML
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadOriginal(doc)}>
                            <Download className="w-4 h-4 mr-2" /> Baixar Original
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget(doc)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum documento encontrado</p>
                    <p className="text-xs mt-1">Ajuste os filtros ou aguarde o agente enviar documentos</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {filtered.length} documento(s) · exibindo {pageStart + 1}-{Math.min(pageEnd, filtered.length)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600"
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={200}>200 por página</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Anterior
              </Button>
              <span className="text-xs text-slate-500">Página {safePage} de {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      <XmlViewerModal
        open={!!viewerDoc}
        document={viewerDoc}
        onClose={() => setViewerDoc(null)}
        onDownload={handleDownload}
      />

      {/* Delete all by company */}
      <AlertDialog open={!!deleteCompanyTarget} onOpenChange={() => setDeleteCompanyTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os documentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir <strong>{documents.filter(d => d.companyId === deleteCompanyTarget?.id).length} documentos</strong> da empresa <strong>{deleteCompanyTarget?.nome_fantasia || deleteCompanyTarget?.razao_social}</strong>. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllByCompany} disabled={deletingCompany} className="bg-red-600 hover:bg-red-700">
              {deletingCompany ? "Apagando..." : "Apagar Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir <strong>{deleteTarget?.filename}</strong>? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
