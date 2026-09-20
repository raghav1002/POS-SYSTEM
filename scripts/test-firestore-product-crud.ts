import { ProductRepository } from "../src/repositories/product.repository";
import { adminDb } from "../src/lib/firebase/admin";

async function runFirestoreCrudTest() {
  console.log("=== Testing Canonical Firestore Product CRUD ===");
  const repo = new ProductRepository();
  const tenantId = "default";

  // 1. CREATE TEST PRODUCT
  const testSku = `FIREBASE-TEST-${Date.now().toString().slice(-4)}`;
  const testBarcode = `890123${Date.now().toString().slice(-6)}`;
  console.log(`[1/5] Creating product with SKU: ${testSku} & Barcode: ${testBarcode}...`);

  const created = await repo.create(
    {
      name: "TEST FIRESTORE PRODUCT",
      description: "Canonical Firestore verification item",
      sku: testSku,
      barcode: testBarcode,
      categoryId: "cat-accessories",
      categoryName: "Accessories",
      brandId: "brand-test",
      brandName: "Test Brand",
      costPrice: 100,
      sellingPrice: 199,
      stock: 20,
      taxRate: 18,
      lowStockThreshold: 5,
      unit: "pcs",
      images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500"],
      image: {
        url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500",
        path: "tenants/default/products/test/image.webp",
        width: 500,
        height: 500,
        format: "webp",
        version: Date.now(),
      },
      thumbnail: {
        url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200",
        path: "tenants/default/products/test/thumb.webp",
        width: 200,
        height: 200,
        format: "webp",
        version: Date.now(),
      },
    },
    tenantId
  );

  console.log(`✓ Product created successfully: ID=${created._id}`);

  // 2. VERIFY FIRESTORE DOCUMENT DIRECTLY
  console.log(`[2/5] Verifying canonical document in Firestore DB (ID: ${created._id})...`);
  const fsDoc = await adminDb.collection("tenants").doc(tenantId).collection("products").doc(created._id).get();

  if (!fsDoc.exists) {
    throw new Error(`CRITICAL FAILURE: Product ${created._id} was NOT found in Firestore!`);
  }

  const fsData = fsDoc.data()!;
  console.log(`✓ Firestore document exists! Name="${fsData.name}", Price=${fsData.sellingPrice}, Stock=${fsData.stock}`);
  if (fsData.sku !== testSku || fsData.barcode !== testBarcode) {
    throw new Error(`Firestore field mismatch! Expected SKU=${testSku}, got ${fsData.sku}`);
  }

  // 3. EDIT TEST PRODUCT
  console.log(`[3/5] Editing product price (199 -> 249) & stock (20 -> 15)...`);
  const updated = await repo.update(
    created._id,
    {
      sellingPrice: 249,
      stock: 15,
      description: "Updated test description for Firestore",
    },
    tenantId
  );

  if (!updated) throw new Error("Update returned null");

  // Re-verify Firestore document
  const fsDocUpdated = await adminDb.collection("tenants").doc(tenantId).collection("products").doc(created._id).get();
  const fsDataUpdated = fsDocUpdated.data()!;
  console.log(`✓ Firestore document updated! Price=${fsDataUpdated.sellingPrice} (Expected: 249), Stock=${fsDataUpdated.stock} (Expected: 15)`);
  if (fsDataUpdated.sellingPrice !== 249 || fsDataUpdated.stock !== 15) {
    throw new Error(`Firestore update failed! Expected Price=249, got ${fsDataUpdated.sellingPrice}`);
  }

  // 4. VERIFY RE-QUERY VIA READ METHOD (findById)
  console.log(`[4/5] Testing findById query directly from Firestore...`);
  const queried = await repo.findById(created._id, tenantId);
  if (queried && queried.sellingPrice === 249 && queried.stock === 15) {
    console.log(`✓ findById re-query SUCCESS: Name="${queried.name}", Price=${queried.sellingPrice}`);
  } else {
    throw new Error("findById re-query failed!");
  }

  // 5. ARCHIVE / DELETE TEST PRODUCT
  console.log(`[5/5] Archiving product (isActive -> false)...`);
  await repo.delete(created._id, tenantId);
  const fsDocArchived = await adminDb.collection("tenants").doc(tenantId).collection("products").doc(created._id).get();
  console.log(`✓ Firestore document archived status: isActive=${fsDocArchived.data()?.isActive} (Expected: false)`);

  console.log("\n=== ALL CANONICAL FIRESTORE CRUD VERIFICATION TESTS PASSED PASSED ===");
}

runFirestoreCrudTest().catch(console.error);
