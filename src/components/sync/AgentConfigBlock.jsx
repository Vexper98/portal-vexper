import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";

export default function AgentConfigBlock({ token, companyId }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin;
  const endpoint = `${baseUrl}/api/receiveDocument`;

  const config = `# Configuração do Agente Desktop
portal_url: "${baseUrl}"
endpoint: "${endpoint}"
company_id: "${companyId || "SEU_COMPANY_ID"}"
token: "${token || "SEU_TOKEN_AQUI"}"

# Exemplo de chamada cURL:
# curl -X POST "${endpoint}" \\
#   -H "Authorization: Bearer ${token || "SEU_TOKEN"}" \\
#   -F "companyId=${companyId || "SEU_COMPANY_ID"}" \\
#   -F "file=@/caminho/para/nota.xml"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 space-y-1.5">
          <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">URL Base</p>
          <p className="font-mono text-slate-700 break-all">{baseUrl}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 space-y-1.5">
          <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Endpoint Upload</p>
          <p className="font-mono text-slate-700 break-all">/api/receiveDocument</p>
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