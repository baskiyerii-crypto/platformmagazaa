import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { canStoreUploadImage } from "@magaza/shared";
import { createStatusHistory } from "@/lib/change-request";
import { saveUploadedFile } from "@/lib/upload";
import { replaceMediaUrl } from "@/lib/media-cleanup";
import { notifyStaff } from "@/lib/notify";

export const POST = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id },
  });

  if (!changeRequest) return jsonError("Talep bulunamadı", 404);
  if (auth.role !== "STORE" || changeRequest.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  if (!canStoreUploadImage(changeRequest.status)) {
    return jsonError(
      "Görsel yükleme sadece Tamamlandı durumunda yapılabilir",
      400
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return jsonError("Dosya gerekli", 400);

  const url = await saveUploadedFile(file, {
    category: "CHANGE_REQUEST",
    storeId: auth.storeId,
    createdById: auth.userId,
    sourceRef: `change-request:${id}`,
  });

  if (changeRequest.targetType === "AVM_VITRIN") {
    const vitrin = await prisma.avmVitrin.findUnique({
      where: { id: changeRequest.targetId },
    });
    if (vitrin?.gorselUrl) {
      await prisma.imageAsset.create({
        data: {
          changeRequestId: id,
          url: vitrin.gorselUrl,
          isArchived: true,
        },
      });
      await replaceMediaUrl(vitrin.gorselUrl, url);
    }
    await prisma.avmVitrin.update({
      where: { id: changeRequest.targetId },
      data: { gorselUrl: url },
    });
  } else if (changeRequest.targetType === "OUTDOOR") {
    const outdoor = await prisma.outdoorEntry.findUnique({
      where: { id: changeRequest.targetId },
    });
    if (outdoor?.gorselUrl) {
      await prisma.imageAsset.create({
        data: {
          changeRequestId: id,
          url: outdoor.gorselUrl,
          isArchived: true,
        },
      });
      await replaceMediaUrl(outdoor.gorselUrl, url);
    }
    await prisma.outdoorEntry.update({
      where: { id: changeRequest.targetId },
      data: { gorselUrl: url },
    });
  } else if (changeRequest.targetType === "STORE_SIGNAGE") {
    const signage = await prisma.storeSignageEntry.findUnique({
      where: { id: changeRequest.targetId },
    });
    if (signage?.gorselUrl) {
      await prisma.imageAsset.create({
        data: {
          changeRequestId: id,
          url: signage.gorselUrl,
          isArchived: true,
        },
      });
      await replaceMediaUrl(signage.gorselUrl, url);
    }
    await prisma.storeSignageEntry.update({
      where: { id: changeRequest.targetId },
      data: { gorselUrl: url },
    });
  }

  await prisma.imageAsset.create({
    data: { changeRequestId: id, url, isArchived: false },
  });

  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      status: "GUNCELLEME_YUKLENDI",
    },
  });

  await createStatusHistory(
    prisma,
    id,
    "TAMAMLANDI",
    "GUNCELLEME_YUKLENDI",
    auth.userId,
    "Mağaza yeni görseli yükledi"
  );

  await notifyStaff({
    type: "CHANGE_REQUEST",
    title: "Mağaza Görsel Yükledi",
    body: "Müdür onayı bekleniyor",
    linkUrl: "/admin/requests",
  });

  return NextResponse.json(updated);
});
