import type { Metadata } from "next";
import { ScannerClient } from "./client";

export const metadata: Metadata = {
  title: "Scan Cards — Sorcery Companion",
  description: "Use your camera to scan and identify Sorcery: Contested Realm cards",
};

export default function ScanPage() {
  return <ScannerClient />;
}
