import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Lock, Sparkles, MessageCircle, X } from "lucide-react";

const ADMIN_WHATSAPP = "5511999999999"; // substituir pelo número real

export default function UpgradeModal({ open, onClose }) {
  const handleContact = () => {
    const msg = encodeURIComponent("Olá, quero assinar o plano ProContador para liberar os recursos premium do Portal Vexper.");
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-0 p-0 overflow-hidden rounded-3xl">
        <div className="relative" style={{ background: "linear-gradient(135deg, #060d1f 0%, #0d1e45 100%)" }}>
          {/* Blur bg */}
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(6,182,212,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(99,102,241,0.3) 0%, transparent 50%)" }} />

          <div className="relative p-8 text-center">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/40"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-black text-white mb-2">Assine o ProContador</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Esse recurso está disponível apenas no plano <span className="text-cyan-400 font-bold">ProContador</span>.
              Fale com nosso administrador para liberar recursos avançados de gestão contábil.
            </p>

            <div className="rounded-2xl p-4 mb-6 text-left space-y-2"
              style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">✨ O que você ganha</p>
              {[
                "Guia de Impostos (DAS, DARF, FGTS e mais)",
                "Contas a Pagar e Receber",
                "Envio por WhatsApp e Email",
                "Relatórios e Calendário Fiscal",
                "Gestão de Obrigações",
                "Centro de Pendências",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}
                className="flex-1 rounded-xl border-white/10 text-slate-400 hover:text-white"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                Fechar
              </Button>
              <Button onClick={handleContact}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 hover:opacity-90 shadow-lg shadow-cyan-500/30 gap-2">
                <MessageCircle className="w-4 h-4" /> Falar com Admin
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}