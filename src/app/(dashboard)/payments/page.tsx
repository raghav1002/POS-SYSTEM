"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { QrCode, Upload, Save, RefreshCw, CheckCircle2, ShieldCheck, CreditCard, Image as ImageIcon, Trash2, ScanLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { scanQrCodeFromImageUrl, generateCleanQrCodeUrl, isValidUpiVpa, formatUpiVpa, buildUpiPayUrl } from "@/lib/qr-decoder";

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Payment System Settings State
  const [enableUpi, setEnableUpi] = useState(true);
  const [enableCash, setEnableCash] = useState(true);
  const [upiId, setUpiId] = useState("store@upi");
  const [merchantName, setMerchantName] = useState("RetailPOS Store");
  const [upiQrCode, setUpiQrCode] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("Scan QR code using Google Pay, PhonePe, Paytm or any UPI app.");

  // Store General Settings Cache
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        setFullSettings(d);
        if (d.upiId !== undefined) setUpiId(d.upiId || "");
        if (d.merchantName !== undefined) setMerchantName(d.merchantName || "RetailPOS Store");
        if (d.upiQrCode !== undefined) setUpiQrCode(d.upiQrCode || "");
        if (d.enableUpi !== undefined) setEnableUpi(d.enableUpi !== false);
        if (d.enableCash !== undefined) setEnableCash(d.enableCash !== false);
        if (d.paymentNotes !== undefined) setPaymentNotes(d.paymentNotes || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && (json.url || json.data?.url)) {
        const uploadedUrl = json.url || json.data.url;
        setUpiQrCode(uploadedUrl);
        toast.success("UPI QR Poster uploaded successfully!");
      } else {
        toast.error(json.error || "Failed to upload QR Code image");
      }
    } catch (err) {
      console.error("QR Upload Error:", err);
      toast.error("Error uploading QR image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const formattedVpa = formatUpiVpa(upiId);
    setUpiId(formattedVpa);

    try {
      const payload = {
        ...fullSettings,
        upiId: formattedVpa,
        merchantName: merchantName.trim(),
        upiQrCode: upiQrCode.trim(),
        enableUpi,
        enableCash,
        paymentNotes: paymentNotes.trim(),
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Payment System settings saved successfully!");
      } else {
        toast.error(json.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save Error:", err);
      toast.error("Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  const dynamicQrUrl = upiId
    ? generateCleanQrCodeUrl(
        buildUpiPayUrl({ vpa: upiId, merchantName })
      )
    : "";

  return (
    <DashboardShell title="Payment Systems">
      <div className="space-y-6 pb-12">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E85002]/10 border border-[#E85002]/30 text-xs font-bold text-[#E85002]">
              <QrCode className="h-3.5 w-3.5" />
              <span>Operations • Payment Systems</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              UPI & Payment Gateway Settings
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Configure UPI payment rules, upload official store QR codes, and customize customer scanning previews.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            variant="brandGradient"
            size="lg"
            className="shrink-0 h-11 px-6 font-bold shadow-lg shadow-[#E85002]/20"
          >
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            <span>Save Payment Settings</span>
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 space-y-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#E85002]" />
            <p className="text-xs font-semibold">Loading payment configurations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: UPI FORM SETTINGS */}
            <div className="lg:col-span-7 space-y-6">
              {/* UPI CONFIGURATION CARD */}
              <Card className="bg-zinc-950/90 border-zinc-800/80 text-white shadow-xl">
                <CardHeader className="border-b border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#E85002]/15 text-[#E85002] border border-[#E85002]/30">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-extrabold text-white">UPI QR Code Configuration</CardTitle>
                        <CardDescription className="text-xs text-zinc-400">
                          Set up your store VPA ID, merchant name, and custom QR code image.
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="enable-upi" className="text-xs font-bold text-zinc-300">
                        Active
                      </Label>
                      <Switch
                        id="enable-upi"
                        checked={enableUpi}
                        onCheckedChange={setEnableUpi}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-6">
                  {/* UPI VPA ID */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-200">
                      Store UPI VPA ID <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. 9876543210@ybl or storename@icici"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className={`bg-zinc-900 border-zinc-800 text-white font-mono text-sm h-11 focus-visible:ring-[#E85002] ${
                        upiId && !upiId.includes("@") ? "border-amber-500/80 ring-1 ring-amber-500/50" : ""
                      }`}
                    />
                    <p className="text-[11px] text-zinc-500">
                      Direct Virtual Payment Address where customer payment funds will be routed. Must include an @ handle.
                    </p>

                    {/* VPA Warning Alert Banner when @ handle is missing */}
                    {upiId && !upiId.includes("@") && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Missing Banking Handle (@handle)</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          You entered <code className="font-mono text-white bg-black/60 px-1 py-0.5 rounded">{upiId}</code> without a bank handle (e.g. @ybl, @paytm, @okicici, @upi). Without a handle, payment apps like PhonePe and Google Pay will show <strong>"Unable to verify the QR code"</strong> error.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setUpiId(formatUpiVpa(upiId))}
                            className="h-7 px-3 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[11px] rounded-lg shadow"
                          >
                            Auto-Fix to: {formatUpiVpa(upiId)}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Merchant Payee Name */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-200">
                      Merchant Payee Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. RetailPOS Flagship Store"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white text-sm h-11 focus-visible:ring-[#E85002]"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Official registered store name displayed on PhonePe, Google Pay, or Paytm payment screens.
                    </p>
                  </div>

                  {/* Upload Custom QR Code Image */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <Label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                      <span>Upload Official Store UPI QR Code Image</span>
                      {upiQrCode && (
                        <button
                          type="button"
                          onClick={() => setUpiQrCode("")}
                          className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
                        >
                          <Trash2 className="h-3 w-3" /> Remove Custom QR
                        </button>
                      )}
                    </Label>

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-zinc-900/60 border border-dashed border-zinc-700/80">
                      {upiQrCode ? (
                        <div className="h-28 w-28 rounded-lg bg-white p-1 shrink-0 border border-zinc-700 relative overflow-hidden group">
                          <img
                            src={upiQrCode}
                            alt="Store Custom UPI QR Code"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-28 w-28 rounded-lg bg-zinc-800/80 border border-zinc-700 flex flex-col items-center justify-center text-zinc-500 shrink-0">
                          <ImageIcon className="h-8 w-8 mb-1" />
                          <span className="text-[10px]">No Custom QR</span>
                        </div>
                      )}

                      <div className="space-y-2 flex-1 text-center sm:text-left">
                        <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                          Upload your bank-issued static QR poster (PhonePe, Google Pay, BharatPe, Paytm).
                        </p>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleQrUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploading}
                              className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-bold pointer-events-none"
                            >
                              {uploading ? (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin text-[#E85002]" />
                              ) : (
                                <Upload className="mr-1.5 h-3.5 w-3.5 text-[#E85002]" />
                              )}
                              <span>{uploading ? "Uploading..." : "Upload QR Image"}</span>
                            </Button>
                          </label>
                        </div>
                        <p className="text-[10px] text-zinc-500">Supports PNG, JPG, WebP formats (Max 5MB)</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Payment Notes */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <Label className="text-xs font-bold text-zinc-200">
                      Customer Payment Instructions
                    </Label>
                    <Textarea
                      placeholder="Enter instructional notes shown to customers during UPI checkout..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      className="bg-zinc-900 border-zinc-800 text-white text-xs leading-relaxed focus-visible:ring-[#E85002]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* CASH PAYMENT STATUS CARD */}
              <Card className="bg-zinc-950/90 border-zinc-800/80 text-white shadow-xl">
                <CardHeader className="py-4 border-b border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-5 w-5 text-emerald-500" />
                      <div>
                        <CardTitle className="text-sm font-extrabold text-white">Cash Payment Status</CardTitle>
                        <CardDescription className="text-xs text-zinc-400">
                          Toggle physical Cash tender option availability at checkout.
                        </CardDescription>
                      </div>
                    </div>

                    <Switch
                      id="enable-cash"
                      checked={enableCash}
                      onCheckedChange={setEnableCash}
                    />
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* RIGHT COLUMN: LIVE CUSTOMER SCANNING PREVIEW */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="bg-zinc-950/90 border-zinc-800/80 text-white shadow-xl sticky top-20">
                <CardHeader className="border-b border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-[#E85002]" />
                      <CardTitle className="text-base font-extrabold text-white">
                        Customer Checkout Preview
                      </CardTitle>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      LIVE DISPLAY
                    </span>
                  </div>
                  <CardDescription className="text-xs text-zinc-400">
                    Exact UPI QR Code representation rendered to customers when selecting UPI payment.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 text-center space-y-5">
                  {/* Frosted Preview Box */}
                  <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 rounded-2xl border border-zinc-800/80 shadow-2xl space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Scan & Pay via UPI</p>
                      <p className="text-sm font-extrabold text-white">{merchantName || "RetailPOS Store"}</p>
                    </div>

                    {/* Active Displayed QR Code */}
                    <div className="mx-auto w-52 h-52 bg-white rounded-2xl p-2.5 shadow-xl border-4 border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                      {upiQrCode ? (
                        <img
                          src={upiQrCode}
                          alt="Store UPI QR Code"
                          className="h-full w-full object-contain"
                        />
                      ) : dynamicQrUrl ? (
                        <img
                          src={dynamicQrUrl}
                          alt="Dynamic UPI QR Code"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="p-4 text-center text-zinc-400 space-y-1">
                          <QrCode className="mx-auto h-10 w-10 text-zinc-500" />
                          <p className="text-xs font-bold">Enter Store UPI VPA ID</p>
                        </div>
                      )}
                    </div>



                    {/* VPA ID Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 border border-zinc-700 text-xs font-mono font-bold text-white">
                      <span>VPA: {upiId || "Not configured"}</span>
                    </div>

                    {/* Instructional Notes */}
                    <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
                      {paymentNotes || "Scan QR code using Google Pay, PhonePe, Paytm or any BHIM UPI app"}
                    </p>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM UPI</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
