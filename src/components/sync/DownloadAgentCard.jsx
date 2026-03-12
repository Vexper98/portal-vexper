import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Terminal, Apple } from "lucide-react";

const platforms = [
  {
    so: "windows",
    label: "Windows",
    sublabel: "Windows 10/11 (64-bit)",
    icon: "🪟",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    ext: ".exe",
    version: "1.2.4",
  },
  {
    so: "linux",
    label: "Linux",
    sublabel: "Ubuntu, Debian, CentOS",
    icon: "🐧",
    color: "from-slate-600 to-slate-800",
    bg: "bg-slate-50",
    ext: ".sh",
    version: "1.2.4",
  },
  {
    so: "macos",
    label: "macOS",
    sublabel: "macOS 12 Monterey ou superior",
    icon: "🍎",
    color: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    ext: ".dmg",
    version: "1.2.4",
  },
];

export default function DownloadAgentCard() {
  const handleDownload = (platform) => {
    // In a real implementation, this would trigger the actual download
    alert(`Em produção, o download do agente para ${platform.label} (v${platform.version}) seria iniciado aqui.`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {platforms.map((p) => (
        <Card key={p.so} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center text-xl`}>
                {p.icon}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">{p.label}</p>
                <p className="text-[11px] text-slate-400">{p.sublabel}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Versão</span>
                <span className="font-mono font-semibold text-slate-600">v{p.version}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Formato</span>
                <span className="font-mono font-semibold text-slate-600">{p.ext}</span>
              </div>
            </div>

            <Button
              onClick={() => handleDownload(p)}
              className={`w-full bg-gradient-to-r ${p.color} text-white border-0 hover:opacity-90 text-xs`}
              size="sm"
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Baixar para {p.label}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}