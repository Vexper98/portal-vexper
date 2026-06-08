import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, MessageCircle, X, Receipt, CreditCard, Banknote,
  BarChart3, Bell, CalendarCheck, Zap, Shield, Building2,
  TrendingUp
} from "lucide-react";

const ADMIN_WHATSAPP = "5511999999999";

const FEATURES = [
  { icon: Receipt, label: "Guias de Impostos", desc: "DAS, DARF, FGTS, INSS, ICMS, ISS", color: "text-amber-400" },
  { icon: CreditCard, label: "Contas a Pagar", desc: "Gestão completa de pagamentos", color: "text-red-400" },
  { icon: Banknote, label: "Contas a Receber", desc: "Cobranças e mensalidades de clientes", color: "text-green-400" },
  { icon: BarChart3, label: "Gráficos & Relatórios", desc: "Análises visuais em tempo real", color: "text-blue-400" },
  { icon: Bell, label: "Alertas de Vencimento", desc: "Notificações automáticas de prazo", color: "text-violet-400" },
  { icon: CalendarCheck, label: "Calendário Fiscal", desc: "Prazos e obrigações fiscais", color: "text-cyan-400" },
  { icon: Zap, label: "WhatsApp & Email", desc: "Envio automático de guias ao cliente", color: "text-emerald-400" },
  { icon: Building2, label: "Gestão de Clientes", desc: "Painel centralizado por empresa", color: "text-indigo-400" },
  { icon: TrendingUp, label: "Indicadores de Performance", desc: "KPIs fiscais por empresa", color: "text-rose-400" },
  { icon: Shield, label: "Segurança Avançada", desc: "Controle de acesso e auditoria", color: "text-slate-400" },
];

export default function UpgradeModal({ open, onClose }) {
  const handleContact = () => {
    const msg = encodeURIComponent("Olá, quero assinar o plano ProContador para liberar os recursos premium do Portal Vexper.");
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-0 p-0 overflow-hidden rounded-3xl">
        <div className="relative" style={{ background: "linear-gradient(135deg, #060d1f 0%, #0d1e45 100%)" }}>
          {/* Background image */}
          <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=40" alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-5" />

          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(251,191,36,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.3) 0%, transparent 50%)" }} />

          <div className="relative p-6">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/40 flex-shrink-0"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-black text-white">Assine o ProContador ⭐</h2>
                <p className="text-slate-400 text-xs leading-relaxed mt-0.5">
                  Tudo que você precisa para gerenciar seus clientes com eficiência total.
                </p>
              </div>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {FEATURES.map((item) => (
                <div key={item.label} className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-[11px] font-bold text-slate-200">{item.label}</p>
                    <p className="text-[9px] text-slate-500 leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}
                className="flex-1 rounded-xl border-white/10 text-slate-400 hover:text-white h-11"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                Fechar
              </Button>
              <Button onClick={handleContact}
                className="flex-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 hover:opacity-90 shadow-lg shadow-amber-500/30 gap-2 px-6 h-11 font-bold">
                <MessageCircle className="w-4 h-4" /> Falar com Admin
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}