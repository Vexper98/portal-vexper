import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import CompanyFormDialog from "../components/companies/CompanyFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

const statusBadge = {
  ativa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inativa: "bg-slate-50 text-slate-600 border-slate-200",
  suspensa: "bg-red-50 text-red-700 border-red-200",
};

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCompanies = async () => {
    const data = await base44.entities.Company.list("-created_date", 200);
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => { loadCompanies(); }, []);

  const handleSave = async (formData) => {
    setSaving(true);
    if (editingCompany) {
      await base44.entities.Company.update(editingCompany.id, formData);
    } else {
      await base44.entities.Company.create(formData);
    }
    setSaving(false);
    setFormOpen(false);
    setEditingCompany(null);
    loadCompanies();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await base44.entities.Company.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadCompanies();
    }
  };

  const filtered = companies.filter(c => {
    const matchSearch = !search || [c.razao_social, c.nome_fantasia, c.cnpj].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500 mt-1">{companies.length} empresas cadastradas</p>
        </div>
        <Button onClick={() => { setEditingCompany(null); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por nome, CNPJ..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Empresa</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">CNPJ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Cidade/UF</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Contador</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(company => (
                <TableRow key={company.id} className="hover:bg-slate-50/50 border-slate-100">
                  <TableCell>
                    <Link to={createPageUrl(`CompanyDetail?id=${company.id}`)} className="hover:text-blue-600 transition-colors">
                      <p className="font-medium text-sm">{company.nome_fantasia || company.razao_social}</p>
                      {company.nome_fantasia && <p className="text-xs text-slate-400">{company.razao_social}</p>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 font-mono">{company.cnpj}</TableCell>
                  <TableCell className="text-sm text-slate-600">{company.cidade}{company.estado ? `/${company.estado}` : ""}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] font-semibold ${statusBadge[company.status] || ""}`}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{company.contador_responsavel || "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl(`CompanyDetail?id=${company.id}`)}><Eye className="w-4 h-4 mr-2" /> Ver Detalhes</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingCompany(company); setFormOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(company)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    Nenhuma empresa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editingCompany}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteTarget?.razao_social}? Esta ação não pode ser desfeita.
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