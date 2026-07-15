import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { findUploadFile } from "@/lib/upload";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: raw } = await params;
  const filename = path.basename(raw ?? "");

  if (!filename || filename !== raw || filename.includes("..")) {
    return NextResponse.json({ error: "Geçersiz dosya" }, { status: 400 });
  }

  const wantThumb = request.nextUrl.searchParams.get("size") === "thumb";
  const filePath = await findUploadFile(
    filename,
    wantThumb ? "thumb" : "full"
  );

  if (!filePath) {
    return NextResponse.json(
      {
        error: "Dosya bulunamadı",
        hint: "Coolify Persistent Storage /app/uploads bağlı mı? Eski kayıtlar için görseli Düzenle ile yeniden yükleyin.",
      },
      { status: 404 }
    );
  }

  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : "image/webp";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
