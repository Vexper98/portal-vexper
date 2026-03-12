import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Building2, Search, FileDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import JSZip from "jszip";

const typeColors = {
  NFe: "bg-blue-50 text-blue-700 border-blue-200",
  NFCe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  XML: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function ContadorPanel({ user }) {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState([]);

  const load = async () => {
    setLoading(true);
    const [comps, docs] = await Promise.all([
      base44.entities.Company.filter({ contadorEmail: user.email }),
      base44.entities.Document.list("-created_date", 200),
    ]);
    setCompanies(comps);
    const compIds = new Set(comps.map(c => c.id));
    setDocuments(docs.filter(d => compIds.has(d.companyId)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map(d => d.id));
  };

  const downloadDoc = (doc) => {
    if (doc.xmlContent) {
      const blob = new Blob([doc.xmlContent], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFilename || doc.filename || "documento.xml";
      a.click();
      URL.revokeObjectURL(url);
    } else if (doc.fileUrl) {
      window.open(doc.fileUrl, "_blank");
    }
  };

  const downloadSelected = async () => {
    const docs = documents.filter(d => selected.includes(d.id));
    if (docs.length === 1) { downloadDoc(docs[0]); return; }
    const zip = new JSZip();
    for (const doc of docs) {
      const content = doc.xmlContent || "";
      if (content) zip.file(doc.originalFilename || doc.filename || `${doc.id}.xml`, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documentos.zip";
    a.click();
    URL.revokeObjectURL(url);
    setSelected([]);
  };

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Empresas vinculadas</p>
            <p className="text-2xl font-bold text-slate-800">{companies.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Total de documentos</p>
            <p className="text-2xl font-bold text-slate-800">{documents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">NF-e recebidas</p>
            <p className="text-2xl font-bold text-blue-600">{documents.filter(d => d.documentType === "NFe").length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">NFC-e recebidas</p>
            <p className="text-2xl font-bold text-emerald-600">{documents.filter(d => d.documentType === "NFCe").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Documentos dos Clientes
            </CardTitle>
            <div className="flex gap-2">
              {selected.length > 0 && (
                <Button size="sm" onClick={downloadSelected} className="bg-blue-600 hover:bg-blue-700">
                  <FileDown className="w-3.5 h-3.5 mr-1" /> Baixar {selected.length} arquivo(s)
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input className="pl-8 h-8 text-sm" placeholder="Buscar arquivo, empresa, chave..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-48">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-32">
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="w-8 pl-4">
                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Arquivo</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Empresa</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Data</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Chave</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-12 text-sm">
                      Nenhum documento encontrado.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(doc => {
                  const comp = companies.find(c => c.id === doc.companyId);
                  return (
                    <TableRow key={doc.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="pl-4">
                        <input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="rounded" />
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-800 max-w-[180px] truncate">
                        {doc.originalFilename || doc.filename}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{comp?.razao_social || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${typeColors[doc.documentType] || typeColors.XML}`}>
                          {doc.documentType || "XML"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {doc.created_date ? format(new Date(doc.created_date), "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400 max-w-[120px] truncate">
                        {doc.accessKey ? `${doc.accessKey.slice(0, 12)}...` : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadDoc(doc)}>
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}