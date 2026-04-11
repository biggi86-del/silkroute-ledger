"use client";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";

export function SkeletonBlock({ h = 40, w = "100%" }: { h?: number; w?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        height: h, width: w,
        background: "var(--leather-light)",
        borderRadius: 3,
        border: "1px solid var(--border)",
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "1.25rem", background: "var(--leather-light)", borderRadius: 4, border: "1px solid var(--border)" }}>
      <SkeletonBlock h={14} w="60%" />
      <SkeletonBlock h={32} w="40%" />
    </div>
  );
}

export default function LoadingSpinner({ message = "Consulting the ledger…" }: { message?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "4rem", color: "var(--text-muted)" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
        <Compass size={40} color="var(--gold)" strokeWidth={1.5} />
      </motion.div>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", letterSpacing: "0.08em" }}>
        {message}
      </p>
    </div>
  );
}
