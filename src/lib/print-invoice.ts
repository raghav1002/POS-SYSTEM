import type { CartItem } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReceiptData {
  storeName?: string;
  storeTagline?: string;
  website?: string;
  email?: string;
  storeAddress?: string;
  storePhone?: string;
  gstin?: string;
  hsnCode?: string;
  invoiceNumber: string;
  date: string;
  cashier?: string;
  customer?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  shipmentAddress?: string;
  items: CartItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  taxRate?: number;
  total: number;
  paymentMethod?: string;
  payments?: { method: string; amount: number; reference?: string }[];
  tenderedAmount?: number;
  changeAmount?: number;
  footer?: string;
  currencySymbol?: string;
  paperWidth?: "58mm" | "80mm";
}

export function generateThermalReceiptHTML(data: ReceiptData): string {
  const sym = data.currencySymbol ?? "₹";
  const fmt = (n: number) => `${sym}${n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
  const paper = data.paperWidth ?? "80mm";
  const bodyWidth = paper === "58mm" ? "48mm" : "72mm";
  const pixelWidth = paper === "58mm" ? "240px" : "310px";

  const storeTitle = (data.storeName || "TIPASH LUXURIES").toUpperCase().split("").join(" ");
  const tagline = data.storeTagline || "SHINE BOLD SHINE TIPASH";
  const website = data.website || "tipashluxuries.com";
  const email = data.email || "assist@tipashluxuries.com";
  const hsn = data.hsnCode || "7117";
  const gstin = data.gstin || "23AALCT4947P1ZL";

  const customerName = data.customerName || data.customer || "shivamlalwani";
  const customerPhone = data.customerPhone || "9404079139";
  const address = data.customerAddress || "DB PRIDE TALAWALI CHANDA INDORE";
  const shipmentAddr = data.shipmentAddress || address;
  const paymentMode = (data.paymentMethod || data.payments?.[0]?.method || "CASH").toUpperCase();

  const itemsHtml = data.items
    .map((item) => {
      const itemHsn = item.barcode || hsn;
      const rateStr = `${sym}${item.price}`;
      const amountStr = `${sym}${item.price * item.quantity}`;
      return `
      <tr>
        <td colspan="4" style="font-weight:700;padding-top:4px;word-break:break-word">${item.name}</td>
      </tr>
      <tr>
        <td style="font-size:10px;padding-bottom:2px">HSN: ${itemHsn}</td>
        <td style="text-align:center;vertical-align:top;font-weight:700">${item.quantity}</td>
        <td style="text-align:right;vertical-align:top;font-weight:700">${rateStr}</td>
        <td style="text-align:right;vertical-align:top;font-weight:700">${amountStr}</td>
      </tr>`;
    })
    .join("");

  const calculatedGstPct = (data.taxRate ?? (data.subtotal > 0 ? Math.round((data.tax / data.subtotal) * 100) : 3)) || 3;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${data.invoiceNumber}</title>
  <style>
    @media print {
      @page { size: ${paper} auto; margin: 0; }
      body { width: ${bodyWidth}; margin: 0 auto; padding: 2px; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: ${pixelWidth};
      margin: 0 auto;
      padding: 8px 12px;
      color: #000;
      background: #fff;
      line-height: 1.35;
      font-weight: 600;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .title { font-size: 15px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px; }
    .tagline { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; text-transform: uppercase; }
    .contact { font-size: 10px; font-weight: 600; }
    
    .divider-solid { border-top: 2px solid #000; margin: 6px 0; }
    .divider-dashed { border-top: 1px dashed #000; margin: 6px 0; }

    .meta-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .meta-table td { padding: 1.5px 0; font-size: 11px; vertical-align: top; }
    .meta-label { font-weight: 600; text-align: left; width: 35%; }
    .meta-val { font-weight: 700; text-align: right; width: 65%; word-break: break-word; }

    .item-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .item-table th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; font-size: 11px; font-weight: 700; }

    .totals-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .totals-table td { padding: 2px 0; font-size: 11px; }

    .footer { text-align: center; font-size: 10px; margin-top: 10px; font-weight: 600; line-height: 1.4; }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="center title">${storeTitle}</div>
  <div class="center tagline">${tagline}</div>
  <div class="center contact">${website}</div>
  <div class="center contact">${email}</div>

  <div class="divider-solid"></div>

  <!-- METADATA TABLE -->
  <table class="meta-table">
    <tr><td class="meta-label">Bill No</td><td class="meta-val">${data.invoiceNumber}</td></tr>
    <tr><td class="meta-label">Date</td><td class="meta-val">${data.date}</td></tr>
    <tr><td class="meta-label">HSN Code</td><td class="meta-val">${hsn}</td></tr>
    ${customerName ? `<tr><td class="meta-label">Customer</td><td class="meta-val">${customerName}</td></tr>` : ""}
    ${customerPhone ? `<tr><td class="meta-label">Phone</td><td class="meta-val">${customerPhone}</td></tr>` : ""}
    ${address ? `<tr><td class="meta-label">Address</td><td class="meta-val">${address}</td></tr>` : ""}
    <tr><td class="meta-label">GST No</td><td class="meta-val">${gstin}</td></tr>
    ${shipmentAddr ? `<tr><td class="meta-label">Shipment Addr</td><td class="meta-val">${shipmentAddr}</td></tr>` : ""}
  </table>

  <div class="divider-dashed"></div>

  <!-- ITEMS TABLE -->
  <table class="item-table">
    <thead>
      <tr>
        <th style="text-align:left;width:45%">ITEM</th>
        <th style="text-align:center;width:15%">QTY</th>
        <th style="text-align:right;width:20%">RATE</th>
        <th style="text-align:right;width:20%">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider-dashed"></div>

  <!-- TOTALS -->
  <table class="totals-table">
    <tr>
      <td>Subtotal</td>
      <td style="text-align:right;font-weight:700">${fmt(data.subtotal)}</td>
    </tr>
    <tr>
      <td>GST (Incl. ${calculatedGstPct}%)</td>
      <td style="text-align:right;font-weight:700">${fmt(data.tax)}</td>
    </tr>
  </table>

  <div style="border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;margin:4px 0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:13px;font-weight:900">TOTAL</span>
    <span style="font-size:14px;font-weight:900">${fmt(data.total)}</span>
  </div>

  <table class="totals-table">
    <tr>
      <td>Payment Mode</td>
      <td style="text-align:right;font-weight:700">${paymentMode}</td>
    </tr>
  </table>

  <div class="divider-dashed"></div>

  <!-- FOOTER -->
  <div class="footer">
    <div>Thank you for shopping with us!</div>
    <div style="font-size:12px;font-weight:900;letter-spacing:1px;margin:3px 0">${storeTitle}</div>
    <div style="font-size:9px">* HSN Code: ${hsn} | Inclusive of applicable GST</div>
    <div style="margin-top:14px;letter-spacing:2px;font-size:10px">- - - - C U T - - - -</div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export function printThermalReceipt(data: ReceiptData) {
  const html = generateThermalReceiptHTML(data);
  const win = window.open("", "_blank", "width=380,height=680");
  if (!win) {
    alert("Please allow popups to print receipts");
    return;
  }
  win.document.write(html);
  win.document.close();
}

export function downloadDigitalBill(data: ReceiptData) {
  const sym = "Rs."; // Use clean Rs. symbol to prevent Type1 Courier font '¹' character corruption
  const fmt = (n: number) => `${sym}${n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

  const storeTitle = (data.storeName || "TIPASH LUXURIES").toUpperCase().split("").join(" ");
  const tagline = data.storeTagline || "SHINE BOLD SHINE TIPASH";
  const website = data.website || "tipashluxuries.com";
  const email = data.email || "assist@tipashluxuries.com";
  const hsn = data.hsnCode || "7117";
  const gstin = data.gstin || "23AALCT4947P1ZL";

  const customerName = data.customerName || data.customer || "N/A";
  const customerPhone = data.customerPhone || "N/A";
  const address = data.customerAddress || "DB PRIDE TALAWALI CHANDA INDORE";
  const shipmentAddr = data.shipmentAddress || address;
  const paymentMode = (data.paymentMethod || data.payments?.[0]?.method || "CASH").toUpperCase();

  // Create 80mm wide thermal receipt PDF with 5mm page margins
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 210],
  });

  doc.setFont("courier", "normal");
  doc.setTextColor(0, 0, 0);

  let y = 8;
  const leftX = 5;
  const rightX = 75;
  const centerX = 40;

  // 1. Header
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.text(storeTitle, centerX, y, { align: "center" });
  y += 4;

  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.text(tagline, centerX, y, { align: "center" });
  y += 3.5;
  doc.text(website, centerX, y, { align: "center" });
  y += 3.5;
  doc.text(email, centerX, y, { align: "center" });
  y += 4;

  // Solid Line
  doc.setLineWidth(0.3);
  doc.line(leftX, y, rightX, y);
  y += 4;

  // 2. Metadata Table
  doc.setFontSize(7.5);
  const addMetaRow = (label: string, val: string) => {
    doc.setFont("courier", "bold");
    doc.text(label, leftX, y);
    doc.setFont("courier", "normal");
    const splitVal = doc.splitTextToSize(val, 36);
    doc.text(splitVal, rightX, y, { align: "right" });
    y += Math.max(splitVal.length * 3.2, 3.8);
  };

  addMetaRow("Bill No", data.invoiceNumber);
  addMetaRow("Date", data.date);
  addMetaRow("HSN Code", hsn);
  if (customerName) addMetaRow("Customer", customerName);
  if (customerPhone) addMetaRow("Phone", customerPhone);
  if (address) addMetaRow("Address", address);
  addMetaRow("GST No", gstin);
  if (shipmentAddr) addMetaRow("Shipment Addr", shipmentAddr);

  y += 1;
  // Dashed Line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftX, y, rightX, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // 3. Items Table Header
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.text("ITEM", leftX, y);
  doc.text("QTY", 38, y, { align: "center" });
  doc.text("RATE", 56, y, { align: "right" });
  doc.text("AMOUNT", rightX, y, { align: "right" });
  y += 2.5;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftX, y, rightX, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // 4. Items Table Rows
  data.items.forEach((item) => {
    const itemHsn = item.barcode || hsn;
    const rateStr = `${sym}${item.price}`;
    const amountStr = `${sym}${item.price * item.quantity}`;

    doc.setFont("courier", "bold");
    const nameLines = doc.splitTextToSize(item.name, 68);
    doc.text(nameLines, leftX, y);
    y += nameLines.length * 3.2;

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.text(`HSN: ${itemHsn}`, leftX, y);
    doc.text(String(item.quantity), 38, y, { align: "center" });
    doc.text(rateStr, 56, y, { align: "right" });
    doc.text(amountStr, rightX, y, { align: "right" });
    y += 4;
  });

  // Dashed Line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftX, y, rightX, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // 5. Totals
  doc.setFontSize(7.5);
  doc.setFont("courier", "normal");
  doc.text("Subtotal", leftX, y);
  doc.setFont("courier", "bold");
  doc.text(fmt(data.subtotal), rightX, y, { align: "right" });
  y += 3.8;

  const calculatedGstPct = (data.taxRate ?? (data.subtotal > 0 ? Math.round((data.tax / data.subtotal) * 100) : 3)) || 3;
  doc.setFont("courier", "normal");
  doc.text(`GST (Incl. ${calculatedGstPct}%)`, leftX, y);
  doc.setFont("courier", "bold");
  doc.text(fmt(data.tax), rightX, y, { align: "right" });
  y += 3.5;

  // Double Solid Line
  doc.setLineWidth(0.4);
  doc.line(leftX, y, rightX, y);
  y += 4;

  doc.setFontSize(9);
  doc.setFont("courier", "bold");
  doc.text("TOTAL", leftX, y);
  doc.text(fmt(data.total), rightX, y, { align: "right" });
  y += 2.5;

  doc.line(leftX, y, rightX, y);
  doc.setLineWidth(0.2);
  y += 4;

  // Payment Mode
  doc.setFontSize(7.5);
  doc.setFont("courier", "normal");
  doc.text("Payment Mode", leftX, y);
  doc.setFont("courier", "bold");
  doc.text(paymentMode, rightX, y, { align: "right" });
  y += 4;

  // Dashed Line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftX, y, rightX, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // 6. Footer
  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.text("Thank you for shopping with us!", centerX, y, { align: "center" });
  y += 3.5;

  doc.setFontSize(8);
  doc.setFont("courier", "bold");
  doc.text(storeTitle, centerX, y, { align: "center" });
  y += 3.5;

  doc.setFontSize(6);
  doc.setFont("courier", "normal");
  doc.text(`* HSN Code: ${hsn} | Inclusive of applicable GST`, centerX, y, { align: "center" });
  y += 4.5;

  doc.setFontSize(7);
  doc.text("- - - - C U T - - - -", centerX, y, { align: "center" });

  doc.save(`Invoice-${data.invoiceNumber}.pdf`);
}
