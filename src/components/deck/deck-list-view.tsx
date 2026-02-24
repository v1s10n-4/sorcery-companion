"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/card-image";
import { Plus, Swords, User } from "lucide-react";
import { createDeck } from "@/lib/actions/deck";
import { ElementBadges } from "@/components/icons";
import { cn } from "@/lib/utils";

interface DeckSummary {
  id: string;
  name: string;
  avatarName: string | null;
  avatarSlug: string | null;
  atlasCount: number;
  spellbookCount: number;
  collectionCount: number;
  elements: string[];
  totalCards: number;
  updatedAt: string;
}

interface DeckListViewProps {
  decks: DeckSummary[];
}

export function DeckListView({ decks }: DeckListViewProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await createDeck(newName.trim());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-serif text-amber-100">My Decks</h1>
        {!creating && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Deck
          </Button>
        )}
      </div>

      {creating && (
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Deck name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button onClick={handleCreate} disabled={loading || !newName.trim()}>
            {loading ? "Creating..." : "Create"}
          </Button>
          <Button variant="outline" onClick={() => { setCreating(false); setNewName(""); }}>
            Cancel
          </Button>
        </div>
      )}

      {decks.length === 0 && !creating ? (
        <div className="text-center py-16">
          <Swords className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h2 className="text-lg font-serif text-muted-foreground mb-1">No decks yet</h2>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Build your first deck: 1 Avatar + 30 Sites + 60 Spells + 10 Collection.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>Create deck</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map((d) => {
            const isComplete = !!d.avatarName && d.atlasCount >= 30 && d.spellbookCount === 60;

            return (
              <Link key={d.id} href={`/decks/${d.id}`}>
                <div className="flex items-center gap-4 rounded-xl border border-border/50 hover:border-amber-700/50 bg-card p-3 sm:p-4 transition-colors cursor-pointer group">
                  {/* Avatar image or placeholder */}
                  <div className="shrink-0">
                    {d.avatarSlug ? (
                      <CardImage
                        slug={d.avatarSlug}
                        name={d.avatarName ?? "Avatar"}
                        width={56}
                        height={78}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-14 h-[78px] rounded-lg bg-muted/30 border border-dashed border-border/50 flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif font-medium text-amber-100 truncate group-hover:text-amber-50 transition-colors">
                        {d.name}
                      </h3>
                      {isComplete && (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[9px]">Complete</Badge>
                      )}
                    </div>

                    {d.avatarName && (
                      <p className="text-xs text-amber-300/70 mb-1">{d.avatarName}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className={cn(d.atlasCount >= 30 && "text-green-400/70")}>
                        Atlas {d.atlasCount}/30
                      </span>
                      <span className={cn(d.spellbookCount === 60 && "text-green-400/70")}>
                        Spellbook {d.spellbookCount}/60
                      </span>
                      {d.collectionCount > 0 && (
                        <span>Collection {d.collectionCount}/10</span>
                      )}
                      <span className="text-muted-foreground/40">{d.totalCards} cards</span>
                    </div>
                  </div>

                  {/* Elements */}
                  {d.elements.length > 0 && (
                    <div className="shrink-0 hidden sm:block">
                      <ElementBadges elements={d.elements} size="sm" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
