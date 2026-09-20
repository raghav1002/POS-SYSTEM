import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { adminStorage } from "@/lib/firebase/admin";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function saveFileWithFallback(
  storagePath: string,
  buffer: Buffer,
  bucketName: string
): Promise<string> {
  try {
    const file = adminStorage.file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    try {
      await file.makePublic();
    } catch {
      // uniform bucket access fallback
    }
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
  } catch (err) {
    console.warn(`[Firebase Storage Deferred]: ${err instanceof Error ? err.message : "Bucket offline"}. Writing to local public uploads...`);
    
    // Fallback: Store locally in public/uploads/
    const localDir = path.join(process.cwd(), "public", "uploads", path.dirname(storagePath));
    await fs.mkdir(localDir, { recursive: true });
    
    const localFilePath = path.join(process.cwd(), "public", "uploads", storagePath);
    await fs.writeFile(localFilePath, buffer);
    
    return `/uploads/${storagePath}`;
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const productIdInput = (formData.get("productId") as string) || null;

    if (!file) return apiError("No image file provided");

    // 1. Strict MIME type & size check (max 10MB input)
    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMime.includes(file.type.toLowerCase())) {
      return apiError("Only JPEG, PNG, and WebP image formats are supported");
    }

    if (file.size > 10 * 1024 * 1024) {
      return apiError("Image file size must be under 10MB");
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // 2. Validate image structure via Sharp metadata
    let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
    try {
      metadata = await sharp(inputBuffer).metadata();
    } catch {
      return apiError("Invalid or corrupted image file");
    }

    if (!metadata.format || !metadata.width || !metadata.height) {
      return apiError("Could not process image metadata");
    }

    const tenantId = session.user.tenantId || "default";
    const productId = productIdInput || `prod_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const version = Date.now();
    const bucketName = adminStorage.name || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;

    // 3. Process Master WebP (Max edge 1400px, quality 82)
    const masterBuffer = await sharp(inputBuffer)
      .resize(1400, 1400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const masterMeta = await sharp(masterBuffer).metadata();
    const masterPath = `tenants/${tenantId}/products/${productId}/image-v${version}.webp`;
    const masterUrl = await saveFileWithFallback(masterPath, masterBuffer, bucketName);

    // 4. Process Thumbnail WebP (Max edge 400px, quality 80)
    const thumbBuffer = await sharp(inputBuffer)
      .resize(400, 400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbMeta = await sharp(thumbBuffer).metadata();
    const thumbPath = `tenants/${tenantId}/products/${productId}/thumb-v${version}.webp`;
    const thumbUrl = await saveFileWithFallback(thumbPath, thumbBuffer, bucketName);

    const imageData = {
      image: {
        url: masterUrl,
        path: masterPath,
        width: masterMeta.width ?? 0,
        height: masterMeta.height ?? 0,
        format: "webp" as const,
        version,
      },
      thumbnail: {
        url: thumbUrl,
        path: thumbPath,
        width: thumbMeta.width ?? 0,
        height: thumbMeta.height ?? 0,
        format: "webp" as const,
        version,
      },
      url: masterUrl, // Backward compatibility for single string image field
    };

    return apiSuccess(imageData, "Image optimized and uploaded successfully");
  } catch (e) {
    console.error("[Upload Processing Error]:", e);
    return apiError(e instanceof Error ? e.message : "Image processing failed", 500);
  }
}
