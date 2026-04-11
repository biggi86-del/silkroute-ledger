"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",          label: "Overview" },
  { href: "/calculator", label: "Calculator" },
  { href: "/planner",   label: "Route Planner" },
  { href: "/modifiers", label: "City Modifiers" },
  { href: "/coverage",  label: "Coverage" },
  { href: "/history",   label: "History" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "var(--leather-mid)",
        borderBottom: "1px solid rgba(201,162,74,0.2)",
        padding: "0 2rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(201,162,74,0.12)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.4rem",
          fontWeight: 600,
          color: "var(--gold)",
          textDecoration: "none",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1rem", opacity: 0.8 }}>⚖</span>
        SilkRoute Ledger
      </Link>

      {/* Nav Links */}
      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
        {LINKS.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1rem",
                color: active ? "var(--gold)" : "var(--text-muted)",
                textDecoration: "none",
                padding: "0.25rem 0.6rem",
                borderBottom: active ? "3px solid var(--gold)" : "3px solid transparent",
                letterSpacing: "0.04em",
                transition: "color 0.2s",
                textShadow: active ? "0 0 14px rgba(201,162,74,0.55)" : "none",
                marginBottom: active ? "-1px" : undefined,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
