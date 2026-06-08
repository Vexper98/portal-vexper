import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Building2, FileText, Users, Mail, Phone, MapPin, Clock, Plus, Pencil, Trash2, MessageCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import RecentDocumentsTable from "../components/dashboard/RecentDocumentsTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function CompanyDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get("id");

  const [company, setCompany] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({ nome: "", cargo: "", telefone: "", whatsapp: "", email: "", tipo: "responsavel", observacoes: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [deleteContactTarget, setDeleteContactTarget] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const [comp, docs, conts] = await Promise.all([
        base44.entities.Company.filter({ id: companyId }),
        base44.entities.FiscalDocument.filter({ company_id: companyId }, "-created_date", 50),
        base44.entities.CompanyContact.filter({ company_id: companyId }),
      ]);
      setCompany(comp[0]);
      setDocuments(docs);
      setContacts(conts);
      setLoading(false);
    };
    load();
  }, [companyId]);

  const handleSaveContact = async () => {
    setSavingContact(true);
    if (editingContact) {
      await base44.entities.CompanyContact.update(editingContact.id, contactForm);
    } else {
      await base44.entities.CompanyContact.create({ ...contactForm, company_id: companyId });
    }
    const conts = await base44.entities.CompanyContact.filter({ company_id: companyId });
    setContacts(conts);
    setSavingContact(false);
    setContactDialogOpen(false);
    setEditingContact(null);
    setContactForm({ nome: "", cargo: "", telefone: "", whatsapp: "", email: "", tipo: "responsavel", observacoes: "" });
  };

  const handleDeleteContact = async () => {
    if (deleteContactTarget) {
      await base44.entities.CompanyContact.delete(deleteContactTarget.id);
      setContacts(prev => prev.filter(c => c.id !== deleteContactTarget.id));
      setDeleteContactTarget(null);
    }
  };

  const openEditContact = (contact) => {
    setEditingContact(contact);
    setContactForm({
      nome: contact.nome, cargo: contact.cargo || "", telefone: contact.telefone || "",
      whatsapp: contact.whatsapp || "", email: contact.email || "", tipo: contact.tipo || "responsavel", observacoes: contact.observacoes || ""
    });
    setContactDialogOpen(true);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (!company) return <div className="text-center py-20 text-slate-400">Empresa não encontrada</div>;

  const statusBadge = {
    ativa: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inativa: "bg-slate-50 text-slate-600 border-slate-200",
    suspensa: "bg-red-50 text-red-700 border-red-200",
  };

  const tipoContactLabel = { responsavel: "Responsável", financeiro: "Financeiro", fiscal: "Fiscal", ti: "TI", outro: "Outro" };

  return (
    <div className="space-y-6">
      <Link to={createPageUrl("Companies")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Empresas
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xl font-bold shadow-lg">
          {company.nome_fantasia?.[0] || company.razao_social?.[0] || "E"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{company.nome_fantasia || company.razao_social}</h1>
            <Badge variant="outline" className={`text-xs font-semibold ${statusBadge[company.status] || ""}`}>{company.status}</Badge>
          </div>
          {company.nome_fantasia && <p className="text-sm text-slate-500 mt-0.5">{company.razao_social}</p>}
          <p className="text-sm text-slate-400 font-mono mt-1">CNPJ: {company.cnpj}</p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contatos ({contacts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dados Cadastrais</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {company.inscricao_estadual && <InfoRow icon={Building2} label="IE" value={company.inscricao_estadual} />}
                {company.endereco && <InfoRow icon={MapPin} label="Endereço" value={`${company.endereco}${company.cidade ? `, ${company.cidade}` : ""}${company.estado ? `/${company.estado}` : ""}${company.cep ? ` - ${company.cep}` : ""}`} />}
                {company.telefone && <InfoRow icon={Phone} label="Telefone" value={company.telefone} />}
                {company.email && <InfoRow icon={Mail} label="E-mail" value={company.email} />}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sincronização</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Users} label="Contador" value={company.contador_responsavel || "Não definido"} />
                <InfoRow icon={FileText} label="Pasta" value={company.pasta_sincronizacao || "Não configurada"} />
                <InfoRow icon={Clock} label="Último Envio" value={company.ultimo_envio ? format(new Date(company.ultimo_envio), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Nenhum envio registrado"} />
                {company.observacoes && <div className="pt-2 border-t border-slate-100"><p className="text-xs text-slate-400 mb-1">Observações</p><p className="text-sm text-slate-600">{company.observacoes}</p></div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Documentos Fiscais</CardTitle>
              <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to={createPageUrl(`DocumentUpload?company_id=${companyId}`)}>
                  <Plus className="w-4 h-4 mr-1" /> Enviar
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <RecentDocumentsTable documents={documents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Contatos</CardTitle>
              <Button size="sm" onClick={() => { setEditingContact(null); setContactForm({ nome: "", cargo: "", telefone: "", whatsapp: "", email: "", tipo: "responsavel", observacoes: "" }); setContactDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" /> Novo Contato
              </Button>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nenhum contato cadastrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{contact.nome}</p>
                          <Badge variant="outline" className="text-[10px] mt-1">{tipoContactLabel[contact.tipo] || contact.tipo}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContact(contact)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteContactTarget(contact)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        {contact.cargo && <p>{contact.cargo}</p>}
                        {contact.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</p>}
                        {contact.telefone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.telefone}</p>}
                        {contact.whatsapp && <p className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {contact.whatsapp}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={contactForm.nome} onChange={e => setContactForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cargo</Label><Input value={contactForm.cargo} onChange={e => setContactForm(p => ({ ...p, cargo: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={contactForm.tipo} onValueChange={v => setContactForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsavel">Responsável</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="fiscal">Fiscal</SelectItem>
                    <SelectItem value="ti">TI</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={contactForm.telefone} onChange={e => setContactForm(p => ({ ...p, telefone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={contactForm.whatsapp} onChange={e => setContactForm(p => ({ ...p, whatsapp: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea value={contactForm.observacoes} onChange={e => setContactForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveContact} disabled={savingContact || !contactForm.nome} className="bg-blue-600 hover:bg-blue-700">
              {savingContact ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteContactTarget} onOpenChange={() => setDeleteContactTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {deleteContactTarget?.nome}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}