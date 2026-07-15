import { NextRequest, NextResponse } from "next/server";
import { access, readFile } from "fs/promises";
import path from "path";
import { resolveUploadPath } from "@/lib/upload";

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

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
  let filePath = wantThumb
    ? resolveUploadPath(filename, "thumb")
    : resolveUploadPath(filename, "full");

  if (!(await fileExists(filePath)) && wantThumb) {
    filePath = resolveUploadPath(filename, "full");
  }

  if (!(await fileExists(filePath))) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
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
