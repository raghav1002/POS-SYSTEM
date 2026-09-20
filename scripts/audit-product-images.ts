/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductRepository } from "../src/repositories/product.repository";
import fs from "fs";
import path from "path";

async function auditProductImages() {
  console.log("=== Auditing Firestore Product Images (Read Only) ===");
  const repo = new ProductRepository();
  const tenantId = "default";

  const result = await repo.paginate({ limit: 100 }, tenantId);
  console.log(`Total Products Found: ${result.items.length}`);

  const auditReport = [];

  for (const product of result.items) {
    const mainImgUrl = product.images?.[0] || product.image?.url || "N/A";
    const mainImgPath = product.image?.path || "N/A";
    const thumbUrl = product.thumbnail?.url || "N/A";
    const thumbPath = product.thumbnail?.path || "N/A";

    let localMainExists = false;
    let localThumbExists = false;

    if (mainImgUrl.startsWith("/public/uploads/")) {
      const relPath = mainImgUrl.replace("/public/uploads/", "public/uploads/");
      localMainExists = fs.existsSync(path.join(process.cwd(), relPath));
    } else if (mainImgUrl.startsWith("/uploads/")) {
      const relPath = mainImgUrl.replace("/uploads/", "public/uploads/");
      localMainExists = fs.existsSync(path.join(process.cwd(), relPath));
    }

    if (thumbUrl.startsWith("/public/uploads/")) {
      const relPath = thumbUrl.replace("/public/uploads/", "public/uploads/");
      localThumbExists = fs.existsSync(path.join(process.cwd(), relPath));
    } else if (thumbUrl.startsWith("/uploads/")) {
      const relPath = thumbUrl.replace("/uploads/", "public/uploads/");
      localThumbExists = fs.existsSync(path.join(process.cwd(), relPath));
    }

    const itemAudit = {
      id: product._id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "N/A",
      mainImgUrl,
      mainImgPath,
      thumbUrl,
      thumbPath,
      localMainExists,
      localThumbExists,
      isUnsplashUrl: mainImgUrl.includes("unsplash.com"),
    };

    auditReport.push(itemAudit);
    console.log(`\nProduct: "${product.name}" (ID: ${product._id})`);
    console.log(`  SKU: ${product.sku} | Barcode: ${product.barcode}`);
    console.log(`  Main Image URL: ${mainImgUrl}`);
    console.log(`  Main Image Path: ${mainImgPath}`);
    console.log(`  Thumbnail URL: ${thumbUrl}`);
    console.log(`  Thumbnail Path: ${thumbPath}`);
    console.log(`  Local File Exists? Main: ${localMainExists}, Thumb: ${localThumbExists}`);
    console.log(`  Unsplash URL? ${itemAudit.isUnsplashUrl}`);
  }

  console.log("\n=== Audit Complete ===");
}

auditProductImages().catch(console.error);
