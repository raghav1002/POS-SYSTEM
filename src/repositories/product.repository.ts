import { adminDb } from "@/lib/firebase/admin";
import { deleteFromCloudStorage } from "@/lib/storage/cloud-storage";
import { FieldValue } from "firebase-admin/firestore";
import type { PaginationParams, PaginatedResult } from "@/types";
import { setLocalDoc } from "@/lib/tenant-store";

export interface IProductVariant {
  id?: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  stock: number;
}

export interface ProductImageMetadata {
  url: string;
  path: string;
  width?: number;
  height?: number;
  format?: string;
  version?: number;
}

export interface IProduct {
  _id: string;
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  images: string[];
  image?: ProductImageMetadata;
  thumbnail?: ProductImageMetadata;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  variants?: IProductVariant[];
  isActive: boolean;
  branchId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class ProductRepository {
  private getCollection(tenantId = "default") {
    return adminDb.collection("tenants").doc(tenantId).collection("products");
  }

  private mapDoc(doc: FirebaseFirestore.DocumentSnapshot): IProduct | null {
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      _id: doc.id,
      id: doc.id,
      name: data.name ?? "",
      slug: data.slug ?? "",
      sku: data.sku ?? "",
      barcode: data.barcode ?? "",
      description: data.description ?? "",
      categoryId: data.categoryId ?? "",
      categoryName: data.categoryName ?? "",
      brandId: data.brandId ?? "",
      brandName: data.brandName ?? "",
      images: data.images ?? (data.image?.url ? [data.image.url] : typeof data.image === "string" ? [data.image] : []),
      image: data.image && typeof data.image === "object" ? data.image : undefined,
      thumbnail: data.thumbnail && typeof data.thumbnail === "object" ? data.thumbnail : undefined,
      costPrice: Number(data.costPrice ?? 0),
      sellingPrice: Number(data.sellingPrice ?? data.price ?? 0),
      taxRate: Number(data.taxRate ?? 3),
      stock: Number(data.stock ?? 0),
      lowStockThreshold: Number(data.lowStockThreshold ?? 5),
      unit: data.unit ?? "pcs",
      variants: data.variants ?? [],
      isActive: data.isActive !== false,
      branchId: data.branchId,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  }

  async findById(id: string, tenantId = "default"): Promise<IProduct | null> {
    const doc = await this.getCollection(tenantId).doc(id).get();
    if (doc.exists) return this.mapDoc(doc);
    return null;
  }

  async findByBarcode(barcode: string, tenantId = "default"): Promise<IProduct | null> {
    const cleanCode = (barcode || "").trim();
    if (!cleanCode) return null;

    // 1. Direct barcode match
    let snap = await this.getCollection(tenantId)
      .where("barcode", "==", cleanCode)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!snap.empty) {
      return this.mapDoc(snap.docs[0]);
    }

    // 2. Direct SKU match
    snap = await this.getCollection(tenantId)
      .where("sku", "==", cleanCode)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!snap.empty) {
      return this.mapDoc(snap.docs[0]);
    }

    // 3. Direct Firestore Doc ID match
    const doc = await this.getCollection(tenantId).doc(cleanCode).get();
    if (doc.exists) {
      const mapped = this.mapDoc(doc);
      if (mapped && mapped.isActive !== false) return mapped;
    }

    // 4. Case-insensitive / variants match across all active products in Firestore
    const allActive = await this.getCollection(tenantId)
      .where("isActive", "==", true)
      .get();

    const qLower = cleanCode.toLowerCase();
    for (const d of allActive.docs) {
      const p = this.mapDoc(d);
      if (!p || !p.isActive) continue;
      if (
        (p.barcode && p.barcode.toLowerCase() === qLower) ||
        (p.sku && p.sku.toLowerCase() === qLower) ||
        p._id.toLowerCase() === qLower ||
        p.variants?.some((v) => (v.barcode && v.barcode.toLowerCase() === qLower) || (v.sku && v.sku.toLowerCase() === qLower))
      ) {
        return p;
      }
    }

