import { motion } from "framer-motion";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b20f55fd3ef9a7984c9160/f9af52d2e_logo.png";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: "#060d1f" }}>
      {/* Animated dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,210,255,0.9) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Glow orbs */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)" }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
      />

      {/* Scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)" }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner brackets */}
      {[
        "top-8 left-8 border-t-2 border-l-2",
        "top-8 right-8 border-t-2 border-r-2",
        "bottom-8 left-8 border-b-2 border-l-2",
        "bottom-8 right-8 border-b-2 border-r-2",
      ].map((cls, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className={`absolute w-12 h-12 border-cyan-500/40 ${cls}`}
        />
      ))}

      {/* Horizontal lines */}
      {[-60, 60].map((offset, i) => (
        <motion.div key={i}
          className="absolute left-0 right-0 h-px"
          style={{
            top: `calc(50% + ${offset}px)`,
            background: "linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.15) 50%, transparent 100%)"
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative"
        >
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-6 rounded-full border border-dashed border-cyan-500/20"
          />
          {/* Inner ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-3 rounded-full border border-cyan-500/10"
          />

          {/* Logo image */}
          <motion.div
            animate={{ filter: ["brightness(0.9) drop-shadow(0 0 12px rgba(6,182,212,0.3))", "brightness(1.1) drop-shadow(0 0 24px rgba(6,182,212,0.6))", "brightness(0.9) drop-shadow(0 0 12px rgba(6,182,212,0.3))"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10"
          >
            <img src={LOGO_URL} alt="Exper Sistemas" className="w-52 h-auto" style={{ filter: "brightness(1.3) contrast(1.1)" }} />
          </motion.div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3 w-64"
        >
          <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #0ea5e9, #06b6d4, #3b82f6)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
            />
          </div>

          {/* Dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map(i => (
              <motion.div key={i}
                className="w-1 h-1 rounded-full bg-cyan-500"
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>

          <motion.p
            className="text-xs font-mono tracking-[0.3em] text-cyan-400/60 uppercase"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Inicializando sistema...
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}