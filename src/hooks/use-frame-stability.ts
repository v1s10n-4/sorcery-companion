"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseFrameStabilityOptions {
  /**
   * Milliseconds of stillness required before firing onStable.
   * Default: 350ms
   */
  holdMs?: number;
  /**
   * Mean-absolute-diff threshold (per pixel, 0-255).
   * Lower = more sensitive to movement.
   * Default: 8
   */
  diffThreshold?: number;
  /** Down-sample width for comparison (keeps CPU low). Default: 80 */
  sampleWidth?: number;
  /** Down-sample height for comparison. Default: 60 */
  sampleHeight?: number;
  /** Called when the frame has been stable for holdMs. Provides a capture fn. */
  onStable: (captureFrame: () => string | null) => void;
  /** Called when motion is detected after stability */
  onMotion?: () => void;
  /** Whether to actively compare frames (pause when false) */
  active?: boolean;
}

/**
 * Compares consecutive video frames. When the scene is still for `holdMs`,
 * fires `onStable` with a function to capture the current frame as a JPEG base64 string.
 *
 * Performance notes:
 * - Canvas dimensions are set once per effect run, not every RAF tick.
 * - The 2D context is cached — getContext() is not called per frame.
 * - Two Uint8ClampedArray pixel buffers are pre-allocated and swapped each
 *   frame, eliminating per-frame heap allocation and GC pressure.
 */
export function useFrameStability(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseFrameStabilityOptions
) {
  const {
    holdMs = 350,
    diffThreshold = 8,
    sampleWidth = 80,
    sampleHeight = 60,
    onStable,
    onMotion,
    active = true,
  } = options;

  const rafRef = useRef<number | null>(null);
  const stableStartRef = useRef<number | null>(null);
  const firedRef = useRef(false); // prevent re-firing until reset
  const activeRef = useRef(active);
  const callbacksRef = useRef({ onStable, onMotion });

  activeRef.current = active;
  callbacksRef.current = { onStable, onMotion };

  /** Capture the current video frame as a full-res JPEG base64 string */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const cvs = document.createElement("canvas");
    cvs.width = video.videoWidth;
    cvs.height = video.videoHeight;
    const ctx = cvs.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    // Return as base64 JPEG (strip data: prefix)
    return cvs.toDataURL("image/jpeg", 0.85).split(",")[1] ?? null;
  }, [videoRef]);

  const resetStability = useCallback(() => {
    stableStartRef.current = null;
    firedRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── One-time setup: resize canvas and cache the 2D context ──────────────
    // Setting canvas.width/height clears the canvas and can trigger a layout
    // recalc. Do it once here, not inside the RAF loop.
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // ── Pre-allocate two pixel buffers to avoid per-frame heap allocation ───
    // We swap them each frame instead of creating a new Uint8ClampedArray.
    const bufLen = sampleWidth * sampleHeight * 4; // RGBA
    const pixelCount = sampleWidth * sampleHeight;
    let prevBuf = new Uint8ClampedArray(bufLen);
    let currBuf = new Uint8ClampedArray(bufLen);
    let hasPrev = false;

    // ── RAF loop ─────────────────────────────────────────────────────────────
    const loop = () => {
      const video = videoRef.current;

      if (!video || video.readyState < 2 || !activeRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Draw the downsampled frame — canvas is already the right size
      ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

      // Copy pixel data into currBuf (no allocation — reuses the buffer)
      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      currBuf.set(imageData.data);

      if (hasPrev) {
        let totalDiff = 0;
        // Compare only RGB channels (skip alpha), step 4 bytes per pixel
        for (let i = 0; i < bufLen; i += 4) {
          totalDiff +=
            Math.abs(currBuf[i]     - prevBuf[i]) +
            Math.abs(currBuf[i + 1] - prevBuf[i + 1]) +
            Math.abs(currBuf[i + 2] - prevBuf[i + 2]);
        }
        const meanDiff = totalDiff / (pixelCount * 3);

        if (meanDiff < diffThreshold) {
          // Scene is still
          if (stableStartRef.current === null) {
            stableStartRef.current = performance.now();
          } else if (
            !firedRef.current &&
            performance.now() - stableStartRef.current >= holdMs
          ) {
            firedRef.current = true;
            callbacksRef.current.onStable(captureFrame);
          }
        } else {
          // Motion detected
          if (stableStartRef.current !== null || firedRef.current) {
            callbacksRef.current.onMotion?.();
          }
          stableStartRef.current = null;
          firedRef.current = false;
        }
      }

      // Swap buffers: prevBuf ↔ currBuf (zero allocation)
      const tmp = prevBuf;
      prevBuf = currBuf;
      currBuf = tmp;
      hasPrev = true;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef, canvasRef, holdMs, diffThreshold, sampleWidth, sampleHeight, captureFrame]);

  // When deactivated, reset stability tracking
  useEffect(() => {
    if (!active) {
      stableStartRef.current = null;
      firedRef.current = false;
    }
  }, [active]);

  return { resetStability, captureFrame };
}
