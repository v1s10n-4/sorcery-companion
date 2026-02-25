"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type CameraError =
  | { kind: "permission-denied" }
  | { kind: "not-supported" }
  | { kind: "not-found" }
  | { kind: "unknown"; message: string };

interface UseCameraOptions {
  /** Called once the stream is attached and video is playing */
  onReady?: () => void;
  onError?: (err: CameraError) => void;
}

export function useCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseCameraOptions = {}
) {
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const err: CameraError = { kind: "not-supported" };
      setError(err);
      optionsRef.current.onError?.(err);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true"); // iOS Safari requirement
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = () => reject(new Error("Video element error"));
      });

      setReady(true);
      setError(null);
      optionsRef.current.onReady?.();
    } catch (e) {
      let cameraError: CameraError;
      if (e instanceof DOMException) {
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          cameraError = { kind: "permission-denied" };
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          cameraError = { kind: "not-found" };
        } else {
          cameraError = { kind: "unknown", message: e.message };
        }
      } else {
        cameraError = { kind: "unknown", message: String(e) };
      }
      setError(cameraError);
      optionsRef.current.onError?.(cameraError);
    }
  }, [videoRef]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  }, [videoRef]);

  // Auto-start on mount, auto-stop on unmount
  useEffect(() => {
    start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [start]);

  return { ready, error, start, stop };
}
