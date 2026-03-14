import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const BASE_URL = "https://sorcery-companion.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Sorcery Companion",
    template: "%s — Sorcery Companion",
  },
  description:
    "Browse, search, and manage your Sorcery: Contested Realm card collection",
  keywords: [
    "Sorcery Contested Realm",
    "TCG",
    "card game",
    "collection tracker",
    "card browser",
  ],
  authors: [{ name: "Sorcery Companion" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Sorcery Companion",
    title: "Sorcery Companion",
    description:
      "Browse, search, and manage your Sorcery: Contested Realm card collection",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorcery Companion",
    description:
      "Browse, search, and manage your Sorcery: Contested Realm card collection",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cinzel.variable} ${inter.variable} antialiased min-h-screen bg-background text-foreground font-sans`}
      >
        <NuqsAdapter>
          <TooltipProvider delayDuration={300}>
            {children}
            <BottomTabBar />
          </TooltipProvider>
        </NuqsAdapter>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
