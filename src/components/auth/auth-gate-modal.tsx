"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  BarChart3,
  Share2,
  TrendingUp,
  X,
} from "lucide-react";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const FEATURES = [
  {
    icon: BookOpen,
    title: "Track Your Collection",
    description: "Add cards with quantity, condition, and purchase price",
  },
  {
    icon: TrendingUp,
    title: "Portfolio & ROI",
    description: "See your collection value and investment returns",
  },
  {
    icon: BarChart3,
    title: "Deck Builder",
    description: "Build and analyze decks on the 5×4 grid",
  },
  {
    icon: Share2,
    title: "Share & Export",
    description: "Public collection links and CSV/decklist export",
  },
];

export function AuthGateModal({ open, onClose, feature }: AuthGateModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-serif text-amber-100 mb-2">
            Unlock Your Spellbook
          </h2>
          <p className="text-sm text-muted-foreground">
            {feature
              ? `Sign in to ${feature}`
              : "Create a free account to access all features"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border/50 p-3 text-center"
            >
              <f.icon className="h-5 w-5 mx-auto mb-1.5 text-amber-400" />
              <p className="text-xs font-medium mb-0.5">{f.title}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => router.push("/signup")}
          >
            Create free account
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 mt-4">
          Free accounts get collection tracking, 1 deck, and market prices.
          <br />
          Premium unlocks unlimited decks, ROI tracking, and exports.
        </p>
      </div>
    </div>
  );
}
