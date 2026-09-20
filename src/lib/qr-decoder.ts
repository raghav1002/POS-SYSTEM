"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";

export interface ScanResult {
  text: string | null;
  parsedUpi?: {
    pa?: string;
    pn?: string;
  };
  error?: string;
}

/**
 * Validates whether a given string is a properly formatted UPI VPA ID (e.g. merchant@ybl, 9876543210@paytm).
 * Must contain an `@` handle to be accepted by PhonePe, Google Pay, and NPCI gateways.
 */
export function isValidUpiVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== "string") return false;
  const cleaned = vpa.trim();
  // Must contain @ and valid handle format (e.g. name@bank)
  return /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}$/.test(cleaned);
}

/**
 * Formats a raw VPA input to ensure it includes a valid `@` handle (defaults to @upi if missing).
 */
export function formatUpiVpa(vpa: string): string {
  if (!vpa || typeof vpa !== "string") return "store@upi";
  let cleaned = vpa.trim().toLowerCase();
  if (!cleaned) return "store@upi";

  if (!cleaned.includes("@")) {
    cleaned = `${cleaned}@upi`;
  }
  return cleaned;
}

/**
 * Constructs a 100% valid, NPCI-compliant UPI payment URL.
 */
export function buildUpiPayUrl(params: {
  vpa: string;
  merchantName?: string;
  amount?: number | string;
  transactionNote?: string;
}): string {
  const formattedVpa = formatUpiVpa(params.vpa);
  const name = (params.merchantName || "RetailPOS Store").trim();
  
  let url = `upi://pay?pa=${encodeURIComponent(formattedVpa)}&pn=${encodeURIComponent(name)}&cu=INR`;
  
  if (params.amount !== undefined && params.amount !== null) {
    const numericAmt = typeof params.amount === "number" ? params.amount : parseFloat(params.amount);
    if (!isNaN(numericAmt) && numericAmt > 0) {
      url += `&am=${numericAmt.toFixed(2)}`;
    }
  }

  if (params.transactionNote) {
    url += `&tn=${encodeURIComponent(params.transactionNote.trim())}`;
  }

  return url;
}

/**
 * Parses UPI parameters from a decoded QR string (e.g. upi://pay?pa=...&pn=...)
 */
export function parseUpiUrl(urlStr: string): { pa?: string; pn?: string } {
  if (!urlStr) return {};
  try {
    if (urlStr.startsWith("upi://pay")) {
      const urlObj = new URL(urlStr);
      const pa = urlObj.searchParams.get("pa") || undefined;
      const pn = urlObj.searchParams.get("pn") || undefined;
      return { pa, pn };
    }
  } catch {
    // Fallback regex if URL parsing fails
  }

  const paMatch = urlStr.match(/[?&]pa=([^&]+)/i);
  const pnMatch = urlStr.match(/[?&]pn=([^&]+)/i);

  return {
    pa: paMatch ? decodeURIComponent(paMatch[1]) : undefined,
    pn: pnMatch ? decodeURIComponent(pnMatch[1]) : undefined,
  };
}

/**
 * Advanced multi-pass QR Code image scanner using @zxing/browser.
 * Uses center-cropping and high-contrast filtering to extract embedded QR codes from full standee posters.
 */
export async function scanQrCodeFromImageUrl(imageUrl: string): Promise<ScanResult> {
  if (!imageUrl) {
    return { text: null, error: "No image URL provided" };
  }

  const reader = new BrowserMultiFormatReader();

  // 1. Primary Attempt: BrowserMultiFormatReader.decodeFromImageUrl directly
  try {
    const result = await reader.decodeFromImageUrl(imageUrl);
    if (result && result.getText()) {
      const text = result.getText();
      return {
        text,
        parsedUpi: parseUpiUrl(text),
      };
    }
  } catch (err) {
    console.warn("[QR Decoder] Full image URL decode missed, starting multi-stage canvas scan...", err);
  }

  // 2. Load into HTMLImageElement with CORS for Canvas operations
  let img: HTMLImageElement;
  try {
    img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const result = await reader.decodeFromImageElement(img);
    if (result && result.getText()) {
      const text = result.getText();
      return {
        text,
        parsedUpi: parseUpiUrl(text),
      };
    }
  } catch {
    // Continue to canvas center crop
  }

  // 3. Multi-stage Canvas Center Crop Scanner (For Standee Posters with text headers)
  if (typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined" && img!) {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (ctx && img.naturalWidth && img.naturalHeight) {
        // Crop Center 70% where payment standee QR codes are located
        const cropW = img.naturalWidth * 0.7;
        const cropH = img.naturalHeight * 0.7;
        const startX = (img.naturalWidth - cropW) / 2;
        const startY = (img.naturalHeight - cropH) / 2;

        canvas.width = cropW;
        canvas.height = cropH;

        // High contrast binarization filter
        ctx.filter = "contrast(170%) brightness(105%) grayscale(100%)";
        ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

        const croppedImg = document.createElement("img");
        croppedImg.src = canvas.toDataURL("image/png");

        await new Promise((res) => {
          croppedImg.onload = res;
          croppedImg.onerror = res;
        });

        const croppedResult = await reader.decodeFromImageElement(croppedImg);
        if (croppedResult && croppedResult.getText()) {
          const text = croppedResult.getText();
          return {
            text,
            parsedUpi: parseUpiUrl(text),
          };
        }
      }
    } catch (cropErr) {
      console.warn("[QR Decoder] Center crop canvas scan failed:", cropErr);
    }
  }

  return {
    text: null,
    error: "Could not detect a valid QR code in the image. Please ensure the VPA ID format is valid.",
  };
}

/**
 * Helper to construct a clean, high-resolution QR Code image URL using quick-chart/qrserver.
 */
export function generateCleanQrCodeUrl(payload: string, size = 400): string {
  if (!payload || !payload.trim()) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    payload.trim()
  )}&margin=1`;
}
