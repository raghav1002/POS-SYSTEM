"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  const [cameraError, setCameraError] = useState("");
  const [scannerStatus, setScannerStatus] = useState<"initializing" | "ready" | "detected" | "error">("initializing");
  
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
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore track stop errors
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
      setScannerStatus("detected");
      
      stopCamera();
      onScan(clean);
      onOpenChange(false);
      toast.success(`Scanned: ${clean}`);
    },
    [stopCamera, onScan, onOpenChange]
  );

  const startCamera = useCallback(async () => {
    setCameraError("");
    setScannerStatus("initializing");

    // 1. Secure Context Check (Browsers block camera on plain HTTP LAN IPs)
    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setScannerStatus("error");
      setCameraError(
        "Camera access requires HTTPS or localhost. If testing on mobile, access via your secure HTTPS domain or enter barcode manually below."
      );
      return;
    }

    // 2. Browser API support check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerStatus("error");
      setCameraError("Camera API is not supported on this browser.");
      return;
    }

    // 3. Progressive Constraint Fallback Strategy for Mobile Rear Camera
    const constraintOptions: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: { facingMode: "environment" }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastError: unknown = null;

    for (const constraints of constraintOptions) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      setScannerStatus("error");
      const errName = lastError instanceof Error ? lastError.name : String(lastError);
      
      if (errName.includes("NotAllowedError") || errName.includes("PermissionDenied")) {
        setCameraError("Camera permission denied. Please grant camera access in browser site settings.");
      } else if (errName.includes("NotReadableError") || errName.includes("TrackStartError")) {
        setCameraError("Camera is in use by another application. Close other camera apps and retry.");
      } else if (errName.includes("NotFoundError") || errName.includes("DevicesNotFound")) {
        setCameraError("No camera device found on this phone.");
      } else {
        setCameraError("Unable to initialize camera preview. Try entering barcode manually below.");
      }
      return;
    }

    streamRef.current = stream;

    // Wait for video element ref to be mounted in DOM
    let retries = 0;
    while (!videoRef.current && retries < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      retries++;
    }

    const videoEl = videoRef.current;
    if (!videoEl) {
      setCameraError("Video player element error. Please retry.");
      setScannerStatus("error");
      return;
    }

    // Attach stream to HTMLVideoElement with iOS Safari + Android compatibility attributes
    videoEl.srcObject = stream;
    videoEl.setAttribute("playsinline", "true");
    videoEl.setAttribute("autoplay", "true");
    videoEl.muted = true;

    try {
      await videoEl.play();
    } catch {
      // Play promise exception safety
    }

    // Wait for video stream to actually start playing frames
    if (videoEl.readyState < 2) {
      await new Promise<void>((resolve) => {
        const handleLoadedData = () => {
          videoEl.removeEventListener("loadeddata", handleLoadedData);
          resolve();
        };
        videoEl.addEventListener("loadeddata", handleLoadedData);
        setTimeout(resolve, 500); // safety fallback
      });
    }

    scanningRef.current = true;
    setScannerStatus("ready");

    // Initialize ZXing MultiFormat Decoder over live video element
    try {
      const codeReader = new BrowserMultiFormatReader();
      const controls = await codeReader.decodeFromVideoElement(videoEl, (result) => {
        if (result && scanningRef.current) {
          handleDecodedBarcode(result.getText());
        }
      });
      zxingControlsRef.current = controls;
    } catch (zxingErr) {
      console.warn("[CameraScanner] ZXing decoder fallback:", zxingErr);
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
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                scannerStatus === "ready" || scannerStatus === "detected" ? "opacity-100" : "opacity-0 absolute"
              }`}
            />

            {/* Visual Laser Scanner Overlay & Reticle */}
            {(scannerStatus === "ready" || scannerStatus === "detected") && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-44 w-64 rounded-lg border-2 border-dashed border-[#E85002]/80">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
                </div>
              </div>
            )}

            {/* Status Messages / Loading Skeletons */}
            {scannerStatus === "initializing" && (
              <div className="p-4 text-center text-zinc-400 space-y-2">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#E85002]" />
                <p className="text-xs font-semibold">Opening phone camera feed...</p>
              </div>
            )}

            {scannerStatus === "detected" && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
                <p className="text-sm font-bold tracking-wide">Barcode Detected!</p>
              </div>
            )}

            {scannerStatus === "error" && (
              <div className="p-4 text-center text-zinc-400 space-y-2 max-w-xs mx-auto">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="text-xs leading-relaxed">{cameraError || "Unable to open camera feed."}</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={startCamera}>
                  <RefreshCw className="mr-1 h-3 w-3" /> Retry Camera
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Center barcode within reticle. Supports EAN-13 (890...), UPC-A, Code 128 & QR labels.
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
