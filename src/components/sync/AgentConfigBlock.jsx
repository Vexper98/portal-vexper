import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AgentConfigBlock({ token, companyId }) {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [endpoint, setEndpoint] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getAgentConfig", {}).then(res => {
      setEndpoint(res.data?.endpoint || null);
    }).catch(() => {});
  }, []);

  const endpointDisplay = endpoint || "carregando...";

  const config = `# Configuração do Agente Desktop
endpoint: "${endpointDisplay}"
token: "${token || "SEU_TOKEN_AQUI"}"

# Exemplo de chamada cURL:
# curl -X POST "${endpointDisplay}" \\
#   -H "Authorization: Bearer ${token || "SEU_TOKEN"}" \\
#   -F "file=@/caminho/para/nota.xml"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    if (!endpoint) return;
    navigator.clipboard.writeText(endpoint);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Endpoint Upload (URL pública da API)</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs shrink-0"
              onClick={handleCopyUrl}
              disabled={!endpoint}
            >
              {copiedUrl ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> Copiado!</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copiar URL do Endpoint</>}
            </Button>
          </div>
          {endpoint ? (
            <p className="font-mono text-slate-700 break-all text-xs bg-white border border-slate-200 rounded-md px-3 py-2">{endpoint}</p>
          ) : (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando URL...
            </span>
          )}
        </div>
        <div className="p-3 rounded-lg bg-slate-50 space-y-1.5">
          <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Método</p>
          <p className="font-mono text-slate-700">POST</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 space-y-1.5">
          <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Content-Type</p>
          <p className="font-mono text-slate-700">multipart/form-data</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 space-y-1.5">
          <p className="text-blue-400 font-medium uppercase tracking-wide text-[10px]">Company ID</p>
          <p className="font-mono text-blue-700 break-all">{companyId || "—"}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 space-y-1.5">
          <p className="text-emerald-400 font-medium uppercase tracking-wide text-[10px]">Token (Bearer)</p>
          <p className="font-mono text-emerald-700 break-all text-[11px]">{token ? `${token.slice(0, 20)}…` : "—"}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] relative">
        <pre className="text-slate-300 whitespace-pre-wrap">{config}</pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-7 text-xs text-slate-400 hover:text-white"
          onClick={handleCopy}
        >
          {copied ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-400" /> Copiado</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copiar</>}
        </Button>
      </div>
    </div>
  );
}