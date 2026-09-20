# Engineering Constraints & Guardrails

1. **Stack**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Sharp 0.35, `@zxing/browser`.
2. **Database**: Cloud Firestore Native Multi-Tenant Architecture (`tenants/{tenantId}/...`). **Zero MongoDB dependency**.
3. **Authentication & Security**: Firebase Auth + HttpOnly session cookies via Firebase Admin SDK. Canonical user profile resolved from Firestore document (`tenants/{tenantId}/users/{uid}`). Zero dev bypass paths.
4. **No Unnecessary Dependencies**: Prefer native Web APIs and maintained lightweight libraries (`@zxing/browser`, `boneyard-js`).
5. **Performance**: Server Components by default. Client Components isolated for interactive state, camera, forms, and dialogs.
6. **UI/UX**: Radix UI primitives, Brand Orange design system, Boneyard.js layout-stable loading skeletons. Minimum 48x48px touch targets for phone Cashier Workspace (`/workspace`).
