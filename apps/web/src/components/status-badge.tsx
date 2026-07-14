import { CHANGE_REQUEST_STATUS_LABELS, type ChangeRequestStatus } from "@magaza/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const colorMap: Record<ChangeRequestStatus, string> = {
  TALEP_OLUSTURULDU: "bg-gray-100 text-gray-800",
  ONAYLANDI: "bg-blue-100 text-blue-800",
  ISLEME_ALINDI: "bg-cyan-100 text-cyan-800",
  HAZIRLIKTA: "bg-yellow-100 text-yellow-800",
  BASKIDA: "bg-indigo-100 text-indigo-800",
  TAMAMLANDI: "bg-green-100 text-green-800",
  GUNCELLEME_YUKLENDI: "bg-amber-100 text-amber-800",
  MAGAZADA_GUNCELLENDI: "bg-emerald-100 text-emerald-800",
  REDDEDILDI: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: ChangeRequestStatus }) {
  return (
    <Badge variant="outline" className={cn("border-0", colorMap[status])}>
      {CHANGE_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
