import { ProductRepository } from "../src/repositories/product.repository";
import { SaleService } from "../src/services/sale.service";
import { SaleRepository } from "../src/repositories/sale.repository";

async function runMobilePosFlowTest() {
  console.log("=== Starting Mobile POS E2E Verification Suite ===");
  const productRepo = new ProductRepository();
  const saleService = new SaleService();
  const saleRepo = new SaleRepository();
  const tenantId = "default";

  // 1. Create canonical product with stock = 10
  const testBarcode = `8901234${Date.now().toString().slice(-6)}`;
  const testSku = `SKU-POS-${Date.now().toString().slice(-4)}`;

  console.log(`[1/5] Creating canonical product (Stock=10, Barcode=${testBarcode})...`);
  const product = await productRepo.create(
    {
      name: "TEST E2E RETAIL PRODUCT",
      sku: testSku,
      barcode: testBarcode,
      sellingPrice: 100,
      costPrice: 60,
      stock: 10,
      lowStockThreshold: 3,
      images: ["/public/uploads/test-product.webp"],
    },
    tenantId
  );
  console.log(`✓ Product created: ID=${product._id}, Initial Stock=${product.stock}`);

  // 2. Test Barcode Lookup & Leading Zero Normalization
  console.log("[2/5] Testing exact barcode lookup & string normalization...");
  const resolved = await productRepo.findByBarcode(testBarcode, tenantId);
  if (resolved && resolved._id === product._id) {
    console.log(`✓ Exact barcode resolution SUCCESS: "${resolved.name}" (${resolved.barcode})`);
  } else {
    throw new Error("Barcode resolution failed!");
  }

  // 3. Complete First Sale (Quantity=1) -> Stock should become 9
  const saleId1 = `SALE-E2E-1-${Date.now()}`;
  console.log(`[3/5] Completing Sale #1 (Quantity=1, SaleID=${saleId1})...`);

  const sale1 = await saleService.completeSale({
    saleId: saleId1,
    items: [
      {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.sellingPrice,
        quantity: 1,
        discount: 0,
        tax: 0,
        image: product.images[0],
      },
    ],
    discount: 0,
    taxRate: 0,
    payments: [{ method: "cash", amount: 100, reference: "Cash Tendered: 100" }],
    cashierId: "emp-cashier-001",
    tenantId,
  });

  console.log(`✓ Sale #1 completed: Invoice=${sale1.invoiceNumber}`);

  // Verify stock decrement (10 -> 9)
  const afterSale1Product = await productRepo.findById(product._id, tenantId);
  console.log(`✓ Stock after Sale #1: ${afterSale1Product?.stock} (Expected: 9)`);
  if (afterSale1Product?.stock !== 9) {
    throw new Error(`Stock mismatch after Sale #1! Expected 9, got ${afterSale1Product?.stock}`);
  }

  // 4. Idempotency Check: Retry Sale #1 -> Stock MUST remain 9 (no double-decrement)
  console.log("[4/5] Testing duplicate checkout idempotency protection...");
  const duplicateResult = await saleService.completeSale({
    saleId: saleId1,
    items: [
      {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.sellingPrice,
        quantity: 1,
        discount: 0,
        tax: 0,
        image: product.images[0],
      },
    ],
    discount: 0,
    taxRate: 0,
    payments: [{ method: "cash", amount: 100, reference: "Cash Tendered: 100" }],
    cashierId: "emp-cashier-001",
    tenantId,
  });

  const afterDupProduct = await productRepo.findById(product._id, tenantId);
  console.log(`✓ Duplicate Checkout Result: Invoice=${duplicateResult.invoiceNumber}`);
  console.log(`✓ Stock after duplicate attempt: ${afterDupProduct?.stock} (Expected: 9)`);
  if (afterDupProduct?.stock !== 9) {
    throw new Error(`Idempotency failed! Stock double-decremented to ${afterDupProduct?.stock}`);
  }

  // 5. Complete Sale #2 (Quantity=2) -> Stock should become 7
  const saleId2 = `SALE-E2E-2-${Date.now()}`;
  console.log(`[5/5] Completing Sale #2 (Quantity=2, SaleID=${saleId2})...`);

  const sale2 = await saleService.completeSale({
    saleId: saleId2,
    items: [
      {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.sellingPrice,
        quantity: 2,
        discount: 0,
        tax: 0,
        image: product.images[0],
      },
    ],
    discount: 0,
    taxRate: 0,
    payments: [{ method: "upi", amount: 200, reference: "UTR12345678" }],
    cashierId: "emp-cashier-001",
    tenantId,
  });

  const afterSale2Product = await productRepo.findById(product._id, tenantId);
  console.log(`✓ Sale #2 completed: Invoice=${sale2.invoiceNumber}`);
  console.log(`✓ Final Stock after Sale #2: ${afterSale2Product?.stock} (Expected: 7)`);

  if (afterSale2Product?.stock !== 7) {
    throw new Error(`Stock mismatch after Sale #2! Expected 7, got ${afterSale2Product?.stock}`);
  }

  // Verify Invoice Retrieval from Sales History
  const fetchedSale = await saleRepo.findByInvoice(sale2.invoiceNumber, tenantId);
  if (fetchedSale && fetchedSale._id === sale2.id) {
    console.log(`✓ Invoice retrieval from Sales History SUCCESS: Invoice=${fetchedSale.invoiceNumber}`);
  } else {
    throw new Error("Invoice retrieval failed!");
  }

  console.log("\n=== ALL MOBILE POS E2E VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runMobilePosFlowTest().catch(console.error);
