import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, CheckCircle2 } from "lucide-react";

function formatXml(xml) {
  try {
    let indent = 0;
    const tab = "  ";
    return xml
      .replace(/>\s*</g, ">\n<")
      .trim()
      .split("\n")
      .map((node) => {
        if (node.match(/^<\/\w/)) indent = Math.max(0, indent - 1);
        const line = tab.repeat(indent) + node;
        if (node.match(/^<[^/][^>]*[^/]>$/) && !node.includes("</")) indent++;
        return line;
      })
      .join("\n");
  } catch {
    return xml;
  }
}

const typeColors = {
  NFe: "bg-blue-100 text-blue-700",
  NFCe: "bg-violet-100 text-violet-700",
  XML: "bg-slate-100 text-slate-600",
};

export default function XmlViewerModal({ open, document, onClose, onDownload }) {
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!document) return null;

  const handleCopyXml = () => {
    navigator.clipboard.writeText(document.xmlContent || "");
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(document.accessKey || "");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Badge className={`border-0 ${typeColors[document.documentType] || typeColors.XML}`}>
              {document.documentType || "XML"}
            </Badge>
            <span className="truncate">{document.filename}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Meta */}
        {(document.accessKey || document.emitterCnpj) && (
          <div className="flex flex-wrap gap-4 px-3 py-2 bg-slate-50 rounded-lg text-xs">
            {document.accessKey && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Chave:</span>
                <span className="font-mono text-slate-700 truncate max-w-[260px]" title={document.accessKey}>
                  {document.accessKey}
                </span>
                <button onClick={handleCopyKey} className="text-slate-400 hover:text-blue-500 transition-colors">
                  {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
            {document.emitterCnpj && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">CNPJ Emitente:</span>
                <span className="font-mono text-slate-700">{document.emitterCnpj}</span>
              </div>
            )}
          </div>
        )}

        {/* XML */}
        <div className="flex-1 overflow-auto rounded-xl bg-[#0d1117] p-4 min-h-[320px]">
          <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
            {document.xmlContent ? formatXml(document.xmlContent) : "⚠ Conteúdo XML não disponível para este documento."}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={handleCopyXml}>
            {copiedXml
              ? <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Copiado!</>
              : <><Copy className="w-4 h-4 mr-2" /> Copiar XML</>
            }
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onDownload(document)}>
              <Download className="w-4 h-4 mr-2" /> Baixar
            </Button>
            <Button size="sm" onClick={onClose} className="bg-blue-600 hover:bg-blue-700">Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}