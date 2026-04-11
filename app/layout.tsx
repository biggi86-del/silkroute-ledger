import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  themeColor: "#1C1410",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.silkrouteledger.com"),
  title: {
    default: "SilkRoute Ledger",
    template: "%s | SilkRoute Ledger",
  },
  description: "A live price tracker for the Roblox game Silk Road: Trading Simulator. See current prices across Tyre, Damascus, Palmyra, Ctesiphon and Ecbatana to find the best trades.",
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
      "A live price tracker for the Roblox game Silk Road: Trading Simulator. See current prices across Tyre, Damascus, Palmyra, Ctesiphon and Ecbatana to find the best trades.",
    siteName: "SilkRoute Ledger",
  },
  twitter: {
    card: "summary",
    title: "SilkRoute Ledger",
    description: "A live price tracker for the Roblox game Silk Road: Trading Simulator. See current prices across Tyre, Damascus, Palmyra, Ctesiphon and Ecbatana to find the best trades.",
  },
  alternates: {
    canonical: "https://www.silkrouteledger.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
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
