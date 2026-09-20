# System Architecture & Design Specification

## Overview

RetailPOS is an enterprise multi-tenant Point of Sale and inventory platform built on Next.js 16 (App Router) and Cloud Firestore Native Mode.

```
+-----------------------------------------------------------------------+
|                            Client Layer                               |
|  Public Storefront (SSR)  | Admin Dashboard (/dashboard) | POS (/workspace) |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                             API & Auth                                |
|   HttpOnly Firebase Session Cookies | Middleware Guard | Zod Validation |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                      Repositories & Services                          |
|  ProductRepo  |  SaleRepo  |  SaleService (Atomic Transactions)       |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                           Storage & Data                              |
|   Cloud Firestore (tenants/{tenantId}/...)  |  Sharp WebP Pipeline    |
+-----------------------------------------------------------------------+
```

## Core Subsystems

1. **Authentication Subsystem**:
   - Client sends Firebase ID token to `POST /api/auth/session`.
   - Server validates token via Firebase Admin SDK, reads `tenants/{tenantId}/users/{uid}`, and issues a 14-day HttpOnly cookie.
   - `requirePermission()` verifies permissions on all API endpoints.

2. **Catalog & Image Subsystem**:
   - `ProductRepository`: CRUD, barcode resolution (`findByBarcode`), SKU resolution (`findBySku`), tenant uniqueness enforcement.
   - Upload API (`/api/upload`): Sharp converts uploaded images to Master WebP (1400px) and Thumbnail WebP (400px) with versioned metadata.

3. **POS Checkout Subsystem**:
   - Cart Store (Zustand): Local cart management in client memory.
   - `SaleService.completeSale()`: Executes atomic `adminDb.runTransaction()` to verify stock levels and decrement inventory atomically.
   - Idempotency guard (`saleId` / `transactionId`) prevents double-charging and duplicate inventory decrements.

4. **Offline Subsystem**:
   - IndexedDB local queue (`/lib/offline-db.ts`): Stores offline transactions with deterministic `POS-OFFLINE-*` transaction IDs.
   - Auto-Sync Endpoint (`/api/sales/sync`): Syncs pending offline sales when network connectivity is restored.
