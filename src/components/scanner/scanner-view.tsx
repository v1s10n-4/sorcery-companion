"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  ArrowLeft, Camera, Layers, List, AlertTriangle,
  ChevronDown, X, DollarSign, Sparkles,
} from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useFrameStability } from "@/hooks/use-frame-stability";
import { CardGuideOverlay, SVG_W, SVG_H, CARD_W, CARD_H, type ScanPhase } from "./card-guide-overlay";
import { SetPicker, getStoredScanSet } from "./set-picker";
import { CardSetPicker } from "./card-set-picker";
import { ScanSessionSummary } from "./scan-session-summary";
import { CardImage } from "@/components/card-image";
import type {
  ScanResult, ScanSessionItem, ResolvedVariant,
} from "@/lib/actions/scan";

type Phase = ScanPhase;

// ── Crop helpers ───────────────────────────────────────────────────────────────

const CARD_X_RATIO = (SVG_W / 2 - CARD_W / 2) / SVG_W;
const CARD_Y_RATIO = (SVG_H / 2 - CARD_H / 2) / SVG_H;
const CARD_W_RATIO = CARD_W / SVG_W;
const CARD_H_RATIO = CARD_H / SVG_H;

function captureCardRegion(
  video: HTMLVideoElement,
  cropCanvas: HTMLCanvasElement,
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const viewportAspect = video.clientWidth / video.clientHeight;
  const videoAspect = vw / vh;

  let srcX: number, srcY: number, srcW: number, srcH: number;

  if (videoAspect > viewportAspect) {
    srcH = vh;
    srcW = vh * viewportAspect;
    srcX = (vw - srcW) / 2;
    srcY = 0;
  } else {
    srcW = vw;
    srcH = vw / viewportAspect;
    srcX = 0;
    srcY = (vh - srcH) / 2;
  }

  const cardSrcX = srcX + srcW * CARD_X_RATIO;
  const cardSrcY = srcY + srcH * CARD_Y_RATIO;
  const cardSrcW = srcW * CARD_W_RATIO;
  const cardSrcH = srcH * CARD_H_RATIO;

  const outW = Math.min(Math.round(cardSrcW), 512);
  const outH = Math.round(outW / (CARD_W / CARD_H));
  cropCanvas.width = outW;
  cropCanvas.height = outH;

  const ctx = cropCanvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, cardSrcX, cardSrcY, cardSrcW, cardSrcH, 0, 0, outW, outH);
  return cropCanvas.toDataURL("image/jpeg", 0.85);
}

