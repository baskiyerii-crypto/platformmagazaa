export const BRANDING_UPDATED_EVENT = "magaza:branding-updated";

export type BrandingUpdatedDetail = {
  logoUrl: string | null;
  updatedAt: string | null;
};

export function dispatchBrandingUpdated(detail: BrandingUpdatedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT, { detail }));
}
