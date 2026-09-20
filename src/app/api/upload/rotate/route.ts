import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { uploadToCloudStorage } from "@/lib/storage/cloud-storage";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const { imageUrl, degrees, productId: productIdInput } = body;

    if (!imageUrl) return apiError("Image URL is required");
    const validDegrees = [90, 180, 270];
    const rotateAngle = Number(degrees);
    if (!validDegrees.includes(rotateAngle)) {
      return apiError("Degrees must be 90, 180, or 270");
    }

    let inputBuffer: Buffer;

    if (imageUrl.startsWith("/uploads/")) {
      const relPath = imageUrl.replace(/^\/uploads\//, "");
      const fullPath = path.join(process.cwd(), "public", "uploads", relPath);
      inputBuffer = await fs.readFile(fullPath);
    } else {
      const res = await fetch(imageUrl);
      if (!res.ok) return apiError("Could not download target image for rotation");
      inputBuffer = Buffer.from(await res.arrayBuffer());
    }

    const tenantId = session.user.tenantId || "default";
    const productId = productIdInput || `prod_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const version = Date.now();

    // Process rotated master WebP
    const masterBuffer = await sharp(inputBuffer)
      .rotate(rotateAngle)
      .resize(1400, 1400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const masterPath = `products/${tenantId}/${productId}/image-v${version}.webp`;
    const masterResult = await uploadToCloudStorage(masterPath, masterBuffer);

    // Construct Cloudinary dynamic thumbnail URL (400px scaled via Cloudinary CDN transformation)
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
      url: masterResult.url,
    };

    return apiSuccess(imageData, `Image rotated ${rotateAngle}° successfully and uploaded to Cloudinary`);
  } catch (e) {
    console.error("[Image Rotation Error]:", e);
    return apiError(e instanceof Error ? e.message : "Image rotation failed", 500);
  }
}
