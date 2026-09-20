"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Audio fallback
  }
}

export function CameraBarcodeScanner({ open, onOpenChange, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [scannerStatus, setScannerStatus] = useState<"initializing" | "ready" | "detected" | "error">("initializing");
  const [isHardwareAccelerated, setIsHardwareAccelerated] = useState(false);

  const scanningRef = useRef(false);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  const stopCamera = useCallback(() => {
    scanningRef.current = false;

    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

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
      if (lastScannedCodeRef.current.code === clean && now - lastScannedCodeRef.current.time < 1500) {
        return;
      }

      lastScannedCodeRef.current = { code: clean, time: now };
      scanningRef.current = false;
      setScannerStatus("detected");

      // Audio & Tactile Haptic Feedback
      playBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(80);
        } catch {}
      }

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

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerStatus("error");
      setCameraError("Camera API is not supported on this browser.");
      return;
    }

    // High performance video constraints for instant barcode scan
    const fastConstraints: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      },
      { video: { facingMode: "environment" }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastError: unknown = null;

    for (const constraints of fastConstraints) {
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
        setCameraError("Camera permission denied. Please grant camera access in site settings.");
      } else {
        setCameraError("Unable to open camera feed. Enter barcode manually below.");
      }
      return;
    }

    streamRef.current = stream;

    // Apply Hardware Continuous Auto-Focus if supported by camera device
    try {
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === "function") {
        const caps = (track.getCapabilities() as Record<string, any>) || {};
        if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
          track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any).catch(() => {});
        }
      }
    } catch {}

    const videoEl = videoRef.current;
    if (!videoEl) {
      setCameraError("Video player error.");
      setScannerStatus("error");
      return;
    }

    videoEl.srcObject = stream;
    videoEl.setAttribute("playsinline", "true");
    videoEl.setAttribute("autoplay", "true");
    videoEl.muted = true;

    try {
      await videoEl.play();
    } catch {}

    scanningRef.current = true;
    setScannerStatus("ready");

    // 1. FAST DRIVER: Check for Hardware-Accelerated Native BarcodeDetector API (Android Chrome / Modern Browsers)
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        setIsHardwareAccelerated(true);
        const NativeBarcodeDetector = (window as any).BarcodeDetector;
        const detector = new NativeBarcodeDetector({
          formats: ["ean_13", "code_128", "upc_a", "upc_e", "code_39", "ean_8", "qr_code"],
        });

        const scanFrame = async () => {
          if (!scanningRef.current || !videoRef.current) return;

          try {
            if (videoRef.current.readyState >= 2) {
              const detected = await detector.detect(videoRef.current);
              if (detected && detected.length > 0 && scanningRef.current) {
                const code = detected[0].rawValue || detected[0].rawValueText;
                if (code) {
                  handleDecodedBarcode(code);
                  return;
                }
              }
            }
          } catch {}

          if (scanningRef.current) {
            animFrameIdRef.current = requestAnimationFrame(scanFrame);
          }
        };

        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      } catch (nativeErr) {
        console.warn("[CameraScanner] BarcodeDetector fallback to ZXing:", nativeErr);
      }
    }

    // 2. FALLBACK DRIVER: Optimized ZXing Reader constrained exclusively to retail barcodes
    try {
      setIsHardwareAccelerated(false);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.CODE_128,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_8,
        BarcodeFormat.QR_CODE,
      ]);

      const codeReader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
      const controls = await codeReader.decodeFromVideoElement(videoEl, (result) => {
        if (result && scanningRef.current) {
          handleDecodedBarcode(result.getText());
        }
      });
      zxingControlsRef.current = controls;
    } catch (zxingErr) {
      console.warn("[CameraScanner] ZXing decoder error:", zxingErr);
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
          <DialogTitle className="flex items-center justify-between text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#E85002]" />
              <span>Instant Barcode Camera Scanner</span>
            </div>
            {isHardwareAccelerated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <Zap className="h-3 w-3" /> Ultra-Fast Hardware GPU
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Point mobile camera at retail barcode (EAN-13, UPC, Code 128) for instant scan.
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

            {/* Visual Reticle & Laser Scanner Line */}
            {(scannerStatus === "ready" || scannerStatus === "detected") && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-44 w-64 rounded-lg border-2 border-dashed border-[#E85002]/80">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
                </div>
              </div>
            )}

            {/* Status Messages */}
            {scannerStatus === "initializing" && (
              <div className="p-4 text-center text-zinc-400 space-y-2">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#E85002]" />
                <p className="text-xs font-semibold">Initializing high-speed camera engine...</p>
              </div>
            )}

            {scannerStatus === "detected" && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
                <p className="text-sm font-bold tracking-wide">Barcode Scanned!</p>
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
            Center barcode within reticle. Fast auto-scan for EAN-13, UPC, Code 128 & QR labels.
          </p>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Input
              placeholder="Or enter barcode manually..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 text-sm font-mono"
            />
            <Button type="submit" variant="brandGradient" className="shrink-0 font-bold text-xs">
              Submit
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
