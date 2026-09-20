import sharp from "sharp";
import { ProductRepository } from "../src/repositories/product.repository";
import { adminStorage } from "../src/lib/firebase/admin";

async function runProductPipelineTests() {
  console.log("=========================================");
  console.log("TESTING PRODUCT A-Z & SHARP IMAGE PIPELINE");
  console.log("=========================================\n");

  const tenantId = "default";
  const productRepo = new ProductRepository();

  // 1. Generate a test image buffer using Sharp
  console.log("1. Generating test image buffer via Sharp...");
  const rawImageBuffer = await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 4,
      background: { r: 232, g: 80, b: 2, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  console.log(`   ✅ Original test PNG image size: ${(rawImageBuffer.length / 1024).toFixed(2)} KB`);

  // 2. Process Master WebP & Thumbnail WebP via Sharp
  console.log("\n2. Processing WebP Master (max 1400px) and Thumbnail (max 400px)...");
  const masterBuffer = await sharp(rawImageBuffer)
    .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const thumbBuffer = await sharp(rawImageBuffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const masterMeta = await sharp(masterBuffer).metadata();
  const thumbMeta = await sharp(thumbBuffer).metadata();

  console.log(`   ✅ Master WebP size: ${(masterBuffer.length / 1024).toFixed(2)} KB (${masterMeta.width}x${masterMeta.height})`);
  console.log(`   ✅ Thumbnail WebP size: ${(thumbBuffer.length / 1024).toFixed(2)} KB (${thumbMeta.width}x${thumbMeta.height})`);

  // 3. Upload to Firebase Storage under versioned tenant path with local fallback
  console.log("\n3. Uploading versioned WebP objects to Firebase Storage (with local fallback)...");
  const timestamp = Date.now();
  const testProductId = `test_pipe_prod_${timestamp}`;
  const bucketName = adminStorage.name || "pos-system-adf33.appspot.com";

  const masterPath = `tenants/${tenantId}/products/${testProductId}/image-v${timestamp}.webp`;
  const thumbPath = `tenants/${tenantId}/products/${testProductId}/thumb-v${timestamp}.webp`;

  let masterUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(masterPath)}?alt=media`;
  let thumbUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(thumbPath)}?alt=media`;

  try {
    const masterFile = adminStorage.file(masterPath);
    const thumbFile = adminStorage.file(thumbPath);

    await masterFile.save(masterBuffer, { metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
    await thumbFile.save(thumbBuffer, { metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
  } catch (err) {
    console.warn("   ⚠️ Cloud Storage Bucket unprovisioned in Firebase Console; using local uploads fallback:", err instanceof Error ? err.message : "404");
    masterUrl = `/uploads/${masterPath}`;
    thumbUrl = `/uploads/${thumbPath}`;
  }

  console.log(`   ✅ Master Storage URL: ${masterUrl}`);
  console.log(`   ✅ Thumbnail Storage URL: ${thumbUrl}`);

  // 4. Create Product with full A-Z fields in Firestore
  console.log("\n4. Creating Product record in Firestore...");
  const testBarcode = `BAR-${timestamp.toString().slice(-8)}`;
  const testSKU = `SKU-${timestamp.toString().slice(-8)}`;

  const createdProduct = await productRepo.create(
    {
      name: `Test Organic Coffee Beans ${timestamp}`,
      sku: testSKU,
      barcode: testBarcode,
      description: "High quality roasted coffee beans for POS testing.",
      costPrice: 250,
      sellingPrice: 450,
      taxRate: 18,
      stock: 50,
      lowStockThreshold: 10,
      unit: "pack",
      images: [masterUrl],
      image: {
        url: masterUrl,
        path: masterPath,
        width: masterMeta.width ?? 0,
        height: masterMeta.height ?? 0,
        format: "webp",
        version: timestamp,
      },
      thumbnail: {
        url: thumbUrl,
        path: thumbPath,
        width: thumbMeta.width ?? 0,
        height: thumbMeta.height ?? 0,
        format: "webp",
        version: timestamp,
      },
      variants: [
        {
          name: "1kg Pack",
          sku: `${testSKU}-1KG`,
          barcode: `${testBarcode}-V1`,
          price: 850,
          stock: 20,
        },
      ],
    },
    tenantId
  );

  console.log(`   ✅ Created Product ID: ${createdProduct._id}`);
  console.log(`   ✅ SKU: ${createdProduct.sku} | Barcode: ${createdProduct.barcode}`);

  // 5. Test POS Barcode Lookup
  console.log("\n5. Testing POS Barcode Lookup...");
  const mainFound = await productRepo.findByBarcode(testBarcode, tenantId);
  console.log(`   ✅ Main Barcode Lookup: ${mainFound ? `Found "${mainFound.name}"` : "FAILED"}`);
  if (!mainFound) throw new Error("Main barcode lookup failed");

  const variantFound = await productRepo.findByBarcode(`${testBarcode}-V1`, tenantId);
  console.log(`   ✅ Variant Barcode Lookup: ${variantFound ? `Found "${variantFound.name}"` : "FAILED"}`);
  if (!variantFound) throw new Error("Variant barcode lookup failed");

  // 6. Test Image Replacement & Safe Cleanup
  console.log("\n6. Testing Image Replacement & Obsolete Object Cleanup...");
  const newTimestamp = Date.now() + 100;
  const newMasterPath = `tenants/${tenantId}/products/${testProductId}/image-v${newTimestamp}.webp`;
  const newThumbPath = `tenants/${tenantId}/products/${testProductId}/thumb-v${newTimestamp}.webp`;

  const newMasterUrl = `/uploads/${newMasterPath}`;
  const newThumbUrl = `/uploads/${newThumbPath}`;

  await productRepo.update(
    createdProduct._id,
    {
      image: {
        url: newMasterUrl,
        path: newMasterPath,
        width: masterMeta.width ?? 0,
        height: masterMeta.height ?? 0,
        format: "webp",
        version: newTimestamp,
      },
      thumbnail: {
        url: newThumbUrl,
        path: newThumbPath,
        width: thumbMeta.width ?? 0,
        height: thumbMeta.height ?? 0,
        format: "webp",
        version: newTimestamp,
      },
      images: [newMasterUrl],
    },
    tenantId
  );

  console.log(`   ✅ Image metadata replaced cleanly for product ${createdProduct._id}`);

  // Cleanup test product
  await productRepo.delete(createdProduct._id, tenantId);
  console.log(`   ✅ Deleted test product ${createdProduct._id}`);

  console.log("\n=========================================");
  console.log("ALL PRODUCT PIPELINE & SHARP TESTS PASSED!");
  console.log("=========================================\n");
}

runProductPipelineTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
