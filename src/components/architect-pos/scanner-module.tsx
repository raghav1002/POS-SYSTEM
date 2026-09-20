"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Scan,
  Camera,
  Zap,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Printer,
  User,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  Minus,
  ShoppingBag,
  RefreshCw,
  PackageCheck,
  Maximize2,
  QrCode,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CameraBarcodeScanner } from "@/components/pos/camera-barcode-scanner";
import { printThermalReceipt, downloadDigitalBill, ReceiptData } from "@/lib/print-invoice";
import { toast } from "sonner";
import { generateCleanQrCodeUrl, buildUpiPayUrl } from "@/lib/qr-decoder";

export interface ScannedProduct {
  _id: string;
  id: string;
  name: string;
  sellingPrice: number;
  stock: number;
  images: string[];
  image?: { url: string };
  thumbnail?: { url: string };
  sku: string;
  barcode?: string;
  description?: string;
}

export interface CompletedOrder {
  invoiceNumber: string;
  date: string;
  product: ScannedProduct;
  quantity: number;
  subtotal: number;
  tax: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  paymentMethod: string;
}

export function ScannerModule() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  // Step 2 State (Scanned Product & Customer Form)
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [fullImageOpen, setFullImageOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [upiSettings, setUpiSettings] = useState<{
    upiId: string;
    merchantName: string;
    upiQrCode: string;
    paymentNotes: string;
  }>({
    upiId: "store@upi",
    merchantName: "RetailPOS Store",
    upiQrCode: "",
    paymentNotes: "Scan QR code using Google Pay, PhonePe, Paytm or BHIM UPI app.",
  });

  // Fetch Public Payment Gateway & Store Settings
  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setUpiSettings({
            upiId: json.data.upiId || "store@upi",
            merchantName: json.data.merchantName || "RetailPOS Store",
            upiQrCode: json.data.upiQrCode || "",
            paymentNotes: json.data.paymentNotes || "Scan QR code using Google Pay, PhonePe, Paytm or BHIM UPI app.",
          });
        }
      })
      .catch((err) => {
        console.warn("Public settings fetch deferred:", err);
      });
  }, []);

  // Escape Key listener for Fullscreen Image Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullImageOpen(false);
      }
    };
    if (fullImageOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullImageOpen]);

  // Step 3 State (Completed Order & Receipt)
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [isTorn, setIsTorn] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Function to process scanned barcode and fetch product without redirecting to admin
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    const cleanCode = (barcode || "").trim();
    if (!cleanCode) return;

    setIsScanning(true);
    toast.info(`Searching product for code: ${cleanCode}...`);

    try {
      // Direct public API lookup by barcode
      const res = await fetch(`/api/products/public?barcode=${encodeURIComponent(cleanCode)}`);
      const json = await res.json();

      let found: ScannedProduct | null = null;
      if (json.success && json.data && json.data.length > 0) {
        found = json.data[0];
      } else {
        // Fallback: search query
        const resSearch = await fetch(`/api/products/public?search=${encodeURIComponent(cleanCode)}`);
        const jsonSearch = await resSearch.json();
        if (jsonSearch.success && jsonSearch.data && jsonSearch.data.length > 0) {
          found = jsonSearch.data[0];
        }
      }

      if (found) {
        setScannedProduct(found);
        setQuantity(1);
        setStep(2); // Go directly to Next Part (Step 2) on the Home Page UI!
        toast.success(`Product Found: ${found.name}`);
      } else {
        toast.error(`No product found for barcode "${cleanCode}". Try scanning again or enter a valid barcode.`);
      }
    } catch (err) {
      console.error("Barcode lookup error:", err);
      toast.error("Failed to fetch product details. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Hardware Scanner Keydown Listener (Active during Step 1)
  useEffect(() => {
    if (step !== 1) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = "";
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
  }, [step, handleBarcodeScanned]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScanned(barcodeInput.trim());
    setBarcodeInput("");
  };

  const handleResetToScan = () => {
    setStep(1);
    setScannedProduct(null);
    setQuantity(1);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCompletedOrder(null);
    setIsTorn(false);
  };

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct) return;

    if (!customerName.trim()) {
      toast.error("Please enter Customer Name");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter Customer Phone Number");
      return;
    }

    const subtotal = scannedProduct.sellingPrice * quantity;
    const tax = Math.round(subtotal * 0.03 * 100) / 100; // 3% GST matching Tipash Luxuries bill template
    const total = subtotal + tax;

    const now = new Date();
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, "");
    const invNo = `TP-${dateCode}-${Math.floor(1000 + Math.random() * 9000)}`;

    const dateFormatted = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeFormatted = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
    const nowIso = `${dateFormatted}, ${timeFormatted}`;

    const order: CompletedOrder = {
      invoiceNumber: invNo,
      date: nowIso,
      product: scannedProduct,
      quantity,
      subtotal,
      tax,
      total,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim() || undefined,
      paymentMethod,
    };

    setCompletedOrder(order);
    setStep(3); // Advance to Step 3 (Receipt View) right on the home page UI

    // Save order to backend sales history database
    saveOrderToSalesHistory(order);
  };

  const saveOrderToSalesHistory = async (order: CompletedOrder) => {
    try {
      const payload = {
        id: order.invoiceNumber,
        invoiceNumber: order.invoiceNumber,
        items: [
          {
            productId: order.product.id || order.product._id,
            name: order.product.name,
            sku: order.product.sku || "SKU-GEN",
            price: order.product.sellingPrice,
            quantity: order.quantity,
            discount: 0,
            tax: order.tax,
            subtotal: order.subtotal,
            barcode: order.product.barcode || "7117",
          },
        ],
        subtotal: order.subtotal,
        discount: 0,
        tax: order.tax,
        total: order.total,
        payments: [
          {
            method: order.paymentMethod,
            amount: order.total,
          },
        ],
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerEmail: "assist@tipashluxuries.com",
        customerState: "Maharashtra",
        status: "completed",
        createdAt: new Date().toISOString(),
      };

      // 1. Try direct creation via /api/sales POST endpoint
      let res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // 2. Fallback to /api/sales/checkout POST endpoint
        res = await fetch("/api/sales/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saleId: order.invoiceNumber,
            items: payload.items,
            subtotal: order.subtotal,
            discount: 0,
            taxRate: 3,
            payments: payload.payments,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
          }),
        });
        json = await res.json().catch(() => null);
      }

      if (json?.success) {
        toast.success(`Sale ${order.invoiceNumber} saved to Sales History!`);
      }
    } catch (err) {
      console.error("Failed to save sale to history:", err);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedOrder) return;

    // Ensure order is saved when print button or ticket pass container is clicked
    saveOrderToSalesHistory(completedOrder);

    const receiptData: ReceiptData = {
      storeName: "TIPASH LUXURIES",
      storeTagline: "SHINE BOLD SHINE TIPASH",
      website: "tipashluxuries.com",
      email: "assist@tipashluxuries.com",
      hsnCode: "7117",
      gstin: "23AALCT4947P1ZL",
      invoiceNumber: completedOrder.invoiceNumber,
      date: completedOrder.date,
      cashier: "Homepage Console",
      customerName: completedOrder.customerName,
      customerPhone: completedOrder.customerPhone,
      customerAddress: completedOrder.customerAddress || "DB PRIDE TALAWALI CHANDA INDORE",
      shipmentAddress: completedOrder.customerAddress || "DB PRIDE TALAWALI CHANDA INDORE",
      items: [
        {
          productId: completedOrder.product.id || completedOrder.product._id,
          name: completedOrder.product.name,
          sku: completedOrder.product.sku,
          barcode: completedOrder.product.barcode || "7117",
          price: completedOrder.product.sellingPrice,
          quantity: completedOrder.quantity,
          discount: 0,
          tax: completedOrder.tax,
        },
      ],
      subtotal: completedOrder.subtotal,
      discount: 0,
      tax: completedOrder.tax,
      taxRate: 3,
      total: completedOrder.total,
      paymentMethod: completedOrder.paymentMethod,
      payments: [
        {
          method: completedOrder.paymentMethod.toUpperCase(),
          amount: completedOrder.total,
        },
      ],
    };

    printThermalReceipt(receiptData);
    downloadDigitalBill(receiptData);
    toast.success("Thermal print dialog opened & Digital Bill downloaded!");
  };

  return (
    <div className="w-full max-w-4xl mx-auto text-center relative z-20">
      {/* 1. HERO HEADLINE */}
      <div className="mb-1.5 lg:mb-2 space-y-0.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#723C1A]/30 bg-[#723C1A]/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#723C1A] shadow-md shadow-[#723C1A]/5">
          <span>RetailPOS Self-Service Terminal</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#2C1810] leading-tight drop-shadow-sm">
          {step === 1 && (
            <>
              READY TO <span className="bg-gradient-to-r from-[#723C1A] via-[#C1440E] to-[#E85002] bg-clip-text text-transparent">BILL</span>
            </>
          )}
          {step === 2 && (
            <>
              PRODUCT & <span className="bg-gradient-to-r from-[#723C1A] via-[#C1440E] to-[#E85002] bg-clip-text text-transparent">CUSTOMER</span>
            </>
          )}
          {step === 3 && (
            <>
              ORDER <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">CONFIRMED</span>
            </>
          )}
        </h1>

        <p className="text-[11px] sm:text-xs text-[#5C4033] max-w-lg mx-auto font-medium">
          {step === 1 && "Scan a product barcode to begin instant checkout without redirection."}
          {step === 2 && "Enter customer details and verify item summary to generate bill."}
          {step === 3 && "Thank you for your purchase! Print your receipt or start a new sale."}
        </p>
      </div>

      {/* 2. CENTRAL STEP CONTAINER */}
      <div className="relative w-full">
        <div className="w-full rounded-2xl sm:rounded-3xl border border-[#723C1A]/20 bg-[#2C1810]/90 backdrop-blur-2xl p-3 sm:p-5 lg:p-5 shadow-2xl shadow-[#2C1810]/40 text-white relative overflow-visible text-left">
          {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E85002]/20 rounded-full blur-3xl pointer-events-none" />

        {/* STEP 1: SCANNER VIEW */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            {/* Viewfinder Reticle Box */}
            <div className="relative mx-auto w-full max-w-md h-36 rounded-2xl border-2 border-dashed border-[#E85002]/60 bg-black/40 flex flex-col items-center justify-center p-4 overflow-hidden group">
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#E85002]" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#E85002]" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#E85002]" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#E85002]" />

              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FF3B00] to-transparent shadow-[0_0_12px_#FF3B00] animate-[bounce_2s_infinite]" />

              {isScanning ? (
                <RefreshCw className="h-10 w-10 text-[#E85002] mb-2 animate-spin" />
              ) : (
                <Scan className="h-10 w-10 text-[#E85002] mb-2 group-hover:scale-110 transition-transform animate-pulse" />
              )}

              <span className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">
                {isScanning ? "FETCHING PRODUCT DETAILS..." : "HARDWARE SCANNER ACTIVE"}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1">
                Point USB/Bluetooth handheld scanner or click camera below
              </span>
            </div>

            {/* SCAN BARCODE & CAMERA BUTTONS */}
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

            {/* MANUAL INPUT FIELD */}
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

            <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-400 pt-2 border-t border-white/10">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#E85002]" /> Instant Local Sync</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#E85002]" /> Thermal Receipt Ready</span>
            </div>
          </div>
        )}

        {/* STEP 2: NEXT PART UI (PRODUCT DETAILS & CUSTOMER INFO FORM) */}
        {step === 2 && scannedProduct && (
          <div className="space-y-6">
            {/* Step Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetToScan}
                className="border-white/20 bg-black/40 text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4 text-[#E85002]" />
                <span>Scan Different Item</span>
              </Button>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-[#E85002]/20 text-[#FF8C42] border border-[#E85002]/40 uppercase">
                  Step 2 of 2: Checkout
                </span>
              </div>
            </div>

            {/* Product & Customer Details Form */}
            <form onSubmit={handleCompleteOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* LEFT COLUMN: SCANNED PRODUCT SUMMARY CARD */}
              <div className="lg:col-span-5 bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                    <PackageCheck className="h-3.5 w-3.5 text-[#E85002]" />
                    <span>Scanned Product</span>
                  </div>

                  {/* Product Image (Click to View Full Screen) */}
                  <div
                    onClick={() => setFullImageOpen(true)}
                    title="Click to view image in full screen"
                    className="w-full h-32 sm:h-36 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-[#E85002]/80 flex items-center justify-center overflow-hidden mb-3 relative group cursor-pointer transition-all"
                  >
                    <img
                      src={
                        scannedProduct.thumbnail?.url ||
                        scannedProduct.image?.url ||
                        scannedProduct.images?.[0] ||
                        "/test-product.webp"
                      }
                      alt={scannedProduct.name}
                      className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-300 border border-white/15 z-10">
                      Stock: {scannedProduct.stock}
                    </div>

                    {/* Hover Fullscreen Overlay Hint */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-1 p-2">
                      <div className="p-2 rounded-full bg-[#E85002] text-white shadow-lg shadow-[#E85002]/40">
                        <Maximize2 className="h-4 w-4 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wide uppercase">Click for Fullscreen View</span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">{scannedProduct.name}</h3>

                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      SKU: {scannedProduct.sku}
                    </span>
                    {scannedProduct.barcode && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {scannedProduct.barcode}
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="text-2xl font-black font-mono text-[#FF8C42]">
                    ₹{scannedProduct.sellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <Label className="text-[11px] text-zinc-400 font-semibold">Item Quantity</Label>
                  <div className="flex items-center justify-between bg-zinc-900/90 border border-white/15 rounded-xl p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-7 w-7 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-mono font-bold text-base text-white px-3">{quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-7 w-7 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 pt-1">
                    <span>Item Subtotal:</span>
                    <span className="font-bold text-white text-xs sm:text-sm">
                      ₹{(scannedProduct.sellingPrice * quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: CUSTOMER DETAILS FORM */}
              <div className="lg:col-span-7 bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#E85002]" />
                    <span>Customer Information</span>
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 flex items-center gap-1 font-semibold">
                      <User className="h-3 w-3 text-[#E85002]" />
                      Customer Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="Enter customer full name..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="bg-zinc-900/90 border-white/20 text-white placeholder:text-zinc-500 font-medium text-xs sm:text-sm h-9 sm:h-10 rounded-xl focus-visible:ring-[#E85002]"
                    />
                  </div>

                  {/* Customer Phone Number */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-300 flex items-center gap-1 font-semibold">
                      <Phone className="h-3 w-3 text-[#E85002]" />
                      Customer Phone Number <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit mobile number..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="bg-zinc-900/90 border-white/20 text-white placeholder:text-zinc-500 font-mono text-xs sm:text-sm h-9 sm:h-10 rounded-xl focus-visible:ring-[#E85002]"
                    />
                  </div>

                  {/* Customer Address (OPTIONAL) */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 text-zinc-400" />
                      Address <span className="text-zinc-500 text-[10px] font-normal">(Optional)</span>
                    </Label>
                    <Input
                      placeholder="Enter street address, city, landmark (optional)..."
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="bg-zinc-900/90 border-white/15 text-white placeholder:text-zinc-500 text-xs sm:text-sm h-9 sm:h-10 rounded-xl focus-visible:ring-[#E85002]"
                    />
                  </div>

                  {/* Payment Method Tabs */}
                  <div className="space-y-1 pt-0.5">
                    <Label className="text-[11px] text-zinc-300 flex items-center gap-1 font-semibold">
                      <CreditCard className="h-3 w-3 text-[#E85002]" />
                      Payment Method
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["cash", "upi"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`h-9 rounded-xl font-bold text-xs uppercase tracking-wide border transition-all ${
                            paymentMethod === method
                              ? "bg-[#E85002] border-[#FF8C42] text-white shadow-lg shadow-[#E85002]/30"
                              : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-3 border-t border-white/10">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-11 sm:h-12 font-black text-xs sm:text-sm tracking-wide rounded-2xl bg-gradient-to-r from-[#723C1A] via-[#C1440E] to-[#E85002] hover:from-[#C1440E] hover:to-[#723C1A] text-white shadow-xl shadow-[#723C1A]/40 border border-[#FF8C42]/40 transition-all flex items-center justify-center gap-2 group"
                  >
                    <ShoppingBag className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                    <span>GENERATE BILL & CHECKOUT (₹{(scannedProduct.sellingPrice * quantity * 1.03).toLocaleString("en-IN", { maximumFractionDigits: 2 })})</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: ORDER SUCCESS & RECEIPT TICKET PASS VIEW ON HOMEPAGE */}
        {step === 3 && completedOrder && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-0.5">
              <h2 className="text-xl sm:text-2xl font-black text-white">Order Completed!</h2>
              <p className="text-[11px] font-mono text-emerald-400 font-bold">
                Invoice No: {completedOrder.invoiceNumber}
              </p>
            </div>

            {/* UIVERSE 3D TICKET PASS CONTAINER */}
            <div className="ticket-canvas">
              <div
                onClick={() => {
                  setIsTorn((prev) => !prev);
                  handlePrintReceipt();
                }}
                title="Click ticket pass to tear stub, launch thermal print & download digital bill"
                className={`ticket-wrapper cursor-pointer select-none transition-all ${
                  isTorn ? "is-torn" : ""
                }`}
              >
                <div className="ticket">
                  <div className="t-main">
                    <div className="t-content">
                      <div className="t-header">
                        <div className="t-logo">
                          RetailPOS
                        </div>
                        <div className="t-type">Receipt Pass</div>
                      </div>
                      <div className="t-title">Syntax<br />Error '26</div>
                      <div className="t-subtitle">Global Developer Conference</div>
                      <div className="t-details">
                        <div className="t-detail-item">
                          <span className="t-label">Name</span>
                          <span className="t-value">{completedOrder.customerName}</span>
                        </div>
                        <div className="t-detail-item">
                          <span className="t-label">Date</span>
                          <span className="t-value">{completedOrder.date}</span>
                        </div>
                        <div className="t-detail-item">
                          <span className="t-label">Venue</span>
                          <span className="t-value">{completedOrder.product.name} (x{completedOrder.quantity})</span>
                        </div>
                        <div className="t-detail-item">
                          <span className="t-label">Gateway</span>
                          <span className="t-value">{completedOrder.paymentMethod.toUpperCase()} • {completedOrder.customerPhone}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="t-perforation"
                      style={{ position: "absolute", bottom: 0, left: 0, width: "100%", transform: "translateY(50%)" }}
                    >
                      <div className="t-perf-line"></div>
                    </div>
                  </div>
                  <div className="t-stub">
                    <div className="t-barcode-container">
                      <div className="t-barcode"></div>
                      <div className="t-barcode-id">{completedOrder.invoiceNumber}</div>
                    </div>
                    <div className="t-admit">
                      <div className="t-admit-text">Total Paid</div>
                      <div className="t-admit-num">₹{completedOrder.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={handlePrintReceipt}
                className="w-full sm:w-auto h-11 px-6 font-bold text-xs sm:text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                <Printer className="h-4 w-4" />
                <span>Print Thermal Receipt</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={handleResetToScan}
                className="w-full sm:w-auto h-11 px-6 font-bold text-xs sm:text-sm rounded-xl border-white/20 bg-black/40 hover:bg-white/10 text-zinc-200 flex items-center justify-center gap-2"
              >
                <Scan className="h-4 w-4 text-[#E85002]" />
                <span>Scan Next Item</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDE OUTSIDE DOCKED UPI QR CODE CARD (DISPLAYED WHEN UPI IS SELECTED) */}
      {step === 2 && scannedProduct && paymentMethod === "upi" && (
        <div className="xl:absolute xl:left-full xl:ml-4 2xl:ml-6 xl:top-0 xl:w-72 w-full mt-4 xl:mt-0 p-4 sm:p-5 rounded-3xl bg-[#2C1810]/95 backdrop-blur-2xl border-2 border-[#E85002]/60 shadow-2xl shadow-black/80 space-y-3 text-center z-30 animate-in slide-in-from-right-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <div className="p-1 rounded-lg bg-[#E85002] text-white">
                <QrCode className="h-3.5 w-3.5" />
              </div>
              <span>Scan QR Code to Pay</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              ₹{(scannedProduct.sellingPrice * quantity * 1.03).toFixed(2)}
            </span>
          </div>

          {/* Display Uploaded Admin QR Image or Dynamic QR */}
          <div className="mx-auto w-36 h-36 sm:w-40 sm:h-40 bg-white rounded-2xl p-2 shadow-2xl border-4 border-[#E85002]/70 flex items-center justify-center relative overflow-hidden group">
            {upiSettings.upiQrCode ? (
              <img
                src={upiSettings.upiQrCode}
                alt="Store UPI QR Code"
                className="h-full w-full object-contain"
              />
            ) : (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  buildUpiPayUrl({
                    vpa: upiSettings.upiId,
                    merchantName: upiSettings.merchantName,
                    amount: (scannedProduct.sellingPrice * quantity * 1.03).toFixed(2),
                  })
                )}`}
                alt="Dynamic Store UPI QR Code"
                className="h-full w-full object-contain"
              />
            )}
          </div>

          {/* Payee Info */}
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-black text-white">{upiSettings.merchantName}</p>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 border border-zinc-700 text-[11px] font-mono font-bold text-[#FF8C42]">
              <span>UPI ID: {upiSettings.upiId}</span>
            </div>
          </div>

          {/* Payment Instructions */}
          <p className="text-[11px] text-zinc-300 leading-relaxed px-1 font-medium bg-black/40 p-2 rounded-xl border border-white/10">
            {upiSettings.paymentNotes}
          </p>

          <div className="pt-1.5 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
          </div>
        </div>
      )}
    </div>

      {/* CAMERA SCANNER MODAL */}
      <CameraBarcodeScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onScan={handleBarcodeScanned}
      />

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {fullImageOpen && scannedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setFullImageOpen(false)}
        >
          {/* Lightbox Top Header Bar */}
          <div className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-3">
              <span className="font-bold text-base sm:text-lg text-white drop-shadow-md">{scannedProduct.name}</span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#E85002]/20 text-[#FF8C42] border border-[#E85002]/40">
                ₹{scannedProduct.sellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFullImageOpen(false)}
              className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full border border-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Lightbox Center Image Container */}
          <div
            className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={
                scannedProduct.image?.url ||
                scannedProduct.images?.[0] ||
                scannedProduct.thumbnail?.url ||
                "/test-product.webp"
              }
              alt={scannedProduct.name}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl border border-white/20 shadow-2xl shadow-black/80"
            />
          </div>

          <div className="text-center space-y-1 mt-4">
            <p className="text-xs text-zinc-400 font-mono">
              SKU: {scannedProduct.sku} {scannedProduct.barcode ? `| Barcode: ${scannedProduct.barcode}` : ""}
            </p>
            <p className="text-[11px] text-zinc-500 font-medium">
              Click anywhere outside or press ESC to close full screen view
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
