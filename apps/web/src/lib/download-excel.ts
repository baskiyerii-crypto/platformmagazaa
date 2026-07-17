"use client";

/**
 * Shared Excel/blob download helper — shows JSON errors instead of silent blank tabs.
 */
export async function downloadExcelBlob(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    let message = `İndirme başarısız (${res.status})`;
    if (contentType.includes("application/json")) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    const body = (await res.clone().json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Sunucu Excel dosyası yerine hata döndürdü");
  }

  const blob = await res.blob();
  if (blob.size < 64) {
    throw new Error("İndirilen Excel dosyası boş görünüyor");
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);

  return blob.size;
}
