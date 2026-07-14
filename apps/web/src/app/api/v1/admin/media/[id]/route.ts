import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { deleteUploadedFile } from "@/lib/upload";

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return jsonError("Görsel bulunamadı", 404);

    await deleteUploadedFile(asset.url);
    await prisma.mediaAsset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
