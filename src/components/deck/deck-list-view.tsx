"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Swords, Crown } from "lucide-react";
import { createDeck } from "@/lib/actions/deck";
import { ElementBadges } from "@/components/icons";

interface DeckSummary {
  id: string;
  name: string;
  avatarName: string | null;
  atlasCount: number;
  spellbookCount: number;
  elements: string[];
  updatedAt: string;
}

interface DeckListViewProps {
  decks: DeckSummary[];
  isPremium: boolean;
}

export function DeckListView({ decks, isPremium }: DeckListViewProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const canCreate = isPremium || decks.length < 1;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await createDeck(newName.trim());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-serif text-amber-100">
          My Decks
        </h1>
        {canCreate && !creating && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Deck
          </Button>
        )}
        {!canCreate && (
          <Button size="sm" variant="outline" disabled className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Upgrade for more decks
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
          <Button variant="outline" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      )}

      {decks.length === 0 && !creating ? (
        <div className="text-center py-16">
          <Swords className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h2 className="text-lg font-serif text-muted-foreground mb-1">
            No decks yet
          </h2>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Build your first Sorcery deck with Atlas + Spellbook.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Create deck
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map((d) => (
            <Link key={d.id} href={`/decks/${d.id}`}>
              <Card className="border-border/50 hover:border-amber-700/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif font-medium text-amber-100">
                      {d.name}
                    </h3>
                    {d.elements.length > 0 && (
                      <ElementBadges elements={d.elements} size="sm" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {d.avatarName && (
                      <span className="text-amber-300">{d.avatarName}</span>
                    )}
                    <span>Atlas: {d.atlasCount}/20</span>
                    <span>Spellbook: {d.spellbookCount}/40</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
