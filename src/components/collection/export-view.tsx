"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText, Crown } from "lucide-react";
import {
  exportCollectionCsv,
  exportCollectionDecklist,
} from "@/lib/actions/import-export";

interface ExportViewProps {
  isPremium: boolean;
}

export function ExportView({ isPremium }: ExportViewProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "decklist") => {
    if (!isPremium) return;

    setLoading(format);
    try {
      let content: string;
      let filename: string;
      if (format === "csv") {
        const result = await exportCollectionCsv();
        content = result.csv;
        filename = result.filename;
      } else {
        const result = await exportCollectionDecklist();
        content = result.text;
        filename = result.filename;
      }
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  if (!isPremium) {
    return (
      <Card className="border-amber-500/30 bg-amber-950/10">
        <CardContent className="p-6 text-center">
          <Crown className="h-8 w-8 mx-auto text-amber-400 mb-3" />
          <h2 className="text-lg font-serif font-medium text-amber-100 mb-2">
            Premium Feature
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Export your collection as CSV or decklist format with Premium.
          </p>
          <Button disabled>Upgrade (Coming soon)</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-green-400" />
            <div>
              <p className="font-medium text-sm">CSV</p>
              <p className="text-xs text-muted-foreground">
                Card name, set, finish, quantity, condition, purchase price
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => handleExport("csv")}
            disabled={loading !== null}
          >
            <Download className="h-3.5 w-3.5" />
            {loading === "csv" ? "Exporting..." : "Export"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-400" />
            <div>
              <p className="font-medium text-sm">Decklist</p>
              <p className="text-xs text-muted-foreground">
                Standard text format: 4x Card Name (Set)
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => handleExport("decklist")}
            disabled={loading !== null}
          >
            <Download className="h-3.5 w-3.5" />
            {loading === "decklist" ? "Exporting..." : "Export"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
