"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/calculator", label: "Calculator" },
  { href: "/routes", label: "Routes" },
  { href: "/planner", label: "Planner" },
  { href: "/prices", label: "Price Grid" },
  { href: "/modifiers", label: "Modifiers" },
  { href: "/coverage", label: "Coverage" },
  { href: "/history", label: "History" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "var(--leather-mid)",
        borderBottom: "1px solid var(--border-gold)",
        padding: "0 2rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
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
                borderBottom: active ? "1px solid var(--gold)" : "1px solid transparent",
                letterSpacing: "0.04em",
                transition: "color 0.2s",
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
