import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getLocalDoc } from "@/lib/tenant-store";

export const runtime = "nodejs";

const defaultPublicSettings = {
  storeName: "RetailPOS Store",
  currencySymbol: "₹",
  taxRate: 3,
  taxName: "GST",
  gstin: "27AAAAA0000A1Z5",
  upiId: "store@upi",
  merchantName: "RetailPOS Store",
  upiQrCode: "",
  scannedQrPayload: "",
  cleanQrCode: "",
  enableUpi: true,
  enableCash: true,
  paymentNotes: "Scan QR code using Google Pay, PhonePe, Paytm or any UPI app",
};

export async function GET() {
  try {
    const tenantId = "default";

    try {
      const docRef = adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("settings")
        .doc("general");

      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data() || {};
        return NextResponse.json({
          success: true,
          data: {
            ...defaultPublicSettings,
            ...data,
          },
        });
      }
    } catch (dbErr) {
      console.warn("[Public Settings API] Cloud Firestore read deferred:", dbErr);
    }

    const local = getLocalDoc(tenantId, "settings", "general");
    if (local) {
      return NextResponse.json({
        success: true,
        data: {
          ...defaultPublicSettings,
          ...local,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: defaultPublicSettings,
    });
  } catch (error) {
    console.error("[Public Settings GET Error]:", error);
    return NextResponse.json({
      success: true,
      data: defaultPublicSettings,
    });
  }
}
