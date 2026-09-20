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

async function testCloudinaryPipeline() {
  console.log("=== Testing Cloudinary Pipeline (Fail-Closed & Real Upload) ===");
  const { uploadToCloudStorage, deleteFromCloudStorage } = await import("../src/lib/storage/cloud-storage");

  // Create dummy test image buffer (100x100 red square WebP)
  const testBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 232, g: 80, b: 2, alpha: 1 },
    },
  })
    .webp()
    .toBuffer();

  // Test 1: Invalid / Missing Secret Fail-Closed Behavior
  console.log("\n[TEST 1] Testing Missing API Secret (Fail-Closed)...");
  const originalSecret = process.env.CLOUDINARY_API_SECRET;
  process.env.CLOUDINARY_API_SECRET = "";

  let failedAsExpected = false;
  try {
    await uploadToCloudStorage("test/fail_closed.webp", testBuffer);
  } catch (err) {
    failedAsExpected = true;
    console.log("✓ Correctly caught fail-closed error:", (err as Error).message);
  }

  // Verify no local file was created in public/uploads
  const localFile1 = path.join(process.cwd(), "public", "uploads", "test", "fail_closed.webp");
  const localFile1Exists = fs.existsSync(localFile1);
  console.log(`✓ Local file created during fail-closed test? ${localFile1Exists ? "YES (FAIL)" : "NO (PASS)"}`);

  if (!failedAsExpected || localFile1Exists) {
    throw new Error("TEST 1 FAILED: Storage did not fail closed on missing secret.");
  }

  // Test 2: Valid Credentials Cloudinary Upload
  console.log("\n[TEST 2] Testing Real Cloudinary Upload with Valid Credentials...");
  process.env.CLOUDINARY_API_SECRET = originalSecret;

  const testStoragePath = `products/test-tenant/prod_test_${Date.now()}/image-v${Date.now()}.webp`;
  const result = await uploadToCloudStorage(testStoragePath, testBuffer);

  console.log("✓ Cloudinary Upload Result:");
  console.log(`  URL: ${result.url}`);
  console.log(`  Public ID: ${result.publicId}`);
  console.log(`  Width: ${result.width}`);
  console.log(`  Height: ${result.height}`);
  console.log(`  Format: ${result.format}`);
  console.log(`  Bytes: ${result.bytes}`);
  console.log(`  Version: ${result.version}`);

  const isCloudinaryUrl = result.url.startsWith("https://res.cloudinary.com/ps7ijrfa/");
  console.log(`✓ URL is valid Cloudinary URL? ${isCloudinaryUrl ? "YES (PASS)" : "NO (FAIL)"}`);

  // Check filesystem to confirm ZERO local file created
  const localFile2 = path.join(process.cwd(), "public", "uploads", testStoragePath);
  const localFile2Exists = fs.existsSync(localFile2);
  console.log(`✓ Local file created during Cloudinary upload test? ${localFile2Exists ? "YES (FAIL)" : "NO (PASS)"}`);

  if (!isCloudinaryUrl || localFile2Exists) {
    throw new Error("TEST 2 FAILED: Cloudinary upload did not produce a Cloudinary URL or created local file.");
  }

  // Cleanup test asset from Cloudinary
  console.log("\n[CLEANUP] Deleting test asset from Cloudinary...");
  await deleteFromCloudStorage(result.publicId);
  console.log("✓ Cleanup request sent successfully.");

  console.log("\n=== ALL CLOUDINARY STORAGE TESTS PASSED ===");
}

testCloudinaryPipeline().catch((err) => {
  console.error("Pipeline test error:", err);
  process.exit(1);
});
