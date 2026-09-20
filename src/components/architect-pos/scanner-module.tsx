"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Scan, Camera, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraBarcodeScanner } from "@/components/pos/camera-barcode-scanner";
import { toast } from "sonner";

export function ScannerModule() {
  const router = useRouter();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBarcodeScanned = (barcode: string) => {
    setIsScanning(true);
    toast.success(`Scanned Barcode: ${barcode}`);
    setTimeout(() => {
      router.push(`/pos?barcode=${encodeURIComponent(barcode)}`);
    }, 400);
  };

  // Hardware Scanner Keydown Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is typing inside input elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ""; // Clear buffer if keys are typed too slowly (human typing vs hardware scanner speed)
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          handleBarcodeScanned(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScanned(barcodeInput.trim());
    setBarcodeInput("");
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center relative z-20">
      {/* 1. HERO HEADLINE */}
      <div className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#723C1A]/30 bg-[#723C1A]/10 px-4 py-1.5 text-xs font-bold text-[#723C1A] shadow-md shadow-[#723C1A]/5">
          <Sparkles className="h-3.5 w-3.5 text-[#E85002]" />
          <span>RetailPOS Console 2026</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#2C1810] leading-tight drop-shadow-sm">
          READY TO <span className="bg-gradient-to-r from-[#723C1A] via-[#C1440E] to-[#E85002] bg-clip-text text-transparent">BILL</span>
        </h1>

        <p className="text-base sm:text-lg text-[#5C4033] max-w-lg mx-auto font-medium">
          Scan a product barcode to begin instant checkout.
        </p>
      </div>

      {/* 2. CENTRAL FROSTED SCANNER CONTAINER */}
      <div className="w-full rounded-3xl border border-[#723C1A]/20 bg-[#2C1810]/85 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-[#2C1810]/40 text-white space-y-6 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E85002]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Viewfinder Reticle Box */}
        <div className="relative mx-auto w-full max-w-md h-36 rounded-2xl border-2 border-dashed border-[#E85002]/60 bg-black/40 flex flex-col items-center justify-center p-4 overflow-hidden group">
          {/* Target Corner Reticles */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#E85002]" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#E85002]" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#E85002]" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#E85002]" />

          {/* Animated Scanning Red/Orange Laser Sweep */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FF3B00] to-transparent shadow-[0_0_12px_#FF3B00] animate-[bounce_2s_infinite]" />

          <Scan className="h-10 w-10 text-[#E85002] mb-2 group-hover:scale-110 transition-transform animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">
            {isScanning ? "PROCESSING BARCODE..." : "HARDWARE SCANNER ACTIVE"}
          </span>
          <span className="text-[11px] text-zinc-400 mt-1">
            Point USB/Bluetooth handheld scanner or click below
          </span>
        </div>

        {/* 3. LARGE BROWN SCAN BARCODE PRIMARY ACTION BUTTON */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={() => setCameraOpen(true)}
            className="w-full sm:w-auto h-14 px-8 font-black text-base tracking-wide rounded-2xl bg-gradient-to-r from-[#723C1A] via-[#8B4513] to-[#5C280C] hover:from-[#8B4513] hover:to-[#723C1A] text-white shadow-xl shadow-[#723C1A]/40 border border-[#9A5222]/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            <Scan className="h-6 w-6 text-[#FF8C42] group-hover:rotate-12 transition-transform" />
            <span>SCAN BARCODE</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setCameraOpen(true)}
            className="w-full sm:w-auto h-14 px-6 font-bold text-sm rounded-2xl border-white/20 bg-black/40 hover:bg-white/10 text-zinc-200 transition-all flex items-center justify-center gap-2"
          >
            <Camera className="h-5 w-5 text-[#E85002]" />
            <span>Camera Scanner</span>
          </Button>
        </div>

        {/* 4. MANUAL BARCODE INPUT FIELD */}
        <form onSubmit={handleManualSubmit} className="max-w-md mx-auto pt-2 flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Or type product barcode / SKU..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="bg-black/50 border-white/20 text-white placeholder:text-zinc-500 font-mono text-xs h-10 rounded-xl focus-visible:ring-[#E85002]"
          />
          <Button type="submit" size="sm" className="h-10 px-4 bg-[#723C1A] hover:bg-[#8B4513] text-white font-bold text-xs rounded-xl">
            Enter
          </Button>
        </form>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-400 pt-2 border-t border-white/10">
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#E85002]" /> Instant POS Sync</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#E85002]" /> Thermal Receipt Ready</span>
        </div>
      </div>

      {/* CAMERA SCANNER MODAL */}
      <CameraBarcodeScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
