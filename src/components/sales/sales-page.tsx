"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, Search, Printer, FileText, Trash2, FileSpreadsheet, User, Phone, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { printThermalReceipt } from "@/lib/print-invoice";
import { exportSalesGSTExcel } from "@/lib/export-reports";

interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  subtotal: number;
  barcode?: string;
}

interface SaleRecord {
  _id: string;
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  status: "completed" | "held" | "returned" | "refunded";
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  payments: { method: string; amount: number; reference?: string }[];
  createdAt?: string;
  updatedAt?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerState?: string;
  cashierId?: string;
  cashierName?: string;
}

export function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("limit", "100");
      const res = await fetch(`/api/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSales(json.data.items ?? json.data ?? []);
      }
    } catch {
      toast.error("Failed to load sales history");
    } finally {
      setIsLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(loadSales, 250);
    return () => clearTimeout(timeout);
  }, [loadSales]);

  const handlePrint = (sale: SaleRecord) => {
    printThermalReceipt({
      storeName: "RetailPOS Store",
      invoiceNumber: sale.invoiceNumber,
      date: new Date(sale.createdAt || Date.now()).toLocaleString(),
      cashier: sale.cashierName || "Cashier",
      customer: sale.customerName,
      customerPhone: sale.customerPhone,
      customerAddress: sale.customerAddress,
      items: (sale.items || []).map((it) => ({
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        price: it.price,
        quantity: it.quantity,
        discount: it.discount,
        tax: it.tax,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      payments: sale.payments || [{ method: "cash", amount: sale.total }],
    });
  };

  const handleDeleteSale = async (id: string, invoiceNumber?: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete sale ${invoiceNumber || id} from both backend and frontend history?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/sales?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setSales((prev) => prev.filter((s) => s.id !== id && s._id !== id));
        if (selectedSale && (selectedSale.id === id || selectedSale._id === id)) {
          setIsPreviewOpen(false);
          setSelectedSale(null);
        }
        toast.success(`Sale ${invoiceNumber || id} deleted permanently.`);
      } else {
        toast.error(json.error || "Failed to delete sale record");
      }
    } catch {
      toast.error("Failed to delete sale record");
    }
  };

  const handleDeleteAllSales = async () => {
    if (sales.length === 0) {
      toast.info("Sales history is already empty.");
      return;
    }
    if (!confirm("⚠️ PERMANENT ACTION: Are you sure you want to DELETE ALL sales history records from both backend and frontend database? This cannot be undone!")) {
      return;
    }
    try {
      const res = await fetch("/api/sales?id=all", {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setSales([]);
        setIsPreviewOpen(false);
        setSelectedSale(null);
        toast.success("All sales history deleted permanently.");
      } else {
        toast.error(json.error || "Failed to clear sales history");
      }
    } catch {
      toast.error("Failed to clear sales history");
    }
  };

  const handleExportGSTExcel = () => {
    if (sales.length === 0) {
      toast.error("No sales records available to export.");
      return;
    }
    exportSalesGSTExcel(sales);
    toast.success("GST Sales Excel report downloaded!");
  };

  const openPreview = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-950 shadow-xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <span>Sales & Invoice History</span>
              <Badge variant="outline" className="text-xs border-[#E85002]/40 text-[#FF8C42] bg-[#E85002]/10 font-mono">
                {sales.length} Record(s)
              </Badge>
            </CardTitle>
            <p className="text-xs text-zinc-400">
              Track completed transactions, customer bills, reprint thermal receipts & manage permanent cell history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                className="pl-9 h-9 w-full sm:w-56 bg-zinc-900 text-zinc-100 border-zinc-800 focus:border-[#E85002]"
                placeholder="Search by invoice..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E85002]/50"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="held">Held</option>
              <option value="refunded">Refunded</option>
            </select>

            <Button
              size="sm"
              onClick={handleExportGSTExcel}
              className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
              title="Download Combined Overall Sales GST Excel Report"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export GST Excel</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteAllSales}
              className="h-9 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-red-900/30"
              title="Delete All Sales History permanently from Backend & Frontend"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All History</span>
            </Button>

            <Button size="sm" variant="outline" className="h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-900" onClick={loadSales}>
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#E85002] border-r-transparent mb-2" />
              <p>Loading sales records...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-40 text-[#E85002]" />
              <p className="font-medium text-zinc-100">No sales transactions found</p>
              <p className="text-xs text-zinc-400 mt-1">Complete orders at the POS register to see sales here.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-zinc-400">
                      <th className="py-3.5 px-4 font-medium">Invoice #</th>
                      <th className="py-3.5 px-4 font-medium">Date & Time</th>
                      <th className="py-3.5 px-4 font-medium">Items</th>
                      <th className="py-3.5 px-4 font-medium">Payment</th>
                      <th className="py-3.5 px-4 font-medium text-center">Status</th>
                      <th className="py-3.5 px-4 font-medium text-right">Total</th>
                      <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {sales.map((sale) => (
                      <tr
                        key={sale._id || sale.id}
                        className="hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#E85002]">
                          {sale.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-300">
                          {sale.items?.length ?? 1} item(s)
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="capitalize font-medium text-zinc-200">
                            {sale.payments?.[0]?.method || "Cash"}
                          </span>
                          {sale.payments?.[0]?.reference && (
                            <span className="block font-mono text-[10px] text-zinc-500 truncate max-w-xs">
                              {sale.payments[0].reference}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant={sale.status === "completed" ? "success" : "secondary"}
                            className="text-xs font-normal capitalize"
                          >
                            {sale.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                              onClick={() => openPreview(sale)}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> View Bill
                            </Button>
                            <Button
                              size="sm"
                              variant="brandGradient"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => handlePrint(sale)}
                              title="Reprint Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0 text-xs bg-red-600/90 hover:bg-red-500 text-white"
                              onClick={() => handleDeleteSale(sale.id || sale._id, sale.invoiceNumber)}
                              title="Delete Record Permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {sales.map((sale) => (
                  <div
                    key={sale._id || sale.id}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-sm font-bold text-[#E85002]">
                          {sale.invoiceNumber}
                        </span>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                      <span className="text-base font-bold font-mono text-zinc-100">
                        {formatCurrency(sale.total)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>{sale.items?.length ?? 1} item(s) • {sale.payments?.[0]?.method?.toUpperCase() || "CASH"}</span>
                      <Badge variant="success" className="text-[10px] font-normal">
                        {sale.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-800" onClick={() => openPreview(sale)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="brandGradient" className="h-8 text-xs" onClick={() => handlePrint(sale)}>
                        <Printer className="h-3.5 w-3.5 mr-1" /> Print Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-2 text-xs bg-red-600/90 hover:bg-red-500 text-white"
                        onClick={() => handleDeleteSale(sale.id || sale._id, sale.invoiceNumber)}
                        title="Delete Sale"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bill Preview Modal */}
      {selectedSale && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:max-w-xl max-h-[85vh] overflow-y-auto bg-[#1A0F0A]/98 text-white border-2 border-[#723C1A]/60 shadow-2xl shadow-black/95 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl">
            {/* Ambient Glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#E85002]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <DialogHeader className="space-y-2 border-b border-white/10 pb-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E85002]/20 border border-[#E85002]/40 text-[#FF8C42] text-[11px] font-bold tracking-wide uppercase">
                    <span>TIPASH LUXURIES INVOICE</span>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>Invoice #{selectedSale.invoiceNumber}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400 font-medium">
                    Official Tax Invoice & Transaction Summary
                  </DialogDescription>
                </div>

                <Badge
                  variant="outline"
                  className="px-3 py-1 text-xs font-bold capitalize bg-emerald-500/20 text-emerald-400 border-emerald-500/40 rounded-full"
                >
                  {selectedSale.status}
                </Badge>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="space-y-4 py-3 text-xs">
              {/* Customer & Invoice Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Info Card */}
                <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF8C42] flex items-center gap-1">
                    <User className="h-3 w-3 text-[#E85002]" />
                    <span>Customer Info</span>
                  </div>
                  <p className="font-bold text-sm text-white">{selectedSale.customerName || "Walk-in Customer"}</p>
                  <p className="text-zinc-300 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-zinc-400" />
                    <span>{selectedSale.customerPhone || "N/A"}</span>
                  </p>
                  <p className="text-zinc-400 flex items-start gap-1 text-[11px] leading-tight">
                    <MapPin className="h-3 w-3 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{selectedSale.customerAddress || "DB PRIDE TALAWALI CHANDA INDORE"}</span>
                  </p>
                </div>

                {/* Transaction Metadata Card */}
                <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF8C42] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#E85002]" />
                    <span>Bill Details</span>
                  </div>
                  <div className="space-y-1 text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Date:</span>
                      <span className="font-mono text-white">
                        {selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Cashier:</span>
                      <span className="text-white">{selectedSale.cashierName || "System Admin"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Payment Mode:</span>
                      <span className="font-mono uppercase font-bold text-emerald-400">
                        {selectedSale.payments?.[0]?.method || "CASH"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchased Items Table */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Purchased Items ({selectedSale.items?.length || 0})
                </div>
                <div className="divide-y divide-white/10">
                  {(selectedSale.items || []).map((it, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs px-1">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">{it.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                          <span>SKU: {it.sku || "N/A"}</span>
                          <span>•</span>
                          <span>Qty: {it.quantity}</span>
                          <span>•</span>
                          <span>Price: ₹{it.price}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#FF8C42]">
                        ₹{(it.price * it.quantity * (1 - (it.discount || 0) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals Card */}
              <div className="bg-[#2C1810]/80 border border-[#723C1A]/40 rounded-2xl p-4 space-y-2">
                <div className="space-y-1.5 font-mono text-xs text-zinc-300">
                  <div className="flex justify-between">
                    <span>Taxable Value (Subtotal):</span>
                    <span className="font-semibold text-white">₹{Number(selectedSale.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span>-₹{Number(selectedSale.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-400">
                    <span>GST Amount (3% Tax):</span>
                    <span>₹{Number(selectedSale.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-base font-black text-white">
                    <span>Grand Total:</span>
                    <span className="text-xl font-mono font-bold text-[#FF8C42] drop-shadow-sm">
                      ₹{Number(selectedSale.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteSale(selectedSale.id || selectedSale._id, selectedSale.invoiceNumber)}
                className="w-full sm:w-auto h-10 px-4 font-bold text-xs rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 border border-red-500/40"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Record</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                  className="h-10 px-5 font-bold text-xs rounded-xl border-white/20 bg-black/40 text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  Close
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    handlePrint(selectedSale);
                    setIsPreviewOpen(false);
                  }}
                  className="h-10 px-6 font-black text-xs tracking-wide rounded-xl bg-gradient-to-r from-[#723C1A] via-[#C1440E] to-[#E85002] hover:from-[#C1440E] hover:to-[#723C1A] text-white shadow-lg shadow-[#723C1A]/40 border border-[#FF8C42]/40 flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Thermal Receipt</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
