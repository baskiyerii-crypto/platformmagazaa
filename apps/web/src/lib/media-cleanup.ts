import { prisma } from "@magaza/database";
import { deleteUploadedFile } from "./upload";

export async function cleanupMediaUrls(urls: Array<string | null | undefined>) {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u?.trim())))];
  if (unique.length === 0) return;

  await Promise.all(unique.map((url) => deleteUploadedFile(url)));

  await prisma.mediaAsset.deleteMany({
    where: { url: { in: unique } },
  });
}

export async function replaceMediaUrl(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined
) {
  if (oldUrl && oldUrl !== newUrl) {
    await cleanupMediaUrls([oldUrl]);
  }
}
