"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Trash2 } from "lucide-react";
import { updateProfile, deleteAccount } from "@/lib/actions/user";
import { createClient } from "@/lib/supabase/client";

interface SettingsViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    plan: string;
  };
}

export function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ name });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteAccount();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Profile
          </h2>

          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-14 w-14 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-xl font-medium text-amber-200">
                {user.name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display name</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={saving || name === user.name}>
                {saved ? "Saved!" : saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Plan
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant={user.plan === "premium" ? "default" : "secondary"}
                className="gap-1"
              >
                {user.plan === "premium" && <Crown className="h-3 w-3" />}
                {user.plan === "premium" ? "Premium" : "Free"}
              </Badge>
              {user.plan === "free" && (
                <span className="text-xs text-muted-foreground">
                  1 collection · 1 deck · Basic features
                </span>
              )}
            </div>
            {user.plan === "free" && (
              <Button size="sm" variant="outline" disabled>
                Upgrade (Coming soon)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Account
          </h2>

          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>

          {!confirmDelete ? (
            <Button
              variant="outline"
              className="w-full text-red-400 border-red-900/50 hover:bg-red-950/30"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete account
            </Button>
          ) : (
            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4 space-y-3">
              <p className="text-sm text-red-300">
                This will permanently delete your account, collections, and decks.
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
