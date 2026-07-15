"use client";

import type { SizeGroup } from "@/lib/size-groups";
import { SIZE_TOLERANCE_CM } from "@/lib/size-groups";

type Props = {
  groups: SizeGroup[];
  title?: string;
  loading?: boolean;
};

export function SizeSummaryPanel({
  groups,
  title = "Ölçü Özeti",
  loading,
}: Props) {
  const totalAdet = groups.reduce((s, g) => s + g.toplamAdet, 0);

  return (
    <section className="panel-section space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">
          ±{SIZE_TOLERANCE_CM} cm kayma · ortalama ölçü · yön fark etmez · altında konum
          adetleri
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Ölçüler hesaplanıyor…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ölçüsü olan kayıt yok.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.label} className="rounded-xl border px-4 py-3">
                <div className="font-medium">
                  {g.label} cm → {g.toplamAdet} adet{" "}
                  <span className="text-muted-foreground font-normal">
                    ({g.kayitSayisi} kayıt)
                  </span>
                </div>
                {(g.konumlar?.length ?? 0) > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {g.konumlar.map((k) => (
                      <li key={`${g.label}-${k.konum}`}>
                        · {k.konum} — {k.toplamAdet} adet
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {groups.length} farklı ölçü · toplam {totalAdet} adet
          </p>
        </>
      )}
    </section>
  );
}
