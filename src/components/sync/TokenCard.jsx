import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, Trash2, Monitor, Terminal, Clock, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const soIcons = { windows: "🪟", linux: "🐧", macos: "🍎" };

export default function TokenCard({ token, onRevoke, onRenew }) {
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActive = token.status === "ativo";
  const daysSinceUse = token.ultimo_uso
    ? Math.floor((Date.now() - new Date(token.ultimo_uso).getTime()) / 86400000)
    : null;

  const isOnline = token.ultimo_uso && daysSinceUse !== null && daysSinceUse < 1;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isActive ? "bg-blue-50" : "bg-slate-100"}`}>
            {soIcons[token.so_agente] || "💻"}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">{token.descricao || "Agente sem nome"}</p>
            <p className="text-xs text-slate-400 mt-0.5">{token.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? "Online" : "Offline"}
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">Revogado</Badge>
          )}
        </div>
      </div>

      {/* Token Display */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Token</p>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
          <code className="flex-1 text-xs text-slate-600 font-mono truncate">
            {isActive ? token.token : "••••••••••••••••••••••••••••••••"}
          </code>
          {isActive && (
            <button onClick={handleCopy} className="p-1 rounded-lg hover:bg-slate-200 transition-colors shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        {token.pasta_monitorada && (
          <div className="col-span-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="font-mono truncate">{token.pasta_monitorada}</span>
          </div>
        )}
        {token.versao_agente && (
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-slate-300" />
            <span>v{token.versao_agente}</span>
          </div>
        )}
        {token.ultimo_uso && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-300" />
            <span>Último uso: {format(new Date(token.ultimo_uso), "dd/MM HH:mm", { locale: ptBR })}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {isActive && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onRenew(token)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Renovar Token
          </Button>
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 text-xs" onClick={() => setRevokeOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Revogar
          </Button>
        </div>
      )}

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar token?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente instalado com este token perderá acesso imediatamente e não conseguirá mais enviar documentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onRevoke(token); setRevokeOpen(false); }} className="bg-red-600 hover:bg-red-700">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}