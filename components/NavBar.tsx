"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const LINKS = [
  { href: "/",          label: "Overview" },
  { href: "/calculator", label: "Calculator" },
  { href: "/planner",   label: "Route Planner" },
  { href: "/modifiers", label: "City Modifiers" },
  { href: "/coverage",  label: "Coverage" },
  { href: "/history",   label: "History" },
];

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "0.95rem",
        color: active ? "var(--gold)" : "var(--text-muted)",
        textDecoration: "none",
        padding: "0.25rem 0.6rem",
        borderBottom: active ? "3px solid var(--gold)" : "3px solid transparent",
        letterSpacing: "0.03em",
        transition: "color 0.15s",
        textShadow: active ? "0 0 14px rgba(201,162,74,0.55)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav
      style={{
        background: "var(--leather-mid)",
        borderBottom: "1px solid rgba(201,162,74,0.2)",
        padding: "0 1.5rem",
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
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--gold)",
          textDecoration: "none",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "1rem", opacity: 0.85 }}>⚖</span>
        SilkRoute Ledger
      </Link>

      {/* Desktop nav */}
      <div
        style={{
          display: "flex",
          gap: "0.1rem",
          alignItems: "center",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
        className="desktop-nav"
      >
        {LINKS.map(({ href, label }) => (
          <NavLink key={href} href={href} label={label} active={isActive(href)} />
        ))}
      </div>

      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="mobile-menu-btn"
          style={{
            background: "none",
            border: "1px solid rgba(201,162,74,0.3)",
            borderRadius: 4,
            padding: "0.35rem 0.5rem",
            cursor: "pointer",
            color: "var(--gold)",
            display: "none",
          }}
        >
          <Menu size={20} />
        </SheetTrigger>
        <SheetContent
          side="left"
          style={{
            background: "var(--leather-mid)",
            borderRight: "1px solid rgba(201,162,74,0.2)",
            padding: "2rem 1.5rem",
          }}
        >
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "var(--gold)", marginBottom: "2rem", letterSpacing: "0.04em" }}>
            ⚖ SilkRoute Ledger
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.05rem",
                  color: isActive(href) ? "var(--gold)" : "var(--text-muted)",
                  textDecoration: "none",
                  padding: "0.6rem 0.75rem",
                  borderRadius: 3,
                  borderLeft: isActive(href) ? "3px solid var(--gold)" : "3px solid transparent",
                  background: isActive(href) ? "rgba(201,162,74,0.06)" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .desktop-nav { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
