import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Download, Key, Activity, Wifi, WifiOff,
  ShieldCheck, RefreshCw, Info, Terminal, Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TokenCard from "../components/sync/TokenCard";
import CreateTokenDialog from "../components/sync/CreateTokenDialog";
import TokenSuccessDialog from "../components/sync/TokenSuccessDialog";
import DownloadAgentCard from "../components/sync/DownloadAgentCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "pct_";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default function SyncAgent() {
  const [tokens, setTokens] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToken, setSuccessToken] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const loadData = async () => {
    const [toks, comps] = await Promise.all([
      base44.entities.SyncToken.list("-created_date", 200),
      base44.entities.Company.filter({ status: "ativa" }, "-razao_social", 200),
    ]);
    setTokens(toks);
    setCompanies(comps);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (formData) => {
    setSaving(true);
    const token = generateToken();
    const newToken = await base44.entities.SyncToken.create({
      ...formData,
      token,
      status: "ativo",
    });

    // Update company's pasta_sincronizacao if provided
    if (formData.pasta_monitorada && formData.company_id) {
      await base44.entities.Company.update(formData.company_id, {
        pasta_sincronizacao: formData.pasta_monitorada,
      });
    }

    setSaving(false);
    setCreateOpen(false);
    setSuccessToken({ ...newToken, token });
    setSuccessOpen(true);
    loadData();
  };

  const handleRevoke = async (token) => {
    await base44.entities.SyncToken.update(token.id, { status: "revogado" });
    loadData();
  };

  const handleRenew = async (token) => {
    const newTokenStr = generateToken();
    await base44.entities.SyncToken.update(token.id, { token: newTokenStr });
    const updated = { ...token, token: newTokenStr };
    setSuccessToken(updated);
    setSuccessOpen(true);
    loadData();
  };

  const filtered = tokens.filter(t => {
    const matchSearch = !search || [t.company_name, t.descricao, t.token].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchCompany = companyFilter === "all" || t.company_id === companyFilter;
    return matchSearch && matchStatus && matchCompany;
  });

  const activeCount = tokens.filter(t => t.status === "ativo").length;
  const revokedCount = tokens.filter(t => t.status === "revogado").length;
  const onlineCount = tokens.filter(t => {
    if (!t.ultimo_uso) return false;
    return (Date.now() - new Date(t.ultimo_uso).getTime()) < 86400000;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            Agente de Sincronização
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os tokens e o agente que monitora pastas locais</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Token
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tokens Ativos", value: activeCount, icon: Key, color: "text-blue-500 bg-blue-50" },
          { label: "Agentes Online", value: onlineCount, icon: Wifi, color: "text-emerald-500 bg-emerald-50" },
          { label: "Revogados", value: revokedCount, icon: WifiOff, color: "text-red-500 bg-red-50" },
          { label: "Empresas Config.", value: [...new Set(tokens.filter(t => t.status === "ativo").map(t => t.company_id))].length, icon: ShieldCheck, color: "text-violet-500 bg-violet-50" },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tokens" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="tokens">
            <Key className="w-4 h-4 mr-2" /> Tokens
          </TabsTrigger>
          <TabsTrigger value="download">
            <Download className="w-4 h-4 mr-2" /> Baixar Agente
          </TabsTrigger>
          <TabsTrigger value="como-funciona">
            <Info className="w-4 h-4 mr-2" /> Como Funciona
          </TabsTrigger>
        </TabsList>

        {/* TOKENS TAB */}
        <TabsContent value="tokens" className="space-y-4">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Buscar por empresa, descrição..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Empresas</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="revogado">Revogados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-blue-300" />
                </div>
                <p className="font-medium text-slate-700">Nenhum token encontrado</p>
                <p className="text-sm text-slate-400 mt-1">Crie um token para configurar o agente de sincronização</p>
                <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Criar primeiro token
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(token => (
                <TokenCard key={token.id} token={token} onRevoke={handleRevoke} onRenew={handleRenew} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* DOWNLOAD TAB */}
        <TabsContent value="download" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" />
                Instalador do Agente — v1.2.4
              </CardTitle>
              <p className="text-sm text-slate-500">
                Baixe o agente para o sistema operacional da máquina do cliente e instale com o token gerado.
              </p>
            </CardHeader>
            <CardContent>
              <DownloadAgentCard />
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Requisitos Mínimos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {[
                  { so: "🪟 Windows", reqs: ["Windows 10 ou superior", "64-bit", "100 MB de espaço", "Acesso à internet"] },
                  { so: "🐧 Linux", reqs: ["Ubuntu 20.04+, Debian 10+", "64-bit", "100 MB de espaço", "systemd (para serviço)"] },
                  { so: "🍎 macOS", reqs: ["macOS 12 Monterey+", "Apple Silicon ou Intel", "100 MB de espaço", "Acesso à internet"] },
                ].map(item => (
                  <div key={item.so} className="p-4 rounded-xl bg-slate-50">
                    <p className="font-semibold text-slate-700 mb-2">{item.so}</p>
                    <ul className="space-y-1 text-slate-500">
                      {item.reqs.map(r => <li key={r} className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />{r}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOW IT WORKS TAB */}
        <TabsContent value="como-funciona">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              {/* Flow */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Fluxo de Sincronização
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                  {[
                    { step: "1", icon: "📁", title: "Pasta Local", desc: "Cliente salva XML/PDF numa pasta configurada" },
                    { step: "→", icon: null, title: null, desc: null },
                    { step: "2", icon: "🔍", title: "Agente Detecta", desc: "Agente monitora a pasta em segundo plano" },
                    { step: "→", icon: null, title: null, desc: null },
                    { step: "3", icon: "☁️", title: "Portal Recebe", desc: "Arquivo enviado automaticamente com autenticação por token" },
                  ].map((item, i) => (
                    item.icon === null ? (
                      <div key={i} className="hidden sm:flex items-center justify-center text-slate-300 text-2xl font-light">→</div>
                    ) : (
                      <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50">
                        <span className="text-3xl mb-2">{item.icon}</span>
                        <p className="text-xs font-semibold text-slate-700">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4" /> Segurança dos Tokens
                </h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  {[
                    "Cada token identifica unicamente uma empresa — o agente sabe exatamente para qual conta enviar.",
                    "Os tokens usam o prefixo pct_ (Portal Contador Token) e têm 52 caracteres de entropia.",
                    "Tokens podem ser revogados instantaneamente pelo painel sem reinstalar o agente.",
                    "Após revogação, o agente perde acesso imediatamente na próxima tentativa de sincronização.",
                    "Cada máquina/servidor deve ter seu próprio token para rastreabilidade.",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Config example */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" /> Exemplo de Configuração
                </h4>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs space-y-1">
                  <p className="text-slate-500"># config.yaml do agente</p>
                  <p><span className="text-cyan-400">token</span><span className="text-slate-300">: </span><span className="text-amber-300">"pct_SeuTokenAqui..."</span></p>
                  <p><span className="text-cyan-400">watch_path</span><span className="text-slate-300">: </span><span className="text-amber-300">"C:\\XMLs\\MinhaEmpresa"</span></p>
                  <p><span className="text-cyan-400">portal_url</span><span className="text-slate-300">: </span><span className="text-amber-300">"https://seuportal.base44.app"</span></p>
                  <p><span className="text-cyan-400">file_types</span><span className="text-slate-300">: [</span><span className="text-emerald-400">".xml"</span><span className="text-slate-300">, </span><span className="text-emerald-400">".pdf"</span><span className="text-slate-300">]</span></p>
                  <p><span className="text-cyan-400">retry_attempts</span><span className="text-slate-300">: </span><span className="text-violet-400">3</span></p>
                  <p><span className="text-cyan-400">scan_interval_seconds</span><span className="text-slate-300">: </span><span className="text-violet-400">30</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTokenDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
        onSave={handleCreate}
        saving={saving}
      />

      <TokenSuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        token={successToken}
        company={successToken}
      />
    </div>
  );
}