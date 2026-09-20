import fs from "fs";
import path from "path";

// Load .env.local
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, "\n");
      process.env[key] = val;
    }
  }
} catch (e) {
  console.error("Failed to load .env.local", e);
}

async function auditProductImages() {
  const { ProductRepository } = await import("../src/repositories/product.repository");
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
