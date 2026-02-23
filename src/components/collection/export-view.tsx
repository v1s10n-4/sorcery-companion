"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  exportCollectionCsv,
  exportCollectionDecklist,
} from "@/lib/actions/import-export";

export function ExportView() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "decklist") => {
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
