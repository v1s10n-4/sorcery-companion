"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  previewCsvImport,
  previewDecklistImport,
  executeCsvImport,
} from "@/lib/actions/import-export";
import { cn } from "@/lib/utils";

type Format = "csv" | "decklist" | null;

interface PreviewRow {
  cardName: string;
  setName: string;
  finish: string;
  quantity: number;
  condition: string;
  purchasePrice: number | null;
  matched: boolean;
  variantId: string | null;
}

export function ImportView() {
  const router = useRouter();
  const [format, setFormat] = useState<Format>(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);

  const handlePreview = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const data =
        format === "csv"
          ? await previewCsvImport(content)
          : await previewDecklistImport(content);
      setPreview(data.rows);
      setMatchedCount(data.matchedCount);
      setTotalCount(data.totalCount);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const data = await executeCsvImport(preview);
      setResult(data);
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string);
      setPreview(null);
    };
    reader.readAsText(file);
  };

  if (result) {
    return (
      <div className="text-center py-12">
        <Check className="h-12 w-12 mx-auto text-green-400 mb-3" />
        <h2 className="text-xl font-serif text-amber-100 mb-2">
          Import Complete
        </h2>
        <p className="text-muted-foreground mb-6">
          {result.imported} cards imported to your collection.
        </p>
        <Button onClick={() => router.push("/collection")}>
          View Collection
        </Button>
      </div>
    );
  }

  // Format selection
  if (!format) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setFormat("csv")}
          className="rounded-lg border border-border/50 bg-card p-6 text-left hover:border-amber-700/50 transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="h-8 w-8 text-green-400 mb-3" />
          <h3 className="font-medium mb-1">CSV File</h3>
          <p className="text-xs text-muted-foreground">
            Import from a CSV with card name, set, finish, quantity, condition, and purchase price.
          </p>
        </button>
        <button
          onClick={() => setFormat("decklist")}
          className="rounded-lg border border-border/50 bg-card p-6 text-left hover:border-amber-700/50 transition-colors cursor-pointer"
        >
          <FileText className="h-8 w-8 text-blue-400 mb-3" />
          <h3 className="font-medium mb-1">Decklist</h3>
          <p className="text-xs text-muted-foreground">
            Paste a decklist in standard format: 4x Card Name (Set)
          </p>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setFormat(null);
          setContent("");
          setPreview(null);
        }}
      >
        ← Back
      </Button>

      {format === "csv" ? (
        <div>
          <label className="block mb-2">
            <span className="text-sm font-medium">Upload CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:text-sm file:font-medium file:bg-card file:text-foreground hover:file:bg-muted file:cursor-pointer"
            />
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Or paste CSV content:
          </p>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setPreview(null);
            }}
            placeholder={`Card Name,Set,Finish,Product,Quantity,Condition,Purchase Price\nDeath Dealer,Beta,Standard,Booster,1,NM,12.50`}
            className="w-full h-32 rounded-lg border border-border bg-card p-3 text-sm font-mono resize-y"
          />
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium mb-2">Paste decklist</p>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setPreview(null);
            }}
            placeholder={`4x Apprentice Wizard (Alpha)\n2x Death Dealer (Beta)\n1x Toolbox (Gothic)`}
            className="w-full h-40 rounded-lg border border-border bg-card p-3 text-sm font-mono resize-y"
          />
        </div>
      )}

      {!preview && (
        <Button
          onClick={handlePreview}
          disabled={!content.trim() || loading}
          className="gap-1.5"
        >
          {loading ? "Analyzing..." : "Preview Import"}
        </Button>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant={matchedCount === totalCount ? "default" : "secondary"}>
              {matchedCount}/{totalCount} matched
            </Badge>
            {matchedCount < totalCount && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {totalCount - matchedCount} cards could not be matched
              </span>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50">
            {preview.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm border-b border-border/30 last:border-b-0",
                  !row.matched && "opacity-50"
                )}
              >
                {row.matched ? (
                  <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
                )}
                <span className="font-medium truncate">{row.cardName}</span>
                <span className="text-muted-foreground text-xs">
                  {row.setName}
                </span>
                <span className="text-muted-foreground text-xs ml-auto">
                  ×{row.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={matchedCount === 0 || importing}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing
                ? "Importing..."
                : `Import ${matchedCount} cards`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPreview(null);
                setContent("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
