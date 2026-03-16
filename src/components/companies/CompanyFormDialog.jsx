import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

const STATES = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function CompanyFormDialog({ open, onOpenChange, company, onSave, saving }) {
  const [form, setForm] = useState(company || {
    razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "",
    endereco: "", cidade: "", estado: "", cep: "", telefone: "", email: "",
    contador_responsavel: "", contadorEmail: "", pasta_sincronizacao: "", status: "ativa", observacoes: ""
  });
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState("");

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const buscarCnpj = async () => {
    const cnpjLimpo = form.cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) { setCnpjError("CNPJ deve ter 14 dígitos"); return; }
    setCnpjError("");
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      const end = data.estabelecimento;
      const logradouro = [end.tipo_logradouro, end.logradouro, end.numero, end.complemento].filter(Boolean).join(" ");
      const uf = end.estado?.sigla || "";
      const telefone = end.ddd1 && end.telefone1 ? `(${end.ddd1}) ${end.telefone1}` : "";
      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: end.nome_fantasia || prev.nome_fantasia,
        cnpj: `${cnpjLimpo.slice(0,2)}.${cnpjLimpo.slice(2,5)}.${cnpjLimpo.slice(5,8)}/${cnpjLimpo.slice(8,12)}-${cnpjLimpo.slice(12)}`,
        endereco: logradouro || prev.endereco,
        cidade: end.cidade?.nome || prev.cidade,
        estado: uf || prev.estado,
        cep: end.cep ? end.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") : prev.cep,
        telefone: telefone || prev.telefone,
        email: end.email || prev.email,
      }));
    } catch (e) {
      setCnpjError("CNPJ não encontrado ou inválido");
    }
    setLoadingCnpj(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Razão Social *</Label>
              <Input value={form.razao_social} onChange={e => handleChange("razao_social", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={e => handleChange("nome_fantasia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ *</Label>
              <Input value={form.cnpj} onChange={e => handleChange("cnpj", e.target.value)} required placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição Estadual</Label>
              <Input value={form.inscricao_estadual} onChange={e => handleChange("inscricao_estadual", e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => handleChange("endereco", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => handleChange("cidade", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => handleChange("estado", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={e => handleChange("cep", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => handleChange("telefone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contador Responsável (nome)</Label>
              <Input value={form.contador_responsavel} onChange={e => handleChange("contador_responsavel", e.target.value)} placeholder="Nome do contador" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail do Contador (login vinculado)</Label>
              <Input type="email" value={form.contadorEmail || ""} onChange={e => handleChange("contadorEmail", e.target.value)} placeholder="contador@escritorio.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Pasta de Sincronização</Label>
              <Input value={form.pasta_sincronizacao} onChange={e => handleChange("pasta_sincronizacao", e.target.value)} placeholder="C:\Notas\Empresa ou /notas/empresa" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => handleChange("observacoes", e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}