import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateTokenDialog({ open, onOpenChange, companies, onSave, saving }) {
  const [form, setForm] = useState({
    company_id: "",
    descricao: "",
    pasta_monitorada: "",
    so_agente: "windows",
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedCompany = companies.find(c => c.id === form.company_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      company_name: selectedCompany?.nome_fantasia || selectedCompany?.razao_social || "",
      company_cnpj: selectedCompany?.cnpj || "",
    });
  };

  const soPlaceholders = {
    windows: "C:\\Documentos\\NotasFiscais",
    linux: "/home/usuario/notas_fiscais",
    macos: "/Users/usuario/Documentos/notas_fiscais",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Token de Sincronização</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Select value={form.company_id} onValueChange={v => handleChange("company_id", v)} required>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_fantasia || c.razao_social} — {c.cnpj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição / Identificador</Label>
            <Input
              value={form.descricao}
              onChange={e => handleChange("descricao", e.target.value)}
              placeholder="Ex: Servidor Principal, Máquina Caixa 1..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sistema Operacional</Label>
            <Select value={form.so_agente} onValueChange={v => handleChange("so_agente", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="windows">🪟 Windows</SelectItem>
                <SelectItem value="linux">🐧 Linux</SelectItem>
                <SelectItem value="macos">🍎 macOS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Pasta a Monitorar</Label>
            <Input
              value={form.pasta_monitorada}
              onChange={e => handleChange("pasta_monitorada", e.target.value)}
              placeholder={soPlaceholders[form.so_agente]}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-slate-400">O agente irá monitorar esta pasta e subpastas automaticamente.</p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <p className="font-semibold mb-1">⚠️ Atenção</p>
            <p>O token gerado é secreto e deve ser inserido apenas na configuração do agente. Não compartilhe com terceiros.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.company_id} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Gerando..." : "Gerar Token"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}