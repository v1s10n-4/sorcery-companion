"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Layers, List, AlertTriangle } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useFrameStability } from "@/hooks/use-frame-stability";
import { CardGuideOverlay } from "./card-guide-overlay";
import { CardResultToast } from "./card-result-toast";
import { CandidatePicker } from "./candidate-picker";
import { SetPicker, getStoredScanSet } from "./set-picker";
import { ScanSessionSummary } from "./scan-session-summary";
import type { ScanCandidate, ScanSessionItem } from "@/lib/actions/scan";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase =
  | "idle"
  | "stabilizing"
  | "scanning"
  | "matched"
  | "candidates"
  | "error"
  | "permission-denied";

const CONFIDENCE_THRESHOLD = 0.85;

// ── Component ──────────────────────────────────────────────────────────────────

export function ScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State machine
  const [phase, setPhase] = useState<Phase>("idle");
  const [stabProgress, setStabProgress] = useState(0);
  const stabStartRef = useRef<number | null>(null);

  // Scan results
  const [currentCandidates, setCurrentCandidates] = useState<ScanCandidate[]>([]);
  const [toastData, setToastData] = useState<{
    name: string;
    slug: string | null;
    setName?: string;
    itemIndex: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Session
  const [sessionItems, setSessionItems] = useState<ScanSessionItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // Set picker
  const [selectedSetSlug, setSelectedSetSlug] = useState<string | null>(null);
  const [showSetPicker, setShowSetPicker] = useState(false);

  // Restore set from sessionStorage
  useEffect(() => {
    setSelectedSetSlug(getStoredScanSet());
  }, []);

  // Camera
  const { ready, error: cameraError } = useCamera(videoRef, {
    onError: (err) => {
      if (err.kind === "permission-denied") setPhase("permission-denied");
    },
  });

  // ── Frame stability ─────────────────────────────────────────────────────────

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const selectedSetSlugRef = useRef(selectedSetSlug);
  selectedSetSlugRef.current = selectedSetSlug;

  const handleStable = useCallback(
    async (captureFrame: () => string | null) => {
      if (phaseRef.current !== "idle" && phaseRef.current !== "stabilizing")
        return;

      setPhase("scanning");
      setStabProgress(1);

      const frame = captureFrame();
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

        if (result.error) {
          setErrorMsg(result.error);
          setPhase("error");
          return;
        }

        if (
          result.match &&
          result.match.confidence >= CONFIDENCE_THRESHOLD
        ) {
          // ── High confidence → auto-add ──
          const variant = await resolveVariantForCard(
            result.match.cardId,
            selectedSetSlugRef.current
          );
          if (!variant) {
            setErrorMsg("Could not resolve card variant");
            setPhase("error");
            return;
          }

          // Check if card already in session → bump qty
          setSessionItems((prev) => {
            const idx = prev.findIndex(
              (i) =>
                i.cardId === result.match!.cardId &&
                i.variantId === variant.variantId
            );
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
              setToastData({
                name: result.match!.name,
                slug: variant.slug,
                setName: variant.setName,
                itemIndex: idx,
              });
              return next;
            }
            const newItem: ScanSessionItem = {
              cardId: result.match!.cardId,
              variantId: variant.variantId,
              name: result.match!.name,
              slug: variant.slug,
              quantity: 1,
            };
            setToastData({
              name: result.match!.name,
              slug: variant.slug,
              setName: variant.setName,
              itemIndex: prev.length,
            });
            return [...prev, newItem];
          });

          setPhase("matched");
        } else if (result.candidates.length > 0) {
          // ── Low confidence → show candidates ──
          setCurrentCandidates(result.candidates.slice(0, 3));
          setPhase("candidates");
        } else {
          setErrorMsg("Card not recognized");
          setPhase("error");
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Scan failed");
        setPhase("error");
      }
    },
    []
  );

  const handleMotion = useCallback(() => {
    if (phaseRef.current === "stabilizing") {
      setPhase("idle");
      setStabProgress(0);
      stabStartRef.current = null;
    }
  }, []);

  // Only run stability detection when idle or stabilizing
  const stabilityActive =
    ready && (phase === "idle" || phase === "stabilizing");

  const { resetStability } = useFrameStability(videoRef, canvasRef, {
    onStable: handleStable,
    onMotion: handleMotion,
    active: stabilityActive,
    holdMs: 350,
  });

  // Track stabilizing progress with animation frame
  useEffect(() => {
    if (phase !== "idle" || !ready) return;

    // When stability hook detects stillness, it will fire handleStable.
    // To show the progress ring, we track time since last motion via a
    // separate rAF loop that reads the internal state.
    let raf: number;
    let start: number | null = null;

    const tick = () => {
      // This is a simplified approach — the real stability is tracked in
      // the hook. Here we just animate the ring on a timer after idle starts.
      // The hook will reset us on motion or fire onStable at 350ms.
      if (start === null) start = performance.now();
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / 350, 1);

      // Only show stabilizing UI if we've been still for at least 50ms
      if (progress > 0.15) {
        setPhase("stabilizing");
        setStabProgress(progress);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    // Don't start immediately — wait for stability hook to signal
    // Actually, we can't easily bridge these. Let's keep it simple:
    // the ring fills over 350ms, and the hook fires at 350ms.
    // If there's motion, handleMotion resets us.

    return () => cancelAnimationFrame(raf);
  }, [phase, ready]);

  // ── Auto-return to idle after matched toast ─────────────────────────────────

  const returnToIdle = useCallback(() => {
    setPhase("idle");
    setStabProgress(0);
    setToastData(null);
    setCurrentCandidates([]);
    setErrorMsg(null);
    resetStability();
  }, [resetStability]);

  // ── Candidate pick ──────────────────────────────────────────────────────────

  const handleCandidatePick = useCallback(
    async (candidate: ScanCandidate) => {
      const { resolveVariantForCard } = await import("@/lib/actions/scan");
      const variant = await resolveVariantForCard(
        candidate.cardId,
        selectedSetSlugRef.current
      );
      if (!variant) {
        returnToIdle();
        return;
      }

      setSessionItems((prev) => {
        const idx = prev.findIndex(
          (i) =>
            i.cardId === candidate.cardId &&
            i.variantId === variant.variantId
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          setToastData({
            name: candidate.name,
            slug: variant.slug,
            setName: variant.setName,
            itemIndex: idx,
          });
          return next;
        }
        const newItem: ScanSessionItem = {
          cardId: candidate.cardId,
          variantId: variant.variantId,
          name: candidate.name,
          slug: variant.slug,
          quantity: 1,
        };
        setToastData({
          name: candidate.name,
          slug: variant.slug,
          setName: variant.setName,
          itemIndex: prev.length,
        });
        return [...prev, newItem];
      });

      setPhase("matched");
    },
    [returnToIdle]
  );

  // ── Undo last add ──────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (toastData === null) return;
    setSessionItems((prev) => {
      const next = [...prev];
      const item = next[toastData.itemIndex];
      if (!item) return next;
      if (item.quantity <= 1) {
        next.splice(toastData.itemIndex, 1);
      } else {
        next[toastData.itemIndex] = { ...item, quantity: item.quantity - 1 };
      }
      return next;
    });
    returnToIdle();
  }, [toastData, returnToIdle]);

  // ── Commit / discard ────────────────────────────────────────────────────────

  const handleCommit = useCallback(() => {
    // commitScanSession is called inside the summary sheet
    setSessionItems([]);
    setShowSummary(false);
    returnToIdle();
  }, [returnToIdle]);

  const handleDiscard = useCallback(() => {
    setSessionItems([]);
    returnToIdle();
  }, [returnToIdle]);

  const handleExit = useCallback(() => {
    if (sessionItems.length > 0) {
      setShowSummary(true);
    } else {
      router.back();
    }
  }, [sessionItems.length, router]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for frame comparison */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm cursor-pointer min-h-[44px] min-w-[44px] justify-center"
          aria-label="Exit scanner"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Set picker button */}
          <button
            onClick={() => setShowSetPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/20 text-xs transition-colors cursor-pointer min-h-[36px]"
          >
            <Layers className="h-3.5 w-3.5" />
            {selectedSetSlug ?? "Any set"}
          </button>

          {/* Session count */}
          {sessionItems.length > 0 && (
            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-sm text-amber-200 text-xs font-medium cursor-pointer min-h-[36px] hover:bg-amber-500/30 transition-colors"
            >
              <List className="h-3.5 w-3.5" />
              {sessionItems.reduce((s, i) => s + i.quantity, 0)}
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

        {/* Guide overlay */}
        <CardGuideOverlay phase={phase} progress={stabProgress} />

        {/* Status text (bottom of viewfinder) */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10">
          {phase === "idle" && ready && (
            <span className="text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Hold a card steady in the frame
            </span>
          )}
          {phase === "scanning" && (
            <span className="text-blue-300 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
              Identifying…
            </span>
          )}
          {phase === "error" && (
            <button
              onClick={returnToIdle}
              className="flex items-center gap-1.5 text-red-300 text-xs bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMsg ?? "Error"} — tap to retry
            </button>
          )}
          {phase === "permission-denied" && (
            <div className="text-center px-6">
              <Camera className="h-10 w-10 text-white/40 mx-auto mb-3" />
              <p className="text-white/80 text-sm font-medium">
                Camera access required
              </p>
              <p className="text-white/50 text-xs mt-1">
                Allow camera access in your browser settings to scan cards.
              </p>
            </div>
          )}
        </div>

        {/* Toast (top-center, non-blocking) */}
        {phase === "matched" && toastData && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
            <CardResultToast
              name={toastData.name}
              slug={toastData.slug}
              setName={toastData.setName}
              onDismiss={returnToIdle}
              onUndo={handleUndo}
            />
          </div>
        )}
      </div>

      {/* ── Candidate picker (bottom sheet, non-blocking) ── */}
      <CandidatePicker
        candidates={currentCandidates}
        open={phase === "candidates"}
        onPick={handleCandidatePick}
        onSkip={returnToIdle}
      />

      {/* ── Set picker ── */}
      <SetPicker
        open={showSetPicker}
        onOpenChange={setShowSetPicker}
        selectedSetSlug={selectedSetSlug}
        onSelect={setSelectedSetSlug}
      />

      {/* ── Session summary ── */}
      <ScanSessionSummary
        open={showSummary}
        items={sessionItems}
        onCommit={handleCommit}
        onDiscard={handleDiscard}
        onClose={() => setShowSummary(false)}
      />
    </div>
  );
}
