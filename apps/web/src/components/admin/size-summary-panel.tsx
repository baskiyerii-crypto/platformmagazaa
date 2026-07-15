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
          ±{SIZE_TOLERANCE_CM} cm kayma ile aynı ölçü sayılır · ortalama ölçü gösterilir · yön fark etmez
          (120×180 = 180×120)
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Ölçüler hesaplanıyor…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ölçüsü olan kayıt yok.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Ölçü</th>
                  <th className="px-3 py-2 font-medium">Toplam Adet</th>
                  <th className="px-3 py-2 font-medium">Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.label} className="border-t">
                    <td className="px-3 py-2 font-medium">{g.label} cm</td>
                    <td className="px-3 py-2">{g.toplamAdet}</td>
                    <td className="px-3 py-2 text-muted-foreground">{g.kayitSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {groups.length} farklı ölçü · toplam {totalAdet} adet
          </p>
        </>
      )}
    </section>
  );
}
