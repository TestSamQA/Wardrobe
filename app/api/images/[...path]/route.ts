import { auth } from "@/lib/auth";
import { minio } from "@/lib/minio";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path } = await params;
  if (!path || path.length < 2) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // path[0] = bucket, path[1..] = object key segments
  const [bucket, ...keyParts] = path;
  const objectKey = keyParts.join("/");

  // Ownership check: object key must start with the user's ID
  const userId = session.user.id;
  if (!objectKey.startsWith(userId + "/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const stream = await minio.getObject(bucket, objectKey);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);
    const ext = objectKey.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "NoSuchKey" || code === "NotFound") {
      return new NextResponse("Not Found", { status: 404 });
    }
    console.error("Image proxy error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
