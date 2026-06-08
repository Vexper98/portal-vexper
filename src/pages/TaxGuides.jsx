import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt, Plus, Search, RefreshCw, MessageCircle,
  Mail, CheckCircle2
} from "lucide-react";
import UpgradeModal from "../components/contador/UpgradeModal";

const STATUS_COLORS = {
  pendente: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  enviada: "bg-blue-500/15 text-blue-400 border-blue-400/30",
  paga: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  vencida: "bg-red-500/15 text-red-400 border-red-400/30",
};

const isPro = (user) => user?.plan === "pro_contador" || user?.pro_enabled === true;

export default function TaxGuides() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [form, setForm] = useState({ company_id: "", tipo_guia: "DAS", referencia: "", competencia: "", valor: "", vencimento: "", observacoes: "", status: "pendente" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    if (!isPro(me)) { setLoading(false); return; }
    const [comps, gs] = await Promise.all([
      base44.entities.Company.filter({ contadorEmail: me.email }),
      base44.entities.TaxGuide.filter({ owner_user_id: me.email }),
    ]);
    setCompanies(comps);
    setGuides(gs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = guides.filter(g => {
    const comp = companies.find(c => c.id === g.company_id);
    const matchSearch = !search || g.referencia?.toLowerCase().includes(search.toLowerCase()) ||
      comp?.razao_social?.toLowerCase().includes(search.toLowerCase());
    const matchComp = filterCompany === "all" || g.company_id === filterCompany;
    const matchStatus = filterStatus === "all" || g.status === filterStatus;
    const matchTipo = filterTipo === "all" || g.tipo_guia === filterTipo;
    return matchSearch && matchComp && matchStatus && matchTipo;
  });

  const handleSave = async () => {
    setSaving(true);
    const comp = companies.find(c => c.id === form.company_id);
    await base44.entities.TaxGuide.create({
      ...form,
      valor: parseFloat(form.valor) || 0,
      owner_user_id: user.email,
      company_name: comp?.razao_social || "",
    });
    toast.success("Guia cadastrada com sucesso!");
    setSaving(false);
    setDialogOpen(false);
    setForm({ company_id: "", tipo_guia: "DAS", referencia: "", competencia: "", valor: "", vencimento: "", observacoes: "", status: "pendente" });
    load();
  };

  const handleUpdateStatus = async (id, status) => {
    await base44.entities.TaxGuide.update(id, { status });
    toast.success("Status atualizado!");
    setGuides(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  };

  const handleWhatsApp = (guide) => {
    const comp = companies.find(c => c.id === guide.company_id);
    const phone = comp?.whatsapp?.replace(/\D/g, "");
    if (!phone) { toast.error("Empresa sem WhatsApp cadastrado"); return; }
    const msg = encodeURIComponent(`Olá, segue a sua guia de imposto referente à competência ${guide.competencia}. Vencimento: ${guide.vencimento}. Qualquer dúvida, estou à disposição.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    base44.entities.TaxGuide.update(guide.id, { status: "enviada", sent_whatsapp_at: new Date().toISOString() });
    setGuides(prev => prev.map(g => g.id === guide.id ? { ...g, status: "enviada" } : g));
  };

  const handleEmail = async (guide) => {
    const comp = companies.find(c => c.id === guide.company_id);
    if (!comp?.email) { toast.error("Empresa sem email cadastrado"); return; }
    await base44.integrations.Core.SendEmail({
      to: comp.email,
      subject: `Envio de guia de imposto - ${comp.razao_social}`,
      body: `Olá,\n\nSegue em anexo a guia de imposto referente à competência ${guide.competencia}.\n\nQualquer dúvida, estou à disposição.`,
    });
    toast.success("Email enviado!");
    base44.entities.TaxGuide.update(guide.id, { status: "enviada", sent_email_at: new Date().toISOString() });
    setGuides(prev => prev.map(g => g.id === guide.id ? { ...g, status: "enviada" } : g));
  };

  if (loading) return (
    <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
  );

  if (!isPro(user)) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/40">
        <Receipt className="w-10 h-10 text-white" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-black text-white mb-2">Guia de Impostos</h2>
        <p className="text-slate-400 text-sm max-w-sm">Este módulo está disponível apenas no plano ProContador.</p>
      </div>
      <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl px-8" onClick={() => setUpgradeModal(true)}>
        Assinar ProContador
      </Button>
      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Guia de Impostos</h1>
            <p className="text-xs text-slate-500">{guides.length} guia(s) cadastrada(s)</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:opacity-90 rounded-xl shadow-lg shadow-amber-500/25 gap-2">
          <Plus className="w-4 h-4" /> Nova Guia
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input className="pl-9 h-9 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
            placeholder="Buscar guia ou empresa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="h-9 w-full sm:w-48 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-full sm:w-36 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Receipt className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">Nenhuma guia encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((guide, i) => {
              const comp = companies.find(c => c.id === guide.company_id);
              return (
                <motion.div key={guide.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border p-4 space-y-3"
                  style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-[9px] font-bold px-2 bg-amber-500/15 text-amber-400 border-amber-400/30">
                          {guide.tipo_guia}
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] font-bold px-2 ${STATUS_COLORS[guide.status]}`}>
                          {guide.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-slate-200">{guide.referencia || guide.tipo_guia}</p>
                      <p className="text-xs text-slate-500">{comp?.razao_social || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">
                        {guide.valor ? `R$ ${Number(guide.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </p>
                      {guide.vencimento && (
                        <p className="text-[10px] text-slate-500">Venc.: {guide.vencimento}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] text-slate-600">Competência: {guide.competencia}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs gap-1"
                        onClick={() => handleUpdateStatus(guide.id, "paga")} title="Marcar como paga">
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-500/10 rounded-lg text-xs gap-1"
                        onClick={() => handleWhatsApp(guide)} title="Enviar WhatsApp">
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-400 hover:bg-blue-500/10 rounded-lg text-xs gap-1"
                        onClick={() => handleEmail(guide)} title="Enviar Email">
                        <Mail className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* New Guide Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl" style={{ background: "#0a1628", border: "1px solid rgba(6,182,212,0.15)", color: "white" }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" /> Nova Guia de Imposto
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Empresa *</Label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger className="rounded-xl h-9" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Tipo de Guia *</Label>
              <Select value={form.tipo_guia} onValueChange={v => setForm(f => ({ ...f, tipo_guia: v }))}>
                <SelectTrigger className="rounded-xl h-9" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["DAS","DARF","FGTS","INSS","ICMS","ISS","Simples Nacional","outro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Competência *</Label>
              <Input className="rounded-xl h-9" placeholder="2026-03"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                value={form.competencia} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Referência</Label>
              <Input className="rounded-xl h-9" placeholder="Descrição"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Valor (R$)</Label>
              <Input type="number" className="rounded-xl h-9" placeholder="0,00"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Vencimento</Label>
              <Input type="date" className="rounded-xl h-9"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Observações</Label>
              <Input className="rounded-xl h-9"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl border-white/10 text-slate-400">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.company_id || !form.competencia}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:opacity-90 gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Salvando..." : "Cadastrar Guia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}