import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2, FileText, Clock, Search,
  AlertTriangle, CheckCircle2, RefreshCw, TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const statusBadge = {
  ativa:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  inativa:  "bg-slate-50 text-slate-600 border-slate-200",
  suspensa: "bg-red-50 text-red-700 border-red-200",
};

export default function MyClients() {
  const [companies, setCompanies] = useState([]);
  const [docCountMap, setDocCountMap] = useState({});
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [u, comps, docs] = await Promise.all([
      base44.auth.me(),
      base44.entities.Company.list("-created_date", 200),
      base44.entities.Document.list("-created_date", 1000),
    ]);

    const isAdmin = u?.role === "admin" || u?.role === "suporte";
    const myCompanies = isAdmin
      ? comps
      : comps.filter(c => c.contadorEmail === u?.email || c.contador_responsavel === u?.email);

    const counts = {};
    docs.forEach(d => { counts[d.companyId] = (counts[d.companyId] || 0) + 1; });

    setCompanies(myCompanies);
    setDocCountMap(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = companies.filter(c => {
    if (!search) return true;
    return [c.razao_social, c.nome_fantasia, c.cnpj]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
  });

  const synced  = companies.filter(c => {
    const last = c.lastSyncAt || c.ultimo_envio;
    return last && (Date.now() - new Date(last).getTime()) <= 7 * 86400000;
  }).length;
  const noSync  = companies.length - synced;
  const totalDocs = companies.reduce((s, c) => s + (docCountMap[c.id] || 0), 0);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {companies.length} empresa(s) vinculada(s) · {totalDocs} documentos recebidos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">{synced} em dia</span>
        </div>
        {noSync > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{noSync} sem envio recente</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">{totalDocs} documentos</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, CNPJ..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(company => {
          const lastSync = company.lastSyncAt || company.ultimo_envio;
          const isOld = !lastSync || (Date.now() - new Date(lastSync).getTime()) > 7 * 86400000;
          const docCount = docCountMap[company.id] || 0;

          return (
            <Card
              key={company.id}
              className={`border-0 shadow-sm hover:shadow-md transition-shadow border-l-4 ${isOld ? "border-l-amber-400" : "border-l-emerald-400"}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOld ? "bg-amber-50" : "bg-emerald-50"}`}>
                      <Building2 className={`w-5 h-5 ${isOld ? "text-amber-600" : "text-emerald-600"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm leading-tight">
                        {company.nome_fantasia || company.razao_social}
                      </p>
                      {company.nome_fantasia && (
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{company.razao_social}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${statusBadge[company.status] || ""}`}>
                    {company.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 mb-4">
                  <p className="text-xs text-slate-500 font-mono">CNPJ: {company.cnpj}</p>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-600">{docCount} documento(s) recebido(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${isOld ? "text-amber-500" : "text-emerald-500"}`} />
                    <span className={`text-xs ${isOld ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                      {lastSync
                        ? `Último envio ${formatDistanceToNow(new Date(lastSync), { locale: ptBR, addSuffix: true })}`
                        : "Nunca sincronizou"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                    onClick={() => navigate(createPageUrl(`Documents?company_id=${company.id}`))}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Ver Documentos
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-xs px-3"
                    onClick={() => navigate(createPageUrl(`DocumentUpload?company_id=${company.id}`))}
                  >
                    Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma empresa encontrada</p>
            <p className="text-xs mt-1">
              {search ? "Tente outro termo de busca" : "Peça ao administrador para vincular empresas à sua conta (campo E-mail do Contador)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}