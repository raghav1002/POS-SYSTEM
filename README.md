# RetailPOS — Full-Stack Multi-Tenant Point of Sale & Retail Platform (2026)

Modern, enterprise-grade multi-tenant Point of Sale and Inventory Management System built with **Next.js 16 (App Router, Turbopack)**, **TypeScript**, **Cloud Firestore & Firebase Admin SDK**, **Firebase Auth**, **Sharp (Server-Side WebP Processing)**, **@zxing/browser (Multi-Format Barcode Engine)**, **Boneyard.js (Layout-Stable Skeletons)**, **Tailwind CSS 4**, and **Zustand**.

---

## 🚀 Key Highlights & Architecture

- **Auth & Multi-Tenancy**: Firebase Auth + HttpOnly Session Cookies. Strict server-side role resolution (`admin`, `supervisor`, `cashier`, `employee`, `staff`) backed by canonical Firestore profiles (`tenants/{tenantId}/users/{uid}`). Zero dev bypass paths.
- **Dedicated Workspaces**:
  - **Admin Panel** (`/dashboard`): Strategic overview, sales analytics, catalog control, employee & role management, branch control, suppliers, expenses, and system settings.
  - **Standalone Cashier Workspace** (`/workspace`): Mobile-first, phone-optimized cashier experience without Admin sidebar distraction.
- **Product & Barcode Engine**:
  - Code 128 vector SVG barcode generator & alphanumeric SKU engine.
  - Hardware USB/Bluetooth keyboard scanner emulation with automatic focus recovery.
  - Cross-platform phone camera barcode scanning powered by `@zxing/browser` and native `BarcodeDetector` (EAN-13 Indian 890..., EAN-8, UPC-A, Code 128, Code 39, QR).
  - Strict tenant-scoped SKU and Barcode uniqueness validation with duplicate rejection.
- **Server-Side Image Processing**:
  - Sharp processing pipeline (`/api/upload`): Automatically converts image uploads to optimized **Master WebP** (max 1400px, 82% quality) and **Thumbnail WebP** (max 400px, 75% quality).
  - Versioned storage paths (`products/{tenantId}/{productId}/image-v{version}.webp`).
  - Automatic local filesystem fallback (`/public/uploads`) if Cloud Storage bucket is unprovisioned.
- **Complete Billing & Thermal Receipt Engine**:
  - Cash (with tendered amount & change computation), UPI (with UTR/reference verification), Card, and Other payment methods.
  - Thermal receipt printing (58mm, 80mm, standard browser print).
  - Atomic Firestore transaction checkout (`SaleService`) guaranteeing single inventory decrements and zero double-charging.
  - Idempotency protection preventing duplicate sales on double-clicks or network retries.
  - Full thermal receipt reprinting from Sales History (`/sales`).
- **Offline Reliability**:
  - Native browser IndexedDB local transaction queue (`/lib/offline-db.ts`).
  - Automatic background synchronization when network reconnects (`/api/sales/sync`).
- **Performance & Skeletons**:
  - `boneyard-js` responsive layout skeletons across `/dashboard`, `/products`, `/sales`, and `/workspace`.
  - Next.js `<Image />` rendering with `remotePatterns` configuration for Cloud Storage domains.

---

## 📁 Folder Structure

```
d:/POS/
├── src/
│   ├── app/                    # App Router pages & API routes
│   │   ├── (auth)/             # Login & session routing
│   │   ├── (dashboard)/        # Admin dashboard pages (products, sales, employees, etc.)
│   │   ├── (workspace)/        # Standalone Cashier Workspace (/workspace)
│   │   ├── api/                # Production API handlers (auth, products, sales, upload, etc.)
│   │   ├── about/              # Public storefront pages
│   │   ├── contact/
│   │   └── products/
│   ├── components/             # Reusable UI components
│   │   ├── architect-pos/      # Hero scanner & homepage components
│   │   ├── layout/             # Dashboard shell, header, sidebar, workspace shell
│   │   ├── pos/                # POS terminal, cart, camera scanner, payment modals
│   │   ├── products/           # Product management dialogs, barcode modal
│   │   ├── public/             # Public storefront header, footer, role-aware CTA button
│   │   ├── providers/          # Session & theme providers
│   │   └── ui/                 # Brand Orange UI primitives & Boneyard skeletons
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Firebase Admin SDK, auth helpers, printer engine, tenant store
│   ├── repositories/           # Firestore data repositories (ProductRepo, SaleRepo, etc.)
│   ├── services/               # Core business services (SaleService, DashboardService)
│   ├── stores/                 # Zustand state stores (cart store)
│   ├── types/                  # TypeScript domain interfaces & permission types
│   └── validations/            # Zod validation schemas
├── public/                     # Static assets, icons (192/512 PNG), local uploads
├── scripts/                    # Database seeds, test suites, PWA icon generators
└── next.config.ts              # Next.js configuration & remote image patterns
```

---

## 🛠️ Quick Start

### 1. Prerequisites

- **Node.js**: v18+ (tested on v24.14.1)
- **npm**: 10+ (tested on v11.11.0)
- **Firebase Project**: Cloud Firestore enabled in Native mode.

### 2. Install Dependencies & Configure Environment

```bash
npm install
```

Create or update `.env.local`:

```env
FIREBASE_PROJECT_ID=pos-system-adf33
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pos-system-adf33.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pos-system-adf33
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pos-system-adf33.firebaseapp.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Build & Run

```bash
# Development Server
npm run dev

# Type Check & Lint
npx tsc --noEmit
npm run lint

# Production Build
npm run build
npm run start
```

---

## 🧪 Automated Verification & Test Suites

The codebase includes end-to-end integration test scripts to verify production readiness:

```bash
# 1. Product A-Z CRUD & WebP Pipeline Test
npx tsx --env-file=.env.local scripts/test-product-pipeline.ts

# 2. Performance & Collision Rejection Test
npx tsx --env-file=.env.local scripts/test-fast-perf.ts

# 3. Mobile POS Flow & Inventory Decrement Test
npx tsx --env-file=.env.local scripts/test-mobile-pos-flow.ts
```

---

## 📄 License

Enterprise POS Architecture — Developed for Production Deployment.
