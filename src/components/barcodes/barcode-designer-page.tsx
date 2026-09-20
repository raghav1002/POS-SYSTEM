"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Barcode,
  Search,
  Download,
  Trash2,
  Edit,
  Printer,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Code128Barcode } from "@/lib/barcode-generator";
import { BarcodeEditorModal, type BarcodeLabelConfig } from "@/components/barcodes/barcode-editor-modal";
import { exportBarcodeStickerPdf } from "@/lib/export-barcodes";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Image from "next/image";
import type { IProduct } from "@/types";

export function BarcodeDesignerPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Per-product custom label configurations (e.g. topLeftText)
  const [labelConfigs, setLabelConfigs] = useState<Record<string, BarcodeLabelConfig>>({});

  // Active product for BarcodeEditorModal
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Single or Bulk Delete confirmation modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    fetchProducts();

    // Auto-refresh when switching back to this tab/window after adding a product
    const handleFocus = () => fetchProducts();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?limit=200");
      const json = await res.json();
      let itemList: IProduct[] = [];

      if (json.success && json.data) {
        if (Array.isArray(json.data.items)) {
          itemList = json.data.items;
        } else if (Array.isArray(json.data)) {
          itemList = json.data;
        }
      }

      // Fallback to public catalog if /api/products returns empty array
      if (itemList.length === 0) {
        const pubRes = await fetch("/api/products/public?limit=200");
        const pubJson = await pubRes.json();
        if (pubJson.success && Array.isArray(pubJson.data)) {
          itemList = pubJson.data;
        }
      }

      setProducts(itemList);
    } catch (err) {
      console.error("Fetch Products Error:", err);
      toast.error("Error loading products");
    } finally {
      setLoading(false);
    }
  };

  // Filtered products list based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  // Handle Select All Checkbox
  const allSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p._id || p.id || ""));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p._id || p.id || ""));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk PDF Download Handlers
  const handleDownloadAll = () => {
    if (products.length === 0) {
      toast.error("No products available to download");
      return;
    }

    const exportItems = products.map((p) => {
      const pId = p._id || p.id || "";
      const cfg = labelConfigs[pId];
      return {
        product: p,
        topLeftText: cfg?.topLeftText || "ON",
        customPrice: cfg?.priceOverride ?? p.sellingPrice,
      };
    });

    exportBarcodeStickerPdf(exportItems, "All-Product-Barcodes");
    toast.success(`Generated PDF barcode sheet for all ${products.length} product(s)!`);
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one product to download barcodes");
      return;
    }

    const selectedProducts = products.filter((p) =>
      selectedIds.includes(p._id || p.id || "")
    );

    const exportItems = selectedProducts.map((p) => {
      const pId = p._id || p.id || "";
      const cfg = labelConfigs[pId];
      return {
        product: p,
        topLeftText: cfg?.topLeftText || "ON",
        customPrice: cfg?.priceOverride ?? p.sellingPrice,
      };
    });

    exportBarcodeStickerPdf(exportItems, "Selected-Barcodes-Sheet");
    toast.success(`Generated PDF barcode sheet for ${selectedProducts.length} selected product(s)!`);
  };

  // Single & Bulk Delete Handlers
  const promptDeleteProduct = (id: string) => {
    setDeleteTargetId(id);
    setIsBulkDeleting(false);
    setDeleteConfirmOpen(true);
  };

  const promptBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (isBulkDeleting) {
      // Bulk remove selected products from state
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p._id || p.id || "")));
      setSelectedIds([]);
      toast.success(`Deleted ${selectedIds.length} barcode record(s) from designer queue!`);
    } else if (deleteTargetId) {
      // Remove single product record from state
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== deleteTargetId));
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetId));
      toast.success("Deleted barcode record from designer queue!");
    }
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  // Open Editor Modal
  const handleOpenEditor = (product: IProduct) => {
    setEditingProduct(product);
    setEditorOpen(true);
  };

  // Save per-product label config
  const handleSaveLabelConfig = (productId: string, config: BarcodeLabelConfig) => {
    setLabelConfigs((prev) => ({
      ...prev,
      [productId]: config,
    }));
  };

  return (
    <DashboardShell title="Barcode Designing and Printing">
      <div className="space-y-6 pb-12">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E85002]/10 border border-[#E85002]/30 text-xs font-bold text-[#E85002]">
              <Barcode className="h-3.5 w-3.5" />
              <span>Operations • Barcode Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Barcode Designing and Printing
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Generate exact 35.0 × 15.0 cm Landscape (4134 × 1772 px @ 300 DPI) thermal barcode labels with top-left text (`ON`), top-right brand logo, middle barcode, and price tag.
            </p>
          </div>

          {/* ACTION BUTTONS HEADER */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={promptBulkDelete}
                className="h-10 px-3 text-xs font-bold bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            )}

            <Button
              onClick={fetchProducts}
              disabled={loading}
              variant="outline"
              size="sm"
              className="h-10 px-3 text-xs font-bold border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              title="Refresh Products Catalog"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 text-[#E85002] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={handleDownloadSelected}
              disabled={selectedIds.length === 0}
              variant="outline"
              size="sm"
              className="h-10 px-4 text-xs font-bold border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              <Download className="mr-1.5 h-4 w-4 text-[#E85002]" />
              <span>Download Selected Barcodes ({selectedIds.length})</span>
            </Button>

            <Button
              onClick={handleDownloadAll}
              variant="brandGradient"
              size="sm"
              className="h-10 px-5 text-xs font-extrabold shadow-lg shadow-[#E85002]/20"
            >
              <Download className="mr-1.5 h-4 w-4" />
              <span>Download All Barcodes ({products.length})</span>
            </Button>
          </div>
        </div>

        {/* SEARCH BAR & SUMMARY */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by product name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-[#E85002]"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
            <span>Total Catalog: <strong className="text-white">{products.length}</strong></span>
            <span>Selected: <strong className="text-[#E85002]">{selectedIds.length}</strong></span>
          </div>
        </div>

        {/* BARCODES TABLE */}
        <Card className="bg-zinc-950/90 border-zinc-800/80 text-white shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800/80 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-white">Product Barcode Queue</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Click any product barcode to open the interactive label layout editor.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 space-y-3">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#E85002]" />
                <p className="text-xs font-semibold">Loading product barcode catalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <Barcode className="mx-auto h-10 w-10 text-zinc-600" />
                <p className="text-sm font-bold text-zinc-400">No products found matching your search.</p>
                <p className="text-xs text-zinc-500">Try adjusting your search query or add products to your catalog.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 uppercase text-[10px] font-black tracking-wider text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-4 w-10 text-center">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all products"
                        />
                      </th>
                      <th className="p-4">Product Details</th>
                      <th className="p-4">SKU & Barcode</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Top-Left Text</th>
                      <th className="p-4 text-center">Live Barcode Sticker Preview</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {filteredProducts.map((p) => {
                      const pId = p._id || p.id || "";
                      const isSelected = selectedIds.includes(pId);
                      const cfg = labelConfigs[pId];
                      const topLeftText = cfg?.topLeftText || "ON";
                      const displayPrice = cfg?.priceOverride ?? p.sellingPrice;
                      const barcodeVal = cfg?.barcodeValue || p.barcode || p.sku || "BC-1001";
                      const imgUrl = p.images?.[0] || p.image?.url || p.thumbnail?.url;

                      return (
                        <tr
                          key={pId}
                          className={`transition-colors hover:bg-zinc-900/60 ${
                            isSelected ? "bg-[#E85002]/5" : ""
                          }`}
                        >
                          {/* CHECKBOX */}
                          <td className="p-4 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectProduct(pId)}
                              aria-label={`Select ${p.name}`}
                            />
                          </td>

                          {/* PRODUCT INFO */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={p.name}
                                  className="h-10 w-10 rounded-lg object-cover border border-zinc-800 shrink-0 bg-zinc-900"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-600">
                                  <Barcode className="h-5 w-5" />
                                </div>
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-bold text-white block truncate max-w-[200px]">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-zinc-500 block truncate">
                                  ID: {pId}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* SKU & BARCODE */}
                          <td className="p-4 font-mono">
                            <span className="block text-zinc-200 font-bold">{barcodeVal}</span>
                            <span className="text-[10px] text-zinc-500">SKU: {p.sku || "N/A"}</span>
                          </td>

                          {/* PRICE */}
                          <td className="p-4 font-bold text-white text-sm">
                            {formatCurrency(displayPrice)}
                          </td>

                          {/* TOP-LEFT TEXT BADGE */}
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-white text-black border-2 border-black"
                            >
                              {topLeftText}
                            </Badge>
                          </td>

                          {/* LIVE MINI BARCODE PREVIEW BUTTON */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditor(p)}
                              title="Click to open full Barcode Label Designer"
                              className="inline-flex flex-col items-center justify-center p-2 rounded-xl bg-white text-black border-2 border-zinc-300 shadow hover:scale-105 transition-all cursor-pointer group"
                            >
                              {/* STICKER TOP ROW */}
                              <div className="flex items-center justify-between w-36 mb-1 h-4">
                                <span className="text-[8px] font-black border-2 border-black px-1 py-0.5 rounded bg-white leading-none flex items-center justify-center h-4">
                                  {topLeftText}
                                </span>
                                <img
                                  src="/assets/barcode-logo.png"
                                  alt="Logo"
                                  className="h-4 w-auto object-contain"
                                />
                              </div>

                              {/* BARCODE GRAPHIC */}
                              <Code128Barcode value={barcodeVal} height={32} barWidth={1} showText={false} />

                              {/* BOTTOM PRICE */}
                              <span className="text-[9px] font-black text-black mt-0.5">
                                {formatCurrency(displayPrice)}
                              </span>
                            </button>
                          </td>

                          {/* ACTIONS */}
                          <td className="p-4 text-right space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditor(p)}
                              className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
                              title="Edit Barcode Design"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1 text-[#E85002]" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => promptDeleteProduct(pId)}
                              className="h-8 px-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/40"
                              title="Delete Barcode Record"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* INTERACTIVE BARCODE LABEL EDITOR MODAL */}
      <BarcodeEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        product={editingProduct}
        onSaveConfig={handleSaveLabelConfig}
      />

      {/* CONFIRMATION DELETE MODAL */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={isBulkDeleting ? "Delete Selected Barcode Records?" : "Delete Barcode Record?"}
        description={
          isBulkDeleting
            ? `Are you sure you want to remove ${selectedIds.length} selected barcode item(s) from the printable queue?`
            : "Are you sure you want to remove this product barcode from the printable queue?"
        }
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </DashboardShell>
  );
}
