import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SelectionProvider } from "@/components/selection-provider";
import { Nav } from "@/components/nav";
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

export const metadata: Metadata = {
  title: "Sorcery Companion",
  description:
    "Browse, search, and manage your Sorcery: Contested Realm card collection",
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
            <Nav />
            {children}
            <SelectionProvider />
            <BottomTabBar />
          </TooltipProvider>
        </NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
}
