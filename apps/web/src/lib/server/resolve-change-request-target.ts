import { prisma, type ChangeTargetType } from "@magaza/database";
import { AVM_VITRIN_KIND_LABELS, MEDIA_CATEGORY_LABELS } from "@magaza/shared";

export type ChangeRequestTargetDetail = {
  typeLabel: string;
  subTypeName?: string | null;
  placementName?: string | null;
  konum?: string | null;
  dimensions?: string | null;
  adet?: number | null;
  gorselUrl?: string | null;
  summary: string;
};

type TargetRef = { targetType: ChangeTargetType; targetId: string };

function formatDimensions(en?: number | null, boy?: number | null): string | null {
  if (en == null || boy == null) return null;
  return `${en} × ${boy} cm`;
}

export async function resolveChangeRequestTarget(
  targetType: ChangeTargetType,
  targetId: string
): Promise<ChangeRequestTargetDetail | null> {
  const map = await resolveChangeRequestTargets([{ targetType, targetId }]);
  return map.get(`${targetType}:${targetId}`) ?? null;
}

export async function resolveChangeRequestTargets(
  items: TargetRef[]
): Promise<Map<string, ChangeRequestTargetDetail>> {
  const result = new Map<string, ChangeRequestTargetDetail>();
  if (!items.length) return result;

  const vitrinIds = items.filter((i) => i.targetType === "AVM_VITRIN").map((i) => i.targetId);
  const outdoorIds = items.filter((i) => i.targetType === "OUTDOOR").map((i) => i.targetId);
  const signageIds = items.filter((i) => i.targetType === "STORE_SIGNAGE").map((i) => i.targetId);
  const videoIds = items.filter((i) => i.targetType === "AVM_VIDEO").map((i) => i.targetId);

  const [vitrins, outdoors, signages, videos] = await Promise.all([
    vitrinIds.length
      ? prisma.avmVitrin.findMany({
          where: { id: { in: vitrinIds } },
          include: { avmEntry: { include: { subType: { select: { name: true } } } } },
        })
      : [],
    outdoorIds.length
      ? prisma.outdoorEntry.findMany({
          where: { id: { in: outdoorIds } },
          include: { subType: { select: { name: true } } },
        })
      : [],
    signageIds.length
      ? prisma.storeSignageEntry.findMany({
          where: { id: { in: signageIds } },
          include: {
            subType: { select: { name: true } },
            placement: { select: { name: true } },
          },
        })
      : [],
    videoIds.length
      ? prisma.avmVideo.findMany({
          where: { id: { in: videoIds } },
          include: { placement: { select: { name: true } } },
        })
      : [],
  ]);

  for (const v of vitrins) {
    const kindLabel = AVM_VITRIN_KIND_LABELS[v.kind];
    const subTypeName = v.avmEntry.subType.name;
    const dimensions = formatDimensions(v.en, v.boy);
    const konum = v.konum;
    const parts = [MEDIA_CATEGORY_LABELS.AVM_VITRIN, subTypeName, kindLabel];
    if (konum) parts.push(konum);
    result.set(`AVM_VITRIN:${v.id}`, {
      typeLabel: MEDIA_CATEGORY_LABELS.AVM_VITRIN,
      subTypeName,
      konum,
      dimensions,
      gorselUrl: v.gorselUrl,
      summary: parts.join(" · "),
    });
  }

  for (const o of outdoors) {
    const subTypeName = o.subType.name;
    const dimensions = formatDimensions(o.en, o.boy);
    result.set(`OUTDOOR:${o.id}`, {
      typeLabel: MEDIA_CATEGORY_LABELS.OUTDOOR,
      subTypeName,
      dimensions,
      adet: o.adet,
      gorselUrl: o.gorselUrl,
      summary: [MEDIA_CATEGORY_LABELS.OUTDOOR, subTypeName].join(" · "),
    });
  }

  for (const s of signages) {
    const subTypeName = s.subType.name;
    const placementName = s.placement.name;
    const dimensions = formatDimensions(s.en, s.boy);
    result.set(`STORE_SIGNAGE:${s.id}`, {
      typeLabel: MEDIA_CATEGORY_LABELS.STORE_SIGNAGE,
      subTypeName,
      placementName,
      konum: placementName,
      dimensions,
      adet: s.adet,
      gorselUrl: s.gorselUrl,
      summary: [MEDIA_CATEGORY_LABELS.STORE_SIGNAGE, subTypeName, placementName].join(" · "),
    });
  }

  for (const v of videos) {
    const placementName = v.placement.name;
    const dimensions = formatDimensions(v.en, v.boy);
    result.set(`AVM_VIDEO:${v.id}`, {
      typeLabel: "AVM Video",
      placementName,
      konum: placementName,
      dimensions,
      adet: v.adet,
      summary: ["AVM Video", placementName].join(" · "),
    });
  }

  return result;
}
