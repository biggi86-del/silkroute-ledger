import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.silkrouteledger.com"),
  title: {
    default: "SilkRoute Ledger — Silk Road Trading Intelligence",
    template: "%s | SilkRoute Ledger",
  },
  description:
    "Live trading intelligence dashboard for Silk Road merchants. Track prices across Tyre, Damascus, Palmyra, Ctesiphon and Ecbatana. Find the most profitable trade routes in real time.",
  keywords: [
    "Silk Road trading",
    "trade routes",
    "market prices",
    "trading dashboard",
    "merchant intelligence",
    "Tyre",
    "Damascus",
    "Palmyra",
    "Ctesiphon",
    "Ecbatana",
  ],
  openGraph: {
    type: "website",
    url: "https://www.silkrouteledger.com",
    title: "SilkRoute Ledger — Silk Road Trading Intelligence",
    description:
      "Live trading intelligence dashboard. Find profitable trade routes across ancient cities in real time.",
    siteName: "SilkRoute Ledger",
  },
  twitter: {
    card: "summary",
    title: "SilkRoute Ledger",
    description: "Live Silk Road trading intelligence — prices, routes, profit margins.",
  },
  alternates: {
    canonical: "https://www.silkrouteledger.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
