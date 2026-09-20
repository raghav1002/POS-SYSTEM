"use client";

import { useState, useEffect } from "react";
import { Barcode, Printer, RefreshCw, Save, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code128Barcode, generateAlphanumericBarcode } from "@/lib/barcode-generator";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductRecord } from "@/components/products/product-form-dialog";

interface BarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRecord | null;
  onSuccess?: () => void;
}

export function BarcodeModal({ open, onOpenChange, product, onSuccess }: BarcodeModalProps) {
  const [barcode, setBarcode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setBarcode(product.barcode || product.sku || "");
    }
  }, [product]);

  if (!product) return null;

  const handleGenerateRandom = () => {
    const newCode = generateAlphanumericBarcode("POS");
    setBarcode(newCode);
    toast.info(`Generated alphanumeric barcode: ${newCode}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = barcode.trim();
    if (!cleanCode) {
      toast.error("Barcode cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          barcode: cleanCode,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update barcode");

      toast.success(`Barcode updated to "${cleanCode}"`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save barcode");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSticker = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Label - ${product.name}</title>
          <style>
            body {
              font-family: monospace;
              text-align: center;
              padding: 10px;
              margin: 0;
            }
            .label {
              border: 1px solid #000;
              padding: 12px;
              display: inline-block;
              width: 240px;
              border-radius: 6px;
            }
            .title { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
            .price { font-size: 16px; font-weight: bold; margin-top: 6px; }
            .sku { font-size: 10px; color: #555; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label">
            <div class="title">${product.name}</div>
            <div class="sku">SKU: ${product.sku}</div>
            <div style="margin: 8px 0;">
              <!-- Simple barcode text representation -->
              <div style="font-size: 28px; letter-spacing: 4px; font-family: 'Libre Barcode 128', monospace;">
                ||| | ||| || ||| |
              </div>
              <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${barcode}</div>
            </div>
            <div class="price">${formatCurrency(product.sellingPrice)}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-bold text-base">
            <div className="p-2 rounded-lg bg-[#E85002]/20 border border-[#E85002]/30 text-[#E85002]">
              <Barcode className="h-5 w-5" />
            </div>
            Product Alphanumeric Barcode
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            View, edit, or generate Code 128 alphanumeric barcode (numbers & letters supported).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 py-2">
          {/* Item Summary Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div>
              <h4 className="font-bold text-sm text-white">{product.name}</h4>
              <p className="text-xs text-zinc-400 font-mono">SKU: {product.sku}</p>
            </div>
            <span className="text-base font-mono font-black text-[#E85002]">
              {formatCurrency(product.sellingPrice)}
            </span>
          </div>

          {/* LIVE VECTOR BARCODE DISPLAY */}
          <div className="p-4 rounded-2xl bg-white text-black border border-zinc-200 flex flex-col items-center justify-center shadow-inner">
            <Code128Barcode value={barcode || "POS-BARCODE-01"} height={75} barWidth={2} />
          </div>

          {/* EDIT BARCODE INPUT FIELD */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="barcode-input" className="text-xs font-bold text-zinc-200">
                Barcode Value (Numbers & Letters Supported)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#E85002] hover:text-[#FF6B1A] hover:bg-[#E85002]/10 p-1.5"
                onClick={handleGenerateRandom}
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Auto Generate
              </Button>
            </div>

            <Input
              id="barcode-input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.toUpperCase())}
              placeholder="e.g. POS-TSHIRT-001 or 8901234567890"
              className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm uppercase tracking-wider focus-visible:border-[#E85002]"
              autoFocus
            />
            <p className="text-[11px] text-zinc-400">
              Supports letters (A-Z), digits (0-9), hyphens (-), and underscores (_). Scannable by all Code 128 handheld scanners & camera detectors.
            </p>
          </div>

          {/* ACTIONS */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-zinc-800 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 sm:w-auto"
              onClick={handlePrintSticker}
            >
              <Printer className="mr-1.5 h-4 w-4 text-[#E85002]" />
              Print Label
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="brandGradient"
              disabled={isSaving}
              className="font-bold sm:w-auto"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" /> Save Barcode
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
