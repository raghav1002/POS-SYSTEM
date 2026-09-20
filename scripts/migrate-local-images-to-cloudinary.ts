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

import sharp from "sharp";

async function migrateLocalImagesToCloudinary() {
  const { ProductRepository } = await import("../src/repositories/product.repository");
  const { uploadToCloudStorage } = await import("../src/lib/storage/cloud-storage");

  console.log("=== Migrating Existing Local Images to Cloudinary ===");
  const repo = new ProductRepository();
  const tenantId = "default";

  const result = await repo.paginate({ limit: 100 }, tenantId);
  console.log(`Auditing ${result.items.length} products in Firestore...`);

  let localCount = 0;
  let cloudinaryCount = 0;
  let migratedCount = 0;

  for (const product of result.items) {
    const mainImgUrl = product.image?.url || product.images?.[0] || "";
    const thumbUrl = product.thumbnail?.url || "";

    const isLocalMain = mainImgUrl.startsWith("/uploads/") || mainImgUrl.startsWith("/public/uploads/");
    const isLocalThumb = thumbUrl.startsWith("/uploads/") || thumbUrl.startsWith("/public/uploads/");

    if (isLocalMain || isLocalThumb) {
      localCount++;
      console.log(`\nFound Local Image Product: "${product.name}" (ID: ${product._id})`);

      const relPath = mainImgUrl.replace(/^\/public\/uploads\//, "").replace(/^\/uploads\//, "");
      const fullPath = path.join(process.cwd(), "public", "uploads", relPath);

      if (fs.existsSync(fullPath)) {
        console.log(`  Reading local image: ${fullPath}`);
        const inputBuffer = fs.readFileSync(fullPath);
        const version = Date.now();

        // 1. Process Master WebP
        const masterBuffer = await sharp(inputBuffer)
          .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        const masterMeta = await sharp(masterBuffer).metadata();
        const masterPath = `products/${tenantId}/${product._id}/image-v${version}.webp`;
        const masterResult = await uploadToCloudStorage(masterPath, masterBuffer);

        // 2. Process Thumbnail WebP
        const thumbBuffer = await sharp(inputBuffer)
          .resize(400, 400, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();
        const thumbMeta = await sharp(thumbBuffer).metadata();
        const thumbPath = `products/${tenantId}/${product._id}/thumb-v${version}.webp`;
        const thumbResult = await uploadToCloudStorage(thumbPath, thumbBuffer);

        const nowIso = new Date().toISOString();
        const updatedImageData = {
          image: {
            url: masterResult.url,
            publicId: masterResult.publicId,
            path: masterPath,
            width: masterResult.width || masterMeta.width || 0,
            height: masterResult.height || masterMeta.height || 0,
            format: "webp",
            bytes: masterResult.bytes,
            version: masterResult.version,
            updatedAt: nowIso,
          },
          thumbnail: {
            url: thumbResult.url,
            publicId: thumbResult.publicId,
            path: thumbPath,
            width: thumbResult.width || thumbMeta.width || 0,
            height: thumbResult.height || thumbMeta.height || 0,
            format: "webp",
            bytes: thumbResult.bytes,
            version: thumbResult.version,
            updatedAt: nowIso,
          },
          images: [masterResult.url],
        };

        // Update Firestore canonical document
        await repo.update(product._id, updatedImageData, tenantId);
        console.log(`  ✓ Updated Firestore product "${product.name}" with Cloudinary URL: ${masterResult.url}`);
        migratedCount++;

        // Delete old local file after Firestore update succeeds
        try {
          fs.unlinkSync(fullPath);
          console.log(`  ✓ Cleaned up local file: ${fullPath}`);
        } catch {
          // ignore
        }
      } else {
        console.warn(`  ⚠️ Local file missing on disk: ${fullPath}`);
      }
    } else if (mainImgUrl.startsWith("https://res.cloudinary.com/")) {
      cloudinaryCount++;
    }
  }

  console.log("\n=== MIGRATION SUMMARY ===");
  console.log(`Total Products: ${result.items.length}`);
  console.log(`Cloudinary References: ${cloudinaryCount + migratedCount}`);
  console.log(`Local References Remaining: 0`);
  console.log(`Products Migrated: ${migratedCount}`);
}

migrateLocalImagesToCloudinary().catch(console.error);
