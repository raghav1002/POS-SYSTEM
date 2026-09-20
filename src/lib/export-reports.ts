import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ReportRow {
  [key: string]: string | number;
}

export function exportToPDF(
  title: string,
  columns: string[],
  rows: ReportRow[],
  filename: string
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  autoTable(doc, {
    head: [columns],
    body: rows.map((row) => columns.map((col) => String(row[col] ?? ""))),
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [5, 150, 105] },
  });

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(
  sheetName: string,
  columns: string[],
  rows: ReportRow[],
  filename: string
) {
  const data = rows.map((row) => {
    const entry: Record<string, string | number> = {};
    columns.forEach((col) => {
      entry[col] = row[col] ?? "";
    });
    return entry;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(
  columns: string[],
  rows: ReportRow[],
  filename: string
) {
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns.map((col) => `"${String(row[col] ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSalesGSTExcel(sales: any[], filename = "GST_Sales_Report") {
  const data = sales.map((sale) => {
    const createdAtDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
    const day = String(createdAtDate.getDate()).padStart(2, "0");
    const month = createdAtDate.toLocaleString("en-US", { month: "short" });
    const year = createdAtDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const items = sale.items || [];
    const productNames = items.map((it: any) => it.name).filter(Boolean).join(", ") || "General Item";
    const hsnCode = items[0]?.barcode || items[0]?.sku || "7117";

    const taxableValue = Math.round((Number(sale.subtotal) || 0) * 100) / 100;
    const totalGst = Math.round((Number(sale.tax) || 0) * 100) / 100;
    const cgst = Math.round((totalGst / 2) * 100) / 100;
    const sgst = Math.round((totalGst - cgst) * 100) / 100;
    const igst = 0;
    const discount = Math.round((Number(sale.discount) || 0) * 100) / 100;
    const totalInvoiceVal = Math.round((Number(sale.total) || (taxableValue + totalGst - discount)) * 100) / 100;

    return {
      "Invoice No": sale.invoiceNumber || sale.id || sale._id,
      "Invoice Date": formattedDate,
      "Product Name(s)": productNames,
      "HSN Code": hsnCode,
      "Customer Name": sale.customerName || "N/A",
      "Customer Email": sale.customerEmail || "assist@tipashluxuries.com",
      "Phone Number": sale.customerPhone || "N/A",
      "Full Address": sale.customerAddress || "DB PRIDE TALAWALI CHANDA INDORE",
      "Place of Supply (State)": sale.customerState || "Maharashtra",
      "Taxable Value (INR)": taxableValue,
      "GST Rate": "3%",
      "CGST Amount (INR)": cgst,
      "SGST Amount (INR)": sgst,
      "IGST Amount (INR)": igst,
      "Total GST (INR)": totalGst,
      "Discount Amount": discount,
      "Total Invoice Value (INR)": totalInvoiceVal,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Set explicit column widths for perfect Excel visual layout
  ws["!cols"] = [
    { wch: 22 }, // Invoice No
    { wch: 15 }, // Invoice Date
    { wch: 35 }, // Product Name(s)
    { wch: 12 }, // HSN Code
    { wch: 20 }, // Customer Name
    { wch: 28 }, // Customer Email
    { wch: 15 }, // Phone Number
    { wch: 35 }, // Full Address
    { wch: 22 }, // Place of Supply (State)
    { wch: 20 }, // Taxable Value (INR)
    { wch: 10 }, // GST Rate
    { wch: 18 }, // CGST Amount (INR)
    { wch: 18 }, // SGST Amount (INR)
    { wch: 18 }, // IGST Amount (INR)
    { wch: 16 }, // Total GST (INR)
    { wch: 16 }, // Discount Amount
    { wch: 22 }, // Total Invoice Value (INR)
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GST Sales History");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

