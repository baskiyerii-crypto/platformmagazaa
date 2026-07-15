/** Default tolerance for treating two sizes as the same (cm). */
export const SIZE_TOLERANCE_CM = 3;

export type SizeInput = {
  en: number;
  boy: number;
  adet?: number | null;
};

export type SizeGroup = {
  /** Averaged, rounded display width (min axis after normalize). */
  en: number;
  /** Averaged, rounded display height (max axis after normalize). */
  boy: number;
  /** e.g. "120×180" */
  label: string;
  toplamAdet: number;
  kayitSayisi: number;
};

function normalizeAxes(en: number, boy: number): { a: number; b: number } {
  return en <= boy ? { a: en, b: boy } : { a: boy, b: en };
}

function roundCm(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Cluster dimensions within ±toleranceCm on both axes (after orientation normalize).
 * Greedy: sort by a,b then join cluster if within tolerance of running average.
 */
export function groupSizesWithTolerance(
  items: SizeInput[],
  toleranceCm: number = SIZE_TOLERANCE_CM
): SizeGroup[] {
  type Cluster = {
    sumA: number;
    sumB: number;
    weight: number;
    toplamAdet: number;
    kayitSayisi: number;
  };

  const normalized = items
    .filter(
      (i) =>
        Number.isFinite(i.en) &&
        Number.isFinite(i.boy) &&
        i.en > 0 &&
        i.boy > 0
    )
    .map((i) => {
      const { a, b } = normalizeAxes(i.en, i.boy);
      const adet =
        i.adet != null && Number.isFinite(i.adet) && i.adet > 0
          ? Math.floor(i.adet)
          : 1;
      return { a, b, adet };
    })
    .sort((x, y) => x.a - y.a || x.b - y.b);

  const clusters: Cluster[] = [];

  for (const item of normalized) {
    let matched: Cluster | null = null;
    for (const c of clusters) {
      const avgA = c.sumA / c.weight;
      const avgB = c.sumB / c.weight;
      if (
        Math.abs(item.a - avgA) <= toleranceCm &&
        Math.abs(item.b - avgB) <= toleranceCm
      ) {
        matched = c;
        break;
      }
    }

    if (matched) {
      matched.sumA += item.a;
      matched.sumB += item.b;
      matched.weight += 1;
      matched.toplamAdet += item.adet;
      matched.kayitSayisi += 1;
    } else {
      clusters.push({
        sumA: item.a,
        sumB: item.b,
        weight: 1,
        toplamAdet: item.adet,
        kayitSayisi: 1,
      });
    }
  }

  return clusters
    .map((c) => {
      const en = roundCm(c.sumA / c.weight);
      const boy = roundCm(c.sumB / c.weight);
      return {
        en,
        boy,
        label: `${en}×${boy}`,
        toplamAdet: c.toplamAdet,
        kayitSayisi: c.kayitSayisi,
      };
    })
    .sort((x, y) => x.en - y.en || x.boy - y.boy);
}

export function formatSizeGroupLabel(group: SizeGroup): string {
  return `${group.label} cm`;
}
