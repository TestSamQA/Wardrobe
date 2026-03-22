import { Client } from "minio";

const globalForMinio = globalThis as unknown as {
  minio: Client | undefined;
};

export const minio =
  globalForMinio.minio ??
  new Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "",
    secretKey: process.env.MINIO_SECRET_KEY ?? "",
  });

if (process.env.NODE_ENV !== "production") globalForMinio.minio = minio;

export const BUCKET_IMAGES = process.env.MINIO_BUCKET_IMAGES ?? "wardrobe-images";
export const BUCKET_THUMBNAILS = process.env.MINIO_BUCKET_THUMBNAILS ?? "wardrobe-thumbnails";

/**
 * Upload a buffer to MinIO. Returns the object key.
 */
export async function uploadObject(
  bucket: string,
  objectKey: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await minio.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return objectKey;
}

/**
 * Download an object from MinIO as a Buffer.
 */
export async function downloadObject(bucket: string, objectKey: string): Promise<Buffer> {
  const stream = await minio.getObject(bucket, objectKey);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * Delete an object from MinIO.
 */
export async function deleteObject(bucket: string, objectKey: string): Promise<void> {
  await minio.removeObject(bucket, objectKey);
}

/**
 * Build the internal image URL (routed through /api/images proxy).
 * e.g. /api/images/wardrobe-images/userId/wardrobe/abc123.jpg
 */
export function buildImageUrl(bucket: string, objectKey: string): string {
  const base = process.env.MINIO_PUBLIC_BASE_URL ?? "/api/images";
  return `${base}/${bucket}/${objectKey}`;
}

/**
 * Ensure a bucket exists, creating it if not.
 */
export async function ensureBucket(bucket: string): Promise<void> {
  const exists = await minio.bucketExists(bucket);
  if (!exists) {
    await minio.makeBucket(bucket);
  }
}
