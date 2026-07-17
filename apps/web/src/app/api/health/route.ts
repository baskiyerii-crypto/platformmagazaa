import { NextResponse } from "next/server";
import { getBrandingLogoStatus } from "@/lib/branding";
import { getUploadDirStatus } from "@/lib/upload";

/**
 * Runtime env presence check for Coolify/debug.
 * Never returns secret values — only whether keys are set.
 */
export async function GET() {
  const nextAuthSecret = Boolean(
    process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  );
  const databaseUrl = Boolean(process.env.DATABASE_URL);
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;
  const uploadDirEnv = process.env.UPLOAD_DIR ?? null;
  const uploadStatus = await getUploadDirStatus();
  const branding = await getBrandingLogoStatus();

  const ready = nextAuthSecret && databaseUrl && Boolean(nextAuthUrl);
  const uploadsOk = uploadStatus.writable;

  return NextResponse.json(
    {
      ok: ready && uploadsOk,
      nodeEnv: process.env.NODE_ENV ?? null,
      cwd: process.cwd(),
      env: {
        NEXTAUTH_SECRET: nextAuthSecret,
        NEXTAUTH_URL: nextAuthUrl,
        NEXT_PUBLIC_APP_URL: appUrl,
        DATABASE_URL: databaseUrl,
        JWT_SECRET: Boolean(process.env.JWT_SECRET),
        UPLOAD_DIR: uploadDirEnv,
      },
      uploads: {
        ...uploadStatus,
        route: "/api/v1/uploads/[filename]",
      },
      branding: {
        logoUrl: branding.logoUrl,
        fileExists: branding.fileExists,
        updatedAt: branding.updatedAt,
      },
      hint: !ready
        ? "Coolify → Environment Variables: set NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL (Runtime+Build), then Redeploy"
        : !uploadsOk
          ? "Coolify → Storages: Persistent Storage ekle, Destination Path = /app/uploads, sonra Restart. Env UPLOAD_DIR=/app/uploads olmalı."
          : null,
    },
    { status: ready && uploadsOk ? 200 : 503 }
  );
}
