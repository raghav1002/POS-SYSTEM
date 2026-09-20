import { adminDb } from "../src/lib/firebase/admin";
import { readLocalCollection, setLocalDoc } from "../src/lib/tenant-store";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

async function generateSampleWebp(title: string, subtitle: string, bgColor: string, accentColor: string): Promise<Buffer> {
  const svg = `
  <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor}" />
        <stop offset="100%" stop-color="#090d16" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}" />
        <stop offset="100%" stop-color="#f97316" />
      </linearGradient>
    </defs>
    <rect width="800" height="800" rx="32" fill="url(#bg)"/>
    <circle cx="400" cy="350" r="160" fill="${accentColor}" opacity="0.15" />
    <circle cx="400" cy="350" r="120" stroke="url(#accent)" stroke-width="4" fill="none" />
    <path d="M 360 310 L 440 310 L 440 390 L 360 390 Z" fill="none" stroke="${accentColor}" stroke-width="6" stroke-linejoin="round" />
    <circle cx="400" cy="350" r="24" fill="url(#accent)" />
    <text x="400" y="560" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="400" y="610" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#94a3b8" text-anchor="middle">${subtitle}</text>
  </svg>
  `;

  return sharp(Buffer.from(svg))
    .webp({ quality: 90 })
    .toBuffer();
}

async function repairImages() {
  console.log("=== Repairing Product Images ===");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  // 1. Generate WebP files for missing test product images
  const prodImgBuf = await generateSampleWebp("RetailPOS Product", "Verified Quality Item", "#1e293b", "#3b82f6");
  const teaImgBuf = await generateSampleWebp("Organic Green Tea", "Premium Herbal Selection", "#064e3b", "#10b981");

  const testProductPath = path.join(uploadsDir, "test-product.webp");
  const testTeaPath = path.join(uploadsDir, "test-tea.webp");

  await fs.writeFile(testProductPath, prodImgBuf);
  await fs.writeFile(testTeaPath, teaImgBuf);
  console.log("✓ Created WebP images in public/uploads/");

  // 2. Repair Firestore and Local JSON product records
  const tenantId = "default";
  const repoCol = adminDb.collection("tenants").doc(tenantId).collection("products");

  const updates = [
    { id: "IwIpXuYzcvoXpPAQSuEE", imagePath: "/uploads/test-product.webp" },
    { id: "xWnBINC7rPKZG46l7ixT", imagePath: "/uploads/test-product.webp" },
    { id: "b1fj0U7Yk06L5aEuLhxP", imagePath: "/uploads/test-tea.webp" },
  ];

  for (const item of updates) {
    // Update Firestore
    try {
      await repoCol.doc(item.id).update({
        images: [item.imagePath],
        updatedAt: new Date().toISOString(),
      });
      console.log(`✓ Updated Firestore document ${item.id} -> ${item.imagePath}`);
    } catch (err) {
      console.warn(`Firestore update for ${item.id} skipped/deferred:`, err);
    }

    // Update local JSON store
    const localStore = readLocalCollection<Record<string, unknown>>(tenantId, "products");
    const foundDoc = localStore.find((p: Record<string, unknown>) => p._id === item.id || p.id === item.id);
    if (foundDoc) {
      foundDoc.images = [item.imagePath];
      foundDoc.updatedAt = new Date().toISOString();
      setLocalDoc(tenantId, "products", item.id, foundDoc);
      console.log(`✓ Updated local JSON store document ${item.id}`);
    }
  }

  console.log("\n=== Product Image Repair Completed Successfully ===");
}

repairImages().catch(console.error);
