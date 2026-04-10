import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "SilkRoute Ledger",
  description: "Ancient routes. Modern intelligence.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "var(--leather)", minHeight: "100vh" }}>
        <NavBar />
        <main style={{ minHeight: "calc(100vh - 60px)" }}>{children}</main>
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "1rem 2rem",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: "0.75rem",
            fontFamily: "'Cormorant Garamond', serif",
            letterSpacing: "0.1em",
          }}
        >
          ✦ SilkRoute Ledger — Ancient routes. Modern intelligence. ✦
        </footer>
      </body>
    </html>
  );
}
