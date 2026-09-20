import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  version: number;
  path: string;
}

// Ensure Cloudinary is configured dynamically from environment variables
function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
}

/**
 * Upload WebP binary buffer strictly to Cloudinary.
 * FAIL CLOSED: If Cloudinary credentials are missing or upload stream fails,
 * this function throws an error. NO local fallback allowed.
 */
export async function uploadToCloudStorage(
  storagePath: string,
  buffer: Buffer
): Promise<CloudinaryUploadResult> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("Cloudinary image storage is not configured.");
  }

  // Sanitize path to form canonical public_id
  // e.g. "products/default/prod_123/image-v1709912605.webp" -> "retailpos/products/default/prod_123/image-v1709912605"
  const cleanPublicId = storagePath.replace(/\.[^/.]+$/, "");
  const publicId = `retailpos/${cleanPublicId}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        type: "upload",
        format: "webp",
        overwrite: true,
        invalidate: true,
      },
      (error, res) => {
        if (error || !res) {
          console.error("[Cloudinary Stream Upload Error]:", error);
          return reject(
            new Error(
              error?.message || "Cloudinary image storage upload stream failed"
            )
          );
        }

        resolve({
          url: res.secure_url,
          publicId: res.public_id,
          width: res.width ?? 0,
          height: res.height ?? 0,
          format: res.format ?? "webp",
          bytes: res.bytes ?? buffer.length,
          version: res.version ?? Date.now(),
          path: storagePath,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete image object from Cloudinary by public_id or storage path.
 */
export async function deleteFromCloudStorage(publicIdOrPath: string): Promise<void> {
  if (!publicIdOrPath) return;

  const config = getCloudinaryConfig();
  if (!config) {
    console.warn("[CloudStorage Delete Warning]: Cloudinary is not configured");
    return;
  }

  try {
    let publicId = publicIdOrPath;
    if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
      const match = publicId.match(/\/v\d+\/(retailpos\/[^.]+)/);
      if (match) {
        publicId = match[1];
      }
    } else if (!publicId.startsWith("retailpos/")) {
      const cleanPath = publicId.replace(/\.[^/.]+$/, "").replace(/^\/uploads\//, "");
      publicId = `retailpos/${cleanPath}`;
    }

    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.warn("[Cloudinary Delete Warning]:", err instanceof Error ? err.message : err);
  }
}
