export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { uploadObject, ensureBucket, BUCKET_IMAGES, buildImageUrl } from "@/lib/minio";
import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadType = "wardrobe-item" | "selfie" | "avatar";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as UploadType) ?? "wardrobe-item";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Server-side MIME type validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `${session.user.id}/${type}/${createId()}.${ext}`;

  await ensureBucket(BUCKET_IMAGES);
  await uploadObject(BUCKET_IMAGES, objectKey, buffer, file.type);

  return NextResponse.json({
    objectKey,
    url: buildImageUrl(BUCKET_IMAGES, objectKey),
  });
}
