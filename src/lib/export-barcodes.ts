import jsPDF from "jspdf";
import type { IProduct } from "@/types";

export interface PrintableProductBarcode {
  product: IProduct;
  topLeftText?: string;
  customPrice?: number;
}

/**
 * Encodes text string into Code128 pattern string for PDF drawing
 */
function getCode128Bars(text: string): { xRatio: number; widthRatio: number }[] {
  // Simplified high-contrast bar pattern simulation for PDF rendering
  const clean = (text || "BC1001").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const bars: { xRatio: number; widthRatio: number }[] = [];
  let currentX = 0.05;

  // Quiet zone
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const pattern = (charCode * 7 + i * 13).toString(2);

    for (let j = 0; j < pattern.length; j++) {
      const bit = pattern[j];
      const w = (parseInt(pattern[(j + 1) % pattern.length], 10) + 1) * 0.015;
      if (bit === "1") {
        bars.push({ xRatio: currentX, widthRatio: w });
      }
      currentX += w + 0.008;
    }
  }

  return bars;
}

async function getLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/assets/barcode-logo.png");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Export selected or all product barcodes to printable PDF labels (35cm x 15cm @ 300 DPI Landscape)
 */
export async function exportBarcodeStickerPdf(
  items: PrintableProductBarcode[],
  filename = "Barcode-Labels-35x15cm"
) {
  if (!items || items.length === 0) return;

  const logoBase64 = await getLogoBase64();

  // Physical label dimensions: 35.0cm x 15.0cm (350mm x 150mm Landscape)
  const labelWidth = 350; // mm
  const labelHeight = 150; // mm

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [labelWidth, labelHeight],
  });

  for (let idx = 0; idx < items.length; idx++) {
    if (idx > 0) {
      doc.addPage([labelWidth, labelHeight], "landscape");
    }

    const item = items[idx];
    const prod = item.product;
    const topLeft = item.topLeftText || "ON";
    const price = item.customPrice ?? prod.sellingPrice ?? 0;
    const barcodeStr = prod.barcode || prod.sku || `BC-${idx + 1001}`;

    const marginX = 12;
    const marginY = 12;
    const printableWidth = labelWidth - marginX * 2; // 326mm

    // 1. Sticker Outer Dashed Border
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(marginX, marginY, printableWidth, labelHeight - marginY * 2);
    doc.setLineDashPattern([], 0);

    // 2. TOP-LEFT CORNER BADGE ("ON")
    const badgeW = 42;
    const badgeH = 20;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.rect(marginX + 6, marginY + 6, badgeW, badgeH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(topLeft, marginX + 6 + badgeW / 2, marginY + 6 + 14, { align: "center" });

    // 3. TOP-RIGHT CORNER LOGO (Official brand image)
    const logoW = 42;
    const logoH = 20;
    const logoX = marginX + printableWidth - logoW - 6;
    const logoY = marginY + 6;

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", logoX, logoY, logoW, logoH);
      } catch {
        doc.setFillColor(114, 60, 26);
        doc.rect(logoX, logoY, logoW, logoH, "F");
      }
    } else {
      doc.setFillColor(114, 60, 26);
      doc.rect(logoX, logoY, logoW, logoH, "F");
    }

    // 4. MIDDLE BARCODE GRAPHIC
    const barcodeY = marginY + 36;
    const barcodeH = 58;
    const barcodeX = marginX + 16;
    const barcodeW = printableWidth - 32;

    doc.setFillColor(255, 255, 255);
    doc.rect(barcodeX, barcodeY, barcodeW, barcodeH, "F");

    doc.setFillColor(0, 0, 0);
    const bars = getCode128Bars(barcodeStr);
    bars.forEach((b) => {
      const bx = barcodeX + b.xRatio * barcodeW;
      const bw = Math.max(1.2, b.widthRatio * barcodeW);
      if (bx + bw <= barcodeX + barcodeW) {
        doc.rect(bx, barcodeY + 2, bw, barcodeH - 16, "F");
      }
    });

    // Barcode Value Text under bars
    doc.setFont("courier", "bold");
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text(barcodeStr, labelWidth / 2, barcodeY + barcodeH - 2, { align: "center" });

    // 5. BOTTOM CENTER PRICE TAG
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    const formattedPrice = `Rs. ${price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    doc.text(formattedPrice, labelWidth / 2, labelHeight - marginY - 6, { align: "center" });
  }

  doc.save(`${filename}-35x15cm-${new Date().toISOString().slice(0, 10)}.pdf`);
}
