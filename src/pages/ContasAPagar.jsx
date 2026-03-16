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
import { CreditCard, Plus, Search, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import UpgradeModal from "../components/contador/UpgradeModal";

const STATUS_COLORS = {
  pendente: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  pago: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  vencido: "bg-red-500/15 text-red-400 border-red-400/30",
};

const isPro = (user) => user?.plan === "pro_contador" || user?.pro_enabled === true;

export default function ContasAPagar() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [form, setForm] = useState({ company_id: "", descricao: "", categoria: "", valor: "", vencimento: "", status: "pendente", forma_pagamento: "", observacoes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    if (!isPro(me)) { setLoading(false); return; }
    const [comps, accs] = await Promise.all([
      base44.entities.Company.filter({ contadorEmail: me.email }),
      base44.entities.AccountPayable.filter({ owner_user_id: me.email }),
    ]);
    setCompanies(comps);
    setAccounts(accs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter(a => {
    const comp = companies.find(c => c.id === a.company_id);
    const matchSearch = !search || a.descricao?.toLowerCase().includes(search.toLowerCase()) || comp?.razao_social?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterCompany === "all" || a.company_id === filterCompany) && (filterStatus === "all" || a.status === filterStatus);
  });

  const handleSave = async () => {
    setSaving(true);
    const comp = companies.find(c => c.id === form.company_id);
    await base44.entities.AccountPayable.create({ ...form, valor: parseFloat(form.valor) || 0, owner_user_id: user.email, company_name: comp?.razao_social || "" });
    toast.success("Conta cadastrada!"); setSaving(false); setDialogOpen(false);
    setForm({ company_id: "", descricao: "", categoria: "", valor: "", vencimento: "", status: "pendente", forma_pagamento: "", observacoes: "" });
    load();
  };

  const handlePay = async (id) => {
    await base44.entities.AccountPayable.update(id, { status: "pago" });
    toast.success("Marcada como paga!");
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: "pago" } : a));
  };

  const handleDelete = async (id) => {
    await base44.entities.AccountPayable.delete(id);
    toast.success("Removida!");
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>;

  if (!isPro(user)) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/40">
        <CreditCard className="w-10 h-10 text-white" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-black text-white mb-2">Contas a Pagar</h2>
        <p className="text-slate-400 text-sm max-w-sm">Este módulo está disponível apenas no plano ProContador.</p>
      </div>
      <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl px-8" onClick={() => setUpgradeModal(true)}>Assinar ProContador</Button>
      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
    </div>
  );

  const total = filtered.reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const pendente = filtered.filter(a => a.status === "pendente").reduce((s, a) => s + (Number(a.valor) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Contas a Pagar</h1>
            <p className="text-xs text-slate-500">{accounts.length} conta(s)</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 hover:opacity-90 rounded-xl shadow-lg gap-2">
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Listado", value: `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "from-slate-500 to-slate-600" },
          { label: "Pendente", value: `R$ ${pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "from-amber-500 to-orange-500" },
          { label: "Contas", value: filtered.length, color: "from-red-500 to-rose-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 border" style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input className="pl-9 h-9 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
            placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="h-9 w-full sm:w-48 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-full sm:w-36 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <CreditCard className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">Nenhuma conta encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((acc, i) => {
            const comp = companies.find(c => c.id === acc.company_id);
            return (
              <motion.div key={acc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-4 rounded-2xl border group"
                style={{ background: "linear-gradient(135deg, #0a1628, #0d1e35)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${acc.status === "pago" ? "from-emerald-500 to-teal-600" : acc.status === "vencido" ? "from-red-500 to-rose-600" : "from-amber-500 to-orange-500"} flex items-center justify-center`}>
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{acc.descricao}</p>
                    <p className="text-xs text-slate-500">{comp?.razao_social || "—"} · Venc: {acc.vencimento || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-black text-white">R$ {Number(acc.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <Badge variant="outline" className={`text-[9px] font-bold ${STATUS_COLORS[acc.status]}`}>{acc.status}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {acc.status !== "pago" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 rounded-lg" onClick={() => handlePay(acc.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-500/10 rounded-lg" onClick={() => handleDelete(acc.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl" style={{ background: "#0a1628", border: "1px solid rgba(239,68,68,0.2)", color: "white" }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-red-400" /> Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Empresa *</Label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger className="rounded-xl h-9" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {[
              { field: "descricao", label: "Descrição *", placeholder: "Descrição da conta", colSpan: 2 },
              { field: "categoria", label: "Categoria", placeholder: "Ex: Aluguel" },
              { field: "valor", label: "Valor (R$) *", placeholder: "0,00", type: "number" },
              { field: "vencimento", label: "Vencimento", type: "date" },
              { field: "forma_pagamento", label: "Forma de Pagamento", placeholder: "PIX, Boleto..." },
            ].map(({ field, label, placeholder, type, colSpan }) => (
              <div key={field} className={`space-y-1 ${colSpan ? "col-span-2" : ""}`}>
                <Label className="text-xs text-slate-400">{label}</Label>
                <Input type={type || "text"} className="rounded-xl h-9" placeholder={placeholder}
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "white" }}
                  value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl border-white/10 text-slate-400">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.company_id || !form.descricao}
              className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 hover:opacity-90 gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}