import { DEVELOPER_CREDIT } from "@magaza/shared";

export function DeveloperFooter({ className }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] text-muted-foreground ${className ?? ""}`}>
      {DEVELOPER_CREDIT}
    </p>
  );
}
