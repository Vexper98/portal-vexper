import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, CheckCircle2, Terminal } from "lucide-react";

export default function TokenSuccessDialog({ open, onOpenChange, token, company }) {
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const installCmd = token
    ? `agent-sync install --token="${token}" --watch="${company?.pasta_monitorada || "C:\\\\XMLs"}"`
    : "";

  const handleCopy = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <DialogTitle>Token Gerado com Sucesso!</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Copie o token abaixo e configure no agente instalado na máquina do cliente.
            <strong className="text-slate-700"> Este token não será exibido novamente.</strong>
          </p>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Token de Autenticação</p>
            <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-3 border border-slate-700">
              <code className="flex-1 text-sm text-emerald-400 font-mono break-all">{token?.token}</code>
              <button
                onClick={() => handleCopy(token?.token, setCopied)}
                className="shrink-0 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Comando de Instalação</p>
            <div className="flex items-start gap-2 bg-slate-900 rounded-xl px-4 py-3 border border-slate-700">
              <Terminal className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <code className="flex-1 text-xs text-slate-300 font-mono break-all">{installCmd}</code>
              <button
                onClick={() => handleCopy(installCmd, setCopiedCmd)}
                className="shrink-0 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-500">
            <p className="font-semibold text-slate-600">Próximos passos:</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              <li>Baixe o instalador do agente para o sistema operacional correto</li>
              <li>Execute o instalador na máquina do cliente</li>
              <li>Configure o token e a pasta a monitorar</li>
              <li>O agente começará a sincronizar automaticamente</li>
            </ol>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}