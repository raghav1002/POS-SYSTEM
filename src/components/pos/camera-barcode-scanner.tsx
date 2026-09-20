"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function CameraBarcodeScanner({ open, onOpenChange, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const scanningRef = useRef(false);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  const stopCamera = useCallback(() => {
    scanningRef.current = false;

    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleDecodedBarcode = useCallback(
    (rawValue: string) => {
      const clean = (rawValue || "").trim();
      if (!clean) return;

      const now = Date.now();
      // Deduplicate scans emitted across fast video frames within 1500ms
      if (lastScannedCodeRef.current.code === clean && now - lastScannedCodeRef.current.time < 1500) {
        return;
      }

      lastScannedCodeRef.current = { code: clean, time: now };
      scanningRef.current = false;
      stopCamera();
      onScan(clean);
      onOpenChange(false);
      toast.success(`Scanned: ${clean}`);
    },
    [stopCamera, onScan, onOpenChange]
  );

  const startCamera = useCallback(async () => {
    setCameraError("");
    setIsInitializing(true);

    // 1. Secure context check
    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setHasCamera(false);
      setIsInitializing(false);
      setCameraError(
        "Camera requires HTTPS or localhost. If testing on mobile LAN, use HTTPS or enter code manually below."
      );
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setIsInitializing(false);
        setCameraError("Camera API not supported on this browser.");
        return;
      }

      // Request rear/environment camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      scanningRef.current = true;
      setHasCamera(true);
      setIsInitializing(false);

      // Initialize ZXing MultiFormat Decoder for robust multi-format retail support (EAN-13, EAN-8, UPC-A, Code128, Code39, QR)
      const codeReader = new BrowserMultiFormatReader();
      if (videoRef.current) {
        const controls = await codeReader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && scanningRef.current) {
            handleDecodedBarcode(result.getText());
          }
        });
        zxingControlsRef.current = controls;
      }
    } catch (err: unknown) {
      console.warn("Camera access error:", err);
      setHasCamera(false);
      setIsInitializing(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission")) {
        setCameraError("Camera permission denied. Please grant permission in browser settings or type code below.");
      } else {
        setCameraError("Unable to access camera. Enter code manually below.");
      }
    }
  }, [handleDecodedBarcode]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    stopCamera();
    handleDecodedBarcode(manualCode.trim());
    setManualCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Camera className="h-5 w-5 text-[#E85002]" />
            Barcode Camera Scanner
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Point phone camera at retail barcode (EAN-13, UPC, Code 128) or enter code manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Viewport */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 flex items-center justify-center">
            {isInitializing ? (
              <div className="p-4 text-center text-zinc-400 space-y-2">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#E85002]" />
                <p className="text-xs">Initializing camera feed...</p>
              </div>
            ) : hasCamera ? (
              <>
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                {/* Visual Laser Scanner Overlay & Guide Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-44 w-64 rounded-lg border-2 border-dashed border-[#E85002]/80">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-zinc-400 space-y-2 max-w-xs mx-auto">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="text-xs leading-relaxed">{cameraError || "Camera not active."}</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={startCamera}>
                  <RefreshCw className="mr-1 h-3 w-3" /> Retry Camera
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Center barcode within reticle. Works with standard 890... EAN-13, Code 128 & UPC labels.
          </p>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Input
              placeholder="Or enter barcode manually..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 text-sm font-mono"
            />
            <Button type="submit" variant="brandGradient" className="shrink-0">
              Submit
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
