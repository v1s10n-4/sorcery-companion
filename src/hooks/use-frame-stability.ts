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
  const prevDataRef = useRef<Uint8ClampedArray | null>(null);
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
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !activeRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
      const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);

      if (prevDataRef.current) {
        const prev = prevDataRef.current;
        let totalDiff = 0;
        const pixelCount = sampleWidth * sampleHeight;
        // Compare only every 4th pixel (RGBA stride = 4) for speed
        for (let i = 0; i < prev.length; i += 4) {
          totalDiff +=
            Math.abs(data[i] - prev[i]) +
            Math.abs(data[i + 1] - prev[i + 1]) +
            Math.abs(data[i + 2] - prev[i + 2]);
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

      prevDataRef.current = new Uint8ClampedArray(data);
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
      prevDataRef.current = null;
    }
  }, [active]);

  return { resetStability, captureFrame };
}
