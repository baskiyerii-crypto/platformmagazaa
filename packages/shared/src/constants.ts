export const CHANGE_REQUEST_STATUSES = [
  "TALEP_OLUSTURULDU",
  "ONAYLANDI",
  "ISLEME_ALINDI",
  "HAZIRLIKTA",
  "BASKIDA",
  "TAMAMLANDI",
  "GUNCELLEME_YUKLENDI",
  "MAGAZADA_GUNCELLENDI",
  "REDDEDILDI",
] as const;

export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  TALEP_OLUSTURULDU: "Talep Oluşturuldu",
  ONAYLANDI: "Onaylandı",
  ISLEME_ALINDI: "İşleme Alındı",
  HAZIRLIKTA: "Hazırlıkta",
  BASKIDA: "Baskıda",
  TAMAMLANDI: "Tamamlandı",
  GUNCELLEME_YUKLENDI: "Güncelleme Yüklendi",
  MAGAZADA_GUNCELLENDI: "Mağazada Güncellendi",
  REDDEDILDI: "Reddedildi",
};

export const CHANGE_REQUEST_STATUS_COLORS: Record<ChangeRequestStatus, string> = {
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

export const USER_ROLES = ["ADMIN", "MANAGER", "STORE"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Ana Yönetici",
  MANAGER: "Müdür",
  STORE: "Mağaza",
};

export function isStaffRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN";
}

export const CATALOG_ITEM_TYPES = ["FIXED", "VARIABLE"] as const;
export type CatalogItemType = (typeof CATALOG_ITEM_TYPES)[number];

export const CATALOG_ITEM_TYPE_LABELS: Record<CatalogItemType, string> = {
  FIXED: "Sabit",
  VARIABLE: "Değişken",
};

export const INVENTORY_TYPES = ["AVM_VITRIN", "OUTDOOR", "STORE_SIGNAGE", "CATALOG_REQUEST"] as const;
export type InventoryType = (typeof INVENTORY_TYPES)[number];

export const AREA_CATEGORIES = ["AVM", "ACIK_HAVA", "MAGAZA_ICI"] as const;
export type AreaCategoryType = (typeof AREA_CATEGORIES)[number];

export const CHANGE_TARGET_TYPES = ["AVM_VITRIN", "OUTDOOR", "AVM_VIDEO", "STORE_SIGNAGE"] as const;
export type ChangeTargetType = (typeof CHANGE_TARGET_TYPES)[number];

export const CHANGE_TARGET_TYPE_LABELS: Record<ChangeTargetType, string> = {
  AVM_VITRIN: "AVM Vitrin",
  OUTDOOR: "Açık Hava",
  AVM_VIDEO: "AVM Video",
  STORE_SIGNAGE: "Mağaza İçi",
};

export function changeTargetTypeLabel(type: string): string {
  return CHANGE_TARGET_TYPE_LABELS[type as ChangeTargetType] ?? type;
}

export const AVM_VITRIN_KINDS = ["VITRIN", "EKSTRA_ALAN"] as const;
export type AvmVitrinKind = (typeof AVM_VITRIN_KINDS)[number];

export const AVM_VITRIN_KIND_LABELS: Record<AvmVitrinKind, string> = {
  VITRIN: "Vitrin",
  EKSTRA_ALAN: "Ekstra Alan",
};

export const ADMIN_STATUS_TRANSITIONS: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  TALEP_OLUSTURULDU: ["ONAYLANDI", "REDDEDILDI"],
  ONAYLANDI: ["ISLEME_ALINDI"],
  ISLEME_ALINDI: ["HAZIRLIKTA"],
  HAZIRLIKTA: ["BASKIDA"],
  BASKIDA: ["TAMAMLANDI"],
  TAMAMLANDI: [],
  GUNCELLEME_YUKLENDI: [],
  MAGAZADA_GUNCELLENDI: [],
  REDDEDILDI: [],
};

export const MANAGER_APPROVAL_TRANSITIONS: Partial<
  Record<ChangeRequestStatus, ChangeRequestStatus[]>
> = {
  GUNCELLEME_YUKLENDI: ["MAGAZADA_GUNCELLENDI"],
};

export function canTransitionStatus(
  current: ChangeRequestStatus,
  next: ChangeRequestStatus
): boolean {
  return ADMIN_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export function canApproveStoreUpdate(status: ChangeRequestStatus): boolean {
  return status === "GUNCELLEME_YUKLENDI";
}

export function canManagerApproveTransition(
  current: ChangeRequestStatus,
  next: ChangeRequestStatus
): boolean {
  return MANAGER_APPROVAL_TRANSITIONS[current]?.includes(next) ?? false;
}

export function isChangeRequestClosed(status: ChangeRequestStatus): boolean {
  return status === "MAGAZADA_GUNCELLENDI" || status === "REDDEDILDI";
}

export function canStoreUploadImage(status: ChangeRequestStatus): boolean {
  return status === "TAMAMLANDI";
}

export const SUPPORT_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapatıldı",
};

export const SIGNUP_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type SignupRequestStatus = (typeof SIGNUP_REQUEST_STATUSES)[number];

export const SIGNUP_REQUEST_STATUS_LABELS: Record<SignupRequestStatus, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

export const NOTIFICATION_TYPES = ["CHANGE_REQUEST", "CATALOG_REQUEST", "SUPPORT", "ANNOUNCEMENT"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ANNOUNCEMENT_AUDIENCES = ["ALL_STORES", "SELECTED_STORES"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL_STORES: "Tüm Mağazalar",
  SELECTED_STORES: "Seçili Mağazalar",
};

export const ANNOUNCEMENT_KINDS = ["NORMAL", "KAMPANYA"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_KIND_LABELS: Record<AnnouncementKind, string> = {
  NORMAL: "Normal",
  KAMPANYA: "Kampanya",
};

export const ANNOUNCEMENT_RECEIPT_STATUSES = [
  "BEKLIYOR",
  "OKUNDU",
  "ISLEME_ALINDI",
  "TAMAMLANDI",
] as const;
export type AnnouncementReceiptStatus = (typeof ANNOUNCEMENT_RECEIPT_STATUSES)[number];

export const ANNOUNCEMENT_RECEIPT_STATUS_LABELS: Record<AnnouncementReceiptStatus, string> = {
  BEKLIYOR: "Bekliyor",
  OKUNDU: "Okundu",
  ISLEME_ALINDI: "İşleme Alındı",
  TAMAMLANDI: "Tamamlandı",
};

export const MEDIA_CATEGORIES = [
  "AVM_VITRIN",
  "OUTDOOR",
  "STORE_SIGNAGE",
  "CATALOG",
  "CATALOG_REQUEST",
  "ANNOUNCEMENT_COMPLETION",
  "CHANGE_REQUEST",
  "OTHER",
] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  AVM_VITRIN: "AVM Vitrin",
  OUTDOOR: "Açık Hava",
  STORE_SIGNAGE: "Mağaza İçi",
  CATALOG: "Ürün Kataloğu",
  CATALOG_REQUEST: "Ürün Talebi",
  ANNOUNCEMENT_COMPLETION: "Duyuru Tamamlama",
  CHANGE_REQUEST: "Değişim Talebi",
  OTHER: "Diğer",
};

export const DEVELOPER_CREDIT = "Geliştirici = YUSUF KIRHAN (full stack developer)";
