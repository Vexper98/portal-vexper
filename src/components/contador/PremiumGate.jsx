import React, { useState } from "react";
import { Lock } from "lucide-react";
import UpgradeModal from "./UpgradeModal";

/**
 * Wraps any content/button that is premium-gated.
 * If isPro=false, clicking opens the upgrade modal instead.
 */
export default function PremiumGate({ isPro, children }) {
  const [showModal, setShowModal] = useState(false);

  if (isPro) return children;

  return (
    <>
      <div className="relative cursor-pointer" onClick={() => setShowModal(true)}>
        <div className="pointer-events-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5 backdrop-blur-sm">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">PRO</span>
          </div>
        </div>
      </div>
      <UpgradeModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}