// ── Format price ───────────────────────────────────────────────────────────────

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("idle");
  const [stabProgress, setStabProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Current result (shown in the result card at bottom)
  const [currentResult, setCurrentResult] = useState<{
    cardId: string;
    name: string;
    confidence: number;
    variant: ResolvedVariant;
  } | null>(null);

  // Track the cardId currently visible in viewport to prevent re-adding
  const currentCardIdRef = useRef<string | null>(null);

  // Auto-confirm timer for the result card
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmCountdown, setConfirmCountdown] = useState(0);

  // Session items — persisted to localStorage so a long session survives
  // reloads, navigation, and tab close
  const [sessionItems, setSessionItems, clearSession] =
    usePersistedState<ScanSessionItem[]>("sc-scan-session", []);
  const [showSummary, setShowSummary] = useState(false);

  // Set picker
  const [selectedSetSlug, setSelectedSetSlug] = useState<string | null>(null);
  const [showSetPicker, setShowSetPicker] = useState(false);

  // Foil toggle state
  const [hasFoil, setHasFoil] = useState(false);

  // Card-specific set picker (result card)
  const [showCardSetPicker, setShowCardSetPicker] = useState(false);

  // Suggestions (low-confidence candidates)
  const [suggestions, setSuggestions] = useState<
    { cardId: string; name: string; slug: string | null; confidence: number }[]
  >([]);
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedSetSlug(getStoredScanSet());
  }, []);

  // Camera
  const { ready, error: cameraError } = useCamera(videoRef, {
    onError: (err) => {
      if (err.kind === "permission-denied") setPhase("permission-denied");
    },
  });

  // ── Add to session ─────────────────────────────────────────────────────────

  const addToSession = useCallback(
    (cardId: string, name: string, variant: ResolvedVariant) => {
      setSessionItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.cardId === cardId && i.variantId === variant.variantId,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            cardId,
            variantId: variant.variantId,
            name,
            slug: variant.slug,
            setName: variant.setName,
            setSlug: variant.setSlug,
            finish: variant.finish,
            price: variant.price,
            quantity: 1,
          },
        ];
      });
    },
    [],
  );

  // ── Confirm current result (auto or manual) ───────────────────────────────

  const confirmResult = useCallback(() => {
    if (!currentResult) return;
    addToSession(currentResult.cardId, currentResult.name, currentResult.variant);
    currentCardIdRef.current = currentResult.cardId;
    // Stay in result phase — don't re-scan until card changes
  }, [currentResult, addToSession]);

  // ── Start auto-confirm countdown ──────────────────────────────────────────

  const startConfirmCountdown = useCallback(
    (seconds: number) => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmCountdown(seconds);

      // Countdown tick
      let remaining = seconds;
      const tick = () => {
        remaining--;
        if (remaining <= 0) {
          confirmResult();
          setConfirmCountdown(0);
          return;
        }
        setConfirmCountdown(remaining);
        confirmTimerRef.current = setTimeout(tick, 1000);
      };
      confirmTimerRef.current = setTimeout(tick, 1000);
    },
    [confirmResult],
  );

  // Cancel timers on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    };
  }, []);

  // ── Reject current result ─────────────────────────────────────────────────

  const rejectResult = useCallback(() => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setCurrentResult(null);
    currentCardIdRef.current = null;
    setConfirmCountdown(0);
    setPhase("idle");
  }, []);

  // ── Pick a suggestion (low confidence) ──────────────────────────────────

  const handleSuggestionPick = useCallback(
    async (cardId: string, name: string) => {
      // Cancel the auto-dismiss timer
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
      setSuggestions([]);

      // Resolve variant and show result card (same as high-confidence flow)
      const { resolveVariantForCard: resolve, hasFoilVariant: checkFoil } =
        await import("@/lib/actions/scan");
      const lockedSet = selectedSetSlugRef.current;
      const variant = await resolve(cardId, lockedSet);

      if (!variant || (lockedSet && variant.setSlug !== lockedSet)) {
        setPhase("no-detection");
        return;
      }

      const foilExists = await checkFoil(cardId, variant.setSlug);
      setHasFoil(foilExists);

      setCurrentResult({ cardId, name, confidence: 1, variant });
      currentCardIdRef.current = null;
      setPhase("result");

      // Start countdown
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmCountdown(5);
      let remaining = 5;
      const tick = () => {
        remaining--;
        if (remaining <= 0) {
          setConfirmCountdown(-1);
          return;
        }
        setConfirmCountdown(remaining);
        confirmTimerRef.current = setTimeout(tick, 1000);
      };
      confirmTimerRef.current = setTimeout(tick, 1000);
    },
    [],
  );

  // ── Toggle foil/standard on current result ──────────────────────────────

  const handleFoilToggle = useCallback(async () => {
    if (!currentResult) return;
    // Pause countdown while toggling
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmCountdown(0);

    const { toggleFinish } = await import("@/lib/actions/scan");
    const newVariant = await toggleFinish(
      currentResult.cardId,
      currentResult.variant.setSlug,
      currentResult.variant.finish,
    );
    if (newVariant) {
      setCurrentResult((prev) => (prev ? { ...prev, variant: newVariant } : null));
    }
    // Restart countdown
    startConfirmCountdown(5);
  }, [currentResult, startConfirmCountdown]);

  // ── Change set on current result (from card-specific set picker) ────────

  const handleResultSetChange = useCallback(
    async (setSlug: string) => {
      if (!currentResult) return;
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmCountdown(0);

      const { resolveVariantForCard, hasFoilVariant } = await import("@/lib/actions/scan");
      const isFoil = currentResult.variant.finish === "Foil";
      const newVariant = await resolveVariantForCard(
        currentResult.cardId,
        setSlug,
        isFoil,
      );
      if (newVariant) {
        setCurrentResult((prev) => (prev ? { ...prev, variant: newVariant } : null));
        const foilExists = await hasFoilVariant(currentResult.cardId, newVariant.setSlug);
        setHasFoil(foilExists);
      }
      startConfirmCountdown(5);
    },
    [currentResult, startConfirmCountdown],
  );

  // ── Frame stability handler ───────────────────────────────────────────────

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const selectedSetSlugRef = useRef(selectedSetSlug);
  selectedSetSlugRef.current = selectedSetSlug;

  const handleStable = useCallback(
    async (_captureFrame: () => string | null) => {
      if (phaseRef.current !== "idle" && phaseRef.current !== "stabilizing")
        return;

      setPhase("scanning");
      setStabProgress(1);

      const video = videoRef.current;
      const cropCanvas = cropCanvasRef.current;
      if (!video || !cropCanvas) {
        setPhase("idle");
        setStabProgress(0);
        return;
      }

      const frame = captureCardRegion(video, cropCanvas);
      if (!frame) {
        setPhase("idle");
        setStabProgress(0);
        return;
      }

      try {
        const { identifyCard, resolveVariantForCard } = await import(
          "@/lib/actions/scan"
        );
        const result = await identifyCard(frame);

        // Error
        if (result.error && !result.match) {
          setErrorMsg(result.error);
          setPhase("error");
          return;
        }

        // No detection
        if (result.noDetection || !result.match) {
          setPhase("no-detection");
          return;
        }

        const { match, candidates } = result;

        // Same card still in viewport — don't re-process
        if (match.cardId === currentCardIdRef.current) {
          setPhase("result");
          return;
        }

        // Below threshold — show suggestions if we have candidates
        if (match.confidence < CONF_HIGH) {
          // Build suggestion list: top match + other unique candidates
          const seen = new Set<string>();
          const suggs: typeof suggestions = [];
          for (const c of [match, ...candidates]) {
            if (!seen.has(c.cardId) && suggs.length < 3) {
              seen.add(c.cardId);
              suggs.push({
                cardId: c.cardId,
                name: c.name,
                slug: c.slug,
                confidence: c.confidence,
              });
            }
          }
          if (suggs.length > 0) {
            setSuggestions(suggs);
            setPhase("suggestions");
            // Auto-dismiss + re-scan after 5s
            if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
            suggestionsTimerRef.current = setTimeout(() => {
              setSuggestions([]);
              setPhase("idle");
              // resetStability will be called by the stability hook
              // when phase goes back to idle and active becomes true
            }, 5000);
          } else {
            setPhase("no-detection");
          }
          return;
        }

        // High confidence — resolve and show result card
        const { resolveVariantForCard: resolve, hasFoilVariant: checkFoil } =
          await import("@/lib/actions/scan");
        const lockedSet = selectedSetSlugRef.current;
        const variant = await resolve(match.cardId, lockedSet);

        // If a set is locked and the card doesn't exist in that set, skip it
        if (!variant || (lockedSet && variant.setSlug !== lockedSet)) {
          setPhase("no-detection");
          return;
        }

        // Check if foil exists for this card in this set
        const foilExists = await checkFoil(match.cardId, variant.setSlug);
        setHasFoil(foilExists);

        // Show result card
        setCurrentResult({
          cardId: match.cardId,
          name: match.name,
          confidence: match.confidence,
          variant,
        });
        currentCardIdRef.current = null; // Not yet confirmed
        setPhase("result");

        // Start 5-second auto-confirm countdown
        // (can't call startConfirmCountdown here because of stale closure,
        //  so we do it inline)
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        setConfirmCountdown(5);
        let remaining = 5;
        const tick = () => {
          remaining--;
          if (remaining <= 0) {
            // Auto-confirm: we need to read the latest currentResult
            // This is handled by the confirmResult effect below
            setConfirmCountdown(-1); // signal auto-confirm
            return;
          }
          setConfirmCountdown(remaining);
          confirmTimerRef.current = setTimeout(tick, 1000);
        };
        confirmTimerRef.current = setTimeout(tick, 1000);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Scan failed");
        setPhase("error");
      }
    },
    [],
  );

  // Auto-confirm when countdown reaches -1 (signal)
  useEffect(() => {
    if (confirmCountdown === -1 && currentResult) {
      addToSession(currentResult.cardId, currentResult.name, currentResult.variant);
      currentCardIdRef.current = currentResult.cardId;
      setConfirmCountdown(0);
    }
  }, [confirmCountdown, currentResult, addToSession]);

  const handleMotion = useCallback(() => {
    if (phaseRef.current === "stabilizing") {
      setPhase("idle");
      setStabProgress(0);
    }
    // If we're in result phase and card moves away, go back to scanning
    if (phaseRef.current === "result" && currentCardIdRef.current) {
      // Card was confirmed and now removed — reset for next card
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setCurrentResult(null);
      currentCardIdRef.current = null;
      setConfirmCountdown(0);
      setPhase("idle");
    }
  }, []);

  // Stability detection active when idle, stabilizing, or result (to detect card swap)
  const stabilityActive =
    ready && (phase === "idle" || phase === "stabilizing" || phase === "result" || phase === "suggestions");

  const { resetStability } = useFrameStability(videoRef, canvasRef, {
    onStable: handleStable,
    onMotion: handleMotion,
    active: stabilityActive,
    holdMs: 350,
  });

  // ── Return to idle ────────────────────────────────────────────────────────

  const returnToIdle = useCallback(() => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setPhase("idle");
    setStabProgress(0);
    setErrorMsg(null);
    setConfirmCountdown(0);
    setSuggestions([]);
    resetStability();
  }, [resetStability]);

  // Dismiss suggestions manually
  const dismissSuggestions = useCallback(() => {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setSuggestions([]);
    setPhase("idle");
    resetStability();
  }, [resetStability]);

  // Auto-dismiss transient phases
  useEffect(() => {
    if (phase === "error") {
      const t = setTimeout(returnToIdle, 2500);
      return () => clearTimeout(t);
    }
    if (phase === "no-detection") {
      const t = setTimeout(returnToIdle, 2000);
      return () => clearTimeout(t);
    }
  }, [phase, returnToIdle]);

  // ── Session actions ───────────────────────────────────────────────────────

  const handleCommit = useCallback(() => {
    clearSession();
    setShowSummary(false);
    returnToIdle();
  }, [clearSession, returnToIdle]);

  const handleDiscard = useCallback(() => {
    clearSession();
    returnToIdle();
  }, [clearSession, returnToIdle]);

  const handleExit = useCallback(() => {
    if (sessionItems.length > 0) {
      setShowSummary(true);
    } else {
      router.back();
    }
  }, [sessionItems.length, router]);

  // ── Manual confirm (tap the confirm button) ───────────────────────────────

  const handleManualConfirm = useCallback(() => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmCountdown(0);
    if (currentResult) {
      addToSession(currentResult.cardId, currentResult.name, currentResult.variant);
      currentCardIdRef.current = currentResult.cardId;
    }
  }, [currentResult, addToSession]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isConfirmed = currentResult && currentCardIdRef.current === currentResult.cardId;
  const totalScanned = sessionItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={cropCanvasRef} className="hidden" />

      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm cursor-pointer min-h-[44px] min-w-[44px] justify-center"
          aria-label="Exit scanner"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSetPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/20 text-xs transition-colors cursor-pointer min-h-[36px]"
          >
            <Layers className="h-3.5 w-3.5" />
            {selectedSetSlug ?? "Any set"}
          </button>

          {totalScanned > 0 && (
            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-sm text-amber-200 text-xs font-medium cursor-pointer min-h-[36px] hover:bg-amber-500/30 transition-colors"
            >
              <List className="h-3.5 w-3.5" />
              {totalScanned}
            </button>
          )}
        </div>
      </div>

      {/* ── Camera feed ── */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        <CardGuideOverlay phase={phase} progress={stabProgress} />

        {/* Status text */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
          {phase === "idle" && ready && !currentResult && (
            <span className="text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Hold a card steady in the frame
            </span>
          )}
          {phase === "scanning" && (
            <span className="text-blue-300 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
              Identifying…
            </span>
          )}
          {phase === "no-detection" && (
            <span className="text-white/70 text-xs bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Card not detected — try repositioning
            </span>
          )}
          {phase === "error" && (
            <span className="flex items-center gap-1.5 text-red-300 text-xs bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMsg ?? "Error"}
            </span>
          )}
          {phase === "permission-denied" && (
            <div className="text-center px-6">
              <Camera className="h-10 w-10 text-white/40 mx-auto mb-3" />
              <p className="text-white/80 text-sm font-medium">Camera access required</p>
              <p className="text-white/50 text-xs mt-1">
                Allow camera access in your browser settings to scan cards.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Result card (bottom sheet style) ── */}
      {phase === "result" && currentResult && (
        <div className="absolute bottom-0 left-0 right-0 z-30 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="mx-3 mb-3 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-stretch gap-3 p-3">
              {/* Card thumbnail */}
              {currentResult.variant.slug ? (
                <CardImage
                  slug={currentResult.variant.slug}
                  name={currentResult.name}
                  width={60}
                  height={84}
                  className="rounded-lg shrink-0"
                />
              ) : (
                <div className="w-[60px] h-[84px] rounded-lg bg-muted/30 shrink-0" />
              )}

              {/* Info column */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <p className="text-sm font-bold truncate leading-tight font-serif text-amber-100">
                    {currentResult.name}
                  </p>

                  {/* Set (tappable — shows only sets this card exists in) + foil toggle */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() => {
                        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                        setConfirmCountdown(0);
                        setShowCardSetPicker(true);
                      }}
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <span className="truncate max-w-[120px]">
                        {currentResult.variant.setName}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </button>

                    {hasFoil && (
                      <button
                        onClick={handleFoilToggle}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                          currentResult.variant.finish === "Foil"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                        aria-label="Toggle foil"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Foil
                      </button>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center gap-1 mt-1.5">
                  <DollarSign className="h-3 w-3 text-green-400" />
                  <span className="text-xs font-semibold text-green-400 tabular-nums">
                    {formatPrice(currentResult.variant.price)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-center justify-between shrink-0">
                {!isConfirmed ? (
                  <>
                    {/* Confirm button with countdown */}
                    <button
                      onClick={handleManualConfirm}
                      className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer"
                      aria-label="Add to collection"
                    >
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeDasharray={Math.PI * 40}
                          strokeDashoffset={Math.PI * 40 * (1 - confirmCountdown / 5)}
                          opacity={0.3}
                          className="transition-all duration-1000 linear"
                        />
                      </svg>
                      <span className="text-lg font-bold">+</span>
                    </button>

                    {/* Reject button */}
                    <button
                      onClick={rejectResult}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      aria-label="Skip this card"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/15 border border-green-500/20">
                    <span className="text-green-400 text-xs font-semibold">✓</span>
                  </div>
                )}
              </div>
            </div>

            {/* Confidence bar (subtle) */}
            <div className="h-0.5 bg-muted/20">
              <div
                className={`h-full transition-all duration-300 ${
                  currentResult.confidence >= 0.7
                    ? "bg-green-500/60"
                    : currentResult.confidence >= 0.45
                    ? "bg-amber-500/60"
                    : "bg-red-500/60"
                }`}
                style={{ width: `${Math.round(currentResult.confidence * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Suggestions strip (low confidence) ── */}
      {phase === "suggestions" && suggestions.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center animate-in slide-in-from-bottom-4 fade-in duration-200 mb-6">
          {/* Suggestion cards */}
          <div className="flex gap-2 px-3">
            {suggestions.map((s) => {
              const pct = Math.round(s.confidence * 100);
              const color =
                s.confidence >= 0.6 ? "text-green-400 stroke-green-400"
                : s.confidence >= 0.4 ? "text-amber-400 stroke-amber-400"
                : "text-red-400 stroke-red-400";
              const circumference = Math.PI * 28; // r=14
              const offset = circumference * (1 - s.confidence);

              return (
                <button
                  key={s.cardId}
                  onClick={() => handleSuggestionPick(s.cardId, s.name)}
                  className="relative bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-1.5 hover:bg-card active:scale-95 transition-all cursor-pointer"
                >
                  {s.slug ? (
                    <CardImage
                      slug={s.slug}
                      name={s.name}
                      width={64}
                      height={89}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-[89px] rounded-lg bg-muted/30" />
                  )}
                  {/* Confidence ring */}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
                      <circle
                        cx="16" cy="16" r="14"
                        fill="none" strokeWidth="2"
                        className="stroke-white/10"
                      />
                      <circle
                        cx="16" cy="16" r="14"
                        fill="none" strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={color.split(" ")[1]}
                      />
                    </svg>
                    <span className={`text-[8px] font-bold tabular-nums ${color.split(" ")[0]}`}>
                      {pct}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dismiss FAB */}
          <button
            onClick={dismissSuggestions}
            className="mt-3 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shadow-lg"
            aria-label="Dismiss suggestions"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── Set locker (session-wide, all sets) ── */}
      <SetPicker
        open={showSetPicker}
        onOpenChange={setShowSetPicker}
        selectedSetSlug={selectedSetSlug}
        onSelect={setSelectedSetSlug}
      />

      {/* ── Card-specific set picker (only sets this card exists in) ── */}
      <CardSetPicker
        open={showCardSetPicker}
        onOpenChange={(v) => {
          setShowCardSetPicker(v);
          if (!v && currentResult && !currentCardIdRef.current) {
            // Picker closed without picking — restart countdown
            startConfirmCountdown(5);
          }
        }}
        cardId={currentResult?.cardId ?? null}
        cardName={currentResult?.name}
        selectedSetSlug={currentResult?.variant.setSlug ?? null}
        onSelect={handleResultSetChange}
      />

      {/* ── Session summary ── */}
      <ScanSessionSummary
        open={showSummary}
        items={sessionItems}
        onUpdateItem={(idx, updates) => {
          setSessionItems((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updates };
            return next;
          });
        }}
        onRemoveItem={(idx) => {
          setSessionItems((prev) => prev.filter((_, i) => i !== idx));
        }}
        onCommit={handleCommit}
        onDiscard={handleDiscard}
        onClose={() => setShowSummary(false)}
      />
    </div>
  );
}

// Confidence thresholds
const CONF_HIGH = 0.7;
