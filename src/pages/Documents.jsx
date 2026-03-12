import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, ExternalLink, MoreHorizontal, RefreshCw, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const statusConfig = {
  enviado: { label: "Enviado", class: "bg-blue-50 text-blue-700 border-blue-200" },
  processado: { label: "Processado", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pendente: { label: "Pendente", class: "bg-amber-50 text-amber-700 border-amber-200" },
  erro: { label: "Erro", class: "bg-red-50 text-red-700 border-red-200" },
  duplicado: { label: "Duplicado", class: "bg-slate-50 text-slate-600 border-slate-200" },
};

const tipoConfig = {
  nfe_xml: "NF-e XML", nfce_xml: "NFC-e XML", cte_xml: "CT-e XML",
  nfse_xml: "NFS-e XML", pdf_nota: "PDF Nota", outros: "Outros",
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [obsDialogOpen, setObsDialogOpen] = useState(false);
  const [obsDoc, setObsDoc] = useState(null);
  const [obsText, setObsText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    const [docs, comps] = await Promise.all([
      base44.entities.FiscalDocument.list("-created_date", 500),
      base44.entities.Company.list("-created_date", 200),
    ]);
    setDocuments(docs);
    setCompanies(comps);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleReprocess = async (doc) => {
    await base44.entities.FiscalDocument.update(doc.id, { status: "pendente" });
    loadData();
  };

  const handleSaveObs = async () => {
    if (obsDoc) {
      await base44.entities.FiscalDocument.update(obsDoc.id, { observacoes: obsText });
      setObsDialogOpen(false);
      loadData();
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await base44.entities.FiscalDocument.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    }
  };

  const filtered = documents.filter(d => {
    const matchSearch = !search || [d.nome_arquivo, d.company_name, d.company_cnpj, d.chave_acesso, d.numero_nota].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchTipo = tipoFilter === "all" || d.tipo_documento === tipoFilter;
    const matchCompany = companyFilter === "all" || d.company_id === companyFilter;
    return matchSearch && matchStatus && matchTipo && matchCompany;
  });

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documentos Fiscais</h1>
        <p className="text-sm text-slate-500 mt-1">{documents.length} documentos no total</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por arquivo, empresa, CNPJ, chave..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-3 flex-wrap">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Empresas</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  {Object.entries(tipoConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Empresa</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Arquivo</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Tipo</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Nº Nota</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Valor</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Data</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
                const st = statusConfig[doc.status] || statusConfig.pendente;
                return (
                  <TableRow key={doc.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-medium text-sm">{doc.company_name || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[180px] truncate">{doc.nome_arquivo}</TableCell>
                    <TableCell className="text-xs text-slate-500">{tipoConfig[doc.tipo_documento] || doc.tipo_documento}</TableCell>
                    <TableCell className="text-sm text-slate-600">{doc.numero_nota || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{doc.valor_nota ? `R$ ${doc.valor_nota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">{doc.created_date ? format(new Date(doc.created_date), "dd/MM/yy", { locale: ptBR }) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] font-semibold ${st.class}`}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {doc.file_url && <DropdownMenuItem asChild><a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" /> Abrir Arquivo</a></DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => handleReprocess(doc)}><RefreshCw className="w-4 h-4 mr-2" /> Reprocessar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setObsDoc(doc); setObsText(doc.observacoes || ""); setObsDialogOpen(true); }}><MessageSquare className="w-4 h-4 mr-2" /> Observações</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(doc)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    Nenhum documento encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Obs Dialog */}
      <Dialog open={obsDialogOpen} onOpenChange={setObsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Observações</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Observações sobre {obsDoc?.nome_arquivo}</Label>
            <Textarea value={obsText} onChange={e => setObsText(e.target.value)} rows={4} placeholder="Adicionar observações..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveObs} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {deleteTarget?.nome_arquivo}?</AlertDialogDescription>
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