    return null;
  }

  async findBySku(sku: string, tenantId = "default"): Promise<IProduct | null> {
    const cleanSku = (sku || "").trim();
    if (!cleanSku) return null;

    const snap = await this.getCollection(tenantId)
      .where("sku", "==", cleanSku)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!snap.empty) {
      return this.mapDoc(snap.docs[0]);
    }

    return null;
  }

  async search(query: string, limit = 20, tenantId = "default"): Promise<IProduct[]> {
    const qLower = query.toLowerCase();
    const results: IProduct[] = [];

    const snap = await this.getCollection(tenantId).get();
    for (const doc of snap.docs) {
      const p = this.mapDoc(doc);
      if (!p || !p.isActive) continue;

      if (
        p.name.toLowerCase().includes(qLower) ||
        p.sku.toLowerCase().includes(qLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(qLower)) ||
        p.variants?.some(
          (v) =>
            v.name.toLowerCase().includes(qLower) ||
            v.sku.toLowerCase().includes(qLower) ||
            (v.barcode && v.barcode.toLowerCase().includes(qLower))
        )
      ) {
        results.push(p);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  async paginate(
    params: PaginationParams & { categoryId?: string; branchId?: string },
    tenantId = "default"
  ): Promise<PaginatedResult<IProduct>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    let all: IProduct[] = [];

    const snap = await this.getCollection(tenantId).get();
    for (const doc of snap.docs) {
      const p = this.mapDoc(doc);
      if (p && p.isActive) {
        all.push(p);
      }
    }

    // Filter by search
    if (params.search) {
      const q = params.search.toLowerCase();
      all = all.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (params.categoryId) {
      all = all.filter((p) => p.categoryId === params.categoryId);
    }

    // Filter by branch
    if (params.branchId) {
      all = all.filter((p) => p.branchId === params.branchId);
    }

    // Sort descending by creation date
    all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const total = all.length;
    const skip = (page - 1) * limit;
    const items = all.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: Partial<IProduct>, tenantId = "default"): Promise<IProduct> {
    if (data.sku) {
      const existingSku = await this.findBySku(data.sku, tenantId);
      if (existingSku) {
        throw new Error(`Product with SKU "${data.sku}" already exists`);
      }
    }

    if (data.barcode) {
      const existingBarcode = await this.findByBarcode(data.barcode, tenantId);
      if (existingBarcode && existingBarcode.barcode === data.barcode) {
        throw new Error(`Product with Barcode "${data.barcode}" already exists`);
      }
    }

    const col = this.getCollection(tenantId);
    const docRef = col.doc();
    const id = docRef.id;
    const now = new Date().toISOString();

    const newProduct: IProduct = {
      _id: id,
      id,
      name: data.name ?? "",
      slug: data.slug || (data.name ? data.name.toLowerCase().replace(/\s+/g, "-") : id),
      sku: data.sku ?? `SKU-${Date.now().toString().slice(-4)}`,
      barcode: data.barcode ?? `${Date.now()}`.slice(-12),
      description: data.description ?? "",
      categoryId: data.categoryId ?? "",
      categoryName: data.categoryName ?? "",
      brandId: data.brandId ?? "",
      brandName: data.brandName ?? "",
      images: data.images ?? (data.image?.url ? [data.image.url] : []),
      image: data.image,
      thumbnail: data.thumbnail,
      costPrice: Number(data.costPrice ?? 0),
      sellingPrice: Number(data.sellingPrice ?? 0),
      taxRate: Number(data.taxRate ?? 3),
      stock: Number(data.stock ?? 0),
      lowStockThreshold: Number(data.lowStockThreshold ?? 5),
      unit: data.unit ?? "pcs",
      variants: data.variants ?? [],
      isActive: data.isActive !== false,
      branchId: data.branchId,
      createdAt: now,
      updatedAt: now,
    };

    // Canonical Firestore Write — must succeed
    await docRef.set(newProduct);

    // Sync to local JSON store as non-blocking background cache for offline POS
    try {
      setLocalDoc(tenantId, "products", id, newProduct);
    } catch {
      // ignore cache sync error
    }

    return newProduct;
  }

  async update(id: string, data: Partial<IProduct>, tenantId = "default"): Promise<IProduct | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) return null;

    if (data.sku && data.sku !== existing.sku) {
      const existingSku = await this.findBySku(data.sku, tenantId);
      if (existingSku && existingSku._id !== id) {
        throw new Error(`Product with SKU "${data.sku}" already exists`);
      }
    }

    if (data.barcode && data.barcode !== existing.barcode) {
      const existingBarcode = await this.findByBarcode(data.barcode, tenantId);
      if (existingBarcode && existingBarcode._id !== id && existingBarcode.barcode === data.barcode) {
        throw new Error(`Product with Barcode "${data.barcode}" already exists`);
      }
    }

    const updated: IProduct = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Canonical Firestore Write — must succeed
    await this.getCollection(tenantId).doc(id).set(updated, { merge: true });

    // Clean up obsolete image files ONLY AFTER Firestore update succeeds
    if (data.image?.path && existing.image?.path && data.image.path !== existing.image.path) {
      deleteFromCloudStorage(existing.image.path).catch(() => {});
      if (existing.thumbnail?.path && data.thumbnail?.path !== existing.thumbnail.path) {
        deleteFromCloudStorage(existing.thumbnail.path).catch(() => {});
      }
    }

    // Sync to local store cache
    try {
      setLocalDoc(tenantId, "products", id, updated);
    } catch {
      // ignore cache sync error
    }

    return updated;
  }

  async delete(id: string, tenantId = "default"): Promise<IProduct | null> {
    return this.update(id, { isActive: false }, tenantId);
  }

  async updateStock(id: string, quantity: number, tenantId = "default"): Promise<IProduct | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) return null;

    const newStock = Math.max(0, (existing.stock || 0) + quantity);
    const updated: IProduct = {
      ...existing,
      stock: newStock,
      updatedAt: new Date().toISOString(),
    };

    await this.getCollection(tenantId).doc(id).update({
      stock: FieldValue.increment(quantity),
      updatedAt: new Date().toISOString(),
    });

    try {
      setLocalDoc(tenantId, "products", id, updated);
    } catch {
      // ignore cache sync error
    }

    return updated;
  }

  async lowStock(threshold = 5, tenantId = "default"): Promise<IProduct[]> {
    const results: IProduct[] = [];
    const snap = await this.getCollection(tenantId).where("isActive", "==", true).get();
    for (const doc of snap.docs) {
      const p = this.mapDoc(doc);
      if (p && p.stock <= (p.lowStockThreshold ?? threshold)) {
        results.push(p);
      }
    }

    return results;
  }
}
