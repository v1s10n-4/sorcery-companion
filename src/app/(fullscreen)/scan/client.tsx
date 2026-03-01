"use client";

import dynamic from "next/dynamic";

const ScannerView = dynamic(
  () =>
    import("@/components/scanner/scanner-view").then((m) => m.ScannerView),
  { ssr: false }
);

export function ScannerClient() {
  return <ScannerView />;
}
