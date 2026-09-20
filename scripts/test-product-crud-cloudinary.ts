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

async function testProductCrudCloudinary() {
  const { ProductRepository } = await import("../src/repositories/product.repository");
  const { uploadToCloudStorage, deleteFromCloudStorage } = await import("../src/lib/storage/cloud-storage");

  console.log("=== Testing Single Cloudinary Asset Product CRUD Pipeline ===");
  const repo = new ProductRepository();
  const tenantId = "default";
  const testId = `prod_single_${Date.now()}`;
  const version = Date.now();

  // Create test WebP image buffer (1200x800)
  const masterBuffer = await sharp({
    create: { width: 1200, height: 800, channels: 4, background: { r: 232, g: 80, b: 2, alpha: 1 } },
  })
    .webp()
    .toBuffer();

  // 1. Single Upload to Cloudinary
  console.log("\n1. Uploading Single Asset to Cloudinary...");
  const masterPath = `products/${tenantId}/${testId}/image-v${version}.webp`;
  const masterResult = await uploadToCloudStorage(masterPath, masterBuffer);

  const thumbUrl = masterResult.url.replace("/image/upload/", "/image/upload/w_400,c_scale,q_75/");

  console.log(`✓ Master URL: ${masterResult.url}`);
  console.log(`✓ Thumbnail URL (Cloudinary CDN transformed): ${thumbUrl}`);

  const isMasterCloudinary = masterResult.url.startsWith("https://res.cloudinary.com/ps7ijrfa/");
  const isThumbCloudinary = thumbUrl.startsWith("https://res.cloudinary.com/ps7ijrfa/");

  if (!isMasterCloudinary || !isThumbCloudinary) {
    throw new Error("FAIL: Upload did not return Cloudinary URLs.");
  }

  // 2. Write to Firestore via ProductRepository.create
  console.log("\n2. Creating Product in Firestore with single asset reference...");
  const newProd = await repo.create(
    {
      _id: testId,
      name: "SINGLE ASSET CLOUDINARY PRODUCT",
      sku: `SKU-SINGLE-${Date.now().toString().slice(-4)}`,
      barcode: `${Date.now()}`.slice(-12),
      costPrice: 50,
      sellingPrice: 100,
      stock: 25,
      images: [masterResult.url],
      image: {
        url: masterResult.url,
        path: masterPath,
        width: masterResult.width,
        height: masterResult.height,
        format: masterResult.format,
        version: masterResult.version,
      },
      thumbnail: {
        url: thumbUrl,
        path: masterPath,
        width: 400,
        height: 267,
        format: masterResult.format,
        version: masterResult.version,
      },
    },
    tenantId
  );

  console.log(`✓ Firestore Product Created (ID: ${newProd._id})`);
  console.log(`  image.url = ${newProd.image?.url}`);
  console.log(`  thumbnail.url = ${newProd.thumbnail?.url}`);

  // Verify URL in Firestore is Cloudinary URL
  if (!newProd.image?.url.startsWith("https://res.cloudinary.com/")) {
    throw new Error("FAIL: Firestore product image.url is NOT a Cloudinary URL!");
  }

  // Check disk to confirm 0 local files created
  const localMasterFile = path.join(process.cwd(), "public", "uploads", masterPath);
  const localMasterExists = fs.existsSync(localMasterFile);
  console.log(`✓ Local filesystem file created? ${localMasterExists ? "YES (FAIL)" : "NO (PASS)"}`);

  if (localMasterExists) {
    throw new Error("FAIL: Local file was created on disk!");
  }

  // 3. Clean up test document and test Cloudinary asset
  console.log("\n3. Cleaning up single test asset from Cloudinary...");
  await repo.update(testId, { isActive: false }, tenantId);
  await deleteFromCloudStorage(masterResult.publicId);
  console.log("✓ Single asset cleanup finished successfully.");

  console.log("\n=== ALL SINGLE-ASSET CLOUDINARY TESTS PASSED ===");
}

testProductCrudCloudinary().catch((err) => {
  console.error("Single asset test failed:", err);
  process.exit(1);
});
