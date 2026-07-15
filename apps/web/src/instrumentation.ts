export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureUploadDir } = await import("@/lib/upload");
    const dir = await ensureUploadDir();
    console.info(`[uploads] ready at ${dir}`);
  } catch (e) {
    console.error(
      "[uploads] FAILED to create upload dir. Set Coolify Persistent Storage to /app/uploads and UPLOAD_DIR=/app/uploads",
      e
    );
  }
}
