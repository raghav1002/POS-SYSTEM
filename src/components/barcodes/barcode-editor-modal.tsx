"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code128Barcode, generateCode128SvgMarkup } from "@/lib/barcode-generator";
import { Printer, Download, Save, Image as ImageIcon, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import type { IProduct } from "@/types";

export interface BarcodeLabelConfig {
  topLeftText: string;
  priceOverride?: number;
  barcodeValue?: string;
}

interface BarcodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: IProduct | null;
  onSaveConfig?: (productId: string, config: BarcodeLabelConfig) => void;
}

export function BarcodeEditorModal({
  open,
  onOpenChange,
  product,
  onSaveConfig,
}: BarcodeEditorModalProps) {
  const [topLeftText, setTopLeftText] = useState("ON");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    if (product) {
      setBarcodeValue(product.barcode || product.sku || "BC-1001");
      setPrice(product.sellingPrice || 0);
      setTopLeftText("ON");
    }
  }, [product]);

  if (!product) return null;

  const handlePrintSingle = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print barcode label");
      return;
    }

    const priceText = formatCurrency(price);
    const barcodeSvgMarkup = generateCode128SvgMarkup(barcodeValue || "BC-1001", 160, 3.2, true);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Label 35x15cm - ${product.name}</title>
          <style>
            @page {
              size: 35cm 15cm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 35cm;
              height: 15cm;
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
            }
            .label-card {
              width: 35cm;
              height: 15cm;
              border: 2px dashed #888;
              box-sizing: border-box;
              padding: 1.2cm 1.5cm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              background: #fff;
            }
            .top-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              height: 2.2cm;
            }
            .top-left-badge {
              font-size: 26pt;
              font-weight: 900;
              color: #000;
              border: 4px solid #000;
              padding: 4px 24px;
              border-radius: 8px;
              letter-spacing: 2px;
              height: 2.2cm;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              line-height: 1;
              box-sizing: border-box;
            }
            .top-right-logo {
              height: 2.2cm;
              width: auto;
              max-width: 5cm;
              object-fit: contain;
            }
            .middle-barcode {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 0.4cm 0;
              width: 100%;
            }
            .bottom-price {
              text-align: center;
              font-size: 38pt;
              font-weight: 900;
              color: #000;
              letter-spacing: 2px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-card">
            <div class="top-row">
              <div class="top-left-badge">${topLeftText || "ON"}</div>
              <img src="/assets/barcode-logo.png" class="top-right-logo" alt="Logo" />
            </div>
            <div class="middle-barcode">
              ${barcodeSvgMarkup}
            </div>
            <div class="bottom-price">${priceText}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSave = () => {
    if (onSaveConfig && product) {
      onSaveConfig(product._id || product.id || "", {
        topLeftText,
        priceOverride: price,
        barcodeValue,
      });
    }
    toast.success(`Barcode configuration saved for ${product.name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 text-white border-zinc-800 shadow-2xl p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="border-b border-zinc-800 pb-3">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <span>Barcode Label Editor</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Customize top-left badge text, logo placement, barcode graphics, and price tag for <strong className="text-white">{product.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
          {/* LEFT COLUMN: EDITABLE CONTROLS */}
          <div className="md:col-span-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">
                Top-Left Corner Text (e.g. ON / Batch / Serial)
              </Label>
              <Input
                value={topLeftText}
                onChange={(e) => setTopLeftText(e.target.value)}
                placeholder="ON"
                maxLength={12}
                className="bg-zinc-900 border-zinc-800 text-white font-mono text-sm uppercase focus:border-[#E85002]"
              />
              <p className="text-[11px] text-zinc-500">
                Displays in the top-left corner of the printable label.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">
                Barcode Value (Numbers or Alphabets)
              </Label>
              <Input
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="BC-1001"
                className="bg-zinc-900 border-zinc-800 text-white font-mono text-sm focus:border-[#E85002]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">
                Label Selling Price (₹)
              </Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 text-white font-mono text-sm focus:border-[#E85002]"
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/80 space-y-1">
              <p className="text-xs font-bold text-zinc-400">Top-Right Logo Asset:</p>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="h-8 w-8 rounded bg-white p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/barcode-logo.png"
                    alt="Store Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Official Leaf Logo</span>
                  <span className="text-[10px] text-zinc-500">Fixed top-right position</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 1:1 LIVE STICKER PREVIEW */}
          <div className="md:col-span-6 flex flex-col items-center justify-center bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
              Live Label Preview
            </span>

            {/* LIVE BARCODE STICKER LABEL CARD (35:15 ASPECT RATIO) */}
            <div className="w-full max-w-[420px] aspect-[35/15] bg-white text-black p-3.5 rounded-xl shadow-2xl border-2 border-zinc-300 flex flex-col justify-between relative overflow-hidden select-none">
              {/* TOP ROW: LEFT TEXT BADGE & RIGHT LOGO */}
              <div className="flex items-center justify-between w-full h-7">
                <div className="px-2.5 py-1 border-2 border-black rounded text-[11px] font-black tracking-wider uppercase bg-white leading-none flex items-center justify-center h-6">
                  {topLeftText || "ON"}
                </div>
                <div className="h-6 flex items-center justify-end">
                  <img
                    src="/assets/barcode-logo.png"
                    alt="Brand Logo"
                    className="h-6 w-auto max-h-6 object-contain"
                  />
                </div>
              </div>

              {/* MIDDLE ROW: RENDERED BARCODE */}
              <div className="flex-1 flex flex-col items-center justify-center my-1">
                <Code128Barcode value={barcodeValue || "BC-1001"} height={65} barWidth={1.8} showText={true} />
              </div>

              {/* BOTTOM CENTER: PRICE TAG */}
              <div className="text-center font-black text-sm text-black tracking-wide border-t border-zinc-200 pt-1">
                {formatCurrency(price)}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 text-center font-medium">
              Physical Print Output: <strong className="text-white">Exactly 35.0 × 15.0 cm</strong> Landscape (4134 × 1772 px @ 300 DPI).
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-zinc-800 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintSingle}
              className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 font-bold"
            >
              <Printer className="mr-1.5 h-4 w-4 text-[#E85002]" />
              <span>Print Sticker</span>
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              className="bg-gradient-to-r from-[#E85002] via-[#F16001] to-[#C10801] font-bold text-white shadow-lg shadow-[#E85002]/30"
            >
              <Save className="mr-1.5 h-4 w-4" />
              <span>Save Configuration</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
