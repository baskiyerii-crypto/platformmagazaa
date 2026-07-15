import { NextResponse } from "next/server";
import { access } from "fs/promises";
import { getUploadDir } from "@/lib/upload";

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
  const uploadDirResolved = getUploadDir();

  let uploadDirWritable = false;
  try {
    await access(uploadDirResolved);
    uploadDirWritable = true;
  } catch {
    uploadDirWritable = false;
  }

  const ready = nextAuthSecret && databaseUrl && Boolean(nextAuthUrl);

  return NextResponse.json(
    {
      ok: ready,
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
        resolvedDir: uploadDirResolved,
        dirExists: uploadDirWritable,
        route: "/api/v1/uploads/[filename]",
      },
      hint: ready
        ? null
        : "Coolify → Environment Variables: set NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL (Runtime+Build), then Redeploy",
    },
    { status: ready ? 200 : 503 }
  );
}
