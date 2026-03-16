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
  PackageOpen, Copy, RefreshCw, CheckCircle2, HardDrive, Building2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import XmlViewerModal from "../components/documents/XmlViewerModal";

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

  const [selected, setSelected]       = useState(new Set());
  const [viewerDoc, setViewerDoc]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [copiedKey, setCopiedKey]     = useState(null);

  const loadData = async () => {
    const [u, docs, comps] = await Promise.all([
      base44.auth.me(),
      base44.entities.Document.list("-created_date", 500),
      base44.entities.Company.list("-created_date", 200),
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
    const dt = d.uploadedAt || d.created_date || "";
    const matchFrom = !dateFrom || dt >= dateFrom;
    const matchTo   = !dateTo   || dt <= dateTo + "T23:59:59";
    return matchSearch && matchStatus && matchType && matchCompany && matchSource && matchFrom && matchTo;
  });

  const allChecked = filtered.length > 0 && filtered.every(d => selected.has(d.id));
  const toggleAll  = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(d => d.id)));
  };

  const hasFilters = search || statusF !== "all" || typeF !== "all" || companyF !== "all" || sourceF !== "all" || dateFrom || dateTo;
  const clearFilters = () => {
    setSearch(""); setStatusF("all"); setTypeF("all");
    setCompanyF("all"); setSourceF("all"); setDateFrom(""); setDateTo("");
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
          {selected.size > 0 && (
            <Button onClick={handleBulkDownload} disabled={downloading} className="bg-blue-600 hover:bg-blue-700">
              <PackageOpen className="w-4 h-4 mr-2" />
              {downloading ? "Preparando..." : `Baixar ${selected.size} arquivo(s)`}
            </Button>
          )}
        </div>
      </div>

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
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Origem</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Data/Hora</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
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
                  <TableCell colSpan={10} className="text-center py-16 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum documento encontrado</p>
                    <p className="text-xs mt-1">Ajuste os filtros ou aguarde o agente enviar documentos</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <XmlViewerModal
        open={!!viewerDoc}
        document={viewerDoc}
        onClose={() => setViewerDoc(null)}
        onDownload={handleDownload}
      />

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