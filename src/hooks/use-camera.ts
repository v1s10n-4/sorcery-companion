"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type CameraError =
  | { kind: "permission-denied" }
  | { kind: "not-supported" }
  | { kind: "not-found" }
  | { kind: "unknown"; message: string };

export interface CameraDevice {
  deviceId: string;
  label: string;
}

interface UseCameraOptions {
  onReady?: () => void;
  onError?: (err: CameraError) => void;
}

export function useCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseCameraOptions = {},
) {
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ── Enumerate video input devices ────────────────────────────────────────

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  // ── Start a specific camera (or default) ─────────────────────────────────

  const startCamera = useCallback(
    async (deviceId?: string) => {
      if (!videoRef.current) return;
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        const err: CameraError = { kind: "not-supported" };
        setError(err);
        optionsRef.current.onError?.(err);
        return;
      }

      // Stop existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = () => reject(new Error("Video element error"));
        });

        // Track which device is active
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        setActiveDeviceId(settings?.deviceId ?? deviceId ?? null);

        setReady(true);
        setError(null);
        optionsRef.current.onReady?.();

        // Refresh device list (labels may now be available after permission grant)
        await refreshDevices();
      } catch (e) {
        let cameraError: CameraError;
        if (e instanceof DOMException) {
          if (
            e.name === "NotAllowedError" ||
            e.name === "PermissionDeniedError"
          ) {
            cameraError = { kind: "permission-denied" };
          } else if (
            e.name === "NotFoundError" ||
            e.name === "DevicesNotFoundError"
          ) {
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
    },
    [videoRef, refreshDevices],
  );

  // ── Switch to a different camera ─────────────────────────────────────────

  const switchCamera = useCallback(
    async (deviceId: string) => {
      await startCamera(deviceId);
    },
    [startCamera],
  );

  // ── Stop ─────────────────────────────────────────────────────────────────

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
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  return {
    ready,
    error,
    devices,
    activeDeviceId,
    switchCamera,
    start: startCamera,
    stop,
  };
}
