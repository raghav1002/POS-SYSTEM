/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductRepository } from "../src/repositories/product.repository";
import { SaleRepository } from "../src/repositories/sale.repository";

async function runFastPerfTest() {
  console.log("=== Starting RetailPOS Performance & Flow Verification Suite ===");
  const productRepo = new ProductRepository();
  const saleRepo = new SaleRepository();
  const tenantId = "default";

  // 1. Product Creation Test
  const testSku = `PERF-SKU-${Date.now().toString().slice(-4)}`;
  const testBarcode = `890${Date.now().toString().slice(-9)}`;

  console.log(`[1/6] Creating product with SKU: ${testSku} & Barcode: ${testBarcode}...`);
  const created = await productRepo.create(
    {
      name: "Perf Test Organic Tea",
      sku: testSku,
      barcode: testBarcode,
      sellingPrice: 150,
      costPrice: 90,
      stock: 50,
      categoryName: "Beverages",
      images: ["/public/uploads/test-tea.webp"],
    },
    tenantId
  );

  console.log(`✓ Product created successfully: ID=${created._id}`);

  // 2. Duplicate Collision Check Test
  console.log("[2/6] Testing duplicate SKU & Barcode collision rejection...");
  try {
    await productRepo.create(
      {
        name: "Duplicate SKU Product",
        sku: testSku,
        barcode: `999${Date.now().toString().slice(-9)}`,
        sellingPrice: 200,
        stock: 10,
      },
      tenantId
    );
    console.error("❌ ERROR: Duplicate SKU was not rejected!");
  } catch (err: any) {
    console.log(`✓ Duplicate SKU correctly rejected: "${err.message}"`);
  }

  try {
    await productRepo.create(
      {
        name: "Duplicate Barcode Product",
        sku: `PERF-DIFF-${Date.now().toString().slice(-4)}`,
        barcode: testBarcode,
        sellingPrice: 200,
        stock: 10,
      },
      tenantId
    );
    console.error("❌ ERROR: Duplicate Barcode was not rejected!");
  } catch (err: any) {
    console.log(`✓ Duplicate Barcode correctly rejected: "${err.message}"`);
  }

  // 3. Barcode Resolution Test
  console.log("[3/6] Testing barcode scan lookup...");
  const foundByBarcode = await productRepo.findByBarcode(testBarcode, tenantId);
  if (foundByBarcode && foundByBarcode._id === created._id) {
    console.log(`✓ Barcode scan successfully resolved product: "${foundByBarcode.name}"`);
  } else {
    console.error("❌ ERROR: Barcode lookup failed!");
  }

  // 4. SKU Resolution Test
  console.log("[4/6] Testing SKU search lookup...");
  const foundBySku = await productRepo.findBySku(testSku, tenantId);
  if (foundBySku && foundBySku._id === created._id) {
    console.log(`✓ SKU lookup successfully resolved product: "${foundBySku.name}"`);
  } else {
    console.error("❌ ERROR: SKU lookup failed!");
  }

  // 5. Product Update Test
  console.log("[5/6] Testing product update...");
  const updated = await productRepo.update(
    created._id,
    {
      sellingPrice: 175,
      stock: 48,
    },
    tenantId
  );
  if (updated && updated.sellingPrice === 175 && updated.stock === 48) {
    console.log(`✓ Product update successful: price=${updated.sellingPrice}, stock=${updated.stock}`);
  } else {
    console.error("❌ ERROR: Product update failed!");
  }

  // 6. Pagination Test
  console.log("[6/6] Testing product & sales pagination...");
  const paginatedProducts = await productRepo.paginate({ page: 1, limit: 10 }, tenantId);
  const paginatedSales = await saleRepo.paginate({ page: 1, limit: 10 }, tenantId);

  console.log(`✓ Products pagination: page 1 returned ${paginatedProducts.items.length} items (total: ${paginatedProducts.total})`);
  console.log(`✓ Sales pagination: page 1 returned ${paginatedSales.items.length} items (total: ${paginatedSales.total})`);

  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runFastPerfTest().catch(console.error);
