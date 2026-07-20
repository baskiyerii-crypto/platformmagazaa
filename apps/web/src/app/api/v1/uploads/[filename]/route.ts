import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { findUploadFile, getUploadDirStatus } from "@/lib/upload";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: raw } = await params;
  let decoded = raw ?? "";
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep raw */
  }
  const filename = path.basename(decoded);

  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Geçersiz dosya" }, { status: 400 });
  }

  const wantThumb = request.nextUrl.searchParams.get("size") === "thumb";
  const debug = request.nextUrl.searchParams.get("debug") === "1";

  let filePath = await findUploadFile(filename, wantThumb ? "thumb" : "full");
  // Thumb missing → always try full before 404
  if (!filePath && wantThumb) {
    filePath = await findUploadFile(filename, "full");
  }

  if (!filePath) {
    const status = debug ? await getUploadDirStatus() : null;
    return NextResponse.json(
      {
        error: "Dosya bulunamadı",
        filename,
        ...(status
          ? {
              cwd: status.cwd,
              resolvedDir: status.resolvedDir,
              fileCount: status.fileCount,
              candidateStats: status.candidateStats,
            }
          : {}),
        hint: "Coolify → Storages: Destination Path=/app/uploads ve UPLOAD_DIR=/app/uploads",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".avif"
            ? "image/avif"
            : ext === ".heic" || ext === ".heif"
              ? "image/heic"
              : ext === ".bmp"
                ? "image/bmp"
                : "image/webp";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
