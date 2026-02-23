"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Lock, Copy, Check, ExternalLink } from "lucide-react";
import { updateCollectionSharing } from "@/lib/actions/sharing";

interface SharingSettingsProps {
  collectionId: string;
  isPublic: boolean;
  slug: string | null;
  description: string | null;
}

export function SharingSettings({
  collectionId,
  isPublic: initialPublic,
  slug: initialSlug,
  description: initialDescription,
}: SharingSettingsProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl =
    slug && isPublic
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${slug}`
      : null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateCollectionSharing({
        collectionId,
        isPublic,
        slug: slug || undefined,
        description: description || undefined,
      });
      if (result.slug) setSlug(result.slug);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Sharing
        </h3>
        <button
          onClick={() => setIsPublic(!isPublic)}
          className="flex items-center gap-1.5 text-xs cursor-pointer"
        >
          {isPublic ? (
            <>
              <Globe className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Public</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Private</span>
            </>
          )}
        </button>
      </div>

      {isPublic && (
        <>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Custom URL</label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>/u/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-collection"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="My Sorcery card collection"
              className="h-7 text-xs"
            />
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="text-xs"
        >
          {saving ? "Saving..." : "Save"}
        </Button>

        {shareUrl && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}
