"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { addToCollection } from "@/lib/actions/collection";
import { AuthGateModal } from "@/components/auth/auth-gate-modal";

interface AddToCollectionButtonProps {
  variantId: string;
  isLoggedIn: boolean;
}

const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"];

export function AddToCollectionButton({
  variantId,
  isLoggedIn,
}: AddToCollectionButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("NM");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAdd = async () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      await addToCollection({
        variantId,
        quantity,
        condition,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleAdd}
            disabled={loading}
          >
            {success ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Added!
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                {loading ? "Adding..." : "Add to collection"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/50 bg-card">
            <div className="w-16">
              <label className="text-[10px] text-muted-foreground">Qty</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="h-8 text-xs"
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] text-muted-foreground">
                Condition
              </label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[80px]">
              <label className="text-[10px] text-muted-foreground">
                Paid ($)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <AuthGateModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        feature="add cards to your collection"
      />
    </>
  );
}
