import type { CatalogCampaign, CatalogCampaignMode } from "@magaza/database";

export function isCampaignOpenForRequests(
  campaign: Pick<CatalogCampaign, "active" | "mode" | "startsAt" | "endsAt">,
  now = new Date()
): boolean {
  if (!campaign.active) return false;
  if (campaign.mode === "PERMANENT") return true;
  if (!campaign.startsAt || !campaign.endsAt) return false;
  return campaign.startsAt <= now && campaign.endsAt >= now;
}

export function parseOptionalDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function normalizeCampaignDates(input: {
  mode?: CatalogCampaignMode;
  startsAt?: unknown;
  endsAt?: unknown;
}) {
  const mode = input.mode ?? "PERMANENT";
  if (mode === "PERMANENT") {
    return { mode, startsAt: null as Date | null, endsAt: null as Date | null };
  }
  const startsAt = parseOptionalDate(input.startsAt);
  const endsAtRaw = parseOptionalDate(input.endsAt);
  const endsAt = endsAtRaw ? endOfDay(endsAtRaw) : null;
  return { mode, startsAt, endsAt };
}

export const catalogItemInclude = {
  campaign: {
    select: {
      id: true,
      name: true,
      mode: true,
      startsAt: true,
      endsAt: true,
      active: true,
    },
  },
  category: {
    select: { id: true, name: true, sortOrder: true, active: true },
  },
} as const;
