import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { uploadToCloudStorage } from "@/lib/storage/cloud-storage";
import sharp from "sharp";
import crypto from "crypto";

export const runtime = "nodejs";

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
    const rotationDegrees = Number(formData.get("rotation") || 0);

    // Helper to construct Sharp instance with auto EXIF rotation + optional manual rotation
    const createSharpPipeline = (buffer: Buffer) => {
      let instance = sharp(buffer).rotate(); // Auto-rotate according to EXIF metadata tag
      if ([90, 180, 270].includes(rotationDegrees)) {
        instance = instance.rotate(rotationDegrees);
      }
      return instance;
    };

    // 3. Process Master WebP (Max edge 1400px, quality 82)
    const masterBuffer = await createSharpPipeline(inputBuffer)
      .resize(1400, 1400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const masterPath = `products/${tenantId}/${productId}/image-v${version}.webp`;
    
    // 4. Single Cloudinary upload to avoid duplicate asset creation in Media Library
    const masterResult = await uploadToCloudStorage(masterPath, masterBuffer);

    // 5. Construct Cloudinary dynamic thumbnail URL (400px scaled via Cloudinary CDN transformation)
    const thumbUrl = masterResult.url.includes("/image/upload/")
      ? masterResult.url.replace("/image/upload/", "/image/upload/w_400,c_scale,q_75/")
      : masterResult.url;

    const nowIso = new Date().toISOString();

    const imageData = {
      image: {
        url: masterResult.url,
        publicId: masterResult.publicId,
        path: masterPath,
        width: masterResult.width,
        height: masterResult.height,
        format: masterResult.format,
        bytes: masterResult.bytes,
        version: masterResult.version,
        updatedAt: nowIso,
      },
      thumbnail: {
        url: thumbUrl,
        publicId: masterResult.publicId,
        path: masterPath,
        width: Math.min(400, masterResult.width),
        height: Math.round((Math.min(400, masterResult.width) / (masterResult.width || 1)) * (masterResult.height || 1)),
        format: masterResult.format,
        bytes: masterResult.bytes,
        version: masterResult.version,
        updatedAt: nowIso,
      },
      url: masterResult.url, // Primary canonical Cloudinary URL
    };

    return apiSuccess(imageData, "Image optimized and uploaded to Cloudinary successfully");
  } catch (e) {
    console.error("[Upload Processing Error]:", e);
    return apiError(e instanceof Error ? e.message : "Image upload failed", 500);
  }
}
