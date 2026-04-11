"use client";
import { motion, type Variants } from "framer-motion";

export function PageFade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.2, delay: i * 0.05, ease: "easeOut" } }),
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

export const scaleUp = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
};

export const pulseGold = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(201,162,74,0)",
      "0 0 12px rgba(201,162,74,0.35)",
      "0 0 0px rgba(201,162,74,0)",
    ],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};
