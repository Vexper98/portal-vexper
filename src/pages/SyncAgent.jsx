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
  ShieldCheck, Info, Terminal, Zap, Settings2, ScrollText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TokenCard from "../components/sync/TokenCard";
import CreateTokenDialog from "../components/sync/CreateTokenDialog";
import TokenSuccessDialog from "../components/sync/TokenSuccessDialog";
import DownloadAgentCard from "../components/sync/DownloadAgentCard";
import AgentConfigBlock from "../components/sync/AgentConfigBlock";
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

const logLevelColors = {
  info:    "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error:   "bg-red-50 text-red-700 border-red-200",
};

export default function SyncAgent() {
  const [tokens, setTokens]         = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [agentLogs, setAgentLogs]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [successToken, setSuccessToken] = useState(null);
  const [successOpen, setSuccessOpen]   = useState(false);
  const [logCompany, setLogCompany] = useState("all");

  const loadData = async () => {
    const [toks, comps, logs] = await Promise.all([
      base44.entities.SyncToken.list("-created_date", 200),
      base44.entities.Company.filter({ status: "ativa" }, "-razao_social", 200),
      base44.entities.AgentLog.list("-created_date", 100),
    ]);
    setTokens(toks);
    setCompanies(comps);
    setAgentLogs(logs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (formData) => {
    setSaving(true);
    const token = generateToken();

    // Save agentToken to company entity for API validation
    if (formData.company_id) {
      await base44.entities.Company.update(formData.company_id, {
        agentToken: token,
        active: true,
      });
    }

    const newToken = await base44.entities.SyncToken.create({
      ...formData,
      token,
      status: "ativo",
    });

    if (formData.pasta_monitorada && formData.company_id) {
      await base44.entities.Company.update(formData.company_id, {
        pasta_sincronizacao: formData.pasta_monitorada,
      });
    }

    setSaving(false);
    setCreateOpen(false);
    setSuccessToken({ ...newToken, token });
    setSelectedConfig({ token, companyId: formData.company_id });
    setSuccessOpen(true);
    loadData();
  };

  const handleRevoke = async (token) => {
    await base44.entities.SyncToken.update(token.id, { status: "revogado" });
    if (token.company_id) {
      await base44.entities.Company.update(token.company_id, { agentToken: null });
    }
    loadData();
  };

  const handleRenew = async (token) => {
    const newTokenStr = generateToken();
    await base44.entities.SyncToken.update(token.id, { token: newTokenStr });
    if (token.company_id) {
      await base44.entities.Company.update(token.company_id, { agentToken: newTokenStr });
    }
    const updated = { ...token, token: newTokenStr };
    setSuccessToken(updated);
    setSelectedConfig({ token: newTokenStr, companyId: token.company_id });
    setSuccessOpen(true);
    loadData();
  };

  const filtered = tokens.filter(t => {
    const matchSearch = !search || [t.company_name, t.descricao, t.token].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus  = statusFilter  === "all" || t.status    === statusFilter;
    const matchCompany = companyFilter === "all" || t.company_id === companyFilter;
    return matchSearch && matchStatus && matchCompany;
  });

  const filteredLogs = agentLogs.filter(l =>
    logCompany === "all" || l.companyId === logCompany
  );

  const activeCount  = tokens.filter(t => t.status === "ativo").length;
  const revokedCount = tokens.filter(t => t.status === "revogado").length;
  const onlineCount  = tokens.filter(t => {
    if (!t.ultimo_uso) return false;
    return (Date.now() - new Date(t.ultimo_uso).getTime()) < 86400000;
  }).length;

  const companyMap = {};
  companies.forEach(c => { companyMap[c.id] = c; });

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
          <p className="text-sm text-slate-500 mt-1">Gerencie tokens e veja logs do agente desktop</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Token
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tokens Ativos",   value: activeCount,  icon: Key,        color: "text-blue-500 bg-blue-50" },
          { label: "Agentes Online",  value: onlineCount,  icon: Wifi,       color: "text-emerald-500 bg-emerald-50" },
          { label: "Revogados",       value: revokedCount, icon: WifiOff,    color: "text-red-500 bg-red-50" },
          { label: "Empresas Config.",value: [...new Set(tokens.filter(t => t.status === "ativo").map(t => t.company_id))].length, icon: ShieldCheck, color: "text-violet-500 bg-violet-50" },
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
          <TabsTrigger value="tokens"><Key className="w-4 h-4 mr-2" /> Tokens</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="w-4 h-4 mr-2" /> Configuração do Agente</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="w-4 h-4 mr-2" /> Logs Recentes</TabsTrigger>
          <TabsTrigger value="download"><Download className="w-4 h-4 mr-2" /> Baixar Agente</TabsTrigger>
          <TabsTrigger value="como-funciona"><Info className="w-4 h-4 mr-2" /> Como Funciona</TabsTrigger>
        </TabsList>

        {/* TOKENS TAB */}
        <TabsContent value="tokens" className="space-y-4">
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
                <p className="text-sm text-slate-400 mt-1">Crie um token para configurar o agente</p>
                <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Criar primeiro token
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(token => (
                <div key={token.id} className="space-y-2">
                  <TokenCard token={token} onRevoke={handleRevoke} onRenew={handleRenew} />
                  {token.status === "ativo" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-slate-400 hover:text-blue-600"
                      onClick={() => setSelectedConfig({ token: token.token, companyId: token.company_id })}
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1" /> Ver configuração do agente
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-500" /> Configuração do Agente Desktop
              </CardTitle>
              <p className="text-sm text-slate-500">
                Use as informações abaixo para configurar o agente. Selecione a empresa para ver os valores corretos.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Selecionar Empresa / Token
                </label>
                <Select
                  value={selectedConfig?.companyId || ""}
                  onValueChange={(cId) => {
                    const tok = tokens.find(t => t.company_id === cId && t.status === "ativo");
                    setSelectedConfig({ companyId: cId, token: tok?.token || "" });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a empresa para ver a configuração" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedConfig ? (
                selectedConfig.token ? (
                  <AgentConfigBlock token={selectedConfig.token} companyId={selectedConfig.companyId} />
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-slate-500">Esta empresa não possui token ativo.</p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        const token = generateToken();
                        const company = companies.find(c => c.id === selectedConfig.companyId);
                        await base44.entities.SyncToken.create({
                          company_id: selectedConfig.companyId,
                          company_name: company?.nome_fantasia || company?.razao_social || "",
                          company_cnpj: company?.cnpj || "",
                          token,
                          descricao: "Token gerado automaticamente",
                          status: "ativo",
                        });
                        await base44.entities.Company.update(selectedConfig.companyId, { agentToken: token, active: true });
                        setSelectedConfig({ ...selectedConfig, token });
                        setSaving(false);
                        loadData();
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> {saving ? "Gerando..." : "Gerar Token Agora"}
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Selecione uma empresa acima para ver a configuração
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-blue-500" /> Logs do Agente
                </CardTitle>
                <Select value={logCompany} onValueChange={setLogCompany}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Empresas</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum log disponível</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredLogs.map(log => {
                    const company = companyMap[log.companyId];
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 text-xs">
                        <Badge variant="outline" className={`shrink-0 ${logLevelColors[log.level] || logLevelColors.info}`}>
                          {log.level}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-700">
                              {company?.nome_fantasia || company?.razao_social || log.companyId}
                            </span>
                            {log.filename && (
                              <span className="font-mono text-slate-400 truncate max-w-[180px]">{log.filename}</span>
                            )}
                          </div>
                          <p className="text-slate-500 mt-0.5">{log.message}</p>
                        </div>
                        <span className="text-slate-300 shrink-0 whitespace-nowrap">
                          {log.created_date ? format(new Date(log.created_date), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOWNLOAD TAB */}
        <TabsContent value="download" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" /> Instalador do Agente — v1.2.4
              </CardTitle>
              <p className="text-sm text-slate-500">
                Baixe o agente para o sistema operacional da máquina do cliente.
              </p>
            </CardHeader>
            <CardContent><DownloadAgentCard /></CardContent>
          </Card>
        </TabsContent>

        {/* HOW IT WORKS */}
        <TabsContent value="como-funciona">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Fluxo de Sincronização
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                  {[
                    { icon: "📁", title: "Pasta Local", desc: "Cliente salva XML numa pasta configurada" },
                    null,
                    { icon: "🔍", title: "Agente Detecta", desc: "Agente monitora a pasta em segundo plano" },
                    null,
                    { icon: "☁️", title: "Portal Recebe", desc: "XML enviado automaticamente com token" },
                  ].map((item, i) =>
                    item === null ? (
                      <div key={i} className="hidden sm:flex items-center justify-center text-slate-300 text-2xl">→</div>
                    ) : (
                      <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50">
                        <span className="text-3xl mb-2">{item.icon}</span>
                        <p className="text-xs font-semibold text-slate-700">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4" /> Como o agente deve enviar os arquivos
                </h4>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs space-y-1.5">
                  <p className="text-slate-400"># POST multipart/form-data</p>
                  <p><span className="text-cyan-400">URL</span><span className="text-slate-300">: {window.location.origin}/api/functions/receiveDocument</span></p>
                  <p><span className="text-cyan-400">Header</span><span className="text-slate-300">: Authorization: Bearer SEU_TOKEN</span></p>
                  <p><span className="text-cyan-400">Campo opcional</span><span className="text-slate-300">: companyId = SEU_COMPANY_ID</span></p>
                  <p><span className="text-cyan-400">Campo</span><span className="text-slate-300">: file = arquivo.xml</